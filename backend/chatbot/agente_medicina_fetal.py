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
    "Obstétrico simples": "O ultrassom obstétrico simples é o exame de acompanhamento da gestação, avalia crescimento fetal, vitalidade, posição do bebê, líquido amniótico e placenta.",
    "Morfológico 1º trimestre": "O ultrassom morfológico do primeiro trimestre avalia a formação inicial do bebê, realiza o rastreamento precoce de alterações estruturais e marcadores importantes dessa fase.\n\nÉ essencial para uma avaliação mais detalhada no início da gestação.",
    "Morfológico 2º trimestre": "O ultrassom morfológico do segundo trimestre é a avaliação mais detalhada da anatomia fetal, analisa órgãos, estruturas e desenvolvimento com alta precisão.\n\nÉ o principal exame para avaliação completa da formação do bebê.",
    "Obstétrico com Doppler": "O ultrassom obstétrico com Doppler é um exame mais completo da gestação, além do crescimento e vitalidade fetal, avalia o fluxo sanguíneo entre o bebê e a placenta.\n\nÉ fundamental para análise do bem-estar fetal e da circulação placentária.",
    "Ecocardiograma Fetal": "O ecocardiograma fetal com Doppler é um exame especializado para avaliação completa do coração do bebê, analisa de forma detalhada as estruturas cardíacas, função das válvulas e o fluxo sanguíneo.\n\nÉ essencial para identificação precoce de alterações cardíacas ainda na gestação.",
    "Experiência 4D": "A Experiência Gestacional Limalé é uma ultrassonografia focada na visualização do bebê em 4D.\n\nPermite observar com mais nitidez o rostinho, expressões e movimentos espontâneos, como sorrisos e gestos.\n\nÉ um momento especial de conexão, com registro em fotos e vídeos."
}

# O TRADUTOR: Converte o nome bonito para o nome exato que está no seu Banco de Dados
NOMES_BANCO_DADOS = {
    "US Transvaginal": "US Transvaginal",
    "Obstétrico simples": "Obstétrico essencial", # Nome antigo do DB
    "Morfológico 1º trimestre": "Morfológico 1 Trimestre essencial", # Nome antigo do DB
    "Morfológico 2º trimestre": "Morfológico 2 Trimestre essencial", # Nome antigo do DB
    "Obstétrico com Doppler": "Obstétrico com Doppler",
    "Ecocardiograma Fetal": "Ecocardiograma Fetal",
    "Experiência 4D": "4D" # Palavra-chave para achar a experiência
}

class AgenteMedicinaFetal:
    def __init__(self, session_id, memoria_atual):
        self.session_id = session_id
        self.memoria_atual = memoria_atual

    def processar(self, user_message: str, estado_atual: str) -> dict:
        msg_lower = user_message.lower()
        
        # --- ROTA DE TRANSFERÊNCIA HUMANA ---
        if any(p in msg_lower for p in ['recepção', 'recepcao', 'atendente', 'humano']):
            from chatbot.human_transfer import HumanTransferManager
            from chatbot.bot_logic import notificar_recepcao_whatsapp
            notificar_recepcao_whatsapp(self.session_id, self.memoria_atual.get('nome_usuario', 'Paciente'))
            return HumanTransferManager.processar_transferencia(self.session_id, self.memoria_atual)

        # --- ROTA DE FUGA ---
        palavras_digitadas = set(re.findall(r'\b\w+\b', msg_lower))
        if bool({'cancelar', 'obrigado', 'obrigada', 'encerrar'}.intersection(palavras_digitadas)):
            return {"response_message": "Entendido! A Clínica Limalé está de portas abertas para você! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        if estado_atual == 'inicio_fetal':
            return {"response_message": "Perfeito.\n\nPara te orientar melhor, me informa com quantas semanas você está hoje, por favor.", "new_state": 'mf_aguardando_semanas', "memory_data": self.memoria_atual}
        elif estado_atual == 'mf_aguardando_semanas':
            return self._sugerir_exame_e_horarios(user_message)
        elif estado_atual == 'mf_aguardando_confirmacao_morfo2':
            return self._processar_confirmacao_morfo2(user_message)
        elif estado_atual == 'mf_aguardando_horario':
            return self._processar_escolha_horario(user_message)
        elif estado_atual == 'mf_aguardando_dados_pessoais':
            return self._processar_dados_pessoais(user_message)
        elif estado_atual == 'mf_aguardando_email':
            return self._processar_email_e_finalizar(user_message)
            
        return {}

    def _sugerir_exame_e_horarios(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        
        if any(p in msg_lower for p in ['não sei', 'nao sei', 'esqueci', 'dúvida', 'nem sei', 'to perdida']):
            msg = (
                "Sem problema 😊\n\n"
                "Você poderia me informar a data da sua última menstruação?\n\n"
                "Ou, se já tiver realizado algum ultrassom, pode me enviar o exame com a data e as semanas informadas?\n\n"
                "Assim consigo te orientar com precisão sobre o exame ideal para você."
            )
            return {"response_message": msg, "new_state": 'mf_aguardando_semanas', "memory_data": self.memoria_atual}

        match_data = re.search(r'(\d{2}[/-]\d{2}[/-]\d{2,4})', msg_lower)
        if match_data:
            try:
                dum_str = match_data.group(1).replace('-', '/')
                dia, mes, ano = dum_str.split('/')
                if len(ano) == 2: ano = "19" + ano if int(ano) > 25 else "20" + ano
                dum_date = datetime.strptime(f"{dia}/{mes}/{ano}", '%d/%m/%Y').date()
                semanas = max(1, (date.today() - dum_date).days // 7)
            except ValueError:
                return {"response_message": "A data parece inválida. Pode digitar novamente? (Ex: 10/02/2026)", "new_state": 'mf_aguardando_semanas', "memory_data": self.memoria_atual}
        else:
            match = re.search(r'\d+', user_message)
            if match:
                semanas = int(match.group())
                if any(m in msg_lower for m in ['mes', 'mês', 'meses', 'm ']):
                    semanas = semanas * 4 
            else:
                return {"response_message": "Não consegui identificar o número de semanas. Pode digitar apenas o número (ex: 12)?", "new_state": 'mf_aguardando_semanas', "memory_data": self.memoria_atual}

        self.memoria_atual['semanas_gestacao'] = semanas

        if semanas <= 5: exame = "US Transvaginal" # Transvaginal mantido para comecinho
        elif 6 <= semanas <= 10: exame = "Obstétrico simples"
        elif 11 <= semanas <= 14: exame = "Morfológico 1º trimestre"
        elif 15 <= semanas <= 19: exame = "Obstétrico simples"
        elif 20 <= semanas <= 24: exame = "Morfológico 2º trimestre"
        elif 25 <= semanas <= 30:
            msg = f"Perfeito.\n\nCom {semanas} semanas, você já realizou o ultrassom morfológico do segundo trimestre?"
            return {"response_message": msg, "new_state": 'mf_aguardando_confirmacao_morfo2', "memory_data": self.memoria_atual}
        else: exame = "Obstétrico com Doppler"
            
        ultimo_citado = self.memoria_atual.get('ultimo_exame_citado', '').lower()
        if 'eco' in ultimo_citado or 'cardio' in ultimo_citado:
            exame = "Ecocardiograma Fetal"
        elif '4d' in ultimo_citado or 'rostinho' in ultimo_citado:
            exame = "Experiência 4D"

        return self._avancar_para_exame(exame)

    def _processar_confirmacao_morfo2(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        if any(p in msg_lower for p in ['não', 'nao', 'ainda não', 'n', 'nunca']):
            exame = "Morfológico 2º trimestre"
            self.memoria_atual['msg_prefixo'] = "Perfeito.\n\nAinda está em tempo de realizar o ultrassom morfológico do segundo trimestre, que é o principal exame para avaliação da formação do bebê.\n\n"
        else: 
            exame = "Obstétrico com Doppler"
            self.memoria_atual['msg_prefixo'] = "Perfeito.\n\nNesse caso, o ideal agora é realizar o ultrassom obstétrico com Doppler para avaliação do bem-estar e da circulação do bebê.\n\n"
        return self._avancar_para_exame(exame)

    def _avancar_para_exame(self, exame: str) -> dict:
        texto_exame = EXPLICACOES_FETAIS.get(exame, "")
        prefixo = self.memoria_atual.pop('msg_prefixo', "Perfeito.\n\n")

        # MÁGICA AQUI: Converte o nome pro que está no Banco de Dados
        termo_busca = NOMES_BANCO_DADOS.get(exame, exame)
        procedimento = Procedimento.objects.filter(descricao__icontains=termo_busca, ativo=True).first()
        
        valor_str = "sob consulta"
        max_parcelas = 1
        if procedimento and procedimento.valor_particular:
            valor_float = float(procedimento.valor_particular)
            valor_str = f"{valor_float:.2f}".replace('.', ',')
            max_parcelas = max(1, min(4, int(valor_float // 100))) if valor_float > 0 else 1

        from agendamentos.services import buscar_proximo_horario_procedimento
        proc_id = procedimento.id if procedimento else 1
        dias_disponiveis = buscar_proximo_horario_procedimento(proc_id, limite_dias_retorno=3)

        if not dias_disponiveis:
            return {"response_message": "Nossas agendas lotaram para este exame. Vou transferir para tentar um encaixe para você! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        self.memoria_atual['dias_disponiveis'] = dias_disponiveis
        self.memoria_atual['dia_focado_index'] = 0 
        self.memoria_atual['exame_indicado'] = procedimento.descricao if procedimento else exame
        self.memoria_atual['valor_str'] = valor_str
        self.memoria_atual['max_parcelas'] = max_parcelas
        
        dia_alvo = dias_disponiveis[0]
        horarios_lista = dia_alvo['horarios_disponiveis']
        data_obj = datetime.strptime(dia_alvo['data'], '%Y-%m-%d')
        dias_pt = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']
        dia_semana_str = dias_pt[data_obj.weekday()]
        data_curta = data_obj.strftime('%d/%m')
        
        opcoes = []
        if len(horarios_lista) >= 2:
            opcoes.append({"opcao": "1", "dia_semana": dia_semana_str, "data_iso": dia_alvo['data'], "data_formatada": data_curta, "hora": horarios_lista[0]})
            opcoes.append({"opcao": "2", "dia_semana": dia_semana_str, "data_iso": dia_alvo['data'], "data_formatada": data_curta, "hora": horarios_lista[1]}) 
        else:
            opcoes.append({"opcao": "1", "dia_semana": dia_semana_str, "data_iso": dia_alvo['data'], "data_formatada": data_curta, "hora": horarios_lista[0]})
        
        self.memoria_atual['opcoes_horario'] = opcoes

        # Montagem fiel ao design do cliente
        if "Nesse caso" in prefixo or "Ainda está em tempo" in prefixo:
            msg = prefixo
        else:
            parcela_valor = f"{(float(valor_str.replace(',', '.')) / max_parcelas):.2f}".replace('.', ',')
            texto_pagamento = f", podendo ser parcelado em até {max_parcelas}x de {parcela_valor}" if max_parcelas > 1 else ""
            msg = f"{prefixo}{texto_exame}\n\nO valor é de R$ {valor_str}{texto_pagamento}.\n\n"
            
        if len(opcoes) == 1:
            msg += f"Para essa semana ainda tenho disponibilidade na {dia_semana_str} ({data_curta}) às {opcoes[0]['hora']}.\n\nPosso deixar esse horário reservado para você?"
        else:
            msg += f"Para essa semana ainda tenho disponibilidade na {dia_semana_str} ({data_curta}) às {opcoes[0]['hora']} ou {opcoes[1]['hora']}.\n\nQual desses horários você prefere? Posso deixar reservado para você."

        return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}

    def _processar_escolha_horario(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        dias_disponiveis = self.memoria_atual.get('dias_disponiveis', [])
        idx_focado = self.memoria_atual.get('dia_focado_index', 0)
        opcoes = self.memoria_atual.get('opcoes_horario', [])
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        from datetime import datetime
        
        # =====================================================================
        # 1. INTERCEPTADOR: FORMAS DE PAGAMENTO E PIX (RESGATADO)
        # =====================================================================
        if any(palavra in msg_lower for palavra in ['pix', 'dinheiro', 'débito', 'debito', 'cartão', 'cartao', 'pagamento', 'aceita', 'aceitam', 'forma de pagamento']):
            max_parcelas = self.memoria_atual.get('max_parcelas', 1)
            msg = (f"Aceitamos pagamentos em Dinheiro, Cartão de Débito, Cartão de Crédito (em até {max_parcelas}x sem juros) e PIX. 😊\n"
                   f"🎁 Inclusive, para pagamentos via PIX antecipado, nós oferecemos **5% de desconto** no valor do exame!\n\n")
            
            if self.memoria_atual.get('esperando_escolha_data'):
                msg += "Qual daquelas datas que te passei ficaria melhor para você?"
            else:
                if len(opcoes) >= 2:
                    msg += f"Para garantirmos a sua vaga, você prefere às {opcoes[0]['hora']} ou {opcoes[1]['hora']}?"
                elif len(opcoes) == 1:
                     msg += f"Posso reservar a vaga das {opcoes[0]['hora']} para você?"
                     
            return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}

        # =====================================================================
        # 2. OBJEÇÕES: PENSAR, MARIDO, CARO (RESGATADO)
        # =====================================================================
        if not self.memoria_atual.get('esperando_escolha_data'):
            # Texto auxiliar para manter a escassez
            texto_repescagem = ""
            if len(opcoes) >= 2:
                texto_repescagem = f"Qual deles você prefere que eu deixe pré-reservado: {opcoes[0]['hora']} ou {opcoes[1]['hora']}?"
            elif len(opcoes) == 1:
                texto_repescagem = f"Posso deixar o horário das {opcoes[0]['hora']} pré-reservado para você?"

            if any(palavra in msg_lower for palavra in ['caro', 'condição', 'condicao', 'desconto']):
                msg = f"Entendo 😊\n\nEsse exame é essencial para a avaliação detalhada do bebê durante a gestação.\n\nComo nossas vagas preenchem rápido, posso deixar um dos horários pré-reservado para você enquanto decide, assim você não corre o risco de perder a vaga.\n\n{texto_repescagem}"
                return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}
                
            elif any(palavra in msg_lower for palavra in ['marido', 'espos', 'parceir', 'junto', 'falar com', 'mulher', 'ver com']):
                msg = f"Claro 😊\n\nO acompanhamento da gestação é um momento importante, então é normal querer decidir juntos com calma.\n\nSe preferir, posso deixar um dos horários provisoriamente reservado para você enquanto conversam, assim você não corre o risco de perder a vaga.\n\n{texto_repescagem}"
                return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}
                
            elif any(palavra in msg_lower for palavra in ['pensar', 'ver', 'depois', 'vou decidir', 'decidir', 'retornar', 'te aviso', 'retorno']):
                msg = f"Claro 😊\n\nEsse exame permite avaliar de forma bastante detalhada a saúde do bebê, por isso é super importante realizar dentro dessa fase da gestação.\n\nSe desejar, posso deixar um dos horários pré-reservado para você enquanto decide.\n\n{texto_repescagem}"
                return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}

        # =====================================================================
        # 3. NAVEGAÇÃO DE AGENDA 
        # =====================================================================
        if any(p in msg_lower for p in ['nenhum', 'ruim', 'não dá', 'nao da', 'não gostei']):
            msg = f"Sem problema 😊\n\nPodemos verificar outras disponibilidades para você.\n\nVocê prefere:\n- tentar outro horário nesse mesmo dia\n- ou verificar outra data da agenda?"
            return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}

        if any(p in msg_lower for p in ['outra data', 'outro dia', 'dia diferente', 'verificar outra data', 'proxima data']):
            if len(dias_disponiveis) > 1:
                msg = "Temos sim 😊\n\nAlém dessa data, também temos agenda disponível:\n\n"
                dias_pt = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']
                for i in range(1, len(dias_disponiveis)):
                    data_obj = datetime.strptime(dias_disponiveis[i]['data'], '%Y-%m-%d')
                    msg += f"• {dias_pt[data_obj.weekday()].capitalize()} - {data_obj.strftime('%d/%m')}\n"
                msg += "\nQual dessas datas ficaria melhor para você?"
                self.memoria_atual['esperando_escolha_data'] = True
                return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}
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
                
                opcoes_novas = []
                if len(horarios_lista) >= 2:
                    opcoes_novas.append({"opcao": "1", "dia_semana": dia_semana_str.capitalize(), "data_iso": dia_alvo['data'], "data_formatada": data_obj.strftime('%d/%m'), "hora": horarios_lista[0]})
                    opcoes_novas.append({"opcao": "2", "dia_semana": dia_semana_str.capitalize(), "data_iso": dia_alvo['data'], "data_formatada": data_obj.strftime('%d/%m'), "hora": horarios_lista[1]})
                else:
                    opcoes_novas.append({"opcao": "1", "dia_semana": dia_semana_str.capitalize(), "data_iso": dia_alvo['data'], "data_formatada": data_obj.strftime('%d/%m'), "hora": horarios_lista[0]})
                
                self.memoria_atual['opcoes_horario'] = opcoes_novas
                
                msg = f"Perfeito.\n\nPara {dia_semana_str}, {data_obj.strftime('%d/%m')}, ainda temos vagas às:\n"
                for op in opcoes_novas:
                    msg += f"{op['opcao']}️⃣ {op['hora']}\n"
                msg += "\nQual desses horários ficaria melhor para você? Posso deixar reservado."
                return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}

        if any(p in msg_lower for p in ['mais tarde', 'final da agenda', 'outro horário', 'outro horario', 'outros horários', 'outros horarios', 'último', 'ultimo', 'tem outro']):
            dia_alvo = dias_disponiveis[idx_focado]
            horarios_lista = dia_alvo['horarios_disponiveis']
            
            if len(horarios_lista) > 2:
                ultimo_horario = horarios_lista[-1]
                data_obj_aux = datetime.strptime(dia_alvo['data'], '%Y-%m-%d')
                dia_semana_aux = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'][data_obj_aux.weekday()]
                
                self.memoria_atual['opcoes_horario'] = [{"opcao": "1", "dia_semana": dia_semana_aux, "data_iso": dia_alvo['data'], "data_formatada": data_obj_aux.strftime('%d/%m'), "hora": ultimo_horario}]
                
                msg = f"Temos sim 😊\n\nAlém desses, também temos um horário mais para o final da agenda às {ultimo_horario}.\n\nPosso deixar esse horário reservado para você?"
                return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}
            else:
                 msg = f"Esses são os únicos horários disponíveis para essa data. Gostaria de verificar para outro dia?"
                 return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}

        if any(p in msg_lower for p in ['mais cedo', 'início', 'inicio da agenda', 'cedo', 'primeiro horário', 'primeiro horario', 'algum antes']):
            dia_alvo = dias_disponiveis[idx_focado]
            primeiro_horario = dia_alvo['horarios_disponiveis'][0] 
            data_obj_aux = datetime.strptime(dia_alvo['data'], '%Y-%m-%d')
            dia_semana_aux = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'][data_obj_aux.weekday()]
            
            self.memoria_atual['opcoes_horario'] = [{"opcao": "1", "dia_semana": dia_semana_aux, "data_iso": dia_alvo['data'], "data_formatada": data_obj_aux.strftime('%d/%m'), "hora": primeiro_horario}]
            
            msg = f"Temos sim 😊\n\nNeste dia ainda temos um horário disponível logo no início da agenda às {primeiro_horario}.\n\nEsse horário ficaria melhor para você?"
            return {"response_message": msg, "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}

        # =====================================================================
        # 4. VALIDAÇÃO DE ESCOLHA PADRÃO 
        # =====================================================================
        escolha = None
        
        match_hora = re.search(r'(\d{2}:\d{2})', msg_lower)
        if match_hora:
            hora_digitada = match_hora.group(1)
            dia_alvo = dias_disponiveis[idx_focado]
            if hora_digitada in dia_alvo['horarios_disponiveis']:
                data_obj_aux = datetime.strptime(dia_alvo['data'], '%Y-%m-%d')
                dia_semana_aux = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'][data_obj_aux.weekday()]
                escolha = {"opcao": "1", "dia_semana": dia_semana_aux, "data_iso": dia_alvo['data'], "data_formatada": data_obj_aux.strftime('%d/%m/%Y'), "hora": hora_digitada}

        if not escolha and len(opcoes) > 0:
            if len(opcoes) > 1 and (opcoes[1]['hora'] in msg_lower or 'segundo' in msg_lower or '2' in msg_lower):
                escolha = opcoes[1]
            elif opcoes[0]['hora'] in msg_lower or 'primeiro' in msg_lower or '1' in msg_lower:
                escolha = opcoes[0]
            elif len(opcoes) == 1 and any(p in msg_lower for p in ['sim', 'pode', 'ok', 'quero', 'marcar']):
                escolha = opcoes[0]

        if not escolha:
            return {"response_message": "Por favor, me confirme qual horário prefere, ou digite 'cancelar'.", "new_state": 'mf_aguardando_horario', "memory_data": self.memoria_atual}
            
        self.memoria_atual['horario_escolhido'] = escolha
        msg = f"Perfeito.\n\nVou deixar o horário das {escolha['hora']} reservado para você!\n\nPara confirmar, poderia me informar seu nome completo e data de nascimento? (Ex: Maria Silva, 12/05/1994)"
        return {"response_message": msg, "new_state": 'mf_aguardando_dados_pessoais', "memory_data": self.memoria_atual}

    def _processar_dados_pessoais(self, user_message: str) -> dict:
        # Lógica original de captura de nome e data de nascimento preservada
        match_data = re.search(r'(\d{2}[/-]\d{2}[/-]\d{2,4})', user_message)
        if not match_data:
            return {"response_message": "Não consegui identificar a data de nascimento. Pode digitar seu nome completo e a data (ex: 12/05/1994)?", "new_state": 'mf_aguardando_dados_pessoais', "memory_data": self.memoria_atual}
            
        data_nasc_str = match_data.group(1).replace('-', '/')
        self.memoria_atual['data_nascimento_paciente'] = data_nasc_str
        
        nome = user_message.replace(match_data.group(1), '').strip()
        nome = re.sub(r'[^\w\s]', '', nome).strip()
        self.memoria_atual['nome_completo_paciente'] = nome.title()
        
        msg = "E por último, qual é o seu melhor e-mail para enviarmos o preparo?"
        return {"response_message": msg, "new_state": 'mf_aguardando_email', "memory_data": self.memoria_atual}

    def _processar_email_e_finalizar(self, user_message: str) -> dict:
        if '@' not in user_message:
            return {"response_message": "Esse e-mail não parece válido. Por favor, digite novamente:", "new_state": 'mf_aguardando_email', "memory_data": self.memoria_atual}
        
        self.memoria_atual['email_usuario'] = user_message.lower().strip()
                
        # --- CÓDIGO ORIGINAL DE SALVAMENTO NO BANCO MANTIDO INTACTO ---
        telefone = ''.join(filter(str.isdigit, self.session_id))
        data_nasc_str = self.memoria_atual.get('data_nascimento_paciente', '')
        
        try:
            dia, mes, ano = data_nasc_str.split('/')
            if len(ano) == 2: ano = "19" + ano if int(ano) > 25 else "20" + ano
            data_nascimento_db = f"{ano}-{mes}-{dia}"
        except Exception:
            data_nascimento_db = '1900-01-01'
        
        email_digitado = self.memoria_atual['email_usuario']
        nome_completo = self.memoria_atual.get('nome_completo_paciente', 'Paciente')
        
        paciente = Paciente.objects.filter(telefone_celular=telefone).first()
        if not paciente:
            paciente_por_email = Paciente.objects.filter(email=email_digitado).first()
            if paciente_por_email:
                paciente = paciente_por_email
                paciente.telefone_celular = telefone 
            else:
                paciente = Paciente(telefone_celular=telefone)

        paciente.nome_completo = nome_completo
        if data_nascimento_db != '1900-01-01': 
            paciente.data_nascimento = data_nascimento_db
            
        if paciente.email != email_digitado:
            if not Paciente.objects.filter(email=email_digitado).exclude(id=paciente.id).exists():
                paciente.email = email_digitado
                
        paciente.save()
            
        exame_nome = self.memoria_atual.get('exame_indicado')
        procedimento = Procedimento.objects.filter(descricao=exame_nome, ativo=True).first()
        medico = CustomUser.objects.filter(cargo='medico', is_active=True).first()
        horario = self.memoria_atual['horario_escolhido']
        
        try:
            from agendamentos.models import Sala
            sala_exame = Sala.objects.filter(e_sala_exame=True).first()
            data_hora = make_aware(datetime.strptime(f"{horario['data_iso']} {horario['hora']}", "%Y-%m-%d %H:%M"))
            
            agendamento = Agendamento.objects.create(
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
            
            nome_curto = nome_completo.split()[0].title()
            msg_final = f"Perfeito, {nome_curto} 😊\n\n"
            msg_final += f"Seu *{exame_nome.lower()}* ficou reservado para *{horario['dia_semana']} ({horario['data_formatada']}) às {horario['hora']}*.\n\n"
            msg_final += f"📍 *Endereço da clínica*\n"
            msg_final += f"Rua Orense, 41 - Sala 512\nCentro - Diadema\n\n"
            msg_final += f"Será um prazer cuidar de você nesse momento tão especial da gestação 🤍"
        
        except Exception as e:
            logger.error(f"Erro ao salvar agendamento MF: {e}")
            from chatbot.bot_logic import notificar_recepcao_whatsapp
            notificar_recepcao_whatsapp(self.session_id, "Paciente")
            msg_final = "Ocorreu uma instabilidade na agenda. Uma atendente confirmará o seu horário em instantes! 🤍"

        return {"response_message": msg_final, "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}