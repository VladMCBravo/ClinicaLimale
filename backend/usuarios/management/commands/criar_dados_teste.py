from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from usuarios.models import Especialidade, JornadaDeTrabalho
from datetime import time

User = get_user_model()

class Command(BaseCommand):
    help = 'Cria dados de teste para médicos, especialidades e jornadas'

    def handle(self, *args, **options):
        # Criar especialidades
        especialidades_data = [
            {'nome': 'Cardiologia', 'valor_consulta': 150.00},
            {'nome': 'Ginecologia', 'valor_consulta': 120.00},
            {'nome': 'Neonatologia', 'valor_consulta': 180.00},
            {'nome': 'Obstetrícia', 'valor_consulta': 140.00},
            {'nome': 'Ortopedia', 'valor_consulta': 130.00},
            {'nome': 'Pediatria', 'valor_consulta': 110.00},
            {'nome': 'Reumatologia Pediátrica', 'valor_consulta': 160.00},
        ]

        for esp_data in especialidades_data:
            especialidade, created = Especialidade.objects.get_or_create(
                nome=esp_data['nome'],
                defaults={'valor_consulta': esp_data['valor_consulta']}
            )
            if created:
                self.stdout.write(f'Especialidade criada: {especialidade.nome}')

        # Criar médicos
        medicos_data = [
            {'username': 'dr_cardio', 'first_name': 'João', 'last_name': 'Silva', 'especialidade': 'Cardiologia'},
            {'username': 'dra_gineco', 'first_name': 'Maria', 'last_name': 'Santos', 'especialidade': 'Ginecologia'},
            {'username': 'dr_neo', 'first_name': 'Pedro', 'last_name': 'Costa', 'especialidade': 'Neonatologia'},
            {'username': 'dra_obst', 'first_name': 'Ana', 'last_name': 'Lima', 'especialidade': 'Obstetrícia'},
            {'username': 'dr_orto', 'first_name': 'Carlos', 'last_name': 'Oliveira', 'especialidade': 'Ortopedia'},
            {'username': 'dra_ped', 'first_name': 'Lucia', 'last_name': 'Ferreira', 'especialidade': 'Pediatria'},
            {'username': 'dr_reuma', 'first_name': 'Roberto', 'last_name': 'Alves', 'especialidade': 'Reumatologia Pediátrica'},
        ]

        for medico_data in medicos_data:
            medico, created = User.objects.get_or_create(
                username=medico_data['username'],
                defaults={
                    'first_name': medico_data['first_name'],
                    'last_name': medico_data['last_name'],
                    'cargo': 'medico',
                    'email': f"{medico_data['username']}@clinica.com"
                }
            )
            
            if created:
                medico.set_password('123456')
                medico.save()
                self.stdout.write(f'Médico criado: {medico.get_full_name()}')

            # Adicionar especialidade
            especialidade = Especialidade.objects.get(nome=medico_data['especialidade'])
            medico.especialidades.add(especialidade)

            # Criar jornadas de trabalho (Segunda a Sexta, 8h às 18h)
            for dia in range(5):  # 0-4 (Segunda a Sexta)
                jornada, created = JornadaDeTrabalho.objects.get_or_create(
                    medico=medico,
                    dia_da_semana=dia,
                    defaults={
                        'hora_inicio': time(8, 0),
                        'hora_fim': time(18, 0),
                        'intervalo_consulta': 20,
                        'ativo': True
                    }
                )
                if created:
                    self.stdout.write(f'Jornada criada: {medico.get_full_name()} - {jornada.get_dia_da_semana_display()}')

        self.stdout.write(self.style.SUCCESS('Dados de teste criados com sucesso!'))