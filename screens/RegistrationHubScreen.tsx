
import React, { useState, useMemo, SetStateAction, useRef } from 'react';
import { Location, LocationType, SimpleAsset, SimpleAssetType, Vessel, EquipmentType, VesselTank, CalibrationPoint, MeasurementLog, MeasurementOperationType } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PlusCircleIcon, XIcon, PenSquareIcon, Trash2Icon, ShipIcon, DatabaseIcon, MapPinIcon } from '../components/ui/icons';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { brToNumber } from '../utils/helpers';

const locationTypeLabels: Record<LocationType, string> = {
    'armazem-granel': 'Armazém de Graneis',
    'terminal-liquido': 'Terminal de Líquidos',
    'recinto-alfandegado': 'Recinto Alfandegado',
};

const simpleAssetTypeLabels: Record<SimpleAssetType, string> = {
    'tanque-terra': 'Tanque de Terra',
    'vagao-tanque': 'Vagão-tanque',
    'vagao-granel': 'Vagão-granel',
    'container': 'Container',
};

type ModalState = {
    isOpen: boolean;
    type: 'location' | 'asset' | null;
    data: Location | SimpleAsset | null;
};

type DisplayAsset = {
    id: number | string;
    name: string;
    typeLabel: string;
    details: string;
    isSimple: boolean;
    data: SimpleAsset | Vessel;
};

interface ImportSummary {
    vesselsCreated: number;
    vesselsUpdated: number;
    tanksCreated: number;
    tanksUpdated: number;
    calibrationPointsAdded: number;
    measurementLogsCreated: number;
    errors: string[];
}


interface RegistrationHubScreenProps {
    locations: Location[];
    setLocations: React.Dispatch<SetStateAction<Location[]>>;
    simpleAssets: SimpleAsset[];
    setSimpleAssets: React.Dispatch<SetStateAction<SimpleAsset[]>>;
    vessels: Vessel[];
    setVessels: React.Dispatch<SetStateAction<Vessel[]>>;
    onEditVessel: (id: number | 'new') => void;
    onDeleteVessel: (id: number) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const AssetChoiceModal: React.FC<{
    onClose: () => void;
    onSelect: (type: 'simple' | 'vessel') => void;
}> = ({ onClose, onSelect }) => {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Selecione o Tipo de Ativo</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                </header>
                <div className="p-6 space-y-4">
                    <Button className="w-full justify-start text-base py-6" variant="secondary" onClick={() => onSelect('simple')}>
                        <DatabaseIcon className="h-5 w-5 mr-3" />
                        <div>
                            <p className="font-semibold">Ativo Simples</p>
                            <p className="font-normal text-xs text-muted-foreground">Tanque de terra, vagão, container, etc.</p>
                        </div>
                    </Button>
                    <Button className="w-full justify-start text-base py-6" variant="secondary" onClick={() => onSelect('vessel')}>
                        <ShipIcon className="h-5 w-5 mr-3" />
                        <div>
                             <p className="font-semibold">Embarcação</p>
                             <p className="font-normal text-xs text-muted-foreground">Balsa-tanque, Navio-tanque, etc.</p>
                        </div>
                    </Button>
                </div>
            </div>
        </div>
    );
};

const LocationCard: React.FC<{ location: Location, onEdit: (loc: Location) => void, onDelete: (loc: Location) => void }> = ({ location, onEdit, onDelete }) => (
    <div className="bg-secondary/50 p-3 rounded-lg flex items-center gap-4 group">
        <MapPinIcon className="h-6 w-6 text-primary flex-shrink-0" />
        <div className="flex-grow">
            <p className="font-semibold text-foreground">{location.name}</p>
            <p className="text-xs text-muted-foreground">{locationTypeLabels[location.type]} • {location.city}, {location.state}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="!p-2" onClick={() => onEdit(location)} title="Editar"><PenSquareIcon className="h-4 w-4"/></Button>
            <Button variant="ghost" size="sm" className="!p-2" onClick={() => onDelete(location)} title="Excluir"><Trash2Icon className="h-4 w-4 text-destructive"/></Button>
        </div>
    </div>
);

const AssetCard: React.FC<{ asset: DisplayAsset, onEditSimple: (a: SimpleAsset) => void, onManageVessel: (id: number) => void, onDelete: (type: 'asset' | 'vessel', item: SimpleAsset | Vessel) => void }> = ({ asset, onEditSimple, onManageVessel, onDelete }) => (
     <div className="bg-secondary/50 p-3 rounded-lg flex items-center gap-4 group">
        {asset.isSimple ? <DatabaseIcon className="h-6 w-6 text-primary flex-shrink-0" /> : <ShipIcon className="h-6 w-6 text-primary flex-shrink-0" />}
        <div className="flex-grow">
            <p className="font-semibold text-foreground">{asset.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{asset.typeLabel} • {asset.details}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {asset.isSimple ? (
                <Button variant="ghost" size="sm" className="!p-2" onClick={() => onEditSimple(asset.data as SimpleAsset)} title="Editar"><PenSquareIcon className="h-4 w-4"/></Button>
            ) : (
                <Button variant="secondary" size="sm" onClick={() => onManageVessel((asset.data as Vessel).id)}>Gerenciar</Button>
            )}
            <Button variant="ghost" size="sm" className="!p-2" onClick={() => onDelete(asset.isSimple ? 'asset' : 'vessel', asset.data)} title="Excluir"><Trash2Icon className="h-4 w-4 text-destructive"/></Button>
        </div>
    </div>
);

export const RegistrationHubScreen: React.FC<RegistrationHubScreenProps> = ({
    locations, setLocations, simpleAssets, setSimpleAssets, vessels, setVessels, onEditVessel, onDeleteVessel, showToast
}) => {
    const [locationSearch, setLocationSearch] = useState('');
    const [assetSearch, setAssetSearch] = useState('');
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, type: null, data: null });
    const [itemToDelete, setItemToDelete] = useState<{ type: 'location' | 'asset' | 'vessel', item: Location | SimpleAsset | Vessel } | null>(null);
    const [isAssetChoiceModalOpen, setIsAssetChoiceModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const openModal = (type: 'location' | 'asset', data: Location | SimpleAsset | null = null) => {
        setModalState({ isOpen: true, type, data });
    };

    const closeModal = () => {
        setModalState({ isOpen: false, type: null, data: null });
    };

    const handleSave = (item: Location | SimpleAsset) => {
        if (modalState.type === 'location') {
            const loc = item as Location;
            setLocations(prev => {
                const exists = prev.some(l => l.id === loc.id);
                return exists ? prev.map(l => l.id === loc.id ? loc : l) : [...prev, loc];
            });
        } else if (modalState.type === 'asset') {
            const asset = item as SimpleAsset;
            setSimpleAssets(prev => {
                const exists = prev.some(a => a.id === asset.id);
                return exists ? prev.map(a => a.id === asset.id ? asset : a) : [...prev, asset];
            });
        }
        closeModal();
        showToast('Cadastro salvo com sucesso!');
    };

    const handleDelete = (type: 'location' | 'asset' | 'vessel', item: Location | SimpleAsset | Vessel) => {
        setItemToDelete({ type, item });
    };

    const confirmDelete = () => {
        if (!itemToDelete) return;
        if (itemToDelete.type === 'location') {
            setLocations(prev => prev.filter(l => l.id !== itemToDelete.item.id));
        } else if (itemToDelete.type === 'asset') {
            setSimpleAssets(prev => prev.filter(a => a.id !== itemToDelete.item.id));
        } else if (itemToDelete.type === 'vessel') {
            onDeleteVessel((itemToDelete.item as Vessel).id);
        }
        setItemToDelete(null);
    };

    const handleAssetTypeSelect = (type: 'simple' | 'vessel') => {
        setIsAssetChoiceModalOpen(false);
        if (type === 'simple') {
            openModal('asset');
        } else {
            onEditVessel('new');
        }
    };

    // --- IMPORT LOGIC ---
    const processBalsaLine = (parts: string[], currentVessels: Vessel[], summary: ImportSummary): Vessel[] => {
        const [, externalId, name, owner, issueDate, expiryDate, capacity, notes] = parts;
        if (!externalId || !name) throw new Error("Linha BALSA inválida. ID e Nome são obrigatórios.");

        const vesselIndex = currentVessels.findIndex(v => v.externalId === externalId);

        if (vesselIndex > -1) { // Update existing
            summary.vesselsUpdated++;
            const updatedVessel = {
                ...currentVessels[vesselIndex],
                name,
                owner,
                issueDate,
                expiryDate,
                totalTheoreticalCapacity: brToNumber(capacity) || currentVessels[vesselIndex].totalTheoreticalCapacity,
                notes: notes ? notes.replace(/,/g, ';') : currentVessels[vesselIndex].notes,
                type: 'balsa-tanque' as EquipmentType
            };
            return currentVessels.map((v, i) => i === vesselIndex ? updatedVessel : v);
        } else { // Create new
            summary.vesselsCreated++;
            const newVessel: Vessel = {
                id: Date.now() + Math.random(),
                externalId,
                name,
                owner,
                issueDate,
                expiryDate,
                totalTheoreticalCapacity: brToNumber(capacity) || 0,
                notes: notes ? notes.replace(/,/g, ';') : '',
                type: 'balsa-tanque',
                certificateNumber: '',
                executor: '',
                tanks: []
            };
            return [...currentVessels, newVessel];
        }
    };

    const processTankLine = (parts: string[], currentVessels: Vessel[], summary: ImportSummary): Vessel[] => {
        const [, balsaId, tankId, tankName, maxHeight, maxVolume] = parts;
        if (!balsaId || !tankId || !tankName) throw new Error("Linha TANQUE inválida.");

        const vesselIndex = currentVessels.findIndex(v => v.externalId === balsaId);
        if (vesselIndex === -1) throw new Error(`Balsa com ID ${balsaId} não encontrada para o tanque ${tankId}.`);
        
        const vessel = currentVessels[vesselIndex];
        const tankIndex = vessel.tanks.findIndex(t => t.externalId === tankId);

        let newTanks: VesselTank[];

        if (tankIndex > -1) { // Update existing tank
            summary.tanksUpdated++;
            const updatedTank = {
                ...vessel.tanks[tankIndex],
                tankName,
                maxCalibratedHeight: brToNumber(maxHeight) || vessel.tanks[tankIndex].maxCalibratedHeight,
                maxVolume: brToNumber(maxVolume) || vessel.tanks[tankIndex].maxVolume,
            };
            newTanks = vessel.tanks.map((t, i) => i === tankIndex ? updatedTank : t);
        } else { // Create new tank
            summary.tanksCreated++;
            const newTank: VesselTank = {
                id: Date.now() + Math.random(),
                externalId: tankId,
                tankName,
                maxCalibratedHeight: brToNumber(maxHeight) || 0,
                maxVolume: brToNumber(maxVolume) || 0,
                calibrationCurve: []
            };
            newTanks = [...vessel.tanks, newTank];
        }

        const updatedVessel = { ...vessel, tanks: newTanks };
        return currentVessels.map((v, i) => i === vesselIndex ? updatedVessel : v);
    };
    
    const processCalibracaoLine = (parts: string[], currentVessels: Vessel[], summary: ImportSummary): Vessel[] => {
        const [, tankId, trimStr, heightStr, volumeStr] = parts;
        if (!tankId) throw new Error("Linha CALIBRACAO inválida.");

        let vesselIndex = -1;
        let tankIndex = -1;
        let targetVessel: Vessel | undefined;

        for(let i=0; i < currentVessels.length; i++){
            const tIndex = currentVessels[i].tanks.findIndex(t => t.externalId === tankId);
            if(tIndex > -1) {
                vesselIndex = i;
                tankIndex = tIndex;
                targetVessel = currentVessels[i];
                break;
            }
        }
        
        if (!targetVessel) throw new Error(`Tanque com ID ${tankId} não encontrado para calibração.`);
        
        const trim = parseInt(trimStr.replace('+', ''), 10);
        const height = brToNumber(heightStr);
        const volume = brToNumber(volumeStr);

        if (isNaN(trim) || isNaN(height) || isNaN(volume)) throw new Error(`Dados de calibração inválidos para o tanque ${tankId}: trim='${trimStr}', altura='${heightStr}', volume='${volumeStr}'`);
        
        summary.calibrationPointsAdded++;
        const targetTank = targetVessel.tanks[tankIndex];
        const curve = targetTank.calibrationCurve;
        const pointIndex = curve.findIndex(p => p.trim === trim && p.height === height);

        let newCurve: CalibrationPoint[];
        if(pointIndex > -1) {
            const updatedPoint = { ...curve[pointIndex], volume };
            newCurve = curve.map((p, i) => i === pointIndex ? updatedPoint : p);
        } else {
            newCurve = [...curve, { trim, height, volume }];
        }

        const updatedTank = { ...targetTank, calibrationCurve: newCurve };
        const updatedTanks = targetVessel.tanks.map((t, i) => i === tankIndex ? updatedTank : t);
        const updatedVessel = { ...targetVessel, tanks: updatedTanks };
        
        return currentVessels.map((v, i) => i === vesselIndex ? updatedVessel : v);
    };

    const processMedicaoLinePass1 = (parts: string[], groupedMeasurements: Map<string, any>) => {
        const [, balsaId, tankId, dateTime, opType, trim, height, volume, product, origin, destination, operator] = parts;
        const groupKey = `${balsaId}|${dateTime}|${opType}|${operator}`;

        if (!groupedMeasurements.has(groupKey)) {
            groupedMeasurements.set(groupKey, {
                balsaId, dateTime, opType, product, operator, origin, destination,
                totalVolume: 0,
                measurements: []
            });
        }
        
        const group = groupedMeasurements.get(groupKey);
        group.totalVolume += brToNumber(volume) || 0;
        group.measurements.push({
            tankId,
            trim: parseInt(trim.replace('+', ''), 10),
            height: brToNumber(height),
            calculatedVolume: brToNumber(volume)
        });
    };

    const processMedicaoLinePass2 = (groupedMeasurements: Map<string, any>, vessels: Vessel[]): { measurementLogsByVesselId: Record<number, MeasurementLog[]>, count: number } => {
        const logsByVessel: Record<number, MeasurementLog[]> = {};
        let count = 0;
        for(const group of groupedMeasurements.values()) {
            const vessel = vessels.find(v => v.externalId === group.balsaId);
            if (!vessel) continue;
            
            const newLog: MeasurementLog = {
                id: new Date(group.dateTime.replace(' ', 'T')).getTime() + Math.random(),
                vesselId: vessel.id,
                dateTime: new Date(group.dateTime.replace(' ', 'T')).toISOString(),
                operationType: group.opType as MeasurementOperationType,
                product: group.product,
                operator: group.operator,
                origin: group.origin,
                destination: group.destination,
                totalVolume: group.totalVolume,
                measurements: group.measurements.map((m: any) => {
                    const tank = vessel.tanks.find(t => t.externalId === m.tankId);
                    return {
                        tankId: tank?.id || 0,
                        tankName: tank?.tankName || 'Desconhecido',
                        trim: m.trim,
                        height: m.height,
                        calculatedVolume: m.calculatedVolume
                    };
                })
            };
            
            if(!logsByVessel[vessel.id]) logsByVessel[vessel.id] = [];
            logsByVessel[vessel.id].push(newLog);
            count++;
        }
        return { measurementLogsByVesselId: logsByVessel, count };
    };
    
    const processImportedData = (records: string[]): ImportSummary => {
        const summary: ImportSummary = {
            vesselsCreated: 0,
            vesselsUpdated: 0,
            tanksCreated: 0,
            tanksUpdated: 0,
            calibrationPointsAdded: 0,
            measurementLogsCreated: 0,
            errors: [],
        };

        let currentVessels = [...vessels];
        const groupedMeasurements: Map<string, any> = new Map();
    
        for (const record of records) {
            const parts = record.split(';').map(p => p.trim());
            const type = parts[0];
            try {
                switch (type) {
                    case 'BALSA':
                        currentVessels = processBalsaLine(parts, currentVessels, summary);
                        break;
                    case 'TANQUE':
                        currentVessels = processTankLine(parts, currentVessels, summary);
                        break;
                    case 'CALIBRACAO':
                        currentVessels = processCalibracaoLine(parts, currentVessels, summary);
                        break;
                    case 'MEDICAO':
                        processMedicaoLinePass1(parts, groupedMeasurements);
                        break;
                    default:
                        // Ignore unknown lines silently
                }
            } catch (e) {
                summary.errors.push((e as Error).message);
            }
        }
        
        const { measurementLogsByVesselId, count } = processMedicaoLinePass2(groupedMeasurements, currentVessels);
        summary.measurementLogsCreated = count;
        
        setVessels(currentVessels);
    
        for (const vesselIdStr in measurementLogsByVesselId) {
            const vesselId = Number(vesselIdStr);
            const key = `qc_history_${vesselId}`;
            const existingHistory: MeasurementLog[] = JSON.parse(localStorage.getItem(key) || '[]');
            const newHistory = measurementLogsByVesselId[vesselId];
            
            const mergedHistory = [...existingHistory, ...newHistory]
              .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    
            localStorage.setItem(key, JSON.stringify(mergedHistory));
        }
        return summary;
    };
    
    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        if (files.length > 100) {
            showToast("Você pode importar no máximo 100 arquivos por vez.", "error");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        let allRecords: string[] = [];
        const readErrors: string[] = [];

        const readFile = (file: File): Promise<string[]> => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const content = e.target?.result as string;
                if (!content) return reject(new Error(`'${file.name}' está vazio ou é ilegível.`));
                try {
                    const records = content.split(/(?=BALSA;|TANQUE;|CALIBRACAO;|MEDICAO;)/g).filter(r => r.trim());
                    resolve(records);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error(`Erro ao ler o arquivo '${file.name}'.`));
            reader.readAsText(file);
        });

        // FIX: Replaced `Array.from(files)` with `[...files]` to ensure correct type inference for `file` as `File`, resolving the 'unknown' type error.
        for (const file of [...files]) {
            try {
                const records = await readFile(file);
                allRecords.push(...records);
            } catch (error) {
                readErrors.push((error as Error).message);
            }
        }
        
        let summary: ImportSummary | null = null;
        if (allRecords.length > 0) {
            summary = processImportedData(allRecords);
        }

        const finalErrors = [...readErrors, ...(summary?.errors || [])];

        if (finalErrors.length > 0) {
            const errorMessage = `Ocorreram ${finalErrors.length} erros:\n- ${finalErrors.slice(0, 5).join('\n- ')}${finalErrors.length > 5 ? '\n...' : ''}`;
            alert(errorMessage);
            showToast('Importação concluída com erros.', 'error');
        } else if (!summary || (summary.vesselsCreated === 0 && summary.vesselsUpdated === 0 && summary.tanksCreated === 0 && summary.tanksUpdated === 0 && summary.calibrationPointsAdded === 0 && summary.measurementLogsCreated === 0)) {
            showToast('Nenhum dado válido de embarcação ou medição encontrado nos arquivos.', 'error');
        } else {
            const messageParts: string[] = [];
            if (summary.vesselsCreated > 0) messageParts.push(`${summary.vesselsCreated} embarcaçõe(s) criada(s)`);
            if (summary.vesselsUpdated > 0) messageParts.push(`${summary.vesselsUpdated} embarcaçõe(s) atualizada(s)`);
            if (summary.tanksCreated > 0) messageParts.push(`${summary.tanksCreated} tanque(s) criado(s)`);
            if (summary.tanksUpdated > 0) messageParts.push(`${summary.tanksUpdated} tanque(s) atualizado(s)`);
            if (summary.calibrationPointsAdded > 0) messageParts.push(`${summary.calibrationPointsAdded} pontos de calibração adicionados`);
            if (summary.measurementLogsCreated > 0) messageParts.push(`${summary.measurementLogsCreated} registro(s) de medição importado(s)`);
            
            const message = `Importação de ${files.length} arquivo(s) concluída: ${messageParts.join(', ')}.`;
            showToast(message, 'success');
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    // --- END IMPORT LOGIC ---

    const filteredLocations = useMemo(() => {
        return locations.filter(loc => loc.name.toLowerCase().includes(locationSearch.toLowerCase()));
    }, [locations, locationSearch]);

    const allAssets = useMemo((): DisplayAsset[] => {
        const simple: DisplayAsset[] = simpleAssets.map(a => ({
            id: a.id,
            name: a.name,
            typeLabel: simpleAssetTypeLabels[a.type],
            details: a.capacity ? `${a.capacity} ${a.unit}` : 'Capacidade não definida',
            isSimple: true,
            data: a
        }));
        const complex: DisplayAsset[] = vessels.map(v => ({
            id: `vessel-${v.id}`,
            name: v.name,
            typeLabel: v.type.replace('-', ' '),
            details: `${v.tanks.length} tanques`,
            isSimple: false,
            data: v
        }));
        return [...simple, ...complex].filter(a => a.name.toLowerCase().includes(assetSearch.toLowerCase()));
    }, [simpleAssets, vessels, assetSearch]);

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Central de Cadastros</h1>
                    <p className="text-muted-foreground">Gerencie locais, terminais, ativos e embarcações.</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Coluna de Locais */}
                <Card>
                    <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Locais e Terminais</h2>
                        <div className="flex w-full sm:w-auto items-center gap-4">
                            <Input 
                                containerClassName="flex-grow"
                                placeholder="Buscar local..." 
                                value={locationSearch} 
                                onChange={e => setLocationSearch(e.target.value)} 
                            />
                            <Button onClick={() => openModal('location')} icon={<PlusCircleIcon className="h-4 w-4"/>} size="sm" className="flex-shrink-0">Novo Local</Button>
                        </div>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {filteredLocations.length > 0 ? (
                            filteredLocations.map(loc => <LocationCard key={loc.id} location={loc} onEdit={(l) => openModal('location', l)} onDelete={(l) => handleDelete('location', l)} />)
                        ) : (
                            <p className="text-center text-muted-foreground py-4">Nenhum local encontrado.</p>
                        )}
                    </div>
                </Card>

                {/* Coluna de Ativos */}
                <Card>
                     <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Ativos e Equipamentos</h2>
                        <div className="flex w-full sm:w-auto items-center gap-2 flex-wrap justify-end">
                            <Input 
                                containerClassName="flex-grow"
                                placeholder="Buscar ativo ou embarcação..." 
                                value={assetSearch} 
                                onChange={e => setAssetSearch(e.target.value)} 
                            />
                            <div className="flex gap-2 flex-shrink-0">
                                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} size="sm">Importar Arquivo(s)</Button>
                                <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".txt,text/plain" className="hidden" multiple />
                                <Button onClick={() => setIsAssetChoiceModalOpen(true)} icon={<PlusCircleIcon className="h-4 w-4"/>} size="sm">Novo Ativo</Button>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                         {allAssets.length > 0 ? (
                            allAssets.map(asset => <AssetCard key={asset.id} asset={asset} onEditSimple={(a) => openModal('asset', a)} onManageVessel={(id) => onEditVessel(id)} onDelete={(type, item) => handleDelete(type, item)} />)
                        ) : (
                            <p className="text-center text-muted-foreground py-4">Nenhum ativo encontrado.</p>
                        )}
                    </div>
                </Card>
            </div>

            {modalState.isOpen && modalState.type === 'location' && (
                <LocationAssetFormModal
                    type="location"
                    data={modalState.data as Location | null}
                    onClose={closeModal}
                    onSave={handleSave}
                />
            )}
             {modalState.isOpen && modalState.type === 'asset' && (
                <LocationAssetFormModal
                    type="asset"
                    data={modalState.data as SimpleAsset | null}
                    onClose={closeModal}
                    onSave={handleSave}
                    locations={locations}
                />
            )}
            
            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={confirmDelete}
                title={`Confirmar Exclusão de ${itemToDelete?.type === 'location' ? 'Local' : 'Ativo'}`}
            >
                <p>Tem certeza que deseja excluir <strong className="text-foreground">{itemToDelete?.item.name}</strong>?</p>
                <p>Esta ação não pode ser desfeita.</p>
            </ConfirmationModal>

            {isAssetChoiceModalOpen && (
                <AssetChoiceModal onClose={() => setIsAssetChoiceModalOpen(false)} onSelect={handleAssetTypeSelect} />
            )}
        </main>
    );
};


// --- FORM MODAL FOR LOCATIONS AND SIMPLE ASSETS ---
interface LocationAssetFormModalProps {
    type: 'location' | 'asset';
    data: Location | SimpleAsset | null;
    onClose: () => void;
    onSave: (item: Location | SimpleAsset) => void;
    locations?: Location[]; // Only for asset type
}

const LocationAssetFormModal: React.FC<LocationAssetFormModalProps> = ({ type, data, onClose, onSave, locations }) => {
    const isLocation = type === 'location';
    const [formData, setFormData] = useState(() => {
        if (data) return data;
        // FIX: The `SimpleAsset` type expects 'L' or 'Kg' for the unit, not 'liters'.
        return isLocation
            ? { id: Date.now(), type: 'terminal-liquido', name: '', city: '', state: '' } as Location
            : { id: Date.now(), type: 'tanque-terra', name: '', capacity: 0, unit: 'L' } as SimpleAsset;
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumber = e.target.getAttribute('type') === 'number';
        setFormData(prev => ({ ...prev, [name]: isNumber ? parseFloat(value) || 0 : value }));
    };

    const handleSave = () => {
        if (!formData.name.trim()) {
            alert('O nome é obrigatório.');
            return;
        }
        onSave(formData as Location | SimpleAsset);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">{data ? 'Editar' : 'Novo'} {isLocation ? 'Local' : 'Ativo Simples'}</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                </header>
                <main className="p-6 space-y-4">
                    {isLocation ? (
                        <>
                            <Input label="Nome do Local" name="name" value={formData.name} onChange={handleChange} />
                            <Select label="Tipo de Local" name="type" value={(formData as Location).type} onChange={handleChange}>
                                {Object.entries(locationTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </Select>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Cidade" name="city" value={(formData as Location).city} onChange={handleChange} />
                                <Input label="Estado (UF)" name="state" value={(formData as Location).state} onChange={handleChange} maxLength={2} />
                            </div>
                        </>
                    ) : (
                        <>
                            <Input label="Nome / Identificador do Ativo" name="name" value={formData.name} onChange={handleChange} />
                             <Select label="Tipo de Ativo" name="type" value={(formData as SimpleAsset).type} onChange={handleChange}>
                                {Object.entries(simpleAssetTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </Select>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Capacidade" name="capacity" type="number" value={(formData as SimpleAsset).capacity || ''} onChange={handleChange} />
                                 {/* FIX: The option values must match the `SimpleAsset` type ('L' or 'Kg'). */}
                                 <Select label="Unidade" name="unit" value={(formData as SimpleAsset).unit} onChange={handleChange}>
                                    <option value="L">Litros</option>
                                    <option value="Kg">Kg</option>
                                </Select>
                            </div>
                            <Select label="Localização (Opcional)" name="locationId" value={(formData as SimpleAsset).locationId || ''} onChange={handleChange}>
                                <option value="">Sem localização</option>
                                {locations?.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                            </Select>
                        </>
                    )}
                </main>
                <footer className="p-4 bg-secondary/50 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar</Button>
                </footer>
            </div>
        </div>
    );
};
