# usuarios/admin.py

from django.contrib import admin
from django import forms
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Especialidade, JornadaDeTrabalho, CertificadoMedico

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

# --- 2. FORMULÁRIO ESPECIAL PARA O CERTIFICADO ---
# (Isso é necessário para CRIPTOGRAFAR a senha ao salvar pelo Admin)
class CertificadoMedicoForm(forms.ModelForm):
    # Criamos um campo de senha visual que não vai pro banco direto
    senha_para_salvar = forms.CharField(
        label="Senha do Arquivo .p12",
        widget=forms.PasswordInput(attrs={'placeholder': 'Digite a senha do certificado...'}),
        required=False,
        help_text="Preencha apenas se estiver adicionando um novo arquivo ou trocando a senha."
    )

    class Meta:
        model = CertificadoMedico
        fields = '__all__'
        # Escondemos o campo real 'senha_criptografada' para ninguém mexer manualmente
        exclude = ['senha_criptografada'] 

    def save(self, commit=True):
        # Pega o objeto (instância do certificado) sem salvar ainda
        certificado = super().save(commit=False)
        
        # Verifica se o usuário digitou uma senha no campo do formulário
        nova_senha = self.cleaned_data.get('senha_para_salvar')
        
        if nova_senha:
            # AQUI ESTÁ A MÁGICA: Chama o método do model que criptografa
            certificado.set_password(nova_senha)
        
        if commit:
            certificado.save()
        return certificado

# --- 3. REGISTRO NO ADMIN ---
@admin.register(CertificadoMedico)
class CertificadoMedicoAdmin(admin.ModelAdmin):
    form = CertificadoMedicoForm
    list_display = ('medico', 'data_upload', 'status_arquivo')
    search_fields = ('medico__username', 'medico__first_name', 'medico__crm')
    
    # Helper para mostrar na lista se o arquivo existe
    def status_arquivo(self, obj):
        return "✅ Arquivo Presente" if obj.arquivo_p12 else "❌ Pendente"
    status_arquivo.short_description = "Status"


# O registro do CustomUser permanece o mesmo, mas agora usará a classe atualizada
admin.site.register(CustomUser, CustomUserAdmin)

@admin.register(JornadaDeTrabalho)
class JornadaDeTrabalhoAdmin(admin.ModelAdmin):
    list_display = ('medico', 'get_dia_da_semana_display', 'hora_inicio', 'hora_fim')
    list_filter = ('medico', 'dia_da_semana')
    search_fields = ('medico__first_name', 'medico__last_name')
    
    # Melhora a exibição do dia da semana no admin
    def get_dia_da_semana_display(self, obj):
        return obj.get_dia_da_semana_display()
    get_dia_da_semana_display.short_description = 'Dia da Semana'
