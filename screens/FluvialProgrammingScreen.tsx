import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MetaPlanejamento, VesselSchedule, Vessel, VesselOpType, FluvialRateio, ProductType, VesselScheduleLifecycleStatus, GoalProductType, Incoterm } from '../types';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { PlusCircleIcon, XIcon, Trash2Icon, ShipIcon, FileTextIcon } from '../components/ui/icons';
import { brToNumber, numberToBr, formatDateTime } from '../utils/helpers';
import { Textarea } from '../components/ui/Textarea';

// --- TYPES & CONSTANTS ---
const lifecycleStatusConfig: Record<VesselScheduleLifecycleStatus, { text: string, style: string }> = {
    'PLANEJADO': { text: 'Planejado', style: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-400' },
    'AGUARDANDO CARREGAMENTO': { text: 'Aguard. Carreg.', style: 'bg-orange-100 text-orange-800 dark:bg-orange-400/10 dark:text-orange-400' },
    'EM CARREGAMENTO': { text: 'Carregando', style: 'bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-400' },
    'EM TRÂNSITO': { text: 'Em Trânsito', style: 'bg-purple-100 text-purple-800 dark:bg-purple-400/10 dark:text-purple-400' },
    'AGUARDANDO DESCARGA': { text: 'Aguard. Descarga', style: 'bg-teal-100 text-teal-800 dark:bg-teal-400/10 dark:text-teal-400' },
    'EM DESCARGA': { text: 'Descarregando', style: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-400' },
    'CONCLUÍDO': { text: 'Concluído', style: 'bg-green-100 text-green-800 dark:bg-green-400/10 dark:text-green-400' },
};

const LifecycleStatusBadge: React.FC<{ status: VesselScheduleLifecycleStatus }> = ({ status }) => {
    const config = lifecycleStatusConfig[status] || { text: status, style: 'bg-gray-200 text-gray-800 dark:bg-gray-400/10 dark:text-gray-400' };
    return (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full inline-block ${config.style}`}>
            {config.text}
        </span>
    );
};

// --- PROPS INTERFACE ---
interface FluvialProgrammingScreenProps {
    planningGoal: MetaPlanejamento;
    allPlanningGoals: MetaPlanejamento[];
    schedule: VesselSchedule[];
    setSchedule: React.Dispatch<React.SetStateAction<VesselSchedule[]>>;
    vessels: Vessel[];
    onBackToCenter: () => void;
    onBackToHub: () => void;
    onStartOperation: (scheduleId: number) => void;
    onRegisterArrival: (scheduleId: number) => void;
    onStartDischarge: (scheduleId: number) => void;
    onFinalizeTrip: (scheduleId: number) => void;
    onGenerateReport: (scheduleId: number) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

export const FluvialProgrammingScreen: React.FC<FluvialProgrammingScreenProps> = ({
    planningGoal, allPlanningGoals, schedule, setSchedule, vessels,
    onBackToCenter, onBackToHub, showToast, onStartOperation,
    onRegisterArrival, onStartDischarge, onFinalizeTrip, onGenerateReport
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSchedule, setCurrentSchedule] = useState<VesselSchedule | null>(null);
    const [scheduleToDelete, setScheduleToDelete] = useState<VesselSchedule | null>(null);

    const planningType = planningGoal.modal === 'fluvial' ? 'Balsa' : 'Navio';

    const filteredSchedules = useMemo(() => {
        return schedule.filter(item => {
            return item.planningGoalId === planningGoal.id && item.vesselType === planningType;
        }).sort((a,b) => new Date(b.etb || 0).getTime() - new Date(a.etb || 0).getTime());
    }, [schedule, planningGoal.id, planningType]);

    const breadcrumbItems = useMemo(() => {
        const path: { label: string, onClick?: () => void }[] = [
            { label: 'Central de planejamento multimodal', onClick: onBackToHub },
            { label: `Central de Planejamento ${planningGoal.modal === 'fluvial' ? 'Fluvial' : 'Marítimo'}`, onClick: onBackToCenter }
        ];
        // This logic can be simplified if the hierarchy is not needed here
        path.push({ label: planningGoal.title });
        path.push({ label: 'Programação' });
        return path;
    }, [planningGoal, onBackToHub, onBackToCenter]);


    const handleOpenModal = useCallback((item: VesselSchedule | null) => {
        const vesselName = vessels.find(v => v.type.startsWith(planningType.toLowerCase()))?.name || '';
        const vesselId = vessels.find(v => v.name === vesselName)?.id;

        if (item) {
            setCurrentSchedule({...item, rateios: item.rateios || []});
        } else {
            const defaultProduct = planningGoal.product === 'etanol-mix' ? 'anidro' : planningGoal.product as ProductType;
            setCurrentSchedule({
                id: Date.now(),
                planningGoalId: planningGoal.id,
                status: 'PLANEJADO',
                product: defaultProduct,
                vesselType: planningType,
                vesselName: vesselName,
                vesselId: vesselId,
                port: planningGoal.origin,
                tanks: [],
                rateios: [],
            });
        }
        setIsModalOpen(true);
    }, [planningType, planningGoal, vessels]);

    const handleSaveSchedule = (itemToSave: VesselSchedule) => {
        setSchedule(prev => {
            const exists = prev.some(s => s.id === itemToSave.id);
            if (exists) {
                return prev.map(s => s.id === itemToSave.id ? itemToSave : s);
            }
            return [...prev, itemToSave];
        });
        setIsModalOpen(false);
        showToast('Programação salva com sucesso!');
    };

    const handleDeleteSchedule = () => {
        if (scheduleToDelete) {
            setSchedule(prev => prev.filter(s => s.id !== scheduleToDelete.id));
            setScheduleToDelete(null);
        }
    };

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <Breadcrumb items={breadcrumbItems} />
            <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Programação de Viagens</h1>
                    <p className="text-muted-foreground">Gerencie as viagens para a meta: <span className="font-semibold text-foreground">{planningGoal.title}</span></p>
                </div>
                <Button onClick={() => handleOpenModal(null)} icon={<PlusCircleIcon className="h-4 w-4"/>}>
                    Nova Programação
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSchedules.map(item => (
                    <Card key={item.id} className="flex flex-col !p-0">
                        <div className="p-4 cursor-pointer" onClick={() => handleOpenModal(item)}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg">{item.vesselName}</h3>
                                    <p className="text-sm text-muted-foreground">{item.rateios.map(r => r.cliente).join(', ')}</p>
                                </div>
                                <LifecycleStatusBadge status={item.status} />
                            </div>
                            <div className="mt-4 pt-4 border-t text-sm space-y-2 flex-grow">
                                <p><strong>Porto:</strong> {item.port}</p>
                                <p><strong>ETB:</strong> {formatDateTime(item.etb)}</p>
                                <p><strong>Pedidos:</strong> {item.rateios.map(r => r.pedido).join(', ') || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="p-2 bg-secondary/50 rounded-b-xl flex justify-end gap-2">
                             <Button variant="ghost" size="sm" onClick={() => handleOpenModal(item)}>Editar</Button>
                             {item.status === 'PLANEJADO' && <Button size="sm" onClick={() => onStartOperation(item.id)}>Iniciar Carregamento</Button>}
                             {item.status === 'EM TRÂNSITO' && <Button size="sm" onClick={() => onRegisterArrival(item.id)}>Registrar Chegada</Button>}
                             {item.status === 'AGUARDANDO DESCARGA' && <Button size="sm" onClick={() => onStartDischarge(item.id)}>Iniciar Descarga</Button>}
                        </div>
                    </Card>
                ))}
                {filteredSchedules.length === 0 && (
                     <div className="text-center py-12 text-muted-foreground md:col-span-2 lg:col-span-3">
                        <ShipIcon className="mx-auto h-12 w-12" />
                        <h3 className="mt-4 text-lg font-medium">Nenhuma programação encontrada</h3>
                        <p>Nenhuma viagem foi programada para esta meta ainda.</p>
                    </div>
                )}
            </div>

            {isModalOpen && currentSchedule && (
                <ScheduleFormModal 
                    schedule={currentSchedule} 
                    vessels={vessels}
                    onSave={handleSaveSchedule} 
                    onClose={() => setIsModalOpen(false)}
                    onDelete={(item) => {
                        setIsModalOpen(false);
                        setScheduleToDelete(item);
                    }}
                    planningGoal={planningGoal}
                    allPlanningGoals={allPlanningGoals}
                />
            )}

            <ConfirmationModal
                isOpen={!!scheduleToDelete}
                onClose={() => setScheduleToDelete(null)}
                onConfirm={handleDeleteSchedule}
                title="Confirmar Exclusão"
            >
                <p>Tem certeza que deseja excluir a programação para <strong className="text-foreground">{scheduleToDelete?.vesselName}</strong>?</p>
            </ConfirmationModal>
        </main>
    );
};

// --- SCHEDULE FORM MODAL ---
interface ScheduleFormModalProps {
    schedule: VesselSchedule;
    vessels: Vessel[];
    onSave: (schedule: VesselSchedule) => void;
    onClose: () => void;
    onDelete: (schedule: VesselSchedule) => void;
    planningGoal?: MetaPlanejamento;
    allPlanningGoals: MetaPlanejamento[];
}

const ScheduleFormModal: React.FC<ScheduleFormModalProps> = ({ schedule, vessels, onSave, onClose, onDelete, planningGoal, allPlanningGoals }) => {
    const [formData, setFormData] = useState(schedule);

    const selectedVessel = useMemo(() => vessels.find(v => v.id === formData.vesselId), [formData.vesselId, vessels]);

    const productLabels: Record<ProductType, string> = {
        'anidro': 'Etanol Anidro',
        'hidratado': 'Etanol Hidratado',
        'granel': 'Granel',
    };

    useEffect(() => {
        const totalVolume = formData.rateios.reduce((sum, r) => sum + (Number(r.volume) || 0), 0);
        if (brToNumber(formData.plannedVolume || '0') !== totalVolume) {
             handleChange('plannedVolume', String(totalVolume));
        }
    }, [formData.rateios, formData.plannedVolume]);
    
    useEffect(() => {
        const firstEtaDestino = formData.rateios?.find(r => r.etaDestino)?.etaDestino;
        const maritimeTransitDays = brToNumber(formData.plannedTransitTimeDays || '0');
        const currentGoal = allPlanningGoals.find(g => g.id === formData.planningGoalId);

        let calculatedEtb = '';
        let calculatedRoadDepartureDate: string | undefined = undefined;

        if (firstEtaDestino && isFinite(maritimeTransitDays) && maritimeTransitDays > 0) {
            try {
                const etaDate = new Date(firstEtaDestino);
                const maritimeTransitMillis = maritimeTransitDays * 24 * 60 * 60 * 1000;
                const etbDate = new Date(etaDate.getTime() - maritimeTransitMillis);

                if (!isNaN(etbDate.getTime())) {
                    calculatedEtb = etbDate.toISOString().slice(0, 16);
                    
                    if (currentGoal?.type === 'TRANSBORDO') {
                        const roadTransitDays = brToNumber(formData.roadTransitTimeDays || '0');
                        if (isFinite(roadTransitDays) && roadTransitDays > 0) {
                            const roadTransitMillis = roadTransitDays * 24 * 60 * 60 * 1000;
                            const roadDepartureDateObj = new Date(etbDate.getTime() - roadTransitMillis);
                            if (!isNaN(roadDepartureDateObj.getTime())) {
                                calculatedRoadDepartureDate = roadDepartureDateObj.toISOString().slice(0, 10);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Error calculating dates:", e);
            }
        }
        
        if (formData.etb !== calculatedEtb || formData.roadDepartureDate !== calculatedRoadDepartureDate) {
            setFormData(prev => ({
                ...prev,
                etb: calculatedEtb,
                roadDepartureDate: calculatedRoadDepartureDate,
            }));
        }
    }, [formData.rateios, formData.plannedTransitTimeDays, formData.roadTransitTimeDays, formData.planningGoalId, allPlanningGoals, formData.etb, formData.roadDepartureDate]);


    const handleChange = (field: keyof VesselSchedule, value: any) => {
        const newFormData = {...formData, [field]: value};
        if (field === 'vesselName') {
            const selected = vessels.find(v => v.name === value);
            newFormData.vesselId = selected?.id;
        }
        setFormData(newFormData);
    };

    const handleRateioChange = (index: number, field: keyof FluvialRateio, value: string | number) => {
        const newRateios = [...formData.rateios];
        newRateios[index] = { ...newRateios[index], [field]: value };
        setFormData(prev => ({ ...prev, rateios: newRateios }));
    };

    const handleAddRateio = () => {
        const newRateio: FluvialRateio = {
            id: Date.now(),
            cliente: '',
            pedido: '',
            volume: 0,
            localDescarga: '',
            terminalDescarga: '',
        };
        setFormData(prev => ({ ...prev, rateios: [...prev.rateios, newRateio] }));
    };

    const handleRemoveRateio = (index: number) => {
        setFormData(prev => ({ ...prev, rateios: prev.rateios.filter((_, i) => i !== index) }));
    };

    const handleSave = () => {
        onSave(formData);
    };

    const isProductMix = planningGoal?.product === 'etanol-mix';
    const productOptions = isProductMix
        ? ['anidro', 'hidratado']
        : [planningGoal?.product || formData.product];

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in" style={{animationDuration: '200ms'}} onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">Programação de Embarcação</h2>
                        <p className="text-sm text-muted-foreground">{formData.vesselName || 'Nova Programação'}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                </header>
                
                <main className="p-6 space-y-6 overflow-y-auto">
                    {/* Identificação */}
                    <Card padding="md">
                        <h3 className="font-semibold mb-3">A) Identificação</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Select label="Nome da Embarcação" value={formData.vesselName} onChange={e => handleChange('vesselName', e.target.value)}>
                                <option value="" disabled>Selecione</option>
                                {vessels.filter(v => v.type.startsWith(formData.vesselType.toLowerCase())).map(v => (
                                    <option key={v.id} value={v.name}>{v.name}</option>
                                ))}
                            </Select>
                            <Input label="Tipo de Embarcação" value={selectedVessel?.type.replace('-', ' ') || 'N/A'} disabled containerClassName="capitalize"/>
                            <Input label="Porto / Terminal / Píer" value={formData.port} onChange={e => handleChange('port', e.target.value)} />
                            <Select label="Produto da Operação" value={formData.product} onChange={e => handleChange('product', e.target.value as ProductType)} containerClassName="md:col-span-3" disabled={!isProductMix}>
                                {productOptions.map(p => (<option key={p as string} value={p as string}>{productLabels[p as ProductType]}</option>))}
                            </Select>
                        </div>
                    </Card>

                    {/* Rateio de Pedidos */}
                    <Card padding="md">
                        <h3 className="font-semibold mb-3">B) Rateio de Pedidos</h3>
                        <div className="space-y-3">
                        {formData.rateios.map((rateio, index) => (
                            <div key={rateio.id} className="p-3 bg-secondary/50 rounded-lg relative">
                                <Button variant="ghost" size="sm" className="!p-1 absolute top-2 right-2" onClick={() => handleRemoveRateio(index)}><Trash2Icon className="h-4 w-4 text-destructive"/></Button>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Input label="Cliente" value={rateio.cliente} onChange={e => handleRateioChange(index, 'cliente', e.target.value)} containerClassName="md:col-span-2"/>
                                    <Input label="Nº Pedido" value={rateio.pedido} onChange={e => handleRateioChange(index, 'pedido', e.target.value)} />
                                    <Input label="Volume (L)" type="number" value={rateio.volume} onChange={e => handleRateioChange(index, 'volume', Number(e.target.value))} />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                    <Input label="Local Descarga" value={rateio.localDescarga} onChange={e => handleRateioChange(index, 'localDescarga', e.target.value)} />
                                    <Input label="Terminal Descarga" value={rateio.terminalDescarga} onChange={e => handleRateioChange(index, 'terminalDescarga', e.target.value)} />
                                    <Input label="ETA Destino" type="datetime-local" value={rateio.etaDestino || ''} onChange={e => handleRateioChange(index, 'etaDestino', e.target.value)} />
                                    <Input label="ETB Destino" type="datetime-local" value={rateio.etbDestino || ''} onChange={e => handleRateioChange(index, 'etbDestino', e.target.value)} />
                                </div>
                            </div>
                        ))}
                        </div>
                         <Button variant="secondary" size="sm" onClick={handleAddRateio} className="mt-4" icon={<PlusCircleIcon className="h-4 w-4"/>}>Adicionar Rateio</Button>
                    </Card>

                    {/* Planejado */}
                    <Card padding="md">
                        <h3 className="font-semibold mb-3">C) Planejado (CARGA)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                            <Input label="ETA (Chegada na área)" type="datetime-local" value={formData.eta || ''} onChange={e => handleChange('eta', e.target.value)}/>
                            
                            <div>
                                <Input label="ETB (Atracação)" type="datetime-local" value={formData.etb || ''} onChange={() => {}} readOnly />
                                <p className="text-xs text-muted-foreground mt-1">Calculado a partir do 1º ETA Destino.</p>
                            </div>
                            
                            <Input label="ETD (Saída do berço)" type="datetime-local" value={formData.etd || ''} onChange={e => handleChange('etd', e.target.value)}/>
                            
                            <Select label="Incoterm" name="incoterm" value={formData.incoterm || ''} onChange={e => handleChange('incoterm', e.target.value as Incoterm)}>
                                <option value="">N/A</option>
                                <option>EXW</option><option>FOB</option><option>CIF</option><option>DDP</option><option>DAP</option><option>CPT</option>
                            </Select>
                            
                            <Input label="Transit Time Marítimo (dias)" name="plannedTransitTimeDays" type="number" value={formData.plannedTransitTimeDays || ''} onChange={e => handleChange('plannedTransitTimeDays', e.target.value)} />
                            
                            <Input label="Volume Previsto (L)" type="text" value={numberToBr(brToNumber(formData.plannedVolume || ''), 0)} readOnly containerClassName="font-mono" />
                            
                            {planningGoal?.type === 'TRANSBORDO' && (
                                <>
                                    <Input label="Transit Time Rodoviário (dias)" name="roadTransitTimeDays" type="number" value={formData.roadTransitTimeDays || ''} onChange={e => handleChange('roadTransitTimeDays', e.target.value)} />
                                    <div>
                                        <Input label="Data de Saída Rodoviária (Calculada)" type="date" value={formData.roadDepartureDate || ''} readOnly />
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>
                    <Card padding="md">
                        <h3 className="font-semibold mb-3">D) Rastreabilidade & Ocorrências</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Densidade de Liberação" name="releaseDensity" value={formData.releaseDensity || ''} onChange={e => handleChange('releaseDensity', e.target.value)} />
                            <Input label="INPM de Liberação" name="releaseInpm" value={formData.releaseInpm || ''} onChange={e => handleChange('releaseInpm', e.target.value)} />
                        </div>
                        <Textarea label="Ocorrências" name="occurrences" value={formData.occurrences || ''} onChange={e => handleChange('occurrences', e.target.value)} className="mt-4" />
                    </Card>

                    <Select
                        label="Vincular à Meta (Opcional)"
                        value={formData.planningGoalId || ''}
                        onChange={e => handleChange('planningGoalId', e.target.value ? Number(e.target.value) : undefined)}
                    >
                        <option value="">Não vincular a meta</option>
                        {allPlanningGoals
                            .filter(g => g.modal === 'fluvial' || g.modal === 'maritimo')
                            .map(g => (
                            <option key={g.id} value={g.id}>{g.title}</option>
                        ))}
                    </Select>
                </main>

                <footer className="p-4 bg-secondary/50 flex justify-between items-center">
                    <Button variant="destructive" onClick={() => onDelete(formData)}>Excluir</Button>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSave}>Salvar Programação</Button>
                    </div>
                </footer>
            </div>
        </div>
    );
};