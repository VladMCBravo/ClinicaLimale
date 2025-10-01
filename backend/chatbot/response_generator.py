# chatbot/response_generator.py
import random
from typing import Dict, List

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
        saudacao = random.choice(cls.SAUDACOES_INICIAIS)
        
        if nome_usuario:
            saudacao = f"Olá, {nome_usuario}! {saudacao.split('!', 1)[1] if '!' in saudacao else saudacao}"
        
        apresentacao = "Eu sou o Leônidas, assistente virtual da clínica."
        pedido_nome = random.choice(cls.PEDIDOS_NOME)
        
        return f"{saudacao}\n{apresentacao}\n\n{pedido_nome}"
    
    @classmethod
    def gerar_confirmacao_dados(cls, nome, tipo_agendamento, detalhes):
        """Gera confirmação de dados mais natural"""
        confirmacao = random.choice(cls.CONFIRMACOES_POSITIVAS)
        
        if tipo_agendamento == 'Consulta':
            return (
                f"{confirmacao} {nome}!\n\n"
                f"Vou agendar sua consulta de *{detalhes['especialidade']}* "
                f"para o dia *{detalhes['data']}* às *{detalhes['hora']}*.\n\n"
                "Os dados estão corretos?"
            )
        else:
            return (
                f"{confirmacao} {nome}!\n\n"
                f"Vou agendar seu *{detalhes['procedimento']}* "
                f"para o dia *{detalhes['data']}* às *{detalhes['hora']}*.\n\n"
                "Confirma os dados?"
            )
    
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
        if not horarios:
            return f"Infelizmente não há horários disponíveis com Dr(a). {medico_nome} para esta data. 😔"
        
        horarios_formatados = [f"• *{h}*" for h in horarios[:5]]
        horarios_str = "\n".join(horarios_formatados)
        
        return (
            f"Encontrei estes horários com Dr(a). *{medico_nome}* no dia *{data}*: 📅\n\n"
            f"{horarios_str}\n\n"
            "Qual horário prefere? Se nenhum servir, posso verificar outras datas. 🕐"
        )
    
    @classmethod
    def gerar_pedido_dados_paciente(cls, nome, para_crianca=False):
        """Gera pedido de dados do paciente"""
        if para_crianca:
            return (
                f"Certo, {nome}! Para o agendamento da criança, preciso de alguns dados: 👶\n\n"
                "*Dados da criança:*\n"
                "• Nome completo\n"
                "• Data de nascimento (DD/MM/AAAA)\n\n"
                "*Dados do responsável:*\n"
                "• Seu nome completo\n"
                "• Seu CPF (XXX.XXX.XXX-XX)\n"
                "• Grau de parentesco\n"
                "• Telefone (+55 11 99999-9999)\n"
                "• Email\n\n"
                "Pode me enviar essas informações?"
            )
        else:
            return (
                f"Perfeito, {nome}! Para finalizar, preciso de alguns dados: 📋\n\n"
                "*Dados pessoais:*\n"
                "• Nome completo\n"
                "• Data de nascimento (DD/MM/AAAA)\n"
                "• CPF (XXX.XXX.XXX-XX)\n\n"
                "*Contato:*\n"
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
        base = (
            f"🎉 *Agendamento Confirmado!*\n\n"
            f"Olá, {nome}! Seu horário foi reservado com sucesso:\n\n"
            f"📅 *Data:* {detalhes['data']}\n"
            f"🕐 *Horário:* {detalhes['hora']}\n"
            f"👨‍⚕️ *Profissional:* {detalhes.get('medico', 'A definir')}\n"
            f"🏥 *Tipo:* {detalhes['tipo']}\n\n"
        )
        
        if pagamento_info.get('tipo') == 'PIX':
            base += (
                f"💰 *Valor com desconto:* R$ {pagamento_info['valor']}\n\n"
                f"*Chave PIX:*\n`{pagamento_info['chave']}`\n\n"
                "Após o pagamento, seu horário será confirmado automaticamente! ✅"
            )
        elif pagamento_info.get('tipo') == 'CartaoCredito':
            base += "💳 Pagamento será realizado no local da consulta."
        
        base += "\n\n📞 Dúvidas? Entre em contato conosco!\n\nObrigado por escolher a Clínica Limalé! 🏥"
        
        return base