import json
import logging
from pywebpush import webpush, WebPushException
from django.conf import settings
from .models import WebPushSubscription

logger = logging.getLogger(__name__)

def enviar_notificacao_push(user_id, titulo, corpo, url="/"):
    """
    Função independente para disparar notificações Push.
    """
    inscricoes = WebPushSubscription.objects.filter(user_id=user_id)
    
    if not inscricoes.exists():
        return False

    payload = json.dumps({
        "title": titulo,
        "body": corpo,
        "url": url
    })

    for sub in inscricoes:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth}
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": "mailto:admin@clinicalimale.com.br"}
            )
        except WebPushException as ex:
            logger.error(f"Erro ao enviar Push: {repr(ex)}")
            # Se a inscrição expirou ou o usuário revogou a permissão no navegador
            if ex.response and ex.response.status_code in [404, 410]:
                sub.delete()
                
    return True
