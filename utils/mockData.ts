

import { VesselSchedule, FerroviarioSchedule, RodoviarioSchedule, DutoviarioSchedule, AereoSchedule, ScheduleStatus, ProductType, VesselScheduleLifecycleStatus, FerroviarioRateio, VesselOpType, FluvialRateio, MetaPlanejamento } from '../types';

// Helper data
const CITIES = ['Rondonópolis-MT', 'Porto de Santos-SP', 'Uberaba-MG', 'Paulínia-SP', 'Marília-SP', 'Porto de Paranaguá-PR', 'Betim-MG', 'Araucária-PR', 'Itajaí-SC'];
const AIRPORTS = ['GRU', 'GIG', 'CNF', 'BSB', 'VCP', 'POA', 'REC', 'SSA'];
const PORTS = ['Porto de Santos', 'Porto de Paranaguá', 'Porto de Itajaí', 'Porto de Rio Grande'];
const CLIENTS = ['Raízen', 'Vibra', 'Ipiranga', 'Petrobras', 'Shell', 'Cliente A', 'Cliente B'];
const TRANSPORTADORAS = ['Trans Rápido', 'Log Express', 'Cargo Master', 'Veloz Transportes', 'Global Log'];
const USINAS = ['Usina São Martinho', 'Usina da Raízen', 'Usina BP Bunge', 'Usina Coruripe'];
const BASES = ['Base de Guarulhos (SP)', 'Base de Betim (MG)', 'Base de Duque de Caxias (RJ)', 'Base de Paulínia (SP)'];

const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomDate = (start: Date, end: Date): string => {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().slice(0, 16);
};

const startDate = new Date();
startDate.setDate(startDate.getDate() - 10);
const endDate = new Date();
endDate.setDate(endDate.getDate() + 20);

const productTypes: ProductType[] = ['anidro', 'hidratado'];
const scheduleStatuses: ScheduleStatus[] = ['PLANEJADO', 'EM TRÂNSITO', 'CONCLUÍDO', 'ATRASADO', 'CANCELADO'];
const vesselStatuses: VesselScheduleLifecycleStatus[] = ['PLANEJADO', 'EM CARREGAMENTO', 'EM TRÂNSITO', 'AGUARDANDO DESCARGA', 'EM DESCARGA', 'CONCLUÍDO'];

export const generateFerroviarioSchedules = (count: number): FerroviarioSchedule[] => {
    const schedules: FerroviarioSchedule[] = [];
    for (let i = 1; i <= count; i++) {
        const qtd_vagoes = Math.floor(Math.random() * 51) + 30; // 30-80
        const rateios: FerroviarioRateio[] = [];
        let vagoes_restantes = qtd_vagoes;
        while (vagoes_restantes > 0) {
            const qtd_rateio = Math.min(vagoes_restantes, Math.floor(Math.random() * 20) + 10);
            vagoes_restantes -= qtd_rateio;
            rateios.push({
                id: Date.now() + Math.random(),
                cliente: getRandom(CLIENTS),
                pedido: `${Math.floor(Math.random() * 900000) + 100000}`,
                tipo_pedido: Math.random() > 0.5 ? 'venda' : 'remessa',
                qtd_vagoes: String(qtd_rateio),
                volume_pedido: String(qtd_rateio * (70000 + Math.floor(Math.random() * 2000))),
                volume_consumido: '0',
            });
        }
        
        schedules.push({
            id: i,
            planningGoalId: i <= 4 ? 300 : undefined,
            composicao: `COMP-${String.fromCharCode(65 + Math.floor(i/26))}${i % 26}${Math.floor(Math.random() * 100)}`,
            qtd_vagoes: String(qtd_vagoes),
            produto: getRandom(productTypes),
            tipo_veiculo: 'vagao-tanque',
            origem: getRandom(CITIES),
            destino: getRandom(CITIES),
            janela_carregamento_prevista: getRandomDate(startDate, endDate),
            saida_prevista: getRandomDate(startDate, endDate),
            chegada_prevista: getRandomDate(startDate, endDate),
            volume_previsto: String(qtd_vagoes * 70000),
            volume_real: '',
            status: getRandom(scheduleStatuses),
            rateios: rateios,
            vagoes: []
        });
    }
    return schedules;
};

export const generateRodoviarioSchedules = (count: number): RodoviarioSchedule[] => {
    const schedules: RodoviarioSchedule[] = [];
    for (let i = 1; i <= count; i++) {
        const status = getRandom(scheduleStatuses);
        schedules.push({
            id: i,
            placa: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            transportadora: getRandom(TRANSPORTADORAS),
            motorista: `Motorista ${i}`,
            produto: getRandom(productTypes),
            origem: getRandom(CITIES),
            destino: getRandom(CITIES),
            janela_carregamento_prevista: getRandomDate(startDate, endDate),
            chegada_real: status === 'CONCLUÍDO' ? getRandomDate(startDate, endDate) : '',
            liberacao_real: status === 'CONCLUÍDO' ? getRandomDate(startDate, endDate) : '',
            volume_previsto: String(Math.floor(Math.random() * 6001) + 40000), // 40000-46000
            volume_real: status === 'CONCLUÍDO' ? String(Math.floor(Math.random() * 6001) + 40000 - 100) : '',
            status: status,
        });
    }
    return schedules;
};

export const generateDutoviarioSchedules = (count: number): DutoviarioSchedule[] => {
    const schedules: DutoviarioSchedule[] = [];
    for (let i = 1; i <= count; i++) {
        schedules.push({
            id: i,
            empresa_solicitante: getRandom(CLIENTS),
            base_destino: getRandom(BASES),
            usina_origem: getRandom(USINAS),
            cliente_final: `Cliente Final ${String.fromCharCode(65 + (i % 26))}`,
            pedido_remessa_armazenagem: `${Math.floor(Math.random() * 900000) + 100000}`,
            pedido_venda_cliente: `${Math.floor(Math.random() * 900000) + 100000}`,
            data_agendamento_desejada: new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())).toISOString().slice(0, 10),
            periodo_agendamento_desejada: getRandom(['MANHÃ', 'TARDE', 'NOITE', 'COMERCIAL', '']),
            volume_solicitado: String(Math.floor(Math.random() * 1500001) + 500000), // 500k-2M
            status: getRandom(['PLANEJADO', 'CONCLUÍDO', 'CANCELADO']),
        });
    }
    return schedules;
};

export const generateAereoSchedules = (count: number): AereoSchedule[] => {
    const schedules: AereoSchedule[] = [];
    for (let i = 1; i <= count; i++) {
        schedules.push({
            id: i,
            status: getRandom(scheduleStatuses),
            aeroporto_origem: getRandom(AIRPORTS),
            aeroporto_destino: getRandom(AIRPORTS),
            voo: `V-${Math.floor(Math.random() * 9000) + 1000}`,
            previsao_embarque: getRandomDate(startDate, endDate),
            previsao_chegada: getRandomDate(startDate, endDate),
            volume_carga_prevista: String(Math.floor(Math.random() * 45001) + 5000), // 5k-50k
        });
    }
    return schedules;
};

export const generateVesselSchedules = (count: number): VesselSchedule[] => {
    const schedules: VesselSchedule[] = [];
    for (let i = 1; i <= count; i++) {
        const vesselType: VesselOpType = Math.random() > 0.7 ? 'Navio' : 'Balsa';
        const plannedVolume = Math.floor(Math.random() * 2000001) + 1000000;
        
        // Create 1 to 3 rateios
        const rateios: FluvialRateio[] = [];
        let remainingVolume = plannedVolume;
        const numRateios = Math.floor(Math.random() * 3) + 1;

        for(let j=0; j < numRateios; j++){
            const isLast = j === numRateios - 1;
            const rateioVolume = isLast ? remainingVolume : Math.floor(remainingVolume / (numRateios - j)) * (Math.random() * 0.4 + 0.8);
            remainingVolume -= rateioVolume;
            rateios.push({
                id: Date.now() + Math.random(),
                cliente: getRandom(CLIENTS),
                pedido: `${Math.floor(Math.random() * 900000) + 100000}`,
                volume: Math.round(rateioVolume),
                localDescarga: getRandom(CITIES),
                terminalDescarga: `T-${Math.floor(Math.random() * 5) + 1}`
            });
        }

        schedules.push({
            id: i,
            // Link some schedules to the mock daily goal
            planningGoalId: i <= 3 ? 104 : undefined,
            status: getRandom(vesselStatuses),
            product: getRandom(productTypes),
            rateios: rateios,
            incoterm: getRandom(['FOB', 'CIF', 'DAP']),
            vesselType: vesselType,
            vesselId: i, // Mock vesselId
            vesselName: `${vesselType} ${i}`,
            port: getRandom(PORTS),
            eta: getRandomDate(startDate, endDate),
            etb: getRandomDate(startDate, endDate),
            plannedVolume: String(plannedVolume),
            tanks: [],
        });
    }
    return schedules;
};

export const generatePlanningGoals = (): MetaPlanejamento[] => {
    const year = new Date().getFullYear();
    const goals: MetaPlanejamento[] = [];

    // 1. Annual Goal
    const annualGoal: MetaPlanejamento = {
        id: 100,
        parentId: null,
        modal: 'fluvial',
        title: `Contrato Principal ${year}`,
        period: 'ANUAL',
        description: `Meta anual de transporte fluvial para o cliente principal.`,
        product: 'anidro',
        type: 'DIRETO',
        origin: 'Porto de Santos-SP',
        destination: 'Paranaguá-PR',
        totalVolume: 12000000,
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        status: 'EM_ANDAMENTO',
    };
    goals.push(annualGoal);

    // 2. Monthly Goal
    const monthlyGoal: MetaPlanejamento = {
        id: 101,
        parentId: 100,
        modal: 'fluvial',
        title: `Meta de Julho`,
        period: 'MENSAL',
        description: `Sub-meta para o mês de Julho.`,
        product: 'anidro',
        type: 'DIRETO',
        origin: 'Porto de Santos-SP',
        destination: 'Paranaguá-PR',
        totalVolume: 1000000,
        startDate: `${year}-07-01`,
        endDate: `${year}-07-31`,
        status: 'EM_ANDAMENTO',
    };
    goals.push(monthlyGoal);

    // 3. Weekly Goal
    const weeklyGoal: MetaPlanejamento = {
        id: 102,
        parentId: 101,
        modal: 'fluvial',
        title: `Semana 28`,
        period: 'SEMANAL',
        description: `Meta para a segunda semana de Julho.`,
        product: 'anidro',
        type: 'DIRETO',
        origin: 'Porto de Santos-SP',
        destination: 'Paranaguá-PR',
        totalVolume: 250000,
        startDate: `${year}-07-08`,
        endDate: `${year}-07-14`,
        status: 'EM_ANDAMENTO',
    };
    goals.push(weeklyGoal);
    
    // 4. Daily Goal
    const dailyGoal: MetaPlanejamento = {
        id: 104,
        parentId: 102,
        modal: 'fluvial',
        title: `Operação 10/07`,
        period: 'DIARIO',
        description: `Meta diária para 10 de Julho.`,
        product: 'anidro',
        type: 'DIRETO',
        origin: 'Porto de Santos-SP',
        destination: 'Paranaguá-PR',
        totalVolume: 50000,
        startDate: `${year}-07-10`,
        endDate: `${year}-07-10`,
        status: 'EM_ANDAMENTO',
    };
    goals.push(dailyGoal);

    // 5. NEW Transshipment Goal
    const transshipmentGoal: MetaPlanejamento = {
        id: 200,
        parentId: null,
        modal: 'fluvial', // Main modal is fluvial
        title: `Exportação Transbordo ${year}`,
        period: 'MENSAL',
        description: `Operação de transbordo com múltiplos modais.`,
        product: 'anidro',
        type: 'TRANSBORDO',
        origin: 'Usina São Martinho', // Derived
        destination: 'Porto de Rotterdam', // Derived
        route: [
            { id: 1, modal: 'rodoviario', origin: 'Usina São Martinho', destination: 'Terminal Fluvial de Santos' },
            { id: 2, modal: 'fluvial', origin: 'Terminal Fluvial de Santos', destination: 'Porto de Paranaguá' },
            { id: 3, modal: 'maritimo', origin: 'Porto de Paranaguá', destination: 'Porto de Rotterdam' },
        ],
        totalVolume: 5000000,
        startDate: `${year}-08-01`,
        endDate: `${year}-08-31`,
        status: 'PENDENTE',
    };
    goals.push(transshipmentGoal);

    const ferroviarioGoal: MetaPlanejamento = {
        id: 300,
        parentId: null,
        modal: 'ferroviario',
        title: `Contrato Ferroviário ${year}`,
        period: 'ANUAL',
        description: `Meta anual de transporte ferroviário.`,
        product: 'anidro',
        type: 'DIRETO',
        origin: 'Rondonópolis-MT',
        destination: 'Porto de Santos-SP',
        totalVolume: 50000000,
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        status: 'EM_ANDAMENTO',
    };
    goals.push(ferroviarioGoal);

    return goals;
};