# chatbot/agente_medicina_fetal.py

import re
import logging
from datetime import datetime, timedelta, date
from django.utils.timezone import make_aware

from pacientes.models import Paciente
from agendamentos.models import Agendamento
from usuarios.models import CustomUser
from faturamento.models import Procedimento

logger = logging.getLogger(__name__)

EXPLICACOES_FETAIS = {
    "US Transvaginal": "Esse exame permite confirmar a gestação, descartar gravidez ectópica e ouvir os primeiros batimentos do coraçãozinho do bebê.",
    "Morfológico 1 Trimestre essencial": "Esse exame é fundamental para avaliar o risco de síndromes genéticas e analisar a anatomia inicial do bebê de forma bem detalhada.",
    "Obstétrico essencial": "Esse exame nos permite acompanhar o crescimento, o peso e a vitalidade do bebê de forma muito precisa.",
    "Morfológico 2 Trimestre essencial": "É o exame mais completo da gestação! Ele avalia minuciosamente todos os órgãos e estruturas do bebê, da cabeça aos pés.",
    "Obstétrico com Doppler": "Esse exame avalia o fluxo sanguíneo da mãe para o bebê, garantindo que ele está recebendo oxigênio e nutrientes perfeitamente.",
    "Ecocardiograma Fetal": "Esse exame permite avaliar detalhadamente o coração do bebê durante a gestação e é indicado quando o obstetra deseja investigar possíveis alterações cardíacas fetais."
}

class AgenteMedicinaFetal:
    def __init__(self, session_id, memoria_atual):
        self.session_id = session_id
        self.memoria_atual = memoria_atual

    def processar(self, user_message: str, estado_atual: str) -> dict:
        if any(p in user_message.lower() for p in ['cancelar', 'não quero', 'deixa pra lá', 'ginecologista']):
            return {"response_message": "Entendido! Como posso te ajudar hoje na clínica então?", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        if estado_atual == 'inicio_fetal':
            return self._pedir_semanas()
        elif estado_atual == 'mf_aguardando_semanas':
            return self._sugerir_exame_e_horarios(user_message)
        elif estado_atual == 'mf_aguardando_horario':
            return self._processar_escolha_horario(user_message)
        elif estado_atual == 'aguardando_email_cadastro':
            return self._processar_email_e_finalizar(user_message)
            
        return {}

    def _pedir_semanas(self) -> dict:
        nome_usuario = self.memoria_atual.get('nome_usuario', '')
        return {
            "response_message": f"Perfeito, {nome_usuario}!\n\nPoderia me informar com quantas semanas está hoje?",
            "new_state": 'mf_aguardando_semanas',
            "memory_data": self.memoria_atual
        }

    def _sugerir_exame_e_horarios(self, user_message: str) -> dict:
        nome_usuario = self.memoria_atual.get('nome_usuario', '')
        match = re.search(r'\d+', user_message)
        if not match:
            return {"response_message": f"{nome_usuario}, não consegui identificar o número de semanas. Pode digitar apenas o número? Ex: 12", "new_state": 'mf_aguardando_semanas', "memory_data": self.memoria_atual}

        semanas = int(match.group())
        
        # Inteligência da Tabela Mestra
        if semanas <= 10: exame = "US Transvaginal"
        elif 11 <= semanas <= 14: exame = "Morfológico 1 Trimestre essencial"
        elif 15 <= semanas <= 19: exame = "Obstétrico essencial"
        elif 20 <= semanas <= 24: exame = "Morfológico 2 Trimestre essencial"
        else: exame = "Obstétrico com Doppler"
        
        # Opcional: Se a pessoa já tinha falado explicitamente Ecocardiograma fetal
        ultimo_citado = self.memoria_atual.get('ultimo_exame_citado', '').lower()
        if 'ecocardiograma' in ultimo_citado:
            exame = "Ecocardiograma Fetal"

        procedimento = Procedimento.objects.filter(descricao__icontains=exame, ativo=True).first()
        medico = CustomUser.objects.filter(cargo='medico', is_active=True).first()
        
        if not procedimento or not medico:
             return {"response_message": f"{nome_usuario}, vou pedir para a nossa equipe verificar o melhor horário para o seu exame. Um momento! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}
             
        # Cálculo financeiro (Parcela mínima de 100)
        valor_float = float(procedimento.valor_particular) if procedimento.valor_particular else 0.0
        valor_str = f"{valor_float:.2f}".replace('.', ',') if valor_float > 0 else "sob consulta"
        
        max_parcelas = 1
        if valor_float > 0:
            max_parcelas = max(1, min(4, int(valor_float // 100)))

        explicacao = EXPLICACOES_FETAIS.get(exame, "Esse exame é essencial para acompanharmos o desenvolvimento saudável do bebê.")

        # ====================================================
        # BUSCA DE AGENDA INTELIGENTE (REGRAS DA CLÍNICA + SALAS)
        # ====================================================
        from agendamentos.models import Sala
        hoje = date.today()
        
        # Regra 1: Tanto Fetal quanto Eco Fetal são de QUARTA-FEIRA (weekday == 2)
        dias_quarta = (2 - hoje.weekday()) % 7
        if dias_quarta == 0: dias_quarta = 7 # Pega a próxima quarta
        data_quarta = hoje + timedelta(days=dias_quarta)

        # Regra 2: Separa os horários dependendo se é Eco ou Fetal padrão
        if exame == "Ecocardiograma Fetal":
            # Eco Fetal: Quartas das 19h as 22h
            horarios_possiveis = ['19:00', '19:15','19:30','19:45', '20:00', '20:15', '20:30','20:45', '21:00','21:15', '21:30']
        else:
            # Medicina Fetal: Quartas das 08h as 15h
            horarios_possiveis = ['08:00', '08:15', '08:30', '08:45', '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45', '13:00', '13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45']

        # O SEGREDO DAS SALAS: Pega a sala exclusiva de exames (Consultório 1)
        sala_exame = Sala.objects.filter(e_sala_exame=True).first()

        def encontrar_horarios_livres(data_alvo, lista_horarios, limite=2):
            livres = []
            for h in lista_horarios:
                if len(livres) >= limite:
                    break
                
                dt_alvo_inicio = make_aware(datetime.strptime(f"{data_alvo.strftime('%Y-%m-%d')} {h}", "%Y-%m-%d %H:%M"))
                dt_alvo_fim = dt_alvo_inicio + timedelta(minutes=30)
                
                # 1. Verifica se o MÉDICO já tem algo agendado neste horário (em qualquer sala)
                medico_ocupado = Agendamento.objects.filter(
                    medico=medico,
                    data_hora_inicio__lt=dt_alvo_fim,
                    data_hora_fim__gt=dt_alvo_inicio,
                    status__in=['Agendado', 'Confirmado', 'Em Atendimento', 'Laudando', 'Realizado']
                ).exists()
                
                # 2. Verifica se a SALA DE EXAMES está ocupada (mesmo que por outro médico)
                sala_ocupada = False
                if sala_exame:
                    sala_ocupada = Agendamento.objects.filter(
                        sala=sala_exame,
                        data_hora_inicio__lt=dt_alvo_fim,
                        data_hora_fim__gt=dt_alvo_inicio,
                        status__in=['Agendado', 'Confirmado', 'Em Atendimento', 'Laudando', 'Realizado']
                    ).exists()
                
                # O horário só está livre se o MÉDICO e a SALA DE EXAMES estiverem livres!
                if not medico_ocupado and not sala_ocupada: 
                    livres.append(h)
            return livres

        # Tenta achar 2 horários livres na próxima quarta
        horarios_livres = encontrar_horarios_livres(data_quarta, horarios_possiveis, limite=2)
        
        opcoes = []
        for idx, hora in enumerate(horarios_livres):
            opcoes.append({
                "opcao": str(idx + 1), 
                "dia_semana": "quarta-feira", 
                "data_iso": data_quarta.strftime('%Y-%m-%d'), 
                "data_formatada": data_quarta.strftime('%d/%m/%Y'),
                "hora": hora
            })
        
        if len(opcoes) == 0:
            return {"response_message": f"{nome_usuario}, nossas agendas para esta semana lotaram. Vou transferir para uma atendente tentar um encaixe para o {procedimento.descricao}! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        self.memoria_atual['exame_indicado'] = procedimento.descricao
        self.memoria_atual['opcoes_horario'] = opcoes
        
        # O Copywriter Perfeito (Nova Ordem com Data Bonita)
        msg = f"{nome_usuario}, para {semanas} semanas o exame ideal é o *{procedimento.descricao}*.\n\n"
        msg += f"{explicacao}\n\n"
        
        texto_parcela = f"podendo ser dividido em até {max_parcelas}x sem juros" if max_parcelas > 1 else "à vista"
        msg += f"O investimento é de R$ {valor_str}, {texto_parcela}.\n\n"
        
        msg += f"Nesta semana ainda temos apenas {len(opcoes)} vagas disponíveis para o exame:\n\n"
        
        for op in opcoes:
            # EXIBIÇÃO DA DATA: 1️⃣ Dia 11/03/2026 (quarta-feira) às 08:00
            msg += f"{op['opcao']}️⃣ Dia {op['data_formatada']} ({op['dia_semana']}) às {op['hora']}\n"
            
        msg += f"\nPosso reservar um desses horários para você? (Responda 1 ou 2)"
        
        return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}

    def _processar_escolha_horario(self, user_message: str) -> dict:
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        if '1' in user_message or 'primeir' in user_message.lower():
            self.memoria_atual['horario_escolhido'] = self.memoria_atual['opcoes_horario'][0]
        elif '2' in user_message or 'segund' in user_message.lower():
            if len(self.memoria_atual['opcoes_horario']) > 1:
                self.memoria_atual['horario_escolhido'] = self.memoria_atual['opcoes_horario'][1]
            else:
                 self.memoria_atual['horario_escolhido'] = self.memoria_atual['opcoes_horario'][0]
        else:
            return {"response_message": f"{nome_usuario}, por favor, me confirme com o número 1 ou 2 qual horário prefere.", "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}
        
        return {"response_message": f"Horário bloqueado para você, {nome_usuario}! ✅\nPara finalizarmos o seu prontuário e enviarmos as orientações de preparo, qual é o seu melhor e-mail?", "new_state": 'aguardando_email_cadastro', "memory_data": self.memoria_atual}

    def _processar_email_e_finalizar(self, user_message: str) -> dict:
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        if '@' not in user_message: return {"response_message": f"{nome_usuario}, esse e-mail não parece válido. Por favor, digite novamente:", "new_state": 'aguardando_email_cadastro', "memory_data": self.memoria_atual}
        
        self.memoria_atual['email_usuario'] = user_message.lower().strip()
        telefone = ''.join(filter(str.isdigit, self.session_id))
        nome_completo = self.memoria_atual.get('nome_completo', nome_usuario)
        
        paciente, _ = Paciente.objects.get_or_create(telefone_celular=telefone, defaults={'nome_completo': nome_completo, 'email': self.memoria_atual['email_usuario'], 'data_nascimento': '1900-01-01'})
        
        exame_nome = self.memoria_atual.get('exame_indicado')
        procedimento = Procedimento.objects.filter(descricao=exame_nome, ativo=True).first()
        medico = CustomUser.objects.filter(cargo='medico', is_active=True).first()
        horario = self.memoria_atual['horario_escolhido']
        
        try:
            from agendamentos.models import Sala
            # Garante que o agendamento cai na sala de exames
            sala_exame = Sala.objects.filter(e_sala_exame=True).first()
            
            data_hora = make_aware(datetime.strptime(f"{horario['data_iso']} {horario['hora']}", "%Y-%m-%d %H:%M"))
            
            Agendamento.objects.create(
                paciente=paciente, 
                medico=medico, 
                sala=sala_exame, # <--- AQUI ESTÁ A MÁGICA DE ALOCAÇÃO DE SALA
                procedimento=procedimento, 
                tipo_agendamento='Procedimento', 
                data_hora_inicio=data_hora, 
                data_hora_fim=data_hora + timedelta(minutes=30), 
                status='Agendado', 
                observacoes=f"Bot WhatsApp. Exame: {exame_nome}."
            )
            msg_final = f"Tudo certo, {nome_usuario}! 🎉\n\nSeu exame de *{exame_nome}* está agendado para *dia {horario['data_formatada']} às {horario['hora']}*.\n\nAgradecemos por escolher a Clínica Limalé 🤍!"
        except Exception as e:
            logger.error(f"Erro ao salvar agendamento MF: {e}")
            msg_final = f"{nome_usuario}, ocorreu uma instabilidade na agenda. Uma atendente confirmará o horário em instantes com você! 🤍"

        return {"response_message": msg_final, "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}