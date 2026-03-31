
export type ProductType = 'anidro' | 'hidratado' | 'granel';
export type GoalProductType = ProductType | 'etanol-mix';
export type ModalType = 'rodoviario' | 'fluvial' | 'ferroviario' | 'terra' | 'maritimo' | 'aereo' | 'dutoviario';
export type OperationType = 'recebimento' | 'expedicao' | 'transferencia';
export type Theme = 'light' | 'dark' | 'system';
export type OperationStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
export type Incoterm = 'EXW' | 'FOB' | 'CIF' | 'DDP' | 'DAP' | 'CPT';
export type ScheduleStatus = 'PLANEJADO' | 'AGUARDANDO CARREGAMENTO' | 'EM CARREGAMENTO' | 'EM TRÂNSITO' | 'CONCLUÍDO' | 'ATRASADO' | 'CANCELADO';


export interface TankResults {
    r20: number;
    fcv: number;
    inpm: number;
    v20: number;
    status: 'OK' | 'FORA' | 'PENDING';
    messages: string[];
}

export interface Tank {
    id: number;
    vesselTankId?: number; // Link to VesselTank
    tipo: ModalType;
    prod: ProductType;
    ident: string; // Vessel name or Plate
    tanque: string; // Tank name or number
    cliente: string;
    tdesc: string;
    ldesc: string;
    vamb: string;
    rho: string;
    Ta: string;
    Tt: string;
    trim?: number;
    alturaMedidaCm?: string;
    lastroMm?: string;
    dischargedVolume?: string; // Volume input for discharge operations
    lacres: string[];
    isEmpty?: boolean;
    results: TankResults;
}

export interface OperationDetails {
    id: string;
    type: OperationType;
    modal: ModalType;
    vesselId: number | null; // Replaces 'balsa'
    responsavel: string;
    terminal: string;
    local: string;
    dateTime: string;
    operationStartDate?: string;
    status: OperationStatus;
    observations?: string;
    // For schedule integration
    ata?: string;
    atb?: string;
    ats?: string;
    atcFinish?: string;
    atd?: string;
}

export interface Signatures {
    transportador: string | null;
    certificadora: string | null;
    representante: string | null;
}

// New types for the detailed vessel scheduling screen
export type VesselOpType = 'Balsa' | 'Navio';
export type VesselPerformanceStatus = 'NO PRAZO' | 'ATRASADO' | 'ADIANTADO';
export type VesselScheduleLifecycleStatus = 'PLANEJADO' | 'AGUARDANDO CARREGAMENTO' | 'EM CARREGAMENTO' | 'EM TRÂNSITO' | 'AGUARDANDO DESCARGA' | 'EM DESCARGA' | 'CONCLUÍDO';


export interface ScheduledTankInOp {
    id: string; // unique id for the list
    tankName: string; // ex: TQ-01, TQ-02...
    product: ProductType;
    volumeAmbient: string;
    volume20c: string;
    inpm: string;
    seals: string[];
}

export interface DischargeTankMeasurement {
    vesselTankId: number;
    tankName: string;
    dischargedVolume: number;
}

export interface DischargeEvent {
    id: string; // Corresponds to the operation ID
    dateTime: string;
    totalDischargedVolume: number;
    measurements: DischargeTankMeasurement[];
}

export interface FluvialRateio {
    id: number;
    cliente: string;
    pedido: string;
    volume: number;
    localDescarga: string;
    terminalDescarga: string;
    etaDestino?: string;
    etbDestino?: string;
}

export interface VesselSchedule {
    id: number;
    planningGoalId?: number; // Link to a high-level planning goal
    status: VesselScheduleLifecycleStatus;
    product: ProductType;
    rateios: FluvialRateio[];
    incoterm?: Incoterm;

    // Identificação
    vesselType: VesselOpType;
    vesselId?: number;
    vesselName: string;
    port: string;

    // Previsão (Planejado)
    eta?: string; // date-time string
    etb?: string;
    etcStart?: string;
    etcEnd?: string;
    etd?: string;
    plannedVolume?: string; // number as string
    plannedTransitTimeDays?: string; // number as string
    roadTransitTimeDays?: string;
    roadDepartureDate?: string;

    // Realizado (Fato)
    ata?: string;
    atb?: string;
    ats?: string;
    atcFinish?: string;
    atd?: string;
    loadedVolume?: string; // number as string
    discharges?: DischargeEvent[];
    finalLossGain?: number;
    
    // Rastreabilidade e Ocorrências
    tanks: ScheduledTankInOp[];
    releaseDensity?: string;
    releaseInpm?: string;
    occurrences?: string;
}

// --- Transshipment Route Leg ---
export interface RouteLeg {
    id: number;
    modal: ModalType;
    origin: string;
    destination: string;
}


// --- High-level Planning Goal ---
export interface MetaPlanejamento {
    id: number;
    parentId: number | null;
    modal: ModalType;
    title: string;
    period: 'ANUAL' | 'MENSAL' | 'SEMANAL' | 'DIARIO';
    description: string;
    product: GoalProductType;
    
    type: 'DIRETO' | 'TRANSBORDO';
    route?: RouteLeg[]; // For TRANSBORDO type

    origin: string;
    destination: string;
    totalVolume: number;
    realizedVolume?: number;
    volumeAnidro?: number;
    volumeHidratado?: number;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';
}


// --- New Schedule Types for other modals ---
export interface FerroviarioRateio {
    id: number;
    cliente: string;
    pedido: string;
    tipo_pedido: 'remessa' | 'venda';
    qtd_vagoes: string;
    volume_pedido: string;
    volume_consumido: string;
}

export type VagaoStatus = 'AGUARDANDO' | 'EM CARREGAMENTO' | 'CARREGADO' | 'REPROVADO';
export type DocumentStatus = 'PENDENTE' | 'EMITIDO';

export interface Anexo {
    name: string;
    dataUrl: string; // base64 data URL
}

export interface Vagao {
    id: number;
    numero: string;
    status: VagaoStatus;
    volumeObservado?: string;
    pesoCarregado?: string; // For non-tank cars
    temperatura?: string;
    densidade?: string;
    fcv?: string;
    lacre?: string;
    anexoNotaRemessa?: Anexo;
    anexoNotaEmitida?: Anexo;
    cteNumero?: string;
    anexoCte?: Anexo;
    notaRetorno?: string;
    volumeNotaRetorno?: string;
    volumeNotaEmitida?: string;
    rateioId: number;
    timestampCarregamento?: string;
    // New fields
    statusNotaRemessa?: DocumentStatus;
    statusNotaEmitida?: DocumentStatus;
    statusCte?: DocumentStatus;
}

export interface FerroviarioSchedule {
    id: number;
    planningGoalId?: number;
    status: ScheduleStatus;
    composicao: string;
    qtd_vagoes: string;
    produto: ProductType;
    tipo_veiculo: 'vagao-tanque' | 'vagao-granel' | 'vagao-container';
    origem: string;
    destino: string;
    janela_carregamento_prevista: string;
    saida_prevista: string;
    chegada_prevista: string;
    volume_previsto: string;
    volume_real: string;
    rateios: FerroviarioRateio[];
    vagoes: Vagao[];
}

export interface RodoviarioSchedule {
    id: number;
    status: ScheduleStatus;
    placa: string;
    transportadora: string;
    motorista: string;
    produto: ProductType;
    origem: string;
    destino: string;
    janela_carregamento_prevista: string;
    chegada_real: string;
    liberacao_real: string;
    volume_previsto: string;
    volume_real: string;
}

export interface DutoviarioSchedule {
    id: number;
    empresa_solicitante: string;
    base_destino: string;
    usina_origem: string;
    cliente_final: string;
    pedido_remessa_armazenagem?: string;
    pedido_venda_cliente?: string;
    data_agendamento_desejada: string; // YYYY-MM-DD
    periodo_agendamento_desejada: 'MANHÃ' | 'TARDE' | 'NOITE' | 'COMERCIAL' | '';
    volume_solicitado: string; // number as string
    status: ScheduleStatus;
}

export interface AereoSchedule {
    id: number;
    status: ScheduleStatus;
    aeroporto_origem: string;
    aeroporto_destino: string;
    voo: string;
    previsao_embarque: string;
    previsao_chegada: string;
    volume_carga_prevista: string;
}

// A unified interface to represent any scheduled operation
export interface UnifiedSchedule {
  uid: string;
  modal: 'fluvial' | 'rodoviario' | 'ferroviario' | 'dutoviario' | 'aereo' | 'manual';
  vesselType?: VesselOpType;
  title: string;
  description: string;
  status: VesselScheduleLifecycleStatus | ScheduleStatus;
  originalId: number;
  onStartLoading?: (id: number) => void;
  onRegisterArrival?: (id: number) => void;
  onStartDischarge?: (id: number) => void;
  onView?: (id: number) => void;
  onFinalizeTrip?: (id: number) => void;
}


// New refactored types for Equipment and Gauging to match detailed prompt
export type EquipmentType = 'balsa-tanque' | 'balsa-granel' | 'navio-tanque' | 'navio-granel';

export interface CalibrationPoint {
    height: number;
    trim: number; // e.g., -50, -25, 0, 25, 50
    volume: number;
}

export interface VesselTank {
    id: number;
    externalId?: string; // For ID_TANQUE
    tankName: string;
    maxCalibratedHeight?: number;
    maxVolume?: number;
    calibrationCurve: CalibrationPoint[];
    measurementHistory?: Array<{ date: string; measuredVolume: number }>;
}

export interface Vessel {
    id: number;
    externalId?: string; // For ID_BALSA
    type: EquipmentType;
    name: string;
    owner?: string;
    totalTheoreticalCapacity?: number;
    certificateNumber: string;
    issueDate: string; // Stored as 'YYYY-MM-DD'
    expiryDate: string; // Stored as 'YYYY-MM-DD'
    executor: string;
    notes?: string; // For OBSERVACOES
    tanks: VesselTank[];
}

export type MeasurementOperationType = 'carregamento_inicial' | 'descarga_parcial' | 'descarga_final' | 'afericao_rotina';

export interface MeasurementLog {
    id: number;
    vesselId: number;
    dateTime: string;
    operationType: MeasurementOperationType;
    product: string;
    operator: string;
    totalVolume: number;
    origin?: string;
    destination?: string;
    measurements: Array<{
        tankId: number;
        tankName: string;
        trim: number;
        height: number;
        calculatedVolume: number;
    }>;
}

export interface ActiveOperationState {
    details: OperationDetails;
    tanks: Tank[];
    signatures: Signatures;
}

// --- New types for Registration Hub ---
export type LocationType = 'armazem-granel' | 'terminal-liquido' | 'recinto-alfandegado';
export type SimpleAssetType = 'tanque-terra' | 'vagao-tanque' | 'vagao-granel' | 'container';

export interface Location {
    id: number;
    type: LocationType;
    name: string;
    city: string;
    state: string;
}

export interface SimpleAsset {
    id: number;
    type: SimpleAssetType;
    name: string; // e.g., TQ-101, V-F-555
    capacity?: number;
    unit?: 'L' | 'Kg';
    locationId?: number; // Link to a Location
}

// --- New types for Stock Control ---
export type StockTransactionType = 'entrada' | 'saida';

export interface StockTransaction {
    id: number;
    locationId: number;
    product: ProductType;
    type: StockTransactionType;
    quantity: number; // Always positive. Sign is determined by `type`.
    unit: 'L' | 'Kg';
    timestamp: string;
    notes?: string;
}

// --- New types for Cost Control ---
export type CostCategory = 'frete' | 'armazenagem' | 'taxas' | 'seguro' | 'outros' | 'demurrage';

export interface CostItem {
    id: number;
    operationUid: string; // To link to a UnifiedSchedule
    category: CostCategory;
    description: string;
    budgetedAmount: number;
    actualAmount: number;
    date: string; // YYYY-MM-DD
}

// --- New type for Unit Cost Control ---
export interface UnitCost {
    id: number;
    category: CostCategory;
    modal: ModalType | 'geral';
    description: string;
    budgetedAmount: number; // Cost per m³
}


// --- New types for Backoffice ---
export type OrderStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

export interface Order {
    id: number;
    orderNumber: string;
    clientName: string;
    product: ProductType;
    volume: number;
    unit: 'L' | 'Kg';
    origin: string;
    destination: string;
    creationDate: string; // YYYY-MM-DD
    status: OrderStatus;
    notes?: string;
}

// --- Notification System Types ---
export interface AppNotification {
    id: number;
    timestamp: string;
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    isRead: boolean;
}

export interface NotificationSettings {
    email: string;
    notifyOnOperationConcluded: boolean;
    notifyOnVesselDelayed: boolean;
    notifyOnCertificateExpires: boolean;
}

// --- App-wide Settings ---
export type VolumeUnit = 'L' | 'm³';
export type MassUnit = 'Kg' | 't';

export interface UnitSettings {
    volume: VolumeUnit;
    mass: MassUnit;
}

export interface AppSettings {
    notifications: NotificationSettings;
    units: UnitSettings;
}
