from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    # Adiciona o campo 'cargo' aos formulários do admin
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('cargo',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('cargo',)}),
    )

admin.site.register(CustomUser, CustomUserAdmin)