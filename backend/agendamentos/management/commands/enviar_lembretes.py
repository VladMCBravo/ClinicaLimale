# agendamentos/management/commands/enviar_lembretes.py

# --- SEÇÃO DE IMPORTAÇÕES ---
import os
import requests
from datetime import timedelta, datetime, time
from django.core.management.base import BaseCommand
from django.utils import timezone
from agendamentos.models import Agendamento

class Command(BaseCommand):
    help = 'Verifica agendamentos para o próximo dia e envia lembretes via WhatsApp.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS(f"[{timezone.localtime().strftime('%d/%m %H:%M')}] Iniciando o envio de lembretes..."))
        
        # --- LÓGICA DE DATA ROBUSTA ---
        agora = timezone.localtime(timezone.now())
        amanha = agora.date() + timedelta(days=1)
        inicio_de_amanha = timezone.make_aware(datetime.combine(amanha, time.min))
        fim_de_amanha = timezone.make_aware(datetime.combine(amanha, time.max))

        # --- BUSCA AGENDAMENTOS ---
        agendamentos_para_lembrar = Agendamento.objects.filter(
            data_hora_inicio__gte=inicio_de_amanha,
            data_hora_inicio__lte=fim_de_amanha,
            status__in=['Agendado', 'Confirmado'] # Busca ambos os status
        ).select_related('paciente') # Otimiza a busca do paciente

        if not agendamentos_para_lembrar.exists():
            self.stdout.write(self.style.WARNING('Nenhum agendamento encontrado para amanhã.'))
            return

        # --- CONFIGURAÇÃO DA API DE WHATSAPP ---
        # A URL deve ser configurada nas suas variáveis de ambiente no Render
        WEBHOOK_URL = os.getenv('WHATSAPP_LEMBRETE_WEBHOOK') 
        
        if not WEBHOOK_URL:
            self.stdout.write(self.style.ERROR("ERRO: A variável de ambiente WHATSAPP_LEMBRETE_WEBHOOK não está configurada."))
            return

        total_enviado = 0
        for agendamento in agendamentos_para_lembrar:
            paciente = agendamento.paciente
            
            if not paciente.telefone_celular:
                self.stdout.write(self.style.NOTICE(f"  - Pulando Ag. ID {agendamento.id}: Paciente {paciente.nome_completo} sem telefone."))
                continue

            hora_formatada = timezone.localtime(agendamento.data_hora_inicio).strftime('%H:%M')
            
            # --- MENSAGEM DE LEMBRETE ---
            mensagem = (
                f"Olá, {paciente.nome_completo.split(' ')[0]}! Tudo bem?\n\n"
                f"Passando para lembrar do seu agendamento na Clínica Limalé amanhã, às *{hora_formatada}*.\n\n"
                "Caso precise reagendar ou cancelar, basta responder a esta mensagem.\n\n"
                "Atenciosamente,\nEquipe Limalé"
            )
            
            # O payload (corpo da requisição) pode variar dependendo da sua API (WAHA, Meta, etc.)
            # Este é um exemplo comum:
            payload = {
                "chatId": f"{paciente.telefone_celular}@c.us", # O sufixo pode variar
                "message": mensagem
            }
            
            try:
                # Dispara a mensagem para a API de WhatsApp
                response = requests.post(WEBHOOK_URL, json=payload, timeout=15)
                response.raise_for_status() # Lança um erro se a resposta for 4xx ou 5xx
                
                self.stdout.write(self.style.SUCCESS(f"  - Lembrete enviado para {paciente.nome_completo} (Ag. ID {agendamento.id})."))
                total_enviado += 1
            except requests.exceptions.RequestException as e:
                self.stdout.write(self.style.ERROR(f"  - Falha ao enviar para {paciente.nome_completo}: {e}"))

        self.stdout.write(self.style.SUCCESS(f'Processo concluído. Total de {total_enviado} lembretes enviados.'))