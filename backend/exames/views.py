from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from .models import Exame, ArquivoExame
from pacientes.models import Paciente
from crm.models import Ciclo # <--- IMPORTANTE
from django.db.models import Q
from datetime import datetime
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from rest_framework.generics import ListAPIView, UpdateAPIView
from .serializers import ExameSerializer
import boto3
from django.conf import settings
from prontuario.models import Laudo
import re  # Para ajudar a limpar os números do nome da pasta

class UploadExameView(APIView):
    """
    Recebe arquivos da máquina de USG ou Recepção.
    Vincula automaticamente ao Paciente e ao Ciclo do CRM (Gestação).
    """
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request, *args, **kwargs):
        # --- ALTERAÇÃO AQUI ---
        # Tenta pegar o nome original da pasta (enviado pelo novo script), 
        # se não vier, usa o nome do paciente como fallback.
        nome_pasta = request.data.get('nome_pasta_original') or request.data.get('nome_paciente')
        
        data_str = request.data.get('data_exame') 
        files = request.FILES.getlist('arquivos') 

        if not nome_pasta or not data_str:
            return Response({'erro': 'Dados incompletos'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. BUSCA INTELIGENTE DA PACIENTE
        paciente_encontrado = None
        # NOVO: Remove os números e traços do início (ex: "11022026-5_ARAUJO" vira "ARAUJO")
        nome_limpo = re.sub(r'^[0-9-]+\s*_?', '', nome_pasta).replace('_', ' ').strip()
        
        # Tenta busca exata
        pacientes = Paciente.objects.filter(nome_completo__iexact=nome_limpo)
        
        if not pacientes.exists():
            # Tenta busca por partes do nome (Primeiro e Último)
            termos = nome_limpo.split()
            if len(termos) >= 1:
                query = Paciente.objects.filter(nome_completo__icontains=termos[0])
                if len(termos) > 1:
                    query = query.filter(nome_completo__icontains=termos[-1])
                pacientes = query

        if pacientes.exists():
            paciente_encontrado = pacientes.first()

        # 2. BUSCA DO CICLO ATIVO NO CRM (O Segredo do Pré-Natal)
        ciclo_ativo = None
        if paciente_encontrado:
            # Pega o ciclo ativo mais recente (Ex: Gestação atual)
            ciclo_ativo = Ciclo.objects.filter(
                paciente=paciente_encontrado, 
                status='ativo'
            ).order_by('-data_inicio').first()

        # 3. CRIAÇÃO DO EXAME
        exame = Exame.objects.create(
            paciente=paciente_encontrado,
            data_exame=data_str,
            nome_paciente_pasta=nome_pasta,
            status='DISPONIVEL' if paciente_encontrado else 'PENDENTE',
            ciclo=ciclo_ativo # <--- AQUI ESTÁ A MÁGICA
        )
        # --- A PONTE MÁGICA PARA APARECER NO HISTÓRICO ---
        if paciente_encontrado:
            Laudo.objects.create(
                paciente=paciente_encontrado,
                exame=exame,
                titulo_exame=f"Exames Anexados (Auto): {nome_limpo}",
                status='FINALIZADO'
            )

        # 4. SALVAMENTO DOS ARQUIVOS
        count_imgs = 0
        for f in files:
            # Detecção simples de tipo
            ext = f.name.lower().split('.')[-1]
            tipo = 'IMAGEM'
            if ext in ['mp4', 'avi', 'mov', 'mkv']: tipo = 'VIDEO'
            elif ext in ['pdf']: tipo = 'LAUDO'
            
            ArquivoExame.objects.create(exame=exame, arquivo=f, tipo=tipo)
            count_imgs += 1

        return Response({
            'status': 'sucesso',
            'exame_id': exame.id,
            'arquivos_salvos': count_imgs,
            'paciente_vinculado': paciente_encontrado.nome_completo if paciente_encontrado else "NÃO VINCULADO",
            'crm_vinculado': f"Ciclo {ciclo_ativo.tipo}" if ciclo_ativo else "Sem ciclo ativo"
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
    """ 
    Lista TODOS os exames que estão 'soltos' (sem paciente vinculado).
    Usado pelo ModalVincularExame no Frontend.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ExameSerializer

    def get_queryset(self):
        # ANTES (ERRADO): Filtrava por paciente_id (retornava exames JÁ vinculados)
        # return Exame.objects.filter(paciente_id=paciente_id)...
        
        # AGORA (CORRETO): Retorna apenas quem NÃO tem paciente (paciente__isnull=True)
        return Exame.objects.filter(paciente__isnull=True).order_by('-data_exame')

class ListarExamesDoPacienteView(ListAPIView):
    """ Lista exames de um paciente específico (para o Prontuário/Laudos) """
    permission_classes = [IsAuthenticated]
    serializer_class = ExameSerializer

    def get_queryset(self):
        paciente_id = self.request.query_params.get('paciente_id')
        if paciente_id:
            return Exame.objects.filter(paciente_id=paciente_id).order_by('-data_exame')
        return Exame.objects.none()

class VincularPacienteView(APIView):
    """ Ação final do botão de vincular """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        exame = get_object_or_404(Exame, pk=pk)
        paciente_id = request.data.get('paciente_id')
        
        if not paciente_id:
            return Response({'erro': 'ID do paciente necessário'}, status=status.HTTP_400_BAD_REQUEST)

        paciente = get_object_or_404(Paciente, pk=paciente_id)
        
        exame.paciente = paciente
        exame.status = 'DISPONIVEL'
        exame.save()
        
        # --- A PONTE MÁGICA DO VÍNCULO MANUAL ---
        Laudo.objects.get_or_create(
            exame=exame,
            defaults={
                'paciente': paciente,
                'titulo_exame': f"Exames Anexados (Manual): {exame.nome_paciente_pasta}",
                'status': 'FINALIZADO'
            }
        )
        
        return Response({'status': 'vínculo realizado', 'paciente': paciente.nome_completo})

# --- CORREÇÃO 3: RESGATE COM DUPLA VERIFICAÇÃO DE PASTA ---
class ResgatarPorNomeView(APIView):
    def get(self, request, exame_id):
        try:
            exame = Exame.objects.get(id=exame_id)
        except Exame.DoesNotExist:
            return Response({'erro': 'Exame não encontrado'}, status=404)

        if not exame.paciente:
            return Response({'erro': 'Selecione um paciente antes de resgatar.'}, status=400)

        # Termos de busca (Ignora palavras pequenas)
        termos_busca = [p.lower() for p in exame.paciente.nome_completo.split() if len(p) > 2]
        
        # Configura cliente S3
        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            region_name='us-east-1'
        )
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        
        ano = exame.data_exame.strftime('%Y')
        mes = exame.data_exame.strftime('%m')
        
        # PROCURA NOS DOIS LUGARES: Onde deveria estar e onde foi parar errado
        pastas_possiveis = [
            f"laudos_imagens/{ano}/{mes}/", # Caminho Correto
            f"{ano}/{mes}/"                 # Caminho Antigo/Errado (2026 solto)
        ]
        
        arquivos_encontrados = []
        
        for prefixo in pastas_possiveis:
            try:
                response = s3.list_objects_v2(Bucket=bucket_name, Prefix=prefixo)
                if 'Contents' in response:
                    for item in response['Contents']:
                        caminho_arquivo = item['Key']
                        nome_lower = caminho_arquivo.lower()
                        
                        # Verifica se algum termo do nome do paciente está no arquivo
                        match = False
                        for termo in termos_busca:
                            if termo in nome_lower:
                                match = True
                                break
                        
                        if match:
                            # Evita duplicar se já vinculou
                            if not ArquivoExame.objects.filter(arquivo=caminho_arquivo).exists():
                                tipo = 'VIDEO' if caminho_arquivo.endswith(('.mp4', '.avi')) else 'IMAGEM'
                                if caminho_arquivo.endswith('.pdf'): tipo = 'LAUDO'

                                ArquivoExame.objects.create(exame=exame, arquivo=caminho_arquivo, tipo=tipo)
                                arquivos_encontrados.append(caminho_arquivo)
            except Exception as e:
                print(f"Erro ao ler pasta {prefixo}: {e}")

        if arquivos_encontrados:
            exame.status = 'DISPONIVEL'
            exame.save()
            return Response({'msg': f'Resgatados {len(arquivos_encontrados)} arquivos!', 'arquivos': arquivos_encontrados})
        
        return Response({'msg': 'Nenhum arquivo novo encontrado.', 'locais_verificados': pastas_possiveis})