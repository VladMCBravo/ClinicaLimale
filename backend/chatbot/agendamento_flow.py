# chatbot/agendamento_flow.py - VERSÃO CORRIGIDA E OTIMIZADA

import re
import json
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone

from .validators import ChatbotValidators # <-- IMPORTAÇÃO CORRIGIDA
from usuarios.models import Especialidade, CustomUser
from faturamento.models import Procedimento
from pacientes.models import Paciente
from agendamentos.serializers import AgendamentoWriteSerializer
from agendamentos.services import (
    buscar_proximo_horario_disponivel,
    criar_agendamento_e_pagamento_pendente,
    listar_agendamentos_futuros,
    cancelar_agendamento_service
)

logger = logging.getLogger(__name__)

# --- CLASSE DA MÁQUINA DE ESTADOS (REESTRUTURADA) ---
class AgendamentoManager:
    def __init__(self, session_id, memoria, base_url, chain_sintomas=None, chain_extracao_dados=None):
        self.session_id = session_id
        self.memoria = memoria
        self.base_url = base_url.rstrip('/')
        self.chain_sintomas = chain_sintomas
        self.chain_extracao_dados = chain_extracao_dados
        self.validators = ChatbotValidators()

    # --- Funções de busca no banco de dados (sem alterações) ---
    def _get_especialidades_from_db(self):
        return list(Especialidade.objects.all().order_by('nome').values('id', 'nome'))

    def _get_medicos_from_db(self, especialidade_id):
        return list(CustomUser.objects.filter(cargo='medico', especialidades__id=especialidade_id).values('id', 'first_name', 'last_name'))
    
    # --- LÓGICA PRINCIPAL DE PROCESSAMENTO ---

    def processar(self, resposta_usuario, estado_atual):
        # Mapeia o estado atual para a função de tratamento correspondente
        handlers = {
            # Fluxo de Agendamento
            'agendamento_inicio': self.handle_inicio,
            'agendamento_awaiting_type': self.handle_awaiting_type,
            'agendamento_awaiting_modality': self.handle_awaiting_modality,
            'agendamento_awaiting_specialty': self.handle_awaiting_specialty,
            'agendamento_awaiting_slot_choice': self.handle_awaiting_slot_choice,
            'agendamento_awaiting_slot_confirmation': self.handle_awaiting_slot_confirmation,
            
            # Novo Fluxo de Cadastro (Centralizado)
            'cadastro_awaiting_data': self.handle_cadastro_awaiting_data,
            'cadastro_awaiting_missing_field': self.handle_cadastro_awaiting_missing_field,

            # Fluxo de Pagamento e Confirmação
            'agendamento_awaiting_payment_choice': self.handle_awaiting_payment_choice,
            'agendamento_awaiting_installments': self.handle_awaiting_installments,
            'agendamento_awaiting_confirmation': self.handle_awaiting_confirmation,
            
            # Fluxo de Cancelamento
            'cancelamento_inicio': self.handle_cancelamento_inicio,
            'cancelamento_awaiting_cpf': self.handle_cancelamento_awaiting_cpf,
            'cancelamento_awaiting_choice': self.handle_cancelamento_awaiting_choice,
            'cancelamento_awaiting_confirmation': self.handle_cancelamento_awaiting_confirmation,

            # Fluxo de Triagem
            'triagem_processar_sintomas': self.handle_triagem_sintomas,
        }
        handler = handlers.get(estado_atual, self.handle_fallback)
        return handler(resposta_usuario)

    def handle_fallback(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        self.memoria.clear()
        self.memoria['nome_usuario'] = nome_usuario
        return {"response_message": f"Desculpe, {nome_usuario}, me perdi. Vamos recomeçar? Pode me dizer como posso ajudar?", "new_state": "identificando_demanda", "memory_data": self.memoria}

    # --- INÍCIO DO FLUXO DE AGENDAMENTO ---
    def handle_inicio(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', 'tudo bem')
        # Limpa memória, mas mantém o nome
        self.memoria.clear()
        self.memoria['nome_usuario'] = nome_usuario
        return {"response_message": f"Vamos lá, {nome_usuario}! Quer agendar uma *Consulta* ou *Procedimento*?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

    def handle_awaiting_type(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        if 'consulta' in resposta_usuario.lower():
            self.memoria['tipo_agendamento'] = 'Consulta'
            return {"response_message": f"Entendido, {nome_usuario}. Será *Presencial* ou *Telemedicina*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        elif 'procedimento' in resposta_usuario.lower():
            # Lógica para procedimento (se houver)
            return {"response_message": "Ainda não estou pronto para agendar procedimentos. Vamos agendar uma consulta?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        return {"response_message": f"Não entendi, {nome_usuario}. É 'Consulta' ou 'Procedimento'?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

    def handle_awaiting_modality(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        modalidade = "".join(resposta_usuario.strip().split()).capitalize()
        if modalidade not in ['Presencial', 'Telemedicina']:
            return {"response_message": f"Modalidade inválida, {nome_usuario}. É *Presencial* ou *Telemedicina*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        
        self.memoria['modalidade'] = modalidade
        especialidades = self._get_especialidades_from_db()
        self.memoria['lista_especialidades'] = especialidades
        nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in especialidades])
        return {"response_message": f"Perfeito, {nome_usuario}. Qual das nossas especialidades você deseja?\n\n{nomes_especialidades}", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

    def handle_awaiting_specialty(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        especialidade_escolhida = next((esp for esp in self.memoria.get('lista_especialidades', []) if resposta_usuario.lower() in esp['nome'].lower()), None)
        if not especialidade_escolhida:
            return {"response_message": f"Não encontrei essa especialidade, {nome_usuario}. Pode tentar de novo?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}
        
        self.memoria.update({'especialidade_id': especialidade_escolhida['id'], 'especialidade_nome': especialidade_escolhida['nome']})
        return self._iniciar_busca_de_horarios(especialidade_escolhida['id'], especialidade_escolhida['nome'])
    
    def _iniciar_busca_de_horarios(self, especialidade_id, especialidade_nome):
        nome_usuario = self.memoria.get('nome_usuario', '')
        medicos = self._get_medicos_from_db(especialidade_id=especialidade_id)
        if not medicos:
            return {"response_message": f"Desculpe, {nome_usuario}, não encontrei médicos para {especialidade_nome} no momento.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        
        medico = medicos[0] # Simplificando para pegar o primeiro médico
        self.memoria.update({'medico_id': medico['id'], 'medico_nome': f"{medico['first_name']} {medico['last_name']}"})
        horarios = buscar_proximo_horario_disponivel(medico_id=medico['id'])
        
        if not horarios or not horarios.get('horarios_disponiveis'):
            return {"response_message": f"Infelizmente, {nome_usuario}, não há horários online para Dr(a). {self.memoria['medico_nome']}.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        
        self.memoria['horarios_ofertados'] = horarios
        data_formatada = datetime.strptime(horarios['data'], '%Y-%m-%d').strftime('%d/%m/%Y')
        horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]]
        mensagem = (f"Ótima escolha, {nome_usuario}! Encontrei estes horários para Dr(a). *{self.memoria['medico_nome']}* no dia *{data_formatada}*:\n\n" + "\n".join(horarios_formatados) + "\n\nQual deles prefere? Se quiser outro dia, pode me dizer.")
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

    def handle_awaiting_slot_choice(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        horario_str = resposta_usuario.strip()
        horarios_ofertados = self.memoria.get('horarios_ofertados', {})
        
        if horario_str not in horarios_ofertados.get('horarios_disponiveis', []):
            return {"response_message": f"Hum, {nome_usuario}, não encontrei '{horario_str}'. Por favor, escolha um dos horários da lista.", "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
        
        data_obj = datetime.strptime(horarios_ofertados['data'], '%Y-%m-%d').date()
        hora_obj = datetime.strptime(horario_str, '%H:%M').time()
        self.memoria['data_hora_inicio'] = timezone.make_aware(datetime.combine(data_obj, hora_obj)).isoformat()
        
        return {"response_message": f"Perfeito, {nome_usuario}! Confirmar pré-agendamento para {data_obj.strftime('%d/%m/%Y')} às {horario_str}? (Sim/Não)", "new_state": "agendamento_awaiting_slot_confirmation", "memory_data": self.memoria}

    def handle_awaiting_slot_confirmation(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        if 'sim' not in resposta_usuario.lower():
            self.memoria.pop('data_hora_inicio', None)
            return {"response_message": f"Ok, {nome_usuario}, o pré-agendamento foi cancelado. Posso ajudar com algo mais?", "new_state": "identificando_demanda", "memory_data": self.memoria}
        
        # <<< PONTO CRÍTICO DA MUDANÇA >>>
        # Agora pedimos os dados e direcionamos para o estado que usa a IA
        mensagem = ("Ótimo! Para finalizar, preciso de alguns dados do paciente. Pode me informar:\n\n"
                    "• Nome completo\n"
                    "• Data de nascimento (DD/MM/AAAA)\n"
                    "• CPF\n"
                    "• Celular com DDD\n"
                    "• E-mail\n\n"
                    "Pode enviar tudo de uma vez, eu consigo entender! 😉")
        return {"response_message": mensagem, "new_state": "cadastro_awaiting_data", "memory_data": self.memoria}

    # --- NOVO FLUXO DE CADASTRO UNIFICADO ---
    
    def handle_cadastro_awaiting_data(self, resposta_usuario):
        """
        Este handler usa a IA para extrair os dados e depois valida o que foi extraído.
        Se algo faltar, ele transiciona para `cadastro_awaiting_missing_field`.
        """
        logger.warning(f"Tentando extrair dados do texto: {resposta_usuario}")
        if not self.chain_extracao_dados:
            logger.error("A IA de extração de dados não foi inicializada!")
            return {"response_message": "Desculpe, estou com um problema técnico para processar seus dados. Por favor, tente mais tarde.", "new_state": "inicio", "memory_data": self.memoria}
            
        try:
            dados_extraidos = self.chain_extracao_dados.invoke({"dados_do_usuario": resposta_usuario})
            logger.warning(f"Dados extraídos pela IA: {dados_extraidos}")
            
            # Salva os dados extraídos na memória para validação
            self.memoria['dados_paciente'] = dados_extraidos
            
            # Inicia o processo de validação e coleta de campos faltantes
            return self._validar_e_coletar_proximo_campo(None)

        except Exception as e:
            logger.error(f"Erro ao invocar a IA de extração: {e}", exc_info=True)
            return {"response_message": "Tive um problema ao ler seus dados. Vamos tentar um por um. Primeiro, qual o *nome completo* do paciente?", "new_state": "cadastro_awaiting_missing_field", "memory_data": {"missing_field": "nome_completo"}}

    def handle_cadastro_awaiting_missing_field(self, resposta_usuario):
        """
        Este handler recebe a resposta para um campo que estava faltando
        e continua o ciclo de validação.
        """
        campo_faltante = self.memoria.get('missing_field')
        if campo_faltante:
            # Atualiza o campo que estava faltando com a resposta do usuário
            self.memoria['dados_paciente'][campo_faltante] = resposta_usuario.strip()

        # Continua o ciclo de validação a partir do campo que acabamos de preencher
        return self._validar_e_coletar_proximo_campo(campo_faltante)

    def _validar_e_coletar_proximo_campo(self, ultimo_campo_preenchido=None):
        """
        Motor central de validação. Verifica os campos em ordem.
        Se encontra um campo inválido, pede para o usuário.
        Se todos estão válidos, avança para o pagamento.
        """
        campos_a_validar = {
            'nome_completo': self.validators.validar_nome_completo,
            'data_nascimento': self.validators.validar_data_nascimento_avancada,
            'cpf': self.validators.validar_cpf_completo,
            'telefone_celular': self.validators.validar_telefone_brasileiro,
            'email': self.validators.validar_email_avancado,
        }

        dados_paciente = self.memoria.get('dados_paciente', {})

        for campo, funcao_validacao in campos_a_validar.items():
            valor = dados_paciente.get(campo, "")
            is_valid, mensagem_erro, _ = funcao_validacao(valor)
            
            if not is_valid:
                # Se o campo é inválido, pede ao usuário
                mensagens_pedido = {
                    'nome_completo': "Qual o *nome completo* do paciente?",
                    'data_nascimento': f"Hmm, a data de nascimento parece inválida. {mensagem_erro}. Qual a *data de nascimento* correta (DD/MM/AAAA)?",
                    'cpf': f"O CPF parece inválido. {mensagem_erro}. Por favor, digite o *CPF* (11 números).",
                    'telefone_celular': f"O telefone parece inválido. {mensagem_erro}. Qual o *celular com DDD*?",
                    'email': f"O e-mail parece inválido. {mensagem_erro}. Qual o *e-mail* correto?",
                }
                
                # Guarda qual campo estamos pedindo
                self.memoria['missing_field'] = campo
                
                return {
                    "response_message": mensagens_pedido[campo],
                    "new_state": "cadastro_awaiting_missing_field",
                    "memory_data": self.memoria
                }
            else:
                # Se o campo é válido, garante que ele está na memória principal
                self.memoria[campo] = valor
        
        # Se todos os campos passaram na validação
        self.memoria.pop('missing_field', None)
        self.memoria.pop('dados_paciente', None)
        
        primeiro_nome = self.memoria['nome_completo'].split(' ')[0]
        mensagem = (f"Excelente, {primeiro_nome}! Recebi seus dados.\n\nComo prefere pagar? 💳\n\n1️⃣ *PIX* (5% de desconto)\n2️⃣ *Cartão de Crédito* (até 3x sem juros)")
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}


    # --- FLUXO DE PAGAMENTO E CONFIRMAÇÃO (sem alterações críticas) ---
    def handle_awaiting_payment_choice(self, resposta_usuario):
        # (código original pode ser mantido)
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
        # (código original pode ser mantido)
        escolha = resposta_usuario.strip()
        if '2' in escolha: self.memoria['parcelas'] = 2
        elif '3' in escolha: self.memoria['parcelas'] = 3
        else: self.memoria['parcelas'] = 1
        return self.handle_awaiting_confirmation("confirmado")

    def handle_awaiting_confirmation(self, resposta_usuario):
        # (código original pode ser mantido, com pequenas melhorias)
        try:
            # Valida e limpa os dados antes de salvar
            _, _, cpf_fmt = self.validators.validar_cpf_completo(self.memoria.get('cpf', ''))
            _, _, tel_fmt = self.validators.validar_telefone_brasileiro(self.memoria.get('telefone_celular', ''))
            _, _, email_fmt = self.validators.validar_email_avancado(self.memoria.get('email', ''))
            _, _, nome_fmt = self.validators.validar_nome_completo(self.memoria.get('nome_completo', ''))
            is_valid_date, _, data_obj = self.validators.validar_data_nascimento_avancada(self.memoria.get('data_nascimento', ''))

            cpf_limpo = re.sub(r'\D', '', cpf_fmt)
            tel_limpo = re.sub(r'\D', '', tel_fmt)

            paciente, created = Paciente.objects.get_or_create(cpf=cpf_limpo, defaults={
                'nome_completo': nome_fmt, 'email': email_fmt,
                'telefone_celular': tel_limpo,
                'data_nascimento': data_obj
            })
            if not created:
                # Atualiza os dados se o paciente já existir
                paciente.nome_completo = nome_fmt
                paciente.email = email_fmt
                paciente.telefone_celular = tel_limpo
                paciente.data_nascimento = data_obj
                paciente.save()

            dados_agendamento = {
                'paciente': paciente.id, 'data_hora_inicio': self.memoria.get('data_hora_inicio'), 
                'status': 'Agendado', 'tipo_agendamento': 'Consulta', 'tipo_atendimento': 'Particular', 
                'especialidade': self.memoria.get('especialidade_id'), 'medico': self.memoria.get('medico_id'), 
                'modalidade': self.memoria.get('modalidade')
            }
            duracao = 50 # minutos
            data_hora_inicio_obj = datetime.fromisoformat(self.memoria.get('data_hora_inicio'))
            dados_agendamento['data_hora_fim'] = (data_hora_inicio_obj + timedelta(minutes=duracao)).isoformat()
            
            serializer = AgendamentoWriteSerializer(data=dados_agendamento)
            if not serializer.is_valid():
                logger.error(f"[CONFIRMACAO] Erro de serialização: {json.dumps(serializer.errors)}")
                return {"response_message": f"Desculpe, tive um problema ao validar os dados do agendamento. A equipe técnica foi notificada.", "new_state": "inicio", "memory_data": self.memoria}
            
            agendamento = serializer.save()
            usuario_servico = CustomUser.objects.filter(is_superuser=True).first()
            metodo = self.memoria.get('metodo_pagamento_escolhido', 'PIX')
            
            criar_agendamento_e_pagamento_pendente(agendamento, usuario_servico, metodo_pagamento_escolhido=metodo, initiated_by_chatbot=True)
            agendamento.refresh_from_db()

            pagamento = agendamento.pagamento
            nome_paciente_fmt = paciente.nome_completo.split(' ')[0]
            data_fmt = timezone.localtime(agendamento.data_hora_inicio).strftime('%d/%m/%Y')
            hora_fmt = timezone.localtime(agendamento.data_hora_inicio).strftime('%H:%M')
            
            msg_confirmacao = (f"✅ *Pré-Agendamento Confirmado*\n\nOlá, {nome_paciente_fmt}! Seu horário foi reservado.\n\n*Consulta de {self.memoria.get('especialidade_nome')}*\nCom Dr(a). *{self.memoria.get('medico_nome')}*\n🗓️ *Data:* {data_fmt}\n⏰ *Hora:* {hora_fmt}\n\n")
            
            secao_pagamento = ""
            if metodo == 'PIX' and hasattr(pagamento, 'pix_copia_e_cola') and pagamento.pix_copia_e_cola:
                valor_com_desconto = pagamento.valor * Decimal('0.95')
                secao_pagamento = (f"Para confirmar, pague R$ {valor_com_desconto:.2f} (com 5% de desconto) usando o Pix Copia e Cola em até 1 hora:\n`{pagamento.pix_copia_e_cola}`\n\nApós o pagamento, seu horário será confirmado automaticamente.")
            elif metodo == 'CartaoCredito' and hasattr(pagamento, 'link_pagamento') and pagamento.link_pagamento:
                secao_pagamento = f"Clique no link para pagar com Cartão e confirmar seu horário:\n{pagamento.link_pagamento}"
            else:
                secao_pagamento = "O pagamento será realizado na clínica no dia do seu atendimento."

            return {"response_message": f"{msg_confirmacao}{secao_pagamento}", "new_state": "inicio", "memory_data": {'nome_usuario': self.memoria.get('nome_usuario')}}
        except Exception as e:
            logger.error(f"[CONFIRMACAO] ERRO INESPERADO: {str(e)}", exc_info=True)
            return {"response_message": f"Desculpe, ocorreu um erro inesperado ao finalizar o agendamento. A nossa equipe já foi notificada.", "new_state": "inicio", "memory_data": self.memoria}

    # --- FLUXO DE CANCELAMENTO E TRIAGEM (sem alterações) ---
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
        
        self.memoria['agendamentos_para_cancelar'] = [{"id": ag.id, "texto": f"{ag.get_tipo_agendamento_display()} - {ag.especialidade.nome if ag.especialidade else 'Serviço'} em {timezone.localtime(ag.data_hora_inicio).strftime('%d/%m/%Y às %H:%M')}"} for ag in agendamentos]
        
        if len(agendamentos) == 1:
            ag = self.memoria['agendamentos_para_cancelar'][0]
            self.memoria['agendamento_selecionado_id'] = ag['id']
            return {"response_message": f"Encontrei este agendamento:\n• {ag['texto']}\n\nConfirma o cancelamento? (Sim/Não)", "new_state": "cancelamento_awaiting_confirmation", "memory_data": self.memoria}
        else:
            lista_texto = "\n".join([f"{i+1} - {ag['texto']}" for i, ag in enumerate(self.memoria['agendamentos_para_cancelar'])])
            return {"response_message": f"Encontrei estes agendamentos:\n{lista_texto}\n\nQual o *número* do que deseja cancelar?", "new_state": "cancelamento_awaiting_choice", "memory_data": self.memoria}

    def handle_cancelamento_awaiting_choice(self, resposta_usuario):
        # (código original pode ser mantido)
        try:
            escolha = int(resposta_usuario.strip()) - 1
            agendamentos_lista = self.memoria.get('agendamentos_para_cancelar', [])
            if 0 <= escolha < len(agendamentos_lista):
                ag_selecionado = agendamentos_lista[escolha]
                self.memoria['agendamento_selecionado_id'] = ag_selecionado['id']
                return {"response_message": f"Confirma o cancelamento de:\n• {ag_selecionado['texto']}\n\n(Sim/Não)", "new_state": "cancelamento_awaiting_confirmation", "memory_data": self.memoria}
            else: raise ValueError()
        except:
            return {"response_message": "Opção inválida. Por favor, digite apenas o número.", "new_state": "cancelamento_awaiting_choice", "memory_data": self.memoria}

    def handle_cancelamento_awaiting_confirmation(self, resposta_usuario):
        # (código original pode ser mantido)
        if 'sim' in resposta_usuario.lower():
            agendamento_id = self.memoria.get('agendamento_selecionado_id')
            resultado = cancelar_agendamento_service(agendamento_id)
            return {"response_message": resultado.get('mensagem', 'Ocorreu um erro.'), "new_state": "inicio", "memory_data": self.memoria}
        else:
            return {"response_message": "Ok, o agendamento foi mantido. Posso ajudar com mais alguma coisa?", "new_state": "inicio", "memory_data": self.memoria}
    
    def handle_triagem_sintomas(self, resposta_usuario):
        if not self.chain_sintomas:
            return {"response_message": "Desculpe, a função de triagem está indisponível.", "new_state": "identificando_demanda", "memory_data": self.memoria}
        
        resultado_ia = self.chain_sintomas.invoke({"sintomas_do_usuario": resposta_usuario})
        especialidade_sugerida = resultado_ia.get('especialidade_sugerida', 'Nenhuma')

        if especialidade_sugerida != 'Nenhuma':
            # Inicia o fluxo de agendamento já com a especialidade
            return self.handle_awaiting_specialty(especialidade_sugerida)
        else:
            return {"response_message": "Com base nos sintomas, não consegui identificar uma especialidade. Que tal agendar com um Clínico Geral para uma avaliação inicial?", "new_state": "identificando_demanda", "memory_data": self.memoria}