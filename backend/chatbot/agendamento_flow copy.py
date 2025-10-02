# chatbot/agendamento_flow.py - VERSÃO FINAL, LIMPA E CORRIGIDA

import re
from datetime import datetime, timedelta
import json
from django.utils import timezone
from decimal import Decimal
import logging
from usuarios.models import Especialidade, CustomUser
from faturamento.models import Procedimento
from agendamentos.services import (
    buscar_proximo_horario_disponivel,
    buscar_proximo_horario_procedimento,
    criar_agendamento_e_pagamento_pendente,
    listar_agendamentos_futuros,
    cancelar_agendamento_service
)
from pacientes.models import Paciente
from agendamentos.serializers import AgendamentoWriteSerializer

# --- FUNÇÕES DE VALIDAÇÃO ---
def validar_cpf_formato(cpf_str: str) -> bool:
    if not isinstance(cpf_str, str): return False
    numeros = re.sub(r'\D', '', cpf_str)
    return len(numeros) == 11

def validar_telefone_formato(tel_str: str) -> bool:
    if not isinstance(tel_str, str): return False
    numeros = re.sub(r'\D', '', tel_str)
    if numeros.startswith('55'): numeros = numeros[2:]
    return len(numeros) in [10, 11]

def validar_data_nascimento_formato(data_str: str) -> bool:
    if not isinstance(data_str, str): return False
    try:
        data_obj = datetime.strptime(data_str.strip(), '%d/%m/%Y')
        return data_obj.date() < datetime.now().date()
    except ValueError:
        return False

def validar_email_formato(email_str: str) -> bool:
    if not isinstance(email_str, str): return False
    return bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email_str.strip()))

# --- CLASSE DA MÁQUINA DE ESTADOS ---
class AgendamentoManager:
    def __init__(self, session_id, memoria, base_url, chain_sintomas=None, chain_extracao_dados=None):
        self.session_id = session_id
        self.memoria = memoria
        self.base_url = base_url.rstrip('/')
        self.chain_sintomas = chain_sintomas
        self.chain_extracao_dados = chain_extracao_dados

    def _get_especialidades_from_db(self):
        return list(Especialidade.objects.all().order_by('nome').values('id', 'nome'))

    def _get_medicos_from_db(self, especialidade_id):
        return list(CustomUser.objects.filter(cargo='medico', especialidades__id=especialidade_id).values('id', 'first_name', 'last_name'))

    def _get_procedimentos_from_db(self):
        return list(Procedimento.objects.filter(ativo=True, valor_particular__gt=0).order_by('descricao').values('id', 'descricao'))

    def _get_especialidade_por_nome(self, nome_especialidade):
        try:
            return Especialidade.objects.get(nome__iexact=nome_especialidade)
        except Especialidade.DoesNotExist:
            return None

    def _iniciar_busca_de_horarios(self, especialidade_id, especialidade_nome):
        nome_usuario = self.memoria.get('nome_usuario', '')
        medicos = self._get_medicos_from_db(especialidade_id=especialidade_id)
        if not medicos: return {"response_message": f"Desculpe, {nome_usuario}, não encontrei médicos para {especialidade_nome} no momento.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        
        medico = medicos[0]
        self.memoria.update({'medico_id': medico['id'], 'medico_nome': f"{medico['first_name']} {medico['last_name']}"})
        horarios = buscar_proximo_horario_disponivel(medico_id=medico['id'])
        
        if not horarios or not horarios.get('horarios_disponiveis'): return {"response_message": f"Infelizmente, {nome_usuario}, não há horários online para Dr(a). {self.memoria['medico_nome']}.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        
        self.memoria['horarios_ofertados'] = horarios
        data_formatada = datetime.strptime(horarios['data'], '%Y-%m-%d').strftime('%d/%m/%Y')
        horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]]
        mensagem = (f"Ótima escolha, {nome_usuario}! A especialidade de *{especialidade_nome}* é uma referência. O(A) Dr(a). *{self.memoria['medico_nome']}* é um(a) excelente profissional.\n\nEncontrei estes horários para o dia *{data_formatada}*:\n\n" + "\n".join(horarios_formatados) + "\n\nQual deles prefere? Se quiser outro dia, pode me dizer.")
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

    def processar(self, resposta_usuario, estado_atual):
        handlers = {
            'agendamento_inicio': self.handle_inicio,
            'agendamento_awaiting_type': self.handle_awaiting_type,
            'agendamento_awaiting_modality': self.handle_awaiting_modality,
            'agendamento_awaiting_specialty': self.handle_awaiting_specialty,
            'agendamento_awaiting_slot_choice': self.handle_awaiting_slot_choice,
            'agendamento_awaiting_slot_confirmation': self.handle_awaiting_slot_confirmation,
            'cadastro_awaiting_adult_data': self.handle_cadastro_awaiting_adult_data,
            'cadastro_awaiting_nome': self.handle_cadastro_nome,
            'cadastro_awaiting_data_nasc': self.handle_cadastro_data_nasc,
            'cadastro_awaiting_cpf': self.handle_cadastro_cpf,
            'cadastro_awaiting_telefone': self.handle_cadastro_telefone,
            'cadastro_awaiting_email': self.handle_cadastro_email,
            'agendamento_awaiting_payment_choice': self.handle_awaiting_payment_choice,
            'agendamento_awaiting_installments': self.handle_awaiting_installments,
            'agendamento_awaiting_confirmation': self.handle_awaiting_confirmation,
        }
        handler = handlers.get(estado_atual, self.handle_fallback)
        return handler(resposta_usuario)

    def handle_fallback(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        self.memoria.clear(); self.memoria['nome_usuario'] = nome_usuario
        return {"response_message": f"Desculpe, {nome_usuario}, me perdi. Vamos recomeçar?", "new_state": "inicio", "memory_data": self.memoria}
    
    def handle_inicio(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', 'tudo bem')
        self.memoria.clear(); self.memoria['nome_usuario'] = nome_usuario
        return {"response_message": f"Vamos lá, {nome_usuario}! Quer agendar uma *Consulta* ou *Procedimento*?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

    def handle_awaiting_type(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        if 'consulta' in resposta_usuario.lower():
            self.memoria['tipo_agendamento'] = 'Consulta'
            return {"response_message": f"Entendido, {nome_usuario}. Será *Presencial* ou *Telemedicina*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        # ... (restante da lógica para procedimento)
        return {"response_message": f"Não entendi, {nome_usuario}. É 'Consulta' ou 'Procedimento'?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

    def handle_awaiting_modality(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        modalidade = "".join(resposta_usuario.strip().split()).capitalize()
        if modalidade not in ['Presencial', 'Telemedicina']: return {"response_message": f"Modalidade inválida, {nome_usuario}. É *Presencial* ou *Telemedicina*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        self.memoria['modalidade'] = modalidade
        especialidades = self._get_especialidades_from_db()
        self.memoria['lista_especialidades'] = especialidades
        nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in especialidades])
        return {"response_message": f"Perfeito, {nome_usuario}. Qual das nossas especialidades você deseja?\n\n{nomes_especialidades}", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

    def handle_awaiting_specialty(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        especialidade_escolhida = next((esp for esp in self.memoria.get('lista_especialidades', []) if resposta_usuario.lower() in esp['nome'].lower()), None)
        if not especialidade_escolhida: return {"response_message": f"Não encontrei essa especialidade, {nome_usuario}. Pode tentar de novo?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}
        self.memoria.update({'especialidade_id': especialidade_escolhida['id'], 'especialidade_nome': especialidade_escolhida['nome']})
        return self._iniciar_busca_de_horarios(especialidade_escolhida['id'], especialidade_escolhida['nome'])

    def handle_awaiting_slot_choice(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        horario_str = resposta_usuario.strip()
        horarios_ofertados = self.memoria.get('horarios_ofertados', {})
        if horario_str not in horarios_ofertados.get('horarios_disponiveis', []): return {"response_message": f"Hum, {nome_usuario}, não encontrei '{horario_str}'. Por favor, escolha um dos horários da lista.", "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
        
        data_obj = datetime.strptime(horarios_ofertados['data'], '%Y-%m-%d').date()
        hora_obj = datetime.strptime(horario_str, '%H:%M').time()
        self.memoria['data_hora_inicio'] = timezone.make_aware(datetime.combine(data_obj, hora_obj)).isoformat()
        return {"response_message": f"Perfeito, {nome_usuario}! Confirmar pré-agendamento para {data_obj.strftime('%d/%m/%Y')} às {horario_str}? (Sim/Não)", "new_state": "agendamento_awaiting_slot_confirmation", "memory_data": self.memoria}

    def handle_awaiting_slot_confirmation(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        if 'sim' not in resposta_usuario.lower():
            self.memoria.pop('data_hora_inicio', None)
            return {"response_message": f"Ok, {nome_usuario}, o pré-agendamento foi cancelado. Posso ajudar com algo mais?", "new_state": "identificando_demanda", "memory_data": self.memoria}
        
        mensagem = ("Para finalizar seu agendamento, preciso de algumas informações:\n\n"
                    "👤 *Dados do paciente:*\n• Nome completo\n• Data de nascimento (DD/MM/AAAA)\n• CPF\n\n"
                    "📞 *Dados de contato:*\n• Telefone com DDD\n• E-mail")
        return {"response_message": f"Ótimo, {nome_usuario}! {mensagem}", "new_state": "cadastro_awaiting_adult_data", "memory_data": self.memoria}

    def handle_cadastro_awaiting_adult_data(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        self.memoria['dados_coletados_temp'] = {} 
        mensagem = f"Entendido, {nome_usuario}. Vamos coletar seus dados um por vez, ok?\n\nPrimeiro, qual o seu *nome completo*?"
        return {"response_message": mensagem, "new_state": "cadastro_awaiting_nome", "memory_data": self.memoria}

    def handle_cadastro_nome(self, resposta_usuario):
        nome = resposta_usuario.strip()
        if len(nome.split()) < 2: return {"response_message": "Por favor, preciso do seu nome e sobrenome.", "new_state": "cadastro_awaiting_nome", "memory_data": self.memoria}
        self.memoria['dados_coletados_temp']['nome_completo'] = nome.title()
        return {"response_message": "Obrigado! Agora, sua *data de nascimento* (DD/MM/AAAA)?", "new_state": "cadastro_awaiting_data_nasc", "memory_data": self.memoria}

    def handle_cadastro_data_nasc(self, resposta_usuario):
        data = resposta_usuario.strip()
        if not validar_data_nascimento_formato(data): return {"response_message": "Data inválida. Use o formato DD/MM/AAAA.", "new_state": "cadastro_awaiting_data_nasc", "memory_data": self.memoria}
        self.memoria['dados_coletados_temp']['data_nascimento'] = data
        return {"response_message": "Perfeito. Agora, por favor, seu *CPF*.", "new_state": "cadastro_awaiting_cpf", "memory_data": self.memoria}

    def handle_cadastro_cpf(self, resposta_usuario):
        cpf = resposta_usuario.strip()
        if not validar_cpf_formato(cpf): return {"response_message": "CPF inválido. Digite os 11 números.", "new_state": "cadastro_awaiting_cpf", "memory_data": self.memoria}
        self.memoria['dados_coletados_temp']['cpf'] = cpf
        return {"response_message": "Certo. E qual o seu *telefone* com DDD?", "new_state": "cadastro_awaiting_telefone", "memory_data": self.memoria}

    def handle_cadastro_telefone(self, resposta_usuario):
        tel = resposta_usuario.strip()
        if not validar_telefone_formato(tel): return {"response_message": "Telefone inválido. Digite com DDD (ex: 11999998888).", "new_state": "cadastro_awaiting_telefone", "memory_data": self.memoria}
        self.memoria['dados_coletados_temp']['telefone_celular'] = tel
        return {"response_message": "Quase no fim! Por último, seu *e-mail*.", "new_state": "cadastro_awaiting_email", "memory_data": self.memoria}

    def handle_cadastro_email(self, resposta_usuario):
        email = resposta_usuario.strip().lower()
        if not validar_email_formato(email): return {"response_message": "E-mail inválido. Verifique e digite de novo.", "new_state": "cadastro_awaiting_email", "memory_data": self.memoria}
        
        dados = self.memoria['dados_coletados_temp']
        dados['email'] = email
        self.memoria.update(dados)
        del self.memoria['dados_coletados_temp']
        
        primeiro_nome = self.memoria['nome_completo'].split(' ')[0]
        mensagem = (f"Excelente, {primeiro_nome}! Recebi seus dados.\n\nComo prefere pagar? 💳\n\n1️⃣ *PIX* (5% de desconto)\n2️⃣ *Cartão de Crédito* (até 3x sem juros)")
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}

    def handle_awaiting_payment_choice(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        escolha = resposta_usuario.lower().strip()
        if 'pix' in escolha or escolha == '1':
            self.memoria['metodo_pagamento_escolhido'] = 'PIX'
            return self.handle_awaiting_confirmation("confirmado")
        elif 'cartão' in escolha or 'cartao' in escolha or escolha == '2':
            self.memoria['metodo_pagamento_escolhido'] = 'CartaoCredito'
            return {"response_message": f"Perfeito, {nome_usuario}! Cartão selecionado. Deseja pagar à vista ou parcelado em 2x ou 3x sem juros?", "new_state": "agendamento_awaiting_installments", "memory_data": self.memoria}
        else:
            return {"response_message": f"Não entendi, {nome_usuario}. Digite *1* para PIX ou *2* para Cartão.", "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}

    def handle_awaiting_installments(self, resposta_usuario):
        escolha = resposta_usuario.strip()
        if '2' in escolha: self.memoria['parcelas'] = 2
        elif '3' in escolha: self.memoria['parcelas'] = 3
        else: self.memoria['parcelas'] = 1
        return self.handle_awaiting_confirmation("confirmado")

    def handle_awaiting_confirmation(self, resposta_usuario):
        logger = logging.getLogger(__name__)
        try:
            cpf_limpo = re.sub(r'\D', '', self.memoria.get('cpf', ''))
            email = self.memoria.get('email') or None
            
            paciente, created = Paciente.objects.get_or_create(cpf=cpf_limpo, defaults={
                'nome_completo': self.memoria.get('nome_completo', ''), 'email': email,
                'telefone_celular': re.sub(r'\D', '', self.memoria.get('telefone_celular', '')),
                'data_nascimento': datetime.strptime(self.memoria.get('data_nascimento'), '%d/%m/%Y').date()
            })
            if not created:
                paciente.nome_completo = self.memoria.get('nome_completo', paciente.nome_completo)
                paciente.email = email if email else paciente.email
                paciente.telefone_celular = re.sub(r'\D', '', self.memoria.get('telefone_celular', ''))
                paciente.data_nascimento = datetime.strptime(self.memoria.get('data_nascimento'), '%d/%m/%Y').date()
                paciente.save()

            dados_agendamento = {'paciente': paciente.id, 'data_hora_inicio': self.memoria.get('data_hora_inicio'), 'status': 'Agendado', 'tipo_agendamento': 'Consulta', 'tipo_atendimento': 'Particular', 'especialidade': self.memoria.get('especialidade_id'), 'medico': self.memoria.get('medico_id'), 'modalidade': self.memoria.get('modalidade')}
            duracao = 50
            data_hora_inicio_obj = datetime.fromisoformat(self.memoria.get('data_hora_inicio'))
            dados_agendamento['data_hora_fim'] = (data_hora_inicio_obj + timedelta(minutes=duracao)).isoformat()
            
            serializer = AgendamentoWriteSerializer(data=dados_agendamento)
            if not serializer.is_valid():
                logger.error(f"[CONFIRMACAO] Erro de serialização: {json.dumps(serializer.errors)}")
                return {"response_message": f"Erro ao validar dados: {json.dumps(serializer.errors)}", "new_state": "inicio", "memory_data": self.memoria}
            
            agendamento = serializer.save()
            usuario_servico = CustomUser.objects.filter(is_superuser=True).first()
            metodo = self.memoria.get('metodo_pagamento_escolhido', 'PIX')
            criar_agendamento_e_pagamento_pendente(agendamento, usuario_servico, metodo_pagamento_escolhido=metodo, initiated_by_chatbot=True)
            agendamento.refresh_from_db()

            pagamento = agendamento.pagamento
            nome_fmt = paciente.nome_completo.split(' ')[0]
            data_fmt = timezone.localtime(agendamento.data_hora_inicio).strftime('%d/%m/%Y')
            hora_fmt = timezone.localtime(agendamento.data_hora_inicio).strftime('%H:%M')
            
            msg_confirmacao = (f"✅ *Pré-Agendamento Confirmado*\n\nOlá, {nome_fmt}! Seu horário foi reservado.\n\n*Consulta de {self.memoria.get('especialidade_nome')}*\nCom Dr(a). *{self.memoria.get('medico_nome')}*\n🗓️ *Data:* {data_fmt}\n⏰ *Hora:* {hora_fmt}\n\n")
            
            secao_pagamento = ""
            if metodo == 'PIX' and hasattr(pagamento, 'pix_copia_e_cola') and pagamento.pix_copia_e_cola:
                valor_com_desconto = pagamento.valor * Decimal('0.95')
                secao_pagamento = (f"Para confirmar, pague R$ {valor_com_desconto:.2f} (com 5% de desconto) usando o Pix Copia e Cola:\n`{pagamento.pix_copia_e_cola}`\n\nApós o pagamento, seu horário será confirmado.")
            elif metodo == 'CartaoCredito' and hasattr(pagamento, 'link_pagamento') and pagamento.link_pagamento:
                secao_pagamento = f"Clique no link para pagar com Cartão e confirmar seu horário:\n{pagamento.link_pagamento}"

            return {"response_message": f"{msg_confirmacao}{secao_pagamento}", "new_state": "inicio", "memory_data": {'nome_usuario': self.memoria.get('nome_usuario')}}
        except Exception as e:
            logger.error(f"[CONFIRMACAO] ERRO INESPERADO: {str(e)}", exc_info=True)
            return {"response_message": f"Desculpe, ocorreu um erro inesperado ao finalizar: {str(e)}", "new_state": "inicio", "memory_data": self.memoria}

    # --- HANDLERS DO FLUXO DE CANCELAMENTO ---
    def handle_cancelamento_inicio(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        return {"response_message": f"Entendido, {nome_usuario}. Para localizar o seu agendamento, por favor, informe-me o seu *CPF*.", "new_state": "cancelamento_awaiting_cpf", "memory_data": self.memoria}

    def handle_cancelamento_awaiting_cpf(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        cpf = re.sub(r'\D', '', resposta_usuario)
        if len(cpf) != 11:
            return {"response_message": "CPF inválido. Por favor, digite os 11 números.", "new_state": "cancelamento_awaiting_cpf", "memory_data": self.memoria}
        agendamentos = listar_agendamentos_futuros(cpf)
        if not agendamentos:
            return {"response_message": f"Não encontrei agendamentos futuros no seu CPF, {nome_usuario}. Posso ajudar com mais alguma coisa?", "new_state": "inicio", "memory_data": self.memoria}
        self.memoria['agendamentos_para_cancelar'] = [{"id": ag.id, "texto": f"{ag.get_tipo_agendamento_display()} - {ag.especialidade.nome if ag.especialidade else ag.procedimento.descricao} em {timezone.localtime(ag.data_hora_inicio).strftime('%d/%m/%Y às %H:%M')}"} for ag in agendamentos]
        
        if len(agendamentos) == 1:
            ag = self.memoria['agendamentos_para_cancelar'][0]
            self.memoria['agendamento_selecionado_id'] = ag['id']
            return {"response_message": f"Encontrei este agendamento, {nome_usuario}:\n• {ag['texto']}\n\nConfirma o cancelamento? (Sim/Não)", "new_state": "cancelamento_awaiting_confirmation", "memory_data": self.memoria}
        else:
            lista_texto = "\n".join([f"{i+1} - {ag['texto']}" for i, ag in enumerate(self.memoria['agendamentos_para_cancelar'])])
            return {"response_message": f"Encontrei estes agendamentos, {nome_usuario}:\n{lista_texto}\n\nQual o *número* do que deseja cancelar?", "new_state": "cancelamento_awaiting_choice", "memory_data": self.memoria}

    def handle_cancelamento_awaiting_choice(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        try:
            escolha = int(resposta_usuario.strip()) - 1
            agendamentos_lista = self.memoria.get('agendamentos_para_cancelar', [])
            if 0 <= escolha < len(agendamentos_lista):
                ag_selecionado = agendamentos_lista[escolha]
                self.memoria['agendamento_selecionado_id'] = ag_selecionado['id']
                return {"response_message": f"Confirma o cancelamento de:\n• {ag_selecionado['texto']}\n\n(Sim/Não)", "new_state": "cancelamento_awaiting_confirmation", "memory_data": self.memoria}
            else:
                raise ValueError("Escolha fora do intervalo")
        except (ValueError, IndexError):
            return {"response_message": f"Opção inválida, {nome_usuario}. Por favor, digite apenas o número correspondente.", "new_state": "cancelamento_awaiting_choice", "memory_data": self.memoria}

    def handle_cancelamento_awaiting_confirmation(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        resposta = resposta_usuario.lower()
        if 'sim' in resposta:
            agendamento_id = self.memoria.get('agendamento_selecionado_id')
            resultado = cancelar_agendamento_service(agendamento_id)
            return {"response_message": resultado.get('mensagem', 'Ocorreu um erro.'), "new_state": "inicio", "memory_data": self.memoria}
        elif 'não' in resposta or 'nao' in resposta:
            return {"response_message": f"Ok, {nome_usuario}, o agendamento foi mantido. Posso ajudar com mais alguma coisa?", "new_state": "inicio", "memory_data": self.memoria}
        else:
            return {"response_message": "Não entendi. Responda com 'Sim' ou 'Não'.", "new_state": "cancelamento_awaiting_confirmation", "memory_data": self.memoria}