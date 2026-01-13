
import { User, Equipment, License, UserRole, EquipmentHistory, AuditLogEntry, AppSettings, Ticket } from '../types';

const handleResponse = async (response: Response) => {
    if (response.status === 204) return;
    if (!response.ok) {
        let errorMessage = `Erro HTTP! Status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            // Se não for JSON, mantém a mensagem padrão com o status
        }
        throw new Error(errorMessage);
    }
    return response.json();
};

// --- CONFIGURAÇÃO DE URL DINÂMICA ---
const getApiBaseUrl = () => {
    const { protocol, hostname } = window.location;
    // Força a porta 3001 para a API
    return `${protocol}//${hostname}:3001/api`;
};

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const baseUrl = getApiBaseUrl();
    // Garante que o endpoint comece com / e o baseUrl não termine com /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    try {
        const response = await fetch(url, { ...options, headers });
        return await handleResponse(response);
    } catch (error: any) {
        console.error(`Falha na requisição para ${url}:`, error);
        throw error;
    }
};

// --- DATA FETCHING ---

export const getTickets = async (user: User): Promise<Ticket[]> => {
    return apiRequest(`/tickets?userId=${user.id}&role=${user.role}`);
};

export const getEquipment = async (user: User): Promise<Equipment[]> => {
    return apiRequest(`/equipment?userId=${user.id}&role=${user.role}`);
};

export const getLicenses = async (user: User): Promise<License[]> => {
    return apiRequest(`/licenses?userId=${user.id}&role=${user.role}`);
};

export const getUsers = async (): Promise<User[]> => {
    return apiRequest('/users');
};

export const getAuditLog = async (): Promise<AuditLogEntry[]> => {
    return apiRequest('/audit-log');
};

export const getSettings = async (): Promise<AppSettings> => {
    return apiRequest('/settings');
};

export const getLicenseTotals = (): Promise<Record<string, number>> => {
    return apiRequest('/licenses/totals');
};

export const login = (credentials: {username: string, password?: string, ssoToken?: string}): Promise<User> => {
    return apiRequest('/login', { method: 'POST', body: JSON.stringify(credentials) });
};

export const checkApiStatus = async (): Promise<{ ok: boolean, message?: string }> => {
    try {
        const baseUrl = getApiBaseUrl();
        // Chamada direta para o status sem o helper para evitar recursão ou logs excessivos
        const response = await fetch(`${baseUrl}/status`, { cache: 'no-store' }); 
        return { ok: response.ok };
    } catch (error: any) {
        return { ok: false, message: 'API Offline' };
    }
};

// --- OPERAÇÕES DE ESCRITA ---

export const createTicket = async (ticket: Partial<Ticket>, username: string): Promise<Ticket> => {
    return apiRequest('/tickets', { method: 'POST', body: JSON.stringify({ ticket, username }) });
};

export const updateTicket = async (ticket: Partial<Ticket>, username: string): Promise<Ticket> => {
    return apiRequest(`/tickets/${ticket.id}`, { method: 'PUT', body: JSON.stringify({ ticket, username }) });
};

export const addEquipment = (equipment: Omit<Equipment, 'id'>, user: User): Promise<Equipment> => {
    return apiRequest('/equipment', { method: 'POST', body: JSON.stringify({ equipment, username: user.username }) });
};

export const updateEquipment = (equipment: Equipment, username: string): Promise<Equipment> => {
    return apiRequest(`/equipment/${equipment.id}`, { method: 'PUT', body: JSON.stringify({ equipment, username }) });
};

export const updateLicense = (license: License, username: string): Promise<License> => {
    return apiRequest(`/licenses/${license.id}`, { method: 'PUT', body: JSON.stringify({ license, username }) });
};

export const addLicense = (license: Omit<License, 'id'>, user: User): Promise<License> => {
    return apiRequest('/licenses', { method: 'POST', body: JSON.stringify({ license, username: user.username }) });
};

export const deleteEquipment = (id: number, username: string): Promise<void> => {
    return apiRequest(`/equipment/${id}`, { method: 'DELETE', body: JSON.stringify({ username }) });
};

export const deleteLicense = (id: number, username: string): Promise<void> => {
    return apiRequest(`/licenses/${id}`, { method: 'DELETE', body: JSON.stringify({ username }) });
};

export const getEquipmentHistory = (equipmentId: number): Promise<EquipmentHistory[]> => apiRequest(`/equipment/${equipmentId}/history`);
export const verify2FA = (userId: number, token: string): Promise<User> => apiRequest('/verify-2fa', { method: 'POST', body: JSON.stringify({ userId, token }) });
export const getPendingApprovals = (): Promise<{id: number, name: string, itemType: 'equipment' | 'license'}[]> => apiRequest('/approvals/pending');
export const saveSettings = (settings: AppSettings, username: string): Promise<{ success: boolean; message: string; }> => apiRequest('/settings', { method: 'POST', body: JSON.stringify({ settings, username }) });
export const getTermoTemplates = (): Promise<{ entregaTemplate: string, devolucaoTemplate: string }> => apiRequest('/config/termo-templates');
export const generateAiReport = (query: string, data: Equipment[], username: string): Promise<{ reportData?: Equipment[], error?: string }> => apiRequest('/ai/generate-report', { method: 'POST', body: JSON.stringify({ query, data, username }) });
export const summarizeTicketWithAI = (ticketId: number): Promise<{ summary: string }> => apiRequest(`/tickets/${ticketId}/ai-summary`, { method: 'POST' });
export const deleteUser = (id: number, username: string): Promise<void> => apiRequest(`/users/${id}`, { method: 'DELETE', body: JSON.stringify({ username }) });
export const addUser = (user: Omit<User, 'id'>, username: string): Promise<User> => apiRequest('/users', { method: 'POST', body: JSON.stringify({ user, username }) });
export const updateUser = (user: User, username: string): Promise<User> => apiRequest(`/users/${user.id}`, { method: 'PUT', body: JSON.stringify({ user, username }) });
export const updateUserProfile = (userId: number, profileData: { realName: string; avatarUrl: string }): Promise<User> => apiRequest(`/users/${userId}/profile`, { method: 'PUT', body: JSON.stringify(profileData) });
export const approveItem = (type: 'equipment' | 'license', id: number, username: string): Promise<void> => apiRequest(`/approvals/approve`, { method: 'POST', body: JSON.stringify({ type, id, username }) });
export const rejectItem = (type: 'equipment' | 'license', id: number, username: string, reason: string): Promise<void> => apiRequest(`/approvals/reject`, { method: 'POST', body: JSON.stringify({ type, id, username, reason }) });
export const saveLicenseTotals = (totals: Record<string, number>, username: string): Promise<{ success: boolean; message: string; }> => apiRequest('/licenses/totals', { method: 'POST', body: JSON.stringify({ totals, username }) });
export const renameProduct = (oldName: string, newName: string, username: string): Promise<void> => apiRequest('/licenses/rename-product', { method: 'POST', body: JSON.stringify({ oldName, newName, username }) });
export const importEquipment = (data: Omit<Equipment, 'id'>[], username: string): Promise<{success: boolean, message: string}> => apiRequest('/equipment/import', { method: 'POST', body: JSON.stringify({ equipmentList: data, username }) });
export const periodicUpdateEquipment = (data: Partial<Equipment>[], username: string): Promise<{success: boolean, message: string}> => apiRequest('/equipment/periodic-update', { method: 'POST', body: JSON.stringify({ equipmentList: data, username }) });
export const importLicenses = (data: any, username: string): Promise<{success: boolean, message: string}> => apiRequest('/licenses/import', { method: 'POST', body: JSON.stringify({ ...data, username }) });
export const generate2FASecret = (userId: number): Promise<{ secret: string; qrCodeUrl: string; }> => apiRequest('/generate-2fa', { method: 'POST', body: JSON.stringify({ userId }) });
export const enable2FA = (userId: number, token: string): Promise<void> => apiRequest('/enable-2fa', { method: 'POST', body: JSON.stringify({ userId, token }) });
export const disable2FA = (userId: number): Promise<void> => apiRequest('/disable-2fa', { method: 'POST', body: JSON.stringify({ userId }) });
export const disableUser2FA = (userId: number): Promise<void> => apiRequest('/disable-user-2fa', { method: 'POST', body: JSON.stringify({ userId }) });
export const checkDatabaseBackupStatus = (username?: string): Promise<{ hasBackup: boolean; backupTimestamp?: string }> => apiRequest(`/database/backup-status`).catch(() => ({ hasBackup: false }));
export const backupDatabase = (username: string): Promise<{ success: boolean; message: string; backupTimestamp?: string }> => apiRequest('/database/backup', { method: 'POST', body: JSON.stringify({ username }) });
export const restoreDatabase = (username: string): Promise<{ success: boolean; message: string }> => apiRequest('/database/restore', { method: 'POST', body: JSON.stringify({ username }) });
export const clearDatabase = (username: string): Promise<{ success: boolean; message: string }> => apiRequest('/database/clear', { method: 'POST', body: JSON.stringify({ username }) });
export const deleteTicket = (id: number, username: string): Promise<void> => apiRequest(`/tickets/${id}`, { method: 'DELETE', body: JSON.stringify({ username }) });
export const generateRemoteLink = (ticketId: number, deviceId: string): Promise<{ url: string }> => apiRequest(`/tickets/${ticketId}/remote-session`, { method: 'POST', body: JSON.stringify({ deviceId }) });
