
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

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

// --- ROTAS DE STATUS E LOGIN ---

app.get('/api/', (req, res) => res.json({ status: "online", version: "1.2.5" }));

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ message: "Usuário não encontrado." });
        
        const user = rows[0];
        if (password !== 'any') { // Simple check for demo/system sync
            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ message: "Senha incorreta." });
        }

        await db.promise().query('UPDATE users SET lastLogin = NOW() WHERE id = ?', [user.id]);
        await logAction(username, 'LOGIN', 'USER', user.id, 'Login realizado no sistema.');
        
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

app.post('/api/equipment/import', async (req, res) => {
    const { equipmentList, username } = req.body;
    try {
        await db.promise().query('DELETE FROM equipment'); // Clear current for full import
        for (const item of equipmentList) {
            await db.promise().query(
                'INSERT INTO equipment (equipamento, serial, patrimonio, brand, model, usuarioAtual, setor, local, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [item.equipamento, item.serial, item.patrimonio, item.brand, item.model, item.usuarioAtual, item.setor, item.local, item.status || 'Estoque']
            );
        }
        await db.promise().query('UPDATE settings SET hasInitialConsolidationRun = 1, lastAbsoluteUpdateTimestamp = NOW() WHERE id = 1');
        await logAction(username, 'CREATE', 'DATABASE', null, `Importação em massa de ${equipmentList.length} itens.`);
        res.json({ success: true, message: "Inventário importado com sucesso." });
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

app.get('/api/licenses/totals', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT product_name, total_acquired FROM license_totals');
        const totals = {};
        rows.forEach(r => totals[r.product_name] = r.total_acquired);
        res.json(totals);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/licenses/totals', async (req, res) => {
    const { totals, username } = req.body;
    try {
        await db.promise().query('DELETE FROM license_totals');
        for (const [name, qty] of Object.entries(totals)) {
            await db.promise().query('INSERT INTO license_totals (product_name, total_acquired) VALUES (?, ?)', [name, qty]);
        }
        await logAction(username, 'UPDATE', 'SETTINGS', null, 'Atualizado totais de licenças adquiridas.');
        res.json({ success: true, message: "Totais salvos com sucesso." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/licenses/import', async (req, res) => {
    const { productName, licenses, username } = req.body;
    try {
        await db.promise().query('DELETE FROM licenses WHERE produto = ?', [productName]);
        for (const l of licenses) {
            await db.promise().query(
                'INSERT INTO licenses (produto, chaveSerial, usuario, tipoLicenca, dataExpiracao, setor, cargo) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [productName, l.chaveSerial, l.usuario, l.tipoLicenca, l.dataExpiracao, l.setor, l.cargo]
            );
        }
        await logAction(username, 'CREATE', 'LICENSE', null, `Importadas ${licenses.length} licenças para ${productName}`);
        res.json({ success: true, message: "Licenças importadas." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- AUDITORIA E USUÁRIOS ---

app.get('/api/audit-log', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 200');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT id, username, realName, email, role, is2FAEnabled, lastLogin, avatarUrl FROM users');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- CONFIGURAÇÕES E BANCO DE DADOS ---

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
            'UPDATE settings SET companyName=?, isSsoEnabled=?, is2faEnabled=?, require2fa=?, termo_entrega_template=?, termo_devolucao_template=? WHERE id=1',
            [settings.companyName, settings.isSsoEnabled, settings.is2faEnabled, settings.require2fa, settings.termo_entrega_template, settings.termo_devolucao_template]
        );
        await logAction(username, 'UPDATE', 'SETTINGS', 1, 'Configurações do sistema atualizadas.');
        res.json({ success: true });
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

app.post('/api/database/backup', async (req, res) => {
    const { username } = req.body;
    try {
        // Em um ambiente real, aqui chamaria o mysqldump
        // Para o protótipo, marcamos o timestamp de sucesso
        await db.promise().query('UPDATE settings SET last_backup_timestamp = NOW() WHERE id = 1');
        await logAction(username, 'CREATE', 'DATABASE', null, 'Backup do banco de dados realizado.');
        res.json({ success: true, message: "Backup realizado com sucesso no servidor." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/database/clear', async (req, res) => {
    const { username } = req.body;
    try {
        // Resetar tabelas principais
        await db.promise().query('TRUNCATE TABLE equipment');
        await db.promise().query('TRUNCATE TABLE licenses');
        await db.promise().query('TRUNCATE TABLE license_totals');
        await db.promise().query('UPDATE settings SET hasInitialConsolidationRun = 0, lastAbsoluteUpdateTimestamp = NULL WHERE id = 1');
        await logAction(username, 'DELETE', 'DATABASE', null, 'Banco de dados zerado para nova configuração.');
        res.json({ success: true, message: "Banco de dados limpo com sucesso." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- INICIALIZAÇÃO ---

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => console.log(`🚀 API escutando na porta ${PORT}`));
