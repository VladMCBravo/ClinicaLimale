# chatbot/agente_consultas.py

import re
import logging
from datetime import datetime, timedelta
from django.utils.timezone import make_aware

from pacientes.models import Paciente
from agendamentos.models import Agendamento
from usuarios.models import CustomUser

logger = logging.getLogger(__name__)

class AgenteConsultas:
    """
    Agente especialista em Consultas Médicas.
    Cruza a especialidade do paciente com a agenda real do médico (Jornadas e Bloqueios).
    """

    def __init__(self, session_id, memoria_atual):
        self.session_id = session_id
        self.memoria_atual = memoria_atual

    def processar(self, user_message: str, estado_atual: str) -> dict:
        msg_lower = user_message.lower()
        
        # --- ROTA DE TRANSFERÊNCIA HUMANA ---
        if any(p in msg_lower for p in ['recepção', 'recepcao', 'atendente', 'humano', 'falar com pessoa']):
            from chatbot.human_transfer import HumanTransferManager
            from chatbot.bot_logic import notificar_recepcao_whatsapp
            notificar_recepcao_whatsapp(self.session_id, self.memoria_atual.get('nome_usuario', 'Paciente'))
            return HumanTransferManager.processar_transferencia(self.session_id, self.memoria_atual)

        # --- ROTA DE FUGA CLARA E SEGURA ---
        palavras_digitadas = set(re.findall(r'\b\w+\b', msg_lower))
        palavras_fuga = {'cancelar', 'obrigado', 'obrigada', 'encerrar', 'desisto'}
        frases_fuga = ['não quero', 'nao quero', 'deixa pra lá', 'exame', 'ultrassom']
        
        quer_fugir = bool(palavras_fuga.intersection(palavras_digitadas)) or any(f in msg_lower for f in frases_fuga)

        if quer_fugir and len(palavras_digitadas) < 10:
            return {
                "response_message": "Entendido! Agradeço pelo contato. Se precisar de mais alguma coisa ou mudar de ideia, a Clínica Limalé está de portas abertas para você! 🤍", 
                "new_state": 'ia_roteadora_livre', 
                "memory_data": self.memoria_atual
            }

        if estado_atual == 'agendamento_awaiting_specialty':
            return self._processar_especialidade(user_message)
        elif estado_atual == 'agendamento_awaiting_slot_choice':
            return self._processar_escolha_horario(user_message)
        elif estado_atual == 'aguardando_dados_pessoais':
            return self._processar_dados_pessoais(user_message)
        elif estado_atual == 'aguardando_email_cadastro':
            return self._processar_email_e_finalizar(user_message)

        return {}

    def _processar_especialidade(self, user_message: str) -> dict:
        nome_usuario = self.memoria_atual.get('nome_usuario', '')
        especialidade_pedida = user_message.strip().title()
        
        # Filtro básico (pode ser expandido para buscar no banco futuramente)
        especialidades_atendidas = ['Ginecologista', 'Ginecologia', 'Obstetra', 'Obstetrícia', 'Pediatra', 'Pediatria', 'Cardiologista', 'Cardiologia', 'Clinico Geral', 'Clínico Geral']
        
        if not any(esp.lower() in especialidade_pedida.lower() for esp in especialidades_atendidas):
            return {"response_message": f"{nome_usuario}, não encontrei '{especialidade_pedida}' nas nossas agendas. Por favor, digite outra especialidade ou digite *'recepção'* para falar com nossa equipe! 🤍", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria_atual}

        self.memoria_atual['especialidade_indicada'] = especialidade_pedida
        
        # Busca o primeiro médico ativo (No futuro, você pode cruzar com o modelo de Especialidades)
        medico = CustomUser.objects.filter(cargo='medico', is_active=True).first()
        
        if not medico:
             return {"response_message": f"{nome_usuario}, vou pedir para a nossa equipe verificar a agenda de {especialidade_pedida} para você. Um momento! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        # ====================================================
        # NOVA BUSCA DE AGENDA INTELIGENTE EM LOTE (VIA SERVICE)
        # ====================================================
        # *Nota: Assumindo que o seu service de médico agora também retorna lote (lista de dias)
        # se ainda for dict único, o bot trabalhará normalmente com a primeira data.
        from agendamentos.services import buscar_proximo_horario_disponivel
        
        # Supondo que a função aceite limite_dias_retorno, caso não, basta ajustar no backend
        try:
            dias_disponiveis = buscar_proximo_horario_disponivel(medico.id, limite_dias_retorno=3)
        except TypeError:
            # Fallback caso a função antiga retorne apenas 1 dict
            resultado = buscar_proximo_horario_disponivel(medico.id)
            dias_disponiveis = [resultado] if resultado else []

        if not dias_disponiveis:
            return {"response_message": f"{nome_usuario}, nossas agendas para {especialidade_pedida} estão lotadas nos próximos dias. Vou transferir para uma atendente verificar um encaixe para você! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        self.memoria_atual['dias_disponiveis'] = dias_disponiveis
        self.memoria_atual['dia_focado_index'] = 0 
        self.memoria_atual['medico_selecionado_id'] = medico.id
        
        dia_alvo = dias_disponiveis[0]
        horarios_lista = dia_alvo['horarios_disponiveis']
        data_obj = datetime.strptime(dia_alvo['data'], '%Y-%m-%d')
        dias_pt = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']
        dia_semana_str = dias_pt[data_obj.weekday()].capitalize()
        data_curta = data_obj.strftime('%d/%m/%Y')
        
        # ANCORAGEM (Regra 1): 1º e o do meio
        opcoes = []
        if len(horarios_lista) >= 2:
            idx_meio = len(horarios_lista) // 2
            opcoes.append({"opcao": "1", "dia_semana": dia_semana_str, "data_iso": dia_alvo['data'], "data_formatada": data_curta, "hora": horarios_lista[0]})
            opcoes.append({"opcao": "2", "dia_semana": dia_semana_str, "data_iso": dia_alvo['data'], "data_formatada": data_curta, "hora": horarios_lista[idx_meio]})
        else:
            opcoes.append({"opcao": "1", "dia_semana": dia_semana_str, "data_iso": dia_alvo['data'], "data_formatada": data_curta, "hora": horarios_lista[0]})

        self.memoria_atual['opcoes_horario'] = opcoes
        self.memoria_atual['preco_informado'] = False 

        msg = f"✅ Ótimo, {nome_usuario} 😊\n\nTemos atendimento para *{especialidade_pedida}* com nossa equipe médica.\n\n"
        
        if len(opcoes) >= 2:
            msg += f"Os horários mais próximos que encontrei são na {opcoes[0]['dia_semana']} ({opcoes[0]['data_formatada']}), às {opcoes[0]['hora']} ou {opcoes[1]['hora']}.\n\n"
        else:
            msg += f"A vaga mais próxima que encontrei é na {opcoes[0]['dia_semana']} ({opcoes[0]['data_formatada']}), às {opcoes[0]['hora']}.\n\n"
        
        msg += f"Qual desses horários ficaria melhor para você?"
        
        return {"response_message": msg, "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}

    def _processar_escolha_horario(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        especialidade = self.memoria_atual.get('especialidade_indicada', 'consulta')
        dias_disponiveis = self.memoria_atual.get('dias_disponiveis', [])
        idx_focado = self.memoria_atual.get('dia_focado_index', 0)
        from datetime import datetime
        
        # ---> CENÁRIO DE DISCORDÂNCIA DO EXAME / PEDIDO MÉDICO DIFERENTE <---
        if any(palavra in msg_lower for palavra in ['médico pediu', 'medico pediu', 'não é essa', 'nao é essa', 'outro médico', 'tá errado', 'ta errado']):
            msg = (f"Entendo perfeitamente, {nome_usuario}! 🤍\n\n"
                   f"Como o acompanhamento certo faz toda a diferença, é super importante seguirmos a orientação que você recebeu.\n\n"
                   f"Para garantir que vamos te agendar com o profissional correto, vou transferir o seu atendimento para uma de nossas especialistas na recepção. Ela já vai falar com você em instantes!")
            
            from chatbot.bot_logic import notificar_recepcao_whatsapp
            notificar_recepcao_whatsapp(self.session_id, nome_usuario)
            return {"response_message": msg, "new_state": 'aguardando_atendente_humano', "memory_data": self.memoria_atual}

        # --- 1. INTERCEPTAÇÃO: PREÇO COM ANCORAGEM DE VALOR ---
        preco_informado = self.memoria_atual.get('preco_informado', False)
        
        if not preco_informado and any(palavra in msg_lower for palavra in ['valor', 'preço', 'preco', 'custa', 'quanto', 'pagamento', 'investimento']):
            self.memoria_atual['preco_informado'] = True 
            opcoes = self.memoria_atual.get('opcoes_horario', [])
            
            msg = f"✅ Claro, {nome_usuario} 😊\n\nO acompanhamento com a equipe de {especialidade} é feito de forma humanizada e detalhada, para garantir a melhor conduta para a sua saúde.\n\n"
            msg += f"O investimento para a consulta é de R$ 350,00, podendo ser dividido em até 3x sem juros.\n\n"
            
            if len(opcoes) >= 2:
                msg += f"Para nossa agenda mais próxima, temos vagas na {opcoes[0]['dia_semana']} às {opcoes[0]['hora']} ou {opcoes[1]['hora']}.\n\n"
            elif len(opcoes) == 1:
                msg += f"Para nossa agenda mais próxima, temos uma vaga na {opcoes[0]['dia_semana']} às {opcoes[0]['hora']}.\n\n"
            msg += "Qual desses horários ficaria melhor para você?"
            
            return {"response_message": msg, "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}

        # --- INTERCEPTAÇÃO 1.B: FORMAS DE PAGAMENTO E PIX ---
        if any(palavra in msg_lower for palavra in ['pix', 'dinheiro', 'débito', 'debito', 'cartão', 'cartao', 'pagamento', 'aceita', 'aceitam']):
            msg = (f"Aceitamos pagamentos em Dinheiro, Cartão de Débito, Cartão de Crédito (em até 3x sem juros) e PIX. 😊\n\n"
                   f"🎁 Inclusive, para pagamentos via PIX antecipado, nós oferecemos **5% de desconto** no valor da consulta!\n\n")
            
            if self.memoria_atual.get('esperando_escolha_data'):
                msg += "Qual daquelas datas que te passei ficaria melhor para você?"
            else:
                opcoes = self.memoria_atual.get('opcoes_horario', [])
                if len(opcoes) >= 2:
                    msg += f"Para garantirmos a sua vaga, você prefere a {opcoes[0]['dia_semana']} às {opcoes[0]['hora']} ou {opcoes[1]['hora']}?"
                elif len(opcoes) == 1:
                     msg += f"Posso reservar a vaga da {opcoes[0]['dia_semana']} às {opcoes[0]['hora']} para você?"
            return {"response_message": msg, "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}

        # --- 2. CONTROLE DE INSISTÊNCIA E OBJEÇÕES ---
        if not self.memoria_atual.get('esperando_escolha_data'):
            if any(palavra in msg_lower for palavra in ['caro', 'condição', 'condicao', 'desconto', 'marido', 'espos', 'parceir', 'pensar', 'ver', 'depois']):
                msg = f"Entendo perfeitamente, {nome_usuario} 😊\n\nO acompanhamento com a equipe de {especialidade} é muito importante e é normal querer decidir com calma.\n\nComo as vagas preenchem rápido, posso deixar um dos horários *provisoriamente pré-reservado* para você não correr o risco de perder a vaga enquanto decide.\n\n"
                
                opcoes = self.memoria_atual.get('opcoes_horario', [])
                if len(opcoes) >= 2:
                    msg += f"Temos {opcoes[0]['dia_semana']} às {opcoes[0]['hora']} ou {opcoes[1]['hora']}.\nQual deles você prefere que eu deixe reservado para garantir?"
                elif len(opcoes) == 1:
                    msg += f"Temos {opcoes[0]['dia_semana']} às {opcoes[0]['hora']}.\nPosso deixar esse pré-reservado para você garantir?"
                return {"response_message": msg, "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}

        # --- 3. REGRAS DE NAVEGAÇÃO DE AGENDA ---

        if any(p in msg_lower for p in ['nenhum', 'ruim', 'não dá', 'nao da', 'não gostei']):
            msg = f"Sem problema\n\nPodemos verificar outras disponibilidades para você.\n\nVocê prefere:\n- tentar outro horário nesse mesmo dia\n- ou verificar outra data da agenda?"
            return {"response_message": msg, "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}

        if any(p in msg_lower for p in ['outra data', 'outro dia', 'dia diferente', 'verificar outra data', 'proxima data']):
            if len(dias_disponiveis) > 1:
                msg = "Temos sim\n\nAlém dessa data, também temos agenda disponível:\n\n"
                dias_pt = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']
                for i in range(1, len(dias_disponiveis)):
                    data_obj = datetime.strptime(dias_disponiveis[i]['data'], '%Y-%m-%d')
                    msg += f"• {dias_pt[data_obj.weekday()]} - {data_obj.strftime('%d/%m')}\n"
                msg += "\nQual dessas datas ficaria melhor para você?"
                self.memoria_atual['esperando_escolha_data'] = True
                return {"response_message": msg, "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}
            else:
                 return {"response_message": "No momento nossa agenda para os próximos dias já está completa. Quer que eu tente um encaixe com uma atendente?", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        if self.memoria_atual.get('esperando_escolha_data'):
            escolhida_idx = -1
            dias_pt_curto = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']
            for i in range(1, len(dias_disponiveis)):
                data_obj = datetime.strptime(dias_disponiveis[i]['data'], '%Y-%m-%d')
                if data_obj.strftime('%d/%m') in msg_lower or dias_pt_curto[data_obj.weekday()] in msg_lower:
                    escolhida_idx = i
                    break
            
            if escolhida_idx != -1:
                self.memoria_atual['esperando_escolha_data'] = False
                self.memoria_atual['dia_focado_index'] = escolhida_idx
                dia_alvo = dias_disponiveis[escolhida_idx]
                horarios_lista = dia_alvo['horarios_disponiveis']
                
                data_obj = datetime.strptime(dia_alvo['data'], '%Y-%m-%d')
                dia_semana_str = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'][data_obj.weekday()]
                
                opcoes = []
                if len(horarios_lista) >= 2:
                    opcoes.append({"opcao": "1", "dia_semana": dia_semana_str.capitalize(), "data_iso": dia_alvo['data'], "data_formatada": data_obj.strftime('%d/%m/%Y'), "hora": horarios_lista[0]})
                    opcoes.append({"opcao": "2", "dia_semana": dia_semana_str.capitalize(), "data_iso": dia_alvo['data'], "data_formatada": data_obj.strftime('%d/%m/%Y'), "hora": horarios_lista[len(horarios_lista)//2]})
                else:
                    opcoes.append({"opcao": "1", "dia_semana": dia_semana_str.capitalize(), "data_iso": dia_alvo['data'], "data_formatada": data_obj.strftime('%d/%m/%Y'), "hora": horarios_lista[0]})
                
                self.memoria_atual['opcoes_horario'] = opcoes
                
                msg = f"Perfeito\n\nPara {dia_semana_str}, {data_obj.strftime('%d/%m')}, ainda temos duas vagas disponíveis:\n\n"
                for op in opcoes:
                    msg += f"{op['opcao']}️⃣ {op['hora']}\n"
                msg += "\nQual desses horários ficaria melhor para você?"
                return {"response_message": msg, "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}

        # Regra 2: Mais tarde
        if any(p in msg_lower for p in ['mais tarde', 'final da agenda', 'outro horário', 'outro horario']):
            dia_alvo = dias_disponiveis[idx_focado]
            ultimo_horario = dia_alvo['horarios_disponiveis'][-1]
            data_obj_aux = datetime.strptime(dia_alvo['data'], '%Y-%m-%d')
            dia_semana_aux = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'][data_obj_aux.weekday()]
            self.memoria_atual['opcoes_horario'] = [{"opcao": "1", "dia_semana": dia_semana_aux, "data_iso": dia_alvo['data'], "data_formatada": data_obj_aux.strftime('%d/%m/%Y'), "hora": ultimo_horario}]
            return {"response_message": f"Temos sim\n\nAlém desses horários, também temos um horário no final da agenda às {ultimo_horario}.\n\nPosso reservar para você para não perder a vaga?", "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}

        # Regra 3: Mais cedo
        if any(p in msg_lower for p in ['mais cedo', 'início', 'inicio da agenda', 'cedo']):
            dia_alvo = dias_disponiveis[idx_focado]
            primeiro_horario = dia_alvo['horarios_disponiveis'][0] 
            data_obj_aux = datetime.strptime(dia_alvo['data'], '%Y-%m-%d')
            dia_semana_aux = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'][data_obj_aux.weekday()]
            self.memoria_atual['opcoes_horario'] = [{"opcao": "1", "dia_semana": dia_semana_aux, "data_iso": dia_alvo['data'], "data_formatada": data_obj_aux.strftime('%d/%m/%Y'), "hora": primeiro_horario}]
            return {"response_message": f"Temos sim\n\nNeste dia ainda temos um último horário disponível logo no início da agenda às {primeiro_horario}.\n\nEsse horário ficaria melhor para você?", "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}

        # --- 4. FLUXO DE ESCOLHA DE HORÁRIO E REPESCAGEM ---
        opcoes = self.memoria_atual.get('opcoes_horario', [])
        escolha = None
        
        # PRIORIDADE MÁXIMA: O paciente digitou um horário específico? (ex: "08:15")
        match_hora = re.search(r'(\d{2}:\d{2})', msg_lower)
        if match_hora:
            hora_digitada = match_hora.group(1)
            dia_alvo = dias_disponiveis[idx_focado]
            if hora_digitada in dia_alvo['horarios_disponiveis']:
                data_obj_aux = datetime.strptime(dia_alvo['data'], '%Y-%m-%d')
                dia_semana_aux = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'][data_obj_aux.weekday()]
                escolha = {"opcao": "1", "dia_semana": dia_semana_aux, "data_iso": dia_alvo['data'], "data_formatada": data_obj_aux.strftime('%d/%m/%Y'), "hora": hora_digitada}
                self.memoria_atual['opcoes_horario'] = [escolha]

        # Se não digitou uma hora específica, avalia as opções da tela
        if not escolha and len(opcoes) > 0:
            hora_1 = opcoes[0]['hora']
            hora_2 = opcoes[1]['hora'] if len(opcoes) > 1 else "---"
            
            if hora_2 in msg_lower or msg_lower.strip() in ['2', '2.', 'dois'] or 'segund' in msg_lower:
                escolha = opcoes[1] if len(opcoes) > 1 else opcoes[0]
            elif hora_1 in msg_lower or msg_lower.strip() in ['1', '1.', 'um'] or 'primeir' in msg_lower:
                escolha = opcoes[0]
            elif len(opcoes) == 1 and any(p in msg_lower for p in ['sim', 'pode', 'ok', 'quero', 'marcar', 'certeza', 'isso']):
                escolha = opcoes[0]

        # --- INTERCEPTADOR PARA "QUAIS HORÁRIOS VOCÊ TEM?" ---
        if not escolha:
            if any(p in msg_lower for p in ['quais', 'que horário', 'que horario', 'opções', 'opcoes', 'quais sao', 'disponível', 'disponivel', 'tem outro']):
                dia_alvo = dias_disponiveis[idx_focado]
                horarios_lista = dia_alvo['horarios_disponiveis']
                data_obj_aux = datetime.strptime(dia_alvo['data'], '%Y-%m-%d')
                dia_semana_aux = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'][data_obj_aux.weekday()].capitalize()
                
                opcoes_novas = []
                if len(horarios_lista) >= 2:
                    opcoes_novas.append({"opcao": "1", "dia_semana": dia_semana_aux, "data_iso": dia_alvo['data'], "data_formatada": data_obj_aux.strftime('%d/%m/%Y'), "hora": horarios_lista[0]})
                    opcoes_novas.append({"opcao": "2", "dia_semana": dia_semana_aux, "data_iso": dia_alvo['data'], "data_formatada": data_obj_aux.strftime('%d/%m/%Y'), "hora": horarios_lista[len(horarios_lista)//2]})
                else:
                    opcoes_novas.append({"opcao": "1", "dia_semana": dia_semana_aux, "data_iso": dia_alvo['data'], "data_formatada": data_obj_aux.strftime('%d/%m/%Y'), "hora": horarios_lista[0]})
                
                self.memoria_atual['opcoes_horario'] = opcoes_novas
                
                msg = f"Para {dia_semana_aux} ({data_obj_aux.strftime('%d/%m')}), nós temos as seguintes vagas:\n\n"
                for op in opcoes_novas:
                    msg += f"{op['opcao']}️⃣ {op['hora']}\n"
                msg += "\nAlgum desses fica melhor para você?"
                return {"response_message": msg, "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}

        if not escolha:
            return {"response_message": f"{nome_usuario}, por favor, me confirme qual horário prefere, ou digite *'não quero'* se preferir deixar para outra hora.", "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}
            
        self.memoria_atual['horario_escolhido'] = escolha
        msg = f"Perfeito, {nome_usuario} 😊\n\nJá vou deixar pré-reservado para você {escolha['dia_semana']} ({escolha['data_formatada']}) às {escolha['hora']}.\n\nPoderia me informar seu nome completo e data de nascimento, por favor? (Ex: Maria Silva, 12/05/1994)"
        return {"response_message": msg, "new_state": 'aguardando_dados_pessoais', "memory_data": self.memoria_atual}

    def _processar_dados_pessoais(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        
        # --- INTERCEPTADOR 1: PREÇO FORA DE HORA E PAGAMENTO ---
        if any(palavra in msg_lower for palavra in ['valor', 'preço', 'preco', 'custa', 'quanto', 'investimento']):
            msg = f"O investimento para a consulta é de R$ 350,00, podendo ser dividido em até 3x sem juros 😊\n\nAgora, para garantirmos a sua vaga, poderia me informar seu nome completo e data de nascimento, por favor? (Ex: Maria Silva, 12/05/1994)"
            return {"response_message": msg, "new_state": 'aguardando_dados_pessoais', "memory_data": self.memoria_atual}
        
        if any(palavra in msg_lower for palavra in ['pix', 'dinheiro', 'débito', 'debito', 'cartão', 'cartao', 'pagamento', 'aceita', 'aceitam']):
            msg = (f"Aceitamos pagamentos em Dinheiro, Cartão de Débito, Cartão de Crédito (em até 3x sem juros) e PIX. 😊\n"
                   f"🎁 Inclusive, para pagamentos via PIX antecipado, nós oferecemos **5% de desconto**!\n\n"
                   f"Agora, para garantirmos a sua vaga, poderia me informar seu nome completo e data de nascimento, por favor? (Ex: Maria Silva, 12/05/1994)")
            return {"response_message": msg, "new_state": 'aguardando_dados_pessoais', "memory_data": self.memoria_atual}

        # --- INTERCEPTADOR: MUDANÇA DE DATA OU DÚVIDA SOBRE A AGENDA ---
        match_hora = re.search(r'(\d{2}:\d{2})', msg_lower)
        if match_hora or any(palavra in msg_lower for palavra in ['dia', 'data', 'outro', 'mudar', 'horário', 'horario', 'teria', 'agenda', 'amanhã', 'não, quero', 'nao, quero', 'errado']):
            horario = self.memoria_atual.get('horario_escolhido', {})
            data_fmt = horario.get('data_formatada', 'escolhido')
            hora = horario.get('hora', '')
            
            msg = (f"Entendi, {nome_usuario}. Parece que você deseja alterar o dia ou horário que reservamos, certo? 😊\n\n"
                   f"Qual horário ou data você prefere para verificarmos novamente a disponibilidade na agenda?")
            return {"response_message": msg, "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}
            
        # --- INTERCEPTADOR CONVÊNIO ---
        if any(palavra in msg_lower for palavra in ['convênio', 'convenio', 'plano', 'amil', 'unimed', 'sulamerica', 'bradesco']):
            msg = (f"{nome_usuario}, no momento nossos atendimentos são apenas particulares, mas emitimos a nota fiscal para você solicitar o reembolso junto ao seu plano de saúde! 😊\n\n"
                   f"Podemos manter a sua reserva? (Basta digitar o seu nome e data de nascimento, ou digitar 'cancelar')")
            return {"response_message": msg, "new_state": 'aguardando_dados_pessoais', "memory_data": self.memoria_atual}

        # --- INTERCEPTADOR OBJEÇÕES ---
        if any(palavra in msg_lower for palavra in ['caro', 'condição', 'condicao', 'desconto', 'marido', 'espos', 'parceir', 'junto', 'falar com', 'pensar', 'ver', 'depois', 'vou decidir']):
            horario = self.memoria_atual.get('horario_escolhido', {})
            data_fmt = horario.get('data_formatada', 'escolhido')
            hora = horario.get('hora', '')
            
            msg = (f"Compreendo perfeitamente, {nome_usuario} 😊\n\n"
                   f"O acompanhamento médico é muito importante e é natural querer decidir com calma.\n\n"
                   f"Como nossas vagas são limitadas, eu vou manter o horário do dia {data_fmt} às {hora} *provisoriamente pré-reservado* para você não correr o risco de perder a vaga enquanto decide.\n\n"
                   f"Assim que tiver a confirmação, é só digitar o seu nome completo e data de nascimento aqui para validarmos, ou digitar 'cancelar'. Tudo bem?")
            return {"response_message": msg, "new_state": 'aguardando_dados_pessoais', "memory_data": self.memoria_atual}

        # --- FLUXO NORMAL: Extrair data e nome ---
        match_data = re.search(r'(\d{2}[/-]\d{2}[/-]\d{2,4})', user_message)
        
        if not match_data:
            return {"response_message": "Não consegui identificar a data de nascimento. Pode digitar seu nome completo e a data (ex: 12/05/1994)?", "new_state": 'aguardando_dados_pessoais', "memory_data": self.memoria_atual}
            
        data_nasc_str = match_data.group(1).replace('-', '/')
        self.memoria_atual['data_nascimento_paciente'] = data_nasc_str
        
        nome = user_message.replace(match_data.group(1), '').strip()
        nome = re.sub(r'[^\w\s]', '', nome).strip()
        
        if len(nome.split()) < 2:
             nome = nome_usuario 
             
        self.memoria_atual['nome_completo_paciente'] = nome.title()
        nome_curto = nome.split()[0].title() if nome else nome_usuario
        
        msg = f"Prazer, {nome_curto} 😊\n\nPor último, qual é o seu melhor e-mail para enviarmos as orientações e a confirmação?"
        return {"response_message": msg, "new_state": 'aguardando_email_cadastro', "memory_data": self.memoria_atual}

    def _processar_email_e_finalizar(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        nome_completo = self.memoria_atual.get('nome_completo_paciente', 'Paciente')
        nome_curto = nome_completo.split()[0].title()
        
        # --- INTERCEPTADORES FINAIS ---
        if any(palavra in msg_lower for palavra in ['valor', 'preço', 'preco', 'custa', 'quanto', 'pagamento', 'investimento']):
            msg = f"O investimento para a consulta é de R$ 350,00, podendo ser dividido em até 3x sem juros 😊\n\nPara enviarmos as orientações e finalizarmos o seu agendamento, qual é o seu melhor e-mail?"
            return {"response_message": msg, "new_state": 'aguardando_email_cadastro', "memory_data": self.memoria_atual}
        
        if any(palavra in msg_lower for palavra in ['pix', 'dinheiro', 'débito', 'debito', 'cartão', 'cartao', 'pagamento', 'aceita', 'aceitam']):
            msg = (f"Aceitamos pagamentos em Dinheiro, Cartão de Débito, Cartão de Crédito (em até 3x sem juros) e PIX. 😊\n"
                   f"🎁 Inclusive, para pagamentos via PIX antecipado, nós oferecemos **5% de desconto**!\n\n"
                   f"Para enviarmos as orientações e finalizarmos o seu agendamento, qual é o seu melhor e-mail?")
            return {"response_message": msg, "new_state": 'aguardando_email_cadastro', "memory_data": self.memoria_atual}

        if any(palavra in msg_lower for palavra in ['dia', 'data', 'outro', 'mudar', 'horário', 'horario', 'teria', 'agenda', 'amanhã']):
            horario = self.memoria_atual.get('horario_escolhido', {})
            data_fmt = horario.get('data_formatada', 'escolhido')
            hora = horario.get('hora', '')
            
            msg = (f"{nome_curto}, eu já deixei a sua vaga do dia {data_fmt} às {hora} pré-reservada no sistema para garantir! 😊\n\n"
                   f"Se precisarmos buscar uma data diferente, eu posso transferir você para uma de nossas atendentes verificar a agenda completa com calma.\n\n"
                   f"O que prefere: manter o horário atual (bastando digitar o seu e-mail) ou falar com a recepção?")
            return {"response_message": msg, "new_state": 'aguardando_email_cadastro', "memory_data": self.memoria_atual}

        if any(palavra in msg_lower for palavra in ['caro', 'condição', 'condicao', 'desconto', 'marido', 'espos', 'parceir', 'junto', 'falar com', 'pensar', 'ver', 'depois', 'vou decidir']):
            horario = self.memoria_atual.get('horario_escolhido', {})
            data_fmt = horario.get('data_formatada', 'escolhido')
            hora = horario.get('hora', '')
            
            msg = (f"Compreendo perfeitamente, {nome_curto} 😊\n\n"
                   f"Como nossas vagas são limitadas, eu vou manter o horário do dia {data_fmt} às {hora} *provisoriamente pré-reservado* para você não correr o risco de perder a vaga enquanto decide.\n\n"
                   f"Assim que tiver a confirmação, é só digitar o seu e-mail aqui para validarmos o agendamento, ou digitar 'cancelar'. Tudo bem?")
            return {"response_message": msg, "new_state": 'aguardando_email_cadastro', "memory_data": self.memoria_atual}

        # --- FLUXO NORMAL DE EMAIL ---
        if '@' not in user_message: 
            return {"response_message": f"{nome_curto}, esse e-mail não parece válido. Por favor, digite novamente:", "new_state": 'aguardando_email_cadastro', "memory_data": self.memoria_atual}
        
        self.memoria_atual['email_usuario'] = user_message.lower().strip()
                
        # --- MONTAGEM E SALVAMENTO ---
        telefone = ''.join(filter(str.isdigit, self.session_id))
        data_nasc_str = self.memoria_atual.get('data_nascimento_paciente', '')
        
        try:
            dia, mes, ano = data_nasc_str.split('/')
            if len(ano) == 2: ano = "19" + ano if int(ano) > 25 else "20" + ano
            data_nascimento_db = f"{ano}-{mes}-{dia}"
        except Exception:
            data_nascimento_db = '1900-01-01'
        
        paciente, _ = Paciente.objects.get_or_create(telefone_celular=telefone, defaults={'nome_completo': nome_completo, 'email': self.memoria_atual['email_usuario'], 'data_nascimento': data_nascimento_db})
        paciente.nome_completo = nome_completo
        paciente.email = self.memoria_atual['email_usuario']
        if data_nascimento_db != '1900-01-01': paciente.data_nascimento = data_nascimento_db
        paciente.save()
            
        especialidade = self.memoria_atual.get('especialidade_indicada', 'Consulta Médica')
        medico_id = self.memoria_atual.get('medico_selecionado_id')
        medico = CustomUser.objects.filter(id=medico_id).first() if medico_id else CustomUser.objects.filter(cargo='medico', is_active=True).first()
        horario = self.memoria_atual['horario_escolhido']
        
        try:
            # A responsabilidade do pagamento foi 100% repassada ao Django (signals.py)
            data_hora = make_aware(datetime.strptime(f"{horario['data_iso']} {horario['hora']}", "%Y-%m-%d %H:%M"))
            
            Agendamento.objects.create(
                paciente=paciente, 
                medico=medico, 
                tipo_agendamento='Consulta', 
                data_hora_inicio=data_hora, 
                data_hora_fim=data_hora + timedelta(minutes=15), 
                status='Agendado', 
                observacoes=f"Bot WhatsApp. Especialidade: {especialidade}."
            )
            
            msg_final = f"Tudo certo, {nome_curto} 😊\n\n"
            msg_final += f"Sua consulta de *{especialidade}* ficou reservada para *{horario['dia_semana']} ({horario['data_formatada']}) às {horario['hora']}*.\n\n"
            msg_final += f"📍 *Endereço da clínica*\n"
            msg_final += f"Rua Orense, 41 - Sala 512\nCentro - Diadema\n(próximo ao Shopping Praça da Moça e ao Quarteirão da Saúde)\n\n"
            msg_final += f"☑️ Pedimos apenas que chegue 15 minutos antes do horário para o preenchimento da ficha.\n\n"
            msg_final += f"A Clínica Limalé agradece a confiança. Será um prazer cuidar da sua saúde 🤍"
        
        except Exception as e:
            logger.error(f"Erro ao salvar consulta médica: {e}")
            from chatbot.bot_logic import notificar_recepcao_whatsapp
            notificar_recepcao_whatsapp(self.session_id, nome_curto)
            msg_final = f"{nome_curto}, ocorreu uma instabilidade na nossa agenda. Uma atendente confirmará o seu horário em instantes por aqui! 🤍"

        return {"response_message": msg_final, "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}