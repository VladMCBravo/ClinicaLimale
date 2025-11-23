# backend/integracao_dicom/views.py
import os
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics 
from pacientes.models import Paciente 
from .models import ExameDicom
from datetime import datetime
from .serializers import ExameDicomSerializer 

# --- CORREÇÃO APLICADA AQUI ---
# Tenta pegar a variável de ambiente (Render). Se não existir, usa o padrão local.
ORTHANC_API_URL = os.getenv('ORTHANC_API_URL', 'http://192.168.0.4:8042')
ORTHANC_USER = os.getenv('ORTHANC_USER', 'admin')
ORTHANC_PASSWORD = os.getenv('ORTHANC_PASSWORD', 'password')
ORTHANC_AUTH = (ORTHANC_USER, ORTHANC_PASSWORD)

class ExamesDicomPorPacienteView(generics.ListAPIView):
    """
    View para listar todos os exames DICOM de um paciente específico.
    """
    serializer_class = ExameDicomSerializer

    def get_queryset(self):
        """
        Filtra exames pelo ID do paciente.
        """
        paciente_id = self.kwargs['paciente_id']
        return ExameDicom.objects.filter(paciente__id=paciente_id).order_by('-study_date')

class OrthancNotificationView(APIView):
    # Webhook que recebe aviso do Orthanc
    authentication_classes = [] 
    permission_classes = []

    def post(self, request, *args, **kwargs):
        study_id = request.data.get('StudyID') or request.data.get('ID') # Orthanc as vezes manda como 'ID'
        
        if not study_id:
            # Tenta ler tags DICOM se o ID não vier direto
            return Response({"error": "StudyID não fornecido"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Buscar detalhes do estudo na API do Orthanc
        try:
            # Aqui usamos a URL dinâmica configurada acima
            response = requests.get(
                f"{ORTHANC_API_URL}/studies/{study_id}",
                auth=ORTHANC_AUTH,
                timeout=10 # Timeout para não travar se o Orthanc estiver offline
            )
            response.raise_for_status()
            study_data = response.json()

            main_tags = study_data.get('MainDicomTags', {})
            patient_tags = study_data.get('PatientMainDicomTags', {})

            # Tenta pegar o ID. Se vier vazio, loga o erro.
            patient_id_from_dicom = patient_tags.get('PatientID')
            if not patient_id_from_dicom:
                 return Response({"error": "DICOM sem PatientID"}, status=status.HTTP_400_BAD_REQUEST)

            study_description = main_tags.get('StudyDescription', 'Exame sem descrição')

            # Formatar a data do estudo
            study_date_str = main_tags.get('StudyDate')
            study_time_str = main_tags.get('StudyTime', '000000')
            
            if study_date_str:
                study_datetime = datetime.strptime(f"{study_date_str}{study_time_str.split('.')[0]}", '%Y%m%d%H%M%S')
            else:
                study_datetime = datetime.now()

        except requests.RequestException as e:
            print(f"Erro de conexão com Orthanc: {e}") # Log no terminal
            return Response({"error": f"Falha ao comunicar com o Orthanc: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

        # 2. Encontrar o paciente no banco de dados
        # A Lógica do CPF que conversamos antes pode ser aplicada aqui no futuro
        try:
            # Remove pontos e traços se for CPF
            clean_id = ''.join(filter(str.isdigit, patient_id_from_dicom))
            
            # Tenta buscar por ID interno ou CPF (ajuste conforme seu model Paciente)
            # Exemplo: paciente = Paciente.objects.get(cpf=clean_id)
            paciente = Paciente.objects.get(id=clean_id) # Supondo ID numérico por enquanto
            
        except (Paciente.DoesNotExist, ValueError):
            return Response({"error": f"Paciente com ID '{patient_id_from_dicom}' não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        # 3. Criar o registro
        exame, created = ExameDicom.objects.update_or_create(
            orthanc_study_id=study_id,
            defaults={
                'paciente': paciente,
                'study_description': study_description,
                'study_date': study_datetime,
            }
        )

        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response({"status": "Processado", "exame_id": exame.id}, status=status_code)