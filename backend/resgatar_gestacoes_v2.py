import os
import django
import re
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from prontuario.models import Laudo
from crm.models import Ciclo

def resgatar_dados_com_engenharia_reversa():
    print("\n=== 🚑 INICIANDO RESGATE E ENGENHARIA REVERSA DE GESTAÇÕES ===\n")
    
    laudos = Laudo.objects.exclude(titulo_exame__icontains="Exames Anexados").exclude(dados_estruturados__isnull=True).order_by('data_criacao')
    resgatados_dum = 0
    resgatados_reversa = 0

    # Inteligência para extrair padrões como "30 semanas e 2 dias", "30s 2d", "12 semanas", etc.
    padrao_ig = re.compile(r'(?i)(\d+)\s*(?:semanas?|sem|s|w)(?:\s*e\s*|\s+)?(?:(\d+)\s*(?:dias?|d))?')

    for laudo in laudos:
        dados = laudo.dados_estruturados
        paciente = laudo.paciente
        
        if not paciente or not dados:
            continue

        feto1 = dados.get('feto1', {})
        if not isinstance(feto1, dict):
            continue
            
        # Pega a data base do exame para voltar no tempo
        data_referencia = None
        if laudo.exame and laudo.exame.data_exame:
            data_referencia = laudo.exame.data_exame
        else:
            data_referencia = laudo.data_criacao.date()

        dum_data = None
        metodo = ""

        # 1. TENTATIVA CLÁSSICA: Respeitar a regra da DUM explícita (se existir)
        dum_str = feto1.get('dum', '')
        if dum_str and isinstance(dum_str, str) and len(dum_str) >= 10:
            try:
                dum_data = datetime.strptime(dum_str[:10], '%Y-%m-%d').date()
                metodo = "DUM Original do Laudo"
            except ValueError:
                pass

        # 2. ENGENHARIA REVERSA: Se a DUM está vazia, vamos caçar a Biometria
        if not dum_data:
            # Lista de lugares onde o React costuma salvar a idade gestacional final
            campos_ig = [
                feto1.get('igVeredito', ''),
                feto1.get('igBiometria', ''),
                feto1.get('igIgCorrigidaCalculada', ''),
                feto1.get('resIgCcn', ''),
                feto1.get('resIgSg', '')
            ]
            
            texto_ig_encontrado = None
            for campo in campos_ig:
                if campo and isinstance(campo, str) and re.search(padrao_ig, campo):
                    texto_ig_encontrado = campo
                    break
            
            # Se achou uma idade gestacional como "30 semanas e 2 dias"
            if texto_ig_encontrado:
                match = re.search(padrao_ig, texto_ig_encontrado)
                if match:
                    semanas = int(match.group(1))
                    # Se não tiver dias (ex: "30 semanas"), assume 0 dias
                    dias = int(match.group(2)) if match.group(2) else 0 
                    
                    # Volta no tempo
                    dias_totais = (semanas * 7) + dias
                    dum_data = data_referencia - timedelta(days=dias_totais)
                    metodo = f"Engenharia Reversa ({semanas}s e {dias}d no dia {data_referencia.strftime('%d/%m/%Y')})"

        # 3. SALVAR NO CRM E NO PACIENTE
        if dum_data:
            atualizou = False
            
            # Atualiza o Paciente raiz (apenas se estiver vazio)
            if getattr(paciente, 'dum', None) is None:
                paciente.dum = dum_data
                paciente.save()
                atualizou = True
            
            # Atualiza o Card do CRM Ativo
            ciclo = Ciclo.objects.filter(paciente=paciente, status='ativo').first()
            if ciclo and getattr(ciclo, 'data_dum', None) is None:
                ciclo.data_dum = dum_data
                ciclo.save()
                atualizou = True
                
            if atualizou:
                if metodo == "DUM Original do Laudo":
                    resgatados_dum += 1
                    print(f"✅ [DUM] {paciente.nome_completo} -> {dum_data.strftime('%d/%m/%Y')}")
                else:
                    resgatados_reversa += 1
                    print(f"🔄 [REVERSA] {paciente.nome_completo} -> DUM Calculada para {dum_data.strftime('%d/%m/%Y')} | Base: {metodo}")

    print("\n" + "="*60)
    print(f"🎉 RESGATE CONCLUÍDO COM SUCESSO!")
    print(f"📍 Resgatados pela DUM preenchida: {resgatados_dum}")
    print(f"📍 Resgatados via Engenharia Reversa (Biometria): {resgatados_reversa}")
    print("="*60 + "\n")

if __name__ == '__main__':
    resgatar_dados_com_engenharia_reversa()