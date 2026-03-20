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
        msg_lower = user_message.lower()
        
        # --- ROTA DE TRANSFERÊNCIA HUMANA ---
        if any(p in msg_lower for p in ['recepção', 'recepcao', 'atendente', 'humano', 'falar com pessoa']):
            from chatbot.human_transfer import HumanTransferManager
            from chatbot.bot_logic import notificar_recepcao_whatsapp
            notificar_recepcao_whatsapp(self.session_id, self.memoria_atual.get('nome_usuario', 'Paciente'))
            return HumanTransferManager.processar_transferencia(self.session_id, self.memoria_atual)

        # --- ROTA DE FUGA CLARA ---
        if any(palavra in msg_lower for palavra in ['não estou', 'nao estou', 'cancelar', 'outro exame', 'consulta', 'ginecologista', 'desisto']):
            return {"response_message": "Entendido! Agradeço pelo contato. Se precisar de mais alguma coisa, a Clínica Limalé está de portas abertas para você! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        if estado_atual == 'inicio':
            return self._avaliar_exame_inicial(user_message)
        elif estado_atual == 'aguardando_semanas_gestacao':
            return self._calcular_exame_e_agenda(user_message)
        elif estado_atual == 'aguardando_escolha_horario_gestacao':
            return self._processar_escolha_horario(user_message)
        elif estado_atual == 'aguardando_dados_pessoais_exames':
            return self._processar_dados_pessoais(user_message)
        elif estado_atual == 'aguardando_email_cadastro_exames':
            return self._processar_email_e_finalizar(user_message)
            
        return {}

    def _avaliar_exame_inicial(self, user_message: str) -> dict:
        nome_usuario = self.memoria_atual.get('nome_usuario', '')
        resposta = user_message.lower().strip()
        
        exame_alvo = self.memoria_atual.get('ultimo_exame_citado', '')
        
        if len(resposta) > 4 and resposta not in ['apenas esse', 'so esse', 'só esse', 'sim', 'isso', 'exato']:
            exame_alvo = user_message.strip()

        exames_obstetricos = ['ultrassom', 'obstétrico', 'obstetrico', 'morfológico', 'morfologico', 'transvaginal', 'fetal', 'gestação']
        
        is_obstetrico = not exame_alvo or any(p in exame_alvo.lower() for p in exames_obstetricos)
        
        if is_obstetrico:
            return {
                "response_message": f"Maravilha, {nome_usuario}!\n\nVocê está com quantas semanas de gestação hoje?\nJá verifico a fase ideal e os horários disponíveis 😊",
                "new_state": 'aguardando_semanas_gestacao',
                "memory_data": self.memoria_atual
            }
        else:
            return self._buscar_agenda(exame_alvo, is_obstetrico=False)

    def _calcular_exame_e_agenda(self, user_message: str) -> dict:
        nome_usuario = self.memoria_atual.get('nome_usuario', '')
        match = re.search(r'\d+', user_message)
        
        if not match:
            return {"response_message": f"{nome_usuario}, não consegui identificar o número de semanas. Pode digitar apenas o número? Ex: 12", "new_state": 'aguardando_semanas_gestacao', "memory_data": self.memoria_atual}

        semanas = int(match.group())
        
        if semanas <= 10: exame = "US Transvaginal"
        elif 11 <= semanas <= 14: exame = "Morfológico 1 Trimestre essencial"
        elif 15 <= semanas <= 19: exame = "Obstétrico essencial"
        elif 20 <= semanas <= 24: exame = "Morfológico 2 Trimestre essencial"
        else: exame = "Obstétrico com Doppler"
        
        return self._buscar_agenda(exame, is_obstetrico=True, semanas=semanas)

    def _buscar_agenda(self, nome_procedimento: str, is_obstetrico: bool = False, semanas: int = 0) -> dict:
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        procedimento = Procedimento.objects.filter(descricao__icontains=nome_procedimento, ativo=True).first()
        
        if not procedimento:
             return {"response_message": f"{nome_usuario}, não encontrei horários para *{nome_procedimento}* no sistema. Vou transferir para uma atendente te ajudar! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}
             
        # ====================================================
        # BUSCA DE AGENDA INTELIGENTE (VIA SERVICE)
        # ====================================================
        from agendamentos.services import buscar_proximo_horario_procedimento
        
        resultado_agenda = buscar_proximo_horario_procedimento(procedimento.id)
        opcoes = []

        if resultado_agenda:
            data_iso = resultado_agenda['data']
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

        if len(opcoes) == 0:
            return {"response_message": f"{nome_usuario}, nossas agendas para o *{procedimento.descricao}* estão lotadas. Quer que eu peça para uma atendente verificar um encaixe?", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        self.memoria_atual['exame_indicado'] = procedimento.descricao
        self.memoria_atual['opcoes_horario'] = opcoes
        
        valor_float = float(procedimento.valor_particular) if procedimento.valor_particular else 0.0
        valor_str = f"{valor_float:.2f}".replace('.', ',') if valor_float > 0 else "sob consulta"
        max_parcelas = max(1, min(4, int(valor_float // 100))) if valor_float > 0 else 1
        
        self.memoria_atual['valor_str'] = valor_str
        self.memoria_atual['max_parcelas'] = max_parcelas
        self.memoria_atual['preco_informado'] = False 

        if is_obstetrico:
            msg = f"✅ Perfeito, {nome_usuario} 😊\n\nCom {semanas} semanas, o exame ideal agora é o *{procedimento.descricao}*.\n\n"
        else:
            msg = f"✅ Perfeito, {nome_usuario} 😊\n\nPodemos realizar o *{procedimento.descricao}* com a nossa equipe especializada.\n\n"
            
        msg += f"Ainda temos vagas disponíveis para a nossa próxima agenda:\n\n"
        for op in opcoes: 
            msg += f"{op['opcao']}️⃣ Dia {op['data_formatada']} ({op['dia_semana']}) às {op['hora']}\n"
        msg += f"\nQual desses horários ficaria melhor para você? (Responda 1 ou 2)"
        
        return {"response_message": msg, "new_state": 'aguardando_escolha_horario_gestacao', "memory_data": self.memoria_atual}

    def _processar_escolha_horario(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        exame_nome = self.memoria_atual.get('exame_indicado', 'exame')
        
        # --- 1. INTERCEPTAÇÃO: PREÇO ---
        preco_informado = self.memoria_atual.get('preco_informado', False)
        if not preco_informado and any(palavra in msg_lower for palavra in ['valor', 'preço', 'preco', 'custa', 'quanto', 'pagamento', 'investimento']):
            self.memoria_atual['preco_informado'] = True 
            valor_str = self.memoria_atual.get('valor_str', 'sob consulta')
            max_parcelas = self.memoria_atual.get('max_parcelas', 1)
            texto_parcela = f"podendo ser dividido em até {max_parcelas}x sem juros" if max_parcelas > 1 else "à vista"
            
            msg = f"✅ Claro, {nome_usuario} 😊\n\nO investimento para o *{exame_nome}* é de R$ {valor_str}, {texto_parcela}.\n\n"
            
            opcoes = self.memoria_atual.get('opcoes_horario', [])
            if len(opcoes) >= 2:
                msg += f"Para a nossa próxima agenda, temos vagas na {opcoes[0]['dia_semana']} ({opcoes[0]['data_formatada']}), às {opcoes[0]['hora']} ou {opcoes[1]['hora']}.\n\n"
            elif len(opcoes) == 1:
                msg += f"Para a nossa próxima agenda, temos uma vaga na {opcoes[0]['dia_semana']} ({opcoes[0]['data_formatada']}), às {opcoes[0]['hora']}.\n\n"
            msg += "Qual desses horários ficaria melhor para você?"
            
            return {"response_message": msg, "new_state": 'aguardando_escolha_horario_gestacao', "memory_data": self.memoria_atual}

        # --- 2. CONTROLE DE OBJEÇÕES ---
        ja_tentou_contornar = self.memoria_atual.get('tentativa_contorno_objecao', False)
        if not ja_tentou_contornar and any(palavra in msg_lower for palavra in ['caro', 'condição', 'desconto', 'marido', 'espos', 'parceir', 'pensar', 'ver', 'depois']):
            self.memoria_atual['tentativa_contorno_objecao'] = True
            msg = f"Entendo perfeitamente, {nome_usuario} 😊\n\nA realização do *{exame_nome}* é muito importante para garantir a melhor conduta para a sua saúde.\n\nSe preferir, posso deixar um dos horários provisoriamente pré-reservado para você enquanto decide, assim você não corre o risco de perder a vaga.\n\n"
            
            opcoes = self.memoria_atual.get('opcoes_horario', [])
            if len(opcoes) >= 2:
                msg += f"Temos {opcoes[0]['dia_semana']} às {opcoes[0]['hora']} ou {opcoes[1]['hora']}.\nQual deles você prefere que eu deixe reservado?"
            elif len(opcoes) == 1:
                msg += f"Temos {opcoes[0]['dia_semana']} às {opcoes[0]['hora']}.\nPosso deixar esse pré-reservado para você?"
            return {"response_message": msg, "new_state": 'aguardando_escolha_horario_gestacao', "memory_data": self.memoria_atual}

        # --- 3. FLUXO NORMAL DE ESCOLHA ---
        opcoes = self.memoria_atual.get('opcoes_horario', [])
        escolha = None
        
        if '1' in msg_lower or 'primeir' in msg_lower or (len(opcoes) > 0 and opcoes[0]['hora'] in msg_lower):
            escolha = opcoes[0]
        elif '2' in msg_lower or 'segund' in msg_lower or (len(opcoes) > 1 and opcoes[1]['hora'] in msg_lower):
            escolha = opcoes[1] if len(opcoes) > 1 else opcoes[0]
                
        if not escolha:
            return {"response_message": f"{nome_usuario}, por favor, me confirme qual horário prefere, ou digite *'não quero'* se preferir deixar para outra hora.", "new_state": 'aguardando_escolha_horario_gestacao', "memory_data": self.memoria_atual}
            
        self.memoria_atual['horario_escolhido'] = escolha
        msg = f"Perfeito, {nome_usuario} 😊\n\nJá vou deixar pré-reservado para você {escolha['dia_semana']} ({escolha['data_formatada']}) às {escolha['hora']}.\n\nPoderia me informar seu nome completo e data de nascimento, por favor? (Ex: Maria Silva, 12/05/1994)"
        return {"response_message": msg, "new_state": 'aguardando_dados_pessoais_exames', "memory_data": self.memoria_atual}

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
            return {"response_message": msg, "new_state": 'aguardando_dados_pessoais_exames', "memory_data": self.memoria_atual}

        match_data = re.search(r'(\d{2}[/-]\d{2}[/-]\d{2,4})', user_message)
        
        if not match_data:
            return {"response_message": "Não consegui identificar a data de nascimento. Pode digitar seu nome completo e a data (ex: 12/05/1994)?", "new_state": 'aguardando_dados_pessoais_exames', "memory_data": self.memoria_atual}
            
        data_nasc_str = match_data.group(1).replace('-', '/')
        self.memoria_atual['data_nascimento_paciente'] = data_nasc_str
        
        nome = user_message.replace(match_data.group(1), '').strip()
        nome = re.sub(r'[^\w\s]', '', nome).strip()
        
        if len(nome.split()) < 2:
             nome = nome_usuario 
             
        self.memoria_atual['nome_completo_paciente'] = nome.title()
        nome_curto = nome.split()[0].title() if nome else nome_usuario
        
        msg = f"Prazer, {nome_curto} 😊\n\nPor último, qual é o seu melhor e-mail para enviarmos as orientações de preparo?"
        return {"response_message": msg, "new_state": 'aguardando_email_cadastro_exames', "memory_data": self.memoria_atual}

    def _processar_email_e_finalizar(self, user_message: str) -> dict:
        nome_completo = self.memoria_atual.get('nome_completo_paciente', 'Paciente')
        nome_curto = nome_completo.split()[0].title()
        
        if '@' not in user_message: 
            return {"response_message": f"{nome_curto}, esse e-mail não parece válido. Por favor, digite novamente:", "new_state": 'aguardando_email_cadastro_exames', "memory_data": self.memoria_atual}
        
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
            msg_final += f"📋 Caso possua ultrassons anteriores ou pedido médico, lembre-se de trazê-los no dia.\n\n"
            msg_final += f"A Clínica Limalé agradece a confiança. Será um prazer cuidar da sua saúde 🤍"
        
        except Exception as e:
            logger.error(f"Erro ao salvar agendamento de exame: {e}")
            from chatbot.bot_logic import notificar_recepcao_whatsapp
            notificar_recepcao_whatsapp(self.session_id, nome_curto)
            msg_final = f"{nome_curto}, ocorreu uma pequena instabilidade na nossa agenda. Uma atendente confirmará o seu horário em instantes por aqui! 🤍"

        return {"response_message": msg_final, "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}