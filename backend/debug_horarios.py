#!/usr/bin/env python
"""
Script de debug para verificar o problema na busca de horários
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from usuarios.models import CustomUser, JornadaDeTrabalho, Especialidade
from agendamentos.services import buscar_proximo_horario_disponivel

def debug_horarios():
    print("=== DEBUG: VERIFICAÇÃO DE HORÁRIOS ===\n")
    
    # 1. Verificar especialidades
    print("1. ESPECIALIDADES CADASTRADAS:")
    especialidades = Especialidade.objects.all()
    for esp in especialidades:
        print(f"   ID: {esp.id} - Nome: {esp.nome} - Valor: R$ {esp.valor_consulta}")
    print(f"   Total: {especialidades.count()}\n")
    
    # 2. Verificar médicos
    print("2. MÉDICOS CADASTRADOS:")
    medicos = CustomUser.objects.filter(cargo='medico')
    for medico in medicos:
        especialidades_medico = [esp.nome for esp in medico.especialidades.all()]
        print(f"   ID: {medico.id} - Nome: {medico.get_full_name()} - Especialidades: {especialidades_medico}")
    print(f"   Total: {medicos.count()}\n")
    
    # 3. Verificar jornadas
    print("3. JORNADAS DE TRABALHO:")
    jornadas = JornadaDeTrabalho.objects.all()
    for jornada in jornadas:
        print(f"   Médico: {jornada.medico.get_full_name()} - {jornada.get_dia_da_semana_display()}")
        print(f"   Horário: {jornada.hora_inicio} às {jornada.hora_fim}")
        print(f"   Intervalo: {jornada.intervalo_consulta} min - Ativo: {jornada.ativo}\n")
    print(f"   Total: {jornadas.count()}\n")
    
    # 4. Testar busca de horários para Cardiologia
    print("4. TESTE DE BUSCA DE HORÁRIOS PARA CARDIOLOGIA:")
    try:
        cardiologia = Especialidade.objects.get(nome='Cardiologia')
        medicos_cardio = CustomUser.objects.filter(cargo='medico', especialidades=cardiologia)
        
        if medicos_cardio.exists():
            for medico in medicos_cardio:
                print(f"   Testando médico: {medico.get_full_name()}")
                horarios = buscar_proximo_horario_disponivel(medico.id)
                print(f"   Resultado: {horarios}")
        else:
            print("   PROBLEMA: Nenhum médico encontrado para Cardiologia!")
            
    except Especialidade.DoesNotExist:
        print("   PROBLEMA: Especialidade Cardiologia não encontrada!")
    
    print("\n=== FIM DO DEBUG ===")

if __name__ == "__main__":
    debug_horarios()