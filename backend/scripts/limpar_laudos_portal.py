import os
import sys
import django

# 1. Faz o Python "olhar" para a pasta backend (um nível acima da pasta scripts)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

# 2. Configuração do Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from prontuario.models import Laudo
from exames.models import Exame, ArquivoExame

def limpar_laudos_antigos():
    print("\n=== 🧹 INICIANDO VARREDURA E RETIFICAÇÃO DE LAUDOS ===\n")
    
    # Pega todos os IDs de pacientes que possuem algum laudo
    pacientes_ids = Laudo.objects.values_list('paciente_id', flat=True).distinct()
    
    total_corrigidos = 0
    total_cancelados = 0
    total_arquivos_apagados = 0
    
    for p_id in pacientes_ids:
        # Busca todos os laudos do paciente, ordenados do mais NOVO para o mais VELHO
        laudos_paciente = Laudo.objects.filter(paciente_id=p_id).order_by('-data_criacao')
        
        # Dicionário para agrupar laudos pelo título base
        grupos_laudos = {}
        
        for laudo in laudos_paciente:
            # Limpa o título (ex: "USG Obstétrico - REVISÃO 2" -> "USG Obstétrico")
            titulo_base = laudo.titulo_exame.split(' - REVISÃO')[0].strip()
            
            if titulo_base not in grupos_laudos:
                grupos_laudos[titulo_base] = []
            grupos_laudos[titulo_base].append(laudo)
            
        for titulo_base, laudos in grupos_laudos.items():
            if len(laudos) > 1:
                # O índice 0 é o laudo mais recente (nosso oficial)
                laudo_oficial = laudos[0]
                laudos_antigos = laudos[1:]
                
                # A) Limpa o título do laudo oficial
                if laudo_oficial.titulo_exame != titulo_base:
                    laudo_oficial.titulo_exame = titulo_base
                    laudo_oficial.save(update_fields=['titulo_exame'])
                    total_corrigidos += 1
                    print(f"✅ Oficializado (ID {laudo_oficial.id}): {titulo_base}")
                
                # B) Cancela os antigos e apaga o PDF do portal
                for antigo in laudos_antigos:
                    if antigo.status != 'CANCELADO_POR_RETIFICACAO':
                        antigo.status = 'CANCELADO_POR_RETIFICACAO'
                        antigo.save(update_fields=['status'])
                        total_cancelados += 1
                        
                        if antigo.exame and antigo.arquivo_pdf:
                            nome_arquivo = antigo.arquivo_pdf.name.split('/')[-1]
                            apagados, _ = ArquivoExame.objects.filter(
                                exame=antigo.exame,
                                tipo='LAUDO',
                                arquivo__icontains=nome_arquivo
                            ).delete()
                            
                            total_arquivos_apagados += apagados
                            if apagados > 0:
                                print(f"  🗑️  PDF antigo removido do portal (Laudo ID {antigo.id}).")

    print("\n" + "="*60)
    print(f"🎉 RETIFICAÇÃO CONCLUÍDA!")
    print(f"📍 Laudos Oficiais Renomeados: {total_corrigidos}")
    print(f"📍 Laudos Antigos Inativados: {total_cancelados}")
    print(f"📍 PDFs Removidos do Portal: {total_arquivos_apagados}")
    print("="*60 + "\n")


def limpar_portal_pacientes():
    print("\n=== 👻 INICIANDO LIMPEZA DE CARDS FANTASMAS DO PORTAL ===\n")
    
    # 1. Desvincular contêineres dos laudos que foram cancelados
    laudos_cancelados = Laudo.objects.filter(status='CANCELADO_POR_RETIFICACAO', exame__isnull=False)
    total_desvinculados = 0
    
    for laudo in laudos_cancelados:
        laudo.exame = None
        laudo.save(update_fields=['exame'])
        total_desvinculados += 1
        print(f"🔗 Laudo {laudo.id} desvinculado de sua pasta.")

    # 2. Apagar contêineres (cards do portal) que ficaram vazios
    exames_para_apagar = []
    
    for exame in Exame.objects.all():
        tem_laudo_ativo = hasattr(exame, 'laudo_prontuario_vinculo') and exame.laudo_prontuario_vinculo is not None
        qtd_midias = exame.arquivos.filter(tipo__in=['IMAGEM', 'VIDEO']).count()
        
        # Se não tem laudo oficial E não tem fotos/vídeos, é um "Card Fantasma"
        if not tem_laudo_ativo and qtd_midias == 0:
            exames_para_apagar.append(exame.id)

    total_apagados = len(exames_para_apagar)
    
    if exames_para_apagar:
        Exame.objects.filter(id__in=exames_para_apagar).delete()
        
    print("\n" + "="*60)
    print(f"🎉 LIMPEZA CONCLUÍDA!")
    print(f"📍 Laudos desvinculados de pastas antigas: {total_desvinculados}")
    print(f"📍 Cards duplicados/vazios apagados: {total_apagados}")
    print("="*60 + "\n")


if __name__ == '__main__':
    limpar_laudos_antigos()
    limpar_portal_pacientes()