# chatbot/management/commands/processar_historico.py

import time
import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count
from chatbot.models import ChatMemory
from pacientes.models import Paciente
from crm.models import Ciclo, AnaliseComportamental
from chatbot.chains import chain_ghost_mode

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Fase 1: Mescla pacientes duplicados por número de telefone. Fase 2: Reprocessa a IA para descobrir os dados de Leads genéricos.'

    def handle(self, *args, **kwargs):
        # Executa as duas fases em ordem
        self._mesclar_duplicados_por_telefone()
        self._processar_historico_leads()

    def _mesclar_duplicados_por_telefone(self):
        self.stdout.write(self.style.WARNING("\n=== FASE 1: DEDUPLICAÇÃO POR TELEFONE ==="))
        
        # Busca telefones que se repetem na tabela Paciente
        duplicados = Paciente.objects.exclude(
            telefone_celular__isnull=True
        ).exclude(
            telefone_celular=''
        ).values('telefone_celular').annotate(total=Count('id')).filter(total__gt=1)
        
        if not duplicados:
            self.stdout.write(self.style.SUCCESS("✅ Nenhum paciente duplicado por telefone encontrado."))
            return

        self.stdout.write(f"⚠️ Encontrados {len(duplicados)} números de telefone com múltiplos cadastros.")

        for dup in duplicados:
            telefone = dup['telefone_celular']
            # Pega todos os pacientes com esse telefone, ordenados do mais antigo pro mais novo
            pacientes = list(Paciente.objects.filter(telefone_celular=telefone).order_by('id'))
            
            # REGRA INTELIGENTE DO MESTRE: Tenta achar um que NÃO tenha a palavra "Lead"
            mestre = next((p for p in pacientes if "Lead" not in p.nome_completo), None)
            
            # Se todos forem Leads genéricos, pegamos o primeiro (mais antigo)
            if not mestre:
                mestre = pacientes[0]

            duplicatas = [p for p in pacientes if p.id != mestre.id]

            self.stdout.write(f"  -> Agrupando {len(duplicatas)} duplicatas no nº {telefone}. Mestre escolhido: {mestre.nome_completo} (ID {mestre.id})")

            with transaction.atomic():
                for duplicata in duplicatas:
                    # Percorre as tabelas vinculadas (Agendamentos, Ciclo, Pagamentos) e transfere a titularidade
                    for related_object in mestre._meta.related_objects:
                        rel_model = related_object.related_model
                        rel_field_name = related_object.field.name

                        # Tratamento especial para tabelas "Um para Um" (AnaliseComportamental)
                        if related_object.one_to_one:
                            if hasattr(duplicata, rel_field_name) and not hasattr(mestre, rel_field_name):
                                obj = getattr(duplicata, rel_field_name)
                                setattr(obj, related_object.remote_field.name, mestre)
                                obj.save()
                            continue

                        # Transfere relações normais
                        try:
                            if not related_object.field.many_to_many:
                                kwargs_busca = {rel_field_name: duplicata}
                                rel_model.objects.filter(**kwargs_busca).update(**{rel_field_name: mestre})
                            else:
                                registros = rel_model.objects.filter(**{rel_field_name: duplicata})
                                for reg in registros:
                                    m2m_manager = getattr(reg, rel_field_name)
                                    m2m_manager.remove(duplicata)
                                    m2m_manager.add(mestre)
                        except Exception:
                            pass # Ignora silenciosamente relations reversas protegidas
                    
                    # Salva dados extras se o Mestre não tiver (email e nascimento)
                    atualizou_mestre = False
                    if not mestre.email and duplicata.email:
                        mestre.email = duplicata.email
                        atualizou_mestre = True
                    if not mestre.data_nascimento and duplicata.data_nascimento:
                        mestre.data_nascimento = duplicata.data_nascimento
                        atualizou_mestre = True
                    
                    if atualizou_mestre:
                        mestre.save()

                    # Apaga a duplicata fantasma da base de dados
                    duplicata.delete()

        self.stdout.write(self.style.SUCCESS("✅ Deduplicação e limpeza de banco de dados concluída!"))

    def _processar_historico_leads(self):
        self.stdout.write(self.style.WARNING("\n=== FASE 2: REPESCAGEM COM IA (GHOST MODE) ==="))
        
        memorias = ChatMemory.objects.exclude(memory_data__isnull=True)
        total = memorias.count()
        processados = 0
        analisados_nesta_rodada = 0

        for memoria in memorias:
            processados += 1
            session_id = memoria.session_id
            
            raw_phone = ''.join(filter(str.isdigit, session_id))
            if len(raw_phone) == 13 and raw_phone.startswith('55'):
                telefone_limpo = raw_phone[2:]
            else:
                telefone_limpo = raw_phone

            # Pega o paciente já validado e limpo da Fase 1
            paciente = Paciente.objects.filter(telefone_celular=telefone_limpo).first()
            
            # Se não for um "Lead" genérico, não gastamos a API!
            if paciente and "Lead" not in paciente.nome_completo:
                continue

            analisados_nesta_rodada += 1
            self.stdout.write(f"[{processados}/{total}] Rodando a IA para o número {session_id}...")

            historico = memoria.memory_data.get('historico_conversa', [])
            if not historico or len(historico) < 2:
                continue 

            texto_historico = "\n".join(historico[-20:])

            try:
                analise_ia = chain_ghost_mode.invoke({
                    "user_message": "Análise retroativa. Procure agressivamente pelo NOME do paciente e enquadre o exame de interesse baseado no catálogo.",
                    "historico": texto_historico
                })

                if not paciente:
                    paciente = Paciente.objects.create(telefone_celular=telefone_limpo, nome_completo='Lead (Recuperado)')

                nome = analise_ia.get("nome_extraido")
                if nome and "Lead" in paciente.nome_completo:
                    paciente.nome_completo = nome.title()
                    self.stdout.write(self.style.SUCCESS(f"  🎉 Nome descoberto pela IA: {paciente.nome_completo}!"))
                
                email = analise_ia.get("email_extraido")
                if email and not paciente.email: paciente.email = email.lower()
                data_nasc = analise_ia.get("data_nascimento")
                if data_nasc and not paciente.data_nascimento: paciente.data_nascimento = data_nasc 
                
                paciente.save()

                # Atualiza CRM
                comp, _ = AnaliseComportamental.objects.get_or_create(paciente=paciente)
                
                if analise_ia.get("exame_interesse"): 
                    comp.exame_interesse = analise_ia.get("exame_interesse")
                    self.stdout.write(f"  🔍 Exame mapeado: {comp.exame_interesse}")

                if analise_ia.get("medico_solicitante"): comp.medico_solicitante = analise_ia.get("medico_solicitante")
                if analise_ia.get("motivo_exame"): comp.motivo_exame = analise_ia.get("motivo_exame")
                if analise_ia.get("primeira_gravidez") is not None: comp.primeira_gravidez = analise_ia.get("primeira_gravidez")
                if analise_ia.get("sexo_bebe"): comp.sexo_bebe = analise_ia.get("sexo_bebe")
                if analise_ia.get("origem_aquisicao"): comp.origem_aquisicao = analise_ia.get("origem_aquisicao")
                if analise_ia.get("nivel_urgencia"): comp.nivel_urgencia = analise_ia.get("nivel_urgencia")
                
                motivo_desistencia = analise_ia.get("motivo_desistencia")
                if analise_ia.get("agendou") is False and motivo_desistencia:
                    mapeamento_objecoes = {
                        'preco': 'PRECO', 'horario': 'AGENDA', 'localizacao': 'DISTANCIA', 
                        'precisa_pedido_medico': 'OUTRO', 'outro': 'OUTRO'
                    }
                    comp.principal_objecao = mapeamento_objecoes.get(motivo_desistencia, 'OUTRO')
                
                comp.save()

                ciclo, _ = Ciclo.objects.get_or_create(paciente=paciente, status='ativo', defaults={'tipo': 'OUTRO', 'fase_atual': 'F1'})
                semanas = analise_ia.get("semanas_gestacao")
                if semanas and isinstance(semanas, int) and semanas > 0 and not ciclo.data_dum:
                    from datetime import date, timedelta
                    ciclo.data_dum = date.today() - timedelta(weeks=semanas)
                    ciclo.tipo = 'GESTACAO'
                    ciclo.save()

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Erro no {session_id}: {e}"))

            # Mantém a pausa de 5 segundos para a sua camada gratuita funcionar sem bloquear
            time.sleep(5) 

        self.stdout.write(self.style.SUCCESS(f"\n🎉 Processo Completo! {analisados_nesta_rodada} leads não identificados foram processados pela IA."))