# chatbot/views.py - VERSÃO FINAL PADRONIZADA

import re
import logging # <-- 1. IMPORTAÇÃO ADICIONADA
from dateutil import parser
from django.conf import settings
from rest_framework.views import APIView
from rest_framework import generics # Importamos generics para views de lista
from rest_framework.response import Response

# 2. CRIAÇÃO DO LOGGER
logger = logging.getLogger(__name__)

from rest_framework import status
from rest_framework_api_key.permissions import HasAPIKey
from .models import ChatMemory

# --- IMPORTAÇÕES ---
from pacientes.models import Paciente
from faturamento.models import Procedimento, Pagamento
from agendamentos.serializers import AgendamentoWriteSerializer
from agendamentos.models import Agendamento
from datetime import datetime, time, timedelta
from django.utils import timezone
from usuarios.models import CustomUser, Especialidade # Importamos Especialidade
from pacientes.serializers import PacienteSerializer
from agendamentos import services as agendamento_services
# --- NOVO: Serializers que vamos precisar ---
from usuarios.serializers import EspecialidadeSerializer, UserSerializer

class ChatMemoryView(APIView):
    permission_classes = [HasAPIKey]
    def get(self, request, session_id):
        try:
            chat = ChatMemory.objects.get(session_id=session_id)
            return Response({
                'state': chat.state,
                'memoryData': chat.memory_data
            })
        except ChatMemory.DoesNotExist:
            # Retorna um estado inicial para novos usuários
            return Response({
                'state': 'inicio',
                'memoryData': []
            })
    def post(self, request):
        session_id = request.data.get('sessionId')
        memory_data = request.data.get('memoryData')
        state = request.data.get('state')

        if not session_id or memory_data is None:
            return Response(
                {'error': 'sessionId e memoryData são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- MUDANÇA DE LÓGICA PARA GARANTIR O SALVAMENTO ---
        # 1. Busca o objeto. Se não existir, cria um novo.
        obj, created = ChatMemory.objects.get_or_create(session_id=session_id)

        # 2. Atualiza os campos do objeto na memória com os novos dados.
        obj.memory_data = memory_data
        obj.state = state

        # 3. Salva explicitamente as mudanças no banco de dados.
        obj.save()
        # ----------------------------------------------------

        # Retorna o objeto que foi salvo, no mesmo formato do GET.
        return Response({
            'state': obj.state,
            'memoryData': obj.memory_data
        }, status=status.HTTP_200_OK)

# ... (CadastrarPacienteView e ConsultarAgendamentosPacienteView não mudam) ...
class CadastrarPacienteView(APIView):
    permission_classes = [HasAPIKey]
    def post(self, request):
        cpf = request.data.get('cpf')
        email = request.data.get('email')
        if cpf:
            cpf = re.sub(r'\D', '', cpf)
        if Paciente.objects.filter(cpf=cpf).exists():
            return Response({'error': 'Um paciente com este CPF já está cadastrado.'}, status=status.HTTP_409_CONFLICT)
        if Paciente.objects.filter(email=email).exists():
            return Response({'error': 'Um paciente com este email já está cadastrado.'}, status=status.HTTP_409_CONFLICT)
        serializer = PacienteSerializer(data=request.data)
        if serializer.is_valid():
            paciente = serializer.save()
            return Response(
                {'sucesso': f"Paciente {paciente.nome_completo} cadastrado com sucesso!", "paciente_id": paciente.id},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ConsultarAgendamentosPacienteView(APIView):
    permission_classes = [HasAPIKey]
    def get(self, request):
        cpf = request.query_params.get('cpf')
        if cpf:
            cpf = re.sub(r'\D', '', cpf)
        if not cpf:
            return Response({'error': 'O parâmetro "cpf" é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            paciente = Paciente.objects.get(cpf=cpf)
            agendamentos = Agendamento.objects.filter(paciente=paciente).order_by('-data_hora_inicio')
            dados_formatados = [
                {
                    "id": ag.id,
                    "data_hora": timezone.localtime(ag.data_hora_inicio).strftime('%d/%m/%Y às %H:%M'),
                    "status": ag.status,
                    "procedimento": ag.procedimento.descricao if ag.procedimento else "Não especificado"
                }
                for ag in agendamentos
            ]
            return Response(dados_formatados)
        except Paciente.DoesNotExist:
            return Response({"error": "Paciente com este CPF não encontrado."}, status=status.HTTP_404_NOT_FOUND)

class VerificarPacienteView(APIView):
    permission_classes = [HasAPIKey]
    def get(self, request):
        telefone = request.query_params.get('telefone')
        if not telefone:
            return Response({'error': 'O parâmetro "telefone" é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            paciente = Paciente.objects.get(telefone_celular=telefone)
            return Response({"status": "paciente_encontrado", "paciente_id": paciente.id, "nome_completo": paciente.nome_completo})
        except Paciente.DoesNotExist:
            return Response({"status": "paciente_nao_encontrado"}, status=status.HTTP_404_NOT_FOUND)

class VerificarSegurancaView(APIView):
    permission_classes = [HasAPIKey]
    def post(self, request):
        telefone = request.data.get('telefone_celular')
        cpf = request.data.get('cpf')
        if cpf:
            cpf = re.sub(r'\D', '', cpf)
        if not telefone or not cpf:
            return Response({'error': 'Os campos "telefone_celular" e "cpf" são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)
        paciente_existe = Paciente.objects.filter(telefone_celular=telefone, cpf=cpf).exists()
        if paciente_existe:
            return Response({"status": "verificado"})
        else:
            return Response({"status": "dados_nao_conferem"}, status=status.HTTP_403_FORBIDDEN)
        
# --- NOVAS VIEWS PARA DAR INTELIGÊNCIA AO CHATBOT ---

class ListarEspecialidadesView(generics.ListAPIView):
    """
    NOVO: Endpoint para o N8N buscar a lista de especialidades disponíveis
    e seus respectivos valores de consulta particular.
    """
    permission_classes = [HasAPIKey]
    queryset = Especialidade.objects.all().order_by('nome')
    serializer_class = EspecialidadeSerializer

class ListarMedicosPorEspecialidadeView(generics.ListAPIView):
    """
    NOVO: Endpoint para o N8N buscar os médicos de uma determinada especialidade.
    Exemplo de chamada: /api/chatbot/medicos/?especialidade_id=1
    """
    permission_classes = [HasAPIKey]
    serializer_class = UserSerializer # Reutilizamos o serializer principal de usuário

    def get_queryset(self):
        queryset = CustomUser.objects.filter(cargo='medico', is_active=True)
        especialidade_id = self.request.query_params.get('especialidade_id')
        if especialidade_id:
            queryset = queryset.filter(especialidades__id=especialidade_id)
        return queryset

# --- VIEWS EXISTENTES QUE SERÃO REFATORADAS ---

class ListarProcedimentosView(generics.ListAPIView): # Mudamos para generics.ListAPIView para padronizar
    """
    REFATORADO: Endpoint para listar procedimentos, que já existia.
    """
    permission_classes = [HasAPIKey]
    queryset = Procedimento.objects.filter(valor_particular__gt=0, ativo=True).exclude(descricao__iexact='consulta')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        dados_formatados = [
            {"id": proc.id, "nome": proc.descricao, "valor": f"{proc.valor_particular:.2f}".replace('.', ',')}
            for proc in queryset
        ]
        return Response(dados_formatados)


# ########################################################################## #
# ################ INÍCIO DA SEÇÃO MODIFICADA ################################ #
# ########################################################################## #

class ConsultarHorariosDisponiveisView(APIView):
    """
    SUPER-REFATORADO: Agora a view é proativa. Se nenhuma data for fornecida,
    ela procura o próximo dia com horários disponíveis automaticamente.
    """
    permission_classes = [HasAPIKey]

    def _buscar_horarios_no_dia(self, data_desejada, medico_id):
        """
        Método auxiliar com marcadores de depuração para investigar
        porque não estão a ser encontrados horários.
        """
        print(f"\n--- INICIANDO BUSCA PARA DATA: {data_desejada}, MEDICO_ID: {medico_id} ---")

        # 1. Define os parâmetros da agenda
        horario_inicio_dia = time(8, 0)
        horario_fim_dia = time(18, 0)
        duracao_consulta_min = 50
        intervalo_min = 10

        # 2. Busca os agendamentos existentes no dia
        agendamentos_no_dia = Agendamento.objects.filter(
            data_hora_inicio__date=data_desejada
        ).exclude(status='Cancelado')

        if medico_id:
            agendamentos_no_dia = agendamentos_no_dia.filter(medico_id=medico_id)

        # 3. Cria um conjunto de horários já ocupados
        horarios_ocupados = {timezone.localtime(ag.data_hora_inicio).time() for ag in agendamentos_no_dia}
        print(f"Horários já ocupados neste dia: {horarios_ocupados}")

        # 4. Gera horários do dia
        tz = timezone.get_current_timezone()
        horario_atual = timezone.make_aware(datetime.combine(data_desejada, horario_inicio_dia), tz)
        fim_do_dia = timezone.make_aware(datetime.combine(data_desejada, horario_fim_dia), tz)
        
        horarios_disponiveis = []
        
        agora = timezone.localtime(timezone.now())
        print(f"Hora atual do servidor (agora): {agora.strftime('%Y-%m-%d %H:%M:%S')}")
        if data_desejada == agora.date() and horario_atual < agora:
            horario_atual = agora
            print(f"Ajustando horário de início para agora: {horario_atual.strftime('%H:%M')}")
            if horario_atual.minute % 5 != 0:
                minutos_para_adicionar = 5 - (horario_atual.minute % 5)
                horario_atual += timedelta(minutes=minutos_para_adicionar)
                print(f"Arredondando horário de início para: {horario_atual.strftime('%H:%M')}")

        print(f"Loop de horários: De {horario_atual.strftime('%H:%M')} até {fim_do_dia.strftime('%H:%M')}")

        while horario_atual < fim_do_dia:
            print(f"  -> Verificando slot: {horario_atual.strftime('%H:%M')}")
            if horario_atual.time() not in horarios_ocupados:
                horarios_disponiveis.append(horario_atual.strftime('%H:%M'))
                print(f"    => Slot ADICIONADO. Lista agora tem {len(horarios_disponiveis)} horários.")
            
            horario_atual += timedelta(minutes=duracao_consulta_min + intervalo_min)

        print(f"--- FIM DA BUSCA. Total de horários encontrados: {len(horarios_disponiveis)} ---")
        return horarios_disponiveis

    def get(self, request):
        # ... (O resto do método get continua exatamente igual ao que lhe enviei antes)
        medico_id = request.query_params.get('medico_id')
        data_str = request.query_params.get('data')

        if data_str:
            try:
                data_desejada = datetime.strptime(data_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Formato de data inválido. Use AAAA-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
            
            horarios = self._buscar_horarios_no_dia(data_desejada, medico_id)
            return Response({"data": data_str, "horarios_disponiveis": horarios})
        else:
            data_atual = timezone.localdate()
            for i in range(90):
                data_a_verificar = data_atual + timedelta(days=i)
                horarios = self._buscar_horarios_no_dia(data_a_verificar, medico_id)
                
                if horarios:
                    return Response({
                        "data": data_a_verificar.strftime('%Y-%m-%d'),
                        "horarios_disponiveis": horarios
                    })
            
            return Response({"data": None, "horarios_disponiveis": []})

# ########################################################################## #
# ################# FIM DA SEÇÃO MODIFICADA ################################## #
# ########################################################################## #


class AgendamentoChatbotView(APIView):
    """
    REFATORADO: A view principal de criação de agendamento agora retorna
    os dados do PIX diretamente na sua resposta, eliminando a necessidade de uma segunda chamada.
    """
    permission_classes = [HasAPIKey]

    def post(self, request):
        dados = request.data
        logger.warning("[DIAGNÓSTICO] Dados recebidos do N8N: %s", dados)
        
        metodo_pagamento = dados.get('metodo_pagamento_escolhido', 'PIX')
        logger.warning("[DIAGNÓSTICO] Método de pagamento escolhido: %s", metodo_pagamento)
        
        cpf_paciente = dados.get('cpf')
        try:
            paciente = Paciente.objects.get(cpf=re.sub(r'\D', '', cpf_paciente))
            data_hora_inicio_str = dados.get('data_hora_inicio')
            if not data_hora_inicio_str:
                raise ValueError("data_hora_inicio está ausente")
            data_hora_inicio = parser.isoparse(data_hora_inicio_str)
            data_hora_fim = data_hora_inicio + timedelta(minutes=50)
        except Paciente.DoesNotExist:
            return Response({'error': f'Paciente com CPF {cpf_paciente} não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        except (ValueError, TypeError, parser.ParserError):
            return Response({'error': 'Formato de data inválido ou ausente.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Monta a base do agendamento
        dados_agendamento = {
            'paciente': paciente.id,
            'data_hora_inicio': data_hora_inicio,
            'data_hora_fim': data_hora_fim,
            'status': 'Agendado',
            'tipo_atendimento': 'Particular',
            'tipo_agendamento': dados.get('tipo_agendamento')
        }

        # Lógica condicional (sem alterações)
        if dados.get('tipo_agendamento') == 'Consulta':
            dados_agendamento['especialidade'] = dados.get('especialidade_id')
            dados_agendamento['medico'] = dados.get('medico_id')
            dados_agendamento['modalidade'] = dados.get('modalidade', 'Presencial')
        elif dados.get('tipo_agendamento') == 'Procedimento':
            dados_agendamento['procedimento'] = dados.get('procedimento_id')
        else:
            return Response({'error': "O campo 'tipo_agendamento' ('Consulta' ou 'Procedimento') é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = AgendamentoWriteSerializer(data=dados_agendamento)
        if serializer.is_valid():
            agendamento = serializer.save()
            
            try:
                usuario_servico = CustomUser.objects.get(username='servico_chatbot')
            except CustomUser.DoesNotExist:
                usuario_servico = CustomUser.objects.filter(is_superuser=True).first()

            # Passa o método de pagamento para o serviço
            agendamento_services.criar_agendamento_e_pagamento_pendente(
                agendamento, 
                usuario_servico,
                metodo_pagamento_escolhido=metodo_pagamento,
                initiated_by_chatbot=True  # <-- ADICIONE ESTE PARÂMETRO
            )
            
            # --- CORREÇÃO PRINCIPAL AQUI ---
            # Recarrega o objeto 'agendamento' com os dados mais recentes do banco de dados,
            # incluindo a relação com o 'pagamento' que o serviço acabou de criar.
            agendamento.refresh_from_db()
            # --------------------------------

            # Agora, a lógica de resposta vai funcionar
            pagamento_associado = agendamento.pagamento
            dados_pagamento = {}

            if hasattr(pagamento_associado, 'pix_copia_e_cola') and pagamento_associado.pix_copia_e_cola:
                dados_pagamento['tipo'] = 'PIX'
                dados_pagamento['pix_copia_e_cola'] = pagamento_associado.pix_copia_e_cola
                dados_pagamento['pix_qr_code_imagem'] = pagamento_associado.pix_qr_code_base64
            elif hasattr(pagamento_associado, 'link_pagamento') and pagamento_associado.link_pagamento:
                dados_pagamento['tipo'] = 'CartaoCredito'
                dados_pagamento['link'] = pagamento_associado.link_pagamento

            resposta_final = {
                'sucesso': "Agendamento criado! Realize o pagamento para confirmar.", 
                'agendamento_id': agendamento.id,
                'pagamento_id': pagamento_associado.id if pagamento_associado else None,
                'dados_pagamento': dados_pagamento
            }
            
            return Response(resposta_final, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)