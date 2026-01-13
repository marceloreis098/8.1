
import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, TicketStatus, TicketPriority, User, UserRole, Equipment } from '../types';
import { getTickets, getEquipment } from '../services/apiService';
import Icon from './common/Icon';

const ServiceDesk: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [t, e] = await Promise.all([getTickets(currentUser), getEquipment(currentUser)]);
            setTickets(t);
            setEquipments(e);
        } catch (error) { 
            console.error("Erro ao carregar Service Desk:", error); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { loadData(); }, [currentUser]);

    const handleRemoteSupport = (ticket: Ticket) => {
        // Busca o equipamento vinculado para pegar o RustDesk ID
        const equip = equipments.find(e => 
            e.id === ticket.equipment_id || 
            (ticket.equipment_serial && e.serial === ticket.equipment_serial)
        );
        
        if (equip?.rustdesk_id) {
            window.location.href = `rustdesk://${equip.rustdesk_id}`;
        } else {
            alert("Este equipamento não possui um ID RustDesk cadastrado no Inventário.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold dark:text-white">Service Desk</h2>
                <div className="flex gap-2 text-xs font-medium">
                    <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded">SLA Online</span>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Icon name="LoaderCircle" className="animate-spin text-brand-primary" size={48} /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Lista de Chamados */}
                    <div className="lg:col-span-2 space-y-4">
                        {tickets.length === 0 ? (
                            <div className="bg-white dark:bg-dark-card p-10 text-center rounded-lg border-2 border-dashed border-gray-200">
                                <p className="text-gray-400">Nenhum chamado pendente.</p>
                            </div>
                        ) : tickets.map(ticket => (
                            <div 
                                key={ticket.id} 
                                onClick={() => setSelectedTicket(ticket)} 
                                className={`p-4 bg-white dark:bg-dark-card rounded-lg shadow cursor-pointer border-l-4 transition-all hover:translate-x-1 ${selectedTicket?.id === ticket.id ? 'border-brand-primary ring-2 ring-blue-50' : 'border-gray-200 dark:border-dark-border'}`}
                            >
                                <div className="flex justify-between">
                                    <h4 className="font-bold text-brand-dark dark:text-white">{ticket.title}</h4>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ticket.priority === TicketPriority.Critical ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                        {ticket.priority}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-3 text-sm">
                                    <p className="text-gray-500 dark:text-dark-text-secondary flex items-center gap-1">
                                        <Icon name="User" size={14}/> {ticket.requester_name}
                                    </p>
                                    <p className="text-xs text-gray-400">{new Date(ticket.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Painel de Atendimento */}
                    <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg border dark:border-dark-border overflow-hidden">
                        {selectedTicket ? (
                            <div className="flex flex-col h-full">
                                <div className="p-4 border-b dark:border-dark-border bg-gray-50 dark:bg-gray-900/50">
                                    <h3 className="font-bold text-gray-700 dark:text-white flex items-center gap-2">
                                        <Icon name="Info" size={18}/> Detalhes do Atendimento
                                    </h3>
                                </div>
                                <div className="p-6 space-y-5 flex-1">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Solicitação</label>
                                        <p className="text-sm text-gray-800 dark:text-dark-text-primary mt-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border dark:border-dark-border">
                                            {selectedTicket.description}
                                        </p>
                                    </div>

                                    {/* Botão de Ação Remota RustDesk */}
                                    <div className="pt-4 border-t dark:border-dark-border space-y-3">
                                        <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-orange-600 rounded-lg text-white">
                                                    <Icon name="MonitorSmartphone" size={24}/>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-orange-900 dark:text-orange-400 text-sm">Suporte Remoto RustDesk</h4>
                                                    <p className="text-[10px] text-orange-700 dark:text-orange-500">Conexão direta segura</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoteSupport(selectedTicket)}
                                                className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 shadow-lg shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Icon name="Zap" size={18}/> Iniciar Acesso Agora
                                            </button>
                                        </div>

                                        <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">
                                            Resolver Chamado
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-20 text-center space-y-4">
                                <Icon name="MousePointer2" size={48} className="mx-auto text-gray-200 animate-bounce" />
                                <p className="text-gray-400 text-sm">Selecione um chamado ao lado para iniciar o atendimento técnico.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceDesk;
