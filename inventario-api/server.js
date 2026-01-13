
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

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
            [username, actionType, targetType, targetId, details]
        );
    } catch (e) { console.error(e); }
};

app.get('/api/', (req, res) => res.json({ status: "online", version: "1.3.0" }));

app.get('/api/equipment', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM equipment ORDER BY id DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/equipment', async (req, res) => {
    const { equipment, username } = req.body;
    try {
        const [result] = await db.promise().query(
            'INSERT INTO equipment (equipamento, serial, rustdesk_id, patrimonio, brand, model, usuarioAtual, setor, local, status, dataEntregaUsuario, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [equipment.equipamento, equipment.serial, equipment.rustdesk_id, equipment.patrimonio, equipment.brand, equipment.model, equipment.usuarioAtual, equipment.setor, equipment.local, equipment.status, equipment.dataEntregaUsuario, equipment.observacoes]
        );
        await logAction(username, 'CREATE', 'EQUIPMENT', result.insertId, `Adicionado: ${equipment.equipamento}`);
        res.json({ ...equipment, id: result.insertId });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/equipment/:id', async (req, res) => {
    const { id } = req.params;
    const { equipment, username } = req.body;
    try {
        await db.promise().query(
            'UPDATE equipment SET equipamento=?, serial=?, rustdesk_id=?, patrimonio=?, brand=?, model=?, usuarioAtual=?, setor=?, local=?, status=?, dataEntregaUsuario=?, observacoes=? WHERE id=?',
            [equipment.equipamento, equipment.serial, equipment.rustdesk_id, equipment.patrimonio, equipment.brand, equipment.model, equipment.usuarioAtual, equipment.setor, equipment.local, equipment.status, equipment.dataEntregaUsuario, equipment.observacoes, id]
        );
        await logAction(username, 'UPDATE', 'EQUIPMENT', id, `Atualizado: ${equipment.equipamento}`);
        res.json(equipment);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => console.log(`🚀 API escutando na porta ${PORT}`));
