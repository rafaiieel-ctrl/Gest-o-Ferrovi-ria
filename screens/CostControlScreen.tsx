

import React, { useState, useMemo } from 'react';
import { CostItem, CostCategory, UnifiedSchedule, UnitCost, ModalType } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { PlusCircleIcon, XIcon, PenSquareIcon, Trash2Icon, DollarSignIcon } from '../components/ui/icons';
import { numberToBr } from '../utils/helpers';

interface CostControlScreenProps {
    costItems: CostItem[];
    setCostItems: React.Dispatch<React.SetStateAction<CostItem[]>>;
    allSchedules: UnifiedSchedule[];
    unitCosts: UnitCost[];
    setUnitCosts: React.Dispatch<React.SetStateAction<UnitCost[]>>;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

interface ModalState {
    isOpen: boolean;
    costItem: CostItem | null;
}
interface UnitCostModalState {
    isOpen: boolean;
    unitCost: UnitCost | null;
}


const categoryLabels: Record<CostCategory, string> = {
    frete: 'Frete',
    armazenagem: 'Armazenagem',
    taxas: 'Taxas',
    seguro: 'Seguro',
    outros: 'Outros',
    demurrage: 'Demurrage',
};

const modalLabels: Record<ModalType | 'geral', string> = {
    'geral': 'Geral',
    'rodoviario': 'Rodoviário',
    'fluvial': 'Fluvial',
    'ferroviario': 'Ferroviário',
    'terra': 'Terra',
    'maritimo': 'Marítimo',
    'aereo': 'Aéreo',
    'dutoviario': 'Dutoviário'
};


const KpiCard: React.FC<{ title: string; value: string; variant?: 'default' | 'positive' | 'negative' }> = ({ title, value, variant = 'default' }) => {
    const colorClasses = {
        default: 'text-foreground',
        positive: 'text-green-500',
        negative: 'text-red-500',
    };
    return (
        <Card padding="md">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-3xl font-bold mt-1 ${colorClasses[variant]}`}>{value}</p>
        </Card>
    );
};

export const CostControlScreen: React.FC<CostControlScreenProps> = ({ costItems, setCostItems, allSchedules, unitCosts, setUnitCosts, showToast }) => {
    const [filters, setFilters] = useState({ dateStart: '', dateEnd: '', operationUid: '' });
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, costItem: null });
    const [itemToDelete, setItemToDelete] = useState<CostItem | null>(null);
    const [unitCostModalState, setUnitCostModalState] = useState<UnitCostModalState>({ isOpen: false, unitCost: null });
    const [unitCostToDelete, setUnitCostToDelete] = useState<UnitCost | null>(null);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const filteredCostItems = useMemo(() => {
        return costItems.filter(item => {
            if (filters.operationUid && item.operationUid !== filters.operationUid) return false;
            if (filters.dateStart && item.date < filters.dateStart) return false;
            if (filters.dateEnd && item.date > filters.dateEnd) return false;
            return true;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [costItems, filters]);

    const kpis = useMemo(() => {
        const totalBudgeted = filteredCostItems.reduce((sum, item) => sum + item.budgetedAmount, 0);
        const totalActual = filteredCostItems.reduce((sum, item) => sum + item.actualAmount, 0);
        const variance = totalActual - totalBudgeted;
        return { totalBudgeted, totalActual, variance };
    }, [filteredCostItems]);

    const handleSave = (item: CostItem) => {
        setCostItems(prev => {
            const exists = prev.some(c => c.id === item.id);
            return exists ? prev.map(c => c.id === item.id ? item : c) : [...prev, item];
        });
        setModalState({ isOpen: false, costItem: null });
        showToast('Custo salvo com sucesso!');
    };

    const handleDelete = () => {
        if (itemToDelete) {
            setCostItems(prev => prev.filter(c => c.id !== itemToDelete.id));
            setItemToDelete(null);
        }
    };

    const handleSaveUnitCost = (item: UnitCost) => {
        setUnitCosts(prev => {
            const exists = prev.some(uc => uc.id === item.id);
            return exists ? prev.map(uc => uc.id === item.id ? item : uc) : [...prev, item];
        });
        setUnitCostModalState({ isOpen: false, unitCost: null });
        showToast('Custo unitário salvo com sucesso!');
    };

    const handleDeleteUnitCost = () => {
        if (unitCostToDelete) {
            setUnitCosts(prev => prev.filter(uc => uc.id !== unitCostToDelete.id));
            setUnitCostToDelete(null);
        }
    };

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Controle de Custos</h1>
                    <p className="text-muted-foreground">Acompanhe os custos orçados versus realizados de cada operação.</p>
                </div>
                <Button onClick={() => setModalState({ isOpen: true, costItem: null })} icon={<PlusCircleIcon className="h-4 w-4"/>}>
                    Adicionar Custo da Operação
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <KpiCard title="Total Orçado" value={`R$ ${numberToBr(kpis.totalBudgeted)}`} />
                <KpiCard title="Total Realizado" value={`R$ ${numberToBr(kpis.totalActual)}`} />
                <KpiCard title="Variação" value={`${kpis.variance >= 0 ? '' : '-'} R$ ${numberToBr(Math.abs(kpis.variance))}`} variant={kpis.variance > 0 ? 'negative' : 'positive'}/>
            </div>

            <Card className="mb-8">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Data Início" name="dateStart" type="date" value={filters.dateStart} onChange={handleInputChange} />
                    <Input label="Data Fim" name="dateEnd" type="date" value={filters.dateEnd} onChange={handleInputChange} />
                    <Select label="Filtrar por Operação" name="operationUid" value={filters.operationUid} onChange={handleInputChange}>
                        <option value="">Todas as Operações</option>
                        {allSchedules.map(s => <option key={s.uid} value={s.uid}>{s.title} ({s.uid})</option>)}
                    </Select>
                 </div>
            </Card>

            <Card className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Tabela de Custo Unitário Orçado (R$/m³)</h2>
                    <Button onClick={() => setUnitCostModalState({ isOpen: true, unitCost: null })} icon={<PlusCircleIcon className="h-4 w-4"/>} size="sm">
                        Novo Custo Unitário
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-secondary/50">
                             <tr>
                                {['Categoria', 'Modal', 'Descrição', 'Custo (R$/m³)', 'Ações'].map(h => 
                                    <th key={h} className="p-3 text-left font-semibold">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {unitCosts.map(cost => (
                                <tr key={cost.id} className="border-b last:border-0 hover:bg-secondary/30">
                                    <td className="p-3">{categoryLabels[cost.category]}</td>
                                    <td className="p-3">{modalLabels[cost.modal]}</td>
                                    <td className="p-3">{cost.description}</td>
                                    <td className="p-3 font-mono text-right">{numberToBr(cost.budgetedAmount)}</td>
                                    <td className="p-3">
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" className="!p-2" onClick={() => setUnitCostModalState({ isOpen: true, unitCost: cost })} title="Editar"><PenSquareIcon className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="sm" className="!p-2" onClick={() => setUnitCostToDelete(cost)} title="Excluir"><Trash2Icon className="h-4 w-4 text-destructive"/></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {unitCosts.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground">
                            <p>Nenhum custo unitário cadastrado.</p>
                        </div>
                    )}
                </div>
            </Card>
            
            <Card className="!p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-secondary/50">
                            <tr>
                                {['Operação', 'Categoria', 'Descrição', 'Data', 'Orçado', 'Realizado', 'Variação', 'Ações'].map(h => 
                                    <th key={h} className="p-3 text-left font-semibold">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCostItems.map(cost => {
                                const variance = cost.actualAmount - cost.budgetedAmount;
                                const schedule = allSchedules.find(s => s.uid === cost.operationUid);
                                return (
                                <tr key={cost.id} className="border-b last:border-0 hover:bg-secondary/30">
                                    <td className="p-3">{schedule?.title || cost.operationUid}</td>
                                    <td className="p-3">{categoryLabels[cost.category]}</td>
                                    <td className="p-3">{cost.description}</td>
                                    <td className="p-3">{new Date(cost.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                    <td className="p-3 font-mono text-right">{numberToBr(cost.budgetedAmount)}</td>
                                    <td className="p-3 font-mono text-right">{numberToBr(cost.actualAmount)}</td>
                                    <td className={`p-3 font-mono text-right font-semibold ${variance > 0 ? 'text-red-500' : 'text-green-500'}`}>{numberToBr(variance)}</td>
                                    <td className="p-3">
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" className="!p-2" onClick={() => setModalState({ isOpen: true, costItem: cost })} title="Editar"><PenSquareIcon className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="sm" className="!p-2" onClick={() => setItemToDelete(cost)} title="Excluir"><Trash2Icon className="h-4 w-4 text-destructive"/></Button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                     {filteredCostItems.length === 0 && (
                        <div className="text-center p-16 text-muted-foreground">
                            <DollarSignIcon className="mx-auto h-12 w-12 mb-4" />
                            <p>Nenhum custo encontrado para os filtros selecionados.</p>
                        </div>
                    )}
                </div>
            </Card>

            {modalState.isOpen && (
                <CostFormModal 
                    isOpen={modalState.isOpen}
                    onClose={() => setModalState({ isOpen: false, costItem: null })}
                    onSave={handleSave}
                    allSchedules={allSchedules}
                    costItem={modalState.costItem}
                />
            )}
            
            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleDelete}
                title="Confirmar Exclusão de Custo"
            >
                <p>Tem certeza que deseja excluir o custo <strong className="text-foreground">{itemToDelete?.description}</strong>?</p>
            </ConfirmationModal>

            {unitCostModalState.isOpen && (
                <UnitCostFormModal
                    isOpen={unitCostModalState.isOpen}
                    onClose={() => setUnitCostModalState({ isOpen: false, unitCost: null })}
                    onSave={handleSaveUnitCost}
                    unitCost={unitCostModalState.unitCost}
                />
            )}

            <ConfirmationModal
                isOpen={!!unitCostToDelete}
                onClose={() => setUnitCostToDelete(null)}
                onConfirm={handleDeleteUnitCost}
                title="Confirmar Exclusão de Custo Unitário"
            >
                <p>Tem certeza que deseja excluir o custo unitário <strong className="text-foreground">{unitCostToDelete?.description}</strong>?</p>
            </ConfirmationModal>
        </main>
    );
};

// --- FORM MODAL ---
interface FormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: CostItem) => void;
    allSchedules: UnifiedSchedule[];
    costItem: CostItem | null;
}

const CostFormModal: React.FC<FormModalProps> = ({ isOpen, onClose, onSave, allSchedules, costItem }) => {
    const [formData, setFormData] = useState<Omit<CostItem, 'id'>>({
        operationUid: costItem?.operationUid || '',
        date: costItem?.date || new Date().toISOString().slice(0, 10),
        category: costItem?.category || 'frete',
        description: costItem?.description || '',
        budgetedAmount: costItem?.budgetedAmount || 0,
        actualAmount: costItem?.actualAmount || 0,
    });
    
    const handleSave = () => {
        onSave({
            id: costItem?.id || Date.now(),
            ...formData,
        });
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">{costItem ? 'Editar Custo' : 'Adicionar Custo'}</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                </header>
                <main className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Operação" name="operationUid" value={formData.operationUid} onChange={handleChange}>
                            <option value="">Selecione uma operação</option>
                            {allSchedules.map(s => <option key={s.uid} value={s.uid}>{s.title} ({s.uid})</option>)}
                        </Select>
                        <Input label="Data" name="date" type="date" value={formData.date} onChange={handleChange} />
                    </div>
                    <Select label="Categoria" name="category" value={formData.category} onChange={handleChange}>
                        {Object.entries(categoryLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </Select>
                    <Input label="Descrição" name="description" value={formData.description} onChange={handleChange} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Valor Orçado (R$)" name="budgetedAmount" type="number" value={formData.budgetedAmount} onChange={handleChange} />
                        <Input label="Valor Realizado (R$)" name="actualAmount" type="number" value={formData.actualAmount} onChange={handleChange} />
                    </div>
                </main>
                <footer className="p-4 bg-secondary/50 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar Custo</Button>
                </footer>
            </div>
        </div>
    );
};

// --- UNIT COST FORM MODAL ---
interface UnitCostFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: UnitCost) => void;
    unitCost: UnitCost | null;
}

const UnitCostFormModal: React.FC<UnitCostFormModalProps> = ({ isOpen, onClose, onSave, unitCost }) => {
    const [formData, setFormData] = useState<Omit<UnitCost, 'id'>>({
        category: unitCost?.category || 'frete',
        modal: unitCost?.modal || 'geral',
        description: unitCost?.description || '',
        budgetedAmount: unitCost?.budgetedAmount || 0,
    });

    const handleSave = () => {
        onSave({
            id: unitCost?.id || Date.now(),
            ...formData,
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">{unitCost ? 'Editar Custo Unitário' : 'Novo Custo Unitário'}</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                </header>
                <main className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Categoria" name="category" value={formData.category} onChange={handleChange}>
                            {Object.entries(categoryLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </Select>
                        <Select label="Modal" name="modal" value={formData.modal} onChange={handleChange}>
                            {Object.entries(modalLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </Select>
                    </div>
                    <Input label="Descrição" name="description" value={formData.description} onChange={handleChange} placeholder="Ex: Frete Curta Distância"/>
                    <Input label="Custo Orçado (R$/m³)" name="budgetedAmount" type="number" value={formData.budgetedAmount} onChange={handleChange} />
                </main>
                 <footer className="p-4 bg-secondary/50 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar</Button>
                </footer>
            </div>
        </div>
    );
};