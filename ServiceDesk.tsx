
import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, TicketStatus, TicketPriority, User, UserRole, Equipment } from '../types';
import { getTickets, getEquipment, generateRemoteLink, summarizeTicketWithAI } from '../services/apiService';
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
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, [currentUser]);

    const handleRemoteSupport = (ticket: Ticket) => {
        // Busca o equipamento vinculado para pegar o RustDesk ID
        const equip = equipments.find(e => e.id === ticket.equipment_id || e.serial === ticket.equipment_serial);
        
        if (equip?.rustdesk_id) {
            window.location.href = `rustdesk://${equip.rustdesk_id}`;
        } else {
            alert("Este equipamento não possui um ID RustDesk cadastrado.");
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold dark:text-white">Service Desk</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {tickets.map(ticket => (
                        <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="p-4 bg-white dark:bg-dark-card rounded-lg shadow cursor-pointer border-l-4 border-gray-200">
                            <h4 className="font-bold">{ticket.title}</h4>
                            <p className="text-sm text-gray-500">Solicitante: {ticket.requester_name}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6">
                    {selectedTicket ? (
                        <div className="space-y-4">
                            <h3 className="font-bold border-b pb-2">Detalhes</h3>
                            <p className="text-sm">{selectedTicket.description}</p>
                            
                            <div className="pt-4 space-y-2">
                                <button 
                                    onClick={() => handleRemoteSupport(selectedTicket)}
                                    className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white py-2 rounded-lg font-bold hover:bg-orange-700"
                                >
                                    <Icon name="MonitorSmartphone" size={18}/> Conectar via RustDesk
                                </button>
                                <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">Resolver Chamado</button>
                            </div>
                        </div>
                    ) : <p className="text-center text-gray-400 py-10">Selecione um chamado</p>}
                </div>
            </div>
        </div>
    );
};

export default ServiceDesk;
