

import React, { useState, useMemo } from 'react';
import { VesselSchedule, FerroviarioSchedule, RodoviarioSchedule, DutoviarioSchedule, AereoSchedule, ProductType, ScheduleStatus, VesselScheduleLifecycleStatus } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { exportReportToCsv, numberToBr, brToNumber } from '../utils/helpers';
import { FileTextIcon, ChevronUpIcon, ChevronDownIcon } from '../components/ui/icons';

interface ReportsScreenProps {
    fluvialSchedules: VesselSchedule[];
    ferroviarioSchedules: FerroviarioSchedule[];
    rodoviarioSchedules: RodoviarioSchedule[];
    dutoviarioSchedules: DutoviarioSchedule[];
    aereoSchedules: AereoSchedule[];
}

interface ReportRow {
    [key: string]: any; // Allow any string key
    uid: string;
    modal: string;
    identificador: string;
    rota: string;
    cliente: string;
    produto: string;
    status: string;
    data_prevista: string;
    volume_previsto: string;
    volume_real: string;
    diferenca: string;
}

const initialFilters = {
    dateStart: '',
    dateEnd: '',
    modals: new Set<string>(),
    statuses: new Set<ScheduleStatus | VesselScheduleLifecycleStatus>(),
    products: new Set<ProductType>(),
    client: '',
    order: '',
    origin: '',
    destination: '',
};

const MODAL_OPTIONS = [
    { id: 'fluvial', label: 'Fluvial/Marítimo' },
    { id: 'ferroviario', label: 'Ferroviário' },
    { id: 'rodoviario', label: 'Rodoviário' },
    { id: 'dutoviario', label: 'Dutoviário' },
    { id: 'aereo', label: 'Aéreo' },
];

// FIX: Added 'AGUARDANDO CARREGAMENTO' to include it in filtering options.
const STATUS_OPTIONS: (ScheduleStatus | VesselScheduleLifecycleStatus)[] = [
    'PLANEJADO', 'AGUARDANDO CARREGAMENTO', 'EM CARREGAMENTO', 'EM TRÂNSITO', 'AGUARDANDO DESCARGA', 'EM DESCARGA', 'CONCLUÍDO', 'ATRASADO', 'CANCELADO'
];
const STATUS_FILTER_OPTIONS = STATUS_OPTIONS.map(s => ({ id: s, label: s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }));

const PRODUCT_OPTIONS: ProductType[] = ['anidro', 'hidratado', 'granel'];
const PRODUCT_FILTER_OPTIONS = PRODUCT_OPTIONS.map(p => ({ id: p, label: p.charAt(0).toUpperCase() + p.slice(1) }));


const ReportHeader = [
    { key: 'modal', label: 'Modal' },
    { key: 'identificador', label: 'Identificador' },
    { key: 'rota', label: 'Rota' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'produto', label: 'Produto' },
    { key: 'status', label: 'Status' },
    { key: 'data_prevista', label: 'Data Prevista' },
    { key: 'volume_previsto', label: 'Vol. Previsto' },
    { key: 'volume_real', label: 'Vol. Real' },
    { key: 'diferenca', label: 'Diferença' },
];

const KpiCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <Card padding="md">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold mt-1 font-mono">{value}</p>
    </Card>
);

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
    fluvialSchedules,
    ferroviarioSchedules,
    rodoviarioSchedules,
    dutoviarioSchedules,
    aereoSchedules
}) => {
    const [filters, setFilters] = useState(initialFilters);
    const [reportData, setReportData] = useState<ReportRow[]>([]);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: keyof ReportRow; direction: 'ascending' | 'descending' } | null>(null);
    const [areFiltersVisible, setAreFiltersVisible] = useState(false);

    const handleFilterChange = (type: 'modals' | 'statuses' | 'products', value: string) => {
        setFilters(prev => {
            // FIX: The Set methods have a parameter type of `never` due to the union of Set types.
            // Casting the set to `any` for the method call is a workaround.
            const newSet = new Set(prev[type]);
            if ((newSet as any).has(value)) {
                (newSet as any).delete(value);
            } else {
                (newSet as any).add(value);
            }
            return { ...prev, [type]: newSet };
        });
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({...prev, [name]: value}));
    }
    
    const requestSort = (key: keyof ReportRow) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleGenerateReport = () => {
        const allData = [
            // FIX: VesselSchedule has `rateios` which contains client and order information.
            ...fluvialSchedules.map(s => ({ ...s, modal: 'fluvial', product: s.product, normalizedClient: s.rateios.map(r => r.cliente).join(', '), normalizedOrders: s.rateios.map(r => r.pedido), normalizedOrigin: s.port, normalizedDestination: s.rateios.map(r => r.localDescarga).join(', ') })),
            ...ferroviarioSchedules.map(s => ({ ...s, modal: 'ferroviario', product: s.produto, normalizedClient: s.rateios.map(r => r.cliente).join(', '), normalizedOrders: s.rateios.map(r => r.pedido), normalizedOrigin: s.origem, normalizedDestination: s.destino })),
            ...rodoviarioSchedules.map(s => ({ ...s, modal: 'rodoviario', product: s.produto, normalizedClient: '', normalizedOrders: [], normalizedOrigin: s.origem, normalizedDestination: s.destino })),
            ...dutoviarioSchedules.map(s => ({ ...s, modal: 'dutoviario', product: undefined, normalizedClient: s.cliente_final, normalizedOrders: [s.pedido_remessa_armazenagem, s.pedido_venda_cliente].filter(Boolean) as string[], normalizedOrigin: s.usina_origem, normalizedDestination: s.base_destino })),
            ...aereoSchedules.map(s => ({ ...s, modal: 'aereo', product: undefined, normalizedClient: '', normalizedOrders: [], normalizedOrigin: s.aeroporto_origem, normalizedDestination: s.aeroporto_destino })),
        ];

        const filtered = allData.filter(item => {
            // FIX: Cast item to any to access properties from different schedule types in the union.
            const anyItem = item as any;
            const itemDateStr = anyItem.eta || anyItem.janela_carregamento_prevista || anyItem.data_agendamento_desejada || anyItem.previsao_embarque || '';
            if (itemDateStr) {
                const itemDate = new Date(itemDateStr).getTime();
                if (filters.dateStart && new Date(filters.dateStart + 'T00:00:00').getTime() > itemDate) return false;
                if (filters.dateEnd && new Date(filters.dateEnd + 'T23:59:59').getTime() < itemDate) return false;
            } else if (filters.dateStart || filters.dateEnd) { return false; }
            if (filters.modals.size > 0 && !filters.modals.has(item.modal)) return false;
            if (filters.statuses.size > 0 && !filters.statuses.has(item.status)) return false;
            // FIX: Cast `item.product` to ensure type compatibility with the Set.
            if (filters.products.size > 0 && (!item.product || !filters.products.has(item.product as ProductType))) return false;
            if (filters.client && !item.normalizedClient.toLowerCase().includes(filters.client.toLowerCase())) return false;
            if (filters.origin && !item.normalizedOrigin.toLowerCase().includes(filters.origin.toLowerCase())) return false;
            if (filters.destination && !item.normalizedDestination.toLowerCase().includes(filters.destination.toLowerCase())) return false;
            if (filters.order && !item.normalizedOrders.some(o => o.toLowerCase().includes(filters.order.toLowerCase()))) return false;
            return true;
        });

        const mappedData: ReportRow[] = filtered.map(item => {
            // FIX: Cast item to any to access properties from different schedule types in the union.
            const anyItem = item as any;
            const volPrev = brToNumber(anyItem.plannedVolume || anyItem.volume_previsto || anyItem.volume_solicitado || '0');
            const volReal = brToNumber(anyItem.loadedVolume || anyItem.volume_real || '0');
            const diff = (isFinite(volReal) && volReal > 0) ? volReal - volPrev : NaN;
            return {
                uid: `${item.modal}-${item.id}`,
                modal: item.modal.charAt(0).toUpperCase() + item.modal.slice(1),
                identificador: anyItem.vesselName || anyItem.composicao || anyItem.placa || `Voo ${anyItem.voo}` || `Duto ${anyItem.id}`,
                // FIX: Use normalized origin and destination for consistent route display.
                rota: `${item.normalizedOrigin || 'N/A'} → ${item.normalizedDestination || 'N/A'}`,
                cliente: item.normalizedClient || 'N/A',
                produto: item.product || 'N/A',
                status: item.status,
                data_prevista: (anyItem.eta || anyItem.janela_carregamento_prevista || anyItem.data_agendamento_desejada || anyItem.previsao_embarque || '').substring(0, 16).replace('T', ' '),
                volume_previsto: numberToBr(volPrev, 0),
                volume_real: (isFinite(volReal) && volReal > 0) ? numberToBr(volReal, 0) : '—',
                diferenca: isFinite(diff) ? numberToBr(diff, 0) : '—',
            };
        });

        setReportData(mappedData);
        setHasGenerated(true);
        setSortConfig(null);
    };

    const sortedReportData = useMemo(() => {
        let sortableItems = [...reportData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                const aNum = brToNumber(String(aValue).replace('R$', '').trim());
                const bNum = brToNumber(String(bValue).replace('R$', '').trim());
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    if (aNum < bNum) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (aNum > bNum) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                }
                if (String(aValue).toLowerCase() < String(bValue).toLowerCase()) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (String(aValue).toLowerCase() > String(bValue).toLowerCase()) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [reportData, sortConfig]);
    
    const kpis = useMemo(() => {
        const totalOperations = reportData.length;
        const totalVolumePrevisto = reportData.reduce((sum, item) => sum + brToNumber(item.volume_previsto), 0);
        const totalVolumeReal = reportData.reduce((sum, item) => sum + (brToNumber(item.volume_real) || 0), 0);
        return { totalOperations, totalVolumePrevisto, totalVolumeReal };
    }, [reportData]);

    const handleClearFilters = () => { setFilters(initialFilters); setReportData([]); setHasGenerated(false); };
    const handleExport = () => {
        if (sortedReportData.length > 0) {
            exportReportToCsv(ReportHeader.map(h => h.key), sortedReportData, `relatorio_operacional_${new Date().toISOString().slice(0,10)}`);
        }
    };
    
    const FilterCheckboxGroup: React.FC<{title: string; options: readonly {id: string; label: string}[]; filterKey: 'modals' | 'statuses' | 'products'}> = ({ title, options, filterKey }) => (
        <div>
            <h4 className="font-semibold text-sm mb-2">{title}</h4>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
                {options.map(opt => (
                     <label key={opt.id} className="flex items-center gap-2 text-sm">
                        {/* FIX: The Set.has method has a parameter type of `never` due to the union of Set types.
                        Casting the set to `any` for the method call is a workaround. */}
                        <input type="checkbox" checked={(filters[filterKey] as any).has(opt.id)} onChange={() => handleFilterChange(filterKey, opt.id)} className="h-4 w-4 rounded border-input text-primary focus:ring-ring"/>
                        {opt.label}
                    </label>
                ))}
            </div>
        </div>
    );

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Central de Relatórios</h1>
                <p className="text-muted-foreground">Filtre e exporte dados de todas as operações multimodais.</p>
            </div>
            
            <Card className="mb-8">
                <div 
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setAreFiltersVisible(!areFiltersVisible)}
                >
                    <h2 className="text-lg font-semibold">Filtros do Relatório</h2>
                    <Button variant="ghost" className="flex items-center gap-2">
                        <span>{areFiltersVisible ? 'Ocultar Filtros' : 'Mostrar Filtros'}</span>
                        {areFiltersVisible 
                            ? <ChevronUpIcon className="h-5 w-5" /> 
                            : <ChevronDownIcon className="h-5 w-5" />
                        }
                    </Button>
                </div>

                {areFiltersVisible && (
                    <div className="animate-fade-in pt-6 border-t mt-4" style={{animationDuration: '300ms'}}>
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FilterCheckboxGroup title="Modal" options={MODAL_OPTIONS} filterKey="modals"/>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Data Início" name="dateStart" type="date" value={filters.dateStart} onChange={handleInputChange} />
                                    <Input label="Data Fim" name="dateEnd" type="date" value={filters.dateEnd} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FilterCheckboxGroup title="Status" options={STATUS_FILTER_OPTIONS} filterKey="statuses"/>
                                <FilterCheckboxGroup title="Produto" options={PRODUCT_FILTER_OPTIONS} filterKey="products"/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Input label="Cliente" name="client" value={filters.client} onChange={handleInputChange} placeholder="Filtrar por cliente..."/>
                                <Input label="Pedido" name="order" value={filters.order} onChange={handleInputChange} placeholder="Filtrar por pedido..."/>
                                <Input label="Origem" name="origin" value={filters.origin} onChange={handleInputChange} placeholder="Filtrar por origem..."/>
                                <Input label="Destino" name="destination" value={filters.destination} onChange={handleInputChange} placeholder="Filtrar por destino..."/>
                            </div>
                        </div>
                    </div>
                )}
                 <div className="mt-6 pt-6 border-t flex flex-wrap gap-4 justify-end">
                    <Button variant="secondary" onClick={handleClearFilters}>Limpar Filtros</Button>
                    <Button onClick={handleGenerateReport}>Gerar Relatório</Button>
                    <Button variant="primary" onClick={handleExport} disabled={reportData.length === 0}>Exportar CSV</Button>
                </div>
            </Card>

            {hasGenerated && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in">
                    <KpiCard title="Operações Encontradas" value={numberToBr(kpis.totalOperations, 0)} />
                    <KpiCard title="Volume Total Previsto" value={`${numberToBr(kpis.totalVolumePrevisto, 0)} L`} />
                    <KpiCard title="Volume Total Realizado" value={`${numberToBr(kpis.totalVolumeReal, 0)} L`} />
                </div>
            )}

            <Card className="!p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-secondary/50">
                            <tr>
                                {ReportHeader.map(h => (
                                    <th key={h.key} className="p-3 text-left font-semibold">
                                        <div onClick={() => requestSort(h.key as keyof ReportRow)} className="flex items-center gap-1 cursor-pointer">
                                            {h.label}
                                            {sortConfig?.key === h.key && (
                                                sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {!hasGenerated ? (
                                <tr><td colSpan={ReportHeader.length} className="text-center p-16 text-muted-foreground">
                                    <FileTextIcon className="mx-auto h-12 w-12 mb-4" />
                                    Selecione os filtros acima e clique em "Gerar Relatório".
                                </td></tr>
                            ) : sortedReportData.length === 0 ? (
                                <tr><td colSpan={ReportHeader.length} className="text-center p-16 text-muted-foreground">
                                    Nenhum resultado encontrado para os filtros selecionados.
                                </td></tr>
                            ) : (
                                sortedReportData.map(row => (
                                    <tr key={row.uid} className="border-b last:border-0 hover:bg-secondary/30">
                                        {ReportHeader.map(h => (
                                            <td key={h.key} className="p-3 align-top whitespace-nowrap">{row[h.key]}</td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </main>
    );
};
