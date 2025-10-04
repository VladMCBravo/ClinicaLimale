# integracao_dicom/views.py
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics # <-- 1. IMPORTE O 'generics'
from pacientes.models import Paciente 
from .models import ExameDicom
from datetime import datetime
from .serializers import ExameDicomSerializer # <-- 2. IMPORTE O NOVO SERIALIZER


# Idealmente, coloque isso nas suas settings
ORTHANC_API_URL = 'http://localhost:8042'
ORTHANC_AUTH = ('admin', 'password') # Lembre-se de usar variáveis de ambiente!

# --- 3. ADICIONE ESTA NOVA VIEW ABAIXO ---
class ExamesDicomPorPacienteView(generics.ListAPIView):
    """
    View para listar todos os exames DICOM de um paciente específico.
    """
    serializer_class = ExameDicomSerializer

    def get_queryset(self):
        """
        Este método filtra o queryset para retornar apenas os exames
        do paciente cujo ID foi passado na URL.
        """
        paciente_id = self.kwargs['paciente_id']
        return ExameDicom.objects.filter(paciente__id=paciente_id).order_by('-study_date')

class OrthancNotificationView(APIView):
    # No futuro, adicione permissões para garantir que só o Orthanc chame este endpoint.
    authentication_classes = [] 
    permission_classes = []

    def post(self, request, *args, **kwargs):
        study_id = request.data.get('StudyID')
        if not study_id:
            return Response({"error": "StudyID não fornecido"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Buscar detalhes do estudo na API do Orthanc
        try:
            response = requests.get(
                f"{ORTHANC_API_URL}/studies/{study_id}",
                auth=ORTHANC_AUTH
            )
            response.raise_for_status()
            study_data = response.json()

            main_tags = study_data.get('MainDicomTags', {})
            patient_tags = study_data.get('PatientMainDicomTags', {})

            patient_id_from_dicom = patient_tags.get('PatientID')
            study_description = main_tags.get('StudyDescription', '')

            # Formatar a data do estudo
            study_date_str = main_tags.get('StudyDate')
            study_time_str = main_tags.get('StudyTime', '000000')
            study_datetime = datetime.strptime(f"{study_date_str}{study_time_str.split('.')[0]}", '%Y%m%d%H%M%S')

        except requests.RequestException as e:
            return Response({"error": f"Falha ao comunicar com o Orthanc: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

        # 2. Encontrar o paciente no seu banco de dados
        try:
            # Supondo que o ID do paciente no seu sistema é o mesmo que está no ultrassom
            paciente = Paciente.objects.get(id_paciente_clinica=patient_id_from_dicom)
        except Paciente.DoesNotExist:
            return Response({"error": f"Paciente com ID '{patient_id_from_dicom}' não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        # 3. Criar o registro do exame, evitando duplicatas
        exame, created = ExameDicom.objects.update_or_create(
            orthanc_study_id=study_id,
            defaults={
                'paciente': paciente,
                'study_description': study_description,
                'study_date': study_datetime,
            }
        )

        if created:
            return Response({"status": "Exame criado com sucesso", "exame_id": exame.id}, status=status.HTTP_201_CREATED)
        else:
            return Response({"status": "Exame já existia e foi atualizado", "exame_id": exame.id}, status=status.HTTP_200_OK)