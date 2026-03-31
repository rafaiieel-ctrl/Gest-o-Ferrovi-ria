

import React, { useState, SetStateAction } from 'react';
import { AereoSchedule, ScheduleStatus } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { PlusCircleIcon, PlaneIcon, XIcon, Trash2Icon, CopyIcon } from '../components/ui/icons';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';

interface AereoPlanningScreenProps {
    onBack: () => void;
    schedules: AereoSchedule[];
    setSchedules: React.Dispatch<SetStateAction<AereoSchedule[]>>;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

export const AereoPlanningScreen: React.FC<AereoPlanningScreenProps> = ({ onBack, schedules, setSchedules, showToast }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<AereoSchedule | null>(null);
    const [itemToDelete, setItemToDelete] = useState<AereoSchedule | null>(null);

    const handleOpenModal = (item: AereoSchedule | null) => {
        setCurrentItem(item || { id: Date.now(), status: 'PLANEJADO', aeroporto_origem: '', aeroporto_destino: '', voo: '', previsao_embarque: '', previsao_chegada: '', volume_carga_prevista: '' });
        setIsModalOpen(true);
    };
    
    const handleSave = (item: AereoSchedule) => {
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

    const handleCopy = (itemToCopy: AereoSchedule) => {
        const newItem: AereoSchedule = {
            ...itemToCopy,
            id: Date.now(),
            status: 'PLANEJADO',
            voo: `${itemToCopy.voo} (Cópia)`,
            previsao_embarque: '',
            previsao_chegada: '',
        };
        setCurrentItem(newItem);
        setIsModalOpen(true);
    };

    const breadcrumbItems = [
        { label: 'Central de planejamento multimodal', onClick: onBack },
        { label: 'Programação Aérea' }
    ];

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <Breadcrumb items={breadcrumbItems} />
            <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Programação Aérea</h1>
                    <p className="text-muted-foreground">Gerencie o transporte de cargas aéreas.</p>
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
                     <Card key={item.id}>
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-grow cursor-pointer" onClick={() => handleOpenModal(item)}>
                                <h3 className="font-bold text-lg">Voo {item.voo}</h3>
                                <p className="text-sm text-muted-foreground">{item.aeroporto_origem} → {item.aeroporto_destino}</p>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="!p-2" onClick={() => handleCopy(item)} title="Copiar Programação">
                                    <CopyIcon className="h-4 w-4" />
                                </Button>
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${item.status === 'PLANEJADO' ? 'bg-yellow-400/10 text-yellow-500' : 'bg-green-400/10 text-green-500'}`}>
                                    {item.status}
                                </span>
                            </div>
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
                <p>Tem certeza que deseja excluir a programação do voo <strong className="text-foreground">{itemToDelete?.voo}</strong>?</p>
            </ConfirmationModal>
        </main>
    );
};


// --- FORM MODAL ---
interface FormModalProps {
    item: AereoSchedule;
    onSave: (item: AereoSchedule) => void;
    onClose: () => void;
    onDelete: (item: AereoSchedule) => void;
}
const FormModal: React.FC<FormModalProps> = ({ item, onSave, onClose, onDelete }) => {
    const [formData, setFormData] = useState(item);
    const handleChange = (field: keyof AereoSchedule, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Programação Aérea</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                </header>
                <main className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Aeroporto Origem (IATA)" value={formData.aeroporto_origem} onChange={e => handleChange('aeroporto_origem', e.target.value)} />
                        <Input label="Aeroporto Destino (IATA)" value={formData.aeroporto_destino} onChange={e => handleChange('aeroporto_destino', e.target.value)} />
                    </div>
                    <Input label="Voo" value={formData.voo} onChange={e => handleChange('voo', e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                         <Input label="Previsão de Embarque" type="datetime-local" value={formData.previsao_embarque} onChange={e => handleChange('previsao_embarque', e.target.value)} />
                         <Input label="Previsão de Chegada" type="datetime-local" value={formData.previsao_chegada} onChange={e => handleChange('previsao_chegada', e.target.value)} />
                    </div>
                    <Input label="Volume/Peso da Carga Previsto" value={formData.volume_carga_prevista} onChange={e => handleChange('volume_carga_prevista', e.target.value)} />
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
                        <Button onClick={() => onSave(formData)}>Salvar</Button>
                    </div>
                </footer>
            </div>
        </div>
    );
};