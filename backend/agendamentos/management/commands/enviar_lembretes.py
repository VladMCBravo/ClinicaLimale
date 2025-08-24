# backend/agendamentos/management/commands/enviar_lembretes.py - VERSÃO CORRIGIDA

import datetime
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.utils import timezone
from agendamentos.models import Agendamento

class Command(BaseCommand):
    help = 'Envia emails de lembrete para agendamentos do próximo dia.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Iniciando o envio de lembretes...'))
        
        # --- LÓGICA DE DATA CORRIGIDA E ROBUSTA ---
        # 1. Pega a data/hora atual no fuso horário do projeto (ex: America/Sao_Paulo)
        agora = timezone.localtime(timezone.now())
        
        # 2. Calcula o início e o fim exatos de "amanhã"
        amanha = agora.date() + datetime.timedelta(days=1)
        inicio_de_amanha = timezone.make_aware(datetime.datetime.combine(amanha, datetime.time.min))
        fim_de_amanha = timezone.make_aware(datetime.datetime.combine(amanha, datetime.time.max))
        # ----------------------------------------------

        # 3. Busca agendamentos que estejam DENTRO deste intervalo de tempo
        agendamentos_de_amanha = Agendamento.objects.filter(
            data_hora_inicio__gte=inicio_de_amanha,
            data_hora_inicio__lte=fim_de_amanha,
            status='Confirmado'
        ).select_related('paciente')

        if not agendamentos_de_amanha.exists():
            self.stdout.write(self.style.WARNING('Nenhum agendamento confirmado para amanhã. Nenhuma ação necessária.'))
            return

        # 3. Itera sobre os agendamentos e envia um email para cada um
        total_enviado = 0
        for agendamento in agendamentos_de_amanha:
            paciente = agendamento.paciente
            if paciente.email: # Apenas envia se o paciente tiver um email cadastrado
                
                hora_local = timezone.localtime(agendamento.data_hora_inicio)
                data_formatada = hora_local.strftime('%d/%m/%Y')
                hora_formatada = hora_local.strftime('%H:%M')

                assunto = f"Lembrete de Consulta - Clínica Limalé"
                mensagem = f"""
                Olá, {paciente.nome_completo}!

                Este é um lembrete da sua consulta amanhã, dia {data_formatada} às {hora_formatada}.

                Se precisar reagendar, por favor, entre em contato.

                Atenciosamente,
                Clínica Limalé
                """
                
                try:
                    send_mail(
                        subject=assunto,
                        message=mensagem,
                        from_email=None,  # Usa o DEFAULT_FROM_EMAIL do settings.py
                        recipient_list=[paciente.email],
                        fail_silently=False,
                    )
                    self.stdout.write(self.style.SUCCESS(f'Email enviado para: {paciente.email}'))
                    total_enviado += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Falha ao enviar email para {paciente.email}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'Processo concluído. Total de {total_enviado} emails enviados.'))