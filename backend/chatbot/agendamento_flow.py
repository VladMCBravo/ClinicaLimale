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

class AgendamentoManager:
    def __init__(self, session_id, memoria, **kwargs):
        self.session_id = session_id
        self.memoria = memoria
        self.validators = ChatbotValidators()

    # --- FUNÇÕES AUXILIARES ---
    def _get_especialidades_from_db(self):
        return list(Especialidade.objects.all().order_by('nome').values('id', 'nome'))

    def _get_medicos_from_db(self, especialidade_id):
        return list(CustomUser.objects.filter(cargo='medico', is_active=True, especialidades__id=especialidade_id).values('id', 'first_name', 'last_name'))

    def _find_and_present_slots_for_doctor(self, medico_id):
        medico_nome = self.memoria.get('medico_nome', 'o profissional selecionado')
        horarios = buscar_proximo_horario_disponivel(medico_id=medico_id)

        if horarios and horarios.get('horarios_disponiveis'):
            self.memoria['horarios_ofertados'] = horarios
            data_formatada = parse(horarios['data']).strftime('%d/%m/%Y')
            horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]]
            mensagem = (f"Ótimo! Encontrei estes horários com Dr(a). {medico_nome} para o dia *{data_formatada}*:\n\n" + "\n".join(horarios_formatados) + "\n\nQual deles prefere?")
            return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
        else:
            return {"response_message": "Infelizmente não há horários disponíveis. Tentar outra especialidade?", "new_state": "identificando_demanda", "memory_data": self.memoria}

    # --- PROCESSAMENTO PRINCIPAL ---
    def processar(self, resposta_usuario, estado_atual):
        msg_lower = resposta_usuario.lower().strip()
        
        # 1. Verificação global de interrupção
        if any(p in msg_lower for p in ['cancelar', 'parar', 'deixa pra lá', 'nao quero mais']):
            memoria_limpa = {'nome_usuario': self.memoria.get('nome_usuario'), 'historico_conversa': self.memoria.get('historico_conversa', [])}
            return {"response_message": "Processo interrompido. Como posso ajudar?", "new_state": "identificando_demanda", "memory_data": memoria_limpa}

        # 2. Mapeamento ÚNICO de Handlers
        handlers = {
            'agendamento_inicio': self.handle_inicio,
            'agendamento_awaiting_type': self.handle_awaiting_type,
            'agendamento_awaiting_procedure': self.handle_awaiting_procedure,
            'agendamento_awaiting_slot_choice': self.handle_awaiting_slot_choice,
            'cadastro_awaiting_cpf': self.handle_cadastro_awaiting_cpf,
            'agendamento_awaiting_confirmation': self.handle_awaiting_confirmation,
            'cancelamento_inicio': self.handle_cancelamento_inicio,
        }
        handler = handlers.get(estado_atual, self.handle_fallback)
        return handler(resposta_usuario)

    # --- MÉTODO handle_inicio CONSOLIDADO (Use apenas este) ---
    def handle_inicio(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        entidade_inicial = self.memoria.pop('entidade_inicial_agendamento', None)
        modalidade_inicial = self.memoria.get('modalidade')
        medico_pref_nome = self.memoria.get('medico_preferencia')

        # Limpa memória mantendo apenas o essencial
        self.memoria = {
            'nome_usuario': nome_usuario, 
            'historico_conversa': self.memoria.get('historico_conversa', []),
            'modalidade': modalidade_inicial,
            'medico_preferencia': medico_pref_nome
        }

        # PRIORIDADE 1: MÉDICO ESPECÍFICO
        if medico_pref_nome:
            nome_busca = re.sub(r'^(dr|dra)\.?\s+', '', medico_pref_nome, flags=re.IGNORECASE).strip()
            medicos = list(CustomUser.objects.filter(Q(cargo='medico', is_active=True) & (Q(first_name__icontains=nome_busca) | Q(last_name__icontains=nome_busca))))
            
            if len(medicos) == 1:
                medico = medicos[0]
                self.memoria.update({'medico_id': medico.id, 'medico_nome': f"{medico.first_name} {medico.last_name}", 'tipo_agendamento': 'Consulta'})
                return self._find_and_present_slots_for_doctor(medico.id)

        # PRIORIDADE 2: ESPECIALIDADE OU PROCEDIMENTO (Entidade Inicial)
        if entidade_inicial:
            # Lógica para Procedimento Único ou Múltiplo conforme seu código
            procedimentos = list(Procedimento.objects.filter(descricao__icontains=entidade_inicial.lower(), ativo=True)[:5])
            if len(procedimentos) == 1:
                self.memoria.update({'tipo_agendamento': 'Procedimento', 'procedimento_id': procedimentos[0].id, 'procedimento_nome': procedimentos[0].descricao})
                return self.handle_awaiting_procedure(procedimentos[0].descricao)

        # FALLBACK: PERGUNTA PADRÃO
        return {"response_message": f"Perfeito, {nome_usuario}! Deseja agendar uma *Consulta* ou *Exame/Procedimento*?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}
    
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
            # (Toda a sua lógica de busca de médico permanece igual... ela já está boa)
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
                    # ... (lógica de especialidade única) ...
                    logger.info(f"Médico atende apenas em: {especialidade.nome}")
                    self.memoria['especialidade_id'] = especialidade.id; self.memoria['especialidade_nome'] = especialidade.nome
                    if modalidade_inicial:
                        logger.info(f"Modalidade '{modalidade_inicial}' já definida. Buscando horários.")
                        return self._find_and_present_slots_for_doctor(medico.id)
                    else:
                        logger.info("Modalidade não definida. Perguntando.")
                        return {"response_message": f"Encontrei Dr(a). *{medico_nome_completo}* ({especialidade.nome}). Prefere *Telemedicina* ou *Presencial*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
                elif len(especialidades_medico) > 1:
                    # ... (lógica de múltiplas especialidades) ...
                    logger.info(f"Médico atende em múltiplas especialidades.")
                    self.memoria['lista_especialidades'] = [{'id': e.id, 'nome': e.nome} for e in especialidades_medico]
                    nomes_especialidades = '\n'.join([f"• {e.nome}" for e in especialidades_medico])
                    return {"response_message": f"Encontrei Dr(a). *{medico_nome_completo}*. Atende em:\n\n{nomes_especialidades}\n\nQual deseja?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}
                else: logger.warning(f"Médico {medico_nome_completo} sem especialidades.")
            elif len(medicos_encontrados) > 1:
                 # ... (lógica de médicos ambíguos) ...
                 logger.warning(f"Nome '{medico_pref_nome}' ambíguo.")
                 nomes_medicos = [f"Dr(a). {m.first_name} {m.last_name}" for m in medicos_encontrados]
                 return {"response_message": f"Encontrei mais de um '{medico_pref_nome}':\n" + "\n".join(nomes_medicos) + "\nPoderia especificar?", "new_state": "identificando_demanda", "memory_data": self.memoria}
            else: logger.warning(f"Nenhum médico encontrado para '{medico_pref_nome}'.")
            self.memoria.pop('medico_preferencia', None)

        # --- LÓGICA SECUNDÁRIA: ENTIDADE (ESPECIALIDADE/PROCEDIMENTO) ---
        if entidade_inicial: 
            entidade_lower = entidade_inicial.lower()
            
            # 1. Tenta achar especialidade (exata)
            especialidade = Especialidade.objects.filter(nome__iexact=entidade_lower).first()
            if especialidade:
                logger.info(f"Entidade '{entidade_inicial}' é Especialidade.")
                # (Sua lógica original de especialidade... está correta)
                self.memoria['tipo_agendamento'] = 'Consulta'; self.memoria['especialidade_id'] = especialidade.id; self.memoria['especialidade_nome'] = especialidade.nome
                if modalidade_inicial:
                    logger.info(f"Modalidade '{modalidade_inicial}' já definida. Buscando horários.")
                    return self._find_and_present_slots_for_specialty()
                else:
                    logger.info("Modalidade não definida. Perguntando.")
                    return {"response_message": f"Entendido, {nome_usuario}. Consulta de *{especialidade.nome}*. Prefere *Telemedicina* ou *Presencial*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}

            # 2. Se não for especialidade, tenta achar procedimento (contém)
            # --- INÍCIO DA MUDANÇA ---
            procedimentos_encontrados = list(Procedimento.objects.filter(
                descricao__icontains=entidade_lower, 
                ativo=True, 
                valor_particular__gt=0
            ).exclude(descricao__iexact='consulta')[:5]) # Limita a 5 para não poluir

            # 2a. Achou exatamente UM procedimento
            if len(procedimentos_encontrados) == 1:
                procedimento = procedimentos_encontrados[0]
                logger.info(f"Entidade inicial '{entidade_inicial}' reconhecida como Procedimento (único): {procedimento.descricao}")
                self.memoria['tipo_agendamento'] = 'Procedimento'
                self.memoria['procedimento_id'] = procedimento.id
                self.memoria['procedimento_nome'] = procedimento.descricao
                self.memoria['modalidade'] = 'Presencial' # Procedimentos são presenciais
                
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

            # 2b. Achou VÁRIOS procedimentos (ex: "Doppler")
            elif len(procedimentos_encontrados) > 1:
                logger.info(f"Entidade inicial '{entidade_inicial}' é ambígua, encontrados {len(procedimentos_encontrados)} procedimentos.")
                self.memoria['tipo_agendamento'] = 'Procedimento'
                lista_procedimentos_memoria = [{'id': p.id, 'descricao': p.descricao} for p in procedimentos_encontrados]
                self.memoria['lista_procedimentos'] = lista_procedimentos_memoria
                
                nomes_procedimentos = '\n'.join([f"• {p['descricao']}" for p in lista_procedimentos_memoria])
                return {
                    "response_message": f"Entendido, {nome_usuario}. Encontrei alguns exames/procedimentos relacionados a *'{entidade_inicial}'*:\n\n{nomes_procedimentos}\n\nQual deles você gostaria de agendar?",
                    "new_state": "agendamento_awaiting_procedure", # Pula direto para a escolha do procedimento
                    "memory_data": self.memoria
                }
            # --- FIM DA MUDANÇA ---
                
            logger.warning(f"Entidade inicial '{entidade_inicial}' não reconhecida.")

        # --- LÓGICA PADRÃO ---
        mensagem_inicial = f"Perfeito, {nome_usuario}! O agendamento será para uma *Consulta* ou *Exame/Procedimento*?" # Mensagem atualizada
        logger.info("Fluxo padrão iniciado.")
        return {"response_message": mensagem_inicial, "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}
    
