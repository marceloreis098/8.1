
# Gerenciador de Inventário Pro

Sistema full-stack para controle de ativos, licenças e suporte remoto.

---

## 🛠 Guia de Instalação e Correção (PM2)

Se você recebeu erro de "Process not found", execute os comandos abaixo para registrar os serviços no PM2:

### 1. Iniciar API (Backend)
```bash
cd /var/www/Inventario/inventario-api
pm2 start server.js --name "inventario-api"
```

### 2. Iniciar Interface (Frontend)
Para o frontend, como usamos Vite, a forma mais simples de rodar em produção via PM2 é usando o comando `preview`:
```bash
cd /var/www/Inventario
# Primeiro gera o build (se ainda não fez)
npm run build
# Inicia o processo no PM2
pm2 start "npm run preview -- --port 3000 --host" --name "inventario-frontend"
```

### 3. Salvar Configuração
```bash
pm2 save
```

---

## 🗄️ Esquema de Banco de Dados
Certifique-se de que a tabela `users` e o usuário `admin` foram criados (veja o log do MySQL se houver erros):

```sql
USE inventario_pro;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    realName VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role ENUM('Admin', 'User Manager', 'User') DEFAULT 'User',
    password VARCHAR(255) NOT NULL,
    is2FAEnabled BOOLEAN DEFAULT FALSE,
    secret2FA VARCHAR(255),
    avatarUrl TEXT,
    ssoProvider VARCHAR(50),
    lastLogin TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Senha padrão: Reserva2026
INSERT IGNORE INTO users (username, realName, email, role, password) 
VALUES ('admin', 'Administrador', 'admin@empresa.com', 'Admin', '$2a$10$7fU3O0V3O0V3O0V3O0V3O.6I4eG0N3O0V3O0V3O0V3O0V3O0V3O0V');
```
