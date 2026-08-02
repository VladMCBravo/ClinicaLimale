# core/db_retry.py
"""
Decorator para tornar operações de escrita resilientes ao erro:
    psycopg.errors.ReadOnlySqlTransaction:
    cannot execute INSERT/UPDATE/DELETE in a read-only transaction

Contexto do problema (clinica-limale):
    O erro aparece de forma intermitente e espalhada ao longo do dia,
    o que é compatível com estado de sessão (READ ONLY) vazando através
    do connection pooler (PgBouncer/Supavisor em modo transaction pooling),
    e não com uma indisponibilidade real do cluster Postgres.

Estratégia:
    1. Tenta executar a função normalmente.
    2. Se cair no erro de read-only, DESCARTA a conexão atual
       (connections[alias].close()) para forçar o Django a abrir uma
       conexão nova e limpa do pool na próxima query — isso resolve o
       problema mesmo se a causa for uma sessão "contaminada" reaproveitada
       pelo pooler.
    3. Espera um pequeno delay (backoff exponencial) e tenta de novo.
    4. Depois de N tentativas, propaga o erro original.

Uso:
    from core.db_retry import retry_on_read_only

    class LaudoCreateAsyncView(generics.CreateAPIView):
        ...
        @retry_on_read_only()
        def perform_create(self, serializer):
            ...

IMPORTANTE:
    - Aplique o decorator na função que abre a "unidade de trabalho"
      (perform_create/perform_update, ou o método create/update inteiro),
      nunca no meio de um bloco `with transaction.atomic():` já aberto,
      pois a conexão precisa estar livre para ser fechada e reaberta.
    - Cada tentativa deve, idealmente, ser idempotente ou estar dentro
      de uma transação que só comita no final (o comportamento padrão
      do Django: se a query falha, nada foi persistido).
"""

import logging
import time
from functools import wraps

from django.db import DatabaseError, InternalError, OperationalError, connections

logger = logging.getLogger(__name__)

# Fragmentos de mensagem que identificam o erro de transação read-only.
# Cobrimos INSERT/UPDATE/DELETE e a variação genérica "read-only transaction".
_READ_ONLY_MARKERS = (
    "read-only transaction",
    "cannot execute insert",
    "cannot execute update",
    "cannot execute delete",
)


def _is_read_only_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(marker in message for marker in _READ_ONLY_MARKERS)


def _log_connection_diagnostics(db_alias: str) -> None:
    """
    Roda uma query de diagnóstico na conexão que acabou de falhar, ANTES de
    fechá-la, para descobrir de uma vez por todas qual usuário/host/porta
    estava sendo usado quando o erro 25006 aconteceu.

    Isso resolve o problema de testar manualmente pelo SQL Editor da Supabase
    (que sempre conecta como 'postgres') e nunca reproduzir a conexão real
    usada pelo Django.
    """
    try:
        conn = connections[db_alias]
        # A conexão pode estar com a transação "suja" pelo erro anterior;
        # forçamos um rollback antes de rodar a query de diagnóstico.
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    current_user,
                    current_setting('transaction_read_only') AS tx_ro,
                    current_setting('default_transaction_read_only') AS default_tx_ro,
                    inet_server_addr()::text AS db_host,
                    inet_server_port() AS db_port,
                    pg_backend_pid() AS backend_pid
                """
            )
            row = cursor.fetchone()
            columns = [desc[0] for desc in cursor.description]
            diagnostics = dict(zip(columns, row))
            logger.error(
                "[db_retry] DIAGNÓSTICO DA CONEXÃO QUE FALHOU COM 25006: %s",
                diagnostics,
            )
    except Exception as diag_exc:
        # Nunca deixamos o diagnóstico quebrar o fluxo de retry.
        logger.warning(
            "[db_retry] Não foi possível coletar diagnóstico da conexão: %s",
            diag_exc,
        )


def retry_on_read_only(max_retries: int = 3, base_delay: float = 0.4,
                        backoff: float = 2.0, db_alias: str = "default"):
    """
    Decorator de retry específico para o erro de transação read-only do Postgres.

    Args:
        max_retries: número máximo de novas tentativas (além da primeira).
        base_delay: espera inicial em segundos antes da 1ª nova tentativa.
        backoff: multiplicador de espera a cada nova tentativa (exponencial).
        db_alias: alias da conexão no DATABASES do settings.py a ser reciclada.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            attempt = 0
            delay = base_delay
            last_exc = None

            while attempt <= max_retries:
                try:
                    return func(*args, **kwargs)
                except (OperationalError, InternalError, DatabaseError) as exc:
                    if not _is_read_only_error(exc):
                        # Não é o erro que sabemos tratar — sobe normalmente.
                        raise

                    last_exc = exc
                    attempt += 1

                    if attempt > max_retries:
                        break

                    logger.warning(
                        "[db_retry] Transação read-only detectada "
                        "(tentativa %s/%s). Descartando conexão '%s' e "
                        "tentando de novo em %.2fs. Erro: %s",
                        attempt, max_retries, db_alias, delay, exc,
                    )

                    # Captura o "retrato" exato da conexão problemática ANTES
                    # de descartá-la — é isso que vai revelar, de vez, se o
                    # usuário/host bate com o supabase_read_only_user ou não.
                    _log_connection_diagnostics(db_alias)

                    # Passo crítico: fecha a conexão atual do alias para
                    # que o Django seja forçado a abrir uma nova na próxima
                    # query. Isso resolve o caso de sessão contaminada
                    # devolvida pelo pooler em modo transaction pooling.
                    try:
                        connections[db_alias].close()
                    except Exception:
                        # Se já estiver fechada ou algo assim, seguimos.
                        pass

                    time.sleep(delay)
                    delay *= backoff

            logger.error(
                "[db_retry] Erro de read-only persistiu após %s tentativas.",
                max_retries,
            )
            raise last_exc

        return wrapper
    return decorator