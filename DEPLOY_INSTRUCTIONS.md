# Instruções de Deploy - Clínica Limale

## Backend (AWS EC2)
- **IP**: 98.88.80.53:8000
- **Admin**: http://98.88.80.53:8000/admin/
- **API**: http://98.88.80.53:8000/api/

### Comandos para deploy no EC2:
```bash
cd ~/clinica-limale/backend
source venv/bin/activate
git pull origin main
pip install -r requirements.txt
python manage.py migrate --settings=core.settings_production
python manage.py collectstatic --noinput --settings=core.settings_production
pkill -f gunicorn
nohup ./start_production.sh > production.log 2>&1 &
```

## Frontend (Vercel)
- **URL**: https://clinica-limale.vercel.app
- **Variáveis de ambiente necessárias**:
  - `REACT_APP_API_URL=http://98.88.80.53:8000/api`

### Deploy automático:
O Vercel faz deploy automático quando há push para a branch main.

## Banco de Dados
- **AWS RDS PostgreSQL**
- **Host**: clinica-db.cet68ewyqbo6.us-east-1.rds.amazonaws.com
- **Database**: clinica_db

## Credenciais Admin
- **Usuário**: admin
- **Senha**: 123456