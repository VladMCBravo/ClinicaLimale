from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from .models import Exame, ArquivoExame
from pacientes.models import Paciente
from datetime import datetime

class UploadExameView(APIView):
    parser_classes = (MultiPartParser, FormParser) # Permite upload de arquivos

    def post(self, request, *args, **kwargs):
        # 1. Recebe os dados básicos
        nome_pasta = request.data.get('nome_paciente')
        data_str = request.data.get('data_exame') # Formato esperado: YYYY-MM-DD
        files = request.FILES.getlist('arquivos') # Lista de arquivos enviados

        if not nome_pasta or not data_str:
            return Response({'erro': 'Dados incompletos'}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Tenta achar o paciente automaticamente (Lógica de Match)
        paciente_encontrado = None
        
        # Busca simples: Pacientes com agendamento no dia ou nome similar
        # (Podemos refinar essa busca depois para ser mais inteligente)
        # Note que mudou de 'nome' para 'nome_completo'
        candidatos = Paciente.objects.filter(nome_completo__icontains=nome_pasta.split('_')[-1].strip())
        if candidatos.exists():
            paciente_encontrado = candidatos.first() # Pega o primeiro match por enquanto

        # 3. Cria o Exame
        exame = Exame.objects.create(
            paciente=paciente_encontrado,
            data_exame=data_str,
            nome_paciente_pasta=nome_pasta,
            status='DISPONIVEL' if paciente_encontrado else 'PENDENTE'
        )

        # 4. Salva os Arquivos no Supabase
        count_imgs = 0
        for f in files:
            # Detecta se é video ou imagem pela extensão
            tipo = 'VIDEO' if f.name.lower().endswith(('.mp4', '.avi', '.mov')) else 'IMAGEM'
            if f.name.lower().endswith('.pdf'): tipo = 'LAUDO'
            
            ArquivoExame.objects.create(exame=exame, arquivo=f, tipo=tipo)
            count_imgs += 1

        return Response({
            'status': 'sucesso',
            'exame_id': exame.id,
            'arquivos_salvos': count_imgs,
            'paciente_vinculado': paciente_encontrado.nome if paciente_encontrado else None
        }, status=status.HTTP_201_CREATED)