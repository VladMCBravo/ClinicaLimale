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
    "Ecocardiograma Fetal": "O ecocardiograma fetal é o exame específico para avaliar a estrutura e o funcionamento do coração do bebê durante a gestação."
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
        elif estado_atual == 'mf_aguardando_dados_pessoais':
            return self._processar_dados_pessoais(user_message)
        elif estado_atual == 'mf_aguardando_email':
            return self._processar_email_e_finalizar(user_message)
            
        return {}

    def _pedir_semanas(self) -> dict:
        nome_usuario = self.memoria_atual.get('nome_usuario', '')
        return {
            "response_message": f"Para te orientar corretamente, {nome_usuario}, poderia me informar com quantas semanas de gestação você está hoje, por favor?",
            "new_state": 'mf_aguardando_semanas',
            "memory_data": self.memoria_atual
        }

    def _sugerir_exame_e_horarios(self, user_message: str) -> dict:
        nome_usuario = self.memoria_atual.get('nome_usuario', '')
        match = re.search(r'\d+', user_message)
        if not match:
            return {"response_message": f"{nome_usuario}, não consegui identificar o número de semanas. Pode digitar apenas o número? Ex: 28", "new_state": 'mf_aguardando_semanas', "memory_data": self.memoria_atual}

        semanas = int(match.group())
        
        if semanas <= 10: exame = "US Transvaginal"
        elif 11 <= semanas <= 14: exame = "Morfológico 1 Trimestre essencial"
        elif 15 <= semanas <= 19: exame = "Obstétrico essencial"
        elif 20 <= semanas <= 24: exame = "Morfológico 2 Trimestre essencial"
        else: exame = "Obstétrico com Doppler"
        
        ultimo_citado = self.memoria_atual.get('ultimo_exame_citado', '').lower()
        if 'eco' in ultimo_citado or 'cardio' in ultimo_citado:
            exame = "Ecocardiograma Fetal"

        procedimento = Procedimento.objects.filter(descricao__icontains=exame, ativo=True).first()
        medico = CustomUser.objects.filter(cargo='medico', is_active=True).first()
        
        if not procedimento or not medico:
             return {"response_message": f"{nome_usuario}, vou pedir para a nossa equipe verificar o melhor horário para o seu exame. Um momento! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}
             
        valor_float = float(procedimento.valor_particular) if procedimento.valor_particular else 0.0
        valor_str = f"{valor_float:.2f}".replace('.', ',') if valor_float > 0 else "sob consulta"
        
        max_parcelas = 1
        if valor_float > 0:
            max_parcelas = max(1, min(4, int(valor_float // 100)))

        explicacao = EXPLICACOES_FETAIS.get(exame, "Esse exame é essencial para acompanharmos o desenvolvimento saudável do bebê.")

        # ====================================================
        # BUSCA DE AGENDA INTELIGENTE (GERADOR AUTOMÁTICO)
        # ====================================================
        from agendamentos.models import Sala
        from django.utils import timezone
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

        # Regra da Clínica: Quartas-feiras
        dias_quarta = (2 - hoje.weekday()) % 7
        if dias_quarta == 0: dias_quarta = 7
        data_quarta = hoje + timedelta(days=dias_quarta)

        if exame == "Ecocardiograma Fetal":
            # Eco Fetal: Quarta 19h as 22h
            horarios_possiveis = gerar_horarios('19:00', '22:00')
        else:
            # Medicina Fetal: Quarta 08h as 15h
            horarios_possiveis = gerar_horarios('08:00', '15:00')

        sala_exame = Sala.objects.filter(e_sala_exame=True).first()

        def encontrar_horarios_livres(data_alvo, lista_horarios, limite=2):
            livres = []
            for h in lista_horarios:
                if len(livres) >= limite: break
                dt_alvo_inicio = make_aware(datetime.strptime(f"{data_alvo.strftime('%Y-%m-%d')} {h}", "%Y-%m-%d %H:%M"))
                dt_alvo_fim = dt_alvo_inicio + timedelta(minutes=15) # Duração de 15 min
                
                if dt_alvo_inicio < agora: continue
                
                medico_ocupado = Agendamento.objects.filter(data_hora_inicio__lt=dt_alvo_fim, data_hora_fim__gt=dt_alvo_inicio, status__in=['Agendado', 'Confirmado', 'Em Atendimento', 'Laudando', 'Realizado']).exists()
                sala_ocupada = False
                if sala_exame:
                    sala_ocupada = Agendamento.objects.filter(sala=sala_exame, data_hora_inicio__lt=dt_alvo_fim, data_hora_fim__gt=dt_alvo_inicio, status__in=['Agendado', 'Confirmado', 'Em Atendimento', 'Laudando', 'Realizado']).exists()
                
                if not medico_ocupado and not sala_ocupada: livres.append(h)
            return livres

        horarios_livres = encontrar_horarios_livres(data_quarta, horarios_possiveis, limite=2)
        opcoes = [{"opcao": str(idx + 1), "dia_semana": "quarta-feira", "data_iso": data_quarta.strftime('%Y-%m-%d'), "data_formatada": data_quarta.strftime('%d/%m/%Y'), "hora": hora} for idx, hora in enumerate(horarios_livres)]
        
        if len(opcoes) == 0:
            return {"response_message": f"{nome_usuario}, nossas agendas lotaram. Vou transferir para tentar um encaixe para o {procedimento.descricao}! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        self.memoria_atual['exame_indicado'] = procedimento.descricao
        self.memoria_atual['opcoes_horario'] = opcoes
        
        # --- O COPYWRITER DO PDF ---
        texto_parcela = f"podendo ser dividido em até {max_parcelas}x sem juros" if max_parcelas > 1 else "à vista"

        if exame == "Ecocardiograma Fetal":
             msg = f"☑ Perfeito\n\nCom {semanas} semanas você está em uma fase muito boa para realizar o ecocardiograma fetal, exame realizado com Doppler e tecnologia de ultrassom de alta resolução e padrão hospitalar, que permite avaliar de forma bastante detalhada a estrutura e o funcionamento do coração do bebê durante a gestação.\n\n"
             msg += f"O investimento para o exame é de R$ {valor_str}, {texto_parcela}.\n\n"
             if len(opcoes) >= 2:
                 msg += f"Para essa semana ainda temos as duas últimas vagas disponíveis na {opcoes[0]['dia_semana']} ({opcoes[0]['data_formatada']}), às {opcoes[0]['hora']} ou {opcoes[1]['hora']}.\n\n"
             else:
                 msg += f"Para essa semana ainda temos uma vaga disponível na {opcoes[0]['dia_semana']} ({opcoes[0]['data_formatada']}), às {opcoes[0]['hora']}.\n\n"
             msg += f"Qual desses horários ficaria melhor para você?"
        else:
             msg = f"☑ Perfeito\n\nPara {semanas} semanas o exame ideal é o *{procedimento.descricao}*.\n\n"
             msg += f"{explicacao}\n\n"
             msg += f"O investimento é de R$ {valor_str}, {texto_parcela}.\n\n"
             msg += f"Nesta semana ainda temos apenas {len(opcoes)} vagas disponíveis para o exame:\n\n"
             for op in opcoes:
                 msg += f"{op['opcao']}️⃣ Dia {op['data_formatada']} ({op['dia_semana']}) às {op['hora']}\n"
             msg += f"\nPosso reservar um desses horários para você? (Responda 1 ou 2)"
        
        return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}

    def _processar_escolha_horario(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        
        # --- DETECÇÃO DE OBJEÇÕES DO PDF ---
        if any(palavra in msg_lower for palavra in ['caro', 'valor', 'preço', 'condição']):
            msg = "Entendo 😊\n\nO ecocardiograma fetal é um exame especializado para avaliação detalhada do coração do bebê durante a gestação, por isso exige uma análise bastante cuidadosa durante o atendimento.\n\nComo ainda temos duas vagas disponíveis para essa semana, posso deixar um dos horários pré-reservado para você enquanto decide, assim você não corre o risco de perder a vaga.\n\n"
            msg += self._formatar_opcoes_repescagem()
            return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}
            
        elif any(palavra in msg_lower for palavra in ['marido', 'espos', 'parceir', 'junto', 'falar com']):
            msg = "Claro 😊\n\nO ecocardiograma fetal é um exame importante para avaliar o coração do bebê durante a gestação, então é normal querer decidir juntos com calma.\n\nSe preferir, posso deixar um dos horários provisoriamente reservado para você enquanto conversam, assim você não corre o risco de perder a vaga.\n\n"
            msg += self._formatar_opcoes_repescagem()
            return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}
            
        elif any(palavra in msg_lower for palavra in ['pensar', 'ver', 'depois', 'vou decidir']):
            msg = "Claro 😊\n\nO ecocardiograma fetal permite avaliar de forma bastante detalhada a estrutura e o funcionamento do coração do bebê, por isso muitas gestantes preferem realizar o exame dentro dessa fase da gestação.\n\nSe desejar, posso deixar um dos horários pré-reservado para você enquanto decide, assim você não corre o risco de perder a vaga.\n\n"
            msg += self._formatar_opcoes_repescagem()
            return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}

        # --- FLUXO DE ESCOLHA DE HORÁRIO ---
        opcoes = self.memoria_atual.get('opcoes_horario', [])
        escolha = None
        
        # Reconhece "19:30" ou "1"
        if '1' in msg_lower or 'primeir' in msg_lower or (len(opcoes) > 0 and opcoes[0]['hora'] in msg_lower):
            escolha = opcoes[0]
        elif '2' in msg_lower or 'segund' in msg_lower or (len(opcoes) > 1 and opcoes[1]['hora'] in msg_lower):
            escolha = opcoes[1] if len(opcoes) > 1 else opcoes[0]
                
        if not escolha:
            return {"response_message": "Por favor, me confirme qual horário prefere (Ex: 19:30 ou 20:20).", "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}
            
        self.memoria_atual['horario_escolhido'] = escolha
        msg = f"Perfeito 😊\n\nJá vou deixar pré-reservado para você {escolha['dia_semana']} ({escolha['data_formatada']}) às {escolha['hora']}.\n\nPoderia me informar seu nome completo e data de nascimento, por favor?"
        return {"response_message": msg, "new_state": 'mf_aguardando_dados_pessoais', "memory_data": self.memoria_atual}
        
    def _formatar_opcoes_repescagem(self) -> str:
        opcoes = self.memoria_atual.get('opcoes_horario', [])
        if len(opcoes) >= 2:
            return f"Temos {opcoes[0]['dia_semana']} às {opcoes[0]['hora']} ou {opcoes[1]['hora']}.\n\nQual deles você prefere que eu deixe pré-reservado para você?"
        elif len(opcoes) == 1:
             return f"Temos {opcoes[0]['dia_semana']} às {opcoes[0]['hora']}.\n\nPosso deixar esse pré-reservado para você?"
        return ""

    def _processar_dados_pessoais(self, user_message: str) -> dict:
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        
        # Tenta extrair a data (DD/MM/AAAA ou variações) usando Regex Inteligente
        match_data = re.search(r'(\d{2}[/-]\d{2}[/-]\d{2,4})', user_message)
        
        if not match_data:
            return {"response_message": "Não consegui identificar a data de nascimento. Pode digitar seu nome completo e a data (ex: 12/05/1994)?", "new_state": 'mf_aguardando_dados_pessoais', "memory_data": self.memoria_atual}
            
        data_nasc_str = match_data.group(1).replace('-', '/')
        self.memoria_atual['data_nascimento_paciente'] = data_nasc_str
        
        # O que sobrar na frase é o Nome
        nome = user_message.replace(match_data.group(1), '').strip()
        nome = re.sub(r'[^\w\s]', '', nome).strip() # Limpa pontuação extra
        
        if len(nome.split()) < 2:
             nome = nome_usuario # fallback
             
        self.memoria_atual['nome_completo_paciente'] = nome.title()
        nome_curto = nome.split()[0].title() if nome else nome_usuario
        
        msg = f"Perfeito, {nome_curto}\n\nPor último, qual é o seu melhor e-mail para enviarmos as orientações de preparo?"
        return {"response_message": msg, "new_state": 'mf_aguardando_email', "memory_data": self.memoria_atual}

    def _processar_email_e_finalizar(self, user_message: str) -> dict:
        nome_completo = self.memoria_atual.get('nome_completo_paciente', 'Paciente')
        nome_curto = nome_completo.split()[0].title()
        
        if '@' not in user_message: 
            return {"response_message": f"{nome_curto}, esse e-mail não parece válido. Por favor, digite novamente:", "new_state": 'mf_aguardando_email', "memory_data": self.memoria_atual}
        
        self.memoria_atual['email_usuario'] = user_message.lower().strip()
        
        # --- MONTAGEM E SALVAMENTO NO BANCO ---
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
            
            Agendamento.objects.create(paciente=paciente, medico=medico, sala=sala_exame, procedimento=procedimento, tipo_agendamento='Procedimento', data_hora_inicio=data_hora, data_hora_fim=data_hora + timedelta(minutes=15), status='Agendado', observacoes=f"Bot WhatsApp. Exame: {exame_nome}.")
            
            # --- O FECHAMENTO DO PDF ---
            msg_final = f"Perfeito, {nome_curto} 😊\n\n"
            msg_final += f"Seu {exame_nome.lower()} ficou reservado para {horario['dia_semana']} ({horario['data_formatada']}) às {horario['hora']}.\n\n"
            msg_final += f"Endereço da clínica\n"
            msg_final += f"Rua Orense, 41 - Sala 512\nCentro\nDiadema\n(próximo ao Shopping Praça da Moça e ao Quarteirão da Saúde)\n\n"
            msg_final += f"☑ Pedimos apenas que chegue 15 minutos antes do horário.\n"
            msg_final += f"☐ Caso possua ultrassons anteriores ou pedido médico, pode trazê-los no dia.\n\n"
            msg_final += f"Será um prazer cuidar de você e do seu bebê nesse momento tão especial da gestação."
        
        except Exception as e:
            logger.error(f"Erro ao salvar agendamento MF: {e}")
            from chatbot.bot_logic import notificar_recepcao_whatsapp
            notificar_recepcao_whatsapp(self.session_id, nome_curto)
            msg_final = f"{nome_curto}, ocorreu uma pequena instabilidade na nossa agenda ao salvar os seus dados. Já acionei a equipe técnica e uma atendente confirmará o seu horário em instantes por aqui! 🤍"

        return {"response_message": msg_final, "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}