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
        msg_lower = user_message.lower()
        
        # --- ROTA DE TRANSFERÊNCIA HUMANA (Se pedir atendente no meio do fluxo) ---
        if any(p in msg_lower for p in ['recepção', 'recepcao', 'atendente', 'humano', 'falar com pessoa']):
            from chatbot.human_transfer import HumanTransferManager
            from chatbot.bot_logic import notificar_recepcao_whatsapp
            notificar_recepcao_whatsapp(self.session_id, self.memoria_atual.get('nome_usuario', 'Paciente'))
            return HumanTransferManager.processar_transferencia(self.session_id, self.memoria_atual)

        # --- ROTA DE FUGA CLARA (Se a pessoa realmente não quer) ---
        palavras_fuga = ['cancelar', 'não quero', 'nao quero', 'deixa pra lá', 'ginecologista', 'obrigado', 'obrigada', 'encerrar', 'desisto']
        if any(p in msg_lower for p in palavras_fuga) and len(msg_lower.split()) < 10:
            return {
                "response_message": "Entendido! Agradeço pelo contato. Se precisar de mais alguma coisa ou mudar de ideia, a Clínica Limalé está de portas abertas para você! 🤍", 
                "new_state": 'ia_roteadora_livre', 
                "memory_data": self.memoria_atual
            }

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
        # NOVA BUSCA DE AGENDA INTELIGENTE (VIA SERVICE)
        # ====================================================
        from agendamentos.services import buscar_proximo_horario_procedimento
        from datetime import datetime
        
        resultado_agenda = buscar_proximo_horario_procedimento(procedimento.id)
        opcoes = []

        if resultado_agenda:
            data_iso = resultado_agenda['data']
            # Pega no máximo as 2 primeiras opções
            horarios_livres = resultado_agenda['horarios_disponiveis'][:2] 
            
            data_obj = datetime.strptime(data_iso, '%Y-%m-%d')
            dias_pt = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']
            dia_semana_str = dias_pt[data_obj.weekday()]
            data_formatada = data_obj.strftime('%d/%m/%Y')

            for idx, hora in enumerate(horarios_livres):
                opcoes.append({
                    "opcao": str(idx + 1), 
                    "dia_semana": dia_semana_str, 
                    "data_iso": data_iso, 
                    "data_formatada": data_formatada, 
                    "hora": hora
                })
        
        # Se o admin NÃO configurou os dias desse exame, cai aqui!
        if len(opcoes) == 0:
            return {"response_message": f"{nome_usuario}, nossas agendas lotaram para o {procedimento.descricao}. Vou transferir para tentar um encaixe para você! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        self.memoria_atual['exame_indicado'] = procedimento.descricao
        self.memoria_atual['opcoes_horario'] = opcoes
        
        self.memoria_atual['valor_str'] = valor_str
        self.memoria_atual['max_parcelas'] = max_parcelas
        self.memoria_atual['explicacao'] = explicacao
        self.memoria_atual['preco_informado'] = False 

        if exame == "Ecocardiograma Fetal":
            msg = f"✅ Perfeito, {nome_usuario} 😊\n\nCom {semanas} semanas você está em uma fase muito boa para realizar o ecocardiograma fetal.\n\n"
            if len(opcoes) >= 2:
                msg += f"Ainda temos as duas últimas vagas disponíveis na {opcoes[0]['dia_semana']} ({opcoes[0]['data_formatada']}), às {opcoes[0]['hora']} ou {opcoes[1]['hora']}.\n\n"
            else:
                msg += f"Ainda temos uma vaga disponível na {opcoes[0]['dia_semana']} ({opcoes[0]['data_formatada']}), às {opcoes[0]['hora']}.\n\n"
            msg += f"Qual desses horários ficaria melhor para você?"
        else:
            msg = f"✅ Perfeito, {nome_usuario} 😊\n\nPara {semanas} semanas o exame ideal é o *{procedimento.descricao}*.\n\n"
            msg += f"Ainda temos vagas disponíveis para o próximo exame:\n\n"
            for op in opcoes:
                msg += f"{op['opcao']}️⃣ Dia {op['data_formatada']} ({op['dia_semana']}) às {op['hora']}\n"
            msg += f"\nQual desses horários ficaria melhor para você? (Responda 1 ou 2)"
        
        return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}

    def _processar_escolha_horario(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        # Buscando o nome para deixar o atendimento bem caloroso!
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        
        # --- 1. INTERCEPTAÇÃO: SE A PESSOA PERGUNTAR O PREÇO (O NOVO PASSO 2) ---
        preco_informado = self.memoria_atual.get('preco_informado', False)
        
        if not preco_informado and any(palavra in msg_lower for palavra in ['valor', 'preço', 'preco', 'custa', 'quanto', 'pagamento', 'investimento']):
            self.memoria_atual['preco_informado'] = True # Marca que o dinheiro já foi falado
            
            exame_nome = self.memoria_atual.get('exame_indicado', 'exame')
            valor_str = self.memoria_atual.get('valor_str', 'sob consulta')
            max_parcelas = self.memoria_atual.get('max_parcelas', 1)
            explicacao = self.memoria_atual.get('explicacao', '')
            opcoes = self.memoria_atual.get('opcoes_horario', [])
            
            texto_parcela = f"podendo ser dividido em até {max_parcelas}x sem juros" if max_parcelas > 1 else "à vista"
            
            # Soltando o Copywriter de Autoridade + Preço
            if "Ecocardiograma Fetal" in exame_nome:
                msg = f"✅ Perfeito, {nome_usuario} 😊\n\nO ecocardiograma fetal é um exame realizado com Doppler e tecnologia de ultrassom de alta resolução e padrão hospitalar, que permite avaliar de forma bastante detalhada a estrutura e o funcionamento do coração do bebê durante a gestação.\n\n"
            else:
                msg = f"✅ Perfeito, {nome_usuario} 😊\n\nSobre o *{exame_nome}*: {explicacao}\n\n"
                
            msg += f"O investimento para o exame é de R$ {valor_str}, {texto_parcela}.\n\n"
            
            # Reforça a escassez das opções que já havíamos gerado
            if "Ecocardiograma Fetal" in exame_nome:
                if len(opcoes) >= 2:
                    msg += f"Para essa semana ainda temos as duas últimas vagas disponíveis na {opcoes[0]['dia_semana']} ({opcoes[0]['data_formatada']}), às {opcoes[0]['hora']} ou {opcoes[1]['hora']}.\n\n"
                elif len(opcoes) == 1:
                    msg += f"Para essa semana ainda temos uma vaga disponível na {opcoes[0]['dia_semana']} ({opcoes[0]['data_formatada']}), às {opcoes[0]['hora']}.\n\n"
                msg += "Qual desses horários ficaria melhor para você?"
            else:
                msg += f"Nesta semana ainda temos vagas disponíveis para o exame:\n\n"
                for op in opcoes:
                    msg += f"{op['opcao']}️⃣ Dia {op['data_formatada']} ({op['dia_semana']}) às {op['hora']}\n"
                msg += f"\nQual desses horários ficaria melhor para você? (Responda 1 ou 2)"
            
            return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}

        # --- 2. CONTROLE DE INSISTÊNCIA E OBJEÇÕES ---
        ja_tentou_contornar = self.memoria_atual.get('tentativa_contorno_objecao', False)
        
        if not ja_tentou_contornar:
            if any(palavra in msg_lower for palavra in ['caro', 'condição', 'condicao', 'desconto']):
                self.memoria_atual['tentativa_contorno_objecao'] = True
                msg = f"Entendo, {nome_usuario} 😊\n\nO ecocardiograma fetal é um exame especializado para avaliação detalhada do coração do bebê durante a gestação, por isso exige uma análise bastante cuidadosa durante o atendimento.\n\nComo ainda temos duas vagas disponíveis para essa semana, posso deixar um dos horários pré-reservado para você enquanto decide, assim você não corre o risco de perder a vaga.\n\n"
                msg += self._formatar_opcoes_repescagem()
                return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}
                
            elif any(palavra in msg_lower for palavra in ['marido', 'espos', 'parceir', 'junto', 'falar com']):
                self.memoria_atual['tentativa_contorno_objecao'] = True
                msg = f"Claro, {nome_usuario} 😊\n\nO ecocardiograma fetal é um exame importante para avaliar o coração do bebê durante a gestação, então é normal querer decidir juntos com calma.\n\nSe preferir, posso deixar um dos horários provisoriamente reservado para você enquanto conversam, assim você não corre o risco de perder a vaga.\n\n"
                msg += self._formatar_opcoes_repescagem()
                return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}
                
            elif any(palavra in msg_lower for palavra in ['pensar', 'ver', 'depois', 'vou decidir']):
                self.memoria_atual['tentativa_contorno_objecao'] = True
                msg = f"Claro, {nome_usuario} 😊\n\nO ecocardiograma fetal permite avaliar de forma bastante detalhada a estrutura e o funcionamento do coração do bebê, por isso muitas gestantes preferem realizar o exame dentro dessa fase da gestação.\n\nSe desejar, posso deixar um dos horários pré-reservado para você enquanto decide, assim você não corre o risco de perder a vaga.\n\n"
                msg += self._formatar_opcoes_repescagem()
                return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}

        # --- 3. FLUXO DE ESCOLHA DE HORÁRIO ---
        opcoes = self.memoria_atual.get('opcoes_horario', [])
        escolha = None
        
        if '1' in msg_lower or 'primeir' in msg_lower or (len(opcoes) > 0 and opcoes[0]['hora'] in msg_lower):
            escolha = opcoes[0]
        elif '2' in msg_lower or 'segund' in msg_lower or (len(opcoes) > 1 and opcoes[1]['hora'] in msg_lower):
            escolha = opcoes[1] if len(opcoes) > 1 else opcoes[0]
                
        if not escolha:
            return {"response_message": f"{nome_usuario}, por favor, me confirme qual horário prefere, ou digite *'não quero'* se preferir deixar para outra hora.", "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}
            
        self.memoria_atual['horario_escolhido'] = escolha
        msg = f"Perfeito, {nome_usuario} 😊\n\nJá vou deixar pré-reservado para você {escolha['dia_semana']} ({escolha['data_formatada']}) às {escolha['hora']}.\n\nPoderia me informar seu nome completo e data de nascimento, por favor? (Ex: Maria Silva, 12/05/1994)"
        return {"response_message": msg, "new_state": 'mf_aguardando_dados_pessoais', "memory_data": self.memoria_atual}
    
    def _formatar_opcoes_repescagem(self) -> str:
        opcoes = self.memoria_atual.get('opcoes_horario', [])
        if len(opcoes) >= 2:
            return f"Temos {opcoes[0]['dia_semana']} às {opcoes[0]['hora']} ou {opcoes[1]['hora']}.\n\nQual deles você prefere que eu deixe pré-reservado para você?"
        elif len(opcoes) == 1:
             return f"Temos {opcoes[0]['dia_semana']} às {opcoes[0]['hora']}.\n\nPosso deixar esse pré-reservado para você?"
        return ""

    def _processar_dados_pessoais(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        
        # --- INTERCEPTADOR 1: PREÇO FORA DE HORA ---
        if any(palavra in msg_lower for palavra in ['valor', 'preço', 'preco', 'custa', 'quanto', 'pagamento', 'investimento']):
            valor_str = self.memoria_atual.get('valor_str', 'sob consulta')
            max_parcelas = self.memoria_atual.get('max_parcelas', 1)
            texto_parcela = f"podendo ser dividido em até {max_parcelas}x sem juros" if max_parcelas > 1 else "à vista"
            
            msg = f"O investimento para esse exame é de R$ {valor_str}, {texto_parcela} 😊\n\nAgora, para garantirmos a sua vaga, poderia me informar seu nome completo e data de nascimento, por favor? (Ex: Maria Silva, 12/05/1994)"
            return {"response_message": msg, "new_state": 'mf_aguardando_dados_pessoais', "memory_data": self.memoria_atual}

        # --- INTERCEPTADOR 2: MUDANÇA DE DATA OU DÚVIDA SOBRE A AGENDA ---
        if any(palavra in msg_lower for palavra in ['dia', 'data', 'outro', 'mudar', 'horário', 'horario', 'teria', 'agenda', 'amanhã']):
            horario = self.memoria_atual.get('horario_escolhido', {})
            data_fmt = horario.get('data_formatada', 'escolhido')
            hora = horario.get('hora', '')
            
            msg = (f"{nome_usuario}, eu já deixei a sua vaga do dia {data_fmt} às {hora} pré-reservada no sistema para garantir! 😊\n\n"
                   f"Se precisarmos buscar uma data diferente, eu posso transferir você para uma de nossas atendentes verificar a agenda completa com calma.\n\n"
                   f"O que prefere: manter o horário atual (bastando digitar o seu nome e data de nascimento) ou falar com a recepção?")
            return {"response_message": msg, "new_state": 'mf_aguardando_dados_pessoais', "memory_data": self.memoria_atual}
            
        # --- INTERCEPTADOR 3: CONVÊNIO ---
        if any(palavra in msg_lower for palavra in ['convênio', 'convenio', 'plano', 'amil', 'unimed', 'sulamerica', 'bradesco']):
            msg = (f"{nome_usuario}, no momento nossos atendimentos são apenas particulares, mas emitimos a nota fiscal para você solicitar o reembolso junto ao seu plano de saúde! 😊\n\n"
                   f"Podemos manter a sua reserva? (Basta digitar o seu nome e data de nascimento, ou digitar 'cancelar')")
            return {"response_message": msg, "new_state": 'mf_aguardando_dados_pessoais', "memory_data": self.memoria_atual}

        # --- FLUXO NORMAL: Tenta extrair a data de nascimento ---
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
        
        msg = f"Perfeito, {nome_curto} 😊\n\nPor último, qual é o seu melhor e-mail para enviarmos as orientações de preparo?"
        return {"response_message": msg, "new_state": 'mf_aguardando_email', "memory_data": self.memoria_atual}

    def _processar_email_e_finalizar(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        nome_completo = self.memoria_atual.get('nome_completo_paciente', 'Paciente')
        nome_curto = nome_completo.split()[0].title()
        
        # --- INTERCEPTADOR 1: PREÇO ---
        if any(palavra in msg_lower for palavra in ['valor', 'preço', 'preco', 'custa', 'quanto', 'pagamento', 'investimento']):
            valor_str = self.memoria_atual.get('valor_str', 'sob consulta')
            max_parcelas = self.memoria_atual.get('max_parcelas', 1)
            texto_parcela = f"podendo ser dividido em até {max_parcelas}x sem juros" if max_parcelas > 1 else "à vista"
            
            msg = f"O investimento para esse exame é de R$ {valor_str}, {texto_parcela} 😊\n\nPara enviarmos as orientações de preparo e finalizarmos o seu agendamento, qual é o seu melhor e-mail?"
            return {"response_message": msg, "new_state": 'mf_aguardando_email', "memory_data": self.memoria_atual}

        # --- INTERCEPTADOR 2: MUDANÇA DE DATA OU DÚVIDA SOBRE A AGENDA ---
        if any(palavra in msg_lower for palavra in ['dia', 'data', 'outro', 'mudar', 'horário', 'horario', 'teria', 'agenda', 'amanhã']):
            horario = self.memoria_atual.get('horario_escolhido', {})
            data_fmt = horario.get('data_formatada', 'escolhido')
            hora = horario.get('hora', '')
            
            msg = (f"{nome_curto}, eu já deixei a sua vaga do dia {data_fmt} às {hora} pré-reservada no sistema para garantir! 😊\n\n"
                   f"Se precisarmos buscar uma data diferente, eu posso transferir você para uma de nossas atendentes verificar a agenda completa com calma.\n\n"
                   f"O que prefere: manter o horário atual (bastando digitar o seu e-mail) ou falar com a recepção?")
            return {"response_message": msg, "new_state": 'mf_aguardando_email', "memory_data": self.memoria_atual}
            
        # --- INTERCEPTADOR 3: CONVÊNIO ---
        if any(palavra in msg_lower for palavra in ['convênio', 'convenio', 'plano', 'amil', 'unimed', 'sulamerica', 'bradesco']):
            msg = (f"{nome_curto}, no momento nossos atendimentos são apenas particulares, mas emitimos a nota fiscal para você solicitar o reembolso junto ao seu plano de saúde! 😊\n\n"
                   f"Podemos manter a sua reserva? (Basta digitar o seu e-mail, ou 'cancelar')")
            return {"response_message": msg, "new_state": 'mf_aguardando_email', "memory_data": self.memoria_atual}

        # --- VALIDAÇÃO REAL DO E-MAIL ---
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
            
            # --- O FECHAMENTO DO PDF COM EMOJIS E NEGRITO ---
            msg_final = f"Perfeito, {nome_curto} 😊\n\n"
            msg_final += f"Seu *{exame_nome.lower()}* ficou reservado para *{horario['dia_semana']} ({horario['data_formatada']}) às {horario['hora']}*.\n\n"
            msg_final += f"📍 *Endereço da clínica*\n"
            msg_final += f"Rua Orense, 41 - Sala 512\nCentro - Diadema\n(próximo ao Shopping Praça da Moça e ao Quarteirão da Saúde)\n\n"
            msg_final += f"☑️ Pedimos apenas que chegue 15 minutos antes do horário.\n"
            msg_final += f"📋 Caso possua ultrassons anteriores ou pedido médico, pode trazê-los no dia.\n\n"
            msg_final += f"Será um prazer cuidar de você e do seu bebê nesse momento tão especial da gestação 🤍"
        
        except Exception as e:
            logger.error(f"Erro ao salvar agendamento MF: {e}")
            from chatbot.bot_logic import notificar_recepcao_whatsapp
            notificar_recepcao_whatsapp(self.session_id, nome_curto)
            msg_final = f"{nome_curto}, ocorreu uma pequena instabilidade na nossa agenda ao salvar os seus dados. Já acionei a equipe técnica e uma atendente confirmará o seu horário em instantes por aqui! 🤍"

        return {"response_message": msg_final, "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}