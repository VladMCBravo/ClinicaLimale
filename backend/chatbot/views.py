# chatbot/views.py - VERSÃO MÍNIMA E ESTÁVEL

import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from .models import ChatMemory
from .agendamento_flow import AgendamentoManager

logger = logging.getLogger(__name__)

@csrf_exempt
@require_POST
def chatbot_orchestrator(request):
    try:
        data = json.loads(request.body)
        user_message = data.get("message")
        session_id = data.get("sessionId")

        if not user_message or not session_id:
            return JsonResponse({"error": "message e sessionId são obrigatórios."}, status=400)

        memoria_obj, _ = ChatMemory.objects.get_or_create(session_id=session_id, defaults={'memory_data': {}, 'state': 'inicio'})
        memoria_atual = memoria_obj.memory_data if isinstance(memoria_obj.memory_data, dict) else {}
        estado_atual = memoria_obj.state
        
        logger.warning(f"\n--- INÍCIO REQ --- | Session: {session_id} | Estado: '{estado_atual}' | Msg: '{user_message}'")
        
        resultado = {}
        
        if estado_atual and estado_atual not in ['inicio', 'aguardando_nome']:
            manager = AgendamentoManager(session_id, memoria_atual, request.build_absolute_uri('/'))
            resultado = manager.processar(user_message, estado_atual)
        else:
            if estado_atual == 'aguardando_nome':
                nome_usuario = user_message.strip().title().split(' ')[0]
                memoria_atual['nome_usuario'] = nome_usuario
                manager = AgendamentoManager(session_id, memoria_atual, request.build_absolute_uri('/'))
                resultado = manager.processar(user_message, 'agendamento_inicio')
            else: # estado 'inicio'
                resultado = {"response_message": "Olá! Sou o Leônidas, da Clínica Limalé. Qual o seu nome?", "new_state": 'aguardando_nome', "memory_data": {}}

        resposta_final_msg = resultado.get("response_message")
        memoria_obj.state = resultado.get("new_state")
        memoria_obj.memory_data = resultado.get("memory_data")
        memoria_obj.save()
        
        logger.warning(f"Resposta Final: '{str(resposta_final_msg)[:150]}...'")
        return JsonResponse({"response_message": resposta_final_msg})

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"!!!!!!!!!! ERRO NÃO CAPTURADO NO ORQUESTRADOR !!!!!!!!!!\n{error_details}")
        return JsonResponse({"error": f"Erro interno crítico: {e}"}, status=500)

def debug_chatbot_module(request):
    try:
        from .agendamento_flow import AgendamentoManager
        manager = AgendamentoManager(session_id="debug", memoria={}, base_url="/")
        return JsonResponse({"status": "sucesso", "message": "O módulo agendamento_flow.py foi importado com sucesso."})
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        return JsonResponse({"status": "ERRO", "message": str(e), "details": error_details}, status=500)