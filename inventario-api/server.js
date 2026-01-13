
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;
const session = require('express-session');
const { GoogleGenAI } = require("@google/genai"); // Integração Gemini

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ... (Configuração de sessão e passport mantida igual) ...

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
});

const runMigrations = async () => {
    console.log("Checking database migrations...");
    let connection;
    try {
        connection = await db.promise().getConnection();
        
        // ... (Tabelas existentes) ...

        const migrations = [
            // ... (Ids 1 a 15 existentes) ...
            {
                id: 16, sql: `
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
                    remote_link TEXT NULL,
                    sla_due DATETIME NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (requester_id) REFERENCES users(id),
                    FOREIGN KEY (technician_id) REFERENCES users(id),
                    FOREIGN KEY (equipment_id) REFERENCES equipment(id)
                );`
            }
        ];

        // ... (Loop de execução das migrations) ...
        for (const migration of migrations) {
             // Lógica de verificação e execução simplificada aqui para o exemplo
             await connection.query(migration.sql).catch(e => console.log("Migration skip or fail:", e.message));
        }

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        if (connection) connection.release();
    }
};

// ------------------------------------------------------------------
// TICKETS ROUTES
// ------------------------------------------------------------------

app.get('/api/tickets', async (req, res) => {
    const { userId, role } = req.query;
    try {
        let query = `
            SELECT t.*, u_req.realName as requester_name, u_tech.realName as technician_name, e.serial as equipment_serial
            FROM tickets t
            JOIN users u_req ON t.requester_id = u_req.id
            LEFT JOIN users u_tech ON t.technician_id = u_tech.id
            LEFT JOIN equipment e ON t.equipment_id = e.id
        `;
        
        if (role === 'User') {
            query += ` WHERE t.requester_id = ${parseInt(userId)}`;
        }
        
        query += ` ORDER BY t.created_at DESC`;
        
        const [rows] = await db.promise().query(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/tickets', async (req, res) => {
    const { ticket, username } = req.body;
    try {
        const [result] = await db.promise().query(
            'INSERT INTO tickets (title, description, category, priority, requester_id, equipment_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [ticket.title, ticket.description, ticket.category, ticket.priority || 'Média', ticket.requester_id, ticket.equipment_id, 'Aberto']
        );
        res.json({ id: result.insertId, ...ticket });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Integração com Gemini para Resumo do Chamado
app.post('/api/tickets/:id/ai-summary', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT title, description FROM tickets WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).send("Ticket not found");

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Resuma este chamado técnico em uma frase curta para o técnico: Titulo: ${rows[0].title}. Descrição: ${rows[0].description}`,
        });

        res.json({ summary: response.text });
    } catch (error) {
        res.status(500).json({ summary: "IA temporariamente indisponível." });
    }
});

// Simulação de Integração com Splashtop/Zoho Assist via API
app.post('/api/tickets/:id/remote-session', async (req, res) => {
    const { deviceId } = req.body;
    // Aqui aconteceria a chamada real UrlFetchApp / fetch para o provedor remoto
    // Ex: const remoteSession = await fetch('https://api.splashtop.com/v1/sessions', { ... })
    
    // Simulação de retorno de link dinâmico
    const mockUrl = `https://assist.zoho.com/api/v1/agent/connect?session_id=INV-${req.params.id}-${Date.now()}&device=${deviceId}`;
    
    try {
        await db.promise().query('UPDATE tickets SET remote_link = ? WHERE id = ?', [mockUrl, req.params.id]);
        res.json({ url: mockUrl });
    } catch (error) {
        res.status(500).json({ message: "Erro ao gerar sessão remota" });
    }
});

// ... (Restante do server.js existente) ...

app.listen(3001, async () => {
    await runMigrations();
    console.log(`Server running on port 3001`);
});
