# usuarios/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Especialidade # 1. Importe o novo modelo Especialidade

# 2. Registre o modelo Especialidade para que ele apareça no admin
admin.site.register(Especialidade)

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    
    # Adicionamos 'especialidades' para aparecer na tela de edição do usuário
    fieldsets = UserAdmin.fieldsets + (
        ('Informações Adicionais', {'fields': ('cargo', 'especialidades')}), # 3. Adicione o campo aqui
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('cargo',)}),
    )
    # 4. (Opcional, mas recomendado) Melhora a interface para campos ManyToMany
    filter_horizontal = ('especialidades', 'groups', 'user_permissions',)


# O registro do CustomUser permanece o mesmo, mas agora usará a classe atualizada
admin.site.register(CustomUser, CustomUserAdmin)