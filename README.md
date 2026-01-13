
# Gerenciador de Inventário Pro

Este é um guia completo para a instalação e configuração do sistema Gerenciador de Inventário Pro em um ambiente de produção interno. A aplicação utiliza uma arquitetura full-stack com um frontend em React, um backend em Node.js (Express) e um banco de dados MariaDB rodando em um servidor Ubuntu.

## Arquitetura

A aplicação é dividida em dois componentes principais dentro do mesmo repositório. Para evitar qualquer confusão, aqui está a estrutura de diretórios do projeto:

```
/var/www/Inventario/
├── inventario-api/         <-- Backend (API Node.js)
│   ├── node_modules/
│   ├── mockData.js
│   ├── package.json
│   └── server.js
│
├── node_modules/           <-- Dependências do Frontend
├── dist/                   <-- Pasta de produção do Frontend (criada após o build)
├── components/
├── services/
├── index.html              <-- Arquivos do Frontend (React)
├── package.json
└── ... (outros arquivos do frontend)
```

**Componentes:**

1.  **Frontend (Diretório Raiz: `/var/www/Inventario`)**: Uma aplicação React (Vite + TypeScript) responsável pela interface do usuário. **Todos os comandos do frontend devem ser executados a partir daqui.**
2.  **Backend (Pasta `inventario-api`)**: Um servidor Node.js/Express que recebe as requisições do frontend, aplica a lógica de negócio e se comunica com o banco de dados. **Todos os comandos do backend devem ser executados a partir de `Inventario/inventario-api/`.**

---

## Passo a Passo para Instalação

Siga estes passos para configurar e executar a aplicação.

### Passo 0: Obtendo os Arquivos da Aplicação com Git

Antes de configurar o banco de dados ou o servidor, você precisa obter os arquivos da aplicação no seu servidor.

1.  **Crie o Diretório de Trabalho (se não existir):**
    O diretório `/var/www` é a convenção para hospedar aplicações web.
    ```bash
    sudo mkdir -p /var/www
    sudo chown -R $USER:$USER /var/www
    ```

2.  **Instale o Git:**
    ```bash
    sudo apt update && sudo apt install git
    ```

3.  **Clone o Repositório da Aplicação:**
    Navegue até o diretório preparado e clone o repositório. **Substitua a URL abaixo pela URL real do seu repositório Git.**
    ```bash
    cd /var/www/
    git clone https://github.com/marceloreis098/teste4.git Inventario
    ```
    Isso criará a pasta `Inventario` com todos os arquivos do projeto.

### Passo 1: Configuração do Banco de Dados (MariaDB)

1.  **Instale e Proteja o MariaDB Server:**
    ```bash
    sudo apt install mariadb-server
    sudo mysql_secure_installation
    ```

2.  **Crie o Banco de Dados e o Usuário:**
    Acesse o console do MariaDB com o usuário root (`sudo mysql -u root -p`). Execute os comandos SQL a seguir. **Substitua `'sua_senha_forte'` por uma senha segura.**
    ```sql
    CREATE DATABASE inventario_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER 'inventario_user'@'localhost' IDENTIFIED BY 'sua_senha_forte';
    GRANT ALL PRIVILEGES ON inventario_pro.* TO 'inventario_user'@'localhost';
    FLUSH PRIVILEGES;
    EXIT;
    ```
    
### Passo 2: Configuração do Firewall (UFW)

1.  **Adicione as Regras e Habilite:**
    ```bash
    sudo ufw allow ssh          # Permite acesso SSH
    sudo ufw allow 3000/tcp     # Permite acesso ao Frontend (Backend PM2)
    sudo ufw allow 3001/tcp     # Permite acesso à API
    sudo ufw allow 'Nginx Full' # Permite acesso HTTP (80) e HTTPS (443)
    sudo ufw enable
    ```

### Passo 3: Configuração do Backend (API)

1.  **Instale o Node.js (se não tiver):**
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

2.  **Instale as Dependências da API:**
    ```bash
    # Navegue até a pasta da API
    cd /var/www/Inventario/inventario-api
    
    # Instale as dependências (incluindo otplib, bcryptjs, mysql2 e @google/genai)
    npm install
    ```
    **Nota:** O servidor da API irá criar as tabelas necessárias no banco de dados automaticamente na primeira vez que for iniciado.

3.  **Crie o Arquivo de Variáveis de Ambiente (`.env`):**
    ```bash
    # Certifique-se de estar em /var/www/Inventario/inventario-api
    nano .env
    ```
    Adicione o seguinte conteúdo, usando a senha que você definiu e sua chave do Google Gemini:
    ```
    DB_HOST=localhost
    DB_USER=inventario_user
    DB_PASSWORD=sua_senha_forte
    DB_DATABASE=inventario_pro
    API_PORT=3001
    BCRYPT_SALT_ROUNDS=10
    API_KEY=sua-chave-api-do-google-gemini
    ```

### Passo 4: Configuração do Frontend

1.  **Instale `serve` e `pm2` globalmente:**
    ```bash
    sudo npm install -g serve pm2
    ```

2.  **Instale as Dependências do Frontend:**
    ```bash
    # Navegue para a pasta raiz do projeto
    cd /var/www/Inventario
    npm install 
    ```

3.  **Compile a Aplicação para Produção:**
    Este passo é crucial. Ele cria uma pasta `dist` com a versão otimizada do site.
    ```bash
    # Certifique-se de estar em /var/www/Inventario
    npm run build
    ```

### Passo 5: Executando a Aplicação com PM2

`pm2` irá garantir que a API e o frontend rodem continuamente. Usamos `npx` para garantir que o comando `pm2` seja encontrado.

1.  **Inicie a API com o PM2:**
    ```bash
    # Navegue para a pasta da API
    cd /var/www/Inventario/inventario-api
    npx pm2 start server.js --name inventario-api
    ```

2.  **Inicie o Frontend com o PM2:**
    **Atenção:** O comando abaixo deve ser executado da pasta raiz do projeto.
    ```bash
    # Navegue para a pasta raiz do projeto
    cd /var/www/Inventario
    
    # O comando serve o conteúdo da pasta de produção 'dist' na porta 3000.
    npx pm2 start serve --name inventario-frontend -- -s dist -l 3000
    ```

3.  **Configure o PM2 para Iniciar com o Servidor:**
    ```bash
    npx pm2 startup
    ```
    O comando acima irá gerar um outro comando que você precisa copiar e executar. **Execute o comando que ele fornecer.**

4.  **Salve a Configuração de Processos do PM2:**
    ```bash
    npx pm2 save
    ```

5.  **Gerencie os Processos:**
    -   Ver status: `npx pm2 list`
    -   Ver logs da API: `npx pm2 logs inventario-api`
    -   Ver logs do Frontend: `npx pm2 logs inventario-frontend`
    -   Reiniciar a API: `npx pm2 restart inventario-api`
    -   Reiniciar o Frontend: `npx pm2 restart inventario-frontend`

### Passo 6: Configurando Nginx (Proxy Reverso)

Para acessar a aplicação sem digitar `:3000` (usando a porta padrão 80), configuramos o Nginx como um proxy reverso.

1.  **Instale o Nginx:**
    ```bash
    sudo apt install nginx
    ```

2.  **Crie um arquivo de configuração para o site:**
    ```bash
    sudo nano /etc/nginx/sites-available/inventario
    ```

3.  **Cole o seguinte conteúdo no arquivo:**
    Este bloco configura o Nginx para responder ao domínio **inventariopro.usereserva.com** na porta 80 e repassar tudo para a sua aplicação na porta 3000.

    ```nginx
    server {
        listen 80;
        server_name inventariopro.usereserva.com;

        location / {
            proxy_pass http://localhost:3000; # Redireciona para o frontend
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

4.  **Ative a configuração criando um link simbólico:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/inventario /etc/nginx/sites-enabled/
    ```

5.  **Remova a configuração padrão do Nginx (opcional, mas recomendado para evitar conflitos):**
    ```bash
    sudo rm /etc/nginx/sites-enabled/default
    ```

6.  **Verifique se a configuração está correta e reinicie o Nginx:**
    ```bash
    sudo nginx -t
    sudo systemctl restart nginx
    ```

### Passo 7: Acesso à Aplicação

Abra o navegador e digite o endereço:

`http://inventariopro.usereserva.com`

A aplicação deve carregar a tela de login sem a necessidade de especificar a porta `:3000`.

---

## Inteligência Artificial (Google Gemini)

O sistema utiliza a API **Google Gemini** para funcionalidades como o assistente de relatórios e resumos de chamados técnicos.

### 1. Obtenha sua Chave de API

1.  Acesse o [Google AI Studio](https://aistudio.google.com/).
2.  Crie uma nova API Key.
3.  Certifique-se de que o faturamento (Billing) está configurado em um projeto Google Cloud pago para evitar limites restritivos (embora exista uma cota gratuita).

### 2. Adicione a Chave ao Backend

No arquivo `.env` da pasta `inventario-api`, adicione:
```env
API_KEY=sua-chave-aqui
```

### 3. Reinicie a API

```bash
npx pm2 restart inventario-api
```

---

## Solução de Problemas Comuns

### Status "errored" no PM2 para inventario-api

Se o comando `npx pm2 list` mostrar o backend em vermelho com o status `errored`:

1.  **Verifique os Logs:** `npx pm2 logs inventario-api`
2.  **Módulos Faltando:** Se o erro for `Cannot find module '@google/genai'`, você esqueceu de rodar o `npm install` dentro da pasta `inventario-api`.
3.  **Banco de Dados:** Verifique se o MariaDB está rodando (`sudo systemctl status mariadb`) e se a senha no `.env` está correta.

### Falha no Login após "Zerar Banco de Dados"

**Problema:** Após utilizar a função de "Zerar Banco de Dados" nas configurações, você não consegue mais fazer login com o usuário padrão (`admin` / `marceloadmin`).

**Causa:** O sistema pode ter falhado em limpar o histórico de migrações.

**Solução:** 
1. Acesse o console do MySQL: `sudo mysql -u root -p`
2. Rode: `USE inventario_pro; TRUNCATE TABLE migrations;`
3. Saia e reinicie a API: `npx pm2 restart inventario-api`

---

## Melhoria Futura: Migrando para HTTPS (SSL)

Recomenda-se fortemente o uso do **Certbot** para automatizar o HTTPS:
```bash
sudo apt install python3-certbot-nginx
sudo certbot --nginx -d inventariopro.usereserva.com
```
