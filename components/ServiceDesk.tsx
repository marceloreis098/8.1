
import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, TicketStatus, TicketPriority, User, UserRole, Equipment } from '../types';
import { getTickets, createTicket, updateTicket, deleteTicket, getEquipment, generateRemoteLink, summarizeTicketWithAI } from '../services/apiService';
import Icon from './common/Icon';

const ServiceDesk: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const isAdmin = currentUser.role !== UserRole.User;

    const loadData = async () => {
        setLoading(true);
        try {
            const [ticketsData, equipsData] = await Promise.all([
                getTickets(currentUser),
                getEquipment(currentUser)
            ]);
            setTickets(ticketsData);
            setEquipments(equipsData);
        } catch (error) {
            console.error("Erro ao carregar dados do Service Desk", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const filteredTickets = useMemo(() => {
        return tickets.filter(t => 
            t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.id.toString().includes(searchTerm)
        );
    }, [tickets, searchTerm]);

    const handleRemoteSupport = async (ticket: Ticket) => {
        if (!ticket.equipment_id) {
            alert("Este chamado não está vinculado a um equipamento.");
            return;
        }
        try {
            const result = await generateRemoteLink(ticket.id, ticket.equipment_id.toString());
            window.open(result.url, '_blank');
        } catch (error) {
            alert("Erro ao iniciar sessão remota. Verifique a integração.");
        }
    };

    const handleAiSummary = async (ticketId: number) => {
        setIsAiLoading(true);
        setAiSummary(null);
        try {
            const result = await summarizeTicketWithAI(ticketId);
            setAiSummary(result.summary);
        } catch (error) {
            setAiSummary("Falha ao gerar resumo inteligente.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const StatusBadge = ({ status }: { status: TicketStatus }) => {
        const colors: Record<TicketStatus, string> = {
            [TicketStatus.Open]: 'bg-blue-100 text-blue-800',
            [TicketStatus.InProgress]: 'bg-yellow-100 text-yellow-800',
            [TicketStatus.WaitingUser]: 'bg-purple-100 text-purple-800',
            [TicketStatus.Resolved]: 'bg-green-100 text-green-800',
            [TicketStatus.Closed]: 'bg-gray-100 text-gray-800',
        };
        return <span className={`px-2 py-1 rounded-full text-xs font-bold ${colors[status]}`}>{status}</span>;
    };

    const PriorityIcon = ({ priority }: { priority: TicketPriority }) => {
        const colors: Record<TicketPriority, string> = {
            [TicketPriority.Low]: 'text-gray-400',
            [TicketPriority.Medium]: 'text-blue-500',
            [TicketPriority.High]: 'text-orange-500',
            [TicketPriority.Critical]: 'text-red-600 animate-pulse',
        };
        return <Icon name="AlertCircle" size={16} className={colors[priority]} title={`Prioridade ${priority}`} />;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-dark-card p-4 rounded-lg shadow-md gap-4">
                <h2 className="text-2xl font-bold text-brand-dark dark:text-dark-text-primary">Gestão de Chamados</h2>
                <button 
                    onClick={() => { setSelectedTicket(null); setIsModalOpen(true); }}
                    className="bg-brand-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Icon name="Plus" size={20} /> Novo Chamado
                </button>
            </div>

            <div className="flex gap-4">
                <input 
                    type="text" 
                    placeholder="Pesquisar por título, ID ou solicitante..."
                    className="flex-1 p-3 border dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-800 dark:text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Icon name="LoaderCircle" className="animate-spin text-brand-primary" size={48} /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Lista de Chamados */}
                    <div className="lg:col-span-2 space-y-4">
                        {filteredTickets.map(ticket => (
                            <div 
                                key={ticket.id} 
                                onClick={() => setSelectedTicket(ticket)}
                                className={`p-4 bg-white dark:bg-dark-card rounded-lg shadow border-l-4 transition-all cursor-pointer hover:shadow-md
                                    ${selectedTicket?.id === ticket.id ? 'border-brand-primary ring-2 ring-blue-100' : 'border-gray-200 dark:border-gray-700'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <PriorityIcon priority={ticket.priority} />
                                        <span className="text-xs text-gray-500 font-mono">#T{ticket.id}</span>
                                        <h4 className="font-bold text-brand-dark dark:text-white">{ticket.title}</h4>
                                    </div>
                                    <StatusBadge status={ticket.status} />
                                </div>
                                <div className="flex justify-between items-end text-sm text-gray-600 dark:text-dark-text-secondary">
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center gap-1"><Icon name="User" size={14}/> {ticket.requester_name}</span>
                                        <span className="flex items-center gap-1"><Icon name="Tag" size={14}/> {ticket.category}</span>
                                    </div>
                                    <span className="text-xs">{new Date(ticket.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Detalhes do Chamado Selecionado */}
                    <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg border dark:border-dark-border flex flex-col h-fit sticky top-4">
                        {selectedTicket ? (
                            <>
                                <div className="p-4 border-b dark:border-dark-border bg-gray-50 dark:bg-gray-900/30">
                                    <h3 className="font-bold text-lg text-brand-dark dark:text-white">Detalhes do Chamado</h3>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Descrição</label>
                                        <p className="text-gray-800 dark:text-dark-text-primary mt-1">{selectedTicket.description}</p>
                                    </div>

                                    {/* Widget de IA */}
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                                <Icon name="Sparkles" size={14}/> RESUMO INTELIGENTE
                                            </span>
                                            {!aiSummary && !isAiLoading && (
                                                <button onClick={() => handleAiSummary(selectedTicket.id)} className="text-xs text-blue-600 hover:underline">Gerar</button>
                                            )}
                                        </div>
                                        {isAiLoading ? <div className="animate-pulse h-4 bg-blue-200 rounded w-full"></div> : 
                                         aiSummary && <p className="text-xs text-blue-800 dark:text-blue-200 italic">"{aiSummary}"</p>}
                                    </div>

                                    {/* Ativo Vinculado */}
                                    {selectedTicket.equipment_id && (
                                        <div className="p-3 border dark:border-dark-border rounded-lg">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Equipamento Vinculado</label>
                                            <div className="flex items-center gap-3 mt-2">
                                                <Icon name="Computer" size={24} className="text-gray-400" />
                                                <div>
                                                    <p className="text-sm font-bold dark:text-white">{selectedTicket.equipment_serial}</p>
                                                    <button className="text-xs text-brand-primary hover:underline">Ver Ativo</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Ações Rápidas */}
                                    {isAdmin && (
                                        <div className="grid grid-cols-2 gap-3 pt-4">
                                            <button 
                                                onClick={() => handleRemoteSupport(selectedTicket)}
                                                className="flex flex-col items-center p-3 bg-brand-primary/10 text-brand-primary rounded-lg hover:bg-brand-primary hover:text-white transition-all"
                                            >
                                                <Icon name="Monitor" size={20} />
                                                <span className="text-xs font-bold mt-1">Acesso Remoto</span>
                                            </button>
                                            <button className="flex flex-col items-center p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-600 hover:text-white transition-all">
                                                <Icon name="CheckCircle" size={20} />
                                                <span className="text-xs font-bold mt-1">Resolver</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="p-20 text-center text-gray-400">
                                <Icon name="MousePointer2" size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Selecione um chamado para visualizar os detalhes.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceDesk;
