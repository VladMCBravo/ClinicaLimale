# AWS Free Tier - Guia Completo

## 🎯 RECOMENDAÇÃO: Elastic Beanstalk (100% Gratuito)

### **Por que Elastic Beanstalk?**
- ✅ **12 meses gratuitos** completos
- ✅ **Fácil de usar** - Similar ao Render
- ✅ **Auto-scaling** automático
- ✅ **Monitoramento** incluído

### **O que é gratuito por 12 meses:**
- **EC2 t3.micro**: 750 horas/mês (24/7)
- **RDS db.t3.micro**: 750 horas/mês (24/7)
- **S3**: 5GB de armazenamento
- **CloudFront**: 50GB de transferência
- **ElastiCache**: Não incluído (use Redis local)

---

## 🚀 SETUP RÁPIDO - Elastic Beanstalk

### **Passo 1: Instalar AWS CLI**
```bash
# macOS
brew install awscli

# Configurar
aws configure
```

### **Passo 2: Instalar EB CLI**
```bash
pip install awsebcli
```

### **Passo 3: Preparar Projeto**
```bash
cd Sistema_Consultorio
eb init clinica-limale --region us-east-1
```

### **Passo 4: Criar RDS (Gratuito)**
```bash
# Via console AWS ou CLI
aws rds create-db-instance \
    --db-instance-identifier clinica-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username postgres \
    --master-user-password MinhaSenh@123 \
    --allocated-storage 20
```

### **Passo 5: Deploy**
```bash
eb create clinica-prod
eb deploy
```

---

## 💰 COMPARAÇÃO DE CUSTOS

### **Opção 1: Lightsail**
- **Custo**: $3.50/mês
- **Inclui**: Servidor + 1GB RAM + 40GB SSD + 2TB transfer
- **Banco**: +$15/mês (PostgreSQL)
- **Total**: ~$18.50/mês

### **Opção 2: Elastic Beanstalk (Free Tier)**
- **Custo**: $0/mês (12 meses)
- **Depois**: ~$25/mês
- **Inclui**: EC2 + RDS + Load Balancer + Auto-scaling

### **Opção 3: EC2 + RDS Manual**
- **Custo**: $0/mês (12 meses)
- **Depois**: ~$20/mês
- **Mais trabalho**: Configuração manual

---

## 🎯 PLANO RECOMENDADO

### **Ano 1: Free Tier (Elastic Beanstalk)**
1. **Mês 1-12**: Completamente gratuito
2. **Aprenda AWS** sem custos
3. **Escale conforme necessário**

### **Ano 2+: Otimizar Custos**
1. **Migrar para Lightsail** ($18.50/mês)
2. **Ou continuar EB** com instâncias maiores
3. **Implementar Reserved Instances** (50% desconto)

---

## 📋 CHECKLIST DE MIGRAÇÃO

### **Preparação (30 min)**
- [ ] Criar conta AWS
- [ ] Instalar AWS CLI + EB CLI
- [ ] Configurar credenciais

### **Setup Banco (15 min)**
- [ ] Criar RDS PostgreSQL (free tier)
- [ ] Configurar security groups
- [ ] Testar conexão

### **Deploy Backend (20 min)**
- [ ] Configurar EB
- [ ] Definir variáveis de ambiente
- [ ] Deploy inicial

### **Migrar Dados (30 min)**
- [ ] Exportar dados do Supabase
- [ ] Importar no RDS
- [ ] Testar aplicação

### **Frontend (15 min)**
- [ ] Atualizar URLs da API
- [ ] Deploy no Vercel (continuar)

---

## 🔧 COMANDOS ESSENCIAIS

```bash
# Status do ambiente
eb status

# Ver logs em tempo real
eb logs --all

# Configurar variáveis
eb setenv DATABASE_URL="postgresql://..."

# SSH no servidor
eb ssh

# Escalar instância
eb scale 2

# Terminar ambiente
eb terminate
```

---

## 🚨 LIMITES DO FREE TIER

### **Cuidados:**
- **750 horas/mês** = 24/7 para 1 instância
- **Múltiplas instâncias** = divide as horas
- **Após 12 meses** = cobrança normal
- **Exceder limites** = cobrança imediata

### **Monitoramento:**
- AWS Billing Dashboard
- CloudWatch alarms
- Cost Explorer

---

## 🎯 PRÓXIMOS PASSOS

1. **Criar conta AWS** (se não tiver)
2. **Seguir checklist** acima
3. **Migrar dados** do Supabase
4. **Testar tudo** funcionando
5. **Desligar Render/Supabase**

**Tempo total estimado: 2 horas**