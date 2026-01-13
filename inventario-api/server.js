
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

// Helper para Auditoria
const logAction = async (username, actionType, targetType, targetId, details) => {
    try {
        await db.promise().query(
            'INSERT INTO audit_log (username, action_type, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
            [username || 'system', actionType, targetType, targetId, details]
        );
    } catch (e) { console.error('Erro no log de auditoria:', e); }
};

// --- ROTAS DO ROUTER (/api/...) ---

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
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/users', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT id, username, realName, email, role, is2FAEnabled, avatarUrl, ssoProvider, lastLogin FROM users');
        res.json(rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/users', async (req, res) => {
    const { user, username: admin } = req.body;
    try {
        const hash = await bcrypt.hash(user.password, 10);
        const [reslt] = await db.promise().query('INSERT INTO users (username, realName, email, role, password) VALUES (?,?,?,?,?)', [user.username, user.realName, user.email, user.role, hash]);
        await logAction(admin, 'CREATE', 'USER', reslt.insertId, `Criou usuário ${user.username}`);
        res.json({ id: reslt.insertId, ...user });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/equipment', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM equipment ORDER BY id DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/equipment', async (req, res) => {
    const { equipment, username } = req.body;
    try {
        const [result] = await db.promise().query('INSERT INTO equipment SET ?', [equipment]);
        await logAction(username, 'CREATE', 'EQUIPMENT', result.insertId, `Adicionou ${equipment.equipamento}`);
        res.json({ id: result.insertId, ...equipment });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/equipment/:id', async (req, res) => {
    const { id } = req.params;
    const { equipment, username } = req.body;
    try {
        await db.promise().query('UPDATE equipment SET ? WHERE id = ?', [equipment, id]);
        await logAction(username, 'UPDATE', 'EQUIPMENT', id, `Atualizou ${equipment.equipamento}`);
        res.json(equipment);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/equipment/import', async (req, res) => {
    const { equipmentList, username } = req.body;
    try {
        await db.promise().query('DELETE FROM equipment'); // Limpa para importação absoluta
        for (const item of equipmentList) {
            await db.promise().query('INSERT INTO equipment SET ?', [item]);
        }
        await logAction(username, 'IMPORT', 'EQUIPMENT', null, `Importou ${equipmentList.length} itens`);
        res.json({ success: true, message: 'Inventário importado com sucesso' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/licenses', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM licenses ORDER BY id DESC');
        res.json(rows);
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

router.post('/licenses/totals', async (req, res) => {
    const { totals, username } = req.body;
    try {
        await db.promise().query('DELETE FROM license_totals');
        for (const [prod, qty] of Object.entries(totals)) {
            await db.promise().query('INSERT INTO license_totals (produto, total) VALUES (?, ?)', [prod, qty]);
        }
        await logAction(username, 'UPDATE', 'TOTALS', null, 'Atualizou totais de licenças');
        res.json({ success: true, message: 'Totais salvos' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/tickets', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM tickets ORDER BY id DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/audit-log', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 100');
        res.json(rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/settings', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM settings WHERE id = 1');
        res.json(rows[0] || { companyName: 'MRR INFORMATICA' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/settings', async (req, res) => {
    const { settings, username } = req.body;
    try {
        await db.promise().query('UPDATE settings SET ? WHERE id = 1', [settings]);
        await logAction(username, 'UPDATE', 'SETTINGS', 1, 'Atualizou configurações do sistema');
        res.json({ success: true, message: 'Salvo com sucesso' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/config/termo-templates', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT termo_entrega_template, termo_devolucao_template FROM settings WHERE id = 1');
        res.json({
            entregaTemplate: rows[0]?.termo_entrega_template,
            devolucaoTemplate: rows[0]?.termo_devolucao_template
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Middleware do Router
app.use('/api', router);

// Handler global para 404 na API
router.use((req, res) => {
    console.warn(`[404] Rota não encontrada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ message: `Rota ${req.originalUrl} não encontrada no servidor.` });
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API RODANDO: http://0.0.0.0:${PORT}/api`);
    console.log(`✅ Status: http://0.0.0.0:${PORT}/api/status`);
});
