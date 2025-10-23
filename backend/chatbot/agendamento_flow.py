# chatbot/agendamento_flow.py - VERSÃO COM LÓGICA DE BUSCA AUTOMÁTICA E INTELIGÊNCIA DE FLUXO (INDENTAÇÃO CORRIGIDA)

import re
import json
import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from django.db.models import Q # <-- ADICIONE ESTA LINHA
from dateutil.parser import parse
from .chains import chain_classifica_modalidade # <-- IMPORTAÇÃO CORRETA
from .validators import ChatbotValidators
from usuarios.models import Especialidade, CustomUser
from pacientes.models import Paciente
from agendamentos.serializers import AgendamentoWriteSerializer
from agendamentos.services import (
    buscar_proximo_horario_disponivel,
    criar_agendamento_e_pagamento_pendente,
    listar_agendamentos_futuros,
    cancelar_agendamento_service,
    buscar_proximo_horario_procedimento
)
from faturamento.models import Procedimento

logger = logging.getLogger(__name__)

class AgendamentoManager: # <-- INÍCIO DA CLASSE
    # --- TUDO ABAIXO DEVE ESTAR INDENTADO ---
    def __init__(self, session_id, memoria, base_url, **kwargs):
        self.session_id = session_id
        self.memoria = memoria
        self.base_url = base_url.rstrip('/')
        self.validators = ChatbotValidators()

    # --- INÍCIO DAS FUNÇÕES AUXILIARES ---
    def _get_especialidades_from_db(self):
        return list(Especialidade.objects.all().order_by('nome').values('id', 'nome'))

    def _get_medicos_from_db(self, especialidade_id):
        return list(CustomUser.objects.filter(cargo='medico', is_active=True, especialidades__id=especialidade_id).values('id', 'first_name', 'last_name'))

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
    
    def _find_and_present_slots_for_doctor(self, medico_id):
        # Indentado corretamente
        """
        Função auxiliar: Busca horários para um médico específico JÁ DEFINIDO na memória
        e retorna a resposta formatada para o usuário.
        """
        medico_nome = self.memoria.get('medico_nome', 'o profissional selecionado')
        nome_usuario = self.memoria.get('nome_usuario', '')

        horarios = buscar_proximo_horario_disponivel(medico_id=medico_id)

        if horarios and horarios.get('horarios_disponiveis'):
            self.memoria['horarios_ofertados'] = horarios
            try:
                data_formatada = parse(horarios['data']).strftime('%d/%m/%Y')
            except (ValueError, TypeError):
                data_formatada = horarios.get('data', 'Data inválida')

            horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]]
            medico_nome_completo = f"Dr(a). {medico_nome}"

            mensagem = (
                f"Ótimo! Encontrei estes horários com {medico_nome_completo} para o dia *{data_formatada}*:\n\n"
                + "\n".join(horarios_formatados)
                + "\n\nQual deles prefere?"
            )
            return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
        else:
            self.memoria.pop('medico_id', None); self.memoria.pop('medico_nome', None)
            self.memoria.pop('especialidade_id', None); self.memoria.pop('especialidade_nome', None)
            return {
                "response_message": f"Infelizmente, {nome_usuario}, Dr(a). {medico_nome} não possui horários disponíveis nos próximos dias. Gostaria de tentar com outra especialidade ou médico?",
                "new_state": "identificando_demanda",
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

    # --- MÉTODO handle_inicio FINAL E INDENTADO ---
    def handle_inicio(self, resposta_usuario):
        # Indentado corretamente
        nome_usuario = self.memoria.get('nome_usuario', '')
        entidade_inicial = self.memoria.pop('entidade_inicial_agendamento', None)
        modalidade_inicial = self.memoria.get('modalidade')
        medico_pref_nome = self.memoria.get('medico_preferencia')

        chaves_para_manter = ['nome_usuario', 'historico_conversa']
        if modalidade_inicial: chaves_para_manter.append('modalidade')
        if medico_pref_nome: chaves_para_manter.append('medico_preferencia')

        self.memoria = {k: v for k, v in self.memoria.items() if k in chaves_para_manter}
        self.memoria['nome_usuario'] = nome_usuario

        logger.info(f"AgendamentoManager: handle_inicio - Entidade:'{entidade_inicial}', Modalidade:'{modalidade_inicial}', MedicoPref:'{medico_pref_nome}'")

        # --- LÓGICA PRIORIZADA: TENTAR AGENDAR COM MÉDICO ESPECÍFICO ---
        if medico_pref_nome:
            logger.info(f"Tentando encontrar médico por preferência: '{medico_pref_nome}'")
            nome_busca = re.sub(r'^(dr|dra)\.?\s+', '', medico_pref_nome, flags=re.IGNORECASE).strip()
            medicos_encontrados = list(CustomUser.objects.filter(
                Q(cargo='medico', is_active=True) &
                (Q(first_name__icontains=nome_busca) | Q(last_name__icontains=nome_busca))
            ).prefetch_related('especialidades'))

            if len(medicos_encontrados) == 1:
                medico = medicos_encontrados[0]
                medico_nome_completo = f"{medico.first_name} {medico.last_name}"
                logger.info(f"Médico encontrado: {medico_nome_completo} (ID: {medico.id})")
                especialidades_medico = list(medico.especialidades.all())

                if len(especialidades_medico) == 1:
                    especialidade = especialidades_medico[0]
                    logger.info(f"Médico atende apenas em: {especialidade.nome}")
                    self.memoria['tipo_agendamento'] = 'Consulta'
                    self.memoria['medico_id'] = medico.id
                    self.memoria['medico_nome'] = medico_nome_completo
                    self.memoria['especialidade_id'] = especialidade.id
                    self.memoria['especialidade_nome'] = especialidade.nome
                    self.memoria.pop('medico_preferencia', None)
                    if modalidade_inicial:
                        logger.info(f"Modalidade '{modalidade_inicial}' já definida. Buscando horários para médico específico.")
                        # Define a modalidade na memória se ainda não estiver (embora deva estar)
                        self.memoria['modalidade'] = modalidade_inicial
                        return self._find_and_present_slots_for_doctor(medico.id)
                    else:
                        logger.info("Modalidade não definida. Perguntando modalidade.")
                    return {
                        "response_message": f"Encontrei Dr(a). *{medico_nome_completo}*, que atende em *{especialidade.nome}*. Para sua consulta, prefere *Telemedicina* ou *Presencial*?",
                        "new_state": "agendamento_awaiting_modality", # Vai para o estado de modalidade
                        "memory_data": self.memoria
                    }
                
                elif len(especialidades_medico) > 1:
                    logger.info(f"Médico atende em múltiplas especialidades: {[e.nome for e in especialidades_medico]}")
                    self.memoria['tipo_agendamento'] = 'Consulta'; self.memoria['medico_id'] = medico.id; self.memoria['medico_nome'] = medico_nome_completo
                    self.memoria['lista_especialidades'] = [{'id': e.id, 'nome': e.nome} for e in especialidades_medico]
                    self.memoria.pop('medico_preferencia', None)
                    nomes_especialidades = '\n'.join([f"• {e.nome}" for e in especialidades_medico])
                    return {"response_message": f"Encontrei Dr(a). *{medico_nome_completo}*. Ele(a) atende nas seguintes especialidades:\n\n{nomes_especialidades}\n\nPara qual delas você gostaria de agendar?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}
                else: logger.warning(f"Médico {medico_nome_completo} sem especialidades.")
            elif len(medicos_encontrados) > 1:
                 logger.warning(f"Nome '{medico_pref_nome}' corresponde a múltiplos médicos.")
                 nomes_medicos = [f"Dr(a). {m.first_name} {m.last_name}" for m in medicos_encontrados]
                 return {"response_message": f"Encontrei mais de um profissional com nome similar a '{medico_pref_nome}':\n\n" + "\n".join(nomes_medicos) + "\n\nPoderia me dizer o nome completo ou a especialidade desejada?", "new_state": "identificando_demanda", "memory_data": self.memoria}
            else: logger.warning(f"Nenhum médico encontrado para '{medico_pref_nome}'.")
            self.memoria.pop('medico_preferencia', None) # Limpa pref inválida se não achou ou teve erro

        # --- LÓGICA SECUNDÁRIA: SE NÃO ACHOU MÉDICO, TENTA POR ENTIDADE ---
        if entidade_inicial:
            entidade_lower = entidade_inicial.lower()
            especialidade = Especialidade.objects.filter(nome__iexact=entidade_lower).first()
            if especialidade:
                logger.info(f"Entidade inicial '{entidade_inicial}' reconhecida como Especialidade.")
                self.memoria['tipo_agendamento'] = 'Consulta'; self.memoria['especialidade_id'] = especialidade.id; self.memoria['especialidade_nome'] = especialidade.nome
                if modalidade_inicial:
                    logger.info(f"Modalidade '{modalidade_inicial}' já definida. Pulando pergunta.")
                    return self._find_and_present_slots_for_specialty()
                else:
                    logger.info("Modalidade não definida. Perguntando.")
                    return {"response_message": f"Entendido, {nome_usuario}. Você deseja agendar uma consulta de *{especialidade.nome}*. Prefere *Telemedicina* ou *Presencial*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}

            procedimento = Procedimento.objects.filter(descricao__iexact=entidade_lower, ativo=True, valor_particular__gt=0).exclude(descricao__iexact='consulta').first()
            if procedimento:
                logger.info(f"Entidade inicial '{entidade_inicial}' reconhecida como Procedimento.")
                self.memoria['tipo_agendamento'] = 'Procedimento'; self.memoria['procedimento_id'] = procedimento.id; self.memoria['procedimento_nome'] = procedimento.descricao; self.memoria['modalidade'] = 'Presencial'
                logger.info(f"Pulando para busca de horários do procedimento ID {procedimento.id}")
                horarios = buscar_proximo_horario_procedimento(procedimento.id)
                if horarios and horarios.get('horarios_disponiveis'):
                    self.memoria['horarios_ofertados'] = horarios
                    try: data_formatada = parse(horarios['data']).strftime('%d/%m/%Y')
                    except: data_formatada = horarios.get('data', 'Data inválida')
                    horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]]
                    mensagem = (f"Entendido, {nome_usuario}. Encontrei estes horários para *{procedimento.descricao}* no dia *{data_formatada}*:\n\n" + "\n".join(horarios_formatados) + "\n\nQual deles prefere?")
                    return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
                else:
                    return {"response_message": f"Entendido, {nome_usuario}. Você deseja agendar *{procedimento.descricao}*. Infelizmente, não há horários disponíveis.", "new_state": "identificando_demanda", "memory_data": self.memoria}

            if not self.memoria.get('medico_id'): logger.warning(f"Entidade inicial '{entidade_inicial}' não reconhecida.")

        # --- LÓGICA PADRÃO ---
        mensagem_inicial = f"Perfeito, {nome_usuario}! O agendamento será para uma *Consulta* ou *Procedimento*?"
        logger.info("Nenhuma entidade/médico válido fornecido inicialmente. Iniciando fluxo padrão.")
        return {"response_message": mensagem_inicial, "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}
# chatbot/agendamento_flow.py - VERSÃO COM LÓGICA DE BUSCA AUTOMÁTICA E INTELIGÊNCIA DE FLUXO (INDENTAÇÃO FINAL CORRIGIDA)

import re
import json
import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from dateutil.parser import parse
from django.db.models import Q
from .chains import chain_classifica_modalidade
from .validators import ChatbotValidators
from usuarios.models import Especialidade, CustomUser
from pacientes.models import Paciente
from agendamentos.serializers import AgendamentoWriteSerializer
from agendamentos.services import (
    buscar_proximo_horario_disponivel,
    criar_agendamento_e_pagamento_pendente,
    listar_agendamentos_futuros,
    cancelar_agendamento_service,
    buscar_proximo_horario_procedimento
)
from faturamento.models import Procedimento

logger = logging.getLogger(__name__)

class AgendamentoManager: # <-- INÍCIO DA CLASSE
    # --- TUDO ABAIXO ESTÁ INDENTADO CORRETAMENTE DENTRO DA CLASSE ---
    def __init__(self, session_id, memoria, base_url, **kwargs):
        self.session_id = session_id
        self.memoria = memoria
        self.base_url = base_url.rstrip('/')
        self.validators = ChatbotValidators()

    # --- INÍCIO DAS FUNÇÕES AUXILIARES ---
    def _get_especialidades_from_db(self):
        return list(Especialidade.objects.all().order_by('nome').values('id', 'nome'))

    def _get_medicos_from_db(self, especialidade_id):
        return list(CustomUser.objects.filter(cargo='medico', is_active=True, especialidades__id=especialidade_id).values('id', 'first_name', 'last_name'))

    def _find_and_present_slots_for_specialty(self):
        """
        Busca médicos/horários para a especialidade JÁ DEFINIDA na memória.
        """
        especialidade_id = self.memoria.get('especialidade_id')
        especialidade_nome = self.memoria.get('especialidade_nome')
        nome_usuario = self.memoria.get('nome_usuario', '')

        if not especialidade_id or not especialidade_nome:
            logger.error("Erro: _find_and_present_slots_for_specialty sem especialidade definida.")
            return {"response_message": f"Desculpe, {nome_usuario}, erro ao buscar especialidade. Qual especialidade deseja?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

        medicos = self._get_medicos_from_db(especialidade_id=especialidade_id)
        if not medicos:
            self.memoria.pop('especialidade_id', None); self.memoria.pop('especialidade_nome', None)
            return {"response_message": f"Desculpe, {nome_usuario}, não achei médicos para *{especialidade_nome}*. Tentar outra?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

        for medico in medicos:
            horarios = buscar_proximo_horario_disponivel(medico_id=medico['id'])
            if horarios and horarios.get('horarios_disponiveis'):
                self.memoria.update({'medico_id': medico['id'], 'medico_nome': f"{medico['first_name']} {medico['last_name']}", 'horarios_ofertados': horarios})
                try: data_formatada = parse(horarios['data']).strftime('%d/%m/%Y')
                except: data_formatada = horarios.get('data', 'Data inválida')
                horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]]
                medico_nome_completo = f"Dr(a). {self.memoria['medico_nome']}"
                mensagem = (f"Excelente escolha! Encontrei estes horários com {medico_nome_completo} para o dia *{data_formatada}*:\n\n" + "\n".join(horarios_formatados) + "\n\nQual deles prefere?")
                return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

        self.memoria.pop('especialidade_id', None); self.memoria.pop('especialidade_nome', None)
        return {"response_message": f"Infelizmente, {nome_usuario}, não há horários para *{especialidade_nome}* nos próximos dias. Tentar outra?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

    def _find_and_present_slots_for_doctor(self, medico_id):
        """
        Busca horários para um médico específico JÁ DEFINIDO na memória.
        """
        medico_nome = self.memoria.get('medico_nome', 'o profissional selecionado')
        nome_usuario = self.memoria.get('nome_usuario', '')

        horarios = buscar_proximo_horario_disponivel(medico_id=medico_id)

        if horarios and horarios.get('horarios_disponiveis'):
            self.memoria['horarios_ofertados'] = horarios
            try: data_formatada = parse(horarios['data']).strftime('%d/%m/%Y')
            except: data_formatada = horarios.get('data', 'Data inválida')
            horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]]
            medico_nome_completo = f"Dr(a). {medico_nome}"
            mensagem = (f"Ótimo! Encontrei estes horários com {medico_nome_completo} para o dia *{data_formatada}*:\n\n" + "\n".join(horarios_formatados) + "\n\nQual deles prefere?")
            return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
        else:
            self.memoria.pop('medico_id', None); self.memoria.pop('medico_nome', None); self.memoria.pop('especialidade_id', None); self.memoria.pop('especialidade_nome', None)
            return {"response_message": f"Infelizmente, {nome_usuario}, Dr(a). {medico_nome} não tem horários disponíveis. Tentar outra especialidade?", "new_state": "identificando_demanda", "memory_data": self.memoria}
    # --- FIM DAS FUNÇÕES AUXILIARES ---

    def processar(self, resposta_usuario, estado_atual):
        # NÍVEL 1: Verifica interrupções
        msg_lower = resposta_usuario.lower().strip()
        palavras_cancelar = ['não quero mais', 'nao quero mais', 'cancelar', 'deixa pra lá', 'deixa pra la', 'parar', 'cancelar fluxo']
        if any(palavra in msg_lower for palavra in palavras_cancelar):
            nome_usuario = self.memoria.get('nome_usuario', '')
            memoria_limpa = {'nome_usuario': nome_usuario, 'historico_conversa': self.memoria.get('historico_conversa', [])}
            logger.info("Cancelamento de fluxo detectado.")
            return {"response_message": f"Tudo bem, {nome_usuario}. Processo interrompido.", "new_state": "identificando_demanda", "memory_data": memoria_limpa}

        if estado_atual == 'agendamento_awaiting_procedure' and 'consulta' in msg_lower:
            logger.warning("CORREÇÃO DE FLUXO: Procedimento -> Consulta.")
            return self.handle_awaiting_type("consulta")

        # NÍVEL 2: Processamento normal
        handlers = { # Mapeamento estado -> método handler
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
        mensagem = (f"Desculpe, {nome_usuario}, não entendi. Como posso ajudar?")
        memoria_limpa = {'nome_usuario': nome_usuario, 'historico_conversa': self.memoria.get('historico_conversa', [])}
        return {"response_message": mensagem, "new_state": "identificando_demanda", "memory_data": memoria_limpa}

    # --- MÉTODO handle_inicio FINAL E CORRIGIDO ---
    def handle_inicio(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        entidade_inicial = self.memoria.pop('entidade_inicial_agendamento', None)
        modalidade_inicial = self.memoria.get('modalidade')
        medico_pref_nome = self.memoria.get('medico_preferencia')

        chaves_para_manter = ['nome_usuario', 'historico_conversa']
        if modalidade_inicial: chaves_para_manter.append('modalidade')
        if medico_pref_nome: chaves_para_manter.append('medico_preferencia')
        self.memoria = {k: v for k, v in self.memoria.items() if k in chaves_para_manter}
        self.memoria['nome_usuario'] = nome_usuario

        logger.info(f"handle_inicio - Entidade:'{entidade_inicial}', Modalidade:'{modalidade_inicial}', MedicoPref:'{medico_pref_nome}'")

        # --- LÓGICA PRIORIZADA: MÉDICO ESPECÍFICO ---
        if medico_pref_nome:
            logger.info(f"Tentando encontrar médico: '{medico_pref_nome}'")
            nome_busca = re.sub(r'^(dr|dra)\.?\s+', '', medico_pref_nome, flags=re.IGNORECASE).strip()
            medicos_encontrados = list(CustomUser.objects.filter(Q(cargo='medico', is_active=True) & (Q(first_name__icontains=nome_busca) | Q(last_name__icontains=nome_busca))).prefetch_related('especialidades'))

            if len(medicos_encontrados) == 1:
                medico = medicos_encontrados[0]
                medico_nome_completo = f"{medico.first_name} {medico.last_name}"
                logger.info(f"Médico encontrado: {medico_nome_completo} (ID: {medico.id})")
                especialidades_medico = list(medico.especialidades.all())

                self.memoria['tipo_agendamento'] = 'Consulta'; self.memoria['medico_id'] = medico.id; self.memoria['medico_nome'] = medico_nome_completo
                self.memoria.pop('medico_preferencia', None)

                if len(especialidades_medico) == 1:
                    especialidade = especialidades_medico[0]
                    logger.info(f"Médico atende apenas em: {especialidade.nome}")
                    self.memoria['especialidade_id'] = especialidade.id; self.memoria['especialidade_nome'] = especialidade.nome
                    if modalidade_inicial:
                        logger.info(f"Modalidade '{modalidade_inicial}' já definida. Buscando horários.")
                        return self._find_and_present_slots_for_doctor(medico.id)
                    else:
                        logger.info("Modalidade não definida. Perguntando.")
                        return {"response_message": f"Encontrei Dr(a). *{medico_nome_completo}* ({especialidade.nome}). Prefere *Telemedicina* ou *Presencial*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
                elif len(especialidades_medico) > 1:
                    logger.info(f"Médico atende em múltiplas especialidades.")
                    self.memoria['lista_especialidades'] = [{'id': e.id, 'nome': e.nome} for e in especialidades_medico]
                    nomes_especialidades = '\n'.join([f"• {e.nome}" for e in especialidades_medico])
                    return {"response_message": f"Encontrei Dr(a). *{medico_nome_completo}*. Atende em:\n\n{nomes_especialidades}\n\nQual deseja?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}
                else: logger.warning(f"Médico {medico_nome_completo} sem especialidades.")
            elif len(medicos_encontrados) > 1:
                 logger.warning(f"Nome '{medico_pref_nome}' ambíguo.")
                 nomes_medicos = [f"Dr(a). {m.first_name} {m.last_name}" for m in medicos_encontrados]
                 return {"response_message": f"Encontrei mais de um '{medico_pref_nome}':\n" + "\n".join(nomes_medicos) + "\nPoderia especificar?", "new_state": "identificando_demanda", "memory_data": self.memoria}
            else: logger.warning(f"Nenhum médico encontrado para '{medico_pref_nome}'.")
            self.memoria.pop('medico_preferencia', None)

        # --- LÓGICA SECUNDÁRIA: ENTIDADE (ESPECIALIDADE/PROCEDIMENTO) ---
        if entidade_inicial: # Só executa se não encontrou médico válido
            entidade_lower = entidade_inicial.lower()
            especialidade = Especialidade.objects.filter(nome__iexact=entidade_lower).first()
            if especialidade:
                logger.info(f"Entidade '{entidade_inicial}' é Especialidade.")
                self.memoria['tipo_agendamento'] = 'Consulta'; self.memoria['especialidade_id'] = especialidade.id; self.memoria['especialidade_nome'] = especialidade.nome
                if modalidade_inicial:
                    logger.info(f"Modalidade '{modalidade_inicial}' já definida. Buscando horários.")
                    return self._find_and_present_slots_for_specialty()
                else:
                    logger.info("Modalidade não definida. Perguntando.")
                    return {"response_message": f"Entendido, {nome_usuario}. Consulta de *{especialidade.nome}*. Prefere *Telemedicina* ou *Presencial*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}

            procedimento = Procedimento.objects.filter(descricao__iexact=entidade_lower, ativo=True, valor_particular__gt=0).exclude(descricao__iexact='consulta').first()
            if procedimento:
                logger.info(f"Entidade '{entidade_inicial}' é Procedimento.")
                self.memoria['tipo_agendamento'] = 'Procedimento'; self.memoria['procedimento_id'] = procedimento.id; self.memoria['procedimento_nome'] = procedimento.descricao; self.memoria['modalidade'] = 'Presencial'
                logger.info(f"Buscando horários para procedimento ID {procedimento.id}")
                horarios = buscar_proximo_horario_procedimento(procedimento.id)
                if horarios and horarios.get('horarios_disponiveis'):
                    self.memoria['horarios_ofertados'] = horarios
                    try: data_formatada = parse(horarios['data']).strftime('%d/%m/%Y')
                    except: data_formatada = horarios.get('data', 'inválida')
                    horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]]
                    mensagem = (f"Ok, {nome_usuario}. Achei horários para *{procedimento.descricao}* em *{data_formatada}*:\n\n" + "\n".join(horarios_formatados) + "\n\nQual prefere?")
                    return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
                else:
                    return {"response_message": f"Ok, {nome_usuario}. Agendar *{procedimento.descricao}*. Infelizmente, sem horários.", "new_state": "identificando_demanda", "memory_data": self.memoria}

            logger.warning(f"Entidade inicial '{entidade_inicial}' não reconhecida.")

        # --- LÓGICA PADRÃO ---
        mensagem_inicial = f"Perfeito, {nome_usuario}! O agendamento será para uma *Consulta* ou *Exame/Procedimento*?" # Mensagem atualizada
        logger.info("Fluxo padrão iniciado.")
        return {"response_message": mensagem_inicial, "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

    # --- RESTANTE DOS MÉTODOS handle_... CORRETAMENTE INDENTADOS ---
    def handle_awaiting_type(self, resposta_usuario):
        resposta_lower = resposta_usuario.lower().strip()
        nome_usuario = self.memoria.get('nome_usuario', '')
        palavras_consulta = ['consulta', 'médico', 'medico', 'doutor', 'dra', 'atendimento médico']
        palavras_procedimento = ['procedimento', 'exame']
        is_consulta = any(palavra in resposta_lower for palavra in palavras_consulta)
        is_procedimento = any(palavra in resposta_lower for palavra in palavras_procedimento)

        if is_consulta and not is_procedimento:
            logger.info("Detectado tipo: Consulta")
            self.memoria['tipo_agendamento'] = 'Consulta'
            if self.memoria.get('especialidade_id'):
                 logger.info(f"Especialidade '{self.memoria.get('especialidade_nome')}' já definida. Pulando para modalidade.")
                 return {"response_message": f"Confirmado: Consulta de *{self.memoria.get('especialidade_nome')}*. Agora, prefere *Telemedicina* ou *Presencial*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
            else:
                 logger.info("Especialidade não definida. Perguntando modalidade.")
                 return {"response_message": "Ótimo. E você prefere *Telemedicina* ou *Presencial*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        elif is_procedimento and not is_consulta:
            logger.info("Detectado tipo: Procedimento/Exame")
            self.memoria['tipo_agendamento'] = 'Procedimento'
            procedimentos = list(Procedimento.objects.filter(ativo=True, valor_particular__gt=0).exclude(descricao__iexact='consulta').values('id', 'descricao'))
            if not procedimentos:
                return {"response_message": f"Desculpe, {nome_usuario}, não achei exames/procedimentos. Agendar consulta?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}
            self.memoria['lista_procedimentos'] = procedimentos
            nomes_procedimentos = '\n'.join([f"• {proc['descricao']}" for proc in procedimentos])
            return {"response_message": f"Entendido. Qual dos exames/procedimentos abaixo?\n\n{nomes_procedimentos}", "new_state": "agendamento_awaiting_procedure", "memory_data": self.memoria}
        elif is_consulta and is_procedimento:
            logger.warning("Resposta ambígua (consulta e exame/procedimento).")
            return {"response_message": f"Mencionou consulta e exame, {nome_usuario}. Qual gostaria de agendar?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}
        else:
            logger.warning(f"Não classificado tipo: '{resposta_usuario}'.")
            return {"response_message": f"Não entendi, {nome_usuario}. *Consulta* médica ou *Exame/Procedimento*?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

    def handle_awaiting_procedure(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        procedimento_escolhido = next((proc for proc in self.memoria.get('lista_procedimentos', []) if resposta_usuario.lower() in proc['descricao'].lower()), None)
        if not procedimento_escolhido:
            nomes_procedimentos = '\n'.join([f"• {proc['descricao']}" for proc in self.memoria.get('lista_procedimentos', [])])
            return {"response_message": f"Não encontrei '{resposta_usuario}', {nome_usuario}. Escolha um da lista:\n\n{nomes_procedimentos}", "new_state": "agendamento_awaiting_procedure", "memory_data": self.memoria}

        self.memoria.update({'procedimento_id': procedimento_escolhido['id'], 'procedimento_nome': procedimento_escolhido['descricao'], 'modalidade': 'Presencial'})
        horarios = buscar_proximo_horario_procedimento(procedimento_escolhido['id'])
        if horarios and horarios.get('horarios_disponiveis'):
            self.memoria['horarios_ofertados'] = horarios
            try: data_formatada = parse(horarios['data']).strftime('%d/%m/%Y')
            except: data_formatada = horarios.get('data', 'inválida')
            horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]]
            mensagem = (f"Perfeito! Horários para *{procedimento_escolhido['descricao']}* em *{data_formatada}*:\n\n" + "\n".join(horarios_formatados) + "\n\nQual prefere?")
            return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
        else:
            self.memoria.pop('procedimento_id', None); self.memoria.pop('procedimento_nome', None)
            return {"response_message": f"Infelizmente, {nome_usuario}, sem horários para *{procedimento_escolhido['descricao']}*. Tentar outro?", "new_state": "agendamento_awaiting_procedure", "memory_data": self.memoria}

    def handle_awaiting_modality(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        if self.memoria.get('tipo_agendamento') == 'Consulta':
            try:
                if not chain_classifica_modalidade: raise ValueError("Chain Modalidade não inicializada.")
                resultado_classificacao = chain_classifica_modalidade.invoke({"resposta_usuario": resposta_usuario})
                modalidade_detectada = resultado_classificacao.get('modalidade_escolhida')
                logger.info(f"Classificação Modalidade: '{modalidade_detectada}' para '{resposta_usuario}'")
                if modalidade_detectada in ['Telemedicina', 'Presencial']: self.memoria['modalidade'] = modalidade_detectada
                else: return {"response_message": f"Não entendi, {nome_usuario}. *Presencial* ou *Telemedicina*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
            except Exception as e:
                 logger.error(f"Erro ao classificar modalidade: {e}.", exc_info=True)
                 return {"response_message": f"Desculpe, {nome_usuario}, erro ao entender. *Presencial* ou *Telemedicina*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}

        if self.memoria.get('medico_id'):
             logger.info(f"Médico ID {self.memoria['medico_id']} definido. Buscando horários.")
             return self._find_and_present_slots_for_doctor(self.memoria['medico_id'])
        elif self.memoria.get('especialidade_id'):
             logger.info(f"Especialidade ID {self.memoria['especialidade_id']} definida. Buscando horários.")
             return self._find_and_present_slots_for_specialty()
        else:
             logger.info("Nem médico nem especialidade definidos. Solicitando especialidade.")
             especialidades = self._get_especialidades_from_db()
             if not especialidades:
                 logger.error("Nenhuma especialidade no DB.")
                 return {"response_message": f"Desculpe, {nome_usuario}, erro ao carregar especialidades.", "new_state": "identificando_demanda", "memory_data": self.memoria}
             self.memoria['lista_especialidades'] = especialidades
             nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in especialidades])
             mensagem_pergunta = "Perfeito. Para qual das nossas especialidades você deseja o agendamento?"
             return {"response_message": f"{mensagem_pergunta}\n\n{nomes_especialidades}", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

    def handle_awaiting_specialty(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        # Se viemos do fluxo de médico com múltiplas especialidades, a lista é restrita
        lista_disponivel = self.memoria.get('lista_especialidades', self._get_especialidades_from_db())

        especialidade_escolhida = next((esp for esp in lista_disponivel if resposta_usuario.lower() in esp['nome'].lower()), None)

        if not especialidade_escolhida:
            nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in lista_disponivel])
            return {"response_message": f"Não encontrei '{resposta_usuario}', {nome_usuario}. Escolha uma da lista:\n\n{nomes_especialidades}", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

        self.memoria.update({'especialidade_id': especialidade_escolhida['id'], 'especialidade_nome': especialidade_escolhida['nome']})
        logger.info(f"Especialidade '{especialidade_escolhida['nome']}' selecionada.")

        # Verifica se já tínhamos um médico preferido (do handle_inicio)
        if self.memoria.get('medico_id'):
             logger.info(f"Médico ID {self.memoria['medico_id']} já definido. Buscando horários específicos.")
             return self._find_and_present_slots_for_doctor(self.memoria['medico_id'])
        else:
             # Se não, busca horários para a especialidade (encontrando o melhor médico)
             logger.info("Médico não definido. Buscando horários para especialidade.")
             return self._find_and_present_slots_for_specialty()

    def handle_awaiting_slot_choice(self, resposta_usuario):
        horario_str = resposta_usuario.strip()
        horarios_ofertados = self.memoria.get('horarios_ofertados', {})
        horarios_disponiveis = horarios_ofertados.get('horarios_disponiveis', [])
        nome_usuario = self.memoria.get('nome_usuario', '')

        if horario_str in horarios_disponiveis:
            try:
                data_obj = datetime.strptime(horarios_ofertados['data'], '%Y-%m-%d').date()
                hora_obj = datetime.strptime(horario_str, '%H:%M').time()
                self.memoria['data_hora_inicio'] = timezone.make_aware(datetime.combine(data_obj, hora_obj)).isoformat()
            except Exception as e:
                logger.error(f"Erro parse data/hora: {e}")
                return {"response_message": f"Erro ao processar horário, {nome_usuario}. Tente de novo.", "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
            medico_nome = self.memoria.get('medico_nome', 'o profissional')
            proc_nome = self.memoria.get('procedimento_nome')
            servico_desc = proc_nome if proc_nome else f"Dr(a). {medico_nome}"
            return {"response_message": f"Perfeito! Horário com {servico_desc} para *{data_obj.strftime('%d/%m/%Y')} às {horario_str}* pré-reservado. Confirma? (Sim/Não)", "new_state": "agendamento_awaiting_slot_confirmation", "memory_data": self.memoria}

        palavras_chave_recusa = ['outro', 'outra', 'não posso', 'nao posso', 'diferente', 'próximo', 'proximo', 'data', 'dia', 'mais tarde', 'mais cedo']
        if any(keyword in resposta_usuario.lower() for keyword in palavras_chave_recusa):
            data_recusada_str = horarios_ofertados.get('data')
            if not data_recusada_str: return self.handle_fallback("Erro data recusada.")
            try: data_recusada_obj = datetime.strptime(data_recusada_str, '%Y-%m-%d').date(); data_inicial_busca = data_recusada_obj + timedelta(days=1)
            except ValueError: return self.handle_fallback("Erro data anterior.")

            if self.memoria.get('tipo_agendamento') == 'Procedimento':
                 procedimento_id = self.memoria.get('procedimento_id')
                 if not procedimento_id: return self.handle_fallback("Erro ID proc.")
                 novos_horarios = buscar_proximo_horario_procedimento(procedimento_id, data_inicial=data_inicial_busca)
                 servico_nome = self.memoria.get('procedimento_nome', 'o procedimento')
                 estado_retorno_sem_horario = "agendamento_awaiting_procedure"
            else:
                 medico_id = self.memoria.get('medico_id')
                 if not medico_id: return self.handle_fallback("Erro ID med.")
                 novos_horarios = buscar_proximo_horario_disponivel(medico_id=medico_id, data_inicial=data_inicial_busca)
                 servico_nome = f"Dr(a). {self.memoria.get('medico_nome', 'o profissional')}"
                 estado_retorno_sem_horario = "agendamento_awaiting_specialty" # Ou talvez 'identificando_demanda'?

            if novos_horarios and novos_horarios.get('horarios_disponiveis'):
                self.memoria['horarios_ofertados'] = novos_horarios
                nova_data_formatada = datetime.strptime(novos_horarios['data'], '%Y-%m-%d').strftime('%d/%m/%Y')
                novos_horarios_formatados = [f"• *{h}*" for h in novos_horarios['horarios_disponiveis'][:5]]
                mensagem = (f"Ok. Próximos horários para {servico_nome} em *{nova_data_formatada}*:\n\n" + "\n".join(novos_horarios_formatados) + "\n\nAlgum serve?")
                return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
            else:
                return {"response_message": f"Puxa, {nome_usuario}, não achei mais horários para {servico_nome}. Tentar outra especialidade/procedimento?", "new_state": estado_retorno_sem_horario, "memory_data": self.memoria}
        else:
            horarios_formatados = [f"• *{h}*" for h in horarios_disponiveis[:5]]
            return {"response_message": f"Não encontrei '{horario_str}', {nome_usuario}. Escolha um horário abaixo ou peça *outra data*:\n\n" + "\n".join(horarios_formatados), "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

    def handle_awaiting_slot_confirmation(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        if 'sim' not in resposta_usuario.lower():
            self.memoria.pop('data_hora_inicio', None)
            return {"response_message": f"Ok, {nome_usuario}, pré-agendamento cancelado.", "new_state": "identificando_demanda", "memory_data": self.memoria}
        mensagem = "Ótimo! Para segurança, informe seu *CPF* (só números)."
        return {"response_message": mensagem, "new_state": "cadastro_awaiting_cpf", "memory_data": self.memoria}

    def handle_cadastro_awaiting_cpf(self, resposta_usuario):
        is_valid, mensagem_erro, cpf_fmt = self.validators.validar_cpf_completo(resposta_usuario)
        if not is_valid: return {"response_message": f"CPF inválido: {mensagem_erro}. Tente de novo.", "new_state": "cadastro_awaiting_cpf", "memory_data": self.memoria}
        cpf_numeros = re.sub(r'\D', '', cpf_fmt)
        paciente = Paciente.objects.filter(cpf=cpf_numeros).first()
        if paciente:
            self.memoria.update({'cpf': paciente.cpf, 'nome_completo': paciente.nome_completo, 'data_nascimento': paciente.data_nascimento.strftime('%d/%m/%Y') if paciente.data_nascimento else '', 'telefone_celular': paciente.telefone_celular, 'email': paciente.email})
            primeiro_nome = paciente.nome_completo.split(' ')[0]
            mensagem = (f"Que ótimo te ver de volta, {primeiro_nome}! Achei seu cadastro.\n\nComo prefere pagar? 💳\n1️⃣ *PIX* (5% desc)\n2️⃣ *Cartão* (até 3x s/ juros)")
            return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}
        else:
            self.memoria['cpf'] = cpf_numeros; self.memoria['dados_paciente'] = {'cpf': cpf_numeros}; self.memoria['missing_field'] = 'nome_completo'
            mensagem = ("Ok. É seu 1º agendamento. Para o cadastro, qual seu *nome completo*?")
            return {"response_message": mensagem, "new_state": "cadastro_awaiting_missing_field", "memory_data": self.memoria}

    def handle_cadastro_awaiting_missing_field(self, resposta_usuario):
        campo_atual = self.memoria.get('missing_field')
        if campo_atual:
            funcoes_validacao = {'nome_completo': self.validators.validar_nome_completo, 'data_nascimento': self.validators.validar_data_nascimento_avancada, 'telefone_celular': self.validators.validar_telefone_brasileiro, 'email': self.validators.validar_email_avancado}
            funcao_validacao = funcoes_validacao.get(campo_atual)
            if funcao_validacao:
                is_valid, mensagem_erro, valor_formatado = funcao_validacao(resposta_usuario.strip())
                if not is_valid: return {"response_message": f"{mensagem_erro}. Tente de novo.", "new_state": "cadastro_awaiting_missing_field", "memory_data": self.memoria}
                valor_para_salvar = valor_formatado if valor_formatado is not None else resposta_usuario.strip()
                if isinstance(valor_para_salvar, date): valor_para_salvar = valor_para_salvar.strftime('%d/%m/%Y')
                self.memoria.setdefault('dados_paciente', {})[campo_atual] = valor_para_salvar
        return self._coletar_proximo_campo()

    def _coletar_proximo_campo(self):
        campos_necessarios = ['nome_completo', 'data_nascimento', 'telefone_celular', 'email']
        dados_paciente = self.memoria.get('dados_paciente', {})
        proximo_campo_a_pedir = next((campo for campo in campos_necessarios if campo not in dados_paciente), None)
        if proximo_campo_a_pedir:
            mensagens_pedido = {'nome_completo': "Qual seu *nome completo*?", 'data_nascimento': "Qual *data de nascimento* (DD/MM/AAAA)?", 'telefone_celular': "Qual seu *celular com DDD*?", 'email': "Qual seu *e-mail*?"}
            self.memoria['missing_field'] = proximo_campo_a_pedir
            return {"response_message": mensagens_pedido[proximo_campo_a_pedir], "new_state": "cadastro_awaiting_missing_field", "memory_data": self.memoria}
        else:
            self.memoria.update(dados_paciente); self.memoria.pop('missing_field', None); self.memoria.pop('dados_paciente', None)
            primeiro_nome = self.memoria['nome_completo'].split(' ')[0]
            mensagem = (f"Excelente, {primeiro_nome}! Dados recebidos.\n\nComo prefere pagar? 💳\n1️⃣ *PIX* (5% desc)\n2️⃣ *Cartão* (até 3x s/ juros)")
            return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}

    def handle_awaiting_payment_choice(self, resposta_usuario):
        escolha = resposta_usuario.lower().strip()
        if 'pix' in escolha or escolha == '1':
            self.memoria['metodo_pagamento_escolhido'] = 'PIX'
            return self.handle_awaiting_confirmation("confirmado")
        elif 'cartão' in escolha or 'cartao' in escolha or escolha == '2':
            self.memoria['metodo_pagamento_escolhido'] = 'CartaoCredito'
            return {"response_message": "Cartão selecionado. Pagar à vista ou parcelar (2x ou 3x s/ juros)?", "new_state": "agendamento_awaiting_installments", "memory_data": self.memoria}
        else: return {"response_message": "Não entendi. Digite *1* (PIX) ou *2* (Cartão).", "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}

    def handle_awaiting_installments(self, resposta_usuario):
        escolha = resposta_usuario.strip()
        if '2' in escolha: self.memoria['parcelas'] = 2
        elif '3' in escolha: self.memoria['parcelas'] = 3
        else: self.memoria['parcelas'] = 1 # Default à vista
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