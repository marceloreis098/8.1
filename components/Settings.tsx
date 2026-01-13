
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, AppSettings } from '../types';
import Icon from './common/Icon';
import { getSettings, saveSettings, checkApiStatus, checkDatabaseBackupStatus, backupDatabase, restoreDatabase, clearDatabase, getLicenseTotals, getLicenses } from '../services/apiService';
import DataConsolidation from './DataConsolidation';
import LicenseImport from './LicenseImport';
import PeriodicUpdate from './PeriodicUpdate';

interface SettingsProps {
    currentUser: User;
    onUserUpdate: (updatedUser: User) => void;
}

const DEFAULT_ENTREGA_TEMPLATE = `<div class="text-center mb-6"><h1 class="text-2xl font-bold uppercase">TERMO DE RESPONSABILIDADE</h1><p class="text-md mt-2">Utilização de Equipamento de Propriedade da Empresa</p></div><div class="space-y-4"><p><strong>Empresa:</strong> {{EMPRESA}}</p><p><strong>Colaborador(a):</strong> {{USUARIO}}</p></div><div class="mt-6 border-t pt-4"><h2 class="font-bold mb-2">Detalhes do Equipamento:</h2><ul class="list-disc list-inside space-y-1"><li><strong>Equipamento:</strong> {{EQUIPAMENTO}}</li><li><strong>Patrimônio:</strong> {{PATRIMONIO}}</li><li><strong>Serial:</strong> {{SERIAL}}</li></ul></div><div class="mt-6 text-justify space-y-3"><p>Declaro, para todos os fins, ter recebido da empresa {{EMPRESA}} o equipamento descrito acima, em perfeitas condições de uso e funcionamento, para meu uso exclusivo no desempenho de minhas funções profissionais.</p><p>Comprometo-me a zelar pela guarda, conservação e bom uso do equipamento, utilizando-o de acordo com as políticas de segurança e normas da empresa. Estou ciente de que o equipamento é uma ferramenta de trabalho e não deve ser utilizado para fins pessoais não autorizados.</p><p>Em caso de dano, perda, roubo ou qualquer outro sinistro, comunicarei imediatamente meu gestor direto e o departamento de TI. Comprometo-me a devolver o equipamento nas mesmas condições em que o recebi, ressalvado o desgaste natural pelo uso normal, quando solicitado pela empresa ou ao término do meu contrato de trabalho.</p></div><div class="mt-12 text-center"><p>________________________________________________</p><p class="mt-1 font-semibold">{{USUARIO}}</p></div><div class="mt-8 text-center"><p>Local e Data: {{DATA}}</p></div>`;

const DEFAULT_DEVOLUCAO_TEMPLATE = `<div class="text-center mb-6"><h1 class="text-2xl font-bold uppercase">TERMO DE DEVOLUÇÃO DE EQUIPAMENTO</h1><p class="text-md mt-2">Devolução de Equipamento de Propriedade da Empresa</p></div><div class="space-y-4"><p><strong>Empresa:</strong> {{EMPRESA}}</p><p><strong>Colaborador(a):</strong> {{USUARIO}}</p></div><div class="mt-6 border-t pt-4"><h2 class="font-bold mb-2">Detalhes do Equipamento:</h2><ul class="list-disc list-inside space-y-1"><li><strong>Equipamento:</strong> {{EQUIPAMENTO}}</li><li><strong>Patrimônio:</strong> {{PATRIMONIO}}</li><li><strong>Serial:</strong> {{SERIAL}}</li></ul></div><div class="mt-6 text-justify space-y-3"><p>Declaro, para todos os fins, ter devolvido à empresa {{EMPRESA}} o equipamento descrito acima, que estava sob minha responsabilidade para uso profissional.</p><p>O equipamento foi devolvido nas mesmas condições em que o recebi, ressalvado o desgaste natural pelo uso normal, na data de {{DATA_DEVOLUCAO}}.</p></div><div class="mt-12 text-center"><p>________________________________________________</p><p class="mt-1 font-semibold">{{USUARIO}}</p></div><div class="mt-8 text-center"><p>Local e Data: {{DATA}}</p></div>`;

const SettingsToggle: React.FC<{
    label: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    name: string;
    description?: string;
    disabled?: boolean;
}> = ({ label, checked, onChange, name, description, disabled = false }) => (
    <div className="flex items-center justify-between py-3">
        <div>
            <label htmlFor={name} className={`font-medium text-gray-800 dark:text-dark-text-primary ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {label}
            </label>
            {description && <p className={`text-sm text-gray-500 dark:text-dark-text-secondary mt-1 ${disabled ? 'opacity-50' : ''}`}>{description}</p>}
        </div>
        <label htmlFor={name} className={`relative inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input 
                type="checkbox" 
                id={name}
                name={name}
                checked={checked} 
                onChange={onChange}
                className="sr-only peer"
                disabled={disabled}
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-primary"></div>
        </label>
    </div>
);

const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
    const [settings, setSettings] = useState<Partial<AppSettings>>({
        isSsoEnabled: false,
        is2faEnabled: false,
        require2fa: false,
        hasInitialConsolidationRun: false,
    });
    const [termoEntregaTemplate, setTermoEntregaTemplate] = useState('');
    const [termoDevolucaoTemplate, setTermoDevolucaoTemplate] = useState('');
    const [apiStatus, setApiStatus] = useState<{ ok: boolean; message?: string } | null>(null);
    const [hasGeminiApiKey, setHasGeminiApiKey] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [backupStatus, setBackupStatus] = useState<{ hasBackup: boolean; backupTimestamp?: string } | null>(null);
    const [isDatabaseActionLoading, setIsDatabaseActionLoading] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'security' | 'database' | 'integration' | 'import' | 'termo'>('general');
    const [productNames, setProductNames] = useState<string[]>([]);

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        const status = await checkApiStatus();
        setApiStatus(status);

        if (currentUser.role === UserRole.Admin) {
            try {
                const [data, totals, licenses] = await Promise.all([
                    getSettings(),
                    getLicenseTotals(),
                    getLicenses(currentUser)
                ]);

                setSettings({
                    ...data,
                    isSsoEnabled: data.isSsoEnabled || false,
                    is2faEnabled: data.is2faEnabled || false,
                    require2fa: data.require2fa || false,
                    hasInitialConsolidationRun: data.hasInitialConsolidationRun || false,
                });
                setTermoEntregaTemplate(data.termo_entrega_template || DEFAULT_ENTREGA_TEMPLATE);
                setTermoDevolucaoTemplate(data.termo_devolucao_template || DEFAULT_DEVOLUCAO_TEMPLATE);
                
                const allProductNames = [...new Set([...Object.keys(totals), ...licenses.map(l => l.produto)])].sort();
                setProductNames(allProductNames);

                const dbBackupStatus = await checkDatabaseBackupStatus(currentUser.username);
                setBackupStatus(dbBackupStatus);
            } catch (error) {
                console.error("Failed to load settings:", error);
            }
        }

        if (window.aistudio?.hasSelectedApiKey) {
            setHasGeminiApiKey(await window.aistudio.hasSelectedApiKey());
        } else {
            setHasGeminiApiKey(true);
        }

        setIsLoading(false);
    }, [currentUser]);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);
    
    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setSettings(prev => ({ ...prev, [name]: checked }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await saveSettings({ ...settings, termo_entrega_template: termoEntregaTemplate, termo_devolucao_template: termoDevolucaoTemplate } as AppSettings, currentUser.username);
            alert("Configurações salvas com sucesso!");
        } catch (error: any) {
            alert(`Falha: ${error.message}`);
        } finally { setIsSaving(false); }
    };

    const handleBackupDatabase = async () => {
        if (!window.confirm("Confirmar backup?")) return;
        setIsDatabaseActionLoading(true);
        try {
            const result = await backupDatabase(currentUser.username);
            if (result.success) { alert(result.message); fetchAllData(); }
        } catch (error: any) { alert(error.message); } finally { setIsDatabaseActionLoading(false); }
    };

    const handleClearDatabase = async () => {
        if (!backupStatus?.hasBackup) { alert("Faça um backup antes de zerar."); return; }
        if (!window.confirm("ATENÇÃO: Isso apagará TUDO. Continuar?")) return;
        setIsDatabaseActionLoading(true);
        try {
            const result = await clearDatabase(currentUser.username);
            if (result.success) window.location.reload();
        } catch (error: any) { alert(error.message); } finally { setIsDatabaseActionLoading(false); }
    };

    const settingsTabs = [
        { id: 'general', label: 'Geral', icon: 'Settings' },
        { id: 'security', label: 'Segurança', icon: 'ShieldCheck' },
        { id: 'termo', label: 'Termos', icon: 'FileText', adminOnly: true },
        { id: 'integration', label: 'IA Gemini', icon: 'Bot' },
        { id: 'database', label: 'Banco de Dados', icon: 'HardDrive', adminOnly: true },
        { id: 'import', label: 'Importações', icon: 'CloudUpload', adminOnly: true },
    ];

    if (isLoading) return <div className="flex justify-center items-center h-full"><Icon name="LoaderCircle" className="animate-spin text-brand-primary" size={48} /></div>;
    
    return (
        <div className="bg-white dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-brand-dark dark:text-dark-text-primary mb-6">Configurações</h2>
            <div className="flex border-b dark:border-dark-border mb-6 overflow-x-auto">
                {settingsTabs.map(tab => {
                    if (tab.adminOnly && currentUser.role !== UserRole.Admin) return null;
                    return (
                        <button key={tab.id} onClick={() => setActiveSettingsTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 font-medium text-sm transition-colors ${activeSettingsTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'}`}>
                            <Icon name={tab.icon as any} size={18} /> {tab.label}
                        </button>
                    );
                })}
            </div>
            
            <form onSubmit={handleSaveSettings}>
                <div className="space-y-8">
                    {activeSettingsTab === 'general' && (
                        <div className="p-6 bg-gray-50 dark:bg-dark-bg rounded-lg border dark:border-dark-border">
                            <h3 className="text-lg font-bold text-brand-secondary dark:text-dark-text-primary mb-4">SSO SAML</h3>
                            <SettingsToggle label="Habilitar SSO" name="isSsoEnabled" checked={settings.isSsoEnabled || false} onChange={handleSettingsChange} description="Login corporativo via Azure/Google." />
                        </div>
                    )}
                    {activeSettingsTab === 'security' && (
                        <div className="p-6 bg-gray-50 dark:bg-dark-bg rounded-lg border dark:border-dark-border">
                            <h3 className="text-lg font-bold text-brand-secondary dark:text-dark-text-primary mb-4">Segurança (2FA)</h3>
                            <SettingsToggle label="Habilitar 2FA" name="is2faEnabled" checked={settings.is2faEnabled || false} onChange={handleSettingsChange} />
                            <SettingsToggle label="Exigir para todos" name="require2fa" checked={settings.require2fa || false} onChange={handleSettingsChange} disabled={!settings.is2faEnabled} />
                        </div>
                    )}
                    {activeSettingsTab === 'database' && (
                        <div className="p-6 bg-gray-50 dark:bg-dark-bg rounded-lg border dark:border-dark-border">
                            <h3 className="text-lg font-bold text-brand-secondary dark:text-dark-text-primary mb-4">Manutenção do Banco</h3>
                            <div className="flex gap-3">
                                <button type="button" onClick={handleBackupDatabase} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Backup</button>
                                <button type="button" onClick={handleClearDatabase} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Zerar Banco</button>
                            </div>
                        </div>
                    )}
                    {activeSettingsTab === 'import' && (
                        <div className="space-y-8">
                            {settings.hasInitialConsolidationRun ? <PeriodicUpdate currentUser={currentUser} onUpdateSuccess={fetchAllData} /> : <DataConsolidation currentUser={currentUser} />}
                            <LicenseImport currentUser={currentUser} productNames={productNames} onImportSuccess={fetchAllData} />
                        </div>
                    )}
                    {['general', 'security', 'termo'].includes(activeSettingsTab) && (
                        <div className="flex justify-end pt-4 border-t">
                            <button type="submit" disabled={isSaving} className="bg-brand-primary text-white px-6 py-2 rounded hover:bg-blue-700">{isSaving ? 'Salvando...' : 'Salvar Alterações'}</button>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};

export default Settings;
