from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from .models import Exame, ArquivoExame
from pacientes.models import Paciente
from datetime import datetime

class UploadExameView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        nome_pasta = request.data.get('nome_paciente')
        data_str = request.data.get('data_exame') 
        files = request.FILES.getlist('arquivos') 

        if not nome_pasta or not data_str:
            return Response({'erro': 'Dados incompletos'}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Tenta achar o paciente (CORRIGIDO PARA nome_completo)
        paciente_encontrado = None
        
        # Busca simples
        candidatos = Paciente.objects.filter(nome_completo__icontains=nome_pasta.split('_')[-1].strip())
        if candidatos.exists():
            paciente_encontrado = candidatos.first()

        # 3. Cria o Exame
        exame = Exame.objects.create(
            paciente=paciente_encontrado,
            data_exame=data_str,
            nome_paciente_pasta=nome_pasta,
            status='DISPONIVEL' if paciente_encontrado else 'PENDENTE'
        )

        # 4. Salva os Arquivos
        count_imgs = 0
        for f in files:
            tipo = 'VIDEO' if f.name.lower().endswith(('.mp4', '.avi', '.mov')) else 'IMAGEM'
            if f.name.lower().endswith('.pdf'): tipo = 'LAUDO'
            
            ArquivoExame.objects.create(exame=exame, arquivo=f, tipo=tipo)
            count_imgs += 1

        return Response({
            'status': 'sucesso',
            'exame_id': exame.id,
            'arquivos_salvos': count_imgs,
            # --- A CORREÇÃO É AQUI EMBAIXO ---
            # Antes estava .nome, agora é .nome_completo
            'paciente_vinculado': paciente_encontrado.nome_completo if paciente_encontrado else None
        }, status=status.HTTP_201_CREATED)