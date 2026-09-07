from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import WebPushSubscription

class SubscribePushAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data

        endpoint = data.get('endpoint')
        keys = data.get('keys', {})
        auth = keys.get('auth')
        p256dh = keys.get('p256dh')

        if not all([endpoint, auth, p256dh]):
            return Response({"error": "Dados incompletos"}, status=400)

        # Salva ou atualiza a inscrição do dispositivo
        WebPushSubscription.objects.update_or_create(
            user=user,
            endpoint=endpoint,
            defaults={'auth': auth, 'p256dh': p256dh}
        )

        return Response({"status": "Inscrito com sucesso!"}, status=201)
