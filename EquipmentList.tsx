
import React, { useState, useEffect, useMemo } from 'react';
import { Equipment, User, UserRole, EquipmentHistory } from '../types';
import { getEquipment, addEquipment, updateEquipment, deleteEquipment, getEquipmentHistory } from '../services/apiService';
import Icon from './common/Icon';
import TermoResponsabilidade from './TermoResponsabilidade';

// --- MODAL DE FORMULÁRIO (CRIAR/EDITAR) ---
interface EquipmentFormModalProps {
    equipment: Equipment | null;
    onClose: () => void;
    onSave: () => void;
    currentUser: User;
}

const EquipmentFormModal: React.FC<EquipmentFormModalProps> = ({ equipment, onClose, onSave, currentUser }) => {
    const [formData, setFormData] = useState<Partial<Equipment>>({
        equipamento: '',
        garantia: '',
        patrimonio: '',
        serial: '',
        rustdesk_id: '',
        usuarioAtual: '',
        local: '',
        setor: '',
        dataEntregaUsuario: '',
        status: 'Estoque',
        tipo: '',
        notaCompra: '',
        notaPlKm: '',
        brand: '',
        model: '',
        observacoes: '',
        emailColaborador: '',
        condicaoTermo: 'N/A'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        if (equipment) {
            setFormData({
                ...equipment,
                dataEntregaUsuario: equipment.dataEntregaUsuario ? equipment.dataEntregaUsuario.split('T')[0] : '',
                dataDevolucao: equipment.dataDevolucao ? equipment.dataDevolucao.split('T')[0] : ''
            });
        }
    }, [equipment]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveError('');

        if (!formData.equipamento || !formData.serial) {
            setSaveError('Equipamento e Serial são campos obrigatórios.');
            setIsSaving(false);
            return;
        }

        try {
            if (equipment) {
                await updateEquipment({ ...formData, id: equipment.id } as Equipment, currentUser.username);
            } else {
                await addEquipment(formData as any, currentUser);
            }
            onSave();
            onClose();
        } catch (error: any) {
            setSaveError(error.message || "Falha ao salvar.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start sm:items-center z-50 p-4 overflow-y-auto">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b dark:border-dark-border flex-shrink-0">
                    <h3 className="text-xl font-bold text-brand-dark dark:text-dark-text-primary">{equipment ? 'Editar Equipamento' : 'Novo Equipamento'}</h3>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
                    {saveError && (
                        <div className="sm:col-span-3 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative break-words" role="alert">
                            <span className="block sm:inline">{saveError}</span>
                        </div>
                    )}

                    <input type="text" name="equipamento" placeholder="Nome do Equipamento *" value={formData.equipamento || ''} onChange={handleChange} className="p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-dark-text-primary" required />
                    <input type="text" name="serial" placeholder="Número de Série *" value={formData.serial || ''} onChange={handleChange} className="p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-dark-text-primary" required />
                    <input type="text" name="patrimonio" placeholder="Patrimônio" value={formData.patrimonio || ''} onChange={handleChange} className="p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-dark-text-primary" />
                    
                    <div className="flex flex-col">
                         <label className="text-xs text-orange-600 font-bold mb-1 flex items-center gap-1"><Icon name="MonitorSmartphone" size={12}/> RustDesk ID (Acesso Remoto)</label>
                         <input type="text" name="rustdesk_id" placeholder="ID RustDesk" value={formData.rustdesk_id || ''} onChange={handleChange} className="p-2 border border-orange-200 dark:border-orange-900/50 rounded-md bg-orange-50/30 dark:bg-orange-900/10 text-gray-900 dark:text-dark-text-primary" />
                    </div>

                    <input type="text" name="brand" placeholder="Marca" value={formData.brand || ''} onChange={handleChange} className="p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-dark-text-primary" />
                    <input type="text" name="model" placeholder="Modelo" value={formData.model || ''} onChange={handleChange} className="p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-dark-text-primary" />
                    <input type="text" name="tipo" placeholder="Tipo" value={formData.tipo || ''} onChange={handleChange} className="p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-dark-text-primary" />

                    <input type="text" name="usuarioAtual" placeholder="Usuário Atual" value={formData.usuarioAtual || ''} onChange={handleChange} className="p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-dark-text-primary" />
                    <input type="email" name="emailColaborador" placeholder="Email" value={formData.emailColaborador || ''} onChange={handleChange} className="p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-dark-text-primary" />
                    <input type="text" name="setor" placeholder="Setor" value={formData.setor || ''} onChange={handleChange} className="p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-dark-text-primary" />
                    
                    <div className="flex flex-col">
                         <label className="text-xs text-gray-500 mb-1">Status</label>
                        <select name="status" value={formData.status || 'Estoque'} onChange={handleChange} className="p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-dark-text-primary">
                            <option value="Estoque">Estoque</option>
                            <option value="Em Uso">Em Uso</option>
                            <option value="Manutenção">Manutenção</option>
                        </select>
                    </div>

                    <div className="flex flex-col">
                         <label className="text-xs text-gray-500 mb-1">Data Entrega</label>
                         <input type="date" name="dataEntregaUsuario" value={formData.dataEntregaUsuario || ''} onChange={handleChange} className="p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-dark-text-primary" />
                    </div>
                </div>
                <div className="p-6 border-t dark:border-dark-border flex justify-end gap-3 flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-brand-primary text-white rounded-md">{isSaving ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </form>
        </div>
    );
};

// --- LISTA PRINCIPAL ---
interface EquipmentListProps {
  currentUser: User;
  companyName: string;
}

const EquipmentList: React.FC<EquipmentListProps> = ({ currentUser, companyName }) => {
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
    const [viewingEquipment, setViewingEquipment] = useState<Equipment | null>(null);
    
    const loadEquipment = async () => {
        setLoading(true);
        try {
            const data = await getEquipment(currentUser);
            setEquipment(data);
        } catch (error) {
            console.error("Failed to load", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadEquipment(); }, [currentUser]);

    const handleRustDeskConnect = (id?: string) => {
        if (!id) return;
        window.location.href = `rustdesk://${id}`;
    };

    const filteredEquipment = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return equipment.filter(item => 
            (item.equipamento?.toLowerCase().includes(lowerSearch)) ||
            (item.serial?.toLowerCase().includes(lowerSearch)) ||
            (item.rustdesk_id?.toLowerCase().includes(lowerSearch)) ||
            (item.usuarioAtual?.toLowerCase().includes(lowerSearch))
        );
    }, [equipment, searchTerm]);

    return (
        <div className="bg-white dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-brand-dark dark:text-dark-text-primary">Inventário</h2>
                <button onClick={() => { setEditingEquipment(null); setIsModalOpen(true); }} className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Icon name="Plus" size={18}/> Novo Item
                </button>
            </div>

            <input 
                type="text" 
                placeholder="Buscar por nome, serial, usuário ou RustDesk ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 mb-6 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-dark-text-primary"
            />

            {loading ? (
                <div className="flex justify-center py-10"><Icon name="LoaderCircle" className="animate-spin text-brand-primary" size={48} /></div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3">Equipamento</th>
                                <th className="px-6 py-3">Serial</th>
                                <th className="px-6 py-3">RustDesk</th>
                                <th className="px-6 py-3">Usuário</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEquipment.map(item => (
                                <tr key={item.id} className="border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 font-medium">{item.equipamento}</td>
                                    <td className="px-6 py-4 font-mono text-xs">{item.serial}</td>
                                    <td className="px-6 py-4">
                                        {item.rustdesk_id ? (
                                            <button 
                                                onClick={() => handleRustDeskConnect(item.rustdesk_id)}
                                                className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-bold bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded"
                                            >
                                                <Icon name="MonitorSmartphone" size={16}/> {item.rustdesk_id}
                                            </button>
                                        ) : <span className="text-gray-400">-</span>}
                                    </td>
                                    <td className="px-6 py-4">{item.usuarioAtual}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-3">
                                        <button onClick={() => { setEditingEquipment(item); setIsModalOpen(true); }} className="text-blue-600"><Icon name="Pencil" size={18} /></button>
                                        <button onClick={() => {}} className="text-red-600"><Icon name="Trash2" size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <EquipmentFormModal 
                    equipment={editingEquipment} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={loadEquipment} 
                    currentUser={currentUser}
                />
            )}
        </div>
    );
};

export default EquipmentList;
