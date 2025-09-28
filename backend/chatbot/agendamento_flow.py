# chatbot/agendamento_flow.py

# --- SEÇÃO DE IMPORTAÇÕES ---
import os
import re
from datetime import datetime, timedelta
import json
from django.utils import timezone

# --- SEÇÃO DE IMPORTAÇÕES DOS SEUS APPS DJANGO ---
from usuarios.models import Especialidade, CustomUser
from faturamento.models import Procedimento
from agendamentos.services import (
    buscar_proximo_horario_disponivel, 
    buscar_proximo_horario_procedimento,
    criar_agendamento_e_pagamento_pendente,
    listar_agendamentos_futuros,
    cancelar_agendamento_service
)
from pacientes.models import Paciente
from agendamentos.serializers import AgendamentoWriteSerializer
from agendamentos.services import criar_agendamento_e_pagamento_pendente


class AgendamentoManager:
    def __init__(self, session_id, memoria, base_url, chain_sintomas=None, chain_extracao_dados=None):
        self.session_id = session_id
        self.memoria = memoria
        self.base_url = base_url.rstrip('/')
        self.chain_sintomas = chain_sintomas
        self.chain_extracao_dados = chain_extracao_dados

    # --- MÉTODOS AUXILIARES ---
    def _get_especialidades_from_db(self):
        return list(Especialidade.objects.all().values('id', 'nome'))
            
    def _get_medicos_from_db(self, especialidade_id):
        return list(CustomUser.objects.filter(cargo='medico', especialidades__id=especialidade_id).values('id', 'first_name', 'last_name'))
    
    def _get_procedimentos_from_db(self):
        return list(Procedimento.objects.filter(ativo=True, valor_particular__gt=0).values('id', 'descricao', 'descricao_detalhada'))

    def _iniciar_busca_de_horarios(self, especialidade_id, especialidade_nome):
        medicos = self._get_medicos_from_db(especialidade_id=especialidade_id)
        if not medicos:
            return {"response_message": f"Não encontrei médicos para {especialidade_nome}.", "new_state": "inicio", "memory_data": self.memoria}
        medico = medicos[0]
        self.memoria.update({'medico_id': medico['id'], 'medico_nome': f"{medico['first_name']} {medico['last_name']}"})
        horarios = buscar_proximo_horario_disponivel(medico_id=medico['id'])
        if not horarios or not horarios.get('horarios_disponiveis'):
            return {"response_message": f"Infelizmente, não há horários para Dr(a). {self.memoria['medico_nome']}.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        self.memoria['horarios_ofertados'] = horarios
        data_formatada = datetime.strptime(horarios['data'], '%Y-%m-%d').strftime('%d/%m/%Y')
        horarios_str = ", ".join(horarios['horarios_disponiveis'])
        mensagem = f"Ótimo! Para Dr(a). *{self.memoria['medico_nome']}*, encontrei os horários no dia *{data_formatada}*:\n\n*{horarios_str}*\n\nQual horário você prefere?"
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

    # --- ROTEADOR PRINCIPAL ---
    def processar(self, resposta_usuario, estado_atual):
        handlers = {
            # Fluxo de Cancelamento
            'cancelamento_inicio': self.handle_cancelamento_inicio,
            'cancelamento_awaiting_cpf': self.handle_cancelamento_awaiting_cpf,
            'cancelamento_awaiting_choice': self.handle_cancelamento_awaiting_choice,
            'cancelamento_awaiting_confirmation': self.handle_cancelamento_awaiting_confirmation,
            # Fluxo de Agendamento e Cadastro
            'agendamento_inicio': self.handle_inicio,
            'agendamento_awaiting_type': self.handle_awaiting_type,
            'agendamento_awaiting_procedure': self.handle_awaiting_procedure,
            'agendamento_awaiting_modality': self.handle_awaiting_modality,
            'agendamento_awaiting_specialty': self.handle_awaiting_specialty,
            'agendamento_awaiting_patient_type': self.handle_awaiting_patient_type,
            'agendamento_awaiting_slot_choice': self.handle_awaiting_slot_choice,
            'agendamento_awaiting_cpf': self.handle_awaiting_cpf,
            'agendamento_awaiting_payment_choice': self.handle_awaiting_payment_choice,
            'agendamento_awaiting_new_patient_nome': self.handle_awaiting_new_patient_nome,
            'agendamento_awaiting_new_patient_nascimento': self.handle_awaiting_new_patient_nascimento,
            'agendamento_awaiting_new_patient_phone': self.handle_awaiting_new_patient_phone,
            'agendamento_awaiting_new_patient_email': self.handle_awaiting_new_patient_email,
            'agendamento_awaiting_new_child_data': self.handle_awaiting_new_child_data,
            'agendamento_awaiting_confirmation': self.handle_awaiting_confirmation,
            'agendamento_inicio': self.handle_inicio,
        }
        handler = handlers.get(estado_atual, self.handle_fallback)
        return handler(resposta_usuario)

    # --- HANDLERS DO FLUXO DE CONVERSA ---
    def handle_fallback(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        return { "response_message": "Desculpe, me perdi. Vamos recomeçar.", "new_state": "inicio", "memory_data": {'nome_usuario': nome_usuario} }
        
    def handle_inicio(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', 'tudo bem')
        self.memoria.clear(); self.memoria['nome_usuario'] = nome_usuario
        return { "response_message": f"Vamos lá, {nome_usuario}! Você gostaria de agendar uma *Consulta* ou um *Procedimento* (exames)?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria }

    def handle_awaiting_type(self, resposta_usuario):
        escolha = resposta_usuario.lower()
        if 'consulta' in escolha:
            self.memoria['tipo_agendamento'] = 'Consulta'
            return { "response_message": "Entendido. O atendimento será *Presencial* ou por *Telemedicina*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria }
        elif 'procedimento' in escolha or 'exame' in escolha:
            self.memoria['tipo_agendamento'] = 'Procedimento'
            procedimentos = self._get_procedimentos_from_db()
            if not procedimentos: return {"response_message": "Desculpe, não encontrei procedimentos disponíveis para agendamento online.", "new_state": "inicio", "memory_data": self.memoria}
            self.memoria['lista_procedimentos'] = procedimentos
            nomes_procedimentos = '\n'.join([f"• {proc['descricao']}" for proc in procedimentos])
            return { "response_message": f"Certo, temos os seguintes procedimentos:\n\n{nomes_procedimentos}\n\nQual deles você deseja agendar?", "new_state": "agendamento_awaiting_procedure", "memory_data": self.memoria }
        else:
            return { "response_message": "Não entendi. Por favor, diga 'Consulta' ou 'Procedimento'.", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria }

    def handle_awaiting_procedure(self, resposta_usuario):
        procedimento_escolhido = next((proc for proc in self.memoria.get('lista_procedimentos', []) if resposta_usuario.lower() in proc['descricao'].lower()), None)
        if not procedimento_escolhido: return {"response_message": "Não encontrei esse procedimento na lista.", "new_state": "agendamento_awaiting_procedure", "memory_data": self.memoria}
        self.memoria.update({'procedimento_id': procedimento_escolhido['id'], 'procedimento_nome': procedimento_escolhido['descricao']})
        descricao_valorizacao = ""
        if procedimento_escolhido.get('descricao_detalhada'):
            descricao_valorizacao = f"Perfeito! Vou te explicar sobre esse exame.\n\n{procedimento_escolhido['descricao_detalhada']}\n\nEste exame é realizado com equipamentos de última geração, garantindo resultados precisos."
        horarios = buscar_proximo_horario_procedimento(procedimento_id=procedimento_escolhido['id'])
        if not horarios or not horarios.get('horarios_disponiveis'): return {"response_message": f"Infelizmente, não há horários disponíveis para '{procedimento_escolhido['descricao']}'.", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}
        self.memoria['horarios_ofertados'] = horarios
        data_formatada = datetime.strptime(horarios['data'], '%Y-%m-%d').strftime('%d/%m/%Y')
        horarios_str = ", ".join(horarios['horarios_disponiveis'])
        mensagem_horarios = f"Encontrei os seguintes horários disponíveis no dia *{data_formatada}*:\n\n*{horarios_str}*\n\nQual horário você prefere?"
        resposta_final = f"{descricao_valorizacao}\n\n{mensagem_horarios}".strip()
        return {"response_message": resposta_final, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

    def handle_awaiting_modality(self, resposta_usuario):
        modalidade = "".join(resposta_usuario.strip().split()).capitalize()
        if modalidade not in ['Presencial', 'Telemedicina']: return {"response_message": "Modalidade inválida. Responda com *Presencial* ou *Telemedicina*.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        self.memoria['modalidade'] = modalidade
        especialidades = self._get_especialidades_from_db()
        self.memoria['lista_especialidades'] = especialidades
        nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in especialidades])
        return {"response_message": f"Perfeito. Temos estas especialidades:\n\n{nomes_especialidades}\n\nQual delas você deseja?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

    def handle_awaiting_specialty(self, resposta_usuario):
        especialidade_escolhida = next((esp for esp in self.memoria.get('lista_especialidades', []) if resposta_usuario.lower() in esp['nome'].lower() or esp['nome'].lower() in resposta_usuario.lower()), None)
        if not especialidade_escolhida:
            return {"response_message": "Não encontrei essa especialidade na lista.", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}
        
        self.memoria.update({'especialidade_id': especialidade_escolhida['id'], 'especialidade_nome': especialidade_escolhida['nome']})
        self.memoria['tipo_agendamento'] = 'Consulta'
        
        if 'pediatria' in especialidade_escolhida['nome'].lower():
            return {"response_message": "Entendido. A consulta é para você ou para uma criança?", "new_state": "agendamento_awaiting_patient_type", "memory_data": self.memoria}
        else:
            self.memoria['agendamento_para_crianca'] = False
            return self._iniciar_busca_de_horarios(especialidade_escolhida['id'], especialidade_escolhida['nome'])

    def handle_awaiting_patient_type(self, resposta_usuario):
        resposta = resposta_usuario.lower()
        especialidade_id = self.memoria.get('especialidade_id')
        especialidade_nome = self.memoria.get('especialidade_nome')
        if 'criança' in resposta or 'filho' in resposta or 'filha' in resposta:
            self.memoria['agendamento_para_crianca'] = True
        else:
            self.memoria['agendamento_para_crianca'] = False
        return self._iniciar_busca_de_horarios(especialidade_id, especialidade_nome)

    def handle_awaiting_slot_choice(self, resposta_usuario):
        try:
            horario_escolhido_str = datetime.strptime(resposta_usuario.strip(), '%H:%M').strftime('%H:%M')
        except ValueError:
            horario_escolhido_str = resposta_usuario.strip()
        horarios_ofertados = self.memoria.get('horarios_ofertados', {})
        lista_horarios_validos = horarios_ofertados.get('horarios_disponiveis', [])
        if horario_escolhido_str not in lista_horarios_validos:
            return {"response_message": f"Hum, não encontrei o horário '{resposta_usuario.strip()}' na lista.", "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
        self.memoria['data_hora_inicio'] = f"{horarios_ofertados['data']}T{horario_escolhido_str}"
        tipo_agendamento = self.memoria.get('tipo_agendamento')
        if tipo_agendamento == 'Consulta':
            nome_medico = self.memoria.get('medico_nome', 'nosso especialista')
            mensagem_valorizacao = f"Perfeito! Sua consulta será com Dr(a). *{nome_medico}*, que é referência na área."
        else:
            nome_procedimento = self.memoria.get('procedimento_nome', 'seu exame')
            mensagem_valorizacao = f"Perfeito! Seu horário para *{nome_procedimento}* está pré-agendado!"
        resposta_final = f"{mensagem_valorizacao}\n\nPara confirmar, por favor, me informe seu *CPF*."
        return {"response_message": resposta_final, "new_state": "agendamento_awaiting_cpf", "memory_data": self.memoria}
    
    def handle_awaiting_cpf(self, resposta_usuario):
        cpf = re.sub(r'\D', '', resposta_usuario)
        if len(cpf) != 11: return {"response_message": "CPF inválido.", "new_state": "agendamento_awaiting_cpf", "memory_data": self.memoria}
        self.memoria['cpf'] = cpf
        paciente_responsavel_existe = Paciente.objects.filter(cpf=cpf).exists()
        if self.memoria.get('agendamento_para_crianca'):
            if not paciente_responsavel_existe:
                return {"response_message": "Notei que você (o responsável) ainda não tem cadastro. Vamos criar um para você.\n\nQual o seu nome completo?", "new_state": "agendamento_awaiting_new_patient_nome", "memory_data": self.memoria}
            else:
                paciente_responsavel = Paciente.objects.get(cpf=cpf)
                self.memoria['nome_usuario'] = paciente_responsavel.nome_completo.split(' ')[0]
                pergunta = (f"Olá, {self.memoria['nome_usuario']}! Para agendar para a criança, preciso dos seguintes dados dela:\n\n"
                            "👶 *Dados da criança:*\n• Nome completo\n• Data de nascimento (DD/MM/AAAA)\n\n"
                            "Por favor, me envie essas informações.")
                return {"response_message": pergunta, "new_state": "agendamento_awaiting_new_child_data", "memory_data": self.memoria}
        else:
            if paciente_responsavel_existe:
                paciente = Paciente.objects.get(cpf=cpf)
                self.memoria['nome_usuario'] = paciente.nome_completo.split(' ')[0]
                mensagem = (f"Olá, {self.memoria['nome_usuario']}! Como prefere pagar?\n1️⃣ - *PIX* (5% de desconto)\n2️⃣ - *Cartão de Crédito* (até 3x)")
                return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}
            else:
                return {"response_message": "Vi que você é novo por aqui! Qual seu nome completo?", "new_state": "agendamento_awaiting_new_patient_nome", "memory_data": self.memoria}

    def handle_awaiting_payment_choice(self, resposta_usuario):
        escolha = resposta_usuario.lower()
        metodo_pagamento = None
        if 'pix' in escolha or '1' in escolha: metodo_pagamento = 'PIX'
        elif 'cartão' in escolha or 'cartao' in escolha or '2' in escolha: metodo_pagamento = 'CartaoCredito'
        if not metodo_pagamento:
            return {"response_message": "Não entendi. Responda com 'PIX' ou 'Cartão'.", "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}
        self.memoria['metodo_pagamento_escolhido'] = metodo_pagamento
        return self.handle_awaiting_confirmation("confirmado")

    def handle_awaiting_new_patient_nome(self, resposta_usuario):
        self.memoria['nome_completo'] = resposta_usuario.strip().title()
        return {"response_message": "Obrigado. Agora, sua *data de nascimento* (DD/MM/AAAA).", "new_state": "agendamento_awaiting_new_patient_nascimento", "memory_data": self.memoria}
    
    def handle_awaiting_new_patient_nascimento(self, resposta_usuario):
        try:
            data_nasc_obj = datetime.strptime(resposta_usuario.strip(), '%d/%m/%Y')
            self.memoria['data_nascimento'] = data_nasc_obj.strftime('%d/%m/%Y')
            return {"response_message": "Obrigado! Qual é o seu *telefone celular* com DDD?", "new_state": "agendamento_awaiting_new_patient_phone", "memory_data": self.memoria}
        except ValueError:
            return {"response_message": "Formato de data inválido. Use DD/MM/AAAA.", "new_state": "agendamento_awaiting_new_patient_nascimento", "memory_data": self.memoria}

    def handle_awaiting_new_patient_phone(self, resposta_usuario):
        telefone = re.sub(r'\D', '', resposta_usuario)
        if len(telefone) < 10 or len(telefone) > 11:
            return {"response_message": "Número de telefone inválido. Envie com DDD.", "new_state": "agendamento_awaiting_new_patient_phone", "memory_data": self.memoria}
        self.memoria['telefone_celular'] = telefone
        return {"response_message": "Para finalizar, qual o seu melhor *e-mail*?", "new_state": "agendamento_awaiting_new_patient_email", "memory_data": self.memoria}

    def handle_awaiting_new_patient_email(self, resposta_usuario):
        email = resposta_usuario.strip().lower()
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email): return {"response_message": "E-mail inválido.", "new_state": "agendamento_awaiting_new_patient_email", "memory_data": self.memoria}
        self.memoria['email'] = email
        mensagem = (f"Cadastro quase pronto! Como você prefere pagar?\n"
                    "1️⃣ - *PIX* (5% de desconto)\n"
                    "2️⃣ - *Cartão de Crédito* (em até 3x)")
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}
    
    def handle_awaiting_new_child_data(self, resposta_usuario):
        try:
            linhas = resposta_usuario.strip().split('\n')
            nome_crianca = linhas[0].strip()
            data_nasc_crianca_str = linhas[1].strip()
            datetime.strptime(data_nasc_crianca_str, '%d/%m/%Y')
            self.memoria['nome_paciente_final'] = nome_crianca.title()
            self.memoria['data_nascimento_paciente_final'] = data_nasc_crianca_str
            mensagem = (f"Obrigado! Como prefere pagar pela consulta de {self.memoria['nome_paciente_final']}?\n"
                        "1️⃣ - *PIX* (5% de desconto)\n"
                        "2️⃣ - *Cartão de Crédito* (em até 3x)")
            return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}
        except Exception:
            return {"response_message": "Não entendi. Envie o nome completo da criança, e na linha de baixo a data de nascimento (DD/MM/AAAA).", "new_state": "agendamento_awaiting_new_child_data", "memory_data": self.memoria}

    def handle_awaiting_confirmation(self, resposta_usuario):
        try:
            if self.memoria.get('agendamento_para_crianca'):
                data_nasc_obj = datetime.strptime(self.memoria.get('data_nascimento_paciente_final'), '%d/%m/%Y').date()
                responsavel = Paciente.objects.get(cpf=self.memoria.get('cpf'))
                paciente, created = Paciente.objects.get_or_create(
                    cpf=self.memoria.get('cpf'),
                    nome_completo__iexact=self.memoria.get('nome_paciente_final'),
                    defaults={'data_nascimento': data_nasc_obj, 'email': responsavel.email, 'telefone_celular': responsavel.telefone_celular}
                )
            else:
                data_nascimento_str = self.memoria.get('data_nascimento')
                data_nascimento_obj = datetime.strptime(data_nascimento_str, '%d/%m/%Y').date() if data_nascimento_str else None
                paciente, created = Paciente.objects.get_or_create(
                    cpf=self.memoria.get('cpf'),
                    defaults={'nome_completo': self.memoria.get('nome_completo', ''), 'email': self.memoria.get('email', ''), 'telefone_celular': self.memoria.get('telefone_celular', ''), 'data_nascimento': data_nascimento_obj}
                )

            dados_agendamento = { 'paciente': paciente.id, 'data_hora_inicio': self.memoria.get('data_hora_inicio'), 'status': 'Agendado', 'tipo_agendamento': self.memoria.get('tipo_agendamento'), 'tipo_atendimento': 'Particular' }
            if self.memoria.get('tipo_agendamento') == 'Consulta':
                dados_agendamento.update({'data_hora_fim': datetime.fromisoformat(self.memoria.get('data_hora_inicio')) + timedelta(minutes=50), 'especialidade': self.memoria.get('especialidade_id'), 'medico': self.memoria.get('medico_id'), 'modalidade': self.memoria.get('modalidade')})
            elif self.memoria.get('tipo_agendamento') == 'Procedimento':
                dados_agendamento.update({'data_hora_fim': datetime.fromisoformat(self.memoria.get('data_hora_inicio')) + timedelta(minutes=60), 'procedimento': self.memoria.get('procedimento_id'), 'modalidade': 'Presencial'})

            serializer = AgendamentoWriteSerializer(data=dados_agendamento)
            if not serializer.is_valid():
                return {"response_message": f"Erro ao validar dados: {json.dumps(serializer.errors)}", "new_state": "inicio", "memory_data": self.memoria}

            agendamento = serializer.save()
            usuario_servico = CustomUser.objects.filter(is_superuser=True).first()
            metodo_pagamento_escolhido = self.memoria.get('metodo_pagamento_escolhido', 'PIX')
            criar_agendamento_e_pagamento_pendente(agendamento, usuario_servico, metodo_pagamento_escolhido=metodo_pagamento_escolhido, initiated_by_chatbot=True)
            agendamento.refresh_from_db()
            
            # --- MUDANÇA AQUI: NOVA CONSTRUÇÃO DA MENSAGEM FINAL ---
            pagamento = agendamento.pagamento
            nome_paciente = agendamento.paciente.nome_completo
            data_agendamento = timezone.localtime(agendamento.data_hora_inicio).strftime('%d/%m/%Y')
            hora_agendamento = timezone.localtime(agendamento.data_hora_inicio).strftime('%H:%M')

            # 1. Monta a mensagem de confirmação padronizada
            mensagem_confirmacao = (
                f"✅ *Confirmação de Pré-Agendamento*\n\n"
                f"Olá, {nome_paciente.split(' ')[0]}! Seu horário foi reservado com sucesso.\n"
                f"*{agendamento.get_tipo_agendamento_display()} de {self.memoria.get('especialidade_nome') or self.memoria.get('procedimento_nome')}*\n"
                f"🗓️ *Data:* {data_agendamento}\n"
                f"⏰ *Hora:* {hora_agendamento}\n\n"
            )

            # 2. Monta a seção de pagamento
            secao_pagamento = ""
            if metodo_pagamento_escolhido == 'PIX':
                if hasattr(pagamento, 'pix_copia_e_cola') and pagamento.pix_copia_e_cola:
                    valor_original = pagamento.valor
                    valor_com_desconto = valor_original * 0.95
                    secao_pagamento = (
                        f"Para confirmar definitivamente seu horário, realize o pagamento via PIX com *5% de desconto*.\n\n"
                        f"*Valor com desconto:* R$ {valor_com_desconto:.2f}\n"
                        f"*Chave PIX (Copia e Cola):*\n`{pagamento.pix_copia_e_cola}`\n\n"
                        "Após o pagamento, seu horário será confirmado automaticamente. Obrigado!"
                    )
            elif metodo_pagamento_escolhido == 'CartaoCredito':
                if hasattr(pagamento, 'link_pagamento') and pagamento.link_pagamento:
                    secao_pagamento = f"Clique no link abaixo para pagar com *Cartão de Crédito em até 3x* e confirmar seu horário:\n{pagamento.link_pagamento}"
            
            if not secao_pagamento: # Fallback
                secao_pagamento = "Seu agendamento foi pré-realizado. Por favor, entre em contato com a clínica para finalizar o pagamento."

            # 3. Junta tudo
            resposta_final = f"{mensagem_confirmacao}{secao_pagamento}"

            return {"response_message": resposta_final, "new_state": "inicio", "memory_data": {'nome_usuario': self.memoria.get('nome_usuario')}}
        except Exception as e:
            return {"response_message": f"Desculpe, ocorreu um erro inesperado ao finalizar seu agendamento: {str(e)}", "new_state": "inicio", "memory_data": self.memoria}


# ##################################################
    # ### NOVOS HANDLERS PARA O FLUXO DE CANCELAMENTO ###
    # ##################################################

    def handle_cancelamento_inicio(self, resposta_usuario):
        return {"response_message": "Entendido. Para localizar seu agendamento, por favor, me informe o seu *CPF*.", "new_state": "cancelamento_awaiting_cpf", "memory_data": self.memoria}

    def handle_cancelamento_awaiting_cpf(self, resposta_usuario):
        cpf = re.sub(r'\D', '', resposta_usuario)
        if len(cpf) != 11:
            return {"response_message": "CPF inválido. Por favor, digite os 11 números.", "new_state": "cancelamento_awaiting_cpf", "memory_data": self.memoria}
        agendamentos = listar_agendamentos_futuros(cpf)
        if not agendamentos:
            return {"response_message": "Não encontrei agendamentos futuros no seu CPF. Posso ajudar com algo mais?", "new_state": "inicio", "memory_data": self.memoria}
        self.memoria['agendamentos_para_cancelar'] = [{"id": ag.id, "texto": f"{ag.get_tipo_agendamento_display()} - {ag.especialidade.nome if ag.especialidade else ag.procedimento.descricao} em {timezone.localtime(ag.data_hora_inicio).strftime('%d/%m/%Y às %H:%M')}"} for ag in agendamentos]
        if len(agendamentos) == 1:
            ag = self.memoria['agendamentos_para_cancelar'][0]
            self.memoria['agendamento_selecionado_id'] = ag['id']
            return {"response_message": f"Encontrei este agendamento:\n• {ag['texto']}\n\nConfirma o cancelamento? (Sim/Não)", "new_state": "cancelamento_awaiting_confirmation", "memory_data": self.memoria}
        else:
            lista_texto = "\n".join([f"{i+1} - {ag['texto']}" for i, ag in enumerate(self.memoria['agendamentos_para_cancelar'])])
            return {"response_message": f"Encontrei estes agendamentos:\n{lista_texto}\n\nQual o *número* do que deseja cancelar?", "new_state": "cancelamento_awaiting_choice", "memory_data": self.memoria}

    def handle_cancelamento_awaiting_choice(self, resposta_usuario):
        try:
            escolha = int(resposta_usuario.strip()) - 1
            agendamentos_lista = self.memoria.get('agendamentos_para_cancelar', [])
            if 0 <= escolha < len(agendamentos_lista):
                ag_selecionado = agendamentos_lista[escolha]
                self.memoria['agendamento_selecionado_id'] = ag_selecionado['id']
                return {"response_message": f"Confirma o cancelamento de:\n• {ag_selecionado['texto']}\n\n(Sim/Não)", "new_state": "cancelamento_awaiting_confirmation", "memory_data": self.memoria}
            else:
                raise ValueError("Escolha fora do intervalo")
        except (ValueError, IndexError):
            return {"response_message": "Opção inválida. Por favor, digite apenas o número correspondente.", "new_state": "cancelamento_awaiting_choice", "memory_data": self.memoria}

    def handle_cancelamento_awaiting_confirmation(self, resposta_usuario):
        resposta = resposta_usuario.lower()
        if 'sim' in resposta:
            agendamento_id = self.memoria.get('agendamento_selecionado_id')
            resultado = cancelar_agendamento_service(agendamento_id)
            return {"response_message": resultado.get('mensagem', 'Ocorreu um erro.'), "new_state": "inicio", "memory_data": self.memoria}
        elif 'não' in resposta or 'nao' in resposta:
            return {"response_message": "Ok, o agendamento foi mantido. Posso ajudar com algo mais?", "new_state": "inicio", "memory_data": self.memoria}
        else:
            return {"response_message": "Não entendi. Responda com 'Sim' ou 'Não'.", "new_state": "cancelamento_awaiting_confirmation", "memory_data": self.memoria}
    