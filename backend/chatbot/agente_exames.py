# chatbot/agente_exames.py

import re
import logging
from datetime import datetime, timedelta, date
from django.utils.timezone import make_aware

from pacientes.models import Paciente
from agendamentos.models import Agendamento
from usuarios.models import CustomUser
from faturamento.models import Procedimento

logger = logging.getLogger(__name__)

class AgenteExames:
    def __init__(self, session_id, memoria_atual):
        self.session_id = session_id
        self.memoria_atual = memoria_atual

    def processar(self, user_message: str, estado_atual: str) -> dict:
        if any(palavra in user_message.lower() for palavra in ['não estou', 'nao estou', 'cancelar', 'outro exame', 'consulta', 'ginecologista']):
            return {"response_message": "Ah, entendi! Como posso te ajudar hoje na clínica então?", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        if estado_atual == 'inicio':
            return self._avaliar_exame_inicial(user_message)
        elif estado_atual == 'aguardando_semanas_gestacao':
            return self._calcular_exame_e_agenda(user_message)
        elif estado_atual == 'aguardando_escolha_horario_gestacao':
            return self._processar_escolha_horario(user_message)
        elif estado_atual == 'aguardando_nome_cadastro':
            return self._processar_nome(user_message)
        elif estado_atual == 'aguardando_email_cadastro':
            return self._processar_email_e_finalizar(user_message)
        return {}

    def _avaliar_exame_inicial(self, user_message: str) -> dict:
        nome_usuario = self.memoria_atual.get('nome_usuario', '')
        resposta = user_message.lower().strip()
        
        # Recupera o exame que a Recepcionista ouviu e salvou
        exame_alvo = self.memoria_atual.get('ultimo_exame_citado', '')
        
        # Se a pessoa digitar um exame novo agora, sobrescreve
        if len(resposta) > 4 and resposta not in ['apenas esse', 'so esse', 'só esse', 'sim', 'isso', 'exato']:
            exame_alvo = user_message.strip()

        exames_obstetricos = ['ultrassom', 'obstétrico', 'obstetrico', 'morfológico', 'morfologico', 'transvaginal', 'fetal', 'gestação']
        
        # É obstétrico ou não sabemos qual exame é? Joga pro funil de gestante.
        is_obstetrico = not exame_alvo or any(p in exame_alvo.lower() for p in exames_obstetricos)
        
        if is_obstetrico:
            return {
                "response_message": f"Maravilha, {nome_usuario}!\n\nVocê está com quantas semanas de gestação hoje?\nJá verifico a fase ideal e os horários disponíveis 😊",
                "new_state": 'aguardando_semanas_gestacao',
                "memory_data": self.memoria_atual
            }
        else:
            # É EXAME GERAL (ECG, Sangue, etc). Pula as semanas e busca a agenda direto!
            return self._buscar_agenda(exame_alvo)

    def _buscar_agenda(self, nome_procedimento: str) -> dict:
        procedimento = Procedimento.objects.filter(descricao__icontains=nome_procedimento, ativo=True).first()
        medico = CustomUser.objects.filter(cargo='medico', is_active=True).first()
        
        if not procedimento or not medico:
             return {"response_message": f"Não encontrei horários para *{nome_procedimento}* no sistema. Vou transferir para uma atendente! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}
             
        valor_str = f"{procedimento.valor_particular:.2f}".replace('.', ',') if procedimento.valor_particular else "sob consulta"
        
        from django.utils import timezone
        from agendamentos.models import Sala
        hoje = date.today()
        agora = timezone.now()
        
        def gerar_horarios(hora_inicio, hora_fim, intervalo=15):
            lista = []
            atual = datetime.strptime(hora_inicio, '%H:%M')
            fim = datetime.strptime(hora_fim, '%H:%M')
            while atual < fim:
                lista.append(atual.strftime('%H:%M'))
                atual += timedelta(minutes=intervalo)
            return lista

        # --- REGRAS DE EXAME DA CLÍNICA ---
        msg_lower = nome_procedimento.lower()
        if 'eco' in msg_lower or 'cardio' in msg_lower:
            # Eco Adulto e Pediátrico: Quartas das 19h às 22h
            regras_dias = { 2: gerar_horarios('19:00', '22:00') } # 2 = Quarta
        else:
            regras_dias = {0: gerar_horarios('08:00', '18:00'), 1: gerar_horarios('08:00', '18:00'), 2: gerar_horarios('08:00', '18:00'), 3: gerar_horarios('08:00', '18:00'), 4: gerar_horarios('08:00', '18:00')}

        opcoes = []
        dias_pt = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']
        sala_exame = Sala.objects.filter(e_sala_exame=True).first()

        for i in range(15):
            if len(opcoes) >= 2: break
            data_alvo = hoje + timedelta(days=i)
            dia_semana = data_alvo.weekday()
            
            if dia_semana in regras_dias:
                for h in regras_dias[dia_semana]:
                    if len(opcoes) >= 2: break
                    
                    dt_alvo_inicio = make_aware(datetime.strptime(f"{data_alvo.strftime('%Y-%m-%d')} {h}", "%Y-%m-%d %H:%M"))
                    dt_alvo_fim = dt_alvo_inicio + timedelta(minutes=15)
                    
                    if dt_alvo_inicio < agora: continue
                        
                    medico_ocupado = Agendamento.objects.filter(data_hora_inicio__lt=dt_alvo_fim, data_hora_fim__gt=dt_alvo_inicio, status__in=['Agendado', 'Confirmado', 'Em Atendimento', 'Laudando', 'Realizado']).exists()
                    sala_ocupada = False
                    if sala_exame:
                        sala_ocupada = Agendamento.objects.filter(sala=sala_exame, data_hora_inicio__lt=dt_alvo_fim, data_hora_fim__gt=dt_alvo_inicio, status__in=['Agendado', 'Confirmado', 'Em Atendimento', 'Laudando', 'Realizado']).exists()
                    
                    if not medico_ocupado and not sala_ocupada:
                        opcoes.append({"opcao": str(len(opcoes) + 1), "dia_semana": dias_pt[dia_semana], "data_iso": data_alvo.strftime('%Y-%m-%d'), "data_formatada": data_alvo.strftime('%d/%m/%Y'), "hora": h})

        if not opcoes:
            return {"response_message": f"O *{procedimento.descricao}* está R$ {valor_str}. Porém, nossas agendas estão lotadas. Quer que eu peça para uma atendente verificar um encaixe?", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        self.memoria_atual['exame_indicado'] = procedimento.descricao
        self.memoria_atual['opcoes_horario'] = opcoes
        
        msg = f"Ótimo! O valor para o *{procedimento.descricao}* é R$ {valor_str}.\n\nEncontrei estas opções de horários mais próximos:\n\n"
        for op in opcoes: msg += f"{op['opcao']}️⃣ Dia {op['data_formatada']} ({op['dia_semana']}) às {op['hora']}\n"
        msg += f"\nQual das opções fica melhor para você? (Digite 1 ou 2)"
        
        return {"response_message": msg, "new_state": 'aguardando_escolha_horario_gestacao', "memory_data": self.memoria_atual}

    def _calcular_exame_e_agenda(self, user_message: str) -> dict:
        """Apenas Obstetrícia cai aqui para calcular a Tabela Mestra."""
        match = re.search(r'\d+', user_message)
        if not match:
            return {"response_message": "Não consegui identificar o número de semanas. Pode digitar apenas o número? Ex: 12", "new_state": 'aguardando_semanas_gestacao', "memory_data": self.memoria_atual}

        semanas = int(match.group())
        
        if semanas <= 10: exame = "US Transvaginal"
        elif 11 <= semanas <= 14: exame = "Morfológico 1 Trimestre essencial"
        elif 15 <= semanas <= 19: exame = "Obstétrico essencial"
        elif 20 <= semanas <= 24: exame = "Morfológico 2 Trimestre essencial"
        else: exame = "Obstétrico com Doppler"
        
        # Chama a função unificada de agenda
        resultado = self._buscar_agenda(exame)
        
        # Customiza a mensagem para focar na gravidez
        if resultado['new_state'] == 'aguardando_escolha_horario_gestacao':
            novo_texto = resultado['response_message'].replace("Ótimo! O valor para o", f"Com {semanas} semanas, o exame ideal agora é o")
            resultado['response_message'] = novo_texto
            
        return resultado

    def _processar_escolha_horario(self, user_message: str) -> dict:
        if '1' in user_message or 'primeir' in user_message.lower():
            self.memoria_atual['horario_escolhido'] = self.memoria_atual['opcoes_horario'][0]
        elif '2' in user_message or 'segund' in user_message.lower():
            if len(self.memoria_atual['opcoes_horario']) > 1:
                self.memoria_atual['horario_escolhido'] = self.memoria_atual['opcoes_horario'][1]
        else:
            return {"response_message": "Por favor, responda com o número da opção.", "new_state": 'aguardando_escolha_horario_gestacao', "memory_data": self.memoria_atual}
        
        nome_conhecido = self.memoria_atual.get('nome_usuario')
        if nome_conhecido:
            self.memoria_atual['nome_completo'] = nome_conhecido
            return {"response_message": f"Excelente escolha, {nome_conhecido}! Qual é o seu melhor e-mail para enviarmos as orientações do preparo?", "new_state": 'aguardando_email_cadastro', "memory_data": self.memoria_atual}
        return {"response_message": "Excelente escolha! Para registrarmos o seu exame, qual é o seu nome completo?", "new_state": 'aguardando_nome_cadastro', "memory_data": self.memoria_atual}

    def _processar_nome(self, user_message: str) -> dict:
        if len(user_message.split()) < 2:
            return {"response_message": "Por favor, digite seu nome e sobrenome para o prontuário:", "new_state": 'aguardando_nome_cadastro', "memory_data": self.memoria_atual}
        self.memoria_atual['nome_completo'] = user_message.title()
        nome_curto = self.memoria_atual['nome_completo'].split()[0]
        return {"response_message": f"Prazer, {nome_curto}! E qual é o seu melhor e-mail para enviarmos as orientações do preparo?", "new_state": 'aguardando_email_cadastro', "memory_data": self.memoria_atual}

    def _processar_email_e_finalizar(self, user_message: str) -> dict:
        if '@' not in user_message: return {"response_message": "Esse e-mail não parece válido. Por favor, digite novamente:", "new_state": 'aguardando_email_cadastro', "memory_data": self.memoria_atual}
        self.memoria_atual['email_usuario'] = user_message.lower().strip()
        
        # Salvamento no banco (Idêntico ao anterior)
        telefone = ''.join(filter(str.isdigit, self.session_id))
        nome_completo = self.memoria_atual.get('nome_completo', self.memoria_atual.get('nome_usuario', 'Paciente'))
        paciente, _ = Paciente.objects.get_or_create(telefone_celular=telefone, defaults={'nome_completo': nome_completo, 'email': self.memoria_atual['email_usuario'], 'data_nascimento': '1900-01-01'})
        
        exame_nome = self.memoria_atual.get('exame_indicado')
        procedimento = Procedimento.objects.filter(descricao=exame_nome, ativo=True).first()
        medico = CustomUser.objects.filter(cargo='medico', is_active=True).first()
        horario = self.memoria_atual['horario_escolhido']
        
        try:
            data_hora = make_aware(datetime.strptime(f"{horario['data_iso']} {horario['hora']}", "%Y-%m-%d %H:%M"))
            Agendamento.objects.create(paciente=paciente, medico=medico, procedimento=procedimento, tipo_agendamento='Procedimento', data_hora_inicio=data_hora, data_hora_fim=data_hora + timedelta(minutes=15), status='Agendado', observacoes=f"Bot WhatsApp. Exame: {exame_nome}.")
            nome_curto = nome_completo.split()[0]
            msg_final = f"Tudo certo, {nome_curto}! 🎉\n\nSeu exame de *{exame_nome}* está agendado para:\n📅 *Dia {horario['data']} às {horario['hora']}*\n\nAgradecemos por escolher a Clínica Limalé 🤍!"
        except Exception:
            msg_final = "Ocorreu uma instabilidade na agenda. Uma atendente confirmará o horário em instantes com você! 🤍"

        return {"response_message": msg_final, "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}