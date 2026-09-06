from django.contrib import admin
from django.utils.html import format_html
from .models import ChatRoom, Message, UserPresence

@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'sala_vinculada', 'get_membros_count')
    search_fields = ('name',)
    # Cria aquela interface bacana de duas colunas (Esquerda disponíveis / Direita selecionados)
    filter_horizontal = ('membros',)
    # Como sala_vinculada vem de outro app, usamos raw_id para não travar o carregamento
    raw_id_fields = ('sala_vinculada',)

    def get_membros_count(self, obj):
        return obj.membros.count()
    get_membros_count.short_description = 'Qtd. de Membros (Exclusivos)'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender', 'get_destination', 'attachment_type', 'is_read', 'created_at')
    list_filter = ('attachment_type', 'is_read', 'is_delivered', 'created_at')
    search_fields = (
        'sender__first_name', 'sender__last_name', 'sender__username', 
        'receiver__first_name', 'receiver__username', 
        'room__name', 'content'
    )
    raw_id_fields = ('sender', 'receiver', 'room')
    
    # AUDITORIA: Mostra todos os campos apenas para leitura
    readonly_fields = (
        'sender', 'receiver', 'room', 'content', 
        'attachment_type', 'attachment_id', 
        'is_delivered', 'delivered_at', 
        'is_read', 'read_at', 'created_at'
    )
    
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    def get_destination(self, obj):
        """Mostra de forma visual se a mensagem foi para P2P ou Grupo"""
        if obj.room:
            return format_html('<span style="color: #ef6c00; font-weight: bold;">👥 {}</span>', obj.room.name)
        elif obj.receiver:
            return format_html('<span style="color: #1976d2; font-weight: bold;">👤 {}</span>', obj.receiver.get_full_name() or obj.receiver.username)
        return "Desconhecido"
    get_destination.short_description = 'Destino'

    # AUDITORIA: Bloqueia completamente a edição de mensagens que já existem no banco
    def has_change_permission(self, request, obj=None):
        return False
        
    # AUDITORIA: Bloqueia a criação de mensagens falsas pelo painel admin
    def has_add_permission(self, request):
        return False


@admin.register(UserPresence)
class UserPresenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_online', 'last_seen_formatted')
    list_filter = ('is_online', 'last_seen')
    search_fields = ('user__username', 'user__first_name', 'user__last_name')
    raw_id_fields = ('user',)
    
    def last_seen_formatted(self, obj):
        return obj.last_seen.strftime('%d/%m/%Y %H:%M')
    last_seen_formatted.short_description = 'Última Visualização'