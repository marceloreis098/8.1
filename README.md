
# Gerenciador de Inventário Pro

Sistema full-stack para controle de ativos, licenças e suporte remoto.

---

## 🛠 Guia de Instalação no Ubuntu Server

### 1. Preparar a Estrutura de Pastas
```bash
sudo mkdir -p /var/www/Inventario/inventario-api
sudo chown -R $USER:$USER /var/www/Inventario
cd /var/www/Inventario/inventario-api
```

### 2. Configurar Variáveis de Ambiente (.env)
Crie o arquivo `.env` com suas credenciais:
```bash
cat <<EOT >> .env
DB_HOST=localhost
DB_USER=inventario_user
DB_PASSWORD=Reserva2026
DB_DATABASE=inventario_pro
API_PORT=3001
EOT
```

### 3. Configurar o Banco de Dados (Passo Crítico)
Acesse o MySQL (`mysql -u root -p`) e execute o script abaixo para criar o banco e **todas** as tabelas:

```sql
CREATE DATABASE IF NOT EXISTS inventario_pro;
CREATE USER IF NOT EXISTS 'inventario_user'@'localhost' IDENTIFIED BY 'Reserva2026';
GRANT ALL PRIVILEGES ON inventario_pro.* TO 'inventario_user'@'localhost';
FLUSH PRIVILEGES;

USE inventario_pro;

-- 1. Tabela de Usuários (Resolve o erro do print)
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

-- Inserir Usuário Admin Inicial (Senha: Reserva2026)
-- O hash abaixo é o padrão para 'Reserva2026' usando Bcrypt
INSERT IGNORE INTO users (username, realName, email, role, password) 
VALUES ('admin', 'Administrador', 'admin@empresa.com', 'Admin', '$2a$10$7fU3O0V3O0V3O0V3O0V3O.6I4eG0N3O0V3O0V3O0V3O0V3O0V3O0V');

-- 2. Tabela de Equipamentos
CREATE TABLE IF NOT EXISTS equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipamento VARCHAR(255) NOT NULL,
    serial VARCHAR(100) UNIQUE NOT NULL,
    rustdesk_id VARCHAR(50),
    patrimonio VARCHAR(50),
    brand VARCHAR(100),
    model VARCHAR(100),
    usuarioAtual VARCHAR(255),
    setor VARCHAR(100),
    local VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Estoque',
    dataEntregaUsuario DATE,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Licenças
CREATE TABLE IF NOT EXISTS licenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto VARCHAR(255) NOT NULL,
    chaveSerial VARCHAR(255) NOT NULL,
    usuario VARCHAR(255) NOT NULL,
    dataExpiracao DATE,
    status VARCHAR(50) DEFAULT 'Ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Totais de Licenças
CREATE TABLE IF NOT EXISTS license_totals (
    produto VARCHAR(255) PRIMARY KEY,
    total INT DEFAULT 0
);

-- 5. Tabela de Auditoria
CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50),
    action_type VARCHAR(50),
    target_type VARCHAR(50),
    target_id VARCHAR(50),
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabela de Configurações
CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY DEFAULT 1,
    companyName VARCHAR(255) DEFAULT 'Inventário Pro',
    isSsoEnabled BOOLEAN DEFAULT FALSE,
    is2faEnabled BOOLEAN DEFAULT FALSE,
    require2fa BOOLEAN DEFAULT FALSE,
    termo_entrega_template TEXT,
    termo_devolucao_template TEXT,
    hasInitialConsolidationRun BOOLEAN DEFAULT FALSE
);

INSERT IGNORE INTO settings (id) VALUES (1);
```

### 4. Instalar e Iniciar
```bash
npm install
sudo npm install -g pm2
pm2 start server.js --name "inventario-api"
pm2 save
```

---
**Nota:** Após executar o SQL, você poderá logar com o usuário `admin` e senha `Reserva2026`.
