# chatbot/response_generator.py
import random
from typing import Dict, List
from django.utils.html import escape

class ResponseGenerator:
    """Gerador de respostas mais naturais e variadas"""

    # Templates de respostas variadas
    SAUDACOES_INICIAIS = [
        "Olá! Seja bem-vindo à Clínica Limalé. 👋",
        "Oi! É um prazer recebê-lo na Clínica Limalé! 😊",
        "Bem-vindo! Estou aqui para ajudá-lo. 🏥",
    ]

    PEDIDOS_NOME = [
        "Para começarmos, pode me dizer seu nome?",
        "Como posso chamá-lo?",
        "Qual é o seu nome?",
        "Me diga seu nome para personalizarmos o atendimento.",
    ]

    CONFIRMACOES_POSITIVAS = [
        "Perfeito! ✅",
        "Ótimo! 👍",
        "Excelente! 🎉",
        "Muito bem! ⭐",
        "Certo! 👌",
    ]

    PEDIDOS_ESCLARECIMENTO = [
        "Não entendi bem. Pode explicar melhor?",
        "Pode repetir de outra forma?",
        "Não consegui compreender. Pode ser mais específico?",
        "Desculpe, não entendi. Pode reformular?",
    ]

    DESPEDIDAS = [
        "Foi um prazer ajudá-lo! Até breve! 👋",
        "Obrigado pelo contato! Volte sempre! 😊",
        "Estamos sempre aqui quando precisar! 🏥",
        "Tenha um ótimo dia! Até a próxima! ✨",
    ]

    @classmethod
    def gerar_saudacao_inicial(cls, nome_usuario=None):
        """Gera saudação inicial personalizada"""
        try:
            saudacao = random.choice(cls.SAUDACOES_INICIAIS)

            if nome_usuario:
                nome_seguro = escape(str(nome_usuario)[:50])
                saudacao = f"Olá, {nome_seguro}! {saudacao.split('!', 1)[1] if '!' in saudacao else saudacao}"

            apresentacao = "Eu sou o Leônidas, assistente virtual da clínica."
            pedido_nome = random.choice(cls.PEDIDOS_NOME)

            return f"{saudacao}\n{apresentacao}\n\n{pedido_nome}"
        except Exception:
            return "Olá! Sou o Leônidas, assistente virtual da clínica. Qual o seu nome?"

    @classmethod
    def gerar_confirmacao_dados(cls, nome, tipo_agendamento, detalhes):
        """Gera confirmação de dados mais natural"""
        try:
            confirmacao = random.choice(cls.CONFIRMACOES_POSITIVAS)
            nome_seguro = escape(str(nome)[:50])

            if tipo_agendamento == 'Consulta':
                especialidade = escape(str(detalhes.get('especialidade', ''))[:100]) if detalhes.get('especialidade') else ''
                data = escape(str(detalhes.get('data', ''))[:20]) if detalhes.get('data') else ''
                hora = escape(str(detalhes.get('hora', ''))[:10]) if detalhes.get('hora') else ''
                return (
                    f"{confirmacao} {nome_seguro}!\n\n"
                    f"Vou agendar sua consulta de *{especialidade}* "
                    f"para o dia *{data}* às *{hora}*.\n\n"
                    "Os dados estão corretos?"
                )
            else:
                procedimento = escape(str(detalhes.get('procedimento', ''))[:100]) if detalhes.get('procedimento') else ''
                data = escape(str(detalhes.get('data', ''))[:20]) if detalhes.get('data') else ''
                hora = escape(str(detalhes.get('hora', ''))[:10]) if detalhes.get('hora') else ''
                return (
                    f"{confirmacao} {nome_seguro}!\n\n"
                    f"Vou agendar seu *{procedimento}* "
                    f"para o dia *{data}* às *{hora}*.\n\n"
                    "Confirma os dados?"
                )
        except Exception:
            return "Confirma os dados do agendamento?"

    @classmethod
    def gerar_erro_validacao(cls, campo, erro_especifico=None):
        """Gera mensagens de erro mais amigáveis"""
        mensagens_base = {
            'cpf': [
                "O CPF não parece estar correto. 🤔",
                "Verifique o CPF, por favor.",
                "O CPF informado não é válido.",
            ],
            'telefone': [
                "O telefone não está no formato correto. 📱",
                "Verifique o número de telefone.",
                "O telefone informado parece incorreto.",
            ],
            'email': [
                "O email não parece válido. 📧",
                "Verifique o endereço de email.",
                "O email informado não está correto.",
            ],
            'data': [
                "A data não está no formato correto. 📅",
                "Verifique a data informada.",
                "A data não parece válida.",
            ]
        }

        mensagem_base = random.choice(mensagens_base.get(campo, ["Dados incorretos."]))

        if erro_especifico:
            return f"{mensagem_base}\n{erro_especifico}"

        return mensagem_base

    @classmethod
    def gerar_lista_opcoes(cls, titulo, opcoes, emoji="•"):
        """Gera lista de opções formatada"""
        if not opcoes:
            return f"{titulo}\n\nNenhuma opção disponível no momento."

        lista = "\n".join([f"{emoji} {opcao}" for opcao in opcoes])
        return f"{titulo}\n\n{lista}"

    @classmethod
    def gerar_horarios_disponiveis(cls, medico_nome, data, horarios):
        """Gera mensagem de horários disponíveis"""
        try:
            medico_nome_seguro = escape(str(medico_nome)[:50]) if medico_nome else 'médico'
            data_segura = escape(str(data)[:20]) if data else 'data selecionada'

            if not horarios:
                return f"Infelizmente não há horários disponíveis com Dr(a). {medico_nome_seguro} para esta data. 😔"

            horarios_seguros = [escape(str(h)[:10]) for h in horarios[:5] if h]
            horarios_formatados = [f"• *{h}*" for h in horarios_seguros]
            horarios_str = "\n".join(horarios_formatados)

            return (
                f"Encontrei estes horários com Dr(a). *{medico_nome_seguro}* no dia *{data_segura}*: 📅\n\n"
                f"{horarios_str}\n\n"
                "Qual horário prefere? Se nenhum servir, posso verificar outras datas. 🕐"
            )
        except Exception:
            return "Erro ao gerar horários. Tente novamente."

    @classmethod
    def gerar_pedido_dados_paciente(cls, nome, para_crianca=False):
        """Gera pedido de dados do paciente"""
        if para_crianca:
            return (
                f"Certo, {nome}! Para o agendamento da criança, preciso de alguns dados: 👶\n\n"
                "*Dados da criança:*
"
                "• Nome completo
"
                "• Data de nascimento (DD/MM/AAAA)\n\n"
                "*Dados do responsável:*
"
                "• Seu nome completo
"
                "• Seu CPF (XXX.XXX.XXX-XX)\n"
                "• Grau de parentesco
"
                "• Telefone (+55 11 99999-9999)\n"
                "• Email\n\n"
                "Pode me enviar essas informações?"
            )
        else:
            return (
                f"Perfeito, {nome}! Para finalizar, preciso de alguns dados: 📋\n\n"
                "*Dados pessoais:*
"
                "• Nome completo
"
                "• Data de nascimento (DD/MM/AAAA)
"
                "• CPF (XXX.XXX.XXX-XX)\n\n"
                "*Contato:*
"
                "• Telefone (+55 11 99999-9999)\n"
                "• Email\n\n"
                "Pode me enviar essas informações?"
            )

    @classmethod
    def gerar_opcoes_pagamento(cls, nome):
        """Gera opções de pagamento"""
        return (
            f"Ótimo, {nome}! Como prefere realizar o pagamento? 💳\n\n"
            "1️⃣ *PIX* (5% de desconto) 🎉\n"
            "2️⃣ *Cartão de Crédito* (no local)\n\n"
            "Digite 1 ou 2, ou escreva PIX/Cartão."
        )

    @classmethod
    def gerar_agendamento_confirmado(cls, nome, detalhes, pagamento_info):
        """Gera confirmação final do agendamento"""
        try:
            nome_seguro = escape(str(nome)[:50]) if nome else 'paciente'
            data_segura = escape(str(detalhes.get('data', ''))[:20]) if detalhes.get('data') else ''
            hora_segura = escape(str(detalhes.get('hora', ''))[:10]) if detalhes.get('hora') else ''
            medico_seguro = escape(str(detalhes.get('medico', 'A definir'))[:50])
            tipo_seguro = escape(str(detalhes.get('tipo', ''))[:30]) if detalhes.get('tipo') else ''

            base = (
                f"🎉 *Agendamento Confirmado!*\n\n"
                f"Olá, {nome_seguro}! Seu horário foi reservado com sucesso:\n\n"
                f"📅 *Data:* {data_segura}\n"
                f"🕐 *Horário:* {hora_segura}\n"
                f"👨‍⚕️ *Profissional:* {medico_seguro}\n"
                f"🏥 *Tipo:* {tipo_seguro}\n\n"
            )
        except Exception:
            base = "🎉 *Agendamento Confirmado!*\n\nSeu horário foi reservado com sucesso!\n\n"

        if pagamento_info.get('tipo') == 'PIX':
            base += (
                f"💰 *Valor com desconto:* R$ {pagamento_info['valor']}\n\n"
                f"*Chave PIX:*
`{pagamento_info['chave']}`\n\n"
                "Após o pagamento, seu horário será confirmado automaticamente! ✅"
            )
        elif pagamento_info.get('tipo') == 'CartaoCredito':
            base += "💳 Pagamento será realizado no local da consulta."

        base += "\n\n📞 Dúvidas? Entre em contato conosco!\n\nObrigado por escolher a Clínica Limalé! 🏥"

        return base
