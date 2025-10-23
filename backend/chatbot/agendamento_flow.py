# chatbot/agendamento_flow.py - VERSÃO COM LÓGICA DE BUSCA AUTOMÁTICA E INTELIGÊNCIA DE FLUXO

import re
import json
import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from dateutil.parser import parse

from .validators import ChatbotValidators
from usuarios.models import Especialidade, CustomUser # <-- IMPORTAÇÃO GARANTIDA
from pacientes.models import Paciente
from agendamentos.serializers import AgendamentoWriteSerializer
from agendamentos.services import (
    buscar_proximo_horario_disponivel,
    criar_agendamento_e_pagamento_pendente,
    listar_agendamentos_futuros,
    cancelar_agendamento_service,
    buscar_proximo_horario_procedimento # <-- IMPORTAÇÃO GARANTIDA
)
from faturamento.models import Procedimento # <-- IMPORTAÇÃO GARANTIDA

logger = logging.getLogger(__name__)

class AgendamentoManager:
    def __init__(self, session_id, memoria, base_url, **kwargs):
        self.session_id = session_id
        self.memoria = memoria
        self.base_url = base_url.rstrip('/')
        self.validators = ChatbotValidators()

    # --- INÍCIO DAS FUNÇÕES AUXILIARES (INDENTADAS CORRETAMENTE) ---
    def _get_especialidades_from_db(self):
        return list(Especialidade.objects.all().order_by('nome').values('id', 'nome'))

    def _get_medicos_from_db(self, especialidade_id):
        return list(CustomUser.objects.filter(cargo='medico', is_active=True, especialidades__id=especialidade_id).values('id', 'first_name', 'last_name')) # Adicionado is_active=True

    def _find_and_present_slots_for_specialty(self):
        """
        Função auxiliar: Busca médicos/horários para a especialidade JÁ DEFINIDA na memória
        e retorna a resposta formatada para o usuário.
        """
        especialidade_id = self.memoria.get('especialidade_id')
        especialidade_nome = self.memoria.get('especialidade_nome')
        nome_usuario = self.memoria.get('nome_usuario', '')

        if not especialidade_id or not especialidade_nome:
            logger.error("Erro: _find_and_present_slots_for_specialty chamada sem especialidade definida na memória.")
            return {"response_message": f"Desculpe, {nome_usuario}, ocorreu um erro ao buscar a especialidade. Poderia me dizer novamente qual especialidade deseja?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

        medicos = self._get_medicos_from_db(especialidade_id=especialidade_id)
        if not medicos:
            self.memoria.pop('especialidade_id', None)
            self.memoria.pop('especialidade_nome', None)
            return {"response_message": f"Desculpe, {nome_usuario}, não encontrei médicos disponíveis para *{especialidade_nome}* no momento. Gostaria de tentar outra especialidade?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

        for medico in medicos:
            horarios = buscar_proximo_horario_disponivel(medico_id=medico['id'])
            if horarios and horarios.get('horarios_disponiveis'):
                self.memoria.update({
                    'medico_id': medico['id'],
                    'medico_nome': f"{medico['first_name']} {medico['last_name']}",
                    'horarios_ofertados': horarios
                })
                try:
                    data_formatada = parse(horarios['data']).strftime('%d/%m/%Y')
                except (ValueError, TypeError):
                    data_formatada = horarios.get('data', 'Data inválida')

                horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]]
                medico_nome_completo = f"Dr(a). {self.memoria['medico_nome']}"
                mensagem = (
                    f"Excelente escolha! Cuidar da saúde é fundamental. Encontrei estes horários com {medico_nome_completo}, que é uma referência na área, para o dia *{data_formatada}*:\n\n"
                    + "\n".join(horarios_formatados)
                    + "\n\nQual deles prefere?"
                )
                return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

        self.memoria.pop('especialidade_id', None)
        self.memoria.pop('especialidade_nome', None)
        return {
            "response_message": f"Infelizmente, {nome_usuario}, não há horários disponíveis para a especialidade de *{especialidade_nome}* nos próximos dias. Gostaria de tentar outra especialidade?",
            "new_state": "agendamento_awaiting_specialty",
            "memory_data": self.memoria
        }
    # --- FIM DAS FUNÇÕES AUXILIARES ---

    def processar(self, resposta_usuario, estado_atual):
        # NÍVEL 1: Verifica interrupções ANTES de processar o estado atual.
        msg_lower = resposta_usuario.lower().strip()
        palavras_cancelar = ['não quero mais', 'nao quero mais', 'cancelar', 'deixa pra lá', 'deixa pra la', 'parar', 'cancelar fluxo'] # Adicionado 'cancelar fluxo'
        if any(palavra in msg_lower for palavra in palavras_cancelar):
            nome_usuario = self.memoria.get('nome_usuario', '')
            memoria_limpa = {
                'nome_usuario': nome_usuario,
                'historico_conversa': self.memoria.get('historico_conversa', [])
            }
            # Remove chaves específicas do fluxo de agendamento/cancelamento
            chaves_fluxo = ['tipo_agendamento', 'especialidade_id', 'especialidade_nome', 'procedimento_id', 'procedimento_nome', 'modalidade', 'medico_id', 'medico_nome', 'data_hora_inicio', 'horarios_ofertados', 'lista_especialidades', 'lista_procedimentos', 'agendamentos_para_cancelar', 'agendamento_selecionado_id']
            for chave in chaves_fluxo:
                 memoria_limpa.pop(chave, None) # Remove da cópia limpa, se existir

            logger.info(f"Cancelamento de fluxo detectado. Limpando memória e voltando para 'identificando_demanda'. Memória limpa: {memoria_limpa}")
            return {
                "response_message": f"Tudo bem, {nome_usuario}. O processo foi interrompido. Se precisar de outra coisa, é só me chamar!",
                "new_state": "identificando_demanda",
                "memory_data": memoria_limpa # Retorna a memória limpa
            }

        if estado_atual == 'agendamento_awaiting_procedure' and 'consulta' in msg_lower:
            logger.warning("CORREÇÃO DE FLUXO: Usuário mudou de 'Procedimento' para 'Consulta'.")
            return self.handle_awaiting_type("consulta")

        # NÍVEL 2: Processamento normal do estado
        handlers = {
            'agendamento_inicio': self.handle_inicio,
            'agendamento_awaiting_type': self.handle_awaiting_type,
            'agendamento_awaiting_procedure': self.handle_awaiting_procedure,
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
        mensagem = (
            f"Peço desculpas, {nome_usuario}, não entendi muito bem sua última mensagem.\n\n"
            "Como posso te ajudar agora?\n"
            "1. Agendar consulta/procedimento\n"
            "2. Saber preço\n"
            "3. Cancelar agendamento\n\n"
            "Ou digite *recomeçar*."
        )
        # Limpa memória de fluxo anterior no fallback para evitar confusão
        memoria_limpa = {
            'nome_usuario': nome_usuario,
            'historico_conversa': self.memoria.get('historico_conversa', [])
        }
        return {"response_message": mensagem, "new_state": "identificando_demanda", "memory_data": memoria_limpa}

    # --- MÉTODO handle_inicio CORRIGIDO E INDENTADO ---
    def handle_inicio(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        entidade_inicial = self.memoria.pop('entidade_inicial_agendamento', None)

        chaves_para_manter = ['nome_usuario', 'historico_conversa']
        self.memoria = {k: v for k, v in self.memoria.items() if k in chaves_para_manter}
        self.memoria['nome_usuario'] = nome_usuario

        logger.info(f"AgendamentoManager: handle_inicio - Entidade inicial detectada: '{entidade_inicial}'")

        if entidade_inicial:
            entidade_lower = entidade_inicial.lower()

            especialidade = Especialidade.objects.filter(nome__iexact=entidade_lower).first()
            if especialidade:
                logger.info(f"Entidade inicial '{entidade_inicial}' reconhecida como Especialidade: {especialidade.nome}")
                self.memoria['tipo_agendamento'] = 'Consulta'
                self.memoria['especialidade_id'] = especialidade.id
                self.memoria['especialidade_nome'] = especialidade.nome
                return {
                    "response_message": f"Entendido, {nome_usuario}. Você deseja agendar uma consulta de *{especialidade.nome}*. Prefere *Telemedicina* ou *Presencial*?",
                    "new_state": "agendamento_awaiting_modality",
                    "memory_data": self.memoria
                }

            procedimento = Procedimento.objects.filter(descricao__iexact=entidade_lower, ativo=True, valor_particular__gt=0).exclude(descricao__iexact='consulta').first()
            if procedimento:
                logger.info(f"Entidade inicial '{entidade_inicial}' reconhecida como Procedimento: {procedimento.descricao}")
                self.memoria['tipo_agendamento'] = 'Procedimento'
                self.memoria['procedimento_id'] = procedimento.id
                self.memoria['procedimento_nome'] = procedimento.descricao
                self.memoria['modalidade'] = 'Presencial'

                logger.info(f"Pulando para busca de horários do procedimento ID {procedimento.id}")
                horarios = buscar_proximo_horario_procedimento(procedimento.id)

                if horarios and horarios.get('horarios_disponiveis'):
                    self.memoria['horarios_ofertados'] = horarios
                    try:
                        data_formatada = parse(horarios['data']).strftime('%d/%m/%Y')
                    except (ValueError, TypeError):
                        data_formatada = horarios.get('data', 'Data inválida')
                    horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]]
                    mensagem = (
                        f"Entendido, {nome_usuario}. Encontrei estes horários para *{procedimento.descricao}* no dia *{data_formatada}*:\n\n"
                        + "\n".join(horarios_formatados)
                        + "\n\nQual deles prefere?"
                    )
                    return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
                else:
                    return {
                        "response_message": f"Entendido, {nome_usuario}. Você deseja agendar *{procedimento.descricao}*. Infelizmente, não há horários disponíveis nos próximos dias. Gostaria de tentar agendar uma consulta ou verificar outro procedimento?",
                        "new_state": "identificando_demanda",
                        "memory_data": self.memoria
                    }

            logger.warning(f"Entidade inicial '{entidade_inicial}' não reconhecida como especialidade ou procedimento válido.")

        logger.info("Nenhuma entidade inicial válida. Iniciando fluxo padrão.")
        return {
            "response_message": f"Perfeito, {nome_usuario}! Nosso time está pronto para te atender. O agendamento será para uma *Consulta* ou *Procedimento*?",
            "new_state": "agendamento_awaiting_type",
            "memory_data": self.memoria
        }

    # --- RESTANTE DOS MÉTODOS handle_... (INDENTADOS CORRETAMENTE) ---
    def handle_awaiting_type(self, resposta_usuario):
        resposta_lower = resposta_usuario.lower()
        nome_usuario = self.memoria.get('nome_usuario', '') # Adicionado para mensagens de erro

        if 'consulta' in resposta_lower:
            self.memoria['tipo_agendamento'] = 'Consulta'
            # --- LÓGICA INTELIGENTE: Verifica se a especialidade JÁ foi definida ---
            if self.memoria.get('especialidade_id'):
                 logger.info(f"Especialidade '{self.memoria.get('especialidade_nome')}' já definida (veio do início?). Pulando para modalidade.")
                 # Se a especialidade já veio do handle_inicio, vai direto para modalidade
                 return {"response_message": f"Confirmado: Consulta de *{self.memoria.get('especialidade_nome')}*. Agora, prefere *Telemedicina* ou *Presencial*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
            else:
                 # Se não veio, pergunta a modalidade E DEPOIS a especialidade
                 return {"response_message": "Ótimo. E você prefere o conforto da *Telemedicina* ou o atendimento *Presencial* em nossa clínica?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}

        elif 'procedimento' in resposta_lower:
            self.memoria['tipo_agendamento'] = 'Procedimento'
            procedimentos = list(Procedimento.objects.filter(ativo=True, valor_particular__gt=0).exclude(descricao__iexact='consulta').values('id', 'descricao'))
            if not procedimentos:
                return {"response_message": f"Desculpe, {nome_usuario}, não encontrei procedimentos disponíveis no momento. Gostaria de agendar uma consulta?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}
            self.memoria['lista_procedimentos'] = procedimentos
            nomes_procedimentos = '\n'.join([f"• {proc['descricao']}" for proc in procedimentos])
            return {
                "response_message": f"Entendido. Qual dos procedimentos abaixo você deseja agendar?\n\n{nomes_procedimentos}",
                "new_state": "agendamento_awaiting_procedure",
                "memory_data": self.memoria
            }

        return {"response_message": f"Não entendi, {nome_usuario}. É 'Consulta' ou 'Procedimento'?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

    def handle_awaiting_procedure(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '') # Adicionado
        procedimento_escolhido = next((proc for proc in self.memoria.get('lista_procedimentos', []) if resposta_usuario.lower() in proc['descricao'].lower()), None)
        if not procedimento_escolhido:
            nomes_procedimentos = '\n'.join([f"• {proc['descricao']}" for proc in self.memoria.get('lista_procedimentos', [])]) # Re-lista
            return {"response_message": f"Não encontrei '{resposta_usuario}', {nome_usuario}. Por favor, escolha um procedimento da lista:\n\n{nomes_procedimentos}", "new_state": "agendamento_awaiting_procedure", "memory_data": self.memoria}

        self.memoria.update({'procedimento_id': procedimento_escolhido['id'], 'procedimento_nome': procedimento_escolhido['descricao']})
        self.memoria['modalidade'] = 'Presencial'

        horarios = buscar_proximo_horario_procedimento(procedimento_escolhido['id'])
        if horarios and horarios.get('horarios_disponiveis'):
            self.memoria['horarios_ofertados'] = horarios
            try:
                data_formatada = parse(horarios['data']).strftime('%d/%m/%Y')
            except (ValueError, TypeError):
                data_formatada = horarios.get('data', 'Data inválida')
            horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]]
            mensagem = (
                f"Perfeito! Encontrei estes horários disponíveis para *{procedimento_escolhido['descricao']}* no dia *{data_formatada}*:\n\n"
                + "\n".join(horarios_formatados)
                + "\n\nQual deles prefere?"
            )
            return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

        # Limpa procedimento se não achar horário
        self.memoria.pop('procedimento_id', None)
        self.memoria.pop('procedimento_nome', None)
        return {
            "response_message": f"Infelizmente, {nome_usuario}, não há horários disponíveis para *{procedimento_escolhido['descricao']}* nos próximos dias. Gostaria de tentar outro procedimento?",
            "new_state": "agendamento_awaiting_procedure", # Volta para escolher outro
            "memory_data": self.memoria
        }

    # --- MÉTODO handle_awaiting_modality CORRIGIDO E INDENTADO ---
    def handle_awaiting_modality(self, resposta_usuario):
        resposta_lower = resposta_usuario.lower()
        nome_usuario = self.memoria.get('nome_usuario', '')

        if self.memoria.get('tipo_agendamento') != 'Procedimento':
            if 'telemedicina' in resposta_lower:
                self.memoria['modalidade'] = 'Telemedicina'
            elif 'presencial' in resposta_lower:
                self.memoria['modalidade'] = 'Presencial'
            else:
                return {"response_message": f"Não entendi a modalidade, {nome_usuario}. Por favor, escolha entre *Presencial* ou *Telemedicina*.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}

        if self.memoria.get('especialidade_id'):
            logger.info(f"Especialidade '{self.memoria.get('especialidade_nome')}' já definida. Pulando para busca de horários.")
            return self._find_and_present_slots_for_specialty()
        else:
            logger.info("Especialidade ainda não definida. Solicitando ao usuário.")
            especialidades = self._get_especialidades_from_db()
            # Verifica se a lista de especialidades está vazia
            if not especialidades:
                 logger.error("Nenhuma especialidade encontrada no banco de dados.")
                 return {"response_message": f"Desculpe, {nome_usuario}, não consegui carregar a lista de especialidades no momento. Por favor, tente novamente mais tarde ou entre em contato com a recepção.", "new_state": "identificando_demanda", "memory_data": self.memoria}

            self.memoria['lista_especialidades'] = especialidades
            nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in especialidades])
            mensagem_pergunta = "Perfeito. Para qual das nossas especialidades você deseja o agendamento?"
            return {"response_message": f"{mensagem_pergunta}\n\n{nomes_especialidades}", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

    # --- MÉTODO handle_awaiting_specialty CORRIGIDO E INDENTADO ---
    def handle_awaiting_specialty(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        especialidade_escolhida = next((esp for esp in self.memoria.get('lista_especialidades', []) if resposta_usuario.lower() in esp['nome'].lower()), None)

        if not especialidade_escolhida:
            nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in self.memoria.get('lista_especialidades', [])])
            return {"response_message": f"Não encontrei a especialidade '{resposta_usuario}', {nome_usuario}. Por favor, escolha uma da lista:\n\n{nomes_especialidades}", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

        self.memoria.update({'especialidade_id': especialidade_escolhida['id'], 'especialidade_nome': especialidade_escolhida['nome']})
        logger.info(f"Especialidade '{especialidade_escolhida['nome']}' selecionada pelo usuário.")
        return self._find_and_present_slots_for_specialty()

    # --- REMOVIDO _buscar_e_apresentar_horarios (agora é _find_and_present_slots_for_specialty) ---
    # --- REMOVIDO _iniciar_busca_de_horarios (lógica movida ou simplificada) ---

    def handle_awaiting_slot_choice(self, resposta_usuario):
        # ... (código existente sem alterações, mas garantido que está indentado) ...
        horario_str = resposta_usuario.strip()
        horarios_ofertados = self.memoria.get('horarios_ofertados', {})
        horarios_disponiveis = horarios_ofertados.get('horarios_disponiveis', [])
        nome_usuario = self.memoria.get('nome_usuario', '') # Adicionado

        # 1. Verifica se o usuário escolheu um horário válido
        if horario_str in horarios_disponiveis:
            try:
                data_obj = datetime.strptime(horarios_ofertados['data'], '%Y-%m-%d').date()
                hora_obj = datetime.strptime(horario_str, '%H:%M').time()
                self.memoria['data_hora_inicio'] = timezone.make_aware(datetime.combine(data_obj, hora_obj)).isoformat()
            except (ValueError, TypeError) as e:
                logger.error(f"Erro ao fazer parse da data/hora: {e}")
                return {"response_message": f"Desculpe, {nome_usuario}, tive um problema ao processar o horário. Poderia tentar digitar novamente?", "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

            medico_nome = self.memoria.get('medico_nome', 'o profissional') # Nome do médico ou genérico
            return {"response_message": f"Perfeito! Seu horário com Dr(a). {medico_nome} para *{data_obj.strftime('%d/%m/%Y')} às {horario_str}* está pré-reservado. Confirma? (Sim/Não)", "new_state": "agendamento_awaiting_slot_confirmation", "memory_data": self.memoria}

        # 2. Verifica se o usuário está pedindo outra data/horário
        palavras_chave_recusa = ['outro', 'outra', 'não posso', 'nao posso', 'diferente', 'próximo', 'proximo', 'data', 'dia', 'mais tarde', 'mais cedo']
        if any(keyword in resposta_usuario.lower() for keyword in palavras_chave_recusa):
            data_recusada_str = horarios_ofertados.get('data')
            if not data_recusada_str:
                 return self.handle_fallback("Não encontrei a data anterior para buscar a próxima.")

            try:
                 data_recusada_obj = datetime.strptime(data_recusada_str, '%Y-%m-%d').date()
                 # Busca a partir do DIA SEGUINTE ao recusado
                 data_inicial_busca = data_recusada_obj + timedelta(days=1)
            except ValueError:
                 return self.handle_fallback("Erro ao processar a data anterior.")

            # Verifica se é consulta ou procedimento para chamar o serviço certo
            if self.memoria.get('tipo_agendamento') == 'Procedimento':
                 procedimento_id = self.memoria.get('procedimento_id')
                 if not procedimento_id: return self.handle_fallback("Erro interno: ID do procedimento não encontrado.")
                 novos_horarios = buscar_proximo_horario_procedimento(procedimento_id, data_inicial=data_inicial_busca)
                 servico_nome = self.memoria.get('procedimento_nome', 'o procedimento')
            else: # É consulta
                 medico_id = self.memoria.get('medico_id')
                 if not medico_id: return self.handle_fallback("Erro interno: ID do médico não encontrado.")
                 novos_horarios = buscar_proximo_horario_disponivel(medico_id=medico_id, data_inicial=data_inicial_busca)
                 servico_nome = f"Dr(a). {self.memoria.get('medico_nome', 'o profissional')}"


            if novos_horarios and novos_horarios.get('horarios_disponiveis'):
                self.memoria['horarios_ofertados'] = novos_horarios
                nova_data_formatada = datetime.strptime(novos_horarios['data'], '%Y-%m-%d').strftime('%d/%m/%Y')
                novos_horarios_formatados = [f"• *{h}*" for h in novos_horarios['horarios_disponiveis'][:5]]
                mensagem = (
                    f"Entendido. Para {servico_nome}, os próximos horários disponíveis são para o dia *{nova_data_formatada}*:\n\n" +
                    "\n".join(novos_horarios_formatados) +
                    "\n\nAlgum desses funciona para você?"
                )
                return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
            else:
                # Volta para escolher especialidade/procedimento se não achar mais horários
                estado_retorno = "agendamento_awaiting_procedure" if self.memoria.get('tipo_agendamento') == 'Procedimento' else "agendamento_awaiting_specialty"
                return {"response_message": f"Puxa, {nome_usuario}, não encontrei mais horários disponíveis para {servico_nome} nos próximos 90 dias. Gostaria de tentar com outra especialidade ou procedimento?", "new_state": estado_retorno, "memory_data": self.memoria}

        # 3. Se não for nenhuma das anteriores, é uma resposta inválida
        else:
            horarios_formatados = [f"• *{h}*" for h in horarios_disponiveis[:5]] # Mostra novamente os horários
            return {"response_message": f"Hum, não encontrei '{horario_str}', {nome_usuario}. Por favor, escolha um dos horários abaixo ou peça por *outra data*:\n\n" + "\n".join(horarios_formatados), "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

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
             # --- INÍCIO DA CORREÇÃO ---
            # Mensagem antiga: "Estamos prontos para ir para o pagamento."
            # Mensagem nova (mais clara e proativa):
            mensagem = (
                f"Que ótimo te ver de volta, {primeiro_nome}! Já encontrei seu cadastro.\n\n"
                "Para finalizar, como prefere pagar? 💳\n\n"
                "1️⃣ *PIX* (5% de desconto)\n"
                "2️⃣ *Cartão de Crédito* (até 3x sem juros)"
            )
            return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}
        else:
            # A lógica para novo paciente está correta e permanece a mesma.
            self.memoria['cpf'] = cpf_numeros
            self.memoria['dados_paciente'] = {'cpf': cpf_numeros}
            self.memoria['missing_field'] = 'nome_completo'
            mensagem = (
                "Entendido. Vi que é seu primeiro agendamento conosco. "
                "Para criar seu cadastro, preciso de algumas informações rápidas.\n\n"
                "Vamos começar pelo seu *nome completo*, por favor."
            )
            return {
                "response_message": mensagem, 
                "new_state": "cadastro_awaiting_missing_field", 
                "memory_data": self.memoria
            }
        
    def handle_cadastro_awaiting_missing_field(self, resposta_usuario):
        # Primeiro, pegamos o campo que estávamos esperando
        campo_atual = self.memoria.get('missing_field')
        
        # Valida a resposta que o usuário acabou de dar para o campo esperado
        if campo_atual:
            # Pega a função de validação correta para o campo atual
            funcoes_validacao = {
                'nome_completo': self.validators.validar_nome_completo,
                'data_nascimento': self.validators.validar_data_nascimento_avancada,
                'telefone_celular': self.validators.validar_telefone_brasileiro,
                'email': self.validators.validar_email_avancado,
            }
            funcao_validacao = funcoes_validacao.get(campo_atual)

            if funcao_validacao:
                is_valid, mensagem_erro, valor_formatado = funcao_validacao(resposta_usuario.strip())
                
                # Se a resposta para o campo atual for inválida, pedimos de novo.
                if not is_valid:
                    return {"response_message": f"{mensagem_erro}. Por favor, tente novamente.", "new_state": "cadastro_awaiting_missing_field", "memory_data": self.memoria}
                # --- INÍCIO DA CORREÇÃO ---
                valor_para_salvar = valor_formatado if valor_formatado is not None else resposta_usuario.strip()
                
                # Se o valor validado for um objeto 'date', converta para string antes de salvar na memória JSON.
                if isinstance(valor_para_salvar, date):
                    valor_para_salvar = valor_para_salvar.strftime('%d/%m/%Y')
                
                self.memoria.setdefault('dados_paciente', {})[campo_atual] = valor_para_salvar
                # --- FIM DA CORREÇÃO ---
        # Depois de salvar, chamamos a função para pedir o PRÓXIMO campo.
        return self._coletar_proximo_campo()

    def _coletar_proximo_campo(self):
        # Lista ordenada dos campos que precisamos
        campos_necessarios = ['nome_completo', 'data_nascimento', 'telefone_celular', 'email']
        dados_paciente = self.memoria.get('dados_paciente', {})

        # Encontra o primeiro campo da lista que ainda não temos
        proximo_campo_a_pedir = None
        for campo in campos_necessarios:
            if campo not in dados_paciente:
                proximo_campo_a_pedir = campo
                break
        
        # Se ainda falta algum campo, montamos a pergunta para ele
        if proximo_campo_a_pedir:
            mensagens_pedido = {
                'nome_completo': "Vamos começar pelo seu *nome completo*, por favor.",
                'data_nascimento': "Ótimo! Agora, qual sua *data de nascimento* (DD/MM/AAAA)?",
                'telefone_celular': "Perfeito. E o seu *celular com DDD*?",
                'email': "Estamos quase lá! Qual o seu *e-mail*?",
            }
            # Atualiza o campo que estamos esperando
            self.memoria['missing_field'] = proximo_campo_a_pedir
            return {"response_message": mensagens_pedido[proximo_campo_a_pedir], "new_state": "cadastro_awaiting_missing_field", "memory_data": self.memoria}
        
        # Se não falta mais nenhum campo, o cadastro está completo!
        else:
            self.memoria.update(dados_paciente)
            self.memoria.pop('missing_field', None)
            self.memoria.pop('dados_paciente', None)
            primeiro_nome = self.memoria['nome_completo'].split(' ')[0]
            
            mensagem = (
                f"Excelente, {primeiro_nome}! Recebi seus dados.\n\n"
                "Como prefere pagar? 💳\n\n"
                "1️⃣ *PIX* (5% de desconto)\n"
                "2️⃣ *Cartão de Crédito* (até 3x sem juros)"
            )
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

            # Determina o tipo de agendamento baseado na memória
            tipo_agendamento = self.memoria.get('tipo_agendamento', 'Consulta')
            
            dados_agendamento = {
                'paciente': paciente.id, 'data_hora_inicio': self.memoria.get('data_hora_inicio'),
                'status': 'Agendado', 'tipo_agendamento': tipo_agendamento, 'tipo_atendimento': 'Particular',
                'modalidade': self.memoria.get('modalidade')
            }
            
            # Adiciona especialidade e médico apenas se for consulta
            if tipo_agendamento == 'Consulta':
                dados_agendamento['especialidade'] = self.memoria.get('especialidade_id')
                dados_agendamento['medico'] = self.memoria.get('medico_id')
            
            # Adiciona procedimento se for procedimento (sem médico)
            if tipo_agendamento == 'Procedimento':
                dados_agendamento['procedimento'] = self.memoria.get('procedimento_id')
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

            # Monta a mensagem baseada no tipo de agendamento
            if tipo_agendamento == 'Procedimento':
                tipo_servico = f"*{self.memoria.get('procedimento_nome')}*"
                msg_confirmacao = (f"✅ *Agendamento Confirmado!*\n\nOlá, {nome_paciente_fmt}! Seu horário está garantido.\n\n{tipo_servico}\n🗓️ *Data:* {data_fmt}\n⏰ *Hora:* {hora_fmt}\n\n")
            else:
                tipo_servico = f"*Consulta de {self.memoria.get('especialidade_nome')}*"
                msg_confirmacao = (f"✅ *Agendamento Confirmado!*\n\nOlá, {nome_paciente_fmt}! Seu horário está garantido.\n\n{tipo_servico}\nCom Dr(a). *{self.memoria.get('medico_nome')}*\n🗓️ *Data:* {data_fmt}\n⏰ *Hora:* {hora_fmt}\n\n")
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