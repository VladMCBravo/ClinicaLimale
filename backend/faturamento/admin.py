# backend/faturamento/admin.py

from django.contrib import admin
from .models import Pagamento, CategoriaDespesa, Despesa, Convenio, PlanoConvenio, Procedimento 

# Registra os três modelos para que apareçam na interface do Admin
admin.site.register(Pagamento)
admin.site.register(CategoriaDespesa)
admin.site.register(Despesa)
admin.site.register(Convenio)
admin.site.register(PlanoConvenio)
admin.site.register(Procedimento)