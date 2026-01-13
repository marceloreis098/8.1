# Gerenciador de Inventário Pro

Sistema full-stack para controle de ativos e licenças.

---

## 🛠 Guia de Instalação no Ubuntu Server

Siga estes passos para configurar o ambiente de produção do zero.

### 1. Preparar o Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Banco de Dados (MariaDB)
```bash
sudo apt install mariadb-server -y
sudo mysql_secure_installation
```
No terminal do MySQL (`sudo mysql`), crie o usuário e o banco:
```sql
CREATE DATABASE inventario_pro;
CREATE USER 'inventario_user'@'localhost' IDENTIFIED BY 'Reserva2026';
GRANT ALL PRIVILEGES ON inventario_pro.* TO 'inventario_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Instalar Node.js e PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 4. Configurar o Projeto
Clone seu repositório em `/var/www/Inventario` e configure o backend:
```bash
cd /var/www/Inventario/inventario-api
cp .env.example .env # Se houver, caso contrário crie um
```
Edite o `.env` da API:
```env
DB_HOST=localhost
DB_USER=inventario_user
DB_PASSWORD=Reserva2026
DB_DATABASE=inventario_pro
API_PORT=3001
```

### 5. Instalar Dependências e Iniciar
**Backend:**
```bash
cd /var/www/Inventario/inventario-api
npm install
pm2 start server.js --name "inventario-api"
```

**Frontend:**
```bash
cd /var/www/Inventario
npm install
npm run build
```

### 6. Configurar Nginx (Servidor Web)
```bash
sudo apt install nginx -y
```
Crie um arquivo de configuração `sudo nano /etc/nginx/sites-available/inventario`:
```nginx
server {
    listen 80;
    server_name seu_ip_ou_dominio;

    root /var/www/Inventario/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Ative o site e reinicie o Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/inventario /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 💾 Manutenção e Backups

Utilize o script `backup_db.sh` para gerenciar seus dados:

**Para fazer um backup agora:**
```bash
sudo chmod +x /var/www/Inventario/backup_db.sh
sudo /var/www/Inventario/backup_db.sh backup
```

**Para restaurar um backup:**
```bash
sudo /var/www/Inventario/backup_db.sh restore
```

Os arquivos `.sql` são salvos automaticamente em `/var/www/inventario_backups/`.
