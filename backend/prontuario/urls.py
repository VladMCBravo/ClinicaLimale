# backend/prontuario/urls.py - VERSÃO CORRIGIDA E ORGANIZADA

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EvolucaoListCreateAPIView, 
    PrescricaoListCreateAPIView, 
    AnamneseDetailAPIView,
    AtestadoListCreateAPIView,
    DocumentoPacienteViewSet  # Importamos o ViewSet apenas uma vez
)

# 1. Criamos um roteador para lidar com o DocumentoPacienteViewSet
router = DefaultRouter()

# 2. Registramos a rota 'documentos/' no roteador. 
# Ele vai criar automaticamente as URLs para listar, criar, deletar, etc.
router.register(r'documentos', DocumentoPacienteViewSet, basename='documento-paciente')


# 3. Listamos as rotas para as suas views que NÃO são ViewSets
# Note que os caminhos são relativos (não contêm mais 'pacientes/<int:paciente_id>/')
urlpatterns = [
    path('evolucoes/', EvolucaoListCreateAPIView.as_view(), name='lista-evolucoes'),
    path('prescricoes/', PrescricaoListCreateAPIView.as_view(), name='lista-prescricoes'),
    path('anamnese/', AnamneseDetailAPIView.as_view(), name='detalhe-anamnese'),
    path('atestados/', AtestadoListCreateAPIView.as_view(), name='lista-atestados'),
]

# 4. Adicionamos as URLs que o roteador gerou ('documentos/') à nossa lista
urlpatterns += router.urls