
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const router = express.Router();

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Database Connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'inventario_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'inventario_pro',
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true
};

const db = mysql.createPool(dbConfig);

// --- FUNÇÃO DE AUTO-CORREÇÃO (BOOTSTRAP) ---
const ensureAdminUser = async () => {
    try {
        const hashedPassword = await bcrypt.hash('Reserva2026', 10);
        const [rows] = await db.promise().query('SELECT * FROM users WHERE username = "admin"');
        
        if (rows.length === 0) {
            console.log('⚠️ Criando usuário admin...');
            await db.promise().query(
                'INSERT INTO users (username, realName, email, role, password) VALUES (?, ?, ?, ?, ?)',
                ['admin', 'Administrador Sistema', 'admin@mrrinformatica.com.br', 'Admin', hashedPassword]
            );
            console.log('✅ Usuário "admin" criado. Senha: Reserva2026');
        } else {
            // FORÇA O RESET DA SENHA para garantir que o login funcione
            await db.promise().query('UPDATE users SET password = ? WHERE username = "admin"', [hashedPassword]);
            console.log('✅ Senha do "admin" resetada para: Reserva2026');
        }
    } catch (err) {
        console.error('❌ Erro no bootstrap:', err.message);
    }
};

db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Erto MySQL:', err.message);
    } else {
        console.log('📡 Conectado ao MySQL.');
        connection.release();
        ensureAdminUser();
    }
});

const logAction = async (username, actionType, targetType, targetId, details) => {
    try {
        await db.promise().query(
            'INSERT INTO audit_log (username, action_type, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
            [username || 'system', actionType, targetType, targetId, details]
        );
    } catch (e) {}
};

// --- ROTAS ---

router.get('/status', (req, res) => res.json({ status: "online" }));

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);
        const user = rows[0];
        if (user && await bcrypt.compare(password, user.password)) {
            const userSafe = Object.assign({}, user);
            delete userSafe.password;
            delete userSafe.secret2FA;
            await logAction(username, 'LOGIN', 'USER', user.id, 'Login efetuado');
            res.json(userSafe);
        } else {
            res.status(401).json({ message: "Usuário ou senha inválidos" });
        }
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/users', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT id, username, realName, email, role, is2FAEnabled, avatarUrl FROM users');
        res.json(rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/equipment', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM equipment ORDER BY id DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/licenses', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM licenses ORDER BY id DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/settings', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM settings WHERE id = 1');
        res.json(rows[0] || { companyName: 'MRR INFORMATICA' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Correção para o erro do log (removido rows[0]?.timestamp)
router.get('/database/backup-status', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT last_backup_timestamp FROM settings WHERE id = 1');
        const hasBackup = rows[0] && rows[0].last_backup_timestamp ? true : false;
        const timestamp = rows[0] ? rows[0].last_backup_timestamp : null;
        res.json({ hasBackup: hasBackup, backupTimestamp: timestamp });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.use('/api', router);

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API RODANDO: http://0.0.0.0:${PORT}/api`);
});
