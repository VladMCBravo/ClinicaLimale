# chatbot/agente_exames.py

import re
import logging
from datetime import datetime, timedelta
from django.utils.timezone import make_aware

from pacientes.models import Paciente
from agendamentos.models import Agendamento
from usuarios.models import CustomUser
from faturamento.models import Procedimento

logger = logging.getLogger(__name__)

class AgenteExames:
    """
    Agente especialista em Exames Gerais (Eletrocardiograma, USG de Abdome, Sangue, etc).
    Não lida com gestação. Direto ao ponto: identifica o exame e busca agenda.
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

        # --- ROTA DE FUGA CLARA ---
        if any(palavra in msg_lower for palavra in ['não estou', 'nao estou', 'cancelar', 'outro exame', 'consulta', 'desisto']):
            return {"response_message": "Entendido! Agradeço pelo contato. Se precisar de mais alguma coisa, a Clínica Limalé está de portas abertas para você! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        if estado_atual == 'inicio':
            return self._avaliar_exame_inicial(user_message)
        elif estado_atual == 'exame_aguardando_horario':
            return self._processar_escolha_horario(user_message)
        elif estado_atual == 'exame_aguardando_dados_pessoais':
            return self._processar_dados_pessoais(user_message)
        elif estado_atual == 'exame_aguardando_email':
            return self._processar_email_e_finalizar(user_message)
            
        return {}

    def _avaliar_exame_inicial(self, user_message: str) -> dict:
        nome_usuario = self.memoria_atual.get('nome_usuario', '')
        
        # Tenta pegar o exame que a IA Recepcionista já identificou
        exame_alvo = self.memoria_atual.get('ultimo_exame_citado', '')
        
        # Se não identificou antes, assume o que o usuário digitou agora
        if not exame_alvo and len(user_message.strip()) > 3:
            exame_alvo = user_message.strip()

        if not exame_alvo:
            return {
                "response_message": f"{nome_usuario}, qual exame você gostaria de agendar conosco?",
                "new_state": 'inicio',
                "memory_data": self.memoria_atual
            }
            
        return self._buscar_agenda(exame_alvo)

    def _buscar_agenda(self, nome_procedimento: str) -> dict:
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        procedimento = Procedimento.objects.filter(descricao__icontains=nome_procedimento, ativo=True).first()
        
        if not procedimento:
             return {"response_message": f"{nome_usuario}, não encontrei horários automáticos para *{nome_procedimento}* no sistema. Vou transferir para uma atendente verificar com precisão para você! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}
             
        # ====================================================
        # BUSCA DE AGENDA INTELIGENTE EM LOTE (VIA SERVICE)
        # ====================================================
        from agendamentos.services import buscar_proximo_horario_procedimento
        from datetime import datetime
        
        # Pede 3 dias de uma vez
        dias_disponiveis = buscar_proximo_horario_procedimento(procedimento.id, limite_dias_retorno=3)

        if not dias_disponiveis:
            return {"response_message": f"{nome_usuario}, nossas agendas para o *{procedimento.descricao}* estão lotadas no momento. Quer que eu peça para uma atendente verificar se conseguimos um encaixe?", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        # Salva o cardápio de dias na memória
        self.memoria_atual['dias_disponiveis'] = dias_disponiveis
        self.memoria_atual['dia_focado_index'] = 0 
        
        dia_alvo = dias_disponiveis[0]
        horarios_lista = dia_alvo['horarios_disponiveis']
        data_obj = datetime.strptime(dia_alvo['data'], '%Y-%m-%d')
        dias_pt = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']
        dia_semana_str = dias_pt[data_obj.weekday()].capitalize()
        data_curta = data_obj.strftime('%d/%m')
        
        # REGRA 1 DO PDF: Ancoragem de horários (O 1º e o do meio)
        opcoes = []
        if len(horarios_lista) >= 2:
            idx_meio = len(horarios_lista) // 2
            opcoes.append({"opcao": "1", "dia_semana": dia_semana_str, "data_iso": dia_alvo['data'], "data_formatada": data_curta, "hora": horarios_lista[0]})
            opcoes.append({"opcao": "2", "dia_semana": dia_semana_str, "data_iso": dia_alvo['data'], "data_formatada": data_curta, "hora": horarios_lista[idx_meio]})
        else:
            opcoes.append({"opcao": "1", "dia_semana": dia_semana_str, "data_iso": dia_alvo['data'], "data_formatada": data_curta, "hora": horarios_lista[0]})

        self.memoria_atual['exame_indicado'] = procedimento.descricao
        self.memoria_atual['opcoes_horario'] = opcoes
        
        valor_float = float(procedimento.valor_particular) if procedimento.valor_particular else 0.0
        valor_str = f"{valor_float:.2f}".replace('.', ',') if valor_float > 0 else "sob consulta"
        max_parcelas = max(1, min(4, int(valor_float // 100))) if valor_float > 0 else 1
        
        self.memoria_atual['valor_str'] = valor_str
        self.memoria_atual['max_parcelas'] = max_parcelas
        self.memoria_atual['preco_informado'] = False 

        # TEXTOS EXATOS DO PDF (Adaptado para Exames Gerais)
        if len(opcoes) == 1:
            msg = f"Perfeito, {nome_usuario}\n\nPara o *{procedimento.descricao}* temos apenas um horário disponível nesta data:\n{dia_semana_str} - {data_curta} às {opcoes[0]['hora']}.\n\nPosso reservar esse horário para você?"
        else:
            msg = f"Perfeito, {nome_usuario}\n\nAinda temos duas vagas disponíveis para o *{procedimento.descricao}*:\n\n"
            for op in opcoes: 
                msg += f"{op['opcao']}️⃣ {op['dia_semana']} - {op['data_formatada']} às {op['hora']}\n"
            msg += f"\nQual desses horários ficaria melhor para você?"
        
        return {"response_message": msg, "new_state": 'exame_aguardando_horario', "memory_data": self.memoria_atual}

    def _processar_escolha_horario(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        dias_disponiveis = self.memoria_atual.get('dias_disponiveis', [])
        idx_focado = self.memoria_atual.get('dia_focado_index', 0)
        from datetime import datetime
        
        # --- 1. INTERCEPTAÇÃO: PREÇO ---
        preco_informado = self.memoria_atual.get('preco_informado', False)
        if not preco_informado and any(palavra in msg_lower for palavra in ['valor', 'preço', 'preco', 'custa', 'quanto']):
            self.memoria_atual['preco_informado'] = True 
            valor_str = self.memoria_atual.get('valor_str', 'sob consulta')
            msg = f"O investimento para esse exame é de R$ {valor_str} 😊\n\nMas me diga...\n\n"
            opcoes = self.memoria_atual.get('opcoes_horario', [])
            if len(opcoes) >= 2:
                msg += f"Ainda temos vagas na {opcoes[0]['dia_semana']} às {opcoes[0]['hora']} ou {opcoes[1]['hora']}.\nQual desses horários ficaria melhor para você?"
            return {"response_message": msg, "new_state": 'exame_aguardando_horario', "memory_data": self.memoria_atual}

        # --- REGRAS DO PDF (NAVEGAÇÃO DE AGENDA) ---

        # Regra 6: Nenhum desses horários dá
        if any(p in msg_lower for p in ['nenhum', 'ruim', 'não dá', 'nao da', 'não gostei']):
            msg = f"Sem problema\n\nPodemos verificar outras disponibilidades para você.\n\nVocê prefere:\n- tentar outro horário nesse mesmo dia\n- ou verificar outra data da agenda?"
            return {"response_message": msg, "new_state": 'exame_aguardando_horario', "memory_data": self.memoria_atual}

        # Regra 4: Escolher outra data
        if any(p in msg_lower for p in ['outra data', 'outro dia', 'dia diferente', 'verificar outra data', 'proxima data']):
            if len(dias_disponiveis) > 1:
                msg = "Temos sim\n\nAlém dessa data, também temos agenda disponível:\n\n"
                dias_pt = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']
                for i in range(1, len(dias_disponiveis)):
                    data_obj = datetime.strptime(dias_disponiveis[i]['data'], '%Y-%m-%d')
                    msg += f"• {dias_pt[data_obj.weekday()]} - {data_obj.strftime('%d/%m')}\n"
                msg += "\nQual dessas datas ficaria melhor para você?"
                self.memoria_atual['esperando_escolha_data'] = True
                return {"response_message": msg, "new_state": 'exame_aguardando_horario', "memory_data": self.memoria_atual}
            else:
                 return {"response_message": "No momento nossa agenda para os próximos dias já está completa. Quer que eu tente um encaixe com uma atendente?", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        # Regra 5: Depois que escolher a data
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
                return {"response_message": msg, "new_state": 'exame_aguardando_horario', "memory_data": self.memoria_atual}

        # Regra 2: Mais tarde
        if any(p in msg_lower for p in ['mais tarde', 'final da agenda', 'outro horário', 'outro horario']):
            dia_alvo = dias_disponiveis[idx_focado]
            ultimo_horario = dia_alvo['horarios_disponiveis'][-1]
            self.memoria_atual['opcoes_horario'] = [{"opcao": "1", "dia_semana": "dia", "data_iso": dia_alvo['data'], "data_formatada": "dia", "hora": ultimo_horario}]
            return {"response_message": f"Temos sim\n\nAlém desses horários, também temos um horário no final da agenda às {ultimo_horario}.\n\nPosso reservar para você para não perder a vaga?", "new_state": 'exame_aguardando_horario', "memory_data": self.memoria_atual}

        # Regra 3: Mais cedo
        if any(p in msg_lower for p in ['mais cedo', 'início', 'inicio da agenda', 'cedo']):
            dia_alvo = dias_disponiveis[idx_focado]
            primeiro_horario = dia_alvo['horarios_disponiveis'][0] 
            self.memoria_atual['opcoes_horario'] = [{"opcao": "1", "dia_semana": "dia", "data_iso": dia_alvo['data'], "data_formatada": "dia", "hora": primeiro_horario}]
            return {"response_message": f"Temos sim\n\nNeste dia ainda temos um último horário disponível logo no início da agenda às {primeiro_horario}.\n\nEsse horário ficaria melhor para você?", "new_state": 'exame_aguardando_horario', "memory_data": self.memoria_atual}


        # --- FECHAMENTO PADRÃO (Regra 9) ---
        opcoes = self.memoria_atual.get('opcoes_horario', [])
        escolha = None
        
        if '1' in msg_lower or 'primeir' in msg_lower or 'sim' in msg_lower or (len(opcoes) > 0 and opcoes[0]['hora'] in msg_lower):
            escolha = opcoes[0]
        elif '2' in msg_lower or 'segund' in msg_lower or (len(opcoes) > 1 and opcoes[1]['hora'] in msg_lower):
            escolha = opcoes[1] if len(opcoes) > 1 else opcoes[0]
                
        if not escolha:
            return {"response_message": f"{nome_usuario}, por favor, me confirme qual horário prefere, ou digite *'cancelar'*.", "new_state": 'exame_aguardando_horario', "memory_data": self.memoria_atual}
            
        self.memoria_atual['horario_escolhido'] = escolha
        data_obj = datetime.strptime(escolha['data_iso'], '%Y-%m-%d')
        
        msg = f"Perfeito, {nome_usuario}\n\nVou deixar esse horário reservado para você:\n\n"
        msg += f"☑ {escolha['dia_semana'].capitalize()} - {data_obj.strftime('%d/%m')} às {escolha['hora']}\n\n"
        msg += "Para confirmar o agendamento e garantir a vaga, poderia me informar por gentileza:\n- nome completo\n- data de nascimento"
        
        return {"response_message": msg, "new_state": 'exame_aguardando_dados_pessoais', "memory_data": self.memoria_atual}

    def _processar_dados_pessoais(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        
        if any(palavra in msg_lower for palavra in ['dia', 'data', 'outro', 'mudar', 'horário', 'horario', 'teria', 'agenda', 'amanhã']):
            horario = self.memoria_atual.get('horario_escolhido', {})
            data_fmt = horario.get('data_formatada', 'escolhido')
            hora = horario.get('hora', '')
            
            msg = (f"{nome_usuario}, eu já deixei a sua vaga do dia {data_fmt} às {hora} pré-reservada no sistema para garantir! 😊\n\n"
                   f"Se precisarmos buscar uma data diferente, eu posso transferir você para uma de nossas atendentes verificar a agenda com calma.\n\n"
                   f"O que prefere: manter o horário atual (bastando digitar o seu nome e data de nascimento) ou falar com a recepção?")
            return {"response_message": msg, "new_state": 'exame_aguardando_dados_pessoais', "memory_data": self.memoria_atual}

        match_data = re.search(r'(\d{2}[/-]\d{2}[/-]\d{2,4})', user_message)
        
        if not match_data:
            return {"response_message": "Não consegui identificar a data de nascimento. Pode digitar seu nome completo e a data (ex: 12/05/1994)?", "new_state": 'exame_aguardando_dados_pessoais', "memory_data": self.memoria_atual}
            
        data_nasc_str = match_data.group(1).replace('-', '/')
        self.memoria_atual['data_nascimento_paciente'] = data_nasc_str
        
        nome = user_message.replace(match_data.group(1), '').strip()
        nome = re.sub(r'[^\w\s]', '', nome).strip()
        
        if len(nome.split()) < 2:
             nome = nome_usuario 
             
        self.memoria_atual['nome_completo_paciente'] = nome.title()
        nome_curto = nome.split()[0].title() if nome else nome_usuario
        
        msg = f"Prazer, {nome_curto} 😊\n\nPor último, qual é o seu melhor e-mail para enviarmos a confirmação e orientações de preparo?"
        return {"response_message": msg, "new_state": 'exame_aguardando_email', "memory_data": self.memoria_atual}

    def _processar_email_e_finalizar(self, user_message: str) -> dict:
        nome_completo = self.memoria_atual.get('nome_completo_paciente', 'Paciente')
        nome_curto = nome_completo.split()[0].title()
        
        if '@' not in user_message: 
            return {"response_message": f"{nome_curto}, esse e-mail não parece válido. Por favor, digite novamente:", "new_state": 'exame_aguardando_email', "memory_data": self.memoria_atual}
        
        self.memoria_atual['email_usuario'] = user_message.lower().strip()
                
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
            
        exame_nome = self.memoria_atual.get('exame_indicado')
        procedimento = Procedimento.objects.filter(descricao=exame_nome, ativo=True).first()
        medico = CustomUser.objects.filter(cargo='medico', is_active=True).first()
        horario = self.memoria_atual['horario_escolhido']
        
        try:
            from agendamentos.models import Sala
            sala_exame = Sala.objects.filter(e_sala_exame=True).first()
            data_hora = make_aware(datetime.strptime(f"{horario['data_iso']} {horario['hora']}", "%Y-%m-%d %H:%M"))
            
            Agendamento.objects.create(
                paciente=paciente, 
                medico=medico, 
                sala=sala_exame, 
                procedimento=procedimento, 
                tipo_agendamento='Procedimento', 
                data_hora_inicio=data_hora, 
                data_hora_fim=data_hora + timedelta(minutes=15), 
                status='Agendado', 
                observacoes=f"Bot WhatsApp. Exame: {exame_nome}."
            )
            
            msg_final = f"Tudo certo, {nome_curto} 😊\n\n"
            msg_final += f"Seu exame de *{exame_nome}* ficou reservado para *{horario['dia_semana']} ({horario['data_formatada']}) às {horario['hora']}*.\n\n"
            msg_final += f"📍 *Endereço da clínica*\n"
            msg_final += f"Rua Orense, 41 - Sala 512\nCentro - Diadema\n(próximo ao Shopping Praça da Moça e ao Quarteirão da Saúde)\n\n"
            msg_final += f"☑️ Pedimos apenas que chegue 15 minutos antes do horário.\n"
            msg_final += f"A Clínica Limalé agradece a confiança. Será um prazer cuidar da sua saúde 🤍"
        
        except Exception as e:
            logger.error(f"Erro ao salvar agendamento de exame geral: {e}")
            from chatbot.bot_logic import notificar_recepcao_whatsapp
            notificar_recepcao_whatsapp(self.session_id, nome_curto)
            msg_final = f"{nome_curto}, ocorreu uma pequena instabilidade na nossa agenda. Uma atendente confirmará o seu horário em instantes por aqui! 🤍"

        return {"response_message": msg_final, "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}