
import React, { useState, useMemo, SetStateAction, useEffect } from 'react';
import { MetaPlanejamento, ProductType, VesselSchedule, AppSettings, RouteLeg, ModalType, GoalProductType, VesselScheduleLifecycleStatus, FluvialRateio, Vessel, VesselOpType, Incoterm } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { PlusCircleIcon, XIcon, Trash2Icon, LayoutGridIcon, ListIcon, GitForkIcon, PenSquareIcon, CalendarDaysIcon, BarChart3Icon, ShipIcon } from '../components/ui/icons';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { brToNumber, formatQuantity, numberToBr, formatDateTime } from '../utils/helpers';


// --- TYPES & CONSTANTS ---

const productLabels: Record<GoalProductType, string> = {
    'anidro': 'Etanol Anidro',
    'hidratado': 'Etanol Hidratado',
    'granel': 'Granel',
    'etanol-mix': 'Etanol (Mix Anidro/Hidratado)',
};
const periodLabels: Record<MetaPlanejamento['period'], string> = {
    'ANUAL': 'Anual',
    'MENSAL': 'Mensal',
    'SEMANAL': 'Semanal',
    'DIARIO': 'Diário',
};
const subPeriodMap: Record<MetaPlanejamento['period'], MetaPlanejamento['period'] | null> = {
    'ANUAL': 'MENSAL',
    'MENSAL': 'SEMANAL',
    'SEMANAL': 'DIARIO',
    'DIARIO': null,
};

type ViewMode = 'cards' | 'timeline';

// --- HELPER COMPONENTS ---

const RouteDisplay: React.FC<{ goal: MetaPlanejamento }> = ({ goal }) => {
    if (goal.type === 'TRANSBORDO' && goal.route && goal.route.length > 0) {
        const fullRouteString = [
            goal.route[0].origin,
            ...goal.route.map(leg => leg.destination)
        ].join(' → ');

        return (
            <div className="flex items-start gap-2">
                <GitForkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="truncate" title={fullRouteString}>
                    {fullRouteString}
                </p>
            </div>
        );
    }
    return (
        <p className="truncate" title={`${goal.origin} → ${goal.destination}`}>
            {goal.origin} → {goal.destination}
        </p>
    );
};


// --- MAIN PLANNING CENTER COMPONENT ---

interface FluvialPlanningCenterScreenProps {
    planningGoals: MetaPlanejamento[];
    setPlanningGoals: React.Dispatch<SetStateAction<MetaPlanejamento[]>>;
    schedules: VesselSchedule[];
    setSchedules: React.Dispatch<SetStateAction<VesselSchedule[]>>;
    vessels: Vessel[];
    allPlanningGoals: MetaPlanejamento[];
    onViewProgramming: (goalId: number) => void;
    planningType: 'Balsa' | 'Navio';
    onBack: () => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
    appSettings: AppSettings;
    onStartOperation: (scheduleId: number) => void;
    onRegisterArrival: (scheduleId: number) => void;
    onStartDischarge: (scheduleId: number) => void;
    onFinalizeTrip: (scheduleId: number) => void;
}
// FIX: Added missing components PlanningGoalModal, RouteLegsEditor, MonthlyScheduleView, and ScheduleFormModal
// --- ROUTE LEGS EDITOR ---
interface RouteLegsEditorProps {
    route: RouteLeg[];
    onChange: (route: RouteLeg[]) => void;
}

const RouteLegsEditor: React.FC<RouteLegsEditorProps> = ({ route, onChange }) => {
    const handleLegChange = (index: number, field: keyof Omit<RouteLeg, 'id'>, value: string) => {
        const newRoute = [...route];
        newRoute[index] = { ...newRoute[index], [field]: value };
        onChange(newRoute);
    };

    const addLeg = () => {
        const newLeg: RouteLeg = {
            id: Date.now(),
            modal: 'ferroviario',
            origin: route.length > 0 ? route[route.length - 1].destination : '',
            destination: ''
        };
        onChange([...route, newLeg]);
    };

    const removeLeg = (id: number) => {
        onChange(route.filter(leg => leg.id !== id));
    };

    return (
        <div className="space-y-3">
             <label className="block text-xs font-medium text-muted-foreground">Trechos da Rota</label>
            {route.map((leg, index) => (
                <div key={leg.id} className="p-3 bg-secondary/50 rounded-lg relative">
                     <Button variant="ghost" size="sm" className="!p-1 absolute top-2 right-2" onClick={() => removeLeg(leg.id)}><Trash2Icon className="h-4 w-4 text-destructive"/></Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Select label={`Modal Trecho ${index + 1}`} value={leg.modal} onChange={e => handleLegChange(index, 'modal', e.target.value)}>
                            <option value="rodoviario">Rodoviário</option>
                            <option value="fluvial">Fluvial</option>
                            <option value="ferroviario">Ferroviário</option>
                            <option value="maritimo">Marítimo</option>
                            <option value="dutoviario">Dutoviário</option>
                            <option value="aereo">Aéreo</option>
                        </Select>
                        <Input label="Origem" value={leg.origin} onChange={e => handleLegChange(index, 'origin', e.target.value)} />
                        <Input label="Destino" value={leg.destination} onChange={e => handleLegChange(index, 'destination', e.target.value)} />
                    </div>
                </div>
            ))}
            <Button variant="secondary" size="sm" onClick={addLeg} icon={<PlusCircleIcon className="h-4 w-4"/>}>Adicionar Trecho</Button>
        </div>
    );
};

// --- MODAL FORM FOR PLANNING GOAL ---
interface PlanningGoalModalProps {
    goal: MetaPlanejamento | null;
    parentId: number | null;
    newGoalPeriod: MetaPlanejamento['period'];
    onClose: () => void;
    onSave: (goal: MetaPlanejamento) => void;
    onDelete: (goal: MetaPlanejamento) => void;
    appSettings: AppSettings;
}

const PlanningGoalModal: React.FC<PlanningGoalModalProps> = ({ goal, parentId, newGoalPeriod, onClose, onSave, onDelete, appSettings }) => {
    const isNew = !goal;
    const [formData, setFormData] = useState<Omit<MetaPlanejamento, 'id' | 'modal'>>(() => {
        if (goal) return { ...goal, type: goal.type || 'DIRETO', route: goal.route || [] };
        return {
            parentId: parentId,
            title: '',
            period: newGoalPeriod,
            description: '',
            product: 'anidro',
            type: 'DIRETO',
            origin: '',
            destination: '',
            route: [{ id: Date.now(), modal: 'fluvial', origin: '', destination: '' }],
            totalVolume: 0,
            startDate: new Date().toISOString().slice(0, 10),
            endDate: '',
            status: 'PENDENTE',
        };
    });

     const volumeUnitLabel = useMemo(() => {
        const product = formData.product;
        if (product === 'anidro' || product === 'hidratado' || product === 'etanol-mix') {
            return appSettings.units.volume;
        }
        return appSettings.units.mass;
    }, [formData.product, appSettings.units]);

    useEffect(() => {
        if (formData.product === 'etanol-mix') {
            const volAnidro = formData.volumeAnidro || 0;
            const volHidratado = formData.volumeHidratado || 0;
            const total = volAnidro + volHidratado;
            if (formData.totalVolume !== total) {
                setFormData(prev => ({ ...prev, totalVolume: total }));
            }
        }
    }, [formData.volumeAnidro, formData.volumeHidratado, formData.product, formData.totalVolume]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isNumber = e.target.getAttribute('type') === 'number';
        
        setFormData(prev => {
            const newState = { ...prev, [name]: isNumber ? parseFloat(value) || 0 : value };
            if (name === 'product' && value !== 'etanol-mix') {
                newState.volumeAnidro = undefined;
                newState.volumeHidratado = undefined;
            }
            return newState;
        });
    };

    const handleSave = () => {
        if (!formData.title || formData.totalVolume <= 0) {
            alert("Preencha o Título e o Volume Total (maior que zero).");
            return;
        }

        const dataToSave = { ...formData };

        if (dataToSave.type === 'TRANSBORDO') {
            if (!dataToSave.route || dataToSave.route.length === 0 || !dataToSave.route[0].origin || !dataToSave.route[dataToSave.route.length - 1].destination) {
                 alert("Para uma rota de transbordo, defina ao menos um trecho com origem e destino.");
                return;
            }
            // Derive origin/destination from route for consistency
            dataToSave.origin = dataToSave.route[0].origin;
            dataToSave.destination = dataToSave.route[dataToSave.route.length - 1].destination;
        } else {
             if (!dataToSave.origin || !dataToSave.destination) {
                alert("Para uma rota direta, defina a Origem e o Destino.");
                return;
            }
            dataToSave.route = []; // Clear route if direct
        }

        onSave({ id: goal?.id || Date.now(), modal: 'fluvial', ...dataToSave });
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">{isNew ? 'Nova Meta de Planejamento' : 'Editar Meta'}</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                </header>
                <main className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {parentId !== null && <Input label="Meta Pai" value={`ID: ${parentId}`} disabled />}
                    <div className="grid grid-cols-3 gap-4">
                        <Input label="Título da Meta" name="title" value={formData.title} onChange={handleChange} placeholder="Ex: Contrato XPTO - 2024" containerClassName="col-span-2"/>
                        <Input label="Período" name="period" value={periodLabels[formData.period]} disabled />
                    </div>
                    <Textarea label="Descrição" name="description" value={formData.description} onChange={handleChange} placeholder="Detalhes sobre a meta, cliente, etc."/>
                    
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tipo de Rota</label>
                        <div className="flex p-1 bg-secondary rounded-lg w-full">
                            <button onClick={() => setFormData(prev => ({...prev, type: 'DIRETO'}))} className={`flex-1 p-2 text-sm font-semibold rounded-md transition-all ${formData.type === 'DIRETO' ? 'bg-card shadow text-primary' : 'text-muted-foreground hover:bg-card/50'}`}>Rota Direta</button>
                            <button onClick={() => setFormData(prev => ({...prev, type: 'TRANSBORDO'}))} className={`flex-1 p-2 text-sm font-semibold rounded-md transition-all ${formData.type === 'TRANSBORDO' ? 'bg-card shadow text-primary' : 'text-muted-foreground hover:bg-card/50'}`}>Transbordo</button>
                        </div>
                    </div>

                    {formData.type === 'DIRETO' ? (
                        <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{animationDuration: '300ms'}}>
                            <Input label="Origem" name="origin" value={formData.origin} onChange={handleChange} />
                            <Input label="Destino" name="destination" value={formData.destination} onChange={handleChange} />
                        </div>
                    ) : (
                         <div className="animate-fade-in" style={{animationDuration: '300ms'}}>
                            <RouteLegsEditor
                                route={formData.route || []}
                                onChange={(newRoute) => setFormData(prev => ({...prev, route: newRoute}))}
                            />
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 gap-4">
                         <Select label="Produto" name="product" value={formData.product} onChange={handleChange}>
                            {Object.entries(productLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </Select>
                         {formData.product === 'etanol-mix' ? (
                            <div className="grid grid-cols-3 gap-4 items-end animate-fade-in" style={{animationDuration: '300ms'}}>
                                <Input label={`Volume Anidro (${volumeUnitLabel})`} name="volumeAnidro" type="number" value={formData.volumeAnidro || ''} onChange={handleChange} />
                                <Input label={`Volume Hidratado (${volumeUnitLabel})`} name="volumeHidratado" type="number" value={formData.volumeHidratado || ''} onChange={handleChange} />
                                <Input label={`Volume Total (${volumeUnitLabel})`} name="totalVolume" type="number" value={formData.totalVolume} readOnly />
                            </div>
                        ) : (
                            <Input label={`Volume Total (${volumeUnitLabel})`} name="totalVolume" type="number" value={formData.totalVolume} onChange={handleChange} />
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Data de Início" name="startDate" type="date" value={formData.startDate} onChange={handleChange} />
                        <Input label="Data de Fim" name="endDate" type="date" value={formData.endDate} onChange={handleChange} />
                    </div>
                    <Select label="Status" name="status" value={formData.status} onChange={handleChange}>
                        <option value="PENDENTE">Pendente</option>
                        <option value="EM_ANDAMENTO">Em Andamento</option>
                        <option value="CONCLUIDO">Concluído</option>
                    </Select>
                </main>
                <footer className="p-4 bg-secondary/50 flex justify-between">
                    {!isNew ? (
                        <Button variant="destructive" onClick={() => onDelete(goal!)}>Excluir</Button>
                    ) : <div></div>}
                    <div className="flex gap-2 ml-auto">
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSave}>Salvar Meta</Button>
                    </div>
                </footer>
            </div>
        </div>
    );
}

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
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full inline-block ${config.style}`}>
            {config.text}
        </span>
    );
};

interface MonthlyScheduleViewProps {
    monthIndex: number;
    year: number;
    schedules: VesselSchedule[];
    vessels: Vessel[];
    setSchedules: React.Dispatch<SetStateAction<VesselSchedule[]>>;
    allPlanningGoals: MetaPlanejamento[];
    showToast: (message: string, type?: 'success' | 'error') => void;
    onClose: () => void;
    planningType: 'Balsa' | 'Navio';
    appSettings: AppSettings;
    onStartOperation: (scheduleId: number) => void;
    onRegisterArrival: (scheduleId: number) => void;
    onStartDischarge: (scheduleId: number) => void;
    onFinalizeTrip: (scheduleId: number) => void;
}
// --- SCHEDULE FORM MODAL ---
interface ScheduleFormModalProps {
    schedule: VesselSchedule;
    vessels: Vessel[];
    onSave: (schedule: VesselSchedule) => void;
    onClose: () => void;
    onDelete: (schedule: VesselSchedule) => void;
    allPlanningGoals: MetaPlanejamento[];
}

const ScheduleFormModal: React.FC<ScheduleFormModalProps> = ({ schedule, vessels, onSave, onClose, onDelete, allPlanningGoals }) => {
    const [formData, setFormData] = useState(schedule);

    const planningGoal = useMemo(() => {
        if (!formData.planningGoalId) return null;
        return allPlanningGoals.find(g => g.id === formData.planningGoalId);
    }, [formData.planningGoalId, allPlanningGoals]);

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

const MonthlyScheduleView: React.FC<MonthlyScheduleViewProps> = ({
    monthIndex, year, schedules, onClose
}) => {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
             <div className="bg-card rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold">Programação de {new Date(year, monthIndex).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                </header>
                <main className="p-6 flex-grow overflow-y-auto">
                    <p>Visualização mensal de programações fluviais/marítimas.</p>
                </main>
             </div>
        </div>
    );
};
export const FluvialPlanningCenterScreen: React.FC<FluvialPlanningCenterScreenProps> = ({
    planningGoals, setPlanningGoals, schedules, setSchedules, vessels, allPlanningGoals, planningType, onBack, showToast, onViewProgramming, appSettings,
    onStartOperation, onRegisterArrival, onStartDischarge, onFinalizeTrip
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<MetaPlanejamento | null>(null);
    const [goalToDelete, setGoalToDelete] = useState<MetaPlanejamento | null>(null);
    const [parentId, setParentId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('timeline');
    const [isTimelineSummarized, setIsTimelineSummarized] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const year = new Date().getFullYear();


    const scheduledVolumesByGoal = useMemo(() => {
        const volumes = new Map<number, number>();
        schedules.forEach(s => {
            if (s.planningGoalId) {
                const currentVolume = volumes.get(s.planningGoalId) || 0;
                volumes.set(s.planningGoalId, currentVolume + brToNumber(s.plannedVolume || '0'));
            }
        });
        return volumes;
    }, [schedules]);
    
    const clientsByGoal = useMemo(() => {
        const clientsMap = new Map<number, string[]>();
        schedules.forEach(s => {
            if (s.planningGoalId) {
                const currentClients = clientsMap.get(s.planningGoalId) || [];
                const newClients = s.rateios.map(r => r.cliente);
                clientsMap.set(s.planningGoalId, [...new Set([...currentClients, ...newClients])]);
            }
        });
        return clientsMap;
    }, [schedules]);

    const vesselsByGoal = useMemo(() => {
        const vesselsMap = new Map<number, string[]>();
        schedules.forEach(s => {
            if (s.planningGoalId && s.vesselName) {
                const currentVessels = vesselsMap.get(s.planningGoalId) || [];
                if (!currentVessels.includes(s.vesselName)) {
                    vesselsMap.set(s.planningGoalId, [...currentVessels, s.vesselName]);
                }
            }
        });
        return vesselsMap;
    }, [schedules]);

    const currentGoals = useMemo(() => {
        return planningGoals.filter(g => g.parentId === parentId);
    }, [planningGoals, parentId]);
    
    const currentParentGoal = useMemo(() => parentId ? planningGoals.find(g => g.id === parentId) : null, [parentId, planningGoals]);
    const newGoalPeriod = currentParentGoal ? subPeriodMap[currentParentGoal.period] : 'ANUAL';

    const breadcrumbItems = useMemo(() => {
        const path: { label: string, onClick?: () => void }[] = [{ label: 'Central de planejamento multimodal', onClick: onBack }];
        const planningTypeLabel = `Central de Planejamento ${planningType === 'Balsa' ? 'Fluvial' : 'Marítimo'}`;
        
        const buildPath = (id: number | null): MetaPlanejamento[] => {
            if (id === null) return [];
            const parent = planningGoals.find(g => g.id === id);
            if (!parent) return [];
            return [...buildPath(parent.parentId), parent];
        };
        const parentPath = buildPath(parentId);

        path.push({ label: planningTypeLabel, onClick: () => setParentId(null) });
        parentPath.forEach(p => {
            path.push({ label: p.title, onClick: () => setParentId(p.id) });
        });
        
        return path;
    }, [parentId, planningGoals, onBack, planningType]);
    
    const goalsForTimeline = useMemo(() => {
        if (isTimelineSummarized) {
            return planningGoals.filter(g => g.parentId === null);
        }
        return planningGoals;
    }, [isTimelineSummarized, planningGoals]);

    const handleOpenModal = (goal: MetaPlanejamento | null = null) => {
        setEditingGoal(goal);
        setIsModalOpen(true);
    };

    const handleSaveGoal = (goal: MetaPlanejamento) => {
        const goalToSave: MetaPlanejamento = {
            ...goal,
            parentId: goal.parentId === undefined ? parentId : goal.parentId,
            modal: planningType === 'Balsa' ? 'fluvial' : 'maritimo',
        };
        setPlanningGoals(prev => {
            const exists = prev.some(g => g.id === goalToSave.id);
            return exists ? prev.map(g => g.id === goalToSave.id ? goalToSave : g) : [...prev, goalToSave];
        });
        setIsModalOpen(false);
        showToast('Meta de planejamento salva com sucesso!');
    };

    const handleDeleteGoal = () => {
        if (goalToDelete) {
             const childrenIds = planningGoals.filter(g => g.parentId === goalToDelete.id).map(g => g.id);
            if (childrenIds.length > 0) {
                showToast('Não é possível excluir uma meta que possui sub-metas.', 'error');
                setGoalToDelete(null);
                return;
            }
            setPlanningGoals(prev => prev.filter(g => g.id !== goalToDelete.id));
            setGoalToDelete(null);
        }
    };
    
    const handleViewSubGoals = (goal: MetaPlanejamento) => {
        setParentId(goal.id);
        setViewMode('cards');
    };

    const handleAddSubGoal = (parentId: number) => {
        const parent = planningGoals.find(g => g.id === parentId);
        if (!parent || !subPeriodMap[parent.period]) {
            showToast('Não é possível adicionar sub-metas a este nível.', 'error');
            return;
        }
        setParentId(parentId);
        setEditingGoal(null); // Ensure we're creating a new one
        setIsModalOpen(true);
    };

    const getBaseUnitForGoal = (goal: MetaPlanejamento): 'L' | 'Kg' => {
        const product = goal.product;
        if (product === 'anidro' || product === 'hidratado' || product === 'etanol-mix') {
            return 'L';
        }
        return 'Kg';
    };


    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            {viewMode === 'cards' && <Breadcrumb items={breadcrumbItems} />}
            <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                <div>
                     <h1 className="text-3xl font-bold tracking-tight">{viewMode === 'cards' ? breadcrumbItems[breadcrumbItems.length - 1].label : `Central de Planejamento ${planningType === 'Balsa' ? 'Fluvial' : 'Marítimo'}`}</h1>
                    <p className="text-muted-foreground">Gerencie suas metas de transporte de alto nível.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg">
                        <Button variant={viewMode === 'cards' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('cards')} className="!p-2" title="Visão em Cartões">
                            <LayoutGridIcon className="h-5 w-5"/>
                        </Button>
                        <Button variant={viewMode === 'timeline' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('timeline')} className="!p-2" title="Visão de Cronograma">
                            <ListIcon className="h-5 w-5"/>
                        </Button>
                    </div>
                    {viewMode === 'timeline' && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsTimelineSummarized(prev => !prev)}
                        >
                            {isTimelineSummarized ? 'Visão Detalhada' : 'Visão Resumida'}
                        </Button>
                    )}
                    {newGoalPeriod && (
                        <Button onClick={() => handleOpenModal(null)} icon={<PlusCircleIcon className="h-4 w-4"/>}>
                            Nova Meta {periodLabels[newGoalPeriod]}
                        </Button>
                    )}
                </div>
            </div>

            {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {currentGoals.map(goal => {
                        const programmedVolume = scheduledVolumesByGoal.get(goal.id) || 0;
                        const realizedVolume = goal.realizedVolume || 0;
                        const progress = goal.totalVolume > 0 ? (realizedVolume / goal.totalVolume) * 100 : 0;
                        const childGoals = planningGoals.filter(g => g.parentId === goal.id);
                        const showProgrammingButton = ['MENSAL', 'SEMANAL', 'DIARIO'].includes(goal.period);
                        const clients = clientsByGoal.get(goal.id) || [];
                        const vessels = vesselsByGoal.get(goal.id) || [];
                        const baseUnit = getBaseUnitForGoal(goal);

                        return (
                            <Card key={goal.id}>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg">{goal.title}</h3>
                                     <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-secondary text-secondary-foreground">
                                        {periodLabels[goal.period]}
                                    </span>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                                    <p className="font-medium text-foreground/90">{productLabels[goal.product]}</p>
                                    {goal.product === 'etanol-mix' && (
                                        <p className="text-xs">
                                            A: {formatQuantity(goal.volumeAnidro || 0, baseUnit, appSettings.units, 0)} / H: {formatQuantity(goal.volumeHidratado || 0, baseUnit, appSettings.units, 0)}
                                        </p>
                                    )}
                                    {vessels.length > 0 && <p className="truncate" title={vessels.join(', ')}>Embarcação(ões): {vessels.join(', ')}</p>}
                                    {clients.length > 0 && <p className="truncate" title={clients.join(', ')}>Cliente(s): {clients.join(', ')}</p>}
                                    <div className="text-xs">
                                        <RouteDisplay goal={goal} />
                                    </div>
                                </div>
                                
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm font-medium mb-1">
                                        <span className="text-muted-foreground">Progresso Realizado</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full bg-secondary rounded-full h-2.5">
                                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1.5 flex justify-between">
                                        <span>
                                            {formatQuantity(realizedVolume, baseUnit, appSettings.units, 0)} / {formatQuantity(goal.totalVolume, baseUnit, appSettings.units, 0)}
                                        </span>
                                        <span>
                                            Programado: {formatQuantity(programmedVolume, baseUnit, appSettings.units, 0)}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="mt-6 flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(goal)}>Editar</Button>
                                    {goal.period !== 'DIARIO' && (
                                        <Button variant="secondary" size="sm" onClick={() => handleViewSubGoals(goal)}>
                                            Ver Sub-metas ({childGoals.length})
                                        </Button>
                                    )}
                                    {showProgrammingButton && (
                                        <Button size="sm" onClick={() => onViewProgramming(goal.id)}>
                                            Ver Programação
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <TimelineView 
                    goals={goalsForTimeline} 
                    scheduledVolumes={scheduledVolumesByGoal}
                    onEditGoal={handleOpenModal}
                    onDeleteGoal={(goal) => setGoalToDelete(goal)}
                    onViewSubGoals={handleViewSubGoals}
                    onViewProgramming={onViewProgramming}
                    onAddSubGoal={handleAddSubGoal}
                    appSettings={appSettings}
                    onMonthClick={setSelectedMonth}
                    year={year}
                />
            )}

            {isModalOpen && newGoalPeriod && (
                <PlanningGoalModal
                    goal={editingGoal}
                    parentId={parentId}
                    newGoalPeriod={newGoalPeriod}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveGoal}
                    onDelete={(goal) => {
                        setIsModalOpen(false);
                        setGoalToDelete(goal);
                    }}
                    appSettings={appSettings}
                />
            )}
             <ConfirmationModal
                isOpen={!!goalToDelete}
                onClose={() => setGoalToDelete(null)}
                onConfirm={handleDeleteGoal}
                title="Confirmar Exclusão da Meta"
            >
                <p>Tem certeza que deseja excluir a meta <strong className="text-foreground">{goalToDelete?.title}</strong>? As programações associadas não serão excluídas, mas ficarão sem uma meta.</p>
            </ConfirmationModal>
            
            {selectedMonth !== null && (
                <MonthlyScheduleView
                    monthIndex={selectedMonth}
                    year={year}
                    schedules={schedules}
                    vessels={vessels}
                    setSchedules={setSchedules}
                    allPlanningGoals={allPlanningGoals}
                    showToast={showToast}
                    onClose={() => setSelectedMonth(null)}
                    planningType={planningType}
                    appSettings={appSettings}
                    onStartOperation={onStartOperation}
                    onRegisterArrival={onRegisterArrival}
                    onStartDischarge={onStartDischarge}
                    onFinalizeTrip={onFinalizeTrip}
                />
            )}

        </main>
    );
};

// --- TIMELINE VIEW COMPONENT ---

interface TimelineViewProps {
    goals: MetaPlanejamento[];
    scheduledVolumes: Map<number, number>;
    onEditGoal: (goal: MetaPlanejamento) => void;
    onDeleteGoal: (goal: MetaPlanejamento) => void;
    onViewSubGoals: (goal: MetaPlanejamento) => void;
    onViewProgramming: (goalId: number) => void;
    onAddSubGoal: (parentId: number) => void;
    appSettings: AppSettings;
    onMonthClick: (monthIndex: number) => void;
    year: number;
}

const TimelineView: React.FC<TimelineViewProps> = ({ goals, scheduledVolumes, onEditGoal, onDeleteGoal, onViewSubGoals, onViewProgramming, onAddSubGoal, appSettings, onMonthClick, year }) => {
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 15).toLocaleString('pt-BR', { month: 'short' }));
    
    const getGoalPosition = (goal: MetaPlanejamento) => {
        const start = new Date(goal.startDate + 'T00:00:00');
        // To correctly calculate duration for inclusive end dates, 
        // create a date for the day AFTER the end date at midnight.
        const end = new Date(goal.endDate + 'T00:00:00');
        end.setDate(end.getDate() + 1);
        
        const goalYear = start.getFullYear();

        const yearStart = new Date(goalYear, 0, 1);
        const yearEnd = new Date(goalYear + 1, 0, 1); // Use start of next year for full year duration
        const yearDuration = yearEnd.getTime() - yearStart.getTime();

        if (yearDuration <= 0) return { left: 0, width: 0 };

        const left = ((start.getTime() - yearStart.getTime()) / yearDuration) * 100;
        const width = ((end.getTime() - start.getTime()) / yearDuration) * 100;
        
        // Add a minimum width for visibility of very short events
        return { left: Math.max(0, left), width: Math.max(0.2, Math.min(100 - left, width)) };
    };
    
    const periodConfig: Record<MetaPlanejamento['period'], { height: string, color: string, progressColor: string }> = {
        'ANUAL': { height: 'h-6', color: 'bg-blue-200 dark:bg-blue-900/50', progressColor: 'bg-blue-500' },
        'MENSAL': { height: 'h-5', color: 'bg-green-200 dark:bg-green-900/50', progressColor: 'bg-green-500' },
        'SEMANAL': { height: 'h-4', color: 'bg-amber-200 dark:bg-amber-900/50', progressColor: 'bg-amber-500' },
        'DIARIO': { height: 'h-3', color: 'bg-purple-200 dark:bg-purple-900/50', progressColor: 'bg-purple-500' },
    };

    const renderGoalRow = (goal: MetaPlanejamento, level: number) => {
        const { left, width } = getGoalPosition(goal);
        const config = periodConfig[goal.period];
        const children = goals.filter(g => g.parentId === goal.id);
        const programmedVolume = scheduledVolumes.get(goal.id) || 0;
        const realizedVolume = goal.realizedVolume || 0;
        const progress = goal.totalVolume > 0 ? (realizedVolume / goal.totalVolume) * 100 : 0;
        
        const showSubGoalsButton = goal.period !== 'DIARIO';
        const showProgrammingButton = ['MENSAL', 'SEMANAL', 'DIARIO'].includes(goal.period);
        const baseUnit = (goal.product === 'anidro' || goal.product === 'hidratado' || goal.product === 'etanol-mix') ? 'L' : 'Kg';


        return (
            <React.Fragment key={goal.id}>
                <div className="flex items-center py-3 border-b border-border last:border-b-0 group">
                    <div className="w-[45%] flex-shrink-0 pr-4" style={{ paddingLeft: `${level * 24}px` }}>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2" title={goal.title}>
                                {goal.type === 'TRANSBORDO' && <GitForkIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                                <p className="font-bold text-foreground text-sm truncate">{goal.title}</p>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                                {showProgrammingButton && (
                                    <Button variant="ghost" size="sm" className="!p-1.5 h-auto" onClick={(e) => { e.stopPropagation(); onViewProgramming(goal.id); }} title="Ver Programação">
                                        <CalendarDaysIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                    </Button>
                                )}
                                {showSubGoalsButton && (
                                    <Button variant="ghost" size="sm" className="!p-1.5 h-auto" onClick={(e) => { e.stopPropagation(); onViewSubGoals(goal); }} title="Ver Sub-metas">
                                        <GitForkIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                    </Button>
                                )}
                                {showSubGoalsButton && (
                                    <Button variant="ghost" size="sm" className="!p-1.5 h-auto" onClick={(e) => { e.stopPropagation(); onAddSubGoal(goal.id); }} title="Adicionar Sub-meta">
                                        <PlusCircleIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" className="!p-1.5 h-auto" onClick={(e) => { e.stopPropagation(); onEditGoal(goal); }} title="Editar">
                                    <PenSquareIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </Button>
                                <Button variant="ghost" size="sm" className="!p-1.5 h-auto" onClick={(e) => { e.stopPropagation(); onDeleteGoal(goal); }} title="Excluir">
                                    <Trash2Icon className="h-4 w-4 text-destructive/80 hover:text-destructive" />
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                            <span>
                                {formatQuantity(programmedVolume, baseUnit, appSettings.units, 0)} / {formatQuantity(goal.totalVolume, baseUnit, appSettings.units, 0)}
                            </span>
                            <span className="font-bold text-primary/80">({Math.round(progress)}%)</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            <p className="font-medium text-foreground/90 truncate">{productLabels[goal.product]}</p>
                             {goal.product === 'etanol-mix' && (
                                <p className="text-xs">
                                    A: {formatQuantity(goal.volumeAnidro || 0, baseUnit, appSettings.units, 0)} / H: {formatQuantity(goal.volumeHidratado || 0, baseUnit, appSettings.units, 0)}
                                </p>
                            )}
                            <RouteDisplay goal={goal} />
                        </div>
                    </div>
                    <div className="w-[55%] flex-grow relative h-10">
                        <div 
                            className="absolute cursor-pointer"
                            style={{ left: `${left}%`, width: `${width}%`, top: '50%', transform: 'translateY(-50%)' }}
                            onClick={() => onEditGoal(goal)}
                            title={`${goal.title}\nProgresso: ${Math.round(progress)}%`}
                        >
                            <div 
                                className={`rounded-sm ${config.height} ${config.color} overflow-hidden group-hover:shadow-lg transition-all duration-200`}
                            >
                                <div className={`absolute top-0 left-0 h-full ${config.progressColor}`} style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
                {children.map(child => renderGoalRow(child, level + 1))}
            </React.Fragment>
        );
    };

    const rootGoals = goals.filter(g => g.parentId === null);

    return (
        <div className="bg-card rounded-xl border border-border p-4 md:p-6 text-foreground font-sans animate-fade-in">
            <div className="flex text-xs font-semibold text-muted-foreground pb-2">
                <div className="w-[45%] pr-4"></div>
                <div className="w-[55%] grid grid-cols-12 text-center">
                    {months.map((m, i) => (
                        <div key={m} onClick={() => onMonthClick(i)} className="cursor-pointer hover:bg-secondary rounded p-1 transition-colors">{m.toUpperCase().replace('.', '')}</div>
                    ))}
                </div>
            </div>
             <div className="relative h-px bg-border -mx-6 mb-2">
                <div className="grid grid-cols-12 h-full ml-[45%]">
                    {months.map(month => <div key={month} className="border-r border-border last:border-r-0"></div>)}
                </div>
            </div>
            <div>
                {rootGoals.map(goal => renderGoalRow(goal, 0))}
            </div>
        </div>
    );
};
