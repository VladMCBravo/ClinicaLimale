# chatbot/admin.py
from django.contrib import admin
from .models import ChatMemory, ChatbotMetrics

@admin.register(ChatMemory)
class ChatMemoryAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'updated_at')
    search_fields = ('session_id',)

@admin.register(ChatbotMetrics)
class ChatbotMetricsAdmin(admin.ModelAdmin):
    list_display = ('evento', 'session_id', 'timestamp')
    search_fields = ('session_id', 'evento')
    list_filter = ('evento', 'timestamp')
