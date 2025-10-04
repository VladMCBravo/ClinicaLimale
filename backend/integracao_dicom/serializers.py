# integracao_dicom/serializers.py

from rest_framework import serializers
from .models import ExameDicom

class ExameDicomSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExameDicom
        # Vamos expor estes campos para o frontend
        fields = [
            'id', 
            'study_description', 
            'study_date', 
            'orthanc_study_id'
        ]