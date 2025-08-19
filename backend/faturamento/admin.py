# backend/faturamento/admin.py

from django.contrib import admin
from .models import Pagamento, CategoriaDespesa, Despesa

# Registra os três modelos para que apareçam na interface do Admin
admin.site.register(Pagamento)
admin.site.register(CategoriaDespesa)
admin.site.register(Despesa)