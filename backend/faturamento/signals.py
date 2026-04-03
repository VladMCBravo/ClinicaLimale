from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from .models import Pagamento, TransacaoFinanceira

def enviar_alerta_email(instancia, modelo_nome, status_antigo, status_novo):
    """Função auxiliar para montar e enviar o e-mail"""
    paciente_nome = instancia.paciente.nome_completo if instancia.paciente else "Cliente Avulso/Fornecedor"
    
    # Tenta identificar quem fez a alteração (pelos campos que criamos hoje)
    usuario = "Sistema / Não identificado"
    if hasattr(instancia, 'baixado_por') and getattr(instancia, 'baixado_por', None):
        usuario = instancia.baixado_por.get_full_name() or instancia.baixado_por.username
        
    assunto = f"⚠️ ALERTA FINANCEIRO: Alteração de Status (ID {instancia.id})"
    
    mensagem = f"""
    O sistema detectou uma alteração em um registro financeiro.
    
    📋 DETALHES DO REGISTRO:
    - ID: {instancia.id} ({modelo_nome})
    - Paciente/Fornecedor: {paciente_nome}
    - Descrição: {instancia.descricao}
    - Valor: R$ {instancia.valor}
    
    🔄 ALTERAÇÃO:
    - Status Anterior: {status_antigo}
    - NOVO STATUS: {status_novo}
    
    👤 QUEM FEZ:
    - Usuário: {usuario}
    
    Este é um e-mail automático do sistema da Clínica Limalé.
    """
    
    try:
        send_mail(
            subject=assunto,
            message=mensagem,
            from_email=settings.EMAIL_HOST_USER, # Usa o e-mail configurado no settings como remetente
            
            # 👇 AQUI: Coloque os dois e-mails que vão receber as notificações
            recipient_list=['dr.danielcc@hotmail.com', 'bravotechcontato@gmail.com'], 
            
            fail_silently=False, # Deixe False para ver os erros de SMTP no terminal se algo der errado
        )
        print(f"✅ E-mail de alerta financeiro enviado para os gestores.")
    except Exception as e:
        print(f"❌ Erro ao enviar e-mail de alerta financeiro: {e}")

# Monitora o modelo legado (Pagamento)
@receiver(pre_save, sender=Pagamento)
def monitorar_status_pagamento(sender, instance, **kwargs):
    if instance.id: # Só verifica se já existir no banco (não é uma criação nova)
        try:
            antigo = Pagamento.objects.get(id=instance.id)
            if antigo.status != instance.status:
                enviar_alerta_email(instance, "Pagamento", antigo.status, instance.status)
        except Pagamento.DoesNotExist:
            pass

# Monitora o modelo novo (TransacaoFinanceira)
@receiver(pre_save, sender=TransacaoFinanceira)
def monitorar_status_transacao(sender, instance, **kwargs):
    if instance.id:
        try:
            antigo = TransacaoFinanceira.objects.get(id=instance.id)
            if antigo.status != instance.status:
                enviar_alerta_email(instance, "Transação Unificada", antigo.status, instance.status)
        except TransacaoFinanceira.DoesNotExist:
            pass