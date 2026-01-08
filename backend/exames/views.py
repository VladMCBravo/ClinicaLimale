from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from .models import Exame, ArquivoExame
from pacientes.models import Paciente
from datetime import datetime
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from rest_framework.generics import ListAPIView, UpdateAPIView
from .serializers import ExameSerializer
import boto3
from django.conf import settings

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

class AcessarResultadosView(APIView):
    """
    API pública para o paciente acessar seus exames via Código e Senha.
    """
    permission_classes = [AllowAny] # Garante que não precisa de token

    def post(self, request):
        # 1. Tenta pegar os campos como o Front envia (codigo/senha) 
        #    OU como o banco espera (codigo_acesso/senha_acesso) para garantir.
        codigo = request.data.get('codigo') or request.data.get('codigo_acesso')
        senha = request.data.get('senha') or request.data.get('senha_acesso')

        if not codigo or not senha:
            return Response(
                {'erro': 'Código e senha são obrigatórios.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Busca exame pelo código (case insensitive)
        # O try/except é mais seguro que get_object_or_404 para APIs públicas
        try:
            exame = Exame.objects.get(codigo_acesso__iexact=codigo)
        except Exame.DoesNotExist:
            # Retornar 404 ou 403 genérico para segurança
            return Response({'erro': 'Exame não encontrado ou credenciais inválidas.'}, status=status.HTTP_404_NOT_FOUND)

        # 3. Verifica a senha
        if exame.senha_acesso != senha:
            return Response({'erro': 'Senha incorreta.'}, status=status.HTTP_403_FORBIDDEN)

        # 4. Monta a resposta
        arquivos_data = []
        for arquivo in exame.arquivos.all():
            arquivos_data.append({
                'id': arquivo.id,
                'tipo': arquivo.tipo,
                'url': arquivo.arquivo.url,
            })

        return Response({
            'paciente': exame.paciente.nome_completo if exame.paciente else exame.nome_paciente_pasta,
            'data_exame': exame.data_exame,
            'arquivos': arquivos_data
        })

class ListarExamesPendentesView(ListAPIView):
    """ Lista apenas exames que ainda não têm paciente vinculado """
    permission_classes = [IsAuthenticated] # Apenas staff logado
    serializer_class = ExameSerializer

    def get_queryset(self):
        paciente_id = self.request.query_params.get('paciente_id')
        if paciente_id:
            return Exame.objects.filter(paciente_id=paciente_id).order_by('-data_exame')
        return Exame.objects.none()

# --- AQUI ESTAVA FALTANDO ESSA CLASSE ---
class ListarExamesDoPacienteView(ListAPIView):
    """ 
    Para o MÉDICO (Laudos): Lista exames de um paciente específico.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ExameSerializer

    def get_queryset(self):
        paciente_id = self.request.query_params.get('paciente_id')
        if paciente_id:
            return Exame.objects.filter(paciente_id=paciente_id).order_by('-data_exame')
        return Exame.objects.none()

class VincularPacienteView(APIView):
    """ Recebe o ID do exame e o ID do paciente para fazer o casamento """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        exame = get_object_or_404(Exame, pk=pk)
        paciente_id = request.data.get('paciente_id')
        
        if not paciente_id:
            return Response({'erro': 'ID do paciente necessário'}, status=status.HTTP_400_BAD_REQUEST)

        paciente = get_object_or_404(Paciente, pk=paciente_id)
        
        # Realiza o vínculo
        exame.paciente = paciente
        exame.status = 'DISPONIVEL' # Libera para visualização
        exame.save()
        
        return Response({'status': 'vínculo realizado', 'paciente': paciente.nome_completo})

class ResgatarPorNomeView(APIView):
    """
    VARREDURA POR NOME (CORRIGIDA):
    Busca na pasta do MÊS (ex: 2026/01/) em vez do dia,
    para encontrar arquivos que foram salvos sem a pasta do dia.
    """
    def get(self, request, exame_id):
        try:
            exame = Exame.objects.get(id=exame_id)
        except Exame.DoesNotExist:
            return Response({'erro': 'Exame não encontrado'}, status=404)

        if not exame.paciente:
            return Response({'erro': 'Selecione um paciente no Admin antes.'}, status=400)

        # 1. Termo de busca (Nome)
        partes_nome = exame.paciente.nome_completo.lower().split()
        if len(partes_nome) >= 2:
            termo_busca = f"{partes_nome[0]} {partes_nome[1]}" # ex: "amanda seixas"
        else:
            termo_busca = partes_nome[0]
            
        print(f"--> Buscando: '{termo_busca}'")

        # 2. Conexão Supabase
        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            region_name='us-east-1'
        )

        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        
        # --- CORREÇÃO AQUI ---
        # Removido o dia, agora busca na pasta do mês inteiro
        ano = exame.data_exame.year
        mes = f"{exame.data_exame.month:02d}"
        
        prefixo = f"exames/{ano}/{mes}/" # ex: exames/2026/01/
        
        print(f"--> Pasta Alvo: {prefixo}")

        try:
            response = s3.list_objects_v2(Bucket=bucket_name, Prefix=prefixo)
        except Exception as e:
            return Response({'erro': f'Erro S3: {str(e)}'}, status=500)

        arquivos_vinculados = []
        
        if 'Contents' in response:
            for item in response['Contents']:
                caminho_arquivo = item['Key']
                nome_arquivo_lower = caminho_arquivo.lower()
                
                # Verifica se o nome está no arquivo
                if termo_busca in nome_arquivo_lower:
                    
                    # Evita duplicatas
                    if not ArquivoExame.objects.filter(arquivo=caminho_arquivo).exists():
                        tipo = 'VIDEO' if caminho_arquivo.endswith(('.mp4', '.avi')) else 'IMAGEM'
                        if caminho_arquivo.endswith('.pdf'): tipo = 'LAUDO'

                        ArquivoExame.objects.create(
                            exame=exame,
                            arquivo=caminho_arquivo,
                            tipo=tipo
                        )
                        arquivos_vinculados.append(caminho_arquivo)

        # Atualiza status
        if arquivos_vinculados:
            exame.status = 'DISPONIVEL'
            exame.save()

        return Response({
            'status': 'Sucesso',
            'pasta_buscada': prefixo,
            'termo_usado': termo_busca,
            'arquivos_resgatados': len(arquivos_vinculados),
            'lista': arquivos_vinculados
        })