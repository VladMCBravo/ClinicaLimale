# Guia de Migração para AWS

## Pré-requisitos
1. Conta AWS ativa
2. AWS CLI instalado
3. EB CLI instalado

## Passo 1: Configurar Serviços AWS

### 1.1 Amazon RDS (Banco de Dados)
```bash
# Criar instância PostgreSQL
aws rds create-db-instance \
    --db-instance-identifier clinica-limale-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username postgres \
    --master-user-password SuaSenhaSegura123 \
    --allocated-storage 20 \
    --vpc-security-group-ids sg-xxxxxxxxx
```

### 1.2 Amazon S3 (Arquivos Estáticos)
```bash
# Criar bucket S3
aws s3 mb s3://clinica-limale-static --region us-east-1
```

### 1.3 ElastiCache (Redis)
```bash
# Criar cluster Redis
aws elasticache create-cache-cluster \
    --cache-cluster-id clinica-limale-redis \
    --cache-node-type cache.t3.micro \
    --engine redis \
    --num-cache-nodes 1
```

## Passo 2: Configurar Variáveis de Ambiente

No Elastic Beanstalk, configure:

```
SECRET_KEY=sua-secret-key-super-segura
DEBUG=False
DATABASE_URL=postgresql://postgres:senha@endpoint-rds:5432/postgres
REDIS_URL=redis://endpoint-elasticache:6379
AWS_ACCESS_KEY_ID=sua-access-key
AWS_SECRET_ACCESS_KEY=sua-secret-key
AWS_STORAGE_BUCKET_NAME=clinica-limale-static
AWS_S3_REGION_NAME=us-east-1
SENDGRID_API_KEY=sua-sendgrid-key
DEFAULT_FROM_EMAIL=nao-responda@clinicalimale.com
```

## Passo 3: Deploy Backend

```bash
# Inicializar EB
cd /caminho/para/projeto
eb init clinica-limale --region us-east-1

# Criar ambiente
eb create clinica-limale-prod

# Deploy
eb deploy
```

## Passo 4: Configurar Frontend (Amplify)

```bash
# Instalar Amplify CLI
npm install -g @aws-amplify/cli

# Configurar
cd frontend
amplify init

# Adicionar hosting
amplify add hosting

# Deploy
amplify publish
```

## Passo 5: Configurar Domínio

### 5.1 Route 53
- Criar hosted zone para clinicalimale.com
- Configurar registros A/CNAME

### 5.2 Certificate Manager
- Solicitar certificado SSL para *.clinicalimale.com

## Custos Estimados (Mensais)

- **RDS t3.micro**: ~$15
- **Elastic Beanstalk t3.small**: ~$15
- **ElastiCache t3.micro**: ~$15
- **S3 + CloudFront**: ~$5
- **Route 53**: ~$1
- **Total**: ~$51/mês

## Comandos Úteis

```bash
# Ver logs
eb logs

# SSH no servidor
eb ssh

# Configurar variáveis
eb setenv DEBUG=False

# Status
eb status

# Terminar ambiente
eb terminate
```

## Backup e Migração de Dados

```bash
# Exportar dados do Supabase
pg_dump "postgresql://user:pass@host:port/db" > backup.sql

# Importar no RDS
psql "postgresql://postgres:pass@rds-endpoint:5432/postgres" < backup.sql
```

## Monitoramento

- CloudWatch para logs e métricas
- SNS para alertas
- X-Ray para tracing (opcional)

## Próximos Passos

1. Configurar CI/CD com GitHub Actions
2. Implementar auto-scaling
3. Configurar backup automático
4. Implementar CDN global