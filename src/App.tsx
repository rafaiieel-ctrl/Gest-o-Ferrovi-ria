









import React, { useState, useEffect, useCallback, useRef, SetStateAction, useMemo } from 'react';
import { Routes, Route, useNavigate, useParams, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Tank, OperationDetails, Signatures, Theme, Vessel, VesselSchedule, VesselTank, ActiveOperationState, VesselScheduleLifecycleStatus, DischargeEvent, DischargeTankMeasurement, ProductType, ModalType, Incoterm, Location, SimpleAsset, FerroviarioSchedule, RodoviarioSchedule, DutoviarioSchedule, AereoSchedule, ScheduleStatus, FerroviarioRateio, StockTransaction, UnifiedSchedule, CostItem, Order, UnitCost, ScheduledTankInOp, VagaoStatus, AppNotification, NotificationSettings, MetaPlanejamento, FluvialRateio, AppSettings } from './types';
import { calculateTankMetrics, ANP, interpolate } from './services/calculationService';
import { analyzeOperationData } from './services/geminiService';
import { Header } from './components/layout/Header';
import { SplashScreen } from './components/splash/SplashScreen';
import { nowLocal, brToNumber, exportToCsv, generateReportHtml, numberToBr, getPerformanceStatus, getCertificateStatus, generateMailtoLink, formatDateTime } from './utils/helpers';
import { OperationScreen } from './screens/OperationScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { useLocalStorage } from './hooks/useLocalStorage';
import { VesselScreen } from './screens/VesselScreen';
import { Breadcrumb } from './components/ui/Breadcrumb';
import { BulkEditScreen } from './screens/BulkEditScreen';
import { OperationsHubScreen } from './screens/OperationsHubScreen';
import { RegistrationHubScreen } from './screens/RegistrationHubScreen';
import { MultimodalPlanningScreen } from './screens/MultimodalPlanningScreen';
import { RodoviarioPlanningScreen } from './screens/RodoviarioPlanningScreen';
import { DutoviarioPlanningScreen } from './screens/DutoviarioPlanningScreen';
import { AereoPlanningScreen } from './screens/AereoPlanningScreen';
import { FerroviarioLoadingScreen } from './screens/FerroviarioLoadingScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { StockControlScreen } from './screens/StockControlScreen';
import { CostControlScreen } from './screens/CostControlScreen';
import { BackofficeScreen } from './screens/BackofficeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { Toast } from './components/ui/Toast';
import { ConfirmationModal } from './components/modals/ConfirmationModal';
import { generateAereoSchedules, generateDutoviarioSchedules, generateFerroviarioSchedules, generateRodoviarioSchedules, generateVesselSchedules, generatePlanningGoals } from './utils/mockData';
import { FluvialPlanningCenterScreen } from './screens/FluvialPlanningCenterScreen';
import { FluvialProgrammingScreen } from './screens/FluvialProgrammingScreen';
import { FerroviarioPlanningCenterScreen } from './screens/FerroviarioPlanningCenterScreen';
import { FerroviarioProgrammingScreen } from './screens/FerroviarioProgrammingScreen';
import { Button } from './components/ui/Button';
import { MenuIcon } from './components/ui/icons';

const getInitialOperationDetails = (): OperationDetails => ({
    id: `OP-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Date.now()).slice(-4)}`,
    type: 'transferencia',
    modal: 'fluvial',
    vesselId: null,
    responsavel: 'Rafael',
    terminal: 'Terminal Exemplo',
    local: 'Paranaguá - PR',
    dateTime: nowLocal(),
    operationStartDate: '',
    status: 'em_andamento',
    observations: '',
});

const getInitialSignatures = (): Signatures => ({
    transportador: null,
    certificadora: null,
    representante: null,
});

const getInitialActiveOperation = (): ActiveOperationState => ({
    details: getInitialOperationDetails(),
    tanks: [], // Will be populated by useEffect
    signatures: getInitialSignatures(),
});

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const App: React.FC = () => {
    const [isAppLoading, setIsAppLoading] = useState(true);
    const [isDataReady, setIsDataReady] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Inicializando aplicação...');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation();

    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('qc_theme') as Theme | null;
        return savedTheme || 'system';
    });
    
    const [activeOperation, setActiveOperation] = useLocalStorage<ActiveOperationState>('qc_active_operation', getInitialActiveOperation);
    const [archivedOperations, setArchivedOperations] = useLocalStorage<ActiveOperationState[]>('qc_archived_operations', []);
    const { details: operationDetails, tanks, signatures } = activeOperation;

    const setOperationDetails = useCallback((newDetails: OperationDetails) => {
        setActiveOperation(prev => ({ ...prev, details: newDetails }));
    }, [setActiveOperation]);
    
    const setTanks = useCallback((updater: SetStateAction<Tank[]>) => {
        setActiveOperation(prev => {
            const newTanks = typeof updater === 'function' ? updater(prev.tanks) : updater;
            return { ...prev, tanks: newTanks };
        });
    }, [setActiveOperation]);

    const setSignatures = useCallback((updater: SetStateAction<Signatures>) => {
        setActiveOperation(prev => {
            const finalSignatures = typeof updater === 'function' ? updater(prev.signatures) : updater;
            return { ...prev, signatures: finalSignatures };
        });
    }, [setActiveOperation]);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');
    const [vessels, setVessels] = useLocalStorage<Vessel[]>('qc_vessels', []);
    const [schedule, setSchedule] = useLocalStorage<VesselSchedule[]>('qc_vessel_schedule', () => generateVesselSchedules(15));
    
    const [ferroviarioSchedules, setFerroviarioSchedules] = useLocalStorage<FerroviarioSchedule[]>('qc_ferroviario_schedules', () => generateFerroviarioSchedules(10));
    const [rodoviarioSchedules, setRodoviarioSchedules] = useLocalStorage<RodoviarioSchedule[]>('qc_rodoviario_schedules', () => generateRodoviarioSchedules(20));
    const [dutoviarioSchedules, setDutoviarioSchedules] = useLocalStorage<DutoviarioSchedule[]>('qc_dutoviario_schedules', () => generateDutoviarioSchedules(5));
    const [aereoSchedules, setAereoSchedules] = useLocalStorage<AereoSchedule[]>('qc_aereo_schedules', () => generateAereoSchedules(8));
    const [stockTransactions, setStockTransactions] = useLocalStorage<StockTransaction[]>('qc_stock_transactions', []);
    const [costItems, setCostItems] = useLocalStorage<CostItem[]>('qc_cost_items', []);
    const [unitCosts, setUnitCosts] = useLocalStorage<UnitCost[]>('qc_unit_costs', []);
    const [locations, setLocations] = useLocalStorage<Location[]>('qc_locations', []);
    const [simpleAssets, setSimpleAssets] = useLocalStorage<SimpleAsset[]>('qc_simple_assets', []);
    const [orders, setOrders] = useLocalStorage<Order[]>('qc_orders', []);
    // FIX: The error "Expected 1 arguments, but got 0" for useLocalStorage with a no-argument generator function is likely a linter or TypeScript inference issue with the arrow function wrapper `() => generatePlanningGoals()`. Passing the function reference `generatePlanningGoals` directly is a cleaner way for lazy initialization and resolves this error.
    const [planningGoals, setPlanningGoals] = useLocalStorage<MetaPlanejamento[]>('qc_planning_goals', generatePlanningGoals);

    const [activeScheduleForOperation, setActiveScheduleForOperation] = useLocalStorage<VesselSchedule | null>('qc_active_schedule', null);
    const [activeOperationType, setActiveOperationType] = useLocalStorage<'loading' | 'unloading' | null>('qc_active_op_type', null);

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; action?: { label: string; onClick: () => void } } | null>(null);

    const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const restoreDataRef = useRef<Record<string, string> | null>(null);
    
    const [appSettings, setAppSettings] = useLocalStorage<AppSettings>('qc_app_settings', {
        notifications: {
            email: 'user@bluemultimodal.com',
            notifyOnOperationConcluded: true,
            notifyOnVesselDelayed: true,
            notifyOnCertificateExpires: true,
        },
        units: {
            volume: 'L',
            mass: 'Kg',
        }
    });
    const [notifications, setNotifications] = useLocalStorage<AppNotification[]>('qc_notifications', []);

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success', action?: { label: string; onClick: () => void }) => {
        setToast({ message, type, action });
    }, []);

    const addNotification = useCallback((type: 'info' | 'warning' | 'error', title: string, message: string) => {
        const newNotification: AppNotification = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            isRead: false,
            type,
            title,
            message,
        };
        setNotifications(prev => {
            const similarExists = prev.some(n => !n.isRead && n.title === title && n.message === message);
            if (similarExists) return prev;
            return [newNotification, ...prev].slice(0, 50);
        });
    }, [setNotifications]);

    const triggerNotification = useCallback((
        eventType: keyof Omit<NotificationSettings, 'email'>,
        notificationPayload: { type: 'info' | 'warning' | 'error', title: string, message: string },
        emailPayload?: { subject: string, body: string }
    ) => {
        if (appSettings.notifications[eventType]) {
            addNotification(notificationPayload.type, notificationPayload.title, notificationPayload.message);

            if (emailPayload && appSettings.notifications.email) {
                showToast(notificationPayload.title, notificationPayload.type === 'error' ? 'error' : 'success', {
                    label: 'Enviar E-mail',
                    onClick: () => {
                        const mailto = generateMailtoLink(appSettings.notifications.email, emailPayload.subject, emailPayload.body);
                        window.location.href = mailto;
                    }
                });
            }
        }
    }, [addNotification, appSettings.notifications, showToast]);

     useEffect(() => {
        const initializeApp = async () => {
            if (localStorage.getItem('qc_data_initialized')) {
                setLoadingMessage('Carregando dados...');
                await new Promise(resolve => setTimeout(resolve, 1200));
            } else {
                setLoadingMessage('Preparando para o primeiro uso...');
                await new Promise(resolve => setTimeout(resolve, 1500));
                localStorage.setItem('qc_data_initialized', 'true');
            }
            setIsDataReady(true);
            setLoadingMessage('Pronto para iniciar!');
        };
        initializeApp();
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        root.classList.toggle('dark', isDark);
        localStorage.setItem('qc_theme', theme);
    }, [theme]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
            document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
        };
        if (!isAppLoading) {
            window.addEventListener('mousemove', handleMouseMove);
        }
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isAppLoading]);

    const addTank = useCallback((template?: Partial<Tank>) => {
        setTanks(prev => [...prev, {
            id: Date.now(),
            tipo: operationDetails.modal === 'fluvial' ? 'fluvial' : 'rodoviario',
            prod: 'anidro',
            ident: '', tanque: '', cliente: '', tdesc: '', ldesc: '', vamb: '', rho: '', Ta: '', Tt: '', lacres: [],
            results: { r20: NaN, fcv: NaN, inpm: NaN, v20: NaN, status: 'PENDING', messages: [] },
            ...template,
        }]);
    }, [operationDetails.modal, setTanks]);

    const updateTank = useCallback((id: number, updatedTank: Tank) => {
        setTanks(prevTanks => {
            const newTanks = prevTanks.map(t => t.id === id ? updatedTank : t);
            return newTanks.map(tank => tank.id === id ? calculateTankMetrics(tank) : tank);
        });
    }, [setTanks]);

    const deleteTank = useCallback((id: number) => setTanks(prev => prev.filter(t => t.id !== id)), [setTanks]);
    const duplicateTank = useCallback((id: number) => {
        const tankToDuplicate = tanks.find(t => t.id === id);
        if (tankToDuplicate) {
            const { id, ...rest } = tankToDuplicate;
            addTank(rest);
        }
    }, [tanks, addTank]);

    const calculateAllTanks = useCallback(() => setTanks(prev => prev.map(calculateTankMetrics)), [setTanks]);

    const handleAIAnalysis = useCallback(async (prompt: string) => {
        setIsAnalyzing(true);
        setAnalysisResult('');
        try {
            const result = await analyzeOperationData(operationDetails, tanks, prompt, vessels);
            setAnalysisResult(result);
        } catch (e) {
            setAnalysisResult(`Erro: ${(e as Error).message}`);
        } finally {
            setIsAnalyzing(false);
        }
    }, [operationDetails, tanks, vessels]);

    const saveOperation = useCallback(() => {
        const dataStr = JSON.stringify(activeOperation, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${operationDetails.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [activeOperation, operationDetails.id]);

    const loadOperation = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const result = e.target?.result as string;
                    setActiveOperation(JSON.parse(result) as ActiveOperationState);
                } catch (error) {
                    alert("Erro ao carregar o arquivo.");
                }
            };
            reader.readAsText(file);
        }
    }, [setActiveOperation]);
    
    const newOperation = useCallback((silent = false) => {
        const doReset = () => {
            setActiveOperation(getInitialActiveOperation());
            setActiveScheduleForOperation(null);
            setActiveOperationType(null);
        };

        if (silent) {
            doReset();
        } else {
             if (window.confirm("Isso limpará a operação atual. Deseja continuar?")) {
                doReset();
            }
        }
    }, [setActiveOperation, setActiveScheduleForOperation, setActiveOperationType]);
    
    const concludeOperation = useCallback(() => {
        const opToConclude = { ...activeOperation };
        const scheduleToUpdate = activeScheduleForOperation;
        const concludedOpType = activeOperationType;
    
        if (scheduleToUpdate && concludedOpType) {
            if (concludedOpType === 'loading') {
                const totalLoadedVolume = opToConclude.tanks.reduce((sum, tank) => sum + (tank.results.v20 || 0), 0);
                const loadedTanks: ScheduledTankInOp[] = opToConclude.tanks.map(t => ({
                    id: `tank-${t.id}`,
                    tankName: t.tanque,
                    product: t.prod,
                    volumeAmbient: t.vamb,
                    volume20c: numberToBr(t.results.v20, 3),
                    inpm: numberToBr(t.results.inpm, 2),
                    seals: t.lacres,
                }));
    
                setSchedule(prev => prev.map(s => {
                    if (s.id === scheduleToUpdate.id) {
                        return {
                            ...s,
                            status: 'EM TRÂNSITO',
                            loadedVolume: String(totalLoadedVolume),
                            tanks: loadedTanks,
                            ata: opToConclude.details.ata || s.ata,
                            atb: opToConclude.details.atb || s.atb,
                            ats: opToConclude.details.ats || s.ats,
                            atcFinish: opToConclude.details.atcFinish || nowLocal(),
                            atd: opToConclude.details.atd || s.atd,
                        };
                    }
                    return s;
                }));
                showToast('Carregamento concluído! Programação em trânsito.', 'success');
            } else if (concludedOpType === 'unloading') {
                const totalDischargedVolume = opToConclude.tanks.reduce((sum, t) => sum + brToNumber(t.dischargedVolume || '0'), 0);
                const dischargeEvent: DischargeEvent = {
                    id: opToConclude.details.id,
                    dateTime: opToConclude.details.dateTime,
                    totalDischargedVolume,
                    measurements: opToConclude.tanks
                        .filter(t => brToNumber(t.dischargedVolume || '0') > 0)
                        .map(t => ({
                            vesselTankId: t.vesselTankId!,
                            tankName: t.tanque,
                            dischargedVolume: brToNumber(t.dischargedVolume || '0'),
                        })),
                };
    
                setSchedule(prev => prev.map(s => {
                    if (s.id === scheduleToUpdate.id) {
                        const existingDischarges = s.discharges || [];
                        const newDischarges = [...existingDischarges, dischargeEvent];
                        const totalDischargedSoFar = newDischarges.reduce((sum, d) => sum + d.totalDischargedVolume, 0);
                        const totalLoaded = brToNumber(s.loadedVolume || '0');
                        const isFullyDischarged = totalLoaded > 0 && totalDischargedSoFar >= (totalLoaded * 0.99);
                        const newStatus: VesselScheduleLifecycleStatus = isFullyDischarged ? 'CONCLUÍDO' : 'AGUARDANDO DESCARGA';
    
                        return { ...s, status: newStatus, discharges: newDischarges };
                    }
                    return s;
                }));
                 showToast(`Descarga de ${numberToBr(totalDischargedVolume,0)} L registrada.`, 'success');
            }
        }
    
        const emailSubject = `Alerta Blue Multimodal: Operação Concluída - ${opToConclude.details.id}`;
        const emailBody = `Olá,\n\nA operação ${opToConclude.details.id} foi concluída com sucesso.\n\nDetalhes:\n- Tipo: ${opToConclude.details.type}\n- Modal: ${opToConclude.details.modal}\n- Terminal: ${opToConclude.details.terminal}\n- Data/Hora: ${new Date(opToConclude.details.dateTime).toLocaleString('pt-BR')}\n\nAtenciosamente,\nEquipe Blue Multimodal`;

        triggerNotification('notifyOnOperationConcluded', {
            type: 'info',
            title: 'Operação Concluída',
            message: `A operação ${opToConclude.details.id} foi concluída.`
        }, { subject: emailSubject, body: emailBody });

        setArchivedOperations(prev => [...prev, opToConclude]);
        setActiveOperation(getInitialActiveOperation());
        setActiveScheduleForOperation(null);
        setActiveOperationType(null);
        if (!scheduleToUpdate) showToast('Operação concluída e arquivada.', 'success');
    }, [activeOperation, activeScheduleForOperation, activeOperationType, setSchedule, setArchivedOperations, setActiveOperation, showToast, setActiveScheduleForOperation, setActiveOperationType, triggerNotification]);

    const handleSaveVessel = (vesselToSave: Vessel) => {
        setVessels(prev => {
            const exists = prev.some(v => v.id === vesselToSave.id);
            if (exists) {
                return prev.map(v => v.id === vesselToSave.id ? vesselToSave : v);
            }
            return [...prev, vesselToSave];
        });
        navigate('/registration-hub');
        showToast('Embarcação salva com sucesso!');
    };
    
    const handleDeleteVessel = (id: number) => {
        setVessels(prev => prev.filter(v => v.id !== id));
    };

    const handleStartLoading = useCallback((scheduleId: number) => {
        const scheduleToStart = schedule.find(s => s.id === scheduleId);
        if (!scheduleToStart) return showToast('Programação não encontrada.', 'error');
        
        const vessel = vessels.find(v => v.name === scheduleToStart.vesselName);
        if (!vessel) return showToast(`Embarcação "${scheduleToStart.vesselName}" não encontrada.`, 'error');

        newOperation(true);
        const clients = scheduleToStart.rateios.map(r => r.cliente).join(', ');
        const newOpDetails: OperationDetails = {
            ...getInitialOperationDetails(),
            type: 'recebimento', modal: 'fluvial', vesselId: vessel.id,
            id: `OP-LOAD-${scheduleId}`, terminal: scheduleToStart.port,
        };
        const newTanks: Tank[] = vessel.tanks.map(vt => ({
            id: Date.now() + vt.id, vesselTankId: vt.id, tipo: 'fluvial',
            prod: scheduleToStart.product, ident: vessel.name, tanque: vt.tankName,
            cliente: clients, tdesc: '', ldesc: '', vamb: '', rho: '',
            Ta: '', Tt: '', lacres: [], trim: 0, alturaMedidaCm: '', lastroMm: '',
            results: { r20: NaN, fcv: NaN, inpm: NaN, v20: NaN, status: 'PENDING', messages: [] },
        }));

        setActiveOperation({ details: newOpDetails, tanks: newTanks, signatures: getInitialSignatures() });
        setActiveScheduleForOperation(scheduleToStart);
        setActiveOperationType('loading');
        setSchedule(prev => prev.map(s => s.id === scheduleId ? { ...s, status: 'EM CARREGAMENTO' } : s));
        navigate('/operation');
    }, [schedule, vessels, newOperation, setActiveOperation, setActiveScheduleForOperation, setActiveOperationType, setSchedule, showToast, navigate]);

    const handleRegisterArrival = useCallback((scheduleId: number) => {
        setSchedule(prev => prev.map(s => s.id === scheduleId ? { ...s, status: 'AGUARDANDO DESCARGA', ata: nowLocal() } : s));
        showToast('Chegada registrada com sucesso!');
    }, [setSchedule, showToast]);
    
    const handleStartDischarge = useCallback((scheduleId: number) => {
        const scheduleToStart = schedule.find(s => s.id === scheduleId);
        if (!scheduleToStart) return showToast('Programação não encontrada.', 'error');

        const vessel = vessels.find(v => v.name === scheduleToStart.vesselName);
        if (!vessel) return showToast(`Embarcação "${scheduleToStart.vesselName}" não encontrada.`, 'error');
        
        const clients = scheduleToStart.rateios.map(r => r.cliente).join(', ');

        newOperation(true);
        const newOpDetails: OperationDetails = {
            ...getInitialOperationDetails(), type: 'expedicao', modal: 'fluvial', vesselId: vessel.id,
            id: `OP-UNLOAD-${scheduleId}-${(scheduleToStart.discharges?.length || 0) + 1}`, terminal: scheduleToStart.port,
        };
        const newTanks: Tank[] = vessel.tanks.map(vt => ({
            id: Date.now() + vt.id, vesselTankId: vt.id, tipo: 'fluvial',
            prod: scheduleToStart.product, ident: vessel.name, tanque: vt.tankName,
            cliente: clients, tdesc: '', ldesc: '', vamb: '', rho: '', Ta: '',
            Tt: '', lacres: [], trim: 0, alturaMedidaCm: '', lastroMm: '',
            results: { r20: NaN, fcv: NaN, inpm: NaN, v20: NaN, status: 'PENDING', messages: [] },
        }));

        setActiveOperation({ details: newOpDetails, tanks: newTanks, signatures: getInitialSignatures() });
        setActiveScheduleForOperation(scheduleToStart);
        setActiveOperationType('unloading');
        setSchedule(prev => prev.map(s => s.id === scheduleId ? { ...s, status: 'EM DESCARGA' } : s));
        navigate('/operation');
    }, [schedule, vessels, newOperation, setActiveOperation, setActiveScheduleForOperation, setActiveOperationType, setSchedule, showToast, navigate]);

    const handleFinalizeTrip = useCallback((scheduleId: number) => {
        const scheduleItem = schedule.find(s => s.id === scheduleId);
        if (!scheduleItem) return;
        setSchedule(prev => prev.map(s => s.id === scheduleId ? { ...s, status: 'CONCLUÍDO' } : s));
        showToast(`Viagem da embarcação ${scheduleItem.vesselName} finalizada.`);
    }, [schedule, setSchedule, showToast]);

    const handleCreateBackup = useCallback(() => { /* ... implementation ... */ }, [showToast]);
    const handleRestoreFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => { /* ... implementation ... */ }, [showToast]);
    const confirmRestoreBackup = useCallback(() => { /* ... implementation ... */ }, [showToast]);
    const handleResetSystem = useCallback(() => { /* ... implementation ... */ }, [showToast]);

    const unifiedSchedules = useMemo((): UnifiedSchedule[] => {
        const fluvial: UnifiedSchedule[] = schedule.map(s => ({
            uid: `fluvial-${s.id}`, modal: 'fluvial', vesselType: s.vesselType, title: s.vesselName,
            description: `${s.port} → ${s.rateios.map(r => r.cliente).join(', ')}`, status: s.status, originalId: s.id,
            onStartLoading: handleStartLoading, onRegisterArrival: handleRegisterArrival, onStartDischarge: handleStartDischarge, onFinalizeTrip: handleFinalizeTrip,
        }));
        const ferroviario: UnifiedSchedule[] = ferroviarioSchedules.map(s => ({
            uid: `ferroviario-${s.id}`, modal: 'ferroviario', title: `Composição ${s.composicao}`, description: `${s.origem} → ${s.destino}`,
            status: s.status, originalId: s.id,
        }));
        const rodoviario: UnifiedSchedule[] = rodoviarioSchedules.map(s => ({
            uid: `rodoviario-${s.id}`, modal: 'rodoviario', title: s.placa, description: `${s.origem} → ${s.destino}`, status: s.status, originalId: s.id,
        }));
        const dutoviario: UnifiedSchedule[] = dutoviarioSchedules.map(s => ({
            uid: `dutoviario-${s.id}`, modal: 'dutoviario', title: `Duto para ${s.base_destino}`, description: `${s.usina_origem} → ${s.cliente_final}`, status: s.status, originalId: s.id,
        }));
        const aereo: UnifiedSchedule[] = aereoSchedules.map(s => ({
            uid: `aereo-${s.id}`, modal: 'aereo', title: `Voo ${s.voo}`, description: `${s.aeroporto_origem} → ${s.aeroporto_destino}`, status: s.status, originalId: s.id,
        }));
        return [...fluvial, ...ferroviario, ...rodoviario, ...dutoviario, ...aereo];
    }, [schedule, ferroviarioSchedules, rodoviarioSchedules, dutoviarioSchedules, aereoSchedules, handleStartLoading, handleRegisterArrival, handleStartDischarge, handleFinalizeTrip]);
    
    const onStartSplash = () => {
        setIsAppLoading(false);
        if(location.pathname === '/') {
            navigate('/dashboard');
        }
    };
    
    const handleLock = () => {
        setIsAppLoading(true);
        navigate('/');
    };
    
    if (isAppLoading) {
        return <SplashScreen onStart={onStartSplash} isDataReady={isDataReady} loadingMessage={loadingMessage} />;
    }
    
    const FluvialProgrammingScreenWrapper = ({ type }: { type: 'Balsa' | 'Navio' }) => {
        const { goalId } = useParams();
        const goal = planningGoals.find(g => g.id === Number(goalId));
        if (!goal) {
            showToast('Meta de planejamento não encontrada.', 'error');
            const path = type === 'Balsa' ? '/planning/fluvial' : '/planning/maritime';
            return <Navigate to={path} />;
        }
        return <FluvialProgrammingScreen
            planningGoal={goal}
            allPlanningGoals={planningGoals}
            schedule={schedule}
            setSchedule={setSchedule}
            vessels={vessels}
            onBackToCenter={() => navigate(type === 'Balsa' ? '/planning/fluvial' : '/planning/maritime')}
            onBackToHub={() => navigate('/planning')}
            onStartOperation={handleStartLoading}
            onRegisterArrival={handleRegisterArrival}
            onStartDischarge={handleStartDischarge}
            onFinalizeTrip={handleFinalizeTrip}
            onGenerateReport={(id) => { /* ... */ }}
            showToast={showToast}
        />;
    };
    
    const FerroviarioProgrammingScreenWrapper = () => {
        const { goalId } = useParams();
        const goal = planningGoals.find(g => g.id === Number(goalId));
        if (!goal) {
            showToast('Meta de planejamento não encontrada.', 'error');
            return <Navigate to="/planning/rail" />;
        }
        return <FerroviarioProgrammingScreen
            planningGoal={goal}
            allPlanningGoals={planningGoals}
            schedule={ferroviarioSchedules}
            setSchedule={setFerroviarioSchedules}
            onBackToCenter={() => navigate('/planning/rail')}
            onBackToHub={() => navigate('/planning')}
            onStartOperation={(id: number) => {}}
            showToast={showToast}
        />;
    };

    return (
        <div className="min-h-screen md:pl-20">
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-40 flex items-center px-4">
                <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(true)}>
                    <MenuIcon className="h-6 w-6" />
                </Button>
                <h1 className="text-lg font-bold ml-4">Blue Multimodal</h1>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} action={toast.action} />}
            
            <Header
                theme={theme}
                setTheme={setTheme}
                onLock={handleLock}
                notifications={notifications}
                setNotifications={setNotifications}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
            />

            <main className="transition-all duration-300 pt-16 md:pt-0">
                 <Routes>
                    <Route path="/dashboard" element={<DashboardScreen vessels={vessels} schedule={schedule} />} />
                    
                    <Route path="/planning" element={<MultimodalPlanningScreen />} />
                    <Route path="/planning/pipeline" element={<DutoviarioPlanningScreen onBack={() => navigate('/planning')} setSchedules={setDutoviarioSchedules} showToast={showToast} />} />
                    <Route path="/planning/rail" element={<FerroviarioProgrammingScreenWrapper />} />
                    
                    <Route path="/planning/fluvial" element={<FluvialPlanningCenterScreen
                        planningGoals={planningGoals.filter(p => p.modal === 'fluvial')} setPlanningGoals={setPlanningGoals}
                        schedules={schedule} setSchedules={setSchedule} vessels={vessels} allPlanningGoals={planningGoals}
                        onViewProgramming={(goalId) => navigate(`/planning/fluvial/${goalId}`)} planningType="Balsa"
                        onBack={() => navigate('/planning')} showToast={showToast} appSettings={appSettings}
                        onStartOperation={handleStartLoading} onRegisterArrival={handleRegisterArrival} onStartDischarge={handleStartDischarge} onFinalizeTrip={handleFinalizeTrip}
                    />} />
                    <Route path="/planning/fluvial/:goalId" element={<FluvialProgrammingScreenWrapper type="Balsa" />} />

                    <Route path="/planning/maritime" element={<FluvialPlanningCenterScreen
                        planningGoals={planningGoals.filter(p => p.modal === 'maritimo')} setPlanningGoals={setPlanningGoals}
                        schedules={schedule} setSchedules={setSchedule} vessels={vessels} allPlanningGoals={planningGoals}
                        onViewProgramming={(goalId) => navigate(`/planning/maritime/${goalId}`)} planningType="Navio"
                        onBack={() => navigate('/planning')} showToast={showToast} appSettings={appSettings}
                        onStartOperation={handleStartLoading} onRegisterArrival={handleRegisterArrival} onStartDischarge={handleStartDischarge} onFinalizeTrip={handleFinalizeTrip}
                    />} />
                    <Route path="/planning/maritime/:goalId" element={<FluvialProgrammingScreenWrapper type="Navio" />} />

                    <Route path="/planning/road" element={<RodoviarioPlanningScreen onBack={() => navigate('/planning')} schedules={rodoviarioSchedules} setSchedules={setRodoviarioSchedules} showToast={showToast} />} />
                    <Route path="/planning/air" element={<AereoPlanningScreen onBack={() => navigate('/planning')} schedules={aereoSchedules} setSchedules={setAereoSchedules} showToast={showToast} />} />
                    
                    <Route path="/operations-hub" element={<OperationsHubScreen unifiedSchedules={unifiedSchedules} onNewOperation={() => navigate('/operation')} />} />
                    <Route path="/operation" element={<OperationScreen
                        operationDetails={operationDetails} setOperationDetails={setOperationDetails} tanks={tanks} setSignatures={setSignatures}
                        vessels={vessels} signatures={signatures} analysisResult={analysisResult} isAnalyzing={isAnalyzing}
                        onAddTank={addTank} onUpdateTank={updateTank} onDeleteTank={deleteTank} onDuplicateTank={duplicateTank}
                        onCalcAll={calculateAllTanks} onAIAnalysis={handleAIAnalysis} onSave={saveOperation} onLoad={loadOperation} onNew={newOperation} onConclude={concludeOperation}
                        onExport={() => exportToCsv(operationDetails, tanks, signatures, vessels)}
                        onReport={() => { const html = generateReportHtml(operationDetails, tanks, signatures, vessels); const win = window.open("", "Relatório"); win?.document.write(html); win?.document.close(); }}
                        activeSchedule={activeScheduleForOperation} onUpdateSchedule={(updated) => setSchedule(prev => prev.map(s => s.id === updated.id ? updated : s))}
                        activeOperationType={activeOperationType} onBack={() => navigate('/operations-hub')} appSettings={appSettings}
                    />} />
                    
                    <Route path="/stock-control" element={<StockControlScreen locations={locations} stockTransactions={stockTransactions} setStockTransactions={setStockTransactions} showToast={showToast} />} />
                    <Route path="/cost-control" element={<CostControlScreen costItems={costItems} setCostItems={setCostItems} allSchedules={unifiedSchedules} unitCosts={unitCosts} setUnitCosts={setUnitCosts} showToast={showToast} />} />
                    
                    <Route path="/registration-hub" element={<RegistrationHubScreen
                        locations={locations} setLocations={setLocations} simpleAssets={simpleAssets} setSimpleAssets={setSimpleAssets}
                        vessels={vessels} setVessels={setVessels} onEditVessel={(id) => navigate(`/registration-hub/vessel/${id}`)}
                        onDeleteVessel={handleDeleteVessel} showToast={showToast}
                    />} />
                    <Route path="/registration-hub/vessel/:id" element={<VesselScreen 
                        vessel={vessels.find(v => v.id === Number(useParams().id))}
                        onSave={handleSaveVessel}
                        onBack={() => navigate('/registration-hub')}
                        showToast={showToast}
                    />} />
                    
                    <Route path="/backoffice" element={<BackofficeScreen orders={orders} setOrders={setOrders} showToast={showToast} />} />
                    <Route path="/settings" element={<SettingsScreen 
                        onCreateBackup={handleCreateBackup} onRestoreBackup={handleRestoreFileSelect}
                        onResetSystem={() => setIsResetConfirmOpen(true)} appSettings={appSettings} setAppSettings={setAppSettings} showToast={showToast}
                    />} />
                    <Route path="/reports" element={<ReportsScreen 
                        fluvialSchedules={schedule} ferroviarioSchedules={ferroviarioSchedules} rodoviarioSchedules={rodoviarioSchedules}
                        dutoviarioSchedules={dutoviarioSchedules} aereoSchedules={aereoSchedules}
                    />} />

                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </main>

            <ConfirmationModal isOpen={isRestoreConfirmOpen} onClose={() => setIsRestoreConfirmOpen(false)} onConfirm={confirmRestoreBackup} title="Confirmar Restauração" confirmText="Sim, Restaurar" variant="destructive">
                <p>Você tem certeza que deseja restaurar o sistema a partir deste backup?</p>
                <p className="font-bold text-destructive">Atenção: Todos os dados atuais serão PERMANENTEMENTE substituídos pelos dados do arquivo de backup.</p>
            </ConfirmationModal>
            <ConfirmationModal isOpen={isResetConfirmOpen} onClose={() => setIsResetConfirmOpen(false)} onConfirm={handleResetSystem} title="Confirmar Reinicialização do Sistema" confirmText="Sim, Apagar Tudo" variant="destructive">
                <p>Você tem certeza que deseja apagar TODOS os dados do sistema?</p>
                <p className="font-bold text-destructive">Esta ação é irreversível e não pode ser desfeita.</p>
            </ConfirmationModal>
        </div>
    );
};

export default App;