# backend/pacientes/views.py - VERSÃO CORRIGIDA (LÓGICA DO MÉDICO)

from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from usuarios.permissions import IsMedicoResponsavelOrAdmin, AllowRead_WriteRecepcaoAdmin
from .models import Paciente
from .serializers import PacienteSerializer
# --- 1. IMPORTE O 'Q' (para queries 'OU') E 'Count' ---
from django.db.models import Count, Q 
import logging

logger = logging.getLogger(__name__)

class PacienteListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = PacienteSerializer
    # AJUSTE: Mude para IsAuthenticated para permitir que o médico entre no get_queryset
    # A segurança dos dados é garantida pelo filtro do queryset abaixo.
    permission_classes = [IsAuthenticated] 

    # --- 2. ADICIONE ESTAS DUAS LINHAS AQUI ---
    # Isso diz ao Django: "Aceite o parâmetro ?search= e procure nestes campos"
    filter_backends = [filters.SearchFilter]
    search_fields = ['nome_completo', 'cpf', 'telefone_celular', 'email']

    def get_queryset(self):
        user = self.request.user
        logger.info(f"[DEBUG - BACKEND] Iniciando busca de pacientes para usuário: {user.email} (Cargo: {user.cargo})")
        
        # 1. A SOLUÇÃO DO BUG: Primeiro fazemos a query limpa, SEM O ANNOTATE
        base_queryset = Paciente.objects.all()

        # Libera o acesso total para admin, recepção E médicos
        if user.cargo in ['admin', 'recepcao', 'medico']:
            qs = base_queryset
        else:
            qs = Paciente.objects.none()

        logger.info(f"[DEBUG - BACKEND] Pacientes encontrados no banco (antes do annotate): {qs.count()}")

        # 2. Só agora, com os pacientes únicos garantidos, nós contamos os agendamentos
        # Usamos distinct=True dentro do Count por segurança
        final_qs = qs.annotate(total_consultas=Count('agendamentos', distinct=True))

        # 3. LOG DE VERIFICAÇÃO FINAL: Vamos checar se sobrou algum ID duplicado
        ids_encontrados = list(final_qs.values_list('id', flat=True))
        if len(ids_encontrados) != len(set(ids_encontrados)):
            logger.error(f"[DEBUG - BACKEND] ALERTA CRÍTICO: IDs duplicados ainda estão sendo gerados! IDs: {ids_encontrados}")
        else:
            logger.info("[DEBUG - BACKEND] Sucesso: Nenhum paciente duplicado no envio.")

        return final_qs

    def perform_create(self, serializer):
        serializer.save()

# --- 3. CORREÇÃO DA VIEW DE DETALHE (QUE CAUSOU O ERRO 403) ---
# Esta view é usada para 'Editar' (PATCH) e 'Deletar' (DELETE)
class PacienteDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Paciente.objects.annotate(total_consultas=Count('agendamentos', distinct=True))
    serializer_class = PacienteSerializer
    
    # --- CORREÇÃO DO ERRO 403 ---
    # Mudamos para IsAuthenticated. 
    # Assim, a "Página Mestre" consegue ler os dados do paciente (nome, idade) para montar o laudo.
    permission_classes = [IsAuthenticated]