# chatbot/views.py - VERSÃO FINAL PADRONIZADA

import re
import mercadopago
from django.conf import settings
from rest_framework.views import APIView
from rest_framework import generics # Importamos generics para views de lista
from rest_framework.response import Response
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
    REFATORADO: A view principal de criação de agendamento agora aceita
    tanto 'Consulta' quanto 'Procedimento', seguindo as mesmas regras do sistema.
    """
    permission_classes = [HasAPIKey]

    def post(self, request):
        dados = request.data
        cpf_paciente = dados.get('cpf')

        try:
            paciente = Paciente.objects.get(cpf=re.sub(r'\D', '', cpf_paciente))
            data_hora_inicio = timezone.datetime.fromisoformat(dados.get('data_hora_inicio'))
            data_hora_fim = data_hora_inicio + timedelta(minutes=50)
        except Paciente.DoesNotExist:
            return Response({'error': f'Paciente com CPF {cpf_paciente} não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        except (ValueError, TypeError):
            return Response({'error': 'Formato de data inválido ou ausente.'}, status=status.HTTP_400_BAD_REQUEST)

        # Monta a base do agendamento
        dados_agendamento = {
            'paciente': paciente.id,
            'data_hora_inicio': data_hora_inicio,
            'data_hora_fim': data_hora_fim,
            'status': 'Agendado',
            'tipo_atendimento': 'Particular',
            'expira_em': timezone.now() + timedelta(minutes=15),
            'tipo_agendamento': dados.get('tipo_agendamento')
        }

        # Lógica condicional: preenche os dados dependendo do tipo
        if dados.get('tipo_agendamento') == 'Consulta':
            dados_agendamento['especialidade'] = dados.get('especialidade_id')
            dados_agendamento['medico'] = dados.get('medico_id')
            dados_agendamento['modalidade'] = dados.get('modalidade', 'Presencial') # Padrão para Presencial
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

            agendamento_services.criar_agendamento_e_pagamento_pendente(agendamento, usuario_servico)
            
            return Response({'sucesso': "Agendamento criado com sucesso!", 'agendamento_id': agendamento.id}, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

     
     # --- VIEWS DE PAGAMENTO (sem alterações) ---   
class GerarPixView(APIView):
    permission_classes = [HasAPIKey]
    def post(self, request):
        agendamento_id = request.data.get('agendamento_id')
        if not agendamento_id:
            return Response({'error': 'agendamento_id é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            agendamento = Agendamento.objects.get(id=agendamento_id)
            pagamento = Pagamento.objects.get(agendamento=agendamento)
        except (Agendamento.DoesNotExist, Pagamento.DoesNotExist):
            return Response({'error': 'Agendamento ou Pagamento não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        
        sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)
        notification_url = request.build_absolute_uri('/api/chatbot/pagamentos/webhook/')

        # --- CORREÇÃO APLICADA AQUI ---
        # Define a descrição com base no tipo de agendamento
        if agendamento.tipo_agendamento == 'Consulta' and agendamento.especialidade:
            description = f"Pagamento para consulta: {agendamento.especialidade.nome}"
        elif agendamento.tipo_agendamento == 'Procedimento' and agendamento.procedimento:
            description = f"Pagamento para procedimento: {agendamento.procedimento.descricao}"
        else:
            description = "Pagamento de agendamento na Clínica Limalé" # Fallback
        # --- FIM DA CORREÇÃO ---

        payment_data = {
            "transaction_amount": float(pagamento.valor),
            "description": description, # <-- USA A DESCRIÇÃO CORRIGIDA
            "payment_method_id": "pix",
            "payer": {
                "email": agendamento.paciente.email,
                "first_name": agendamento.paciente.nome_completo.split(' ')[0],
            },
            "notification_url": notification_url,
        }
        payment_response = sdk.payment().create(payment_data)
        payment = payment_response["response"]

        if payment_response["status"] == 201:
            pagamento.id_transacao_externa = str(payment['id'])
            pagamento.save()
            qr_code = payment['point_of_interaction']['transaction_data']['qr_code']
            qr_code_base64 = payment['point_of_interaction']['transaction_data']['qr_code_base64']
            return Response({
                "agendamento_id": agendamento.id,
                "status": "pix_gerado",
                "qr_code_texto": qr_code,
                "qr_code_imagem": f"data:image/png;base64,{qr_code_base64}"
            })
        else:
            return Response(payment_response, status=status.HTTP_400_BAD_REQUEST)

class MercadoPagoWebhookView(APIView):
    def post(self, request):
        query_params = request.query_params
        if query_params.get("type") == "payment":
            payment_id = query_params.get("data.id")
            sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)
            payment_info = sdk.payment().get(payment_id)
            if payment_info["status"] == 200:
                payment_data = payment_info["response"]
                try:
                    pagamento = Pagamento.objects.get(id_transacao_externa=str(payment_data["id"]))
                    if payment_data["status"] == "approved" and pagamento.agendamento.status == "Agendado":
                        pagamento.status = 'Pago'
                        pagamento.save()
                        agendamento = pagamento.agendamento
                        agendamento.status = 'Confirmado'
                        agendamento.save()
                except Pagamento.DoesNotExist:
                    pass
        return Response(status=status.HTTP_200_OK)

