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
        """Função unificada de busca de agenda de exames."""
        procedimento = Procedimento.objects.filter(descricao__icontains=nome_procedimento, ativo=True).first()
        medico = CustomUser.objects.filter(cargo='medico', is_active=True).first()
        
        if not procedimento or not medico:
             return {"response_message": f"Não encontrei horários abertos para *{nome_procedimento}* no sistema. Vou pedir para a nossa equipe verificar um encaixe para você! Um momento 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}
             
        valor_str = f"{procedimento.valor_particular:.2f}".replace('.', ',') if procedimento.valor_particular else "sob consulta"
        
        hoje = date.today()
        dias_quarta = (2 - hoje.weekday()) % 7
        if dias_quarta == 0: dias_quarta = 7
        data_quarta = hoje + timedelta(days=dias_quarta)
        
        dias_sabado = (5 - hoje.weekday()) % 7
        if dias_sabado == 0: dias_sabado = 7
        data_sabado = hoje + timedelta(days=dias_sabado)

        def encontrar_horario_livre(data_alvo, lista_horarios):
            for h in lista_horarios:
                dt_alvo = make_aware(datetime.strptime(f"{data_alvo.strftime('%Y-%m-%d')} {h}", "%Y-%m-%d %H:%M"))
                ocupado = Agendamento.objects.filter(
                    medico=medico, data_hora_inicio__lt=dt_alvo + timedelta(minutes=30),
                    data_hora_fim__gt=dt_alvo, status__in=['Agendado', 'Confirmado']
                ).exists()
                if not ocupado: return h
            return None

        hora_quarta = encontrar_horario_livre(data_quarta, ['14:00', '14:30', '15:00', '15:30', '16:00', '09:00', '09:30', '10:00'])
        hora_sabado = encontrar_horario_livre(data_sabado, ['09:00', '09:30', '10:00', '10:30', '11:00', '08:00', '08:30'])

        opcoes = []
        if hora_quarta: opcoes.append({"opcao": str(len(opcoes)+1), "dia_semana": "Quarta-feira", "data_iso": data_quarta.strftime('%Y-%m-%d'), "data": data_quarta.strftime('%d/%m/%Y'), "hora": hora_quarta})
        if hora_sabado: opcoes.append({"opcao": str(len(opcoes)+1), "dia_semana": "Sábado", "data_iso": data_sabado.strftime('%Y-%m-%d'), "data": data_sabado.strftime('%d/%m/%Y'), "hora": hora_sabado})
        
        if not opcoes:
            return {"response_message": f"O *{procedimento.descricao}* está R$ {valor_str}. Porém, nossas agendas estão lotadas. Quer que eu peça para uma atendente verificar um encaixe?", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        self.memoria_atual['exame_indicado'] = procedimento.descricao
        self.memoria_atual['opcoes_horario'] = opcoes
        
        msg = (f"Ótimo! O valor para o *{procedimento.descricao}* é R$ {valor_str}.\n\n"
               f"Encontrei estas opções de horários mais próximos:\n")
        for op in opcoes:
            msg += f"{op['opcao']}️⃣ {op['dia_semana']} ({op['data']}) às {op['hora']}\n"
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
            Agendamento.objects.create(paciente=paciente, medico=medico, procedimento=procedimento, tipo_agendamento='Procedimento', data_hora_inicio=data_hora, data_hora_fim=data_hora + timedelta(minutes=30), status='Agendado', observacoes=f"Bot WhatsApp. Exame: {exame_nome}.")
            nome_curto = nome_completo.split()[0]
            msg_final = f"Tudo certo, {nome_curto}! 🎉\n\nSeu exame de *{exame_nome}* está agendado para:\n📅 *Dia {horario['data']} às {horario['hora']}*\n\nAgradecemos por escolher a Clínica Limalé 🤍!"
        except Exception:
            msg_final = "Ocorreu uma instabilidade na agenda. Uma atendente confirmará o horário em instantes com você! 🤍"

        return {"response_message": msg_final, "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}