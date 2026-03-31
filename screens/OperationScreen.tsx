import React, { useState, useEffect, useCallback } from 'react';
import { OperationDetails, Signatures, Tank, Vessel, OperationStatus, VesselSchedule, VesselScheduleLifecycleStatus, AppSettings } from '../types';
import { OperationDetailsForm } from '../components/operation/OperationDetailsForm';
import { MainActions } from '../components/actions/MainActions';
import { TankList } from '../components/tank/TankList';
import { SummaryBar } from '../components/summary/SummaryBar';
import { SignatureSection } from '../components/signatures/SignatureSection';
import { AIAnalyst } from '../components/ai/AIAnalyst';
import { OperationActions } from '../components/operation/OperationActions';
import { SidebarTabs } from '../components/sidebar/SidebarTabs';
import { BarChart3Icon, PenSquareIcon, Wand2Icon } from '../components/ui/icons';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { brToNumber, numberToBr } from '../utils/helpers';
import { Button } from '../components/ui/Button';
import { Breadcrumb } from '../components/ui/Breadcrumb';

interface OperationScreenProps {
    operationDetails: OperationDetails;
    setOperationDetails: (details: OperationDetails) => void;
    tanks: Tank[];
    vessels: Vessel[];
    signatures: Signatures;
    setSignatures: React.Dispatch<React.SetStateAction<Signatures>>;
    analysisResult: string;
    isAnalyzing: boolean;
    onAddTank: () => void;
    onUpdateTank: (id: number, updatedTank: Tank) => void;
    onDeleteTank: (id: number) => void;
    onDuplicateTank: (id: number) => void;
    onCalcAll: () => void;
    onAIAnalysis: (prompt: string) => void;
    onSave: () => void;
    onLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onNew: () => void;
    onExport: () => void;
    onReport: () => void;
    onConclude: () => void;
    activeSchedule: VesselSchedule | null;
    onUpdateSchedule: (updatedSchedule: VesselSchedule) => void;
    activeOperationType: 'loading' | 'unloading' | null;
    onBack: () => void;
    appSettings: AppSettings;
}

const statusConfig: { [key in OperationStatus]: { text: string; className: string } } = {
    pendente: { text: 'Pendente', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
    em_andamento: { text: 'Em Andamento', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
    concluida: { text: 'Concluída', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
    cancelada: { text: 'Cancelada', className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
};


const RealizadoCard: React.FC<{
    details: OperationDetails;
    onUpdate: (field: keyof OperationDetails, value: string) => void;
    schedule: VesselSchedule;
    tanks: Tank[];
}> = ({ details, onUpdate, schedule, tanks }) => {
    const plannedVol = brToNumber(schedule.plannedVolume || '0');
    const loadedVol = tanks.reduce((sum, t) => sum + (t.results.v20 || 0), 0);
    
    return (
        <Card>
            <h2 className="text-lg font-semibold mb-4 text-foreground">Dados Realizados (CARREGAMENTO)</h2>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="ATA (Chegada na área)" type="datetime-local" value={details.ata || ''} onChange={e => onUpdate('ata', e.target.value)}/>
                    <Input label="ATB (Atracação)" type="datetime-local" value={details.atb || ''} onChange={e => onUpdate('atb', e.target.value)}/>
                    <Input label="ATS (Início Operação)" type="datetime-local" value={details.ats || ''} onChange={e => onUpdate('ats', e.target.value)}/>
                    <Input label="ATC_FINISH (Término Operação)" type="datetime-local" value={details.atcFinish || ''} onChange={e => onUpdate('atcFinish', e.target.value)}/>
                    <Input label="ATD (Saída do berço)" type="datetime-local" value={details.atd || ''} onChange={e => onUpdate('atd', e.target.value)} containerClassName="md:col-span-2"/>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                    <h3 className="font-semibold mb-2">Resumo de Volumes</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                            <p className="text-xs text-muted-foreground">Volume Previsto (L)</p>
                            <p className="font-mono font-semibold">{numberToBr(plannedVol, 0)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Volume Carregado (L)</p>
                            <p className="font-mono font-semibold">{numberToBr(loadedVol, 0)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const DischargeSummaryCard: React.FC<{
    schedule: VesselSchedule;
    tanks: Tank[];
}> = ({ schedule, tanks }) => {
    const totalLoaded = brToNumber(schedule.loadedVolume || '0');
    const totalAlreadyDischarged = schedule.discharges?.reduce((sum, d) => sum + d.totalDischargedVolume, 0) || 0;
    const volumeOnboard = totalLoaded - totalAlreadyDischarged;
    const volumeThisDischarge = tanks.reduce((sum, t) => sum + brToNumber(t.dischargedVolume || '0'), 0);

    return (
        <Card>
            <h2 className="text-lg font-semibold mb-4 text-foreground">Dados Realizados (DESCARGA)</h2>
             <div className="p-4 bg-secondary rounded-lg">
                <h3 className="font-semibold mb-2">Resumo da Descarga</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                        <p className="text-xs text-muted-foreground">Volume a Bordo (L)</p>
                        <p className="font-mono font-semibold text-lg">{numberToBr(volumeOnboard, 0)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Volume nesta Descarga (L)</p>
                        <p className="font-mono font-semibold text-lg text-primary">{numberToBr(volumeThisDischarge, 0)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Volume Restante (L)</p>
                        <p className="font-mono font-semibold text-lg">{numberToBr(volumeOnboard - volumeThisDischarge, 0)}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const CheckIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const OperationProgressBar: React.FC<{ currentStatus: VesselScheduleLifecycleStatus }> = ({ currentStatus }) => {
    const steps: { status: VesselScheduleLifecycleStatus; label: string }[] = [
        { status: 'PLANEJADO', label: 'Planejado' },
        { status: 'AGUARDANDO CARREGAMENTO', label: 'Aguard. Carreg.' },
        { status: 'EM CARREGAMENTO', label: 'Carregamento' },
        { status: 'EM TRÂNSITO', label: 'Trânsito' },
        { status: 'AGUARDANDO DESCARGA', label: 'Aguard. Descarga' },
        { status: 'EM DESCARGA', label: 'Descarga' },
        { status: 'CONCLUÍDO', label: 'Concluído' },
    ];
    const currentStepIndex = steps.findIndex(s => s.status === currentStatus);

    return (
        <div>
            <h3 className="text-lg font-semibold mb-6 text-foreground">Andamento da Operação</h3>
            <div className="flex items-start">
                {steps.map((step, index) => {
                    const isCompleted = currentStepIndex > index;
                    const isCurrent = currentStepIndex === index;

                    return (
                        <React.Fragment key={step.status}>
                            <div className="flex flex-col items-center text-center">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                                    isCompleted ? 'bg-primary border-primary text-primary-foreground' : 
                                    isCurrent ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/50' : 
                                    'bg-secondary border-border'
                                }`}>
                                    {isCompleted ? <CheckIcon className="w-5 h-5"/> : <span className={`font-bold ${isCurrent ? 'animate-pulse' : ''}`}>{index + 1}</span>}
                                </div>
                                <p className={`mt-2 text-xs font-medium w-20 ${isCurrent ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{step.label}</p>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`flex-auto h-1 mt-5 transition-colors duration-300 ${
                                    isCompleted ? 'bg-primary' : 'bg-border'
                                }`}></div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};


export const OperationScreen: React.FC<OperationScreenProps> = (props) => {
    const { 
        operationDetails, setOperationDetails, tanks, vessels, signatures, setSignatures,
        analysisResult, isAnalyzing, onAddTank, onUpdateTank, onDeleteTank, onDuplicateTank,
        onCalcAll, onAIAnalysis, onSave, onLoad, onNew, onExport, onReport, onConclude,
        activeSchedule, onUpdateSchedule, activeOperationType, onBack, appSettings
    } = props;
    
    const [isConcludeModalOpen, setIsConcludeModalOpen] = useState(false);
    const [operationErrors, setOperationErrors] = useState<Partial<Record<keyof OperationDetails, string>>>({});
    const [tankErrors, setTankErrors] = useState<Record<number, Partial<Record<keyof Tank, string>>>>({});


    const validateOperationDetails = useCallback((detailsToValidate: OperationDetails) => {
        const errors: Partial<Record<keyof OperationDetails, string>> = {};
        if (!detailsToValidate.id.trim()) errors.id = 'O ID da operação é obrigatório.';
        if (!detailsToValidate.responsavel.trim()) errors.responsavel = 'O responsável é obrigatório.';
        if (!detailsToValidate.terminal.trim()) errors.terminal = 'O terminal é obrigatório.';
        if (!detailsToValidate.local.trim()) errors.local = 'O local é obrigatório.';
        if (!detailsToValidate.dateTime) errors.dateTime = 'A data/hora é obrigatória.';
        setOperationErrors(errors);
        return Object.keys(errors).length === 0;
    }, []);

    const validateTankField = useCallback((tankId: number, fieldName: keyof Tank, value: string): boolean => {
        let error = '';
        const numValue = brToNumber(value);
        const tank = tanks.find(t => t.id === tankId);
        if (!tank || tank.isEmpty) return true;

        const isLiquidProduct = tank.prod === 'anidro' || tank.prod === 'hidratado';
        
        if (['ident', 'tanque'].includes(fieldName) && !tank.vesselTankId && !value.trim()) {
            error = 'Campo obrigatório.';
        }
        
        if (isLiquidProduct) {
            if (fieldName === 'vamb') {
                if (!value.trim()) error = 'Volume é obrigatório.';
                else if (!isFinite(numValue) || numValue < 0) error = 'Deve ser um número positivo.';
            }
            if (fieldName === 'rho' || fieldName === 'Ta') {
                if (!value.trim()) error = 'Campo obrigatório.';
                else if (!isFinite(numValue)) error = 'Deve ser um número válido.';
            }
            if (fieldName === 'Tt' && value.trim() && !isFinite(numValue)) {
                error = 'Deve ser um número válido.';
            }
        }
        
        if (tank.vesselTankId) {
            if (['alturaMedidaCm', 'lastroMm'].includes(fieldName)) {
                if (!value.trim()) error = 'Campo obrigatório.';
                else if (!isFinite(numValue) || numValue < 0) error = 'Deve ser um número positivo.';
            }
        }

        setTankErrors(prev => {
            const newErrors = { ...prev };
            const currentTankErrors = { ...(newErrors[tankId] || {}) };
            if (error) {
                currentTankErrors[fieldName] = error;
            } else {
                delete currentTankErrors[fieldName];
            }
            if(Object.keys(currentTankErrors).length > 0) {
                newErrors[tankId] = currentTankErrors;
            } else {
                delete newErrors[tankId];
            }
            return newErrors;
        });

        return !error;
    }, [tanks]);

    const clearTankError = useCallback((tankId: number, fieldName: keyof Tank) => {
        setTankErrors(prev => {
            const newErrors = { ...prev };
            if (newErrors[tankId] && newErrors[tankId][fieldName]) {
                delete newErrors[tankId][fieldName];
                if (Object.keys(newErrors[tankId]).length === 0) {
                    delete newErrors[tankId];
                }
            }
            return newErrors;
        });
    }, []);

    const handleConcludeClick = () => {
        const isDetailsValid = validateOperationDetails(operationDetails);
        
        let allTanksValid = true;
        tanks.forEach(tank => {
            const fieldsToValidate: (keyof Tank)[] = ['ident', 'tanque', 'vamb', 'rho', 'Ta', 'alturaMedidaCm', 'lastroMm'];
            fieldsToValidate.forEach(field => {
                const value = String(tank[field] || '');
                if (!validateTankField(tank.id, field, value)) {
                    allTanksValid = false;
                }
            });
        });

        if (!isDetailsValid || !allTanksValid) {
            alert("Existem erros de validação no formulário. Por favor, corrija os campos marcados em vermelho.");
            return;
        }

        if (tanks.length === 0 || tanks.every(t => t.results.status === 'PENDING' && !t.isEmpty)) {
             if (activeOperationType !== 'unloading') {
                alert("Não é possível concluir uma operação vazia ou sem tanques calculados.");
                return;
             }
        }
        setIsConcludeModalOpen(true);
    };

    const confirmConclusion = () => {
        onConclude();
        setIsConcludeModalOpen(false);
    };

    const handleScheduleChange = (field: keyof VesselSchedule, value: string) => {
        if (activeSchedule) {
            onUpdateSchedule({ ...activeSchedule, [field]: value });
        }
    };
    
    const handleDetailsChange = (field: keyof OperationDetails, value: string) => {
        setOperationDetails({ ...operationDetails, [field]: value });
    };

    const sidebarTabs = [
        {
            title: 'Resumo',
            icon: <BarChart3Icon className="h-4 w-4" />,
            content: <SummaryBar tanks={tanks} appSettings={appSettings} />,
        },
        {
            title: 'Assinaturas',
            icon: <PenSquareIcon className="h-4 w-4" />,
            content: <SignatureSection signatures={signatures} setSignatures={setSignatures} />,
        },
        {
            title: 'Análise IA',
            icon: <Wand2Icon className="h-4 w-4" />,
            content: <AIAnalyst onAnalyze={onAIAnalysis} result={analysisResult} isLoading={isAnalyzing} />,
        },
    ];

    const breadcrumbItems = [
        { label: 'Central de Operações', onClick: onBack },
        { label: operationDetails.id || 'Nova Operação' }
    ];

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <Breadcrumb items={breadcrumbItems} />
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                 <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">{operationDetails.id || 'Nova Operação'}</h1>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusConfig[operationDetails.status].className}`}>
                        {statusConfig[operationDetails.status].text}
                    </span>
                </div>
                <OperationActions onSave={onSave} onLoad={onLoad} onNew={onNew} onConclude={handleConcludeClick} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <OperationDetailsForm
                        details={operationDetails}
                        setDetails={setOperationDetails}
                        vessels={vessels}
                        errors={operationErrors}
                        setErrors={setOperationErrors}
                    />
                    
                    {activeSchedule && activeOperationType === 'loading' && (
                        <RealizadoCard details={operationDetails} onUpdate={handleDetailsChange} schedule={activeSchedule} tanks={tanks} />
                    )}
                    
                    {activeSchedule && activeOperationType === 'unloading' && (
                        <DischargeSummaryCard schedule={activeSchedule} tanks={tanks} />
                    )}

                    <MainActions
                        onAddTank={onAddTank}
                        onCalcAll={onCalcAll}
                        onExport={onExport}
                        onReport={onReport}
                        isVesselOperation={!!operationDetails.vesselId}
                    />
                    <TankList
                        tanks={tanks}
                        operationDetails={operationDetails}
                        onUpdate={onUpdateTank}
                        onDelete={onDeleteTank}
                        onDuplicate={onDuplicateTank}
                        activeOperationType={activeOperationType}
                        tankErrors={tankErrors}
                        onValidateTankField={validateTankField}
                        onClearTankError={clearTankError}
                    />
                </div>
                <div className="lg:col-span-1 space-y-6">
                     {activeSchedule && (
                        <Card>
                            <OperationProgressBar currentStatus={activeSchedule.status} />
                        </Card>
                    )}
                    <SidebarTabs tabs={sidebarTabs} />
                </div>
            </div>

            <ConfirmationModal
                isOpen={isConcludeModalOpen}
                onClose={() => setIsConcludeModalOpen(false)}
                onConfirm={confirmConclusion}
                title="Confirmar Conclusão da Operação"
                confirmText="Sim, Concluir"
                variant="default"
            >
                <p>Você tem certeza que deseja concluir a operação <strong className="text-foreground">{operationDetails.id}</strong>?</p>
                <p>Esta ação irá arquivar a operação atual e limpar a tela para uma nova.</p>
            </ConfirmationModal>
        </main>
    );
};
