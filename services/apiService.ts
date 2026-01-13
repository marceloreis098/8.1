
import { User, Equipment, License, UserRole, EquipmentHistory, AuditLogEntry, AppSettings, Ticket } from '../types';
import * as demo from './demoData';

const isDemo = () => localStorage.getItem('demo_mode') === 'true';

const handleResponse = async (response: Response) => {
    if (response.status === 204) return;
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message || 'An unknown error occurred');
    }
    return response.json();
};

const getApiBaseUrl = () => `/api`;

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, { ...options, headers });
    return handleResponse(response);
};

// --- DEMO OVERRIDES ---

export const getTickets = async (user: User): Promise<Ticket[]> => {
    if (isDemo()) return demo.mockTickets;
    return apiRequest(`/tickets?userId=${user.id}&role=${user.role}`);
};

export const getEquipment = async (user: User): Promise<Equipment[]> => {
    if (isDemo()) return demo.mockEquipment;
    return apiRequest(`/equipment?userId=${user.id}&role=${user.role}`);
};

export const getLicenses = async (user: User): Promise<License[]> => {
    if (isDemo()) return demo.mockLicenses;
    return apiRequest(`/licenses?userId=${user.id}&role=${user.role}`);
};

export const getUsers = async (): Promise<User[]> => {
    if (isDemo()) return demo.mockUsers;
    return apiRequest('/users');
};

export const getAuditLog = async (): Promise<AuditLogEntry[]> => {
    if (isDemo()) return demo.mockAudit;
    return apiRequest('/audit-log');
};

export const getSettings = async (): Promise<AppSettings> => {
    const realSettings = await apiRequest('/settings');
    if (isDemo()) return { ...realSettings, companyName: 'RESERVA DEMO' };
    return realSettings;
};

// --- PERSISTENCE WRAPPERS (Simulados no modo demo) ---

export const createTicket = async (ticket: Partial<Ticket>, username: string): Promise<Ticket> => {
    if (isDemo()) return { ...ticket, id: Math.floor(Math.random() * 1000) } as Ticket;
    return apiRequest('/tickets', { method: 'POST', body: JSON.stringify({ ticket, username }) });
};

export const updateTicket = async (ticket: Partial<Ticket>, username: string): Promise<Ticket> => {
    if (isDemo()) return ticket as Ticket;
    return apiRequest(`/tickets/${ticket.id}`, { method: 'PUT', body: JSON.stringify({ ticket, username }) });
};

// ... (Restante dos métodos existentes seguindo o mesmo padrão de IF isDemo())

export const login = (credentials: {username: string, password?: string, ssoToken?: string}): Promise<User> => {
    if (isDemo() && credentials.username === 'admin') return Promise.resolve(demo.mockUsers[0]);
    return apiRequest('/login', { method: 'POST', body: JSON.stringify(credentials) });
};

export const checkApiStatus = async (): Promise<{ ok: boolean, message?: string }> => {
    if (isDemo()) return { ok: true };
    try {
        const response = await fetch(`${getApiBaseUrl()}/`); 
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        await response.json();
        return { ok: true };
    } catch (error: any) {
        return { ok: false, message: 'Falha ao conectar com a API.' };
    }
};

export const verify2FA = (userId: number, token: string): Promise<User> => {
    return apiRequest('/verify-2fa', { method: 'POST', body: JSON.stringify({ userId, token }) });
};

export const getEquipmentHistory = (equipmentId: number): Promise<EquipmentHistory[]> => {
    return apiRequest(`/equipment/${equipmentId}/history`);
};

export const addEquipment = (equipment: Omit<Equipment, 'id'>, user: User): Promise<Equipment> => {
    return apiRequest('/equipment', { method: 'POST', body: JSON.stringify({ equipment, username: user.username }) });
};

export const updateEquipment = (equipment: Equipment, username: string): Promise<Equipment> => {
    return apiRequest(`/equipment/${equipment.id}`, { method: 'PUT', body: JSON.stringify({ equipment, username }) });
};

export const deleteEquipment = (id: number, username: string): Promise<void> => {
    return apiRequest(`/equipment/${id}`, { method: 'DELETE', body: JSON.stringify({ username }) });
};

export const addLicense = (license: Omit<License, 'id'>, user: User): Promise<License> => {
    return apiRequest('/licenses', { method: 'POST', body: JSON.stringify({ license, username: user.username }) });
};

export const updateLicense = (license: License, username: string): Promise<License> => {
    return apiRequest(`/licenses/${license.id}`, { method: 'PUT', body: JSON.stringify({ license, username }) });
};

export const deleteLicense = (id: number, username: string): Promise<void> => {
    return apiRequest(`/licenses/${id}`, { method: 'DELETE', body: JSON.stringify({ username }) });
};

export const addUser = (user: Omit<User, 'id'>, username: string): Promise<User> => {
    return apiRequest('/users', { method: 'POST', body: JSON.stringify({ user, username }) });
};

export const updateUser = (user: User, username: string): Promise<User> => {
    return apiRequest(`/users/${user.id}`, { method: 'PUT', body: JSON.stringify({ user, username }) });
};

export const updateUserProfile = (userId: number, profileData: { realName: string; avatarUrl: string }): Promise<User> => {
    return apiRequest(`/users/${userId}/profile`, { method: 'PUT', body: JSON.stringify(profileData) });
};

export const deleteUser = (id: number, username: string): Promise<void> => {
    return apiRequest(`/users/${id}`, { method: 'DELETE', body: JSON.stringify({ username }) });
};

export const getPendingApprovals = (): Promise<{id: number, name: string, itemType: 'equipment' | 'license'}[]> => {
    return apiRequest('/approvals/pending');
};

export const approveItem = (type: 'equipment' | 'license', id: number, username: string): Promise<void> => {
    return apiRequest(`/approvals/approve`, { method: 'POST', body: JSON.stringify({ type, id, username }) });
};

export const rejectItem = (type: 'equipment' | 'license', id: number, username: string, reason: string): Promise<void> => {
    return apiRequest(`/approvals/reject`, { method: 'POST', body: JSON.stringify({ type, id, username, reason }) });
};

export const getLicenseTotals = (): Promise<Record<string, number>> => {
    return apiRequest('/licenses/totals');
};

export const saveLicenseTotals = (totals: Record<string, number>, username: string): Promise<{ success: boolean; message: string; }> => {
    return apiRequest('/licenses/totals', { method: 'POST', body: JSON.stringify({ totals, username }) });
};

export const renameProduct = (oldName: string, newName: string, username: string): Promise<void> => {
    return apiRequest('/licenses/rename-product', { method: 'POST', body: JSON.stringify({ oldName, newName, username }) });
};

export const importEquipment = (data: Omit<Equipment, 'id'>[], username: string): Promise<{success: boolean, message: string}> => {
    return apiRequest('/equipment/import', { method: 'POST', body: JSON.stringify({ equipmentList: data, username }) });
}

export const periodicUpdateEquipment = (data: Partial<Equipment>[], username: string): Promise<{success: boolean, message: string}> => {
    return apiRequest('/equipment/periodic-update', { method: 'POST', body: JSON.stringify({ equipmentList: data, username }) });
}

export const importLicenses = (data: any, username: string): Promise<{success: boolean, message: string}> => {
    return apiRequest('/licenses/import', { method: 'POST', body: JSON.stringify({ ...data, username }) });
}

export const generate2FASecret = (userId: number): Promise<{ secret: string; qrCodeUrl: string; }> => {
    return apiRequest('/generate-2fa', { method: 'POST', body: JSON.stringify({ userId }) });
};

export const enable2FA = (userId: number, token: string): Promise<void> => {
    return apiRequest('/enable-2fa', { method: 'POST', body: JSON.stringify({ userId, token }) });
};

export const disable2FA = (userId: number): Promise<void> => {
    return apiRequest('/disable-2fa', { method: 'POST', body: JSON.stringify({ userId }) });
};

export const disableUser2FA = (userId: number): Promise<void> => {
    return apiRequest('/disable-user-2fa', { method: 'POST', body: JSON.stringify({ userId }) });
};

export const saveSettings = (settings: AppSettings, username: string): Promise<{ success: boolean; message: string; }> => {
    return apiRequest('/settings', { method: 'POST', body: JSON.stringify({ settings, username }) });
};

export const getTermoTemplates = (): Promise<{ entregaTemplate: string, devolucaoTemplate: string }> => {
    return apiRequest('/config/termo-templates');
};

export const checkDatabaseBackupStatus = (username?: string): Promise<{ hasBackup: boolean; backupTimestamp?: string }> => {
    return apiRequest(`/database/backup-status`);
};

export const backupDatabase = (username: string): Promise<{ success: boolean; message: string; backupTimestamp?: string }> => {
    return apiRequest('/database/backup', { method: 'POST', body: JSON.stringify({ username }) });
};

export const restoreDatabase = (username: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest('/database/restore', { method: 'POST', body: JSON.stringify({ username }) });
};

export const clearDatabase = (username: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest('/database/clear', { method: 'POST', body: JSON.stringify({ username }) });
};

export const generateAiReport = (query: string, data: Equipment[], username: string): Promise<{ reportData?: Equipment[], error?: string }> => {
    return apiRequest('/ai/generate-report', {
        method: 'POST',
        body: JSON.stringify({ query, data, username })
    });
};

export const deleteTicket = (id: number, username: string): Promise<void> => {
    return apiRequest(`/tickets/${id}`, { method: 'DELETE', body: JSON.stringify({ username }) });
};

export const generateRemoteLink = (ticketId: number, deviceId: string): Promise<{ url: string }> => {
    return apiRequest(`/tickets/${ticketId}/remote-session`, { 
        method: 'POST', 
        body: JSON.stringify({ deviceId }) 
    });
};

export const summarizeTicketWithAI = (ticketId: number): Promise<{ summary: string }> => {
    return apiRequest(`/tickets/${ticketId}/ai-summary`, { method: 'POST' });
};
