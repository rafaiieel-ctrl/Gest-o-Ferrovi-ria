import React, { useMemo, useState } from 'react';
import { UnifiedSchedule, ScheduleStatus, VesselScheduleLifecycleStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PlusCircleIcon, ShipIcon, TruckIcon, TrainIcon, PipelineIcon, PlaneIcon, ListIcon, LayoutGridIcon, ChevronUpIcon, ChevronDownIcon, XIcon, PenSquareIcon } from '../components/ui/icons';

interface OperationsHubScreenProps {
    unifiedSchedules: UnifiedSchedule[];
    onNewOperation: () => void;
}

const modalIcons: Record<UnifiedSchedule['modal'], React.ReactNode> = {
    fluvial: <ShipIcon className="h-5 w-5 text-blue-500" />,
    rodoviario: <TruckIcon className="h-5 w-5 text-green-500" />,
    ferroviario: <TrainIcon className="h-5 w-5 text-red-500" />,
    dutoviario: <PipelineIcon className="h-5 w-5 text-gray-500" />,
    aereo: <PlaneIcon className="h-5 w-5 text-purple-500" />,
    manual: <PenSquareIcon className="h-5 w-5 text-yellow-500" />
};

const statusConfig: Record<string, { text: string, style: string }> = {
    'PLANEJADO': { text: 'Planejado', style: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-400' },
    'AGUARDANDO CARREGAMENTO': { text: 'Aguard. Carreg.', style: 'bg-orange-100 text-orange-800 dark:bg-orange-400/10 dark:text-orange-400' },
    'EM CARREGAMENTO': { text: 'Carregando', style: 'bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-400' },
    'EM TRÂNSITO': { text: 'Em Trânsito', style: 'bg-purple-100 text-purple-800 dark:bg-purple-400/10 dark:text-purple-400' },
    'AGUARDANDO DESCARGA': { text: 'Aguard. Descarga', style: 'bg-teal-100 text-teal-800 dark:bg-teal-400/10 dark:text-teal-400' },
    'EM DESCARGA': { text: 'Descarregando', style: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-400' },
    'CONCLUÍDO': { text: 'Concluído', style: 'bg-green-100 text-green-800 dark:bg-green-400/10 dark:text-green-400' },
    'ATRASADO': { text: 'Atrasado', style: 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-400' },
    'CANCELADO': { text: 'Cancelado', style: 'bg-gray-200 text-gray-800 dark:bg-gray-400/10 dark:text-gray-400' },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config = statusConfig[status] || { text: status, style: 'bg-gray-100 text-gray-800 dark:bg-gray-400/10 dark:text-gray-400' };
    return (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full inline-block ${config.style}`}>
            {config.text}
        </span>
    );
};

const OperationActions: React.FC<{ item: UnifiedSchedule, isListItem?: boolean }> = ({ item, isListItem = false }) => {
    const isViewable = (item.status === 'EM CARREGAMENTO' || item.status === 'EM DESCARGA') && item.onView;
    const showLoadButton = (item.status === 'PLANEJADO' || item.status === 'AGUARDANDO CARREGAMENTO') && item.onStartLoading;

    const buttonSize = isListItem ? "sm" : "sm";

    return (
        <div className="flex items-center gap-1">
            {isViewable && (
                <Button variant="secondary" size={buttonSize} onClick={(e) => { e.stopPropagation(); item.onView!(item.originalId); }}>
                    Ver
                </Button>
            )}
            {showLoadButton && (
                <Button 
                    variant={item.status === 'AGUARDANDO CARREGAMENTO' ? 'primary' : 'secondary'} 
                    size={buttonSize} 
                    onClick={(e) => { e.stopPropagation(); item.onStartLoading!(item.originalId); }}
                >
                    Carregar
                </Button>
            )}
            {item.status === 'EM TRÂNSITO' && item.onRegisterArrival && (
                <Button variant="secondary" size={buttonSize} onClick={(e) => { e.stopPropagation(); item.onRegisterArrival!(item.originalId); }}>
                    Chegou
                </Button>
            )}
            {item.status === 'AGUARDANDO DESCARGA' && item.onStartDischarge && (
                 <Button variant="primary" size={buttonSize} onClick={(e) => { e.stopPropagation(); item.onStartDischarge!(item.originalId); }}>
                    Descarregar
                </Button>
            )}
        </div>
    );
};

const OperationCard: React.FC<{ item: UnifiedSchedule }> = ({ item }) => {
    // A card is clickable if it has a detail view (onView) and it's a train, 
    // or if it's another modal in an "active" state.
    const isClickable = item.onView && (
        item.modal === 'ferroviario' || 
        item.status === 'EM CARREGAMENTO' || 
        item.status === 'EM DESCARGA'
    );

    const handleCardClick = () => {
        if (isClickable && item.onView) {
            item.onView(item.originalId);
        }
    };
    
    return (
        <div 
            className={`p-3 bg-secondary/50 rounded-lg border border-transparent shadow-sm hover:border-primary/50 hover:bg-secondary transition-all duration-200 ${isClickable ? 'cursor-pointer' : ''}`}
            onClick={handleCardClick}
        >
            <div className="flex justify-between items-start gap-2">
                <div className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0">{modalIcons[item.modal]}</div>
                    <div>
                        <h4 className="font-bold text-foreground text-sm">{item.title}</h4>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                </div>
                 <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <StatusBadge status={item.status} />
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50 flex justify-end">
                <OperationActions item={item} />
            </div>
        </div>
    );
};

const statusOrder: Record<string, number> = {
    'PLANEJADO': 1,
    'AGUARDANDO CARREGAMENTO': 2,
    'EM CARREGAMENTO': 3,
    'EM TRÂNSITO': 4,
    'AGUARDANDO DESCARGA': 5,
    'EM DESCARGA': 6,
    'CONCLUÍDO': 7,
    'ATRASADO': 8,
    'CANCELADO': 9,
};

export const OperationsHubScreen: React.FC<OperationsHubScreenProps> = ({ unifiedSchedules, onNewOperation }) => {
    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
    const [areFiltersVisible, setAreFiltersVisible] = useState(false);
    const [statusFilter, setStatusFilter] = useState<(ScheduleStatus | VesselScheduleLifecycleStatus)[] | null>(null);
    const [filteredStatusTitle, setFilteredStatusTitle] = useState<string | null>(null);
    
    const ferroviarioSchedules = useMemo(() => {
        return unifiedSchedules.filter(s => s.modal === 'ferroviario');
    }, [unifiedSchedules]);

    const categorizedSchedules = useMemo(() => {
        const columns: { [key: string]: UnifiedSchedule[] } = {
            programadas: [], aguardandoCarregamento: [], emCarregamento: [], emTransito: [], finalizadas: [], canceladas: []
        };
        ferroviarioSchedules.forEach(s => {
            switch (s.status) {
                case 'PLANEJADO': columns.programadas.push(s); break;
                case 'AGUARDANDO CARREGAMENTO': columns.aguardandoCarregamento.push(s); break;
                case 'EM CARREGAMENTO': columns.emCarregamento.push(s); break;
                case 'EM TRÂNSITO': case 'ATRASADO': columns.emTransito.push(s); break;
                case 'CONCLUÍDO': columns.finalizadas.push(s); break;
                case 'CANCELADO': columns.canceladas.push(s); break;
            }
        });
        return columns;
    }, [ferroviarioSchedules]);

    const sortedSchedules = useMemo(() => {
        let schedules = [...ferroviarioSchedules];
        if (statusFilter) {
            schedules = schedules.filter(s => statusFilter.includes(s.status));
        }
        return schedules.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));
    }, [ferroviarioSchedules, statusFilter]);

    const handleHeaderClick = (title: string, statuses: (ScheduleStatus | VesselScheduleLifecycleStatus)[]) => {
        setStatusFilter(statuses);
        setFilteredStatusTitle(title);
        setViewMode('list');
    };

    const clearStatusFilter = () => {
        setStatusFilter(null);
        setFilteredStatusTitle(null);
    };

    const OperationsColumn: React.FC<{ title: string; items: UnifiedSchedule[]; onHeaderClick?: () => void; }> = ({ title, items, onHeaderClick }) => (
        <div className="bg-card rounded-xl border border-border p-3 flex-1 min-w-[300px] h-full flex flex-col">
            <h3 
                className={`font-semibold mb-4 px-2 ${onHeaderClick ? 'cursor-pointer hover:text-primary hover:underline' : ''}`}
                onClick={onHeaderClick}
                title={onHeaderClick ? `Ver detalhes de '${title}'` : ''}
            >
                {title} ({items.length})
            </h3>
            <div className="space-y-3 flex-grow overflow-y-auto pr-1">
                {items.length > 0 ? (
                    items.map(item => <OperationCard key={item.uid} item={item} />)
                ) : (
                    <div className="text-center text-sm text-muted-foreground pt-8">
                        <p>Nenhuma operação neste status.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderBoardView = () => (
        <div className="flex-grow flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
            <OperationsColumn title="Programadas" items={categorizedSchedules.programadas} onHeaderClick={() => handleHeaderClick('Programadas', ['PLANEJADO'])} />
            <OperationsColumn title="Aguardando Carregamento" items={categorizedSchedules.aguardandoCarregamento} onHeaderClick={() => handleHeaderClick('Aguardando Carregamento', ['AGUARDANDO CARREGAMENTO'])} />
            <OperationsColumn title="Em Carregamento" items={categorizedSchedules.emCarregamento} onHeaderClick={() => handleHeaderClick('Em Carregamento', ['EM CARREGAMENTO'])} />
            <OperationsColumn title="Em Trânsito" items={categorizedSchedules.emTransito} onHeaderClick={() => handleHeaderClick('Em Trânsito', ['EM TRÂNSITO', 'ATRASADO'])} />
            <OperationsColumn title="Finalizadas" items={categorizedSchedules.finalizadas} onHeaderClick={() => handleHeaderClick('Finalizadas', ['CONCLUÍDO'])} />
        </div>
    );

    const renderListView = () => (
        <div className="flex-grow overflow-y-auto">
            {statusFilter && (
                <div className="flex items-center gap-4 mb-4 bg-secondary p-3 rounded-lg">
                    <h2 className="text-lg font-semibold flex-grow">Exibindo: {filteredStatusTitle} ({sortedSchedules.length})</h2>
                    <Button variant="ghost" onClick={clearStatusFilter}>
                        <XIcon className="h-4 w-4 mr-2" />
                        Limpar Filtro e Ver Tudo
                    </Button>
                </div>
            )}
            <Card className="!p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-secondary/50">
                            <tr>
                                {['Operação', 'Rota', 'Status', 'Ações'].map(h => 
                                    <th key={h} className="p-3 text-left font-semibold">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedSchedules.map(item => (
                                <tr key={item.uid} className="border-b last:border-0 hover:bg-secondary/30">
                                    <td className="p-3 align-top">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 flex-shrink-0">{modalIcons[item.modal]}</div>
                                            <div><p className="font-bold text-foreground">{item.title}</p></div>
                                        </div>
                                    </td>
                                    <td className="p-3 text-muted-foreground align-top">{item.description}</td>
                                    <td className="p-3 align-top"><StatusBadge status={item.status} /></td>
                                    <td className="p-3 text-center align-top"><OperationActions item={item} isListItem /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );

    return (
        <main className="max-w-full h-screen flex flex-col p-4 md:p-6 bg-background text-foreground">
            <div className="flex-shrink-0 flex flex-wrap gap-4 justify-between items-center mb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Central de Operações Ferroviárias</h1>
                    <p className="text-muted-foreground">Acompanhe o status das composições em um só lugar.</p>
                </div>
                <div className="flex items-center gap-2">
                     <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg">
                        <Button variant={viewMode === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="!p-2" title="Visão em Lista"><ListIcon className="h-5 w-5"/></Button>
                        <Button variant={viewMode === 'board' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('board')} className="!p-2" title="Visão em Quadro"><LayoutGridIcon className="h-5 w-5"/></Button>
                    </div>
                    <Button onClick={onNewOperation} className="!h-auto !px-3 !py-1.5">
                        <div className="flex items-center gap-2">
                            <PlusCircleIcon className="h-5 w-5" />
                            <div className="text-left text-xs leading-tight">
                                <p>Nova Operação</p><p>Manual</p>
                            </div>
                        </div>
                    </Button>
                </div>
            </div>

            <div className="flex-shrink-0 mb-6">
                 <Card>
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setAreFiltersVisible(!areFiltersVisible)}>
                        <h2 className="text-lg font-semibold">Filtros</h2>
                        <Button variant="ghost" className="flex items-center gap-2 text-sm">
                            <span>{areFiltersVisible ? 'Ocultar Filtros' : 'Mostrar Filtros'}</span>
                            {areFiltersVisible ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                        </Button>
                    </div>
                 </Card>
            </div>

            {ferroviarioSchedules.length === 0 ? (
                 <Card className="text-center py-16 flex-grow flex flex-col items-center justify-center">
                    <TrainIcon className="mx-auto h-16 w-16 text-muted-foreground/50" />
                    <h3 className="mt-4 text-xl font-medium">Nenhuma Operação Ferroviária Encontrada</h3>
                     <p className="text-muted-foreground mt-2">Vá para a tela de Planejamento para adicionar novas operações ferroviárias.</p>
                </Card>
            ) : (
                viewMode === 'board' ? renderBoardView() : renderListView()
            )}
        </main>
    );
};