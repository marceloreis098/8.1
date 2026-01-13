
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
        const [rows] = await db.promise().query('SELECT * FROM users WHERE username = "admin"');
        if (rows.length === 0) {
            console.log('⚠️ Usuário admin não encontrado. Criando agora...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Reserva2026', salt);
            
            await db.promise().query(
                'INSERT INTO users (username, realName, email, role, password) VALUES (?, ?, ?, ?, ?)',
                ['admin', 'Administrador Sistema', 'admin@mrrinformatica.com.br', 'Admin', hashedPassword]
            );
            console.log('✅ Usuário "admin" criado com sucesso! Senha: Reserva2026');
        } else {
            console.log('✅ Usuário admin já existe no banco.');
            // Opcional: Forçar reset de senha do admin se necessário descomentando abaixo
            // const hashedPassword = await bcrypt.hash('Reserva2026', 10);
            // await db.promise().query('UPDATE users SET password = ? WHERE username = "admin"', [hashedPassword]);
        }
    } catch (err) {
        console.error('❌ Erro ao verificar/criar usuário admin:', err.message);
    }
};

// Testar conexão e rodar bootstrap
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Erro de conexão com o Banco:', err.message);
    } else {
        console.log('📡 Conectado ao MySQL.');
        connection.release();
        ensureAdminUser();
    }
});

// Helper para Auditoria
const logAction = async (username, actionType, targetType, targetId, details) => {
    try {
        await db.promise().query(
            'INSERT INTO audit_log (username, action_type, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
            [username || 'system', actionType, targetType, targetId, details]
        );
    } catch (e) { console.error('Erro no log de auditoria:', e); }
};

// --- ROTAS DA API ---

router.get('/status', (req, res) => res.json({ status: "online", database: "connected" }));

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);
        const user = rows[0];
        
        if (user && await bcrypt.compare(password, user.password)) {
            const { password: _, secret2FA: __, ...userSafe } = user;
            await logAction(username, 'LOGIN', 'USER', user.id, 'Login efetuado');
            res.json(userSafe);
        } else {
            res.status(401).json({ message: "Usuário ou senha inválidos" });
        }
    } catch (err) { 
        console.error('Erro no login:', err);
        res.status(500).json({ message: "Erro interno no servidor de autenticação" }); 
    }
});

router.get('/users', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT id, username, realName, email, role, is2FAEnabled, avatarUrl, ssoProvider, lastLogin FROM users');
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

router.get('/licenses/totals', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM license_totals');
        const totals = {};
        rows.forEach(r => totals[r.produto] = r.total);
        res.json(totals);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.use('/api', router);

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API RODANDO: http://0.0.0.0:${PORT}/api`);
});
