

import React, { useState, SetStateAction } from 'react';
import { RodoviarioSchedule, ScheduleStatus, ProductType } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { PlusCircleIcon, TruckIcon, XIcon, Trash2Icon } from '../components/ui/icons';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';

interface RodoviarioPlanningScreenProps {
    onBack: () => void;
    schedules: RodoviarioSchedule[];
    setSchedules: React.Dispatch<SetStateAction<RodoviarioSchedule[]>>;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

export const RodoviarioPlanningScreen: React.FC<RodoviarioPlanningScreenProps> = ({ onBack, schedules, setSchedules, showToast }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<RodoviarioSchedule | null>(null);
    const [itemToDelete, setItemToDelete] = useState<RodoviarioSchedule | null>(null);

    const handleOpenModal = (item: RodoviarioSchedule | null) => {
        setCurrentItem(item || { id: Date.now(), status: 'PLANEJADO', placa: '', transportadora: '', motorista: '', produto: 'anidro', origem: '', destino: '', janela_carregamento_prevista: '', chegada_real: '', liberacao_real: '', volume_previsto: '', volume_real: '' });
        setIsModalOpen(true);
    };
    
    const handleSave = (item: RodoviarioSchedule) => {
        setSchedules(prev => {
            const exists = prev.some(s => s.id === item.id);
            return exists ? prev.map(s => s.id === item.id ? item : s) : [...prev, item];
        });
        setIsModalOpen(false);
        showToast('Programação salva com sucesso!');
    };

    const handleDelete = () => {
        if(itemToDelete){
            setSchedules(prev => prev.filter(s => s.id !== itemToDelete.id));
            setItemToDelete(null);
        }
    };

    const breadcrumbItems = [
        { label: 'Central de planejamento multimodal', onClick: onBack },
        { label: 'Programação Rodoviária' }
    ];

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <Breadcrumb items={breadcrumbItems} />
            <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Programação Rodoviária</h1>
                    <p className="text-muted-foreground">Gerencie o agendamento e a execução de cargas rodoviárias.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={onBack}>Voltar</Button>
                    <Button onClick={() => handleOpenModal(null)} icon={<PlusCircleIcon className="h-4 w-4"/>}>
                        Nova Programação
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                {schedules.map(item => (
                     <Card key={item.id} className="cursor-pointer" onClick={() => handleOpenModal(item)}>
                         <div className="flex justify-between items-start">
                             <div>
                                <h3 className="font-bold text-lg">{item.placa} - {item.transportadora}</h3>
                                 <p className="text-sm text-muted-foreground">{item.origem} → {item.destino}</p>
                             </div>
                             <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${item.status === 'PLANEJADO' ? 'bg-yellow-400/10 text-yellow-500' : 'bg-green-400/10 text-green-500'}`}>
                                {item.status}
                            </span>
                         </div>
                     </Card>
                ))}
            </div>

             {isModalOpen && currentItem && (
                <FormModal
                    item={currentItem}
                    onSave={handleSave}
                    onClose={() => setIsModalOpen(false)}
                    onDelete={(item) => {
                        setIsModalOpen(false);
                        setItemToDelete(item);
                    }}
                />
            )}

            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleDelete}
                title="Confirmar Exclusão"
            >
                <p>Tem certeza que deseja excluir a programação da placa <strong className="text-foreground">{itemToDelete?.placa}</strong>?</p>
            </ConfirmationModal>
        </main>
    );
};

// --- FORM MODAL ---
interface FormModalProps {
    item: RodoviarioSchedule;
    onSave: (item: RodoviarioSchedule) => void;
    onClose: () => void;
    onDelete: (item: RodoviarioSchedule) => void;
}
const FormModal: React.FC<FormModalProps> = ({ item, onSave, onClose, onDelete }) => {
    const [formData, setFormData] = useState(item);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.placa.trim()) newErrors.placa = "Placa é obrigatória.";
        if (!formData.transportadora.trim()) newErrors.transportadora = "Transportadora é obrigatória.";
        if (!formData.origem.trim()) newErrors.origem = "Origem é obrigatória.";
        if (!formData.destino.trim()) newErrors.destino = "Destino é obrigatório.";
        if (!formData.janela_carregamento_prevista) newErrors.janela_carregamento_prevista = "Janela de carregamento é obrigatória.";
        if (!formData.volume_previsto.trim() || Number(formData.volume_previsto) <= 0) newErrors.volume_previsto = "Volume previsto deve ser um número positivo.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSaveClick = () => {
        if (validate()) {
            onSave(formData);
        }
    }

    const handleChange = (field: keyof RodoviarioSchedule, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Programação Rodoviária</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                </header>
                <main className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Placa" value={formData.placa} onChange={e => handleChange('placa', e.target.value)} placeholder="ABC-1234" error={errors.placa} />
                        <Input label="Transportadora" value={formData.transportadora} onChange={e => handleChange('transportadora', e.target.value)} placeholder="Nome da transportadora" error={errors.transportadora} />
                    </div>
                    <Input label="Motorista" value={formData.motorista} onChange={e => handleChange('motorista', e.target.value)} placeholder="Nome do motorista (opcional)" />
                    <Select label="Produto" value={formData.produto} onChange={e => handleChange('produto', e.target.value as ProductType)}>
                        <option value="anidro">Anidro</option>
                        <option value="hidratado">Hidratado</option>
                        <option value="granel">Granel</option>
                    </Select>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Origem" value={formData.origem} onChange={e => handleChange('origem', e.target.value)} placeholder="Cidade - UF" error={errors.origem} />
                        <Input label="Destino" value={formData.destino} onChange={e => handleChange('destino', e.target.value)} placeholder="Cidade - UF" error={errors.destino} />
                    </div>
                    <Input label="Janela Carregamento (Prevista)" type="datetime-local" value={formData.janela_carregamento_prevista} onChange={e => handleChange('janela_carregamento_prevista', e.target.value)} error={errors.janela_carregamento_prevista} />
                    <div className="grid grid-cols-2 gap-4">
                         <Input label="Chegada (Real)" type="datetime-local" value={formData.chegada_real} onChange={e => handleChange('chegada_real', e.target.value)} />
                         <Input label="Liberação (Real)" type="datetime-local" value={formData.liberacao_real} onChange={e => handleChange('liberacao_real', e.target.value)} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <Input label="Volume Previsto (L)" value={formData.volume_previsto} onChange={e => handleChange('volume_previsto', e.target.value)} placeholder="e.g., 45000" type="number" error={errors.volume_previsto} />
                        <Input label="Volume Real (L)" value={formData.volume_real} onChange={e => handleChange('volume_real', e.target.value)} placeholder="Preenchido na conclusão" type="number"/>
                    </div>
                    <Select label="Status" value={formData.status} onChange={e => handleChange('status', e.target.value as ScheduleStatus)}>
                        <option>PLANEJADO</option>
                        <option>EM TRÂNSITO</option>
                        <option>CONCLUÍDO</option>
                        <option>ATRASADO</option>
                        <option>CANCELADO</option>
                    </Select>
                </main>
                <footer className="p-4 bg-secondary/50 flex justify-between">
                    <Button variant="destructive" onClick={() => onDelete(formData)}>Excluir</Button>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSaveClick}>Salvar</Button>
                    </div>
                </footer>
            </div>
        </div>
    );
};