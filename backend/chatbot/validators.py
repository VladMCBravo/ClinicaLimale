# chatbot/validators.py
import re
from datetime import datetime, date
from typing import Dict, List, Optional, Tuple

class ChatbotValidators:
    """Validadores aprimorados para dados do chatbot"""
    
    @staticmethod
    def validar_cpf_completo(cpf: str) -> Tuple[bool, str, Optional[str]]:
        """Valida CPF com verificação de dígitos"""
        if not cpf:
            return False, "CPF não informado", None
        
        # Remove caracteres não numéricos
        cpf_limpo = re.sub(r'\D', '', cpf)
        
        if len(cpf_limpo) != 11:
            return False, "CPF deve ter 11 dígitos", None
        
        # Verifica se todos os dígitos são iguais
        if cpf_limpo == cpf_limpo[0] * 11:
            return False, "CPF inválido", None
        
        # Validação dos dígitos verificadores
        def calcular_digito(cpf_parcial, pesos):
            soma = sum(int(cpf_parcial[i]) * pesos[i] for i in range(len(pesos)))
            resto = soma % 11
            return 0 if resto < 2 else 11 - resto
        
        primeiro_digito = calcular_digito(cpf_limpo[:9], range(10, 1, -1))
        segundo_digito = calcular_digito(cpf_limpo[:10], range(11, 1, -1))
        
        if int(cpf_limpo[9]) != primeiro_digito or int(cpf_limpo[10]) != segundo_digito:
            return False, "CPF inválido", None
        
        # Formatar CPF
        cpf_formatado = f"{cpf_limpo[:3]}.{cpf_limpo[3:6]}.{cpf_limpo[6:9]}-{cpf_limpo[9:]}"
        
        return True, "CPF válido", cpf_formatado
    
    @staticmethod
    def validar_telefone_brasileiro(telefone: str) -> Tuple[bool, str, Optional[str]]:
        """Valida telefone brasileiro com diferentes formatos"""
        if not telefone:
            return False, "Telefone não informado", None
        
        # Remove caracteres não numéricos
        tel_limpo = re.sub(r'\D', '', telefone)
        
        # Verifica se tem código do país
        if tel_limpo.startswith('55'):
            tel_limpo = tel_limpo[2:]
        
        # Deve ter 10 ou 11 dígitos (com ou sem 9 no celular)
        if len(tel_limpo) not in [10, 11]:
            return False, "Telefone deve ter 10 ou 11 dígitos", None
        
        # Se tem 11 dígitos, o terceiro deve ser 9 (celular)
        if len(tel_limpo) == 11 and tel_limpo[2] != '9':
            return False, "Para telefones com 11 dígitos, o terceiro dígito deve ser 9", None
        
        # Formatar telefone
        if len(tel_limpo) == 11:
            tel_formatado = f"+55 ({tel_limpo[:2]}) {tel_limpo[2:7]}-{tel_limpo[7:]}"
        else:
            tel_formatado = f"+55 ({tel_limpo[:2]}) {tel_limpo[2:6]}-{tel_limpo[6:]}"
        
        return True, "Telefone válido", tel_formatado
    
    @staticmethod
    def validar_email_avancado(email: str) -> Tuple[bool, str, Optional[str]]:
        """Validação avançada de email"""
        if not email:
            return False, "Email não informado", None
        
        email = email.strip().lower()
        
        # Regex mais robusta para email
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        if not re.match(pattern, email):
            return False, "Formato de email inválido", None
        
        # Verifica domínios comuns com erros de digitação
        dominios_comuns = {
            'gmail.com': ['gmai.com', 'gmial.com', 'gmail.co'],
            'hotmail.com': ['hotmai.com', 'hotmial.com', 'hotmail.co'],
            'yahoo.com': ['yahoo.co', 'yaho.com'],
            'outlook.com': ['outlook.co', 'outlok.com']
        }
        
        dominio = email.split('@')[1]
        for correto, errados in dominios_comuns.items():
            if dominio in errados:
                return False, f"Você quis dizer {email.replace(dominio, correto)}?", None
        
        return True, "Email válido", email
    
    @staticmethod
    def validar_data_nascimento_avancada(data_str: str) -> Tuple[bool, str, Optional[date]]:
        """Validação avançada de data de nascimento"""
        if not data_str:
            return False, "Data de nascimento não informada", None
        
        # Tenta diferentes formatos
        formatos = ['%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y', '%Y-%m-%d']
        
        for formato in formatos:
            try:
                data_obj = datetime.strptime(data_str.strip(), formato).date()
                
                # Verifica se a data não é futura
                if data_obj >= date.today():
                    return False, "Data de nascimento não pode ser futura", None
                
                # Verifica se a pessoa não é muito velha (mais de 120 anos)
                idade = (date.today() - data_obj).days // 365
                if idade > 120:
                    return False, "Data de nascimento muito antiga", None
                
                return True, "Data válida", data_obj
                
            except ValueError:
                continue
        
        return False, "Formato de data inválido. Use DD/MM/AAAA", None
    
    @staticmethod
    def validar_nome_completo(nome: str) -> Tuple[bool, str, Optional[str]]:
        """Valida nome completo"""
        if not nome:
            return False, "Nome não informado", None
        
        nome = nome.strip()
        
        # Deve ter pelo menos 2 palavras
        palavras = nome.split()
        if len(palavras) < 2:
            return False, "Por favor, informe nome e sobrenome", None
        
        # Cada palavra deve ter pelo menos 2 caracteres
        for palavra in palavras:
            if len(palavra) < 2:
                return False, "Nome muito curto", None
        
        # Verifica se contém apenas letras e espaços
        if not re.match(r'^[a-zA-ZÀ-ÿ\s]+$', nome):
            return False, "Nome deve conter apenas letras", None
        
        # Formatar nome (primeira letra maiúscula)
        nome_formatado = ' '.join(palavra.capitalize() for palavra in palavras)
        
        return True, "Nome válido", nome_formatado
    
    @staticmethod
    def extrair_dados_texto(texto: str) -> Dict[str, str]:
        """Extrai dados estruturados de texto livre"""
        dados = {}
        linhas = texto.split('\n')
        
        for linha in linhas:
            linha = linha.strip()
            if not linha:
                continue
            
            # Procura por CPF
            cpf_match = re.search(r'\d{3}\.?\d{3}\.?\d{3}-?\d{2}', linha)
            if cpf_match and 'cpf' not in dados:
                dados['cpf'] = cpf_match.group()
            
            # Procura por telefone
            tel_match = re.search(r'(\+55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}', linha)
            if tel_match and 'telefone' not in dados:
                dados['telefone'] = tel_match.group()
            
            # Procura por email
            email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', linha)
            if email_match and 'email' not in dados:
                dados['email'] = email_match.group()
            
            # Procura por data
            data_match = re.search(r'\d{1,2}[/.-]\d{1,2}[/.-]\d{4}', linha)
            if data_match and 'data_nascimento' not in dados:
                dados['data_nascimento'] = data_match.group()
            
            # Se a linha não tem padrões específicos, pode ser nome
            if not any([cpf_match, tel_match, email_match, data_match]) and 'nome' not in dados:
                if len(linha.split()) >= 2:
                    dados['nome'] = linha
        
        return dados