
import { Equipment, License, User, UserRole, Ticket, TicketStatus, TicketPriority, AuditLogEntry } from '../types';

export const mockUsers: User[] = [
    { id: 1, username: 'admin', realName: 'Marcelo Reis', email: 'marcelo.reis@usereserva.com', role: UserRole.Admin, is2FAEnabled: true, avatarUrl: '' },
    { id: 2, username: 'ana.tech', realName: 'Ana Souza', email: 'ana.souza@empresa.com.br', role: UserRole.UserManager, is2FAEnabled: false },
    { id: 3, username: 'joao.user', realName: 'João Silva', email: 'joao.silva@empresa.com.br', role: UserRole.User, is2FAEnabled: false }
];

export const mockEquipment: Equipment[] = [
    { id: 101, equipamento: 'MacBook Pro 14"', brand: 'Apple', model: 'M2 Pro', serial: 'ZMX001234', patrimonio: 'RES-001', usuarioAtual: 'Marcelo Reis', status: 'Em Uso', setor: 'TI', local: 'Rio de Janeiro', tipo: 'Notebook', condicaoTermo: 'Assinado - Entrega' },
    { id: 102, equipamento: 'Dell Latitude 5430', brand: 'Dell', model: 'i7 12th Gen', serial: 'DELL-9988', patrimonio: 'RES-002', usuarioAtual: 'Ana Souza', status: 'Em Uso', setor: 'RH', local: 'São Paulo', tipo: 'Notebook', condicaoTermo: 'Assinado - Entrega' },
    { id: 103, equipamento: 'Monitor UltraSharp 27"', brand: 'Dell', model: 'U2723QE', serial: 'MON-5544', patrimonio: 'RES-003', status: 'Estoque', setor: 'Estoque Central', local: 'Curitiba', tipo: 'Periférico' },
    { id: 104, equipamento: 'iPad Air 5', brand: 'Apple', model: '64GB Wi-Fi', serial: 'IPAD-6677', patrimonio: 'RES-004', usuarioAtual: 'João Silva', status: 'Em Uso', setor: 'Vendas', local: 'Belo Horizonte', tipo: 'Tablet', condicaoTermo: 'Pendente' },
    { id: 105, equipamento: 'ThinkPad X1 Carbon', brand: 'Lenovo', model: 'Gen 10', serial: 'LENO-3322', patrimonio: 'RES-005', status: 'Manutenção', setor: 'TI Suporte', local: 'Rio de Janeiro', tipo: 'Notebook' }
];

export const mockLicenses: License[] = [
    { id: 201, produto: 'Microsoft 365 Business Premium', tipoLicenca: 'Assinatura', chaveSerial: 'XXXXX-YYYYY-ZZZZZ', usuario: 'Marcelo Reis', empresa: 'Reserva', dataExpiracao: '2025-12-31' },
    { id: 202, produto: 'Adobe Creative Cloud', tipoLicenca: 'Assinatura', chaveSerial: 'ADBE-1234-5678', usuario: 'Ana Souza', empresa: 'Reserva', setor: 'Marketing', dataExpiracao: '2025-08-15' },
    { id: 203, produto: 'Windows 11 Pro', tipoLicenca: 'OEM', chaveSerial: 'W11-PRO-667-889', usuario: 'João Silva', empresa: 'Reserva', nomeComputador: 'RES-DSK-09' },
    { id: 204, produto: 'Microsoft 365 Business Premium', tipoLicenca: 'Assinatura', chaveSerial: 'AAAAA-BBBBB-CCCCC', usuario: 'Ana Souza', empresa: 'Reserva', dataExpiracao: '2025-12-31' }
];

export const mockLicenseTotals: Record<string, number> = {
    'Microsoft 365 Business Premium': 10,
    'Adobe Creative Cloud': 5,
    'Windows 11 Pro': 50,
    'Slack Pro': 20
};

export const mockTickets: Ticket[] = [
    { id: 501, title: 'Tela Azul constante no Notebook', description: 'O equipamento apresenta BSOD a cada 2 horas de uso.', category: 'Hardware', status: TicketStatus.InProgress, priority: TicketPriority.High, requester_id: 3, requester_name: 'João Silva', equipment_id: 104, equipment_serial: 'IPAD-6677', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 502, title: 'Acesso negado ao SAP', description: 'Usuário não consegue logar no módulo financeiro.', category: 'Acesso', status: TicketStatus.Open, priority: TicketPriority.Medium, requester_id: 2, requester_name: 'Ana Souza', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

export const mockAudit: AuditLogEntry[] = [
    { id: 1, username: 'admin', action_type: 'UPDATE', target_type: 'EQUIPMENT', target_id: 101, details: 'Alterou status para Em Uso', timestamp: new Date().toISOString() },
    { id: 2, username: 'admin', action_type: 'LOGIN', target_type: 'USER', target_id: 1, details: 'Login efetuado com sucesso', timestamp: new Date().toISOString() },
    { id: 3, username: 'ana.tech', action_type: 'CREATE', target_type: 'LICENSE', target_id: 204, details: 'Atribuiu licença M365 para Ana Souza', timestamp: new Date().toISOString() }
];
