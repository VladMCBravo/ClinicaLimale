# chatbot/management/commands/processar_historico.py

import time
import logging
from django.core.management.base import BaseCommand
from chatbot.models import ChatMemory
from pacientes.models import Paciente
from crm.models import Ciclo, AnaliseComportamental
from chatbot.chains import chain_ghost_mode

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Reprocessa o histórico do ChatMemory para extrair dados para o CRM via Ghost Mode.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("Iniciando varredura retroativa. Isso pode levar alguns minutos..."))

        # Pega todas as memórias que têm algum dado salvo
        memorias = ChatMemory.objects.exclude(memory_data__isnull=True)
        total = memorias.count()
        processados = 0

        for memoria in memorias:
            processados += 1
            session_id = memoria.session_id
            
            # Pega o histórico guardado (Vamos pegar as últimas 15 mensagens para ter contexto)
            historico = memoria.memory_data.get('historico_conversa', [])
            if not historico or len(historico) < 2:
                continue # Pula se não tiver conversa suficiente

            texto_historico = "\n".join(historico[-15:])
            
            self.stdout.write(f"[{processados}/{total}] Analisando número {session_id}...")

            try:
                # 1. INVOCAÇÃO DA IA COM O HISTÓRICO
                analise_ia = chain_ghost_mode.invoke({
                    "user_message": "Análise retroativa de histórico. Extraia os dados com base na conversa acima.",
                    "historico": texto_historico
                })

                # 2. LIMPEZA DO TELEFONE
                raw_phone = ''.join(filter(str.isdigit, session_id))
                if len(raw_phone) == 13 and raw_phone.startswith('55'):
                    telefone_limpo = raw_phone[2:]
                else:
                    telefone_limpo = raw_phone

                # 3. ATUALIZAÇÃO DO PACIENTE
                paciente, created = Paciente.objects.get_or_create(
                    telefone_celular=telefone_limpo,
                    defaults={'nome_completo': 'Lead (Recuperado)'}
                )

                nome = analise_ia.get("nome_extraido")
                if nome and "Lead" in paciente.nome_completo:
                    paciente.nome_completo = nome.title()
                
                email = analise_ia.get("email_extraido")
                if email and not paciente.email:
                    paciente.email = email.lower()
                    
                data_nasc = analise_ia.get("data_nascimento")
                if data_nasc and not paciente.data_nascimento:
                    paciente.data_nascimento = data_nasc 

                paciente.save()

                # 4. ATUALIZAÇÃO DO CRM (Comportamental)
                comp, _ = AnaliseComportamental.objects.get_or_create(paciente=paciente)
                
                if analise_ia.get("exame_interesse"): comp.exame_interesse = analise_ia.get("exame_interesse")
                if analise_ia.get("medico_solicitante"): comp.medico_solicitante = analise_ia.get("medico_solicitante")
                if analise_ia.get("motivo_exame"): comp.motivo_exame = analise_ia.get("motivo_exame")
                if analise_ia.get("primeira_gravidez") is not None: comp.primeira_gravidez = analise_ia.get("primeira_gravidez")
                if analise_ia.get("sexo_bebe"): comp.sexo_bebe = analise_ia.get("sexo_bebe")
                if analise_ia.get("origem_aquisicao"): comp.origem_aquisicao = analise_ia.get("origem_aquisicao")
                
                comp.save()

                # 5. ATUALIZAÇÃO DO CICLO
                ciclo, _ = Ciclo.objects.get_or_create(
                    paciente=paciente, 
                    status='ativo',
                    defaults={'tipo': 'OUTRO', 'fase_atual': 'F1'}
                )
                
                semanas = analise_ia.get("semanas_gestacao")
                if semanas and isinstance(semanas, int) and semanas > 0 and not ciclo.data_dum:
                    from datetime import date, timedelta
                    ciclo.data_dum = date.today() - timedelta(weeks=semanas)
                    ciclo.tipo = 'GESTACAO'
                    ciclo.save()

                self.stdout.write(self.style.SUCCESS(f"✅ Sucesso para {paciente.nome_completo}"))

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Erro no {session_id}: {e}"))

            # Pausa de 5 segundos para não estourar o limite de requisições gratuitas do Gemini por minuto
            time.sleep(5) 

        self.stdout.write(self.style.SUCCESS("🎉 Varredura concluída!"))