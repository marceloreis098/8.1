
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');

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

// --- ROTAS DE AUTENTICAÇÃO ---

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ message: "Usuário não encontrado." });
        
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: "Senha incorreta." });

        await db.promise().query('UPDATE users SET lastLogin = NOW() WHERE id = ?', [user.id]);
        await logAction(username, 'LOGIN', 'USER', user.id, 'Login realizado no sistema.');
        
        const { password: _, twoFactorSecret: __, ...userResponse } = user;
        res.json(userResponse);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/verify-2fa', async (req, res) => {
    const { userId, token } = req.body;
    try {
        const [rows] = await db.promise().query('SELECT * FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) return res.status(404).json({ message: "Usuário não encontrado." });
        
        const user = rows[0];
        const verified = authenticator.check(token, user.twoFactorSecret);
        if (!verified) return res.status(401).json({ message: "Código 2FA inválido." });
        
        const { password: _, twoFactorSecret: __, ...userResponse } = user;
        res.json(userResponse);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- ROTAS DE EQUIPAMENTOS ---

app.get('/api/equipment', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM equipment ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/equipment', async (req, res) => {
    const { equipment, username } = req.body;
    try {
        const [result] = await db.promise().query(
            'INSERT INTO equipment (equipamento, serial, patrimonio, brand, model, usuarioAtual, setor, local, status, dataEntregaUsuario, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [equipment.equipamento, equipment.serial, equipment.patrimonio, equipment.brand, equipment.model, equipment.usuarioAtual, equipment.setor, equipment.local, equipment.status, equipment.dataEntregaUsuario, equipment.observacoes]
        );
        await logAction(username, 'CREATE', 'EQUIPMENT', result.insertId, `Adicionado: ${equipment.equipamento}`);
        res.json({ ...equipment, id: result.insertId });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/equipment/:id', async (req, res) => {
    const { id } = req.params;
    const { equipment, username } = req.body;
    try {
        await db.promise().query(
            'UPDATE equipment SET equipamento=?, serial=?, patrimonio=?, brand=?, model=?, usuarioAtual=?, setor=?, local=?, status=?, dataEntregaUsuario=?, observacoes=? WHERE id=?',
            [equipment.equipamento, equipment.serial, equipment.patrimonio, equipment.brand, equipment.model, equipment.usuarioAtual, equipment.setor, equipment.local, equipment.status, equipment.dataEntregaUsuario, equipment.observacoes, id]
        );
        await logAction(username, 'UPDATE', 'EQUIPMENT', id, `Atualizado: ${equipment.equipamento}`);
        res.json(equipment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/equipment/:id', async (req, res) => {
    const { id } = req.params;
    const { username } = req.body;
    try {
        await db.promise().query('DELETE FROM equipment WHERE id = ?', [id]);
        await logAction(username, 'DELETE', 'EQUIPMENT', id, `Removido item de ID ${id}`);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- ROTAS DE LICENÇAS ---

app.get('/api/licenses', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM licenses ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/licenses', async (req, res) => {
    const { license, username } = req.body;
    try {
        const [result] = await db.promise().query(
            'INSERT INTO licenses (produto, chaveSerial, usuario, tipoLicenca, dataExpiracao) VALUES (?, ?, ?, ?, ?)',
            [license.produto, license.chaveSerial, license.usuario, license.tipoLicenca, license.dataExpiracao]
        );
        await logAction(username, 'CREATE', 'LICENSE', result.insertId, `Adicionada licença: ${license.produto}`);
        res.json({ ...license, id: result.insertId });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- USUÁRIOS ---

app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT id, username, realName, email, role, is2FAEnabled, lastLogin, avatarUrl FROM users');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    const { user, username: adminUsername } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(user.password || '123456', 10);
        const [result] = await db.promise().query(
            'INSERT INTO users (username, realName, email, password, role) VALUES (?, ?, ?, ?, ?)',
            [user.username, user.realName, user.email, hashedPassword, user.role]
        );
        await logAction(adminUsername, 'CREATE', 'USER', result.insertId, `Criado usuário: ${user.username}`);
        res.json({ id: result.insertId, ...user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- CONFIGURAÇÕES E BANCO ---

app.get('/api/settings', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM settings WHERE id = 1');
        res.json(rows[0] || {});
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/database/backup-status', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT last_backup_timestamp FROM settings WHERE id = 1');
        res.json({ hasBackup: !!rows[0]?.last_backup_timestamp, backupTimestamp: rows[0]?.last_backup_timestamp });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/', (req, res) => res.json({ status: "online", version: "1.2.0" }));

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => console.log(`🚀 API escutando na porta ${PORT}`));
