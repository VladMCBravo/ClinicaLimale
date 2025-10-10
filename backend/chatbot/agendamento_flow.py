# chatbot/agendamento_flow.py - VERSÃO FINALÍSSIMA E CORRIGIDA

import re
import json
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone

from .validators import ChatbotValidators
from usuarios.models import Especialidade, CustomUser
from pacientes.models import Paciente
from agendamentos.serializers import AgendamentoWriteSerializer
from agendamentos.services import (
    buscar_proximo_horario_disponivel,
    criar_agendamento_e_pagamento_pendente,
    listar_agendamentos_futuros,
    cancelar_agendamento_service
)

logger = logging.getLogger(__name__)

class AgendamentoManager:
    def __init__(self, session_id, memoria, base_url, **kwargs):
        self.session_id = session_id
        self.memoria = memoria
        self.base_url = base_url.rstrip('/')
        self.validators = ChatbotValidators()

    def _get_especialidades_from_db(self):
        return list(Especialidade.objects.all().order_by('nome').values('id', 'nome'))

    def _get_medicos_from_db(self, especialidade_id):
        return list(CustomUser.objects.filter(cargo='medico', especialidades__id=especialidade_id).values('id', 'first_name', 'last_name'))

    def processar(self, resposta_usuario, estado_atual):
        handlers = {
            'agendamento_inicio': self.handle_inicio,
            'agendamento_awaiting_type': self.handle_awaiting_type,
            'agendamento_awaiting_modality': self.handle_awaiting_modality,
            'agendamento_awaiting_specialty': self.handle_awaiting_specialty,
            'agendamento_awaiting_slot_choice': self.handle_awaiting_slot_choice,
            'agendamento_awaiting_slot_confirmation': self.handle_awaiting_slot_confirmation,
            'cadastro_awaiting_cpf': self.handle_cadastro_awaiting_cpf,
            'cadastro_awaiting_missing_field': self.handle_cadastro_awaiting_missing_field,
            'agendamento_awaiting_payment_choice': self.handle_awaiting_payment_choice,
            'agendamento_awaiting_installments': self.handle_awaiting_installments,
            'agendamento_awaiting_confirmation': self.handle_awaiting_confirmation,
            'cancelamento_inicio': self.handle_cancelamento_inicio,
            'cancelamento_awaiting_cpf': self.handle_cancelamento_awaiting_cpf,
            'cancelamento_awaiting_choice': self.handle_cancelamento_awaiting_choice,
            'cancelamento_awaiting_confirmation': self.handle_cancelamento_awaiting_confirmation,
        }
        handler = handlers.get(estado_atual, self.handle_fallback)
        return handler(resposta_usuario)

    def handle_fallback(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        # MENSAGEM MAIS ÚTIL E GUIADA
        mensagem = (
            f"Peço desculpas, {nome_usuario}, parece que nos desviamos do assunto do agendamento. "
            "Não entendi muito bem sua última mensagem.\n\n"
            "Se quiser, podemos tentar novamente. Você gostaria de:\n"
            "1. Agendar uma consulta\n"
            "2. Saber o preço de um serviço\n"
            "3. Cancelar um agendamento\n\n"
            "Ou digite *'recomeçar'* a qualquer momento para voltar ao menu principal."
        )
        return {"response_message": mensagem, "new_state": "identificando_demanda", "memory_data": {'nome_usuario': nome_usuario}}

    def handle_inicio(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        self.memoria.clear()
        self.memoria['nome_usuario'] = nome_usuario
        return {"response_message": f"Perfeito, {nome_usuario}! Nosso time está pronto para te atender. O agendamento será para uma *Consulta* ou *Procedimento*?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

    def handle_awaiting_type(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        if 'consulta' in resposta_usuario.lower():
            self.memoria['tipo_agendamento'] = 'Consulta'
            return {"response_message": "Ótimo. E você prefere o conforto da *Telemedicina* ou o atendimento *Presencial* em nossa clínica?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        elif 'procedimento' in resposta_usuario.lower():
            return {"response_message": "No momento, agendamentos de procedimentos são feitos com nossa equipe. Posso te ajudar a agendar uma consulta de avaliação?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}
        return {"response_message": f"Não entendi, {nome_usuario}. É 'Consulta' ou 'Procedimento'?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

    def handle_awaiting_modality(self, resposta_usuario):
        modalidade = "".join(resposta_usuario.strip().split()).capitalize()
        if modalidade not in ['Presencial', 'Telemedicina']:
            return {"response_message": "Modalidade inválida. É *Presencial* ou *Telemedicina*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}

        self.memoria['modalidade'] = modalidade
        especialidades = self._get_especialidades_from_db()
        self.memoria['lista_especialidades'] = especialidades
        nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in especialidades])
        return {"response_message": f"Perfeito. Qual das nossas especialidades você deseja?\n\n{nomes_especialidades}", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

    def handle_awaiting_specialty(self, resposta_usuario):
        especialidade_escolhida = next((esp for esp in self.memoria.get('lista_especialidades', []) if resposta_usuario.lower() in esp['nome'].lower()), None)
        if not especialidade_escolhida:
            return {"response_message": "Não encontrei essa especialidade. Pode tentar de novo?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

        self.memoria.update({'especialidade_id': especialidade_escolhida['id'], 'especialidade_nome': especialidade_escolhida['nome']})
        return self._iniciar_busca_de_horarios(especialidade_escolhida['id'], especialidade_escolhida['nome'])

    def _iniciar_busca_de_horarios(self, especialidade_id, especialidade_nome):
        medicos = self._get_medicos_from_db(especialidade_id=especialidade_id)
        if not medicos:
            return {"response_message": f"Desculpe, não encontrei médicos para {especialidade_nome} no momento.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}

        medico = medicos[0]
        self.memoria.update({'medico_id': medico['id'], 'medico_nome': f"{medico['first_name']} {medico['last_name']}"})
        horarios = buscar_proximo_horario_disponivel(medico_id=medico['id'])

        if not horarios or not horarios.get('horarios_disponiveis'):
            medico_nome = self.memoria.get('medico_nome', 'médico')
            return {"response_message": f"Infelizmente, não há horários disponíveis para Dr(a). {medico_nome} nos próximos dias.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}

        self.memoria['horarios_ofertados'] = horarios
        try:
            from dateutil.parser import parse
            data_formatada = parse(horarios['data']).strftime('%d/%m/%Y')
        except (ValueError, TypeError):
            data_formatada = horarios.get('data', 'Data inválida')
        
        horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]]
        medico_nome_completo = f"Dr(a). {self.memoria['medico_nome']}"
        mensagem = (f"Excelente escolha! Cuidar da saúde é fundamental. Encontrei estes horários com {medico_nome_completo}, que é uma referência na área, para o dia *{data_formatada}*:\n\n" + "\n".join(horarios_formatados) + "\n\nQual deles prefere?")
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

    def handle_awaiting_slot_choice(self, resposta_usuario):
        horario_str = resposta_usuario.strip()
        horarios_ofertados = self.memoria.get('horarios_ofertados', {})

        if horario_str not in horarios_ofertados.get('horarios_disponiveis', []):
            return {"response_message": f"Hum, não encontrei '{horario_str}'. Por favor, escolha um dos horários da lista.", "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
        try:
            from dateutil.parser import parse
            data_obj = parse(horarios_ofertados['data']).date()
            hora_obj = parse(horario_str).time()
            self.memoria['data_hora_inicio'] = timezone.make_aware(datetime.combine(data_obj, hora_obj)).isoformat()
        except (ValueError, TypeError) as e:
            logger.error(f"Erro ao fazer parse da data/hora: {e}")
            return {"response_message": "Erro ao processar horário. Tente novamente.", "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

        return {"response_message": f"Perfeito! Seu horário com Dr(a). {self.memoria.get('medico_nome')} para *{data_obj.strftime('%d/%m/%Y')} às {horario_str}* está pré-reservado. Confirma? (Sim/Não)", "new_state": "agendamento_awaiting_slot_confirmation", "memory_data": self.memoria}

    def handle_awaiting_slot_confirmation(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        if 'sim' not in resposta_usuario.lower():
            self.memoria.pop('data_hora_inicio', None)
            return {"response_message": f"Ok, {nome_usuario}, o pré-agendamento foi cancelado.", "new_state": "identificando_demanda", "memory_data": self.memoria}

        mensagem = "Ótimo! Para agilizar e garantir a segurança do seu agendamento, por favor, me informe o seu *CPF* (apenas os números). Assim, posso verificar se você já tem um cadastro conosco."
        return {"response_message": mensagem, "new_state": "cadastro_awaiting_cpf", "memory_data": self.memoria}

    def handle_cadastro_awaiting_cpf(self, resposta_usuario):
        is_valid, mensagem_erro, _ = self.validators.validar_cpf_completo(resposta_usuario)
        if not is_valid:
            return {"response_message": f"O CPF parece inválido. {mensagem_erro}. Tente novamente.", "new_state": "cadastro_awaiting_cpf", "memory_data": self.memoria}
        
        cpf_numeros = re.sub(r'\D', '', resposta_usuario)
        paciente = Paciente.objects.filter(cpf=cpf_numeros).first()

        if paciente:
            self.memoria.update({
                'cpf': paciente.cpf, 'nome_completo': paciente.nome_completo,
                'data_nascimento': paciente.data_nascimento.strftime('%d/%m/%Y') if paciente.data_nascimento else '',
                'telefone_celular': paciente.telefone_celular, 'email': paciente.email
            })
            primeiro_nome = paciente.nome_completo.split(' ')[0]
            mensagem = f"Que ótimo te ver de volta, {primeiro_nome}! Já encontrei seu cadastro. Estamos prontos para ir para o pagamento."
            return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}
        else:
            self.memoria['cpf'] = cpf_numeros
            mensagem = "Entendido. Para seu primeiro agendamento, preciso de algumas informações rápidas. Vamos começar pelo seu *nome completo*, por favor."
            self.memoria['dados_paciente'] = {'cpf': cpf_numeros}
            self.memoria['missing_field'] = 'nome_completo'
            return {"response_message": mensagem, "new_state": "cadastro_awaiting_missing_field", "memory_data": self.memoria}

    def handle_cadastro_awaiting_missing_field(self, resposta_usuario):
        campo_faltante = self.memoria.get('missing_field')
        if campo_faltante:
            self.memoria.setdefault('dados_paciente', {})[campo_faltante] = resposta_usuario.strip()
        return self._validar_e_coletar_proximo_campo()

    def _validar_e_coletar_proximo_campo(self):
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
                mensagens_pedido = {
                    'nome_completo': "Qual o *nome completo* do paciente?",
                    'data_nascimento': f"Hmm, a data parece inválida. {mensagem_erro}. Qual a data correta (DD/MM/AAAA)?",
                    'cpf': "O CPF que você informou parece inválido. Por favor, digite o *CPF* correto (11 números).",
                    'telefone_celular': f"O telefone parece inválido. {mensagem_erro}. Qual o *celular com DDD*?",
                    'email': f"O e-mail parece inválido. {mensagem_erro}. Qual o *e-mail* correto?",
                }
                self.memoria['missing_field'] = campo
                return {"response_message": mensagens_pedido[campo], "new_state": "cadastro_awaiting_missing_field", "memory_data": self.memoria}

        self.memoria.update(dados_paciente)
        self.memoria.pop('missing_field', None)
        self.memoria.pop('dados_paciente', None)
        primeiro_nome = self.memoria['nome_completo'].split(' ')[0]
        mensagem = (f"Excelente, {primeiro_nome}! Recebi seus dados.\n\nComo prefere pagar? 💳\n\n1️⃣ *PIX* (5% de desconto)\n2️⃣ *Cartão de Crédito* (até 3x sem juros)")
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}

    def handle_awaiting_payment_choice(self, resposta_usuario):
        escolha = resposta_usuario.lower().strip()
        if 'pix' in escolha or escolha == '1':
            self.memoria['metodo_pagamento_escolhido'] = 'PIX'
            return self.handle_awaiting_confirmation("confirmado")
        elif 'cartão' in escolha or 'cartao' in escolha or escolha == '2':
            self.memoria['metodo_pagamento_escolhido'] = 'CartaoCredito'
            return {"response_message": f"Perfeito! Cartão selecionado. Deseja pagar à vista ou parcelado em 2x ou 3x sem juros?", "new_state": "agendamento_awaiting_installments", "memory_data": self.memoria}
        else:
            return {"response_message": f"Não entendi. Digite *1* para PIX ou *2* para Cartão.", "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}

    def handle_awaiting_installments(self, resposta_usuario):
        escolha = resposta_usuario.strip()
        if '2' in escolha: self.memoria['parcelas'] = 2
        elif '3' in escolha: self.memoria['parcelas'] = 3
        else: self.memoria['parcelas'] = 1
        return self.handle_awaiting_confirmation("confirmado")

    def handle_awaiting_confirmation(self, resposta_usuario):
        try:
            # Validações dos dados da memória antes de salvar
            is_valid_cpf, _, cpf_fmt = self.validators.validar_cpf_completo(self.memoria.get('cpf', ''))
            is_valid_tel, _, tel_fmt = self.validators.validar_telefone_brasileiro(self.memoria.get('telefone_celular', ''))
            is_valid_email, _, email_fmt = self.validators.validar_email_avancado(self.memoria.get('email', ''))
            is_valid_nome, _, nome_fmt = self.validators.validar_nome_completo(self.memoria.get('nome_completo', ''))
            is_valid_date, _, data_obj = self.validators.validar_data_nascimento_avancada(self.memoria.get('data_nascimento', ''))
            if not all([is_valid_cpf, is_valid_tel, is_valid_email, is_valid_nome, is_valid_date]):
                logger.error(f"Erro de validação final. Dados: {self.memoria}")
                return {"response_message": "Um ou mais dos seus dados parecem inválidos. Vamos recomeçar o cadastro.", "new_state": "cadastro_awaiting_cpf", "memory_data": self.memoria}

            cpf_limpo = re.sub(r'\D', '', cpf_fmt)
            tel_limpo = re.sub(r'\D', '', tel_fmt)

            paciente, created = Paciente.objects.get_or_create(cpf=cpf_limpo, defaults={'nome_completo': nome_fmt, 'email': email_fmt, 'telefone_celular': tel_limpo, 'data_nascimento': data_obj})
            if not created:
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
            duracao = 50 
            data_hora_inicio_obj = datetime.fromisoformat(self.memoria.get('data_hora_inicio'))
            dados_agendamento['data_hora_fim'] = (data_hora_inicio_obj + timedelta(minutes=duracao)).isoformat()
            serializer = AgendamentoWriteSerializer(data=dados_agendamento)
            if not serializer.is_valid():
                logger.error(f"Erro de serialização: {json.dumps(serializer.errors)}")
                return {"response_message": "Desculpe, tive um problema ao validar os dados do agendamento.", "new_state": "inicio", "memory_data": self.memoria}

            agendamento = serializer.save()
            usuario_servico = CustomUser.objects.filter(is_superuser=True).first()
            metodo = self.memoria.get('metodo_pagamento_escolhido', 'PIX')

            criar_agendamento_e_pagamento_pendente(agendamento, usuario_servico, metodo_pagamento_escolhido=metodo, initiated_by_chatbot=True)
            agendamento.refresh_from_db()
            pagamento = agendamento.pagamento if hasattr(agendamento, 'pagamento') else None
            nome_paciente_fmt = paciente.nome_completo.split(' ')[0]
            data_fmt = timezone.localtime(agendamento.data_hora_inicio).strftime('%d/%m/%Y')
            hora_fmt = timezone.localtime(agendamento.data_hora_inicio).strftime('%H:%M')

            msg_confirmacao = (f"✅ *Agendamento Confirmado!*\n\nOlá, {nome_paciente_fmt}! Seu horário está garantido.\n\n*Consulta de {self.memoria.get('especialidade_nome')}*\nCom Dr(a). *{self.memoria.get('medico_nome')}*\n🗓️ *Data:* {data_fmt}\n⏰ *Hora:* {hora_fmt}\n\n")
            secao_pagamento = ""
            if pagamento:
                if metodo == 'PIX' and pagamento.pix_copia_e_cola:
                    valor_com_desconto = pagamento.valor * Decimal('0.95')
                    secao_pagamento = (f"Para finalizar, pague R$ {valor_com_desconto:.2f} (com 5% de desconto) usando o Pix Copia e Cola em até 1 hora:\n`{pagamento.pix_copia_e_cola}`\n\nLembre-se de enviar o comprovante aqui mesmo para confirmar sua vaga.")
                elif metodo == 'CartaoCredito' and pagamento.link_pagamento:
                    secao_pagamento = f"Clique no link a seguir para pagar com Cartão de Crédito e garantir seu horário:\n{pagamento.link_pagamento}"
            if not secao_pagamento:
                secao_pagamento = "O pagamento será realizado na recepção da clínica no dia do seu atendimento."
            return {"response_message": f"{msg_confirmacao}{secao_pagamento}", "new_state": "inicio", "memory_data": {'nome_usuario': self.memoria.get('nome_usuario')}}
        except Exception as e:
            logger.error(f"ERRO INESPERADO NA CONFIRMAÇÃO: {str(e)}", exc_info=True)
            return {"response_message": "Desculpe, ocorreu um erro inesperado ao finalizar o agendamento.", "new_state": "inicio", "memory_data": self.memoria}

    def handle_cancelamento_inicio(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        return {"response_message": f"Entendido, {nome_usuario}. Para localizar seu agendamento, por favor, informe seu *CPF*.", "new_state": "cancelamento_awaiting_cpf", "memory_data": self.memoria}
    
    # CORREÇÃO: Adicionando a função que estava faltando
    def handle_cancelamento_awaiting_cpf(self, resposta_usuario):
        is_valid, _, cpf_limpo = self.validators.validar_cpf_completo(resposta_usuario)
        if not is_valid:
            return {"response_message": "CPF inválido. Por favor, digite os 11 números.", "new_state": "cancelamento_awaiting_cpf", "memory_data": self.memoria}
        
        agendamentos = listar_agendamentos_futuros(cpf_limpo)
        if not agendamentos:
            return {"response_message": "Não encontrei agendamentos futuros no seu CPF. Posso ajudar com mais alguma coisa?", "new_state": "inicio", "memory_data": self.memoria}
        
        self.memoria['agendamentos_para_cancelar'] = [{"id": ag.id, "texto": f"{ag.get_tipo_agendamento_display()} - {ag.especialidade.nome if ag.especialidade else 'Serviço'} em {timezone.localtime(ag.data_hora_inicio).strftime('%d/%m/%Y às %H:%M')}"} for ag in agendamentos]
        
        if len(agendamentos) == 1:
            ag = self.memoria['agendamentos_para_cancelar'][0]
            self.memoria['agendamento_selecionado_id'] = ag['id']
            return {"response_message": f"Encontrei este agendamento:\n• {ag['texto']}\n\nConfirma o cancelamento? (Sim/Não)", "new_state": "cancelamento_awaiting_confirmation", "memory_data": self.memoria}
        else:
            lista_texto = "\n".join([f"{i+1} - {ag['texto']}" for i, ag in enumerate(self.memoria['agendamentos_para_cancelar'])])
            return {"response_message": f"Encontrei estes agendamentos:\n{lista_texto}\n\nQual o *número* do que deseja cancelar?", "new_state": "cancelamento_awaiting_choice", "memory_data": self.memoria}

    def handle_cancelamento_awaiting_choice(self, resposta_usuario):
        try:
            escolha = int(resposta_usuario.strip()) - 1
            agendamentos_lista = self.memoria.get('agendamentos_para_cancelar', [])
            if 0 <= escolha < len(agendamentos_lista):
                ag_selecionado = agendamentos_lista[escolha]
                self.memoria['agendamento_selecionado_id'] = ag_selecionado['id']
                return {"response_message": f"Confirma o cancelamento de:\n• {ag_selecionado['texto']}\n\n(Sim/Não)", "new_state": "cancelamento_awaiting_confirmation", "memory_data": self.memoria}
            else:
                raise ValueError("Escolha fora do range")
        except (ValueError, TypeError):
            return {"response_message": "Opção inválida. Por favor, digite apenas o número.", "new_state": "cancelamento_awaiting_choice", "memory_data": self.memoria}

    def handle_cancelamento_awaiting_confirmation(self, resposta_usuario):
        if 'sim' in resposta_usuario.lower():
            try:
                agendamento_id = self.memoria.get('agendamento_selecionado_id')
                resultado = cancelar_agendamento_service(agendamento_id)
                return {"response_message": resultado.get('mensagem', 'Agendamento cancelado.'), "new_state": "inicio", "memory_data": self.memoria}
            except Exception as e:
                logger.error(f"Erro ao cancelar agendamento: {e}")
                return {"response_message": "Erro ao cancelar. Tente novamente.", "new_state": "inicio", "memory_data": self.memoria}
        else:
            return {"response_message": "Ok, o agendamento foi mantido. Posso ajudar com mais alguma coisa?", "new_state": "inicio", "memory_data": self.memoria}