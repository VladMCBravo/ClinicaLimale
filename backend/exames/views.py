import os
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
    Vincula automaticamente ao Paciente com Tríplice Trava de Segurança.
    """
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [AllowAny]  # <--- ADICIONE ISTO para desativar o JWT aqui
    
    def post(self, request, *args, **kwargs):
        # --- NOVA TRAVA DE SEGURANÇA DO ROBÔ ---
        token_enviado = request.headers.get('X-Api-Key')
        chave_secreta = os.getenv('ROBO_WORKLIST_TOKEN')

        if not chave_secreta or token_enviado != chave_secreta:
            return Response(
                {"erro": "Chave de segurança inválida. Acesso negado ao Robô."}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        # ---------------------------------------

        nome_pasta = request.data.get('nome_pasta_original')
        nome_paciente_enviado = request.data.get('nome_paciente', '').strip() 
        data_str = request.data.get('data_exame') 
        id_enviado = request.data.get('agendamento_id') # Pode ser ID do Paciente ou ID do Agendamento
        files = request.FILES.getlist('arquivos') 

        if not nome_pasta or not data_str or not nome_paciente_enviado:
            return Response({'erro': 'Dados incompletos'}, status=status.HTTP_400_BAD_REQUEST)

        paciente_encontrado = None

        # -----------------------------------------------------------------
        # TRAVA 1: BUSCA DIRETA PELO ID DO PACIENTE (Novo Formato Samsung)
        # Ex: "181_FERNANDA DE OLIVEIRA" -> ID enviado = 181
        # -----------------------------------------------------------------
        if id_enviado and str(id_enviado).isdigit():
            paciente_por_id = Paciente.objects.filter(id=id_enviado).first()
            if paciente_por_id:
                # Validação de segurança extra: confere se o primeiro nome bate para evitar erro humano de digitação
                primeiro_nome_enviado = nome_paciente_enviado.split()[0].upper() if nome_paciente_enviado else ""
                primeiro_nome_banco = paciente_por_id.nome_completo.split()[0].upper()
                
                # Se o ID bater E pelo menos o primeiro nome tiver semelhança, confirma!
                if primeiro_nome_enviado in primeiro_nome_banco or primeiro_nome_banco in primeiro_nome_enviado:
                    paciente_encontrado = paciente_por_id

        # -----------------------------------------------------------------
        # TRAVA 2: BUSCA PELO AGENDAMENTO (Formato Antigo Samsung)
        # Confere se o agendamento pertence REALMENTE à paciente da pasta
        # -----------------------------------------------------------------
        if not paciente_encontrado and id_enviado and str(id_enviado).isdigit():
            try:
                agendamento = Agendamento.objects.select_related('paciente').filter(id=id_enviado).first()
                if agendamento and agendamento.paciente:
                    # Confere se o nome da paciente do agendamento é compatível com o nome da pasta
                    nome_agendamento = agendamento.paciente.nome_completo.upper()
                    primeiro_nome_pasta = nome_paciente_enviado.split()[0].upper()
                    
                    if primeiro_nome_pasta in nome_agendamento:
                        paciente_encontrado = agendamento.paciente
                    else:
                        print(f"⚠️ AVISO: Agendamento {id_enviado} pertence a {nome_agendamento}, mas pasta veio como {nome_paciente_enviado}. Vínculo por agendamento rejeitado por segurança!")
            except Exception as e:
                print(f"Erro ao validar agendamento: {e}")

        # -----------------------------------------------------------------
        # TRAVA 3: BUSCA RIGOROSA POR NOME COMPLETO (Último Recurso)
        # -----------------------------------------------------------------
        if not paciente_encontrado and nome_paciente_enviado:
            # Limpa números e traços do início (Ex: "08072026-1_DE ARAUJO_TATIANE APARECIDA" -> "DE ARAUJO TATIANE APARECIDA")
            nome_limpo = re.sub(r'^[0-9-]+\s*_?', '', nome_paciente_enviado).replace('_', ' ').strip()
            
            # 1. Tenta nome exato (Iexact)
            pacientes = Paciente.objects.filter(nome_completo__iexact=nome_limpo)
            if pacientes.exists():
                paciente_encontrado = pacientes.first()
            else:
                # 2. Se for nome invertido (Ex: "DE ARAUJO TATIANE APARECIDA" vs "TATIANE APARECIDA DE ARAUJO")
                termos = [t for t in nome_limpo.split() if len(t) > 2] # Ignora de, da, do
                if len(termos) >= 2:
                    query = Paciente.objects.all()
                    for termo in termos:
                        query = query.filter(nome_completo__icontains=termo)
                    
                    if query.count() == 1: # Só aceita se a combinação dos termos achar EXATAMENTE 1 paciente único!
                        paciente_encontrado = query.first()

        # -----------------------------------------------------------------
        # PROCESSAMENTO DO EXAME E CRIAÇÃO DO REGISTRO (CORRIGIDO)
        # -----------------------------------------------------------------
        ciclo_ativo = None
        if paciente_encontrado:
            ciclo_ativo = Ciclo.objects.filter(
                paciente=paciente_encontrado, 
                status='ativo'
            ).order_by('-data_inicio').first()

        exame = None
        created = False

        if paciente_encontrado:
            # 1. INTELIGÊNCIA DE DEDUPLICAÇÃO: 
            # Verifica se já existe um exame para esse paciente HOJE 
            # (Isso captura o exame "Vazio" gerado pelo Laudo do médico)
            exame_existente = Exame.objects.filter(
                paciente=paciente_encontrado,
                data_exame=data_str
            ).first()

            if exame_existente:
                exame = exame_existente
                
                # Se o exame reaproveitado for o "Vazio" do Laudo, 
                # atualizamos o nome para o nome real da pasta para manter integridade com o S3
                if "- L" in exame.nome_paciente_pasta:
                    exame.nome_paciente_pasta = nome_pasta
                    exame.save()

        # 2. Se não encontrou nenhum exame para o paciente hoje (ou se ainda não achou paciente)
        if not exame:
            exame, created = Exame.objects.get_or_create(
                nome_paciente_pasta=nome_pasta,
                data_exame=data_str,
                defaults={
                    'paciente': paciente_encontrado,
                    'status': 'DISPONIVEL' if paciente_encontrado else 'PENDENTE',
                    'ciclo': ciclo_ativo
                }
            )

        count_imgs = 0
        for f in files:
            ext = f.name.lower().split('.')[-1]
            # Extrai apenas o nome original sem a extensão e sem os pontos
            nome_base = os.path.splitext(f.name)[0] 
            
            tipo = 'IMAGEM'
            if ext in ['mp4', 'avi', 'mov', 'mkv']: tipo = 'VIDEO'
            elif ext in ['pdf']: tipo = 'LAUDO'
            
            # Agora verificamos apenas pelo nome base do arquivo, ignorando a extensão e hashes
            if not ArquivoExame.objects.filter(exame=exame, arquivo__icontains=nome_base).exists():
                ArquivoExame.objects.create(exame=exame, arquivo=f, tipo=tipo)
                count_imgs += 1

        return Response({
            'status': 'sucesso',
            'exame_id': exame.id,
            'acao': 'criado' if created else 'atualizado',
            'arquivos_novos': count_imgs,
            'paciente_vinculado': paciente_encontrado.nome_completo if paciente_encontrado else "PENDENTE_VINCULO_MANUAL"
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
            # Trocado de HTTP_403_FORBIDDEN para HTTP_401_UNAUTHORIZED
            return Response({'erro': 'Credenciais inválidas ou exame não encontrado.'}, status=status.HTTP_401_UNAUTHORIZED)

        # 4. MONTA A LINHA DO TEMPO COMPLETA DO PACIENTE (AGRUPAMENTO INTELIGENTE)
        historico = []
        datas_com_laudo = set() # Memória para saber quais dias já têm laudo

        # A) Busca apenas laudos válidos (ignora os que foram cancelados por correção)
        laudos = Laudo.objects.filter(
            paciente=paciente_encontrado
        ).exclude(status='CANCELADO_POR_RETIFICACAO').order_by('-data_criacao')
        
        for laudo in laudos:
            arquivos_data = []
            urls_adicionadas = set() # Evita duplicar fotos na tela

            # Adiciona o PDF do texto da médica
            if laudo.arquivo_pdf:
                arquivos_data.append({'id': f"pdf_{laudo.id}", 'tipo': 'LAUDO', 'url': laudo.arquivo_pdf.url})
            
            # Descobre a data correta deste laudo
            data_do_laudo = laudo.data_criacao.date()
            if hasattr(laudo, 'exame') and laudo.exame and laudo.exame.data_exame:
                data_do_laudo = laudo.exame.data_exame
                
            datas_com_laudo.add(data_do_laudo)

            # MÁGICA: Busca as pastas de imagens da Samsung por DATA, e não pela trava do banco
            exames_do_dia = Exame.objects.filter(paciente=paciente_encontrado, data_exame=data_do_laudo)
            for ex in exames_do_dia:
                for arq in ex.arquivos.all():
                    # Garante que a foto só apareça uma vez no carrossel
                    if arq.arquivo.url not in urls_adicionadas:
                        arquivos_data.append({'id': arq.id, 'tipo': arq.tipo, 'url': arq.arquivo.url})
                        urls_adicionadas.add(arq.arquivo.url)

            # Cria o bloco visual perfeito (Separado por exame e médico)
            historico.append({
                'id': f"L_{laudo.id}",
                'data_exame': laudo.data_criacao.strftime('%Y-%m-%dT%H:%M:%S'),
                'titulo': laudo.titulo_exame or "Laudo Médico",
                'medico': laudo.medico_responsavel or (laudo.medico.get_full_name() if laudo.medico else "Clínica Limalé"),
                'arquivos': arquivos_data
            })

        # B) Exames "soltos" (Se o robô subir fotos num dia em que a médica não fez laudo)
        exames_soltos = Exame.objects.filter(
            paciente=paciente_encontrado, status='DISPONIVEL'
        ).exclude(data_exame__in=datas_com_laudo)
        
        for exame in exames_soltos:
            arquivos_data = []
            for arq in exame.arquivos.all():
                arquivos_data.append({'id': arq.id, 'tipo': arq.tipo, 'url': arq.arquivo.url})
            
            if arquivos_data:
                data_str = exame.data_exame.strftime('%Y-%m-%dT%H:%M:%S') if hasattr(exame.data_exame, 'strftime') else f"{exame.data_exame}T00:00:00"
                historico.append({
                    'id': f"E_{exame.id}",
                    'data_exame': data_str,
                    'titulo': "Imagens de Exame (Sem Laudo)",
                    'medico': "Equipe Técnica",
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
    Fornece os dados do dia para o script local.
    Protegido manualmente por uma Chave de Segurança Customizada.
    """
    permission_classes = [AllowAny]
    authentication_classes = [] 

    def get(self, request):
        token_enviado = request.headers.get('X-Api-Key')
        
        # Puxa a senha do ambiente (Variável de Ambiente do Render)
        CHAVE_SECRETA_LIMALE = os.getenv('ROBO_WORKLIST_TOKEN')

        if not CHAVE_SECRETA_LIMALE or token_enviado != CHAVE_SECRETA_LIMALE:
            return Response(
                {"erro": "Chave de segurança inválida ou ausente."}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        # 4. Se a chave estiver correta, processa e envia os pacientes do dia
        hoje = timezone.now().date()
        agendamentos = Agendamento.objects.filter(
            data_hora_inicio__date=hoje
        ).select_related('paciente', 'especialidade', 'medico')

        dados = []
        for agn in agendamentos:
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
    POST: O script local bate aqui para avisar que está vivo.
    GET: O React bate aqui para checar se o robô respondeu nos últimos minutos.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Salva o timestamp do sinal de vida com tempo limite de 6 minutos
        cache.set('robo_ultimo_heartbeat', timezone.now(), timeout=360)
        # Se o robô voltou a mandar sinal de vida, limpamos o último erro registrado
        cache.delete('robo_ultimo_erro')
        return Response({'status': 'vivo'}, status=status.HTTP_200_OK)

    def get(self, request):
        ultimo_ping = cache.get('robo_ultimo_heartbeat')
        ultimo_erro = cache.get('robo_ultimo_erro')
        
        if not ultimo_ping:
            return Response({
                'online': False, 
                'erro': ultimo_erro or 'Sem atividade registrada nas últimas horas.'
            })
        
        # Como o script local roda a cada 1 minuto, se ele ficar mais de 3 minutos (180s) sem bater, está offline
        diferenca_segundos = (timezone.now() - ultimo_ping).total_seconds()
        
        if diferenca_segundos > 180:
            return Response({
                'online': False, 
                'erro': ultimo_erro or 'Tempo limite de resposta do robô excedido (Timeout).'
            })
            
        return Response({'online': True})


class ReportErrorView(APIView):
    """
    Recebe alertas de erro do script local quando algo dá errado na sincronização.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        nome_pasta = request.data.get('nome_pasta_original', 'Pasta Desconhecida')
        erro_msg = request.data.get('erro_msg', 'Erro desconhecido')[:200] 

        # 1. Guarda no cache para o React ler no topo do alerta vermelho instantaneamente
        cache.set('robo_ultimo_erro', f"{nome_pasta}: {erro_msg}", timeout=1800) # Expira em 30 min

        # 2. Salva o registro no banco de dados para o histórico do painel
        Exame.objects.create(
            nome_paciente_pasta=f"{nome_pasta} | ERRO: {erro_msg}",
            data_exame=timezone.now().date(),
            status='ERRO'
        )

        return Response({'status': 'erro_registrado'}, status=status.HTTP_201_CREATED)
