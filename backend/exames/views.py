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
from django.core.cache import cache
from prontuario.models import Laudo
import re  # Para ajudar a limpar os números do nome da pasta
# --- NOVAS IMPORTAÇÕES PARA O WORKLIST ---
from django.utils import timezone
from agendamentos.models import Agendamento

class UploadExameView(APIView):
    """
    Recebe arquivos da máquina de USG ou Recepção.
    Vincula automaticamente ao Paciente e ao Ciclo do CRM (Gestação).
    """
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request, *args, **kwargs):
        # O script local envia essas 3 variáveis
        nome_pasta = request.data.get('nome_pasta_original')
        nome_paciente_enviado = request.data.get('nome_paciente') # Ex: "RAFAELA" ou "145 RAFAELA"
        data_str = request.data.get('data_exame') 
        files = request.FILES.getlist('arquivos') 

        if not nome_pasta or not data_str or not nome_paciente_enviado:
            return Response({'erro': 'Dados incompletos'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. BUSCA INTELIGENTE DA PACIENTE (Com suporte a ID)
        paciente_encontrado = None
        
        # A) Tenta achar o ID no começo do nome enviado (Ex: "145 RAFAELA" -> Pega o 145)
        id_match = re.search(r'^(\d+)[\s_]', nome_paciente_enviado)
        if id_match:
            paciente_encontrado = Paciente.objects.filter(id=id_match.group(1)).first()

        # B) Se não usaram ID na máquina, faz a busca pelo texto normal (Fallback)
        if not paciente_encontrado:
            nome_limpo = re.sub(r'^[0-9-]+\s*_?', '', nome_paciente_enviado).replace('_', ' ').strip()
            pacientes = Paciente.objects.filter(nome_completo__iexact=nome_limpo)
            
            if not pacientes.exists():
                termos = nome_limpo.split()
                if len(termos) >= 1:
                    query = Paciente.objects.filter(nome_completo__icontains=termos[0])
                    if len(termos) > 1:
                        query = query.filter(nome_completo__icontains=termos[-1])
                    pacientes = query
            
            if pacientes.exists():
                paciente_encontrado = pacientes.first()

        # 2. BUSCA DO CICLO ATIVO NO CRM
        ciclo_ativo = None
        if paciente_encontrado:
            from crm.models import Ciclo
            ciclo_ativo = Ciclo.objects.filter(
                paciente=paciente_encontrado, 
                status='ativo'
            ).order_by('-data_inicio').first()

        # 3. CRIAÇÃO OU RECUPERAÇÃO DO EXAME (Escudo Antiduplicação)
        exame, created = Exame.objects.get_or_create(
            nome_paciente_pasta=nome_pasta,
            data_exame=data_str,
            defaults={
                'paciente': paciente_encontrado,
                'status': 'DISPONIVEL' if paciente_encontrado else 'PENDENTE',
                'ciclo': ciclo_ativo
            }
        )

        # 4. VÍNCULO COM LAUDO (Escudo contra o IntegrityError)
        if paciente_encontrado:
            Laudo.objects.get_or_create(
                exame=exame,
                defaults={
                    'paciente': paciente_encontrado,
                    'titulo_exame': f"Exames Anexados (Auto): {paciente_encontrado.nome_completo}",
                    'status': 'FINALIZADO'
                }
            )

        # 5. SALVAMENTO DOS ARQUIVOS SEM DUPLICAR
        count_imgs = 0
        for f in files:
            ext = f.name.lower().split('.')[-1]
            tipo = 'IMAGEM'
            if ext in ['mp4', 'avi', 'mov', 'mkv']: tipo = 'VIDEO'
            elif ext in ['pdf']: tipo = 'LAUDO'
            
            if not ArquivoExame.objects.filter(exame=exame, arquivo__icontains=f.name).exists():
                ArquivoExame.objects.create(exame=exame, arquivo=f, tipo=tipo)
                count_imgs += 1

        return Response({
            'status': 'sucesso',
            'exame_id': exame.id,
            'acao': 'criado' if created else 'atualizado',
            'arquivos_novos': count_imgs,
            'paciente_vinculado': paciente_encontrado.nome_completo if paciente_encontrado else "NÃO VINCULADO"
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

class AcessarResultadosView(APIView):
    """
    API pública para o paciente acessar seus exames.
    Aceita tanto logins antigos (EX-) quanto novos (PCT-) e retorna a Linha do Tempo completa.
    """
    permission_classes = [AllowAny] 

    def post(self, request):
        codigo = request.data.get('codigo') or request.data.get('codigo_acesso')
        senha = request.data.get('senha') or request.data.get('senha_acesso')

        if not codigo or not senha:
            return Response({'erro': 'Código e senha são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

        from prontuario.models import Laudo
        from exames.models import Exame
        paciente_encontrado = None

        # 1. TENTA ACHA A SENHA NA TABELA NOVA (Laudos - Senha Única)
        laudo_match = Laudo.objects.filter(codigo_acesso__iexact=codigo, senha_acesso=senha).first()
        if laudo_match and laudo_match.paciente:
            paciente_encontrado = laudo_match.paciente
        
        # 2. SE NÃO ACHOU, TENTA NA TABELA ANTIGA (Exames)
        if not paciente_encontrado:
            exame_match = Exame.objects.filter(codigo_acesso__iexact=codigo, senha_acesso=senha).first()
            if exame_match and exame_match.paciente:
                paciente_encontrado = exame_match.paciente

        # 3. SE AINDA NÃO ACHOU, BARRA O ACESSO
        if not paciente_encontrado:
            return Response({'erro': 'Credenciais inválidas ou exame não encontrado.'}, status=status.HTTP_403_FORBIDDEN)

        # 4. MONTA A LINHA DO TEMPO COMPLETA DO PACIENTE
        historico = []
        exames_ja_listados = set() # Evita duplicar fotos que já estão dentro do laudo

        # A) Pega todos os laudos finalizados
        laudos = Laudo.objects.filter(paciente=paciente_encontrado).order_by('-data_criacao')
        for laudo in laudos:
            arquivos_data = []
            if laudo.arquivo_pdf:
                arquivos_data.append({'id': f"pdf_{laudo.id}", 'tipo': 'LAUDO', 'url': laudo.arquivo_pdf.url})
            
            # Puxa as imagens se tiver um exame de ultrassom amarrado
            if hasattr(laudo, 'exame') and laudo.exame:
                exames_ja_listados.add(laudo.exame.id)
                for arq in laudo.exame.arquivos.all():
                    arquivos_data.append({'id': arq.id, 'tipo': arq.tipo, 'url': arq.arquivo.url})

            historico.append({
                'id': f"L_{laudo.id}",
                'data_exame': laudo.data_criacao.strftime('%Y-%m-%dT%H:%M:%S'),
                'titulo': laudo.titulo_exame or "Laudo Médico",
                'medico': laudo.medico_responsavel or (laudo.medico.get_full_name() if laudo.medico else "Clínica Limalé"),
                'arquivos': arquivos_data
            })

        # B) Pega exames antigos "soltos" (que o robô subiu mas não tem laudo em texto)
        exames_soltos = Exame.objects.filter(paciente=paciente_encontrado, status='DISPONIVEL').exclude(id__in=exames_ja_listados)
        for exame in exames_soltos:
            arquivos_data = []
            for arq in exame.arquivos.all():
                arquivos_data.append({'id': arq.id, 'tipo': arq.tipo, 'url': arq.arquivo.url})
            
            if arquivos_data:
                # Trata formatação caso a data venha como string ou Date
                data_str = exame.data_exame.strftime('%Y-%m-%dT%H:%M:%S') if hasattr(exame.data_exame, 'strftime') else f"{exame.data_exame}T00:00:00"
                historico.append({
                    'id': f"E_{exame.id}",
                    'data_exame': data_str,
                    'titulo': "Imagens de Exame (Sem Laudo)",
                    'medico': "Clínica Limalé",
                    'arquivos': arquivos_data
                })

        # C) Ordena tudo do mais recente para o mais antigo
        historico.sort(key=lambda x: x['data_exame'], reverse=True)

        return Response({
            'paciente': paciente_encontrado.nome_completo,
            'historico': historico
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
    
class UltimosExamesEnviadosView(APIView):
    """ Retorna os últimos 10 exames enviados pelo robô para alimentar a luz verde no Front """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Pega os 10 exames mais recentes
        # ADICIONADO select_related para matar o problema N+1
        ultimos_exames = Exame.objects.select_related('paciente').all().order_by('-criado_em')[:10]
        
        dados = []
        for e in ultimos_exames:
            dados.append({
                'id': e.id,
                'nome_pasta': e.nome_paciente_pasta,
                'paciente': e.paciente.nome_completo if e.paciente else 'Desconhecido',
                'data_envio': e.criado_em.strftime('%d/%m %H:%M'),
                'status': e.status
            })
            
        return Response(dados, status=status.HTTP_200_OK)

# --- NOVA VIEW: ALIMENTAÇÃO DO DICOM WORKLIST ---
class WorklistDataView(APIView):
    """
    Fornece os dados do dia para o script local (gerar_worklist.py)
    criar a lista de pacientes no ultrassom (DICOM Worklist).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoje = timezone.now().date()
        # Filtramos agendamentos de hoje (ajuste o filtro de status/especialidade se necessário)
        agendamentos = Agendamento.objects.filter(
            data_hora_inicio__date=hoje
        ).select_related('paciente', 'especialidade', 'medico')

        dados = []
        for agn in agendamentos:
            # Validação para não quebrar caso não exista médico vinculado
            medico_nome = agn.medico.get_full_name() if agn.medico else ""
            
            dados.append({
                "agendamento_id": agn.id,
                "paciente_id": agn.paciente.id,
                "paciente_nome": agn.paciente.nome_completo,
                "paciente_nascimento": agn.paciente.data_nascimento.strftime('%Y%m%d') if agn.paciente.data_nascimento else "",
                "paciente_sexo": getattr(agn.paciente, 'sexo', getattr(agn.paciente, 'genero', 'O')),
                "data_exame": agn.data_hora_inicio.strftime('%Y%m%d'),
                "medico_nome": medico_nome
            })
        
        return Response(dados)

# --- NOVAS VIEWS PARA O ROBÔ DE SINCRONIZAÇÃO (HEARTBEAT E ERROS) ---

class HeartbeatView(APIView):
    """
    Controla o status "Online/Offline" do Robô da Clínica.
    POST: O script local bate aqui a cada 3 minutos para avisar que está vivo.
    GET: O React bate aqui para checar se o robô respondeu nos últimos 5 minutos.
    """
    permission_classes = [AllowAny] # Permite o script bater sem token complexo

    def post(self, request):
        # Salva a data/hora atual no cache do Django
        cache.set('robo_ultimo_heartbeat', timezone.now(), timeout=None)
        return Response({'status': 'vivo'}, status=status.HTTP_200_OK)

    def get(self, request):
        ultimo_ping = cache.get('robo_ultimo_heartbeat')
        
        # Se nunca bateu ou o servidor reiniciou
        if not ultimo_ping:
            return Response({'online': False})
        
        # Calcula a diferença de tempo (Limite de tolerância: 5 minutos / 300 segundos)
        diferenca_segundos = (timezone.now() - ultimo_ping).total_seconds()
        
        if diferenca_segundos > 300:
            return Response({'online': False})
            
        return Response({'online': True})


class ReportErrorView(APIView):
    """
    Recebe alertas de erro do script local quando uma pasta não consegue subir.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        nome_pasta = request.data.get('nome_pasta_original', 'Pasta Desconhecida')
        # Limita o tamanho da mensagem para não quebrar o banco
        erro_msg = request.data.get('erro_msg', 'Erro desconhecido')[:200] 

        # Salva um registro no banco com status ERRO para o React mostrar
        Exame.objects.create(
            nome_paciente_pasta=f"{nome_pasta} | ERRO: {erro_msg}",
            data_exame=timezone.now().date(),
            status='ERRO'
        )

        return Response({'status': 'erro_registrado'}, status=status.HTTP_201_CREATED)