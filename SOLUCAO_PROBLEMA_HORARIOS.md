# Solução para o Problema de Verificação de Horários no Chatbot

## Problema Identificado

O chatbot estava retornando "não há horários disponíveis" para todas as especialidades porque:

1. **Campos ausentes no modelo JornadaDeTrabalho**: Os campos `intervalo_consulta` e `ativo` não existiam
2. **Dados de teste ausentes**: Não havia médicos, especialidades ou jornadas cadastradas
3. **Função de busca com erro**: A função `buscar_proximo_horario_disponivel` tentava acessar campos inexistentes

## Correções Implementadas

### 1. Modelo JornadaDeTrabalho Atualizado
- Adicionado campo `intervalo_consulta` (padrão: 20 minutos)
- Adicionado campo `ativo` (padrão: True)

### 2. Migração Criada
- Arquivo: `usuarios/migrations/0002_add_intervalo_ativo_jornada.py`

### 3. Comando para Criar Dados de Teste
- Arquivo: `usuarios/management/commands/criar_dados_teste.py`
- Cria médicos, especialidades e jornadas automaticamente

### 4. Função de Busca Corrigida
- Corrigida a função `buscar_proximo_horario_disponivel` em `agendamentos/services.py`

## Como Aplicar a Solução

### No Ambiente de Produção (Render):

1. **Aplicar as migrações:**
```bash
python manage.py migrate
```

2. **Criar dados de teste:**
```bash
python manage.py criar_dados_teste
```

3. **Verificar se funcionou:**
```bash
python debug_horarios.py
```

### Dados Criados Automaticamente:

**Especialidades:**
- Cardiologia (R$ 150,00)
- Ginecologia (R$ 120,00)
- Neonatologia (R$ 180,00)
- Obstetrícia (R$ 140,00)
- Ortopedia (R$ 130,00)
- Pediatria (R$ 110,00)
- Reumatologia Pediátrica (R$ 160,00)

**Médicos:**
- Dr. João Silva (Cardiologia)
- Dra. Maria Santos (Ginecologia)
- Dr. Pedro Costa (Neonatologia)
- Dra. Ana Lima (Obstetrícia)
- Dr. Carlos Oliveira (Ortopedia)
- Dra. Lucia Ferreira (Pediatria)
- Dr. Roberto Alves (Reumatologia Pediátrica)

**Jornadas:**
- Todos os médicos: Segunda a Sexta, 8h às 18h
- Intervalo de 20 minutos entre consultas

## Teste do Chatbot

Após aplicar as correções, teste o fluxo:

1. "boa noite"
2. "Seu nome"
3. "Quero agendar consulta"
4. "consulta"
5. "Telemedicina"
6. "Cardiologia"

Agora deve aparecer horários disponíveis!

## Arquivos Modificados/Criados

- `usuarios/models.py` - Adicionados campos ao modelo JornadaDeTrabalho
- `usuarios/migrations/0002_add_intervalo_ativo_jornada.py` - Nova migração
- `usuarios/management/commands/criar_dados_teste.py` - Comando para dados de teste
- `agendamentos/services.py` - Função de busca corrigida
- `debug_horarios.py` - Script de debug

## Próximos Passos

1. Aplicar as migrações no Render
2. Executar o comando de criação de dados
3. Testar o chatbot
4. Monitorar os logs para verificar se não há mais erros