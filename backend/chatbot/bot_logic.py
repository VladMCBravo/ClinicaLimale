# chatbot/bot_logic.py - VERSÃO GHOST MODE BLINDADA

import logging
from dateutil import parser as date_parser # <--- Blioteca que traduz datas automaticamente
from .models import ChatMemory
from pacientes.models import Paciente
from crm.models import Ciclo, AnaliseComportamental
from .chains import chain_ghost_mode
import re

logger = logging.getLogger(__name__)

def processar_mensagem_bot(session_id: str, user_message: str) -> dict:
    # 1. Recupera a memória da sessão
    memoria_obj, _ = ChatMemory.objects.get_or_create(session_id=session_id)
    memoria_obj.state = 'humano'
    memoria_atual = memoria_obj.memory_data if isinstance(memoria_obj.memory_data, dict) else {}
    historico = memoria_atual.get('historico_conversa', [])

    # --- FILTRO DE MENSAGENS CURTAS (Economiza sua cota do Gemini) ---
    mensagem_limpa = user_message.strip().lower()
    palavras_ignoradas = ['ok', 'sim', 'não', 'nao', 'obrigado', 'obrigada', 'bom dia', 'boa tarde', 'boa noite', 'tá bom', 'joia']
    
    if len(mensagem_limpa) <= 3 or mensagem_limpa in palavras_ignoradas:
        logger.info("🤖 [GHOST MODE] Mensagem ignorada (Curta ou genérica).")
        historico.append(f"Paciente: {user_message}")
        memoria_atual['historico_conversa'] = historico[-10:]
        memoria_obj.memory_data = memoria_atual
        memoria_obj.save()
        return {}

    logger.info(f"🕵️ [GHOST MODE] Analisando sessão: {session_id}")

    # 2. INVOCAÇÃO SILENCIOSA DA IA
    if chain_ghost_mode:
        try:
            analise_ia = chain_ghost_mode.invoke({
                "user_message": user_message,
                "historico": "\n".join(historico[-4:]) 
            })
            # --- ADICIONE ESTES LOGS DE DEBUG AQUI ---
            logger.warning(f"🤖 [RAIO-X DA IA] JSON extraído: {analise_ia}")
            logger.warning(f"📅 [DEBUG DATA] Data de nascimento extraída pela IA: {analise_ia.get('data_nascimento')}")
            # -----------------------------------------
            # 3. ATUALIZAÇÃO DO CADASTRO DO PACIENTE
            telefone_limpo = ''.join(filter(str.isdigit, session_id))
            
            paciente, created = Paciente.objects.get_or_create(
                telefone_celular=telefone_limpo,
                defaults={'nome_completo': 'Lead (Novo Contato)'}
            )

            atualizou_paciente = False
            
            nome = analise_ia.get("nome_extraido")
            if nome and "Lead" in paciente.nome_completo:
                paciente.nome_completo = nome.title()
                atualizou_paciente = True
                
            email = analise_ia.get("email_extraido")
            if email and not paciente.email:
                paciente.email = email.lower()
                atualizou_paciente = True
                
            # --- CORREÇÃO DA DATA (REMOVENDO O date_parser) ---
            data_nasc = analise_ia.get("data_nascimento")
            if data_nasc and not paciente.data_nascimento:
                # Como a IA já entrega 'YYYY-MM-DD' (ex: 1990-11-04), 
                # basta atribuir diretamente. O Django já sabe ler esse formato.
                try:
                    paciente.data_nascimento = data_nasc 
                    atualizou_paciente = True
                except Exception as e:
                    logger.warning(f"Erro ao salvar data de nascimento {data_nasc}: {e}")

            if atualizou_paciente or created:
                paciente.save()
                print(f"✅ Paciente {paciente.nome_completo} salvo no banco com sucesso!")

            # 4. ATUALIZAÇÃO DO CRM (Analise Comportamental)
            comp, _ = AnaliseComportamental.objects.get_or_create(paciente=paciente)
            atualizou_comp = False
            
            if analise_ia.get("exame_interesse"):
                comp.exame_interesse = analise_ia.get("exame_interesse")
                atualizou_comp = True
            
            if analise_ia.get("medico_solicitante"):
                comp.medico_solicitante = analise_ia.get("medico_solicitante")
                atualizou_comp = True

            if analise_ia.get("motivo_exame"):
                comp.motivo_exame = analise_ia.get("motivo_exame")
                atualizou_comp = True

            if analise_ia.get("primeira_gravidez") is not None:
                comp.primeira_gravidez = analise_ia.get("primeira_gravidez")
                atualizou_comp = True

            if analise_ia.get("sexo_bebe"):
                comp.sexo_bebe = analise_ia.get("sexo_bebe")
                atualizou_comp = True

            if analise_ia.get("concorrencia_mencionada"):
                comp.concorrencia_mencionada = analise_ia.get("concorrencia_mencionada")
                atualizou_comp = True

            if analise_ia.get("nivel_urgencia"):
                comp.nivel_urgencia = analise_ia.get("nivel_urgencia")
                atualizou_comp = True

            if analise_ia.get("origem_aquisicao"):
                comp.origem_aquisicao = analise_ia.get("origem_aquisicao")
                atualizou_comp = True

            motivo_desistencia = analise_ia.get("motivo_desistencia")
            if analise_ia.get("agendou") is False and motivo_desistencia:
                mapeamento_objecoes = {
                    'preco': 'PRECO',
                    'horario': 'AGENDA',
                    'localizacao': 'DISTANCIA',
                    'precisa_pedido_medico': 'OUTRO',
                    'outro': 'OUTRO'
                }
                comp.principal_objecao = mapeamento_objecoes.get(motivo_desistencia, 'OUTRO')
                atualizou_comp = True

            if atualizou_comp:
                comp.save()

            # 5. ATUALIZAÇÃO DO CICLO KANBAN
            ciclo, _ = Ciclo.objects.get_or_create(
                paciente=paciente, 
                status='ativo',
                defaults={'tipo': 'OUTRO', 'fase_atual': 'F1'}
            )
            
            semanas = analise_ia.get("semanas_gestacao")
            if semanas and isinstance(semanas, int) and semanas > 0:
                if not ciclo.data_dum and not paciente.dum:
                    from datetime import date, timedelta
                    data_dum_estimada = date.today() - timedelta(weeks=semanas)
                    ciclo.data_dum = data_dum_estimada
                    ciclo.tipo = 'GESTACAO' 
                    ciclo.save()
            
            novas_obs = ""
            exame = analise_ia.get("exame_interesse")
            if exame: novas_obs += f"[Interesse: {exame}] "
            if motivo_desistencia: novas_obs += f"[Desistência: {motivo_desistencia}] "
            
            if novas_obs:
                obs_atuais = comp.observacoes_internas or ""
                if novas_obs.strip() not in obs_atuais:
                    comp.observacoes_internas = f"{novas_obs}\n{obs_atuais}"[:500] 
                    comp.save()

            # Move o card no funil baseado na decisão do paciente
            agendou = analise_ia.get("agendou")
            if agendou is False:
                ciclo.fase_atual = 'F5' # Move para a coluna de Recuperação
                # Removemos a mudança de status. Ele continua 'ativo' para aparecer na tela!
                ciclo.save()
            elif agendou is True and ciclo.fase_atual == 'F1':
                ciclo.fase_atual = 'F2'
                ciclo.save()

        except Exception as e:
            # O exc_info=True vai imprimir o rastro completo do erro no seu console do Render, 
            # apontando a linha exata caso aconteça alguma anomalia futura com o banco!
            logger.error(f"Erro na extração de dados da IA: {e}", exc_info=True)

    # 6. ATUALIZA O HISTÓRICO DE MEMÓRIA PARA A PRÓXIMA MENSAGEM
    historico.append(f"Paciente: {user_message}")
    memoria_atual['historico_conversa'] = historico[-10:]
    memoria_obj.memory_data = memoria_atual
    memoria_obj.save()

    return {}