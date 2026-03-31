import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Vessel, VesselTank, CalibrationPoint, MeasurementLog, MeasurementOperationType, EquipmentType } from '../types';
import { analyzeGaugingCertificate } from '../services/geminiService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Loader2Icon, Wand2Icon, PlusCircleIcon, Trash2Icon, XIcon, ChevronDownIcon, ChevronUpIcon } from '../components/ui/icons';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Textarea } from '../components/ui/Textarea';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { numberToBr, brToNumber } from '../utils/helpers';
import { interpolate } from '../services/calculationService';

// --- HELPER FUNCTIONS ---

const createNewVessel = (): Vessel => ({
    id: Date.now(), // This ID is temporary and will be finalized by the parent on the first save
    name: '',
    type: 'balsa-tanque',
    certificateNumber: '',
    issueDate: '',
    expiryDate: '',
    executor: '',
    owner: '',
    notes: '',
    totalTheoreticalCapacity: 0,
    tanks: []
});

const sanitizeVesselData = (data: Partial<Vessel>): Vessel => {
    const tanks = (Array.isArray(data.tanks) ? data.tanks as any[] : [])
        .filter((t): t is Partial<VesselTank> => !!(t && typeof t === 'object' && t.tankName))
        .map((tank, index) => ({
            id: tank.id || Date.now() + index,
            externalId: tank.externalId || '',
            tankName: tank.tankName!,
            maxCalibratedHeight: typeof tank.maxCalibratedHeight === 'number' ? tank.maxCalibratedHeight : 0,
            maxVolume: typeof tank.maxVolume === 'number' ? tank.maxVolume : 0,
            calibrationCurve: (Array.isArray(tank.calibrationCurve) ? (tank.calibrationCurve as any[]) : [])
                .filter((row: unknown): row is Record<string, unknown> => !!(row && typeof row === 'object'))
                .map((p: Record<string, unknown>): CalibrationPoint => ({
                    height: typeof p['height'] === 'number' ? p['height'] : 0,
                    trim: typeof p['trim'] === 'number' ? p['trim'] : 0,
                    volume: typeof p['volume'] === 'number' ? p['volume'] : 0,
                })),
        }));

    return {
        id: data.id || Date.now(),
        externalId: data.externalId || '',
        name: data.name || 'Nova Embarcação',
        type: data.type || 'balsa-tanque',
        owner: data.owner || '',
        totalTheoreticalCapacity: data.totalTheoreticalCapacity || 0,
        certificateNumber: data.certificateNumber || '',
        issueDate: data.issueDate || '',
        expiryDate: data.expiryDate || '',
        executor: data.executor || '',
        notes: data.notes || '',
        tanks: tanks,
    };
};

// --- CHILD COMPONENTS ---

const TankConfigurationEditorModal: React.FC<{
    tank: VesselTank;
    onSave: (updatedTank: VesselTank) => void;
    onClose: () => void;
}> = ({ tank, onSave, onClose }) => {
    const [localTank, setLocalTank] = useState(tank);
    const [pasteData, setPasteData] = useState('');

    const handleFieldChange = (field: keyof VesselTank, value: any) => {
        setLocalTank(prev => ({ ...prev, [field]: value }));
    };

    const handleCurveChange = (index: number, field: keyof CalibrationPoint, value: string) => {
        setLocalTank(prev => ({
            ...prev,
            calibrationCurve: prev.calibrationCurve.map((point, i) => {
                if (i === index) {
                    const numValue = parseFloat(value.replace(',', '.'));
                    return {
                        ...point,
                        [field]: isFinite(numValue) ? numValue : 0,
                    };
                }
                return point;
            })
        }));
    };
    
    const handleProcessPaste = () => {
        const lines = pasteData.split('\n').filter(l => l.trim());
        const updatedTankData: Partial<Omit<VesselTank, 'id' | 'calibrationCurve'>> = {};
        const newCalibrationCurve: CalibrationPoint[] = [];
        let tankIdFromData: string | null = null;

        try {
            lines.forEach(line => {
                const parts = line.split(';').map(p => p.trim());
                const type = parts[0];

                if (type === 'TANQUE') {
                    const [, , tankId, tankName, maxHeight, maxVolume] = parts;
                    tankIdFromData = tankId;
                    updatedTankData.tankName = tankName;
                    updatedTankData.maxCalibratedHeight = parseInt(maxHeight, 10) || 0;
                    updatedTankData.maxVolume = parseInt(maxVolume, 10) || 0;
                } else if (type === 'CALIBRACAO') {
                    const [, tankId, trimStr, heightStr, volumeStr] = parts;
                    if (tankIdFromData === null || tankId === tankIdFromData) {
                        const trim = parseInt(trimStr.replace('+', ''), 10);
                        const height = parseFloat(heightStr.replace(',', '.'));
                        const volume = parseInt(volumeStr, 10);
                        if (!isNaN(trim) && !isNaN(height) && !isNaN(volume)) {
                            newCalibrationCurve.push({ trim, height, volume });
                        }
                    }
                }
            });

            if (Object.keys(updatedTankData).length === 0 && newCalibrationCurve.length === 0) {
                alert("Nenhum dado válido de TANQUE ou CALIBRACAO encontrado no texto.");
                return;
            }

            if (tankIdFromData && localTank.externalId && tankIdFromData !== localTank.externalId) {
                if (!window.confirm(`Atenção: Os dados colados parecem ser para um tanque diferente (${tankIdFromData}). Deseja aplicá-los a este tanque (${localTank.tankName}) mesmo assim?`)) {
                    return;
                }
            }

            setLocalTank(prev => ({
                ...prev,
                ...updatedTankData,
                calibrationCurve: newCalibrationCurve.length > 0 ? newCalibrationCurve.sort((a,b) => a.height - b.height || a.trim - b.trim) : prev.calibrationCurve,
            }));
            
            setPasteData(''); // Clear textarea
            alert('Dados processados. Verifique as informações e clique em "Salvar Tanque" para confirmar.');

        } catch (error) {
            alert('Erro ao processar os dados. Verifique o formato do texto colado.');
            console.error(error);
        }
    };


    const addCurvePoint = () => {
        const newPoint: CalibrationPoint = { height: 0, trim: 0, volume: 0 };
        setLocalTank(prev => ({...prev, calibrationCurve: [...prev.calibrationCurve, newPoint]}));
    };
    
    const removeCurvePoint = (index: number) => {
        setLocalTank(prev => ({...prev, calibrationCurve: prev.calibrationCurve.filter((_, i) => i !== index)}));
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-4xl m-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Editando Tanque: {tank.tankName}</h2>
                    <button onClick={onClose}><XIcon className="h-5 w-5"/></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-4">
                        <Input label="Nome do Tanque" value={localTank.tankName} onChange={e => handleFieldChange('tankName', e.target.value)} containerClassName="col-span-2" />
                        <Input label="ID de Importação" value={localTank.externalId || 'N/A'} disabled containerClassName="col-span-2" />
                        <Input label="Altura Máx. Calibrada (cm)" type="number" value={localTank.maxCalibratedHeight || ''} onChange={e => handleFieldChange('maxCalibratedHeight', parseFloat(e.target.value))} containerClassName="col-span-2" />
                        <Input label="Volume Máximo (L)" type="number" value={localTank.maxVolume || ''} onChange={e => handleFieldChange('maxVolume', parseFloat(e.target.value))} containerClassName="col-span-2" />
                    </div>

                    <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
                        <h4 className="text-md font-semibold">Atualização Rápida por Texto</h4>
                        <Textarea 
                            value={pasteData}
                            onChange={(e) => setPasteData(e.target.value)}
                            placeholder="Cole aqui os dados de um único tanque (linhas TANQUE; e CALIBRACAO;)"
                            className="font-mono text-xs min-h-[100px]"
                            aria-label="Colar dados para atualização rápida"
                        />
                        <Button onClick={handleProcessPaste} variant="secondary" size="sm" disabled={!pasteData.trim()}>
                            Processar Dados Colados
                        </Button>
                    </div>

                    <h3 className="text-md font-semibold pt-2">Curva de Calibração</h3>
                    <div className="max-h-64 overflow-y-auto border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-secondary">
                                <tr>
                                    <th className="p-2 text-left">Altura (cm)</th>
                                    <th className="p-2 text-left">Trim</th>
                                    <th className="p-2 text-left">Volume (L)</th>
                                    <th className="p-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {localTank.calibrationCurve.map((point, index) => (
                                    <tr key={index} className="border-b last:border-0">
                                        <td><Input type="text" value={String(point.height || '').replace('.',',')} onChange={e => handleCurveChange(index, 'height', e.target.value)} className="rounded-none border-0 border-r"/></td>
                                        <td><Input type="text" value={String(point.trim || '').replace('.',',')} onChange={e => handleCurveChange(index, 'trim', e.target.value)} className="rounded-none border-0 border-r"/></td>
                                        <td><Input type="text" value={String(point.volume || '').replace('.',',')} onChange={e => handleCurveChange(index, 'volume', e.target.value)} className="rounded-none border-0 border-r"/></td>
                                        <td className="text-center"><Button variant="ghost" size="sm" onClick={() => removeCurvePoint(index)}><Trash2Icon className="h-4 w-4 text-destructive"/></Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     <Button variant="secondary" onClick={addCurvePoint} icon={<PlusCircleIcon className="h-4 w-4"/>}>Adicionar Ponto</Button>
                </div>
                <div className="p-4 border-t border-border flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={() => onSave(localTank)}>Salvar Tanque</Button>
                </div>
            </div>
        </div>
    );
};


// --- MAIN COMPONENT ---

interface VesselScreenProps {
    vessel?: Vessel;
    onSave: (vessel: Vessel) => void;
    onBack: () => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const TABS = {
    CONFIG: 'Configuração',
    QUERY: 'Consulta de Aferição',
    HISTORY: 'Histórico',
};

export const VesselScreen: React.FC<VesselScreenProps> = ({ vessel, onSave, onBack, showToast }) => {
    const isCreating = !vessel;
    const [vesselData, setVesselData] = useState<Vessel>(() => isCreating ? createNewVessel() : sanitizeVesselData(vessel!));
    const [initialState, setInitialState] = useState(() => vesselData);
    const [isDirty, setIsDirty] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
    const [tankToDelete, setTankToDelete] = useState<VesselTank | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [expandedLogRow, setExpandedLogRow] = useState<number | null>(null);

    const [editingTankId, setEditingTankId] = useState<number | null>(null);
    const [history, setHistory] = useLocalStorage<MeasurementLog[]>(`qc_history_${vessel?.id || 'new'}`, []);
    const [activeTab, setActiveTab] = useState(TABS.CONFIG);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [queryTankId, setQueryTankId] = useState<number | ''>('');
    const [queryTrim, setQueryTrim] = useState<number>(0);
    const [queryHeight, setQueryHeight] = useState<string>('');
    const [queryResult, setQueryResult] = useState<number | null>(null);

    useEffect(() => {
        setIsDirty(JSON.stringify(vesselData) !== JSON.stringify(initialState));
    }, [vesselData, initialState]);

    useEffect(() => {
        // Reset query form if vessel changes
        setQueryTankId('');
        setQueryTrim(0);
        setQueryHeight('');
        setQueryResult(null);
    }, [vesselData.id]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = ''; // Required for Chrome
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handleBack = () => {
        if (isDirty) {
            if (window.confirm('Você tem alterações não salvas. Deseja sair e descartar as alterações?')) {
                onBack();
            }
        } else {
            onBack();
        }
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!vesselData.name.trim()) errors.name = 'O nome da embarcação é obrigatório.';
        if (!vesselData.certificateNumber.trim()) errors.certificateNumber = 'O número do certificado é obrigatório.';
        if (!vesselData.issueDate) errors.issueDate = 'A data de emissão é obrigatória.';
        if (!vesselData.expiryDate) errors.expiryDate = 'A data de validade é obrigatória.';
        if (vesselData.issueDate && vesselData.expiryDate && new Date(vesselData.issueDate) > new Date(vesselData.expiryDate)) {
            errors.expiryDate = 'A data de validade deve ser posterior à data de emissão.';
        }
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = () => {
        if (saveStatus === 'saving' || !isDirty) return;
        if (!validateForm()) {
            alert("Por favor, corrija os erros no formulário antes de salvar.");
            return;
        }
        setIsSaveConfirmOpen(true);
    };

    const confirmAndSave = () => {
        setIsSaveConfirmOpen(false);
        setSaveStatus('saving');
        const sanitizedData = sanitizeVesselData(vesselData);
        onSave(sanitizedData);

        if (!isCreating) {
            setInitialState(sanitizedData);
        }
        
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }, 500);
    };

    const handleVesselDataChange = useCallback((field: keyof Vessel, value: any) => {
        setVesselData(prev => ({ ...prev, [field]: value }));
        // Clear validation error for the field being changed
        if (validationErrors[field]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    }, [validationErrors]);

    const handleAddTank = () => {
        const newTank: VesselTank = {
            id: Date.now(),
            tankName: `Novo Tanque ${vesselData.tanks.length + 1}`,
            maxCalibratedHeight: 0,
            maxVolume: 0,
            calibrationCurve: []
        };
        setVesselData(prev => ({...prev, tanks: [...prev.tanks, newTank]}));
    };

    const handleRemoveTank = (tankId: number) => {
        const tank = vesselData.tanks.find(t => t.id === tankId);
        if (tank) {
            setTankToDelete(tank);
        }
    };
    
    const confirmRemoveTank = () => {
        if (tankToDelete) {
            setVesselData(prev => ({...prev, tanks: prev.tanks.filter(t => t.id !== tankToDelete.id)}));
            setTankToDelete(null);
        }
    };

    const handleUpdateTank = (updatedTank: VesselTank) => {
        setVesselData(prev => ({...prev, tanks: prev.tanks.map(t => t.id === updatedTank.id ? updatedTank : t)}));
        setEditingTankId(null);
    };

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        if (files.length > 100) {
            alert("Você pode analisar no máximo 100 arquivos de certificado de uma vez.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setIsLoadingAI(true);
        try {
            const imagePromises = Array.from(files).map((file: File) => {
                return new Promise<{mimeType: string, data: string}>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const base64 = (e.target?.result as string).split(',')[1];
                        resolve({ mimeType: file.type, data: base64 });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            const images = await Promise.all(imagePromises);
            const extractedData = await analyzeGaugingCertificate(images);
            
            setVesselData(prev => sanitizeVesselData({ ...prev, ...extractedData, id: prev.id }));

            alert("Certificado analisado com sucesso! Os dados foram preenchidos. Revise e salve as alterações.");

        } catch (error) {
            console.error(error);
            alert((error as Error).message);
        } finally {
            setIsLoadingAI(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, []);

    const handleGaugingQuery = () => {
        if (queryTankId === '') return;
        
        const heightNum = brToNumber(queryHeight);
        if (!isFinite(heightNum)) {
            showToast('Altura inválida.', 'error');
            return;
        }

        const tank = vesselData.tanks.find(t => t.id === queryTankId);
        if (!tank) {
            showToast('Tanque não encontrado.', 'error');
            return;
        }

        const pointsForTrim = tank.calibrationCurve
            .filter(p => p.trim === queryTrim)
            .map(({ height, volume }) => ({ height, volume }));

        if (pointsForTrim.length < 2) {
            showToast(`Não há pontos de calibração suficientes para o trim ${queryTrim} neste tanque.`, 'error');
            setQueryResult(null);
            return;
        }

        const interpolatedVolume = interpolate(heightNum, pointsForTrim);
        setQueryResult(isFinite(interpolatedVolume) ? interpolatedVolume : null);
    };


    const getCertificateStatus = (expiryDate: string): { text: string; badge: string } => {
        if (!expiryDate) return { text: 'Sem Data', badge: 'bg-muted'};
        const now = new Date();
        const expiry = new Date(expiryDate);
        now.setHours(0, 0, 0, 0);
        expiry.setHours(0, 0, 0, 0);

        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { text: 'Vencido', badge: 'bg-danger-100 text-destructive' };
        if (diffDays <= 30) return { text: `Vence em ${diffDays} dias`, badge: 'bg-yellow-100 text-yellow-600' };
        return { text: 'Válido', badge: 'bg-success-100 text-green-600' };
    };
    
    const editingTank = useMemo(() => vesselData.tanks.find(t => t.id === editingTankId), [editingTankId, vesselData.tanks]);
    
    const certStatus = getCertificateStatus(vesselData.expiryDate);
    
    const saveButtonText = () => {
        if (saveStatus === 'saving') return 'Salvando...';
        if (saveStatus === 'saved') return 'Salvo!';
        return isCreating ? 'Salvar Embarcação' : 'Salvar Alterações';
    };
    
    return (
        <div>
             <div className="flex flex-wrap justify-between items-start mb-4 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{isCreating ? 'Cadastrar Nova Embarcação' : vesselData.name}</h1>
                    {!isCreating && (
                        <div className="flex items-center gap-4 text-muted-foreground mt-1">
                            <span>{vesselData.type.replace('-', ' ')}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${certStatus.badge}`}>{certStatus.text}</span>
                        </div>
                    )}
                </div>
                 <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleBack}>Voltar</Button>
                    <Button onClick={handleSave} disabled={saveStatus === 'saving' || !isDirty}>
                        {saveStatus === 'saving' && <Loader2Icon className="h-4 w-4 mr-2"/>}
                        {saveButtonText()}
                    </Button>
                </div>
            </div>
            
            <div className="border-b mb-6">
                 <nav className="flex gap-4">
                    <button
                        onClick={() => setActiveTab(TABS.CONFIG)}
                        className={`py-2 px-1 border-b-2 font-semibold transition-colors ${activeTab === TABS.CONFIG ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        {TABS.CONFIG}
                    </button>
                    {!isCreating && (
                         <>
                            <button
                                onClick={() => setActiveTab(TABS.QUERY)}
                                className={`py-2 px-1 border-b-2 font-semibold transition-colors ${activeTab === TABS.QUERY ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            >
                                {TABS.QUERY}
                            </button>
                            <button
                                onClick={() => setActiveTab(TABS.HISTORY)}
                                className={`py-2 px-1 border-b-2 font-semibold transition-colors ${activeTab === TABS.HISTORY ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            >
                                {TABS.HISTORY}
                            </button>
                        </>
                    )}
                 </nav>
            </div>

            {/* --- TABS CONTENT --- */}

            {activeTab === TABS.QUERY && !isCreating && (
                <div className="animate-fade-in">
                    <Card>
                        <h2 className="text-lg font-semibold mb-4">Consultar Volume por Aferição</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <Select
                                label="Tanque"
                                value={queryTankId}
                                onChange={e => {
                                    setQueryTankId(Number(e.target.value));
                                    setQueryResult(null);
                                }}
                                containerClassName="md:col-span-2"
                            >
                                <option value="" disabled>Selecione um tanque</option>
                                {vesselData.tanks.map(tank => (
                                    <option key={tank.id} value={tank.id}>{tank.tankName}</option>
                                ))}
                            </Select>
                            <Select
                                label="Trim"
                                value={queryTrim}
                                onChange={e => {
                                    setQueryTrim(Number(e.target.value));
                                    setQueryResult(null);
                                }}
                            >
                                <option value={50}>+50</option>
                                <option value={25}>+25</option>
                                <option value={0}>0</option>
                                <option value={-25}>-25</option>
                                <option value={-50}>-50</option>
                            </Select>
                            <Input
                                label="Altura (cm)"
                                value={queryHeight}
                                onChange={e => {
                                    setQueryHeight(e.target.value);
                                    setQueryResult(null);
                                }}
                                placeholder="Ex: 150,5"
                            />
                        </div>
                        <div className="mt-6 text-center">
                            <Button onClick={handleGaugingQuery} disabled={queryTankId === '' || !queryHeight}>
                                Consultar Volume
                            </Button>
                        </div>

                        {queryResult !== null && (
                            <div className="mt-6 p-6 bg-secondary rounded-lg text-center animate-fade-in">
                                <p className="text-sm text-muted-foreground">Volume Interpolado</p>
                                <p className="text-4xl font-bold text-primary font-mono mt-2">
                                    {numberToBr(queryResult, 2)}
                                    <span className="text-xl font-medium text-muted-foreground ml-2">L</span>
                                </p>
                            </div>
                        )}
                    </Card>
                </div>
            )}
            
            {activeTab === TABS.HISTORY && !isCreating && (
                 <div className="animate-fade-in">
                 <Card>
                    <h2 className="text-lg font-semibold mb-4">Histórico de Medições</h2>
                    {history.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            <p>Nenhum histórico de medição encontrado para esta embarcação.</p>
                        </div>
                    ) : (
                        <div className="border rounded-lg">
                            {/* Header for the list */}
                            <div className="flex items-center p-3 bg-secondary/50 text-xs font-semibold text-muted-foreground border-b">
                                <div className="w-1/4">Data/Hora</div>
                                <div className="w-1/4">Operação</div>
                                <div className="w-1/4">Produto</div>
                                <div className="w-1/4 text-right">Volume Total (L)</div>
                                <div className="w-12 flex-shrink-0"></div>
                            </div>
                            {history.map(log => (
                                <React.Fragment key={log.id}>
                                    <div 
                                        className="flex items-center p-3 border-b last:border-0 hover:bg-secondary/30 cursor-pointer"
                                        onClick={() => setExpandedLogRow(prev => prev === log.id ? null : log.id)}
                                    >
                                        <div className="w-1/4 font-mono text-sm">{new Date(log.dateTime).toLocaleString('pt-BR')}</div>
                                        <div className="w-1/4 text-sm capitalize">{log.operationType.replace(/_/g, ' ')}</div>
                                        <div className="w-1/4 text-sm capitalize">{log.product}</div>
                                        <div className="w-1/4 text-sm font-mono text-right">{numberToBr(log.totalVolume, 0)}</div>
                                        <div className="w-12 flex-shrink-0 text-center">
                                            {expandedLogRow === log.id ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                                        </div>
                                    </div>
                                    {expandedLogRow === log.id && (
                                        <div className="p-4 bg-secondary/20 border-b animate-fade-in" style={{animationDuration: '300ms'}}>
                                            <h4 className="text-sm font-semibold mb-2">Detalhes da Medição</h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-secondary/50">
                                                        <tr>
                                                            <th className="p-2 text-left">Tanque</th>
                                                            <th className="p-2 text-center">Trim</th>
                                                            <th className="p-2 text-right">Altura (cm)</th>
                                                            <th className="p-2 text-right">Volume Calculado (L)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {log.measurements.map((m, index) => (
                                                            <tr key={index} className="border-b last:border-0">
                                                                <td className="p-2">{m.tankName}</td>
                                                                <td className="p-2 text-center font-mono">{m.trim}</td>
                                                                <td className="p-2 text-right font-mono">{numberToBr(m.height, 2)}</td>
                                                                <td className="p-2 text-right font-mono font-semibold">{numberToBr(m.calculatedVolume, 0)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                 </Card>
                </div>
            )}
            
            {activeTab === TABS.CONFIG && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
                    <div className="md:col-span-1 space-y-6">
                        <Card>
                             <h3 className="text-lg font-semibold mb-4">Informações Gerais</h3>
                             <div className="space-y-4">
                                <Input label="Nome da Embarcação" value={vesselData.name} onChange={e => handleVesselDataChange('name', e.target.value)} error={validationErrors.name} />
                                <Select label="Tipo de Equipamento" value={vesselData.type} onChange={e => handleVesselDataChange('type', e.target.value as EquipmentType)}>
                                    <option value="balsa-tanque">Balsa-tanque</option>
                                    <option value="balsa-granel">Balsa-granel</option>
                                    <option value="navio-tanque">Navio-tanque</option>
                                    <option value="navio-granel">Navio-granel</option>
                                </Select>
                                 <Input label="Proprietário" value={vesselData.owner || ''} onChange={e => handleVesselDataChange('owner', e.target.value)} />
                                 <Input label="ID de Importação (Opcional)" value={vesselData.externalId || ''} onChange={e => handleVesselDataChange('externalId', e.target.value)} />
                                <Textarea label="Observações" value={vesselData.notes || ''} onChange={e => handleVesselDataChange('notes', e.target.value)} />
                             </div>
                        </Card>
                        <Card>
                             <h3 className="text-lg font-semibold mb-4">Certificado de Arqueação</h3>
                             <div className="space-y-4">
                                <Input label="Nº do Certificado" value={vesselData.certificateNumber} onChange={e => handleVesselDataChange('certificateNumber', e.target.value)} error={validationErrors.certificateNumber} />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Data de Emissão" type="date" value={vesselData.issueDate} onChange={e => handleVesselDataChange('issueDate', e.target.value)} error={validationErrors.issueDate} />
                                    <Input label="Data de Validade" type="date" value={vesselData.expiryDate} onChange={e => handleVesselDataChange('expiryDate', e.target.value)} error={validationErrors.expiryDate} />
                                </div>
                                <Input label="Executor" value={vesselData.executor} onChange={e => handleVesselDataChange('executor', e.target.value)} />
                                 <div>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" multiple />
                                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full" disabled={isLoadingAI}>
                                        {isLoadingAI ? <Loader2Icon className="h-4 w-4 mr-2" /> : <Wand2Icon className="h-4 w-4 mr-2" />}
                                        {isLoadingAI ? 'Analisando...' : 'Analisar Certificado com IA'}
                                    </Button>
                                     <p className="text-xs text-muted-foreground mt-2 text-center">Envie uma imagem ou PDF do certificado para preencher os dados automaticamente.</p>
                                </div>
                             </div>
                        </Card>
                    </div>
                    <div className="md:col-span-2">
                         <Card>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Configuração de Tanques</h3>
                                <Button onClick={handleAddTank} icon={<PlusCircleIcon className="h-4 w-4"/>} size="sm">Adicionar Tanque</Button>
                            </div>
                            <div className="space-y-3">
                                {vesselData.tanks.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-4">Nenhum tanque adicionado.</p>
                                ) : (
                                    vesselData.tanks.map(tank => (
                                        <div key={tank.id} className="bg-secondary/50 p-3 rounded-lg flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">{tank.tankName}</p>
                                                <p className="text-xs text-muted-foreground">{tank.calibrationCurve.length} pontos na curva de calibração.</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="secondary" size="sm" onClick={() => setEditingTankId(tank.id)}>Configurar</Button>
                                                <Button variant="ghost" size="sm" className="!p-2" onClick={() => handleRemoveTank(tank.id)}><Trash2Icon className="h-4 w-4 text-destructive"/></Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                         </Card>
                    </div>
                </div>
            )}

            {editingTank && (
                <TankConfigurationEditorModal
                    tank={editingTank}
                    onSave={handleUpdateTank}
                    onClose={() => setEditingTankId(null)}
                />
            )}
            
            <ConfirmationModal
                isOpen={isSaveConfirmOpen}
                onClose={() => setIsSaveConfirmOpen(false)}
                onConfirm={confirmAndSave}
                title="Confirmar Alterações"
                variant="default"
                confirmText="Sim, Salvar"
            >
                <p>Você está prestes a salvar as alterações na embarcação <strong className="text-foreground">{vesselData.name}</strong>. Deseja continuar?</p>
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={!!tankToDelete}
                onClose={() => setTankToDelete(null)}
                onConfirm={confirmRemoveTank}
                title="Confirmar Exclusão de Tanque"
            >
                <p>Tem certeza que deseja remover o tanque <strong className="text-foreground">{tankToDelete?.tankName}</strong>? Todos os dados de calibração associados serão perdidos.</p>
            </ConfirmationModal>
        </div>
    );
};