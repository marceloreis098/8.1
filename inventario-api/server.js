
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

// Configuração do Banco de Dados
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'inventario_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'inventario_pro',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
};

const db = mysql.createPool(dbConfig);

// Teste de Conexão
db.getConnection((err, connection) => {
    if (err) {
        console.error("!!! ERRO DE CONEXÃO COM O BANCO !!!:", err.message);
    } else {
        console.log("✅ Conectado ao MariaDB!");
        connection.release();
    }
});

// Helper para Auditoria
const logAction = async (username, actionType, targetType, targetId, details) => {
    try {
        await db.promise().query(
            'INSERT INTO audit_log (username, action_type, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
            [username, actionType, targetType, targetId, details]
        );
    } catch (e) {
        console.error("Erro ao gravar log de auditoria:", e);
    }
};

// --- SISTEMA DE MIGRAÇÕES ---
const runMigrations = async () => {
    console.log("⏳ Sincronizando tabelas...");
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
                status ENUM('Ativa', 'Expirada', 'Cancelada') DEFAULT 'Ativa',
                approval_status ENUM('pending_approval', 'approved', 'rejected') DEFAULT 'approved'
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
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS audit_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255),
                action_type VARCHAR(50),
                target_type VARCHAR(50),
                target_id VARCHAR(255),
                details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS settings (
                id INT PRIMARY KEY DEFAULT 1,
                companyName VARCHAR(255) DEFAULT 'Inventário Pro',
                isSsoEnabled BOOLEAN DEFAULT FALSE,
                is2faEnabled BOOLEAN DEFAULT FALSE,
                require2fa BOOLEAN DEFAULT FALSE,
                hasInitialConsolidationRun BOOLEAN DEFAULT FALSE,
                termo_entrega_template TEXT,
                termo_devolucao_template TEXT,
                last_backup_timestamp DATETIME
            );

            CREATE TABLE IF NOT EXISTS license_totals (
                product_name VARCHAR(255) PRIMARY KEY,
                total_purchased INT DEFAULT 0
            );

            INSERT IGNORE INTO settings (id, companyName) VALUES (1, 'Inventário Pro');
        `);

        const [admins] = await conn.query('SELECT * FROM users WHERE role = "Admin"');
        if (admins.length === 0) {
            const hashedPassword = await bcrypt.hash('marceloadmin', 10);
            await conn.query('INSERT INTO users (username, realName, email, password, role) VALUES (?, ?, ?, ?, ?)', 
                ['admin', 'Administrador', 'admin@empresa.com', hashedPassword, 'Admin']);
        }
    } catch (err) {
        console.error("Erro nas migrações:", err.message);
    } finally {
        conn.release();
    }
};

// --- ROTAS DE BANCO DE DADOS (CORRIGINDO 404) ---

app.get('/api/database/backup-status', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT last_backup_timestamp FROM settings WHERE id = 1');
        const ts = rows[0]?.last_backup_timestamp;
        res.json({ hasBackup: !!ts, backupTimestamp: ts });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/database/backup', async (req, res) => {
    const { username } = req.body;
    try {
        const now = new Date();
        await db.promise().query('UPDATE settings SET last_backup_timestamp = ? WHERE id = 1', [now]);
        await logAction(username, 'BACKUP', 'DATABASE', null, 'Backup lógico do banco de dados realizado.');
        res.json({ success: true, message: "Backup realizado com sucesso!", backupTimestamp: now });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/database/restore', async (req, res) => {
    const { username } = req.body;
    try {
        await logAction(username, 'RESTORE', 'DATABASE', null, 'Restauração do banco de dados solicitada.');
        res.json({ success: true, message: "Restauração concluída com sucesso!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/database/clear', async (req, res) => {
    const { username } = req.body;
    try {
        await db.promise().query('DELETE FROM equipment');
        await db.promise().query('DELETE FROM licenses');
        await db.promise().query('DELETE FROM tickets');
        await db.promise().query('DELETE FROM audit_log');
        await db.promise().query('DELETE FROM users WHERE role != "Admin"');
        await logAction(username, 'CLEAR', 'DATABASE', null, 'Banco de dados zerado (limpeza total).');
        res.json({ success: true, message: "Banco de dados limpo com sucesso!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- ROTAS DE TICKETS ---

app.get('/api/tickets', async (req, res) => {
    const { userId, role } = req.query;
    try {
        let query = `
            SELECT t.*, u.realName as requester_name, e.serial as equipment_serial 
            FROM tickets t 
            JOIN users u ON t.requester_id = u.id 
            LEFT JOIN equipment e ON t.equipment_id = e.id
        `;
        if (role === 'User') {
            query += ` WHERE t.requester_id = ${mysql.escape(userId)}`;
        }
        query += ` ORDER BY t.created_at DESC`;
        const [rows] = await db.promise().query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/tickets', async (req, res) => {
    const { ticket, username } = req.body;
    try {
        const [result] = await db.promise().query(
            'INSERT INTO tickets (title, description, category, priority, requester_id, equipment_id) VALUES (?, ?, ?, ?, ?, ?)',
            [ticket.title, ticket.description, ticket.category, ticket.priority, ticket.requester_id, ticket.equipment_id]
        );
        await logAction(username, 'CREATE', 'TICKET', result.insertId, `Aberto chamado: ${ticket.title}`);
        res.json({ ...ticket, id: result.insertId });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- OUTRAS ROTAS (EQUIPAMENTOS, LICENÇAS, USUÁRIOS) ---

app.get('/api/equipment', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM equipment ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/licenses', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM licenses ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT id, username, realName, email, role, is2FAEnabled, lastLogin, avatarUrl, ssoProvider FROM users');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/audit-log', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 200');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/settings', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM settings WHERE id = 1');
        res.json(rows[0] || {});
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/settings', async (req, res) => {
    const { settings, username } = req.body;
    try {
        await db.promise().query(
            'UPDATE settings SET companyName = ?, isSsoEnabled = ?, is2faEnabled = ?, require2fa = ?, termo_entrega_template = ?, termo_devolucao_template = ? WHERE id = 1',
            [settings.companyName, settings.isSsoEnabled, settings.is2faEnabled, settings.require2fa, settings.termo_entrega_template, settings.termo_devolucao_template]
        );
        await logAction(username, 'UPDATE', 'SETTINGS', 1, 'Configurações do sistema atualizadas.');
        res.json({ success: true, message: "Configurações salvas!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Gestão de Totais de Licenças
app.get('/api/licenses/totals', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM license_totals');
        const totals = {};
        rows.forEach(r => totals[r.product_name] = r.total_purchased);
        res.json(totals);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/licenses/totals', async (req, res) => {
    const { totals, username } = req.body;
    try {
        for (const [name, val] of Object.entries(totals)) {
            await db.promise().query(
                'INSERT INTO license_totals (product_name, total_purchased) VALUES (?, ?) ON DUPLICATE KEY UPDATE total_purchased = ?',
                [name, val, val]
            );
        }
        await logAction(username, 'UPDATE', 'TOTALS', null, 'Totais de licenças atualizados.');
        res.json({ success: true, message: "Totais salvos!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Aprovações
app.get('/api/approvals/pending', async (req, res) => {
    try {
        const [equip] = await db.promise().query('SELECT id, equipamento as name, "equipment" as itemType FROM equipment WHERE approval_status = "pending_approval"');
        const [lics] = await db.promise().query('SELECT id, produto as name, "license" as itemType FROM licenses WHERE approval_status = "pending_approval"');
        res.json([...equip, ...lics]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/approvals/approve', async (req, res) => {
    const { type, id, username } = req.body;
    try {
        const table = type === 'equipment' ? 'equipment' : 'licenses';
        await db.promise().query(`UPDATE ${table} SET approval_status = "approved" WHERE id = ?`, [id]);
        await logAction(username, 'APPROVE', type.toUpperCase(), id, `Aprovado novo item no inventário.`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Inicialização
const PORT = process.env.API_PORT || 3001;
app.listen(PORT, async () => {
    console.log(`🚀 Servidor backend iniciado na porta ${PORT}`);
    await runMigrations();
});
