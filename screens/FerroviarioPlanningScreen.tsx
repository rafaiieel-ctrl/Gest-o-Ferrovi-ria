import React, { useState, useMemo, SetStateAction } from 'react';
import { FerroviarioSchedule, ScheduleStatus, FerroviarioRateio, ProductType } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { PlusCircleIcon, TrainIcon, XIcon, Trash2Icon, ArrowUpCircleIcon, ArrowDownCircleIcon, AlertTriangleIcon } from '../components/ui/icons';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { brToNumber, numberToBr } from '../utils/helpers';

interface FerroviarioPlanningScreenProps {
    onBack: () => void;
    schedules: FerroviarioSchedule[];
    setSchedules: React.Dispatch<SetStateAction<FerroviarioSchedule[]>>;
    onStartLoading: (id: number) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

export const FerroviarioPlanningScreen: React.FC<FerroviarioPlanningScreenProps> = ({ onBack, schedules, setSchedules, onStartLoading, showToast }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<FerroviarioSchedule | null>(null);
    const [itemToDelete, setItemToDelete] = useState<FerroviarioSchedule | null>(null);

    const handleOpenModal = (item: FerroviarioSchedule | null) => {
        setCurrentItem(item || { id: Date.now(), status: 'PLANEJADO', composicao: '', qtd_vagoes: '', produto: 'anidro', tipo_veiculo: 'vagao-tanque', origem: '', destino: '', janela_carregamento_prevista: '', saida_prevista: '', chegada_prevista: '', volume_previsto: '', volume_real: '', rateios: [], vagoes: [] });
        setIsModalOpen(true);
    };
    
    const handleSave = (item: FerroviarioSchedule) => {
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
        { label: 'Programação Ferroviária' }
    ];

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <Breadcrumb items={breadcrumbItems} />
            <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Programação Ferroviária</h1>
                    <p className="text-muted-foreground">Gerencie as composições e o transporte ferroviário.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={onBack}>Voltar</Button>
                    <Button onClick={() => handleOpenModal(null)} icon={<PlusCircleIcon className="h-4 w-4"/>}>
                        Nova Programação
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                {schedules.map(item => {
                     const totalVagoesRateio = item.rateios.reduce((sum, r) => sum + (parseInt(r.qtd_vagoes, 10) || 0), 0);
                    return (
                     <Card key={item.id} className="transition-all hover:border-primary/50">
                         <div className="flex justify-between items-start" onClick={() => handleOpenModal(item)}>
                             <div>
                                <h3 className="font-bold text-lg">{item.composicao}</h3>
                                <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1 flex-wrap">
                                    <span>{item.origem} → {item.destino}</span>
                                    <span className="capitalize">{item.produto}</span>
                                    <span className="capitalize">{item.tipo_veiculo.replace('-', ' ')}</span>
                                    <span className="font-mono">{item.rateios.length} Pedido(s)</span>
                                </div>
                             </div>
                             <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${item.status === 'PLANEJADO' ? 'bg-yellow-400/10 text-yellow-500' : 'bg-green-400/10 text-green-500'}`}>
                                {item.status}
                            </span>
                         </div>
                         <div className="mt-4 pt-4 border-t flex justify-between items-center">
                            <p className="text-sm font-semibold">
                                Vagões Rateados: <span className="font-mono">{totalVagoesRateio}</span> / {item.qtd_vagoes}
                            </p>
                             <div className="flex items-center gap-2">
                                <Button variant="secondary" size="sm" onClick={() => handleOpenModal(item)}>Detalhes</Button>
                                {(item.status === 'PLANEJADO' || item.status === 'EM CARREGAMENTO') && (
                                    <Button 
                                        variant="primary" 
                                        size="sm" 
                                        onClick={() => onStartLoading(item.id)}
                                    >
                                        {item.status === 'PLANEJADO' ? 'Iniciar Carregamento' : 'Acompanhar Carregamento'}
                                    </Button>
                                )}
                             </div>
                         </div>
                     </Card>
                )})}
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
                <p>Tem certeza que deseja excluir a programação <strong className="text-foreground">{itemToDelete?.composicao}</strong>?</p>
            </ConfirmationModal>
        </main>
    );
};

// --- FORM MODAL ---
interface FormModalProps {
    item: FerroviarioSchedule;
    onSave: (item: FerroviarioSchedule) => void;
    onClose: () => void;
    onDelete: (item: FerroviarioSchedule) => void;
}
const FormModal: React.FC<FormModalProps> = ({ item, onSave, onClose, onDelete }) => {
    const [formData, setFormData] = useState(item);

    const handleChange = (field: keyof FerroviarioSchedule, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleRateioChange = (index: number, field: keyof FerroviarioRateio, value: string) => {
        const newRateios = [...formData.rateios];
        newRateios[index] = { ...newRateios[index], [field]: value };
        setFormData(prev => ({ ...prev, rateios: newRateios }));
    };

    const handleAddRateio = () => {
        const newRateio: FerroviarioRateio = {
            id: Date.now(),
            cliente: '',
            pedido: '',
            tipo_pedido: 'venda',
            qtd_vagoes: '',
            volume_pedido: '',
            volume_consumido: '0'
        };
        setFormData(prev => ({ ...prev, rateios: [...prev.rateios, newRateio] }));
    };

    const handleRemoveRateio = (index: number) => {
        setFormData(prev => ({ ...prev, rateios: prev.rateios.filter((_, i) => i !== index) }));
    };
    
    const handleReorderRateio = (index: number, direction: 'up' | 'down') => {
        const newRateios = [...formData.rateios];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newRateios.length) {
            [newRateios[index], newRateios[targetIndex]] = [newRateios[targetIndex], newRateios[index]];
            setFormData(prev => ({ ...prev, rateios: newRateios }));
        }
    };

    const { totalVagoesAlocados, totalVolumeAlocado } = useMemo(() => {
        const totals = formData.rateios.reduce((acc, rateio) => {
            acc.totalVagoesAlocados += brToNumber(rateio.qtd_vagoes);
            acc.totalVolumeAlocado += brToNumber(rateio.volume_pedido);
            return acc;
        }, { totalVagoesAlocados: 0, totalVolumeAlocado: 0 });

        return totals;
    }, [formData.rateios]);
    
    const vagoesDisponiveis = brToNumber(formData.qtd_vagoes) || 0;
    const vagoesExcedidos = totalVagoesAlocados > vagoesDisponiveis;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Programação Ferroviária</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                </header>
                <main className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Dados Gerais */}
                    <fieldset>
                        <legend className="text-lg font-semibold text-foreground mb-2">Dados Gerais</legend>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Composição" value={formData.composicao} onChange={e => handleChange('composicao', e.target.value)} />
                                <Input label="Qtd. Vagões na Composição" value={formData.qtd_vagoes} onChange={e => handleChange('qtd_vagoes', e.target.value)} />
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <Select label="Produto" value={formData.produto} onChange={e => handleChange('produto', e.target.value as ProductType)}>
                                    <option value="anidro">Anidro</option>
                                    <option value="hidratado">Hidratado</option>
                                </Select>
                                <Select label="Tipo de Veículo" value={formData.tipo_veiculo} onChange={e => handleChange('tipo_veiculo', e.target.value as any)}>
                                    <option value="vagao-tanque">Vagão-tanque</option>
                                    <option value="vagao-granel">Vagão Granel</option>
                                    <option value="vagao-container">Vagão Container</option>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Origem" value={formData.origem} onChange={e => handleChange('origem', e.target.value)} />
                                <Input label="Destino" value={formData.destino} onChange={e => handleChange('destino', e.target.value)} />
                            </div>
                            <Input label="Janela Carregamento (Prevista)" type="datetime-local" value={formData.janela_carregamento_prevista} onChange={e => handleChange('janela_carregamento_prevista', e.target.value)} />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Saída (Prevista)" type="datetime-local" value={formData.saida_prevista} onChange={e => handleChange('saida_prevista', e.target.value)} />
                                <Input label="Chegada (Prevista)" type="datetime-local" value={formData.chegada_prevista} onChange={e => handleChange('chegada_prevista', e.target.value)} />
                            </div>
                        </div>
                    </fieldset>
                    
                     {/* Rateio por Pedido */}
                    <fieldset>
                        <legend className="text-lg font-semibold text-foreground mb-2">Rateio por Pedido</legend>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-secondary/50">
                                    <tr>
                                        <th className="p-2 text-left font-medium w-12">Ordem</th>
                                        <th className="p-2 text-left font-medium">Cliente</th>
                                        <th className="p-2 text-left font-medium">Pedido</th>
                                        <th className="p-2 text-left font-medium">Tipo Pedido</th>
                                        <th className="p-2 text-left font-medium">Qtd. Vagões</th>
                                        <th className="p-2 text-left font-medium">Vol. Pedido</th>
                                        <th className="p-2 text-left font-medium">Vol. Consumido</th>
                                        <th className="p-2 text-center font-medium w-16">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.rateios.map((rateio, index) => (
                                        <tr key={rateio.id} className="border-t">
                                            <td className="p-1 align-middle flex items-center justify-center h-full gap-1">
                                                <button onClick={() => handleReorderRateio(index, 'up')} disabled={index === 0} className="disabled:opacity-20"><ArrowUpCircleIcon className="h-5 w-5"/></button>
                                                <button onClick={() => handleReorderRateio(index, 'down')} disabled={index === formData.rateios.length - 1} className="disabled:opacity-20"><ArrowDownCircleIcon className="h-5 w-5"/></button>
                                            </td>
                                            <td className="p-1 align-middle"><Input value={rateio.cliente} onChange={e => handleRateioChange(index, 'cliente', e.target.value)} className="h-9" /></td>
                                            <td className="p-1 align-middle"><Input value={rateio.pedido} onChange={e => handleRateioChange(index, 'pedido', e.target.value)} className="h-9" /></td>
                                            <td className="p-1 align-middle">
                                                <Select value={rateio.tipo_pedido} onChange={e => handleRateioChange(index, 'tipo_pedido', e.target.value as any)} className="h-9">
                                                    <option value="venda">Venda</option>
                                                    <option value="remessa">Remessa</option>
                                                </Select>
                                            </td>
                                            <td className="p-1 align-middle"><Input value={rateio.qtd_vagoes} onChange={e => handleRateioChange(index, 'qtd_vagoes', e.target.value)} className="h-9" /></td>
                                            <td className="p-1 align-middle"><Input value={rateio.volume_pedido} onChange={e => handleRateioChange(index, 'volume_pedido', e.target.value)} className="h-9" /></td>
                                            <td className="p-1 align-middle"><Input value={rateio.volume_consumido} onChange={e => handleRateioChange(index, 'volume_consumido', e.target.value)} className="h-9" /></td>
                                            <td className="p-1 align-middle text-center">
                                                <Button variant="ghost" size="sm" onClick={() => handleRemoveRateio(index)}><Trash2Icon className="h-4 w-4 text-destructive"/></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-between items-start mt-3">
                            <Button variant="secondary" size="sm" onClick={handleAddRateio} icon={<PlusCircleIcon className="h-4 w-4"/>}>
                                Adicionar Rateio
                            </Button>
                            <div className="text-right">
                                <p className="text-sm font-semibold">
                                    Total Vagões Alocados: <span className={`font-mono ${vagoesExcedidos ? 'text-destructive' : 'text-foreground'}`}>{totalVagoesAlocados}</span> / {vagoesDisponiveis}
                                </p>
                                <p className="text-sm font-semibold">
                                    Volume Total Alocado: <span className="font-mono">{numberToBr(totalVolumeAlocado, 0)} L</span>
                                </p>
                                {vagoesExcedidos && (
                                    <p className="text-xs text-destructive flex items-center justify-end gap-1 mt-1">
                                        <AlertTriangleIcon className="h-4 w-4"/>
                                        Atenção: O número de vagões alocados excede o total da composição.
                                    </p>
                                )}
                            </div>
                        </div>
                    </fieldset>

                    <Select label="Status" value={formData.status} onChange={e => handleChange('status', e.target.value as ScheduleStatus)}>
                        <option>PLANEJADO</option>
                        <option>EM CARREGAMENTO</option>
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