















import React, { useState, useMemo, SetStateAction, useEffect } from 'react';
import { MetaPlanejamento, ProductType, FerroviarioSchedule, AppSettings, RouteLeg, ModalType, GoalProductType, ScheduleStatus, FerroviarioRateio } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { PlusCircleIcon, XIcon, Trash2Icon, LayoutGridIcon, ListIcon, GitForkIcon, PenSquareIcon, CalendarDaysIcon, TrainIcon, BarChart3Icon, ArrowUpCircleIcon, ArrowDownCircleIcon, AlertTriangleIcon } from '../components/ui/icons';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { brToNumber, formatQuantity, formatDateTime } from '../utils/helpers';


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

interface FerroviarioPlanningCenterScreenProps {
    planningGoals: MetaPlanejamento[];
    setPlanningGoals: React.Dispatch<SetStateAction<MetaPlanejamento[]>>;
    schedules: FerroviarioSchedule[];
    setSchedules: React.Dispatch<SetStateAction<FerroviarioSchedule[]>>;
    allPlanningGoals: MetaPlanejamento[];
    onViewProgramming: (goalId: number) => void;
    planningType: 'Trem';
    onBack: () => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
    appSettings: AppSettings;
    onStartOperation: (scheduleId: number) => void;
}

export const FerroviarioPlanningCenterScreen: React.FC<FerroviarioPlanningCenterScreenProps> = ({
    planningGoals, setPlanningGoals, schedules, setSchedules, allPlanningGoals, planningType, onBack, showToast, onViewProgramming, appSettings, onStartOperation
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
                volumes.set(s.planningGoalId, currentVolume + brToNumber(s.volume_previsto || '0'));
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

    const composicoesByGoal = useMemo(() => {
        const map = new Map<number, string[]>();
        schedules.forEach(s => {
            if (s.planningGoalId && s.composicao) {
                const current = map.get(s.planningGoalId) || [];
                if (!current.includes(s.composicao)) {
                    map.set(s.planningGoalId, [...current, s.composicao]);
                }
            }
        });
        return map;
    }, [schedules]);

    const currentGoals = useMemo(() => {
        return planningGoals.filter(g => g.parentId === parentId);
    }, [planningGoals, parentId]);
    
    const currentParentGoal = useMemo(() => parentId ? planningGoals.find(g => g.id === parentId) : null, [parentId, planningGoals]);
    const newGoalPeriod = currentParentGoal ? subPeriodMap[currentParentGoal.period] : 'ANUAL';

    const breadcrumbItems = useMemo(() => {
        const path: { label: string, onClick?: () => void }[] = [{ label: 'Central de planejamento multimodal', onClick: onBack }];
        const planningTypeLabel = `Central de Planejamento Ferroviário`;
        
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
            modal: 'ferroviario',
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
                     <h1 className="text-3xl font-bold tracking-tight">{viewMode === 'cards' ? breadcrumbItems[breadcrumbItems.length - 1].label : `Central de Planejamento Ferroviário`}</h1>
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
                        const composicoes = composicoesByGoal.get(goal.id) || [];
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
                                    {composicoes.length > 0 && <p className="truncate" title={composicoes.join(', ')}>Composiçõe(s): {composicoes.join(', ')}</p>}
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
                    setSchedules={setSchedules}
                    allPlanningGoals={allPlanningGoals}
                    showToast={showToast}
                    onClose={() => setSelectedMonth(null)}
                    appSettings={appSettings}
                    onStartOperation={onStartOperation}
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
        const end = new Date(goal.endDate + 'T00:00:00');
        end.setDate(end.getDate() + 1);
        
        const goalYear = start.getFullYear();

        const yearStart = new Date(goalYear, 0, 1);
        const yearEnd = new Date(goalYear + 1, 0, 1);
        const yearDuration = yearEnd.getTime() - yearStart.getTime();

        if (yearDuration <= 0) return { left: 0, width: 0 };

        const left = ((start.getTime() - yearStart.getTime()) / yearDuration) * 100;
        const width = ((end.getTime() - start.getTime()) / yearDuration) * 100;
        
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
// --- MONTHLY SCHEDULE VIEW ---

// FIX: Add 'AGUARDANDO CARREGAMENTO' to the config object to match the updated ScheduleStatus type.
const scheduleStatusConfig: Record<ScheduleStatus, { text: string, style: string }> = {
    'PLANEJADO': { text: 'Planejado', style: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-400' },
    'AGUARDANDO CARREGAMENTO': { text: 'Aguard. Carreg.', style: 'bg-orange-100 text-orange-800 dark:bg-orange-400/10 dark:text-orange-400' },
    'EM CARREGAMENTO': { text: 'Carregando', style: 'bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-400' },
    'EM TRÂNSITO': { text: 'Em Trânsito', style: 'bg-purple-100 text-purple-800 dark:bg-purple-400/10 dark:text-purple-400' },
    'CONCLUÍDO': { text: 'Concluído', style: 'bg-green-100 text-green-800 dark:bg-green-400/10 dark:text-green-400' },
    'ATRASADO': { text: 'Atrasado', style: 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-400' },
    'CANCELADO': { text: 'Cancelado', style: 'bg-gray-200 text-gray-800 dark:bg-gray-400/10 dark:text-gray-400' },
};

const ScheduleStatusBadge: React.FC<{ status: ScheduleStatus }> = ({ status }) => {
    const config = scheduleStatusConfig[status] || { text: status, style: 'bg-gray-200 text-gray-800 dark:bg-gray-400/10 dark:text-gray-400' };
    return (
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full inline-block ${config.style}`}>
            {config.text}
        </span>
    );
};

interface MonthlyScheduleViewProps {
    monthIndex: number;
    year: number;
    schedules: FerroviarioSchedule[];
    setSchedules: React.Dispatch<SetStateAction<FerroviarioSchedule[]>>;
    allPlanningGoals: MetaPlanejamento[];
    showToast: (message: string, type?: 'success' | 'error') => void;
    onClose: () => void;
    appSettings: AppSettings;
    onStartOperation: (scheduleId: number) => void;
}

// FIX: Add FormModal component definition to resolve "Cannot find name 'FormModal'" error.
// --- FORM MODAL ---
interface FormModalProps {
    item: FerroviarioSchedule;
    onSave: (item: FerroviarioSchedule) => void;
    onClose: () => void;
    onDelete: (item: FerroviarioSchedule) => void;
    planningGoal?: MetaPlanejamento;
    allPlanningGoals: MetaPlanejamento[];
}
const FormModal: React.FC<FormModalProps> = ({ item, onSave, onClose, onDelete, planningGoal, allPlanningGoals }) => {
    const [formData, setFormData] = useState(item);

    const productLabels: Record<ProductType, string> = {
        'anidro': 'Anidro',
        'hidratado': 'Hidratado',
        'granel': 'Granel'
    };
    const isProductMix = planningGoal?.product === 'etanol-mix';
    const productOptions = isProductMix
        ? ['anidro', 'hidratado']
        : [planningGoal?.product || formData.produto];

    const handleChange = (field: keyof FerroviarioSchedule, value: string | number | undefined) => {
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

    const handleSave = () => {
        onSave(formData);
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
                                <Select label="Produto" value={formData.produto} onChange={e => handleChange('produto', e.target.value as ProductType)} disabled={!isProductMix}>
                                    {productOptions.map(p => (
                                        <option key={p as string} value={p as string}>{productLabels[p as ProductType]}</option>
                                    ))}
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
                                    Volume Total Alocado: <span className="font-mono">{brToNumber(totalVolumeAlocado)} L</span>
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
                    
                    <Select
                        label="Vincular à Meta (Opcional)"
                        value={formData.planningGoalId || ''}
                        onChange={e => handleChange('planningGoalId', e.target.value ? Number(e.target.value) : undefined)}
                    >
                        <option value="">Não vincular a meta</option>
                        {allPlanningGoals
                            .filter(g => g.modal === 'ferroviario')
                            .map(g => (
                            <option key={g.id} value={g.id}>{g.title}</option>
                        ))}
                    </Select>

                </main>
                <footer className="p-4 bg-secondary/50 flex justify-between">
                    <Button variant="destructive" onClick={() => onDelete(formData)}>Excluir</Button>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSave}>Salvar</Button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

const MonthlyScheduleView: React.FC<MonthlyScheduleViewProps> = ({ 
    monthIndex, year, schedules, setSchedules, allPlanningGoals, showToast, onClose, appSettings, onStartOperation 
}) => {
    const [view, setView] = useState<'card' | 'list' | 'graph'>('card');
    const [currentItem, setCurrentItem] = useState<FerroviarioSchedule | null>(null);
    const [areFiltersVisible, setAreFiltersVisible] = useState(false);
    const [filters, setFilters] = useState({ client: '', order: '', origin: '', destination: '', product: '' });

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({ client: '', order: '', origin: '', destination: '', product: '' });
    };
    
    const monthName = new Date(year, monthIndex).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    const monthlySchedules = useMemo(() => {
        return schedules.filter(s => {
            const dateStr = s.janela_carregamento_prevista;
            if (!dateStr) return false;
            const scheduleDate = new Date(dateStr);
            const dateMatch = scheduleDate.getFullYear() === year && scheduleDate.getMonth() === monthIndex;

            if (!dateMatch) return false;
            
            const clientMatch = !filters.client || s.rateios.some(r => r.cliente.toLowerCase().includes(filters.client.toLowerCase()));
            const orderMatch = !filters.order || s.rateios.some(r => r.pedido.toLowerCase().includes(filters.order.toLowerCase()));
            const originMatch = !filters.origin || s.origem.toLowerCase().includes(filters.origin.toLowerCase());
            const destinationMatch = !filters.destination || s.destino.toLowerCase().includes(filters.destination.toLowerCase());
            const productMatch = !filters.product || s.produto === filters.product;

            return clientMatch && orderMatch && originMatch && destinationMatch && productMatch;
        }).sort((a,b) => new Date(a.janela_carregamento_prevista || 0).getTime() - new Date(b.janela_carregamento_prevista || 0).getTime());
    }, [schedules, monthIndex, year, filters]);

    const handleOpenModal = () => {
        const newSchedule: FerroviarioSchedule = {
            id: Date.now(),
            status: 'PLANEJADO',
            composicao: '',
            qtd_vagoes: '',
            produto: 'anidro',
            tipo_veiculo: 'vagao-tanque',
            origem: '',
            destino: '',
            janela_carregamento_prevista: new Date(year, monthIndex, 15).toISOString().slice(0, 16),
            saida_prevista: '',
            chegada_prevista: '',
            volume_previsto: '',
            volume_real: '',
            rateios: [],
            vagoes: []
        };
        setCurrentItem(newSchedule);
    };

     const handleSave = (item: FerroviarioSchedule) => {
        setSchedules(prev => {
            const exists = prev.some(s => s.id === item.id);
            return exists ? prev.map(s => s.id === item.id ? item : s) : [...prev, item];
        });
        setCurrentItem(null);
        showToast('Programação salva com sucesso!');
    };

    const ScheduleCard: React.FC<{ schedule: FerroviarioSchedule }> = ({ schedule }) => (
        <Card className="flex flex-col !p-0">
            <div className="p-4 flex-grow">
                <div className="flex justify-between items-start">
                    <h4 className="font-bold">{schedule.composicao}</h4>
                    <ScheduleStatusBadge status={schedule.status} />
                </div>
                <p className="text-sm text-muted-foreground">{schedule.origem} → {schedule.destino}</p>
                <p className="text-xs mt-2">Janela de Carreg.: {formatDateTime(schedule.janela_carregamento_prevista)}</p>
                <p className="text-xs">Volume: {formatQuantity(brToNumber(schedule.volume_previsto || '0'), 'Kg', appSettings.units, 0)}</p>
            </div>
            <div className="p-2 bg-secondary/50 rounded-b-xl flex justify-end gap-2 border-t">
                {schedule.status === 'PLANEJADO' && <Button size="sm" onClick={() => onStartOperation(schedule.id)}>Iniciar Carregamento</Button>}
            </div>
        </Card>
    );

    const CardView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthlySchedules.map(s => <ScheduleCard key={s.id} schedule={s} />)}
        </div>
    );

    const ListView = () => (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="border-b bg-secondary/50">
                    <tr>
                        <th className="p-2 text-left font-semibold">Composição</th>
                        <th className="p-2 text-left font-semibold">Rota</th>
                        <th className="p-2 text-left font-semibold">Janela de Carreg.</th>
                        <th className="p-2 text-right font-semibold">Volume</th>
                        <th className="p-2 text-left font-semibold">Status</th>
                        <th className="p-2 text-center font-semibold">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {monthlySchedules.map(s => (
                        <tr key={s.id} className="border-b last:border-b-0 hover:bg-secondary/30">
                            <td className="p-2 font-medium">{s.composicao}</td>
                            <td className="p-2">{s.origem} → {s.destino}</td>
                            <td className="p-2">{formatDateTime(s.janela_carregamento_prevista)}</td>
                            <td className="p-2 text-right font-mono">{formatQuantity(brToNumber(s.volume_previsto || '0'), 'Kg', appSettings.units, 0)}</td>
                            <td className="p-2"><ScheduleStatusBadge status={s.status} /></td>
                            <td className="p-2 text-center">
                                {s.status === 'PLANEJADO' && <Button size="sm" variant="secondary" onClick={() => onStartOperation(s.id)}>Carregar</Button>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
    
    const GraphView = () => {
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const getPosition = (schedule: FerroviarioSchedule) => {
            const startStr = schedule.janela_carregamento_prevista;
            if (!startStr) return { left: '0%', width: '3%' };
            
            const startDate = new Date(startStr);
            const endStr = schedule.chegada_prevista;
            const endDate = endStr ? new Date(endStr) : new Date(startDate.getTime() + 3 * 24*60*60*1000); // assume 3 days if no end

            const monthStart = new Date(year, monthIndex, 1);
            const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59);

            if (endDate < monthStart || startDate > monthEnd) return { left: '0%', width: '0%' };
            
            const effectiveStartDate = startDate < monthStart ? monthStart : startDate;
            const effectiveEndDate = endDate > monthEnd ? monthEnd : endDate;

            const startDay = effectiveStartDate.getDate();
            let durationDays = (effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (1000 * 3600 * 24) + 1;
            if (durationDays < 1) durationDays = 1;
            
            const left = ((startDay - 1) / daysInMonth) * 100;
            const width = (durationDays / daysInMonth) * 100;

            return { left: `${left}%`, width: `${Math.max(width, 100/daysInMonth)}%` };
        };
        
        return (
            <div className="space-y-4">
                <div className="sticky top-0 bg-card py-2">
                    <div className="grid text-xs text-center text-muted-foreground" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}>
                        {days.map(d => <div key={d} className="border-r last:border-r-0">{d}</div>)}
                    </div>
                </div>
                <div className="relative">
                    {monthlySchedules.map((s, index) => (
                        <div key={s.id} className="absolute w-full h-8" style={{ top: `${index * 2.5}rem`}}>
                             <div 
                                className="absolute bg-primary/80 rounded h-full flex items-center px-2 hover:bg-primary transition-colors cursor-pointer"
                                style={getPosition(s)}
                                title={`${s.composicao}: ${formatDateTime(s.janela_carregamento_prevista)} - Vol: ${brToNumber(s.volume_previsto || '0')}Kg`}
                            >
                                <span className="text-xs text-primary-foreground truncate font-medium">{s.composicao}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ height: `${monthlySchedules.length * 2.5}rem` }} />
            </div>
        );
    };

    const renderContent = () => {
         if (monthlySchedules.length === 0 && !areFiltersVisible && !Object.values(filters).some(f=>f)) {
            return (
                <div className="text-center py-12 text-muted-foreground">
                    <TrainIcon className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-medium">Nenhuma programação encontrada para {monthName}.</h3>
                </div>
            );
        }
        if (monthlySchedules.length === 0) {
            return (
                 <div className="text-center py-12 text-muted-foreground">
                    <h3 className="mt-4 text-lg font-medium">Nenhum resultado para os filtros aplicados.</h3>
                </div>
            )
        }
        switch(view) {
            case 'card': return <CardView />;
            case 'list': return <ListView />;
            case 'graph': return <GraphView />;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold">Programação de {monthName}</h2>
                        <p className="text-sm text-muted-foreground">{monthlySchedules.length} agendamento(s) para este mês.</p>
                    </div>
                    <div className="flex items-center gap-4">
                         <Button variant="secondary" size="sm" onClick={() => setAreFiltersVisible(!areFiltersVisible)}>Filtros</Button>
                         <Button variant="secondary" size="sm" onClick={handleOpenModal} icon={<PlusCircleIcon className="h-4 w-4" />}>
                            Nova Programação
                        </Button>
                        <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg">
                            <Button variant={view === 'card' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('card')} icon={<LayoutGridIcon className="h-4 w-4" />}>Cartões</Button>
                            <Button variant={view === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('list')} icon={<ListIcon className="h-4 w-4" />}>Lista</Button>
                            <Button variant={view === 'graph' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('graph')} icon={<BarChart3Icon className="h-4 w-4" />}>Gráfico</Button>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                    </div>
                </header>
                <main className="p-6 flex-grow overflow-y-auto">
                    {areFiltersVisible && (
                        <Card className="mb-6 animate-fade-in" style={{animationDuration: '300ms'}}>
                            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                                <Input label="Cliente" name="client" value={filters.client} onChange={handleFilterChange} />
                                <Input label="Pedido" name="order" value={filters.order} onChange={handleFilterChange} />
                                <Input label="Origem" name="origin" value={filters.origin} onChange={handleFilterChange} />
                                <Input label="Destino" name="destination" value={filters.destination} onChange={handleFilterChange} />
                                <Select label="Produto" name="product" value={filters.product} onChange={handleFilterChange}>
                                    <option value="">Todos</option>
                                    <option value="anidro">Anidro</option>
                                    <option value="hidratado">Hidratado</option>
                                    <option value="granel">Granel</option>
                                </Select>
                                <Button variant="ghost" onClick={clearFilters}>Limpar</Button>
                            </div>
                        </Card>
                    )}
                    {renderContent()}
                </main>
                 {currentItem && (
                    <FormModal
                        item={currentItem}
                        onSave={handleSave}
                        onClose={() => setCurrentItem(null)}
                        onDelete={() => {}}
                        allPlanningGoals={allPlanningGoals}
                    />
                )}
            </div>
        </div>
    );
};

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
            route: [{ id: Date.now(), modal: 'ferroviario', origin: '', destination: '' }],
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

        onSave({ id: goal?.id || Date.now(), modal: 'ferroviario', ...dataToSave });
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