
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');
const { GoogleGenAI } = require("@google/genai");

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'inventario_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'inventario_pro',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
});

// --- SISTEMA DE MIGRAÇÕES ---
const runMigrations = async () => {
    console.log("Verificando banco de dados...");
    const conn = await db.promise().getConnection();
    try {
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                realName VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                password VARCHAR(255),
                role ENUM('Admin', 'User Manager', 'User') DEFAULT 'User',
                is2FAEnabled BOOLEAN DEFAULT FALSE,
                twoFactorSecret VARCHAR(255),
                avatarUrl TEXT,
                lastLogin DATETIME,
                ssoProvider VARCHAR(50)
            );

            CREATE TABLE IF NOT EXISTS equipment (
                id INT AUTO_INCREMENT PRIMARY KEY,
                equipamento VARCHAR(255) NOT NULL,
                serial VARCHAR(255) UNIQUE NOT NULL,
                patrimonio VARCHAR(255),
                brand VARCHAR(100),
                model VARCHAR(100),
                usuarioAtual VARCHAR(255),
                setor VARCHAR(100),
                local VARCHAR(100),
                status VARCHAR(50) DEFAULT 'Estoque',
                dataEntregaUsuario DATETIME,
                observacoes TEXT,
                approval_status ENUM('pending_approval', 'approved', 'rejected') DEFAULT 'approved'
            );

            CREATE TABLE IF NOT EXISTS licenses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                produto VARCHAR(255) NOT NULL,
                chaveSerial VARCHAR(255) NOT NULL,
                usuario VARCHAR(255) NOT NULL,
                tipoLicenca VARCHAR(100),
                dataExpiracao DATETIME,
                status ENUM('Ativa', 'Expirada', 'Cancelada') DEFAULT 'Ativa'
            );

            CREATE TABLE IF NOT EXISTS tickets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                category VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'Aberto',
                priority VARCHAR(50) DEFAULT 'Média',
                requester_id INT NOT NULL,
                technician_id INT NULL,
                equipment_id INT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (requester_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS settings (
                id INT PRIMARY KEY DEFAULT 1,
                companyName VARCHAR(255) DEFAULT 'Minha Empresa',
                isSsoEnabled BOOLEAN DEFAULT FALSE,
                is2faEnabled BOOLEAN DEFAULT FALSE,
                require2fa BOOLEAN DEFAULT FALSE,
                hasInitialConsolidationRun BOOLEAN DEFAULT FALSE,
                termo_entrega_template TEXT,
                termo_devolucao_template TEXT
            );

            INSERT IGNORE INTO settings (id, companyName) VALUES (1, 'Inventário Pro');
        `);

        // Cria usuário admin padrão se não existir
        const [admins] = await conn.query('SELECT * FROM users WHERE role = "Admin"');
        if (admins.length === 0) {
            const hashedPassword = await bcrypt.hash('marceloadmin', 10);
            await conn.query('INSERT INTO users (username, realName, email, password, role) VALUES (?, ?, ?, ?, ?)', 
                ['admin', 'Administrador', 'admin@empresa.com', hashedPassword, 'Admin']);
            console.log("Usuário admin padrão criado: admin / marceloadmin");
        }

        console.log("Banco de dados pronto.");
    } catch (err) {
        console.error("Erro na migração:", err);
    } finally {
        conn.release();
    }
};

// --- ROTAS DA API ---

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ message: "Usuário não encontrado" });

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ message: "Senha incorreta" });

        res.json({ id: user.id, username: user.username, realName: user.realName, role: user.role, is2FAEnabled: !!user.is2FAEnabled });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/equipment', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM equipment ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/equipment', async (req, res) => {
    const { equipment } = req.body;
    try {
        const [result] = await db.promise().query(
            'INSERT INTO equipment (equipamento, serial, patrimonio, brand, model, usuarioAtual, setor, local, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [equipment.equipamento, equipment.serial, equipment.patrimonio, equipment.brand, equipment.model, equipment.usuarioAtual, equipment.setor, equipment.local, equipment.status]
        );
        res.json({ id: result.insertId, ...equipment });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- INTEGRAÇÃO IA GEMINI ---

app.post('/api/ai/generate-report', async (req, res) => {
    const { query, data } = req.body;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Você é um assistente de inventário. Com base nos seguintes dados JSON de equipamentos: ${JSON.stringify(data.slice(0, 50))}. 
        Responda à seguinte solicitação do usuário retornando APENAS um array JSON de objetos que correspondam ao filtro: "${query}". 
        Não inclua explicações, apenas o JSON bruto.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });

        const text = response.text.replace(/```json|```/g, '').trim();
        res.json({ reportData: JSON.parse(text) });
    } catch (err) {
        console.error("Erro Gemini:", err);
        res.status(500).json({ error: "Erro ao processar consulta com IA." });
    }
});

app.post('/api/tickets/:id/ai-summary', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT title, description FROM tickets WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: "Chamado não encontrado" });

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Resuma tecnicamente este chamado para um técnico de suporte em uma frase: Titulo: ${rows[0].title}. Descrição: ${rows[0].description}`
        });

        res.json({ summary: response.text });
    } catch (err) {
        res.status(500).json({ summary: "IA indisponível" });
    }
});

// Inicialização
const PORT = process.env.API_PORT || 3001;
app.listen(PORT, async () => {
    await runMigrations();
    console.log(`Backend rodando na porta ${PORT}`);
});
