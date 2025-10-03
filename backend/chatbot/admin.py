# chatbot/admin.py
from django.contrib import admin
from .models import ChatMemory

@admin.register(ChatMemory)
class ChatMemoryAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'updated_at')
    search_fields = ('session_id',)
