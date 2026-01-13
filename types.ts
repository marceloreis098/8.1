
// types.ts

export type Page = 'Dashboard' | 'Inventário de Equipamentos' | 'Controle de Licenças' | 'Usuários e Permissões' | 'Configurações' | 'Auditoria' | 'Service Desk';

export enum UserRole {
    Admin = 'Admin',
    UserManager = 'User Manager',
    User = 'User'
}

export enum TicketStatus {
    Open = 'Aberto',
    InProgress = 'Em Atendimento',
    WaitingUser = 'Aguardando Usuário',
    Resolved = 'Resolvido',
    Closed = 'Fechado'
}

export enum TicketPriority {
    Low = 'Baixa',
    Medium = 'Média',
    High = 'Alta',
    Critical = 'Crítica'
}

export interface User {
    id: number;
    username: string;
    realName: string;
    email: string;
    role: UserRole;
    password?: string;
    lastLogin?: string;
    is2FAEnabled: boolean;
    avatarUrl?: string;
    ssoProvider?: string;
}

export interface Equipment {
    id: number;
    equipamento: string;
    garantia?: string;
    patrimonio?: string;
    serial?: string;
    rustdesk_id?: string;
    usuarioAtual?: string;
    usuarioAnterior?: string;
    local?: string;
    setor?: string;
    dataEntregaUsuario?: string;
    status?: string;
    dataDevolucao?: string;
    tipo?: string;
    notaCompra?: string;
    notaPlKm?: string;
    termoResponsabilidade?: string;
    foto?: string;
    qrCode?: string;
    brand?: string;
    model?: string;
    observacoes?: string;
    emailColaborador?: string;
    approval_status?: 'pending_approval' | 'approved' | 'rejected';
    rejection_reason?: string;
    created_by_id?: number;
    identificador?: string;
    nomeSO?: string;
    memoriaFisicaTotal?: string;
    grupoPoliticas?: string;
    pais?: string;
    cidade?: string;
    estadoProvincia?: string;
    condicaoTermo?: 'Assinado - Entrega' | 'Assinado - Devolução' | 'Pendente' | 'N/A';
}

export interface Ticket {
    id: number;
    title: string;
    description: string;
    category: 'Hardware' | 'Software' | 'Rede' | 'Acesso' | 'Outros';
    status: TicketStatus;
    priority: TicketPriority;
    requester_id: number;
    requester_name: string;
    technician_id?: number;
    technician_name?: string;
    equipment_id?: number;
    equipment_serial?: string;
    remote_link?: string;
    sla_due?: string;
    created_at: string;
    updated_at: string;
}

export interface License {
    id: number;
    produto: string;
    tipoLicenca?: string;
    chaveSerial: string;
    dataExpiracao?: string;
    usuario: string;
    cargo?: string;
    empresa?: string;
    setor?: string;
    gestor?: string;
    centroCusto?: string;
    contaRazao?: string;
    nomeComputador?: string;
    numeroChamado?: string;
    observacoes?: string;
    approval_status?: 'pending_approval' | 'approved' | 'rejected';
    rejection_reason?: string;
    created_by_id?: number;
}

export interface EquipmentHistory {
    id: number;
    timestamp: string;
    changedBy: string;
    changeType: string;
    from_value: string | null;
    to_value: string | null;
}

export interface AuditLogEntry {
    id: number;
    username: string;
    action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | '2FA_ENABLE' | '2FA_DISABLE' | 'SETTINGS_UPDATE';
    target_type: 'EQUIPMENT' | 'LICENSE' | 'USER' | 'SETTINGS' | 'PRODUCT' | 'TOTALS' | 'DATABASE' | 'TICKET';
    target_id: number | string | null;
    details: string;
    timestamp: string;
}

export interface AppSettings {
    companyName: string;
    isSsoEnabled: boolean;
    is2faEnabled: boolean;
    require2fa: boolean;
    ssoUrl?: string;
    ssoEntityId?: string;
    ssoCertificate?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    smtpSecure?: boolean;
    termo_entrega_template?: string;
    termo_devolucao_template?: string;
    hasInitialConsolidationRun?: boolean;
    lastAbsoluteUpdateTimestamp?: string;
}
