





import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Vessel, VesselSchedule, VesselScheduleLifecycleStatus, AppSettings, VolumeUnit, FerroviarioSchedule, RodoviarioSchedule, DutoviarioSchedule, AereoSchedule, CostItem, Order } from '../types';
import { Card } from '../components/ui/Card';
import { getCertificateStatus, getPerformanceStatus, brToNumber, formatQuantity, numberToBr } from '../utils/helpers';
import { AlertTriangleIcon, ShipIcon, CalendarDaysIcon, BarChart3Icon, XIcon, CheckCircleIcon, ClockIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, PenSquareIcon, GitForkIcon, DollarSignIcon, BriefcaseIcon } from '../components/ui/icons';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Button } from '../components/ui/Button';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';

// --- NEW CHART TYPES & CONSTANTS ---
interface ChartData {
  [key: string]: {
    totalVolume: number;
    byModal: { [modal: string]: number };
  };
}
const MODAL_OPTIONS = [
    { id: 'fluvial', label: 'Fluvial', color: 'bg-blue-500' },
    { id: 'ferroviario', label: 'Ferroviário', color: 'bg-red-500' },
    { id: 'rodoviario', label: 'Rodoviário', color: 'bg-green-500' },
    { id: 'dutoviario', label: 'Dutoviário', color: 'bg-gray-500' },
    { id: 'aereo', label: 'Aéreo', color: 'bg-purple-500' },
];
// --- END NEW CHART TYPES ---

interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    description: string;
    children?: React.ReactNode;
    isGrabbing?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, description, children, isGrabbing }) => (
    <Card padding="md" className="flex flex-col h-full">
        <div className={`flex items-center justify-between ${isGrabbing ? 'cursor-grabbing' : 'cursor-grab'}`}>
            <h3 className="text-md font-semibold text-muted-foreground">{title}</h3>
            {icon}
        </div>
        <div className="mt-2">
            <p className="text-4xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {children && <div className="mt-4 pt-4 border-t border-border flex-grow">{children}</div>}
    </Card>
);

// --- NEW MOVEMENT CHART COMPONENT ---
interface MovementChartProps {
    fluvialSchedules: VesselSchedule[];
    ferroviarioSchedules: FerroviarioSchedule[];
    rodoviarioSchedules: RodoviarioSchedule[];
    dutoviarioSchedules: DutoviarioSchedule[];
    aereoSchedules: AereoSchedule[];
    appSettings: AppSettings;
}

const MovementChart: React.FC<MovementChartProps> = ({
    fluvialSchedules, ferroviarioSchedules, rodoviarioSchedules, dutoviarioSchedules, aereoSchedules, appSettings
}) => {
    const [timeRange, setTimeRange] = useState(6); // 3, 6, 12 months
    const [selectedModals, setSelectedModals] = useState<Set<string>>(() => new Set(MODAL_OPTIONS.map(m => m.id)));
    const [displayUnit, setDisplayUnit] = useState<VolumeUnit>(appSettings.units.volume);
    const [tooltip, setTooltip] = useState<{ x: number, y: number, month: string, data: ChartData[string] } | null>(null);

    const toggleModal = (modalId: string) => {
        setSelectedModals(prev => {
            const newSet = new Set(prev);
            if (newSet.has(modalId)) {
                newSet.delete(modalId);
            } else {
                newSet.add(modalId);
            }
            return newSet;
        });
    };

    const chartData = useMemo<ChartData>(() => {
        const movements: { date: Date; volume: number; modal: string }[] = [];

        // Aggregate all movements from different schedules
        fluvialSchedules.forEach(s => {
            if (s.atcFinish && s.loadedVolume) movements.push({ date: new Date(s.atcFinish), volume: brToNumber(s.loadedVolume), modal: 'fluvial' });
            s.discharges?.forEach(d => movements.push({ date: new Date(d.dateTime), volume: d.totalDischargedVolume, modal: 'fluvial' }));
        });
        ferroviarioSchedules.forEach(s => {
            if (s.status === 'CONCLUÍDO' && s.chegada_prevista && (s.volume_real || s.volume_previsto)) movements.push({ date: new Date(s.chegada_prevista), volume: brToNumber(s.volume_real || s.volume_previsto), modal: 'ferroviario' });
        });
        rodoviarioSchedules.forEach(s => {
            if (s.status === 'CONCLUÍDO' && s.liberacao_real && (s.volume_real || s.volume_previsto)) movements.push({ date: new Date(s.liberacao_real), volume: brToNumber(s.volume_real || s.volume_previsto), modal: 'rodoviario' });
        });
        dutoviarioSchedules.forEach(s => {
            if (s.status === 'CONCLUÍDO' && s.data_agendamento_desejada && s.volume_solicitado) movements.push({ date: new Date(s.data_agendamento_desejada), volume: brToNumber(s.volume_solicitado), modal: 'dutoviario' });
        });
        aereoSchedules.forEach(s => {
            if (s.status === 'CONCLUÍDO' && s.previsao_chegada && s.volume_carga_prevista) movements.push({ date: new Date(s.previsao_chegada), volume: brToNumber(s.volume_carga_prevista), modal: 'aereo' });
        });

        const now = new Date();
        const pastDate = new Date();
        pastDate.setMonth(now.getMonth() - timeRange);

        const monthlyData: ChartData = {};

        movements
            .filter(m => m.date >= pastDate && selectedModals.has(m.modal))
            .forEach(m => {
                const monthKey = `${m.date.getFullYear()}-${String(m.date.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { totalVolume: 0, byModal: {} };
                }
                monthlyData[monthKey].totalVolume += m.volume;
                monthlyData[monthKey].byModal[m.modal] = (monthlyData[monthKey].byModal[m.modal] || 0) + m.volume;
            });

        const sortedMonths = Object.keys(monthlyData).sort();
        const result: ChartData = {};
        for (const month of sortedMonths) {
            result[month] = monthlyData[month];
        }
        return result;

    }, [fluvialSchedules, ferroviarioSchedules, rodoviarioSchedules, dutoviarioSchedules, aereoSchedules, timeRange, selectedModals]);

    const maxVolume = useMemo(() => {
        // FIX: Explicitly cast the result of Object.values to a typed array to resolve type inference issue where the mapped item was 'unknown'.
        const dataValues = Object.values(chartData) as { totalVolume: number }[];
        const volumes = dataValues.map(d => d.totalVolume);
        return Math.max(0, ...volumes);
    }, [chartData]);
    
    const formatAxisValue = (value: number) => {
        const convertedValue = displayUnit === 'm³' ? value / 1000 : value;
        if (convertedValue >= 1e6) return `${(convertedValue / 1e6).toFixed(1)}M`;
        if (convertedValue >= 1e3) return `${(convertedValue / 1e3).toFixed(0)}k`;
        return convertedValue.toFixed(0);
    };

    const yAxisLabels = useMemo(() => {
        if (maxVolume === 0) return [0, 0, 0, 0];
        const top = Math.ceil(maxVolume / 100000) * 100000;
        return [top, top * 0.75, top * 0.5, top * 0.25];
    }, [maxVolume]);

    return (
        <Card>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h2 className="text-xl font-bold">Gráfico de Movimentação Mensal</h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center p-1 bg-secondary rounded-lg">
                        {[3, 6, 12].map(range => (
                            <Button key={range} variant={timeRange === range ? 'primary' : 'ghost'} size="sm" onClick={() => setTimeRange(range)}>
                                {range}M
                            </Button>
                        ))}
                    </div>
                     <div className="flex items-center p-1 bg-secondary rounded-lg">
                        <Button variant={displayUnit === 'L' ? 'primary' : 'ghost'} size="sm" onClick={() => setDisplayUnit('L')}>L</Button>
                        <Button variant={displayUnit === 'm³' ? 'primary' : 'ghost'} size="sm" onClick={() => setDisplayUnit('m³')}>m³</Button>
                    </div>
                </div>
            </div>
             <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
                {MODAL_OPTIONS.map(modal => (
                    <button key={modal.id} onClick={() => toggleModal(modal.id)} className="flex items-center gap-2 text-sm">
                        <div className={`w-4 h-4 rounded-sm flex items-center justify-center transition-all ${selectedModals.has(modal.id) ? modal.color : 'bg-secondary'}`}>
                           {selectedModals.has(modal.id) && <CheckCircleIcon className="h-4 w-4 text-white" />}
                        </div>
                        {modal.label}
                    </button>
                ))}
            </div>

            <div className="h-80 flex gap-4">
                <div className="h-full flex flex-col justify-between text-xs text-muted-foreground text-right">
                    {yAxisLabels.map(label => <div key={label}>{formatAxisValue(label)}</div>)}
                    <div>0</div>
                </div>
                <div className="flex-grow grid grid-cols-1 grid-rows-1 relative">
                    {/* Y-axis grid lines */}
                    <div className="row-start-1 col-start-1 h-full flex flex-col justify-between">
                        {yAxisLabels.map((_, i) => <div key={i} className="border-t border-dashed border-border/70 -translate-y-1/2"></div>)}
                        <div className="border-t border-border/70"></div>
                    </div>
                    {/* Bars */}
                    <div className="row-start-1 col-start-1 h-full flex justify-around items-end gap-2" onMouseLeave={() => setTooltip(null)}>
                        {Object.entries(chartData).map(([month, data]) => (
                            <div
                                key={month}
                                className="flex-1 h-full flex items-end justify-center group"
                                onMouseMove={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setTooltip({ x: e.clientX, y: rect.top, month, data: data as ChartData[string] });
                                }}
                            >
                                <div
                                    className="w-3/4 bg-primary/70 rounded-t-md hover:bg-primary transition-colors"
                                    style={{ height: `${(data.totalVolume / yAxisLabels[0]) * 100}%`}}
                                ></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
             <div className="flex gap-4 mt-2">
                <div className="w-10"></div> {/* Spacer for Y-axis labels */}
                <div className="flex-grow flex justify-around">
                    {Object.keys(chartData).map(month => (
                        <div key={month} className="text-xs text-muted-foreground text-center flex-1">
                            {new Date(month + '-15').toLocaleString('pt-BR', { month: 'short', year: '2-digit' })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Tooltip */}
            {tooltip && (
                <div className="fixed bg-card border shadow-lg rounded-lg p-3 text-xs z-10 pointer-events-none" style={{ left: tooltip.x + 15, top: tooltip.y - 15, transform: 'translateY(-100%)'}}>
                    <p className="font-bold mb-2">{new Date(tooltip.month + '-15').toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                    <p className="flex justify-between gap-4">
                        <span>Total:</span>
                        <span className="font-bold">{formatQuantity(tooltip.data.totalVolume, 'L', { ...appSettings.units, volume: displayUnit })}</span>
                    </p>
                    <div className="mt-2 pt-2 border-t">
                        {Object.entries(tooltip.data.byModal).map(([modalId, volume]) => (
                            <p key={modalId} className="flex justify-between items-center gap-4">
                                <span className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${MODAL_OPTIONS.find(m=>m.id === modalId)?.color}`}></span>
                                    {MODAL_OPTIONS.find(m=>m.id === modalId)?.label}:
                                </span>
                                <span>{formatQuantity(volume as number, 'L', { ...appSettings.units, volume: displayUnit })}</span>
                            </p>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
};
// --- END NEW COMPONENT ---

interface DashboardScreenProps {
    vessels: Vessel[];
    fluvialSchedules: VesselSchedule[];
    ferroviarioSchedules: FerroviarioSchedule[];
    rodoviarioSchedules: RodoviarioSchedule[];
    dutoviarioSchedules: DutoviarioSchedule[];
    aereoSchedules: AereoSchedule[];
    appSettings: AppSettings;
    costItems: CostItem[];
    orders: Order[];
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ 
    vessels, 
    fluvialSchedules, 
    ferroviarioSchedules, 
    rodoviarioSchedules, 
    dutoviarioSchedules, 
    aereoSchedules, 
    appSettings,
    costItems, 
    orders 
}) => {
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [cardToDelete, setCardToDelete] = useState<string | null>(null);

    const certificateStats = useMemo(() => {
        const stats = { 'VÁLIDO': 0, 'VENCE EM BREVE': 0, 'VENCIDO': 0, 'N/A': 0 };
        vessels.forEach(vessel => {
            const status = getCertificateStatus(vessel.expiryDate).text;
            stats[status]++;
        });
        return stats;
    }, [vessels]);

    const scheduleStats = useMemo(() => {
        const stats: Record<VesselScheduleLifecycleStatus, number> = {
            'PLANEJADO': 0,
            'AGUARDANDO CARREGAMENTO': 0,
            'EM CARREGAMENTO': 0,
            'EM TRÂNSITO': 0,
            'AGUARDANDO DESCARGA': 0,
            'EM DESCARGA': 0,
            'CONCLUÍDO': 0,
        };
        fluvialSchedules.forEach(item => {
            if (item.status in stats) {
                stats[item.status]++;
            }
        });
        return stats;
    }, [fluvialSchedules]);

    const volumeByModalPrevMonth = useMemo(() => {
        const now = new Date();
        const firstDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const volumes: { [modal: string]: number } = {
            fluvial: 0,
            ferroviario: 0,
            rodoviario: 0,
            dutoviario: 0,
            aereo: 0,
        };

        const isInPrevMonth = (dateStr: string | undefined): boolean => {
            if (!dateStr) return false;
            try {
                const date = new Date(dateStr);
                return date >= firstDayOfPreviousMonth && date <= lastDayOfPreviousMonth;
            } catch {
                return false;
            }
        };

        fluvialSchedules.forEach(s => {
            if (isInPrevMonth(s.atcFinish) && s.loadedVolume) {
                volumes.fluvial += brToNumber(s.loadedVolume);
            }
            s.discharges?.forEach(d => {
                if (isInPrevMonth(d.dateTime)) {
                    volumes.fluvial += d.totalDischargedVolume;
                }
            });
        });
        ferroviarioSchedules.forEach(s => {
            if (s.status === 'CONCLUÍDO' && isInPrevMonth(s.chegada_prevista)) {
                volumes.ferroviario += brToNumber(s.volume_real || s.volume_previsto || '0');
            }
        });
        rodoviarioSchedules.forEach(s => {
            if (s.status === 'CONCLUÍDO' && isInPrevMonth(s.liberacao_real)) {
                volumes.rodoviario += brToNumber(s.volume_real || s.volume_previsto || '0');
            }
        });
        dutoviarioSchedules.forEach(s => {
            if (s.status === 'CONCLUÍDO' && isInPrevMonth(s.data_agendamento_desejada)) {
                volumes.dutoviario += brToNumber(s.volume_solicitado || '0');
            }
        });
        aereoSchedules.forEach(s => {
            if (s.status === 'CONCLUÍDO' && isInPrevMonth(s.previsao_chegada)) {
                volumes.aereo += brToNumber(s.volume_carga_prevista || '0');
            }
        });

        return Object.entries(volumes)
            .map(([modal, volume]) => ({ modal, volume }))
            .filter(item => item.volume > 0);

    }, [fluvialSchedules, ferroviarioSchedules, rodoviarioSchedules, dutoviarioSchedules, aereoSchedules]);
    
    const operationsSummary = useMemo(() => {
        const activeFluvial = fluvialSchedules.filter(s => s.status !== 'CONCLUÍDO').length;
        const activeFerroviario = ferroviarioSchedules.filter(s => s.status !== 'CONCLUÍDO' && s.status !== 'CANCELADO').length;
        const activeRodoviario = rodoviarioSchedules.filter(s => s.status !== 'CONCLUÍDO' && s.status !== 'CANCELADO').length;
        const activeDutoviario = dutoviarioSchedules.filter(s => s.status !== 'CONCLUÍDO' && s.status !== 'CANCELADO').length;
        const activeAereo = aereoSchedules.filter(s => s.status !== 'CONCLUÍDO' && s.status !== 'CANCELADO').length;

        const byModal: Record<string, number> = {};
        if (activeFluvial > 0) byModal.fluvial = activeFluvial;
        if (activeFerroviario > 0) byModal.ferroviario = activeFerroviario;
        if (activeRodoviario > 0) byModal.rodoviario = activeRodoviario;
        if (activeDutoviario > 0) byModal.dutoviario = activeDutoviario;
        if (activeAereo > 0) byModal.aereo = activeAereo;
        
        return {
            totalActive: activeFluvial + activeFerroviario + activeRodoviario + activeDutoviario + activeAereo,
            byModal,
        };
    }, [fluvialSchedules, ferroviarioSchedules, rodoviarioSchedules, dutoviarioSchedules, aereoSchedules]);

    const costsSummary = useMemo(() => {
        return costItems.reduce((acc, item) => {
            acc.budgeted += item.budgetedAmount;
            acc.actual += item.actualAmount;
            return acc;
        }, { budgeted: 0, actual: 0 });
    }, [costItems]);

    const ordersSummary = useMemo(() => {
        return orders.reduce((acc, order) => {
            if (order.status === 'PENDENTE') acc.pending++;
            else if (order.status === 'EM_ANDAMENTO') acc.inProgress++;
            else if (order.status === 'CONCLUIDO') acc.completed++;
            return acc;
        }, { pending: 0, inProgress: 0, completed: 0 });
    }, [orders]);


    const cardComponents = useMemo(() => ({
        monthlySummary: {
            title: "Volume por Modal",
            value: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleString('pt-BR', { month: 'long' }).toLocaleUpperCase(),
            icon: <BarChart3Icon className="h-6 w-6 text-muted-foreground" />,
            description: "Total movimentado no mês anterior",
            children: (() => {
                const maxVolume = Math.max(0, ...volumeByModalPrevMonth.map(d => d.volume));
                if (maxVolume === 0) {
                    return <div className="flex items-center justify-center h-full"><p className="text-sm text-muted-foreground text-center">Nenhuma movimentação no mês anterior.</p></div>;
                }
                
                const displayUnit = appSettings.units.volume;

                const formatAxisValue = (value: number) => {
                    const convertedValue = displayUnit === 'm³' ? value / 1000 : value;
                    if (convertedValue >= 1e6) return `${(convertedValue / 1e6).toFixed(1)}M`;
                    if (convertedValue >= 1e3) return `${Math.round(convertedValue / 1e3)}k`;
                    return Math.round(convertedValue);
                };

                return (
                    <div className="flex h-full flex-col">
                        <div className="flex-grow flex items-end gap-3 justify-around pt-4">
                            {MODAL_OPTIONS
                                .filter(opt => volumeByModalPrevMonth.some(d => d.modal === opt.id))
                                .map(opt => {
                                const data = volumeByModalPrevMonth.find(d => d.modal === opt.id);
                                if (!data) return null;
                                const heightPercentage = maxVolume > 0 ? (data.volume / maxVolume) * 100 : 0;
                                const formattedValue = formatQuantity(data.volume, 'L', appSettings.units, 0);
                                return (
                                    <div key={opt.id} className="flex-1 flex flex-col items-center gap-1 group h-full" title={`${opt.label}: ${formattedValue}`}>
                                        <div className="flex-grow flex flex-col justify-end w-full items-center">
                                            <div className="text-xs font-mono text-muted-foreground group-hover:text-foreground">
                                                {formatAxisValue(data.volume)}
                                            </div>
                                            <div 
                                                className={`w-3/4 rounded-t-sm ${opt.color} group-hover:opacity-100 opacity-80 transition-all`} 
                                                style={{ height: `${heightPercentage}%` }} 
                                            />
                                        </div>
                                        <div className="text-xs font-semibold text-muted-foreground mt-1 flex-shrink-0">{opt.label}</div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-right text-xs text-muted-foreground mt-1">Volume em {displayUnit}</p>
                    </div>
                );
            })(),
        },
        certificates: {
            title: "Certificados de Arqueação",
            value: vessels.length,
            icon: <ShipIcon className="h-6 w-6 text-muted-foreground" />,
            description: "Total de embarcações cadastradas",
            children: (
                <ul className="space-y-1 text-sm">
                    <li className="flex justify-between items-center p-1 rounded">
                        <span className="flex items-center gap-2"><CheckCircleIcon className="h-4 w-4 text-green-500"/> Válidos</span> 
                        <span className="font-bold">{certificateStats['VÁLIDO']}</span>
                    </li>
                    <Link to="/registration-hub?certificate_status=expiring_soon" className="block rounded hover:bg-secondary transition-colors cursor-pointer">
                        <li className="flex justify-between items-center p-1">
                            <span className="flex items-center gap-2"><AlertTriangleIcon className="h-4 w-4 text-yellow-500"/> Vencem em breve</span> 
                            <span className="font-bold">{certificateStats['VENCE EM BREVE']}</span>
                        </li>
                    </Link>
                    <Link to="/registration-hub?certificate_status=expired" className="block rounded hover:bg-secondary transition-colors cursor-pointer">
                        <li className="flex justify-between items-center p-1">
                            <span className="flex items-center gap-2"><XIcon className="h-4 w-4 text-red-500"/> Vencidos</span> 
                            <span className="font-bold">{certificateStats.VENCIDO}</span>
                        </li>
                    </Link>
                </ul>
            ),
        },
        planning: {
            title: "Planejamento Fluvial",
            value: fluvialSchedules.length,
            icon: <CalendarDaysIcon className="h-6 w-6 text-muted-foreground" />,
            description: "Status do ciclo de vida das operações",
            children: (
                <ul className="space-y-2 text-sm">
                    <li className="flex justify-between items-center"><span>Planejado</span><span className="font-bold">{scheduleStats.PLANEJADO}</span></li>
                    <li className="flex justify-between items-center"><span>Aguard. Carregamento</span> <span className="font-bold">{scheduleStats['AGUARDANDO CARREGAMENTO']}</span></li>
                    <li className="flex justify-between items-center"><span>Em Carregamento</span> <span className="font-bold">{scheduleStats['EM CARREGAMENTO']}</span></li>
                    <li className="flex justify-between items-center"><span>Em Trânsito</span> <span className="font-bold">{scheduleStats['EM TRÂNSITO']}</span></li>
                    <li className="flex justify-between items-center"><span>Aguard. Descarga</span> <span className="font-bold">{scheduleStats['AGUARDANDO DESCARGA']}</span></li>
                    <li className="flex justify-between items-center"><span>Em Descarga</span> <span className="font-bold">{scheduleStats['EM DESCARGA']}</span></li>
                    <li className="flex justify-between items-center"><span>Concluído</span> <span className="font-bold">{scheduleStats.CONCLUÍDO}</span></li>
                </ul>
            ),
        },
        operationsOverview: {
            title: "Operações Ativas",
            value: operationsSummary.totalActive,
            icon: <GitForkIcon className="h-6 w-6 text-muted-foreground" />,
            description: "Total de programações em andamento",
            children: (
                <ul className="space-y-2 text-sm">
                    {Object.entries(operationsSummary.byModal).map(([modal, count]) => (
                        <li key={modal} className="flex justify-between items-center capitalize">
                            <span>{MODAL_OPTIONS.find(m => m.id === modal)?.label || modal}</span>
                            <span className="font-bold">{count}</span>
                        </li>
                    ))}
                </ul>
            ),
        },
        costsOverview: {
            title: "Resumo de Custos",
            value: `R$ ${numberToBr(costsSummary.actual)}`,
            icon: <DollarSignIcon className="h-6 w-6 text-muted-foreground" />,
            description: "Total de custos realizados",
            children: (
                <ul className="space-y-2 text-sm">
                    <li className="flex justify-between items-center">
                        <span>Orçado</span>
                        <span className="font-bold font-mono">R$ {numberToBr(costsSummary.budgeted)}</span>
                    </li>
                    <li className="flex justify-between items-center">
                        <span>Variação</span>
                        <span className={`font-bold font-mono ${costsSummary.actual > costsSummary.budgeted ? 'text-red-500' : 'text-green-500'}`}>
                            R$ {numberToBr(costsSummary.actual - costsSummary.budgeted)}
                        </span>
                    </li>
                </ul>
            )
        },
        ordersOverview: {
            title: "Pedidos de Venda",
            value: orders.length,
            icon: <BriefcaseIcon className="h-6 w-6 text-muted-foreground" />,
            description: "Total de pedidos registrados",
            children: (
                 <ul className="space-y-2 text-sm">
                    <li className="flex justify-between items-center"><span>Pendentes</span> <span className="font-bold">{ordersSummary.pending}</span></li>
                    <li className="flex justify-between items-center"><span>Em Andamento</span> <span className="font-bold">{ordersSummary.inProgress}</span></li>
                    <li className="flex justify-between items-center"><span>Concluídos</span> <span className="font-bold">{ordersSummary.completed}</span></li>
                </ul>
            )
        }
    }), [vessels.length, fluvialSchedules.length, certificateStats, scheduleStats, volumeByModalPrevMonth, appSettings, operationsSummary, costsSummary, ordersSummary, orders.length]);

    const initialCardOrder = useMemo(() => Object.keys(cardComponents), [cardComponents]);
    const [cardOrder, setCardOrder] = useLocalStorage('qc_dashboard_card_order', initialCardOrder);
    
    // Drag and Drop state
    const dragItem = useRef<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [isGrabbing, setIsGrabbing] = useState(false);


    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragItem.current = index;
        setIsGrabbing(true);
        // This is to make the ghost image of the dragging item less opaque.
        if (e.target instanceof HTMLElement) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setDragImage(e.target, e.target.offsetWidth / 2, 40);
        }
    };

    const handleDragEnter = (index: number) => {
        setDragOverIndex(index);
    };
    
    const handleDragEnd = () => {
        dragItem.current = null;
        setDragOverIndex(null);
        setIsGrabbing(false);
    };

    const handleDrop = () => {
        if (dragOverIndex === null || dragItem.current === null || dragOverIndex === dragItem.current) {
            handleDragEnd();
            return;
        };

        const newCardOrder = [...cardOrder];
        const draggedItemContent = newCardOrder.splice(dragItem.current, 1)[0];
        newCardOrder.splice(dragOverIndex, 0, draggedItemContent);
        
        setCardOrder(newCardOrder);
        handleDragEnd();
    };

    const handleConfirmDelete = () => {
        if (cardToDelete) {
            setCardOrder(prev => prev.filter(key => key !== cardToDelete));
        }
        setCardToDelete(null);
    };

    // Ensure card order is initialized correctly if new cards are added/removed in code
    useEffect(() => {
        const currentKeys = new Set(cardOrder);
        const allKeys = new Set(Object.keys(cardComponents));
        if (currentKeys.size !== allKeys.size || !cardOrder.every(key => allKeys.has(key))) {
            const newOrder = Object.keys(cardComponents).filter(key => currentKeys.has(key));
            const missingKeys = Object.keys(cardComponents).filter(key => !currentKeys.has(key));
            setCardOrder([...newOrder, ...missingKeys]);
        }
    }, [cardComponents, cardOrder, setCardOrder]);

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Central de Dashboard</h1>
                    <p className="text-muted-foreground">Seu ponto central para visualização de dados e métricas operacionais.</p>
                </div>
                 <Button onClick={() => setIsEditModalOpen(true)} variant="secondary" icon={<PenSquareIcon className="h-4 w-4" />}>
                    Customizar Dashboard
                </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {cardOrder.map((cardKey, index) => {
                    const cardData = cardComponents[cardKey as keyof typeof cardComponents];
                    if (!cardData) return null;

                    return (
                        <div
                            key={cardKey}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            className={`relative group transition-opacity duration-300 ${isGrabbing && dragItem.current === index ? 'opacity-40' : 'opacity-100'}`}
                        >
                             <button 
                                onClick={() => setCardToDelete(cardKey)}
                                className="absolute top-2 right-2 z-10 p-1 rounded-full bg-card/50 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remover Card"
                                aria-label={`Remover card ${cardData.title}`}
                            >
                                <XIcon className="h-4 w-4" />
                            </button>
                            <KpiCard
                                title={cardData.title}
                                value={cardData.value}
                                icon={cardData.icon}
                                description={cardData.description}
                                isGrabbing={isGrabbing && dragItem.current === index}
                            >
                                {cardData.children}
                            </KpiCard>
                             {dragOverIndex === index && dragItem.current !== index && (
                                <div className="mt-6 border-2 border-dashed border-primary rounded-xl h-full absolute inset-0 -top-1" />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-8">
                <MovementChart
                    fluvialSchedules={fluvialSchedules}
                    ferroviarioSchedules={ferroviarioSchedules}
                    rodoviarioSchedules={rodoviarioSchedules}
                    dutoviarioSchedules={dutoviarioSchedules}
                    aereoSchedules={aereoSchedules}
                    appSettings={appSettings}
                />
            </div>

             <DashboardEditModal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)}
                allPossibleCards={cardComponents}
                activeCards={cardOrder}
                onUpdateCards={setCardOrder}
            />
            <ConfirmationModal
                isOpen={!!cardToDelete}
                onClose={() => setCardToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Remoção"
                confirmText="Sim, Remover"
            >
                <p>Tem certeza que deseja remover este card do seu dashboard?</p>
                <p className="text-xs text-muted-foreground mt-2">Você poderá adicioná-lo novamente a qualquer momento em "Customizar Dashboard".</p>
            </ConfirmationModal>

        </main>
    );
};

interface DashboardEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    allPossibleCards: { [key: string]: Omit<KpiCardProps, 'isGrabbing'> };
    activeCards: string[];
    onUpdateCards: React.Dispatch<React.SetStateAction<string[]>>;
}

const DashboardEditModal: React.FC<DashboardEditModalProps> = ({ isOpen, onClose, allPossibleCards, activeCards, onUpdateCards }) => {
    const [currentActiveCards, setCurrentActiveCards] = useState(activeCards);

    useEffect(() => {
        if (isOpen) {
            setCurrentActiveCards(activeCards);
        }
    }, [isOpen, activeCards]);

    const handleAdd = (keyToAdd: string) => {
        if (!currentActiveCards.includes(keyToAdd)) {
            setCurrentActiveCards(prev => [...prev, keyToAdd]);
        }
    };

    const handleRemove = (keyToRemove: string) => {
        setCurrentActiveCards(prev => prev.filter(key => key !== keyToRemove));
    };

    const handleSave = () => {
        onUpdateCards(currentActiveCards);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in" style={{ animationDuration: '200ms' }} onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Customize seu Dashboard</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                </header>
                <main className="p-6 flex-grow overflow-y-auto">
                    <p className="text-muted-foreground text-sm mb-6">Selecione os cards que você deseja exibir no seu dashboard principal. Você poderá reordená-los arrastando e soltando diretamente na tela do dashboard.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(allPossibleCards).map(([key, card]) => {
                            const isVisible = currentActiveCards.includes(key);
                            return (
                                <Card key={key} padding="md" className={`flex flex-col justify-between transition-all ${isVisible ? 'border-primary/50' : 'opacity-70'}`}>
                                    <div>
                                        <h3 className="font-bold">{(card as Omit<KpiCardProps, 'isGrabbing'>).title}</h3>
                                        <p className="text-xs text-muted-foreground mt-1">{(card as Omit<KpiCardProps, 'isGrabbing'>).description}</p>
                                    </div>
                                    <div className="mt-4">
                                        {isVisible ? (
                                            <Button variant="destructive" size="sm" className="w-full" onClick={() => handleRemove(key)}>Remover</Button>
                                        ) : (
                                            <Button variant="secondary" size="sm" className="w-full" onClick={() => handleAdd(key)}>Adicionar ao Dashboard</Button>
                                        )}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </main>
                <footer className="p-4 bg-secondary/50 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar Alterações</Button>
                </footer>
            </div>
        </div>
    );
};