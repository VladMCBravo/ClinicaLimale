import time
import logging
import json
from django.utils.deprecation import MiddlewareMixin

# Configura um logger específico para auditoria
audit_logger = logging.getLogger('auditor_ia')

class SecurityAuditMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Inicia o cronômetro quando a requisição chega
        request.start_time = time.time()

    def process_response(self, request, response):
        # Calcula quanto tempo demorou
        if not hasattr(request, 'start_time'):
            return response
            
        duration = time.time() - request.start_time

        # FILTRO 1: Ignorar arquivos estáticos e media (imagens, css)
        # Não queremos encher a IA de lixo
        if any(x in request.path for x in ['/static/', '/media/', '/favicon.ico', '/admin/js/']):
            return response

        # CAPTURA DO USUÁRIO
        user_email = 'Anonymous'
        if request.user.is_authenticated:
            user_email = request.user.email # ou request.user.username

        # CAPTURA DO IP (Para detectar ataques de fora)
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')

        # PREPARAÇÃO DO LOG (Estrutura JSON para a IA ler fácil)
        log_data = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "user": user_email,
            "ip": ip,
            "method": request.method,
            "path": request.path,
            "status_code": response.status_code,
            "duration_seconds": round(duration, 4),
            "payload_preview": self.get_safe_payload(request) # Função de segurança abaixo
        }

        # Grava no arquivo de log
        audit_logger.info(json.dumps(log_data))

        return response

    def get_safe_payload(self, request):
        """
        Esta função garante a LGPD. Ela pega o corpo da requisição,
        mas censura campos sensíveis antes de salvar.
        """
        if request.method not in ['POST', 'PUT', 'PATCH']:
            return None
        
        try:
            # Tenta ler o JSON do corpo
            body = json.loads(request.body.decode('utf-8'))
            
            # LISTA NEGRA: Campos que a IA NÃO DEVE VER valores reais
            campos_sensiveis = [
                'password', 'senha', 'token', 'access', 'refresh',
                'cpf', 'rg', 'cartao', 'cvv', 
                'diagnostico', 'cid', 'medicamento' # Contexto Médico
            ]

            def sanitize(data):
                if isinstance(data, dict):
                    return {k: ('***MASKED***' if k.lower() in campos_sensiveis else sanitize(v)) for k, v in data.items()}
                if isinstance(data, list):
                    return [sanitize(i) for i in data]
                return data

            return sanitize(body)

        except:
            return "Non-JSON Body or Binary Data"