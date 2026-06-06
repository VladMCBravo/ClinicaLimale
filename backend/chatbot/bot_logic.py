# chatbot/bot_logic.py - VERSÃO GHOST MODE (IA APENAS OUVINTE PARA CRM)

import logging
from .models import ChatMemory
from pacientes.models import Paciente
from crm.models import Ciclo, AnaliseComportamental
from .chains import chain_ghost_mode
import re

logger = logging.getLogger(__name__)

def processar_mensagem_bot(session_id: str, user_message: str) -> dict:
    # 1. Recupera a memória da sessão
    memoria_obj, _ = ChatMemory.objects.get_or_create(session_id=session_id)
    
    # Força o estado humano para garantir que o bot nunca assuma a linha de frente
    memoria_obj.state = 'humano'
    memoria_atual = memoria_obj.memory_data if isinstance(memoria_obj.memory_data, dict) else {}
    historico = memoria_atual.get('historico_conversa', [])

    logger.info(f"🕵️ [GHOST MODE] Analisando sessão: {session_id}")

    # --- NOVO FILTRO DE MENSAGENS CURTAS ---
    mensagem_limpa = user_message.strip().lower()
    palavras_ignoradas = ['ok', 'sim', 'não', 'nao', 'obrigado', 'obrigada', 'bom dia', 'boa tarde', 'boa noite', 'tá bom', 'joia']
    
    if len(mensagem_limpa) <= 3 or mensagem_limpa in palavras_ignoradas:
        logger.info("🤖 [GHOST MODE] Mensagem ignorada (Curta ou genérica).")
        # Apenas salva no histórico e encerra
        historico.append(f"Paciente: {user_message}")
        memoria_atual['historico_conversa'] = historico[-10:]
        memoria_obj.memory_data = memoria_atual
        memoria_obj.save()
        return {}

    # 2. INVOCAÇÃO SILENCIOSA DA IA (Roda em todas as mensagens agora)
    if chain_ghost_mode:
        try:
            # Passa a mensagem atual e as últimas mensagens para dar contexto à IA
            analise_ia = chain_ghost_mode.invoke({
                "user_message": user_message,
                "historico": "\n".join(historico[-4:]) 
            })
            
            nome = analise_ia.get("nome_extraido")
            data_nasc = analise_ia.get("data_nascimento")
            email = analise_ia.get("email_extraido")
            exame = analise_ia.get("exame_interesse")
            agendou = analise_ia.get("agendou")
            motivo = analise_ia.get("motivo_desistencia")
            
            # 3. ATUALIZAÇÃO DO CADASTRO DO PACIENTE
            telefone_limpo = ''.join(filter(str.isdigit, session_id))
            
            paciente, created = Paciente.objects.get_or_create(
                telefone_celular=telefone_limpo,
                defaults={'nome_completo': 'Lead (Novo Contato)'}
            )

            atualizou_paciente = False
            
            if nome and "Lead" in paciente.nome_completo:
                paciente.nome_completo = nome.title()
                atualizou_paciente = True
                
            if email and not paciente.email:
                paciente.email = email.lower()
                atualizou_paciente = True
                
            if data_nasc and not paciente.data_nascimento:
                paciente.data_nascimento = data_nasc
                atualizou_paciente = True

            if atualizou_paciente or created:
                paciente.save()

            # 4. ATUALIZAÇÃO DO CRM (Ciclo e Comportamento)
            comp, _ = AnaliseComportamental.objects.get_or_create(paciente=paciente)
            atualizou_comp = False
            
            # --- SALVANDO DADOS DO NOVO PROMPT DO GHOST MODE ---
            if analise_ia.get("exame_interesse"):
                comp.exame_interesse = analise_ia.get("exame_interesse")
                atualizou_comp = True
            
            if analise_ia.get("medico_solicitante"):
                comp.medico_solicitante = analise_ia.get("medico_solicitante")
                atualizou_comp = True

            if analise_ia.get("motivo_exame"):
                comp.motivo_exame = analise_ia.get("motivo_exame")
                atualizou_comp = True

            # Lógica booleana e strings específicas
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

            # Trata objeção/desistência usando as opções do seu Model
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

            # --- ATUALIZANDO DADOS OBSTÉTRICOS NO CICLO ---
            ciclo, _ = Ciclo.objects.get_or_create(
                paciente=paciente, 
                status='ativo',
                defaults={'tipo': 'OUTRO', 'fase_atual': 'F1'}
            )
            
            # Se o bot detectou semanas de gestação e não temos a DUM, fazemos a engenharia reversa leve aqui
            semanas = analise_ia.get("semanas_gestacao")
            if semanas and isinstance(semanas, int) and semanas > 0:
                if not ciclo.data_dum and not paciente.dum:
                    from datetime import date, timedelta
                    # Engenharia reversa: Hoje menos as semanas relatadas
                    data_dum_estimada = date.today() - timedelta(weeks=semanas)
                    ciclo.data_dum = data_dum_estimada
                    ciclo.tipo = 'GESTACAO' # Atualiza o tipo do ciclo para destravar a trilha obstétrica
                    ciclo.save()
                    print(f"🤖 [GHOST MODE] DUM estimada ({data_dum_estimada}) salva no Ciclo para {paciente.nome_completo}")
            
            # Concatena as novas descobertas nas observações internas do CRM
            novas_obs = ""
            exame = analise_ia.get("exame_interesse")
            motivo = analise_ia.get("motivo_desistencia")
            
            if exame: novas_obs += f"[Interesse: {exame}] "
            if motivo: novas_obs += f"[Desistência: {motivo}] "
            
            if novas_obs:
                obs_atuais = comp.observacoes_internas or ""
                # Evita duplicar a mesma observação
                if novas_obs.strip() not in obs_atuais:
                    comp.observacoes_internas = f"{novas_obs}\n{obs_atuais}"[:500] 
                    comp.save()

            # Move o card no funil baseado na decisão do paciente
            agendou = analise_ia.get("agendou")
            
            if agendou is False:
                ciclo.fase_atual = 'ENCERRADO'
                ciclo.status = 'encerrado'
                ciclo.save()
            elif agendou is True and ciclo.fase_atual == 'F1':
                ciclo.fase_atual = 'F2' # Fase correta conforme models.py
                ciclo.save()

        except Exception as e:
            logger.error(f"Erro na extração de dados da IA: {e}")

    # 5. ATUALIZA O HISTÓRICO DE MEMÓRIA PARA A PRÓXIMA MENSAGEM
    historico.append(f"Paciente: {user_message}")
    memoria_atual['historico_conversa'] = historico[-10:]
    memoria_obj.memory_data = memoria_atual
    memoria_obj.save()

    # 6. RETORNA VAZIO
    return {}