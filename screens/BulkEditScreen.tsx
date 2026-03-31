

import React, { useState } from 'react';
import { Vessel, VesselTank, CalibrationPoint } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { Loader2Icon } from '../components/ui/icons';

interface BulkEditScreenProps {
    vessels: Vessel[];
    onVesselUpdate: (vesselId: number, newTanks: VesselTank[]) => void;
}

type ProcessMode = 'add_update' | 'replace';

export const BulkEditScreen: React.FC<BulkEditScreenProps> = ({ vessels, onVesselUpdate }) => {
    const [selectedVesselId, setSelectedVesselId] = useState<string>('');
    const [textData, setTextData] = useState('');
    const [processMode, setProcessMode] = useState<ProcessMode>('add_update');
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [isProcessing, setIsProcessing] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    const handleProcessClick = () => {
        if (processMode === 'replace') {
            setIsConfirmModalOpen(true);
        } else {
            processData();
        }
    };
    
    const confirmAndProcess = () => {
        setIsConfirmModalOpen(false);
        processData();
    }

    const processData = () => {
        if (!selectedVesselId || !textData) {
            setFeedback({ type: 'error', message: 'Selecione uma embarcação e cole os dados.' });
            return;
        }
        setIsProcessing(true);
        setFeedback({ type: '', message: '' });

        setTimeout(() => { // Simulate processing time
            try {
                const vesselIdNum = parseInt(selectedVesselId, 10);
                const vesselToUpdate = vessels.find(v => v.id === vesselIdNum);
                if (!vesselToUpdate) throw new Error("Embarcação não encontrada.");

                const lines = textData.split('\n').filter(line => line.trim() !== '');
                const parsedTanksMap = new Map<string, VesselTank>();
                let currentVesselId: string | null = null;

                lines.forEach(line => {
                    const parts = line.split(';').map(p => p.trim());
                    const type = parts[0];

                    if (type === 'TANQUE') {
                        const [, balsaId, tankId, tankName, maxHeight, maxVolume] = parts;
                        if (!tankId || !tankName) return; // Skip invalid tank lines
                        
                        // Heuristic: If BALSA; line is missing, assume the first BALSA_ID found is the one we are working on.
                        if (!currentVesselId) currentVesselId = balsaId;
                        
                        parsedTanksMap.set(tankId, {
                            id: Date.now() + Math.random(), // Temp ID
                            externalId: tankId,
                            tankName,
                            maxCalibratedHeight: parseInt(maxHeight, 10) || 0,
                            maxVolume: parseInt(maxVolume, 10) || 0,
                            calibrationCurve: []
                        });
                    } else if (type === 'CALIBRACAO') {
                        const [, tankId, trimStr, heightStr, volumeStr] = parts;
                        const tank = parsedTanksMap.get(tankId);
                        if (tank) {
                            const trim = parseInt(trimStr.replace('+', ''), 10);
                            const height = parseFloat(heightStr);
                            const volume = parseInt(volumeStr, 10);
                            if (!isNaN(trim) && !isNaN(height) && !isNaN(volume)) {
                                tank.calibrationCurve.push({ trim, height, volume });
                            }
                        }
                    }
                });

                let finalTanks: VesselTank[];
                let newCount = 0;
                let updatedCount = 0;

                if (processMode === 'replace') {
                    finalTanks = Array.from(parsedTanksMap.values());
                    newCount = finalTanks.length;
                } else { // add_update
                    const existingTanks = new Map<string | undefined, VesselTank>(vesselToUpdate.tanks.map(t => [t.externalId, t]));
                    
                    parsedTanksMap.forEach((parsedTank, externalId) => {
                        const existingTank = existingTanks.get(externalId);
                        if (existingTank) {
                            const updatedTank: VesselTank = {
                                ...existingTank,
                                tankName: parsedTank.tankName,
                                maxCalibratedHeight: parsedTank.maxCalibratedHeight,
                                maxVolume: parsedTank.maxVolume,
                                calibrationCurve: parsedTank.calibrationCurve,
                            };
                            existingTanks.set(externalId, updatedTank);
                            updatedCount++;
                        } else {
                            existingTanks.set(externalId, parsedTank);
                            newCount++;
                        }
                    });
                    finalTanks = Array.from(existingTanks.values());
                }
                
                onVesselUpdate(vesselIdNum, finalTanks);
                setFeedback({ type: 'success', message: `Processamento concluído! ${newCount} tanque(s) adicionado(s), ${updatedCount} tanque(s) atualizado(s).` });
                setTextData('');

            } catch (error) {
                setFeedback({ type: 'error', message: (error as Error).message });
            } finally {
                setIsProcessing(false);
            }
        }, 500);
    };

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Edição em Lote de Tanques</h1>
                <p className="text-muted-foreground">Adicione ou atualize tanques de embarcações colando dados no formato TXT.</p>
            </div>
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-4">
                        <Select
                            label="1. Selecione a Embarcação"
                            value={selectedVesselId}
                            onChange={(e) => setSelectedVesselId(e.target.value)}
                        >
                            <option value="" disabled>Selecione...</option>
                            {vessels
                                .filter(v => v.type === 'balsa-tanque')
                                .map(vessel => (
                                    <option key={vessel.id} value={vessel.id}>{vessel.name}</option>
                                ))
                            }
                        </Select>
                        
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">2. Escolha o Modo</label>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center p-3 border rounded-md has-[:checked]:bg-secondary has-[:checked]:border-primary transition-colors cursor-pointer">
                                    <input type="radio" name="process-mode" value="add_update" checked={processMode === 'add_update'} onChange={() => setProcessMode('add_update')} className="w-4 h-4 accent-primary"/>
                                    <div className="ml-3">
                                        <p className="font-semibold">Adicionar ou Atualizar</p>
                                        <p className="text-xs text-muted-foreground">Adiciona novos tanques e atualiza existentes com o mesmo ID.</p>
                                    </div>
                                </label>
                                <label className="flex items-center p-3 border rounded-md has-[:checked]:bg-secondary has-[:checked]:border-destructive transition-colors cursor-pointer">
                                    <input type="radio" name="process-mode" value="replace" checked={processMode === 'replace'} onChange={() => setProcessMode('replace')} className="w-4 h-4 accent-primary"/>
                                     <div className="ml-3">
                                        <p className="font-semibold">Substituir Todos</p>
                                        <p className="text-xs text-muted-foreground">Remove todos os tanques atuais e adiciona os novos.</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                         <Button 
                            onClick={handleProcessClick}
                            disabled={!selectedVesselId || !textData || isProcessing}
                            className="w-full"
                        >
                            {isProcessing ? <Loader2Icon className="h-4 w-4 mr-2" /> : null}
                            {isProcessing ? 'Processando...' : '3. Processar Dados'}
                        </Button>

                         {feedback.message && (
                            <div className={`p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-success-100 text-green-700' : 'bg-danger-100 text-destructive'}`}>
                                {feedback.message}
                            </div>
                        )}
                    </div>
                    <div className="md:col-span-2">
                         <Textarea
                            label="Cole os dados aqui"
                            value={textData}
                            onChange={(e) => setTextData(e.target.value)}
                            placeholder="TANQUE;TTZ001;TTZ001_TQ01BE;TANQUE 01 BE;285;146250&#10;CALIBRACAO;TTZ001_TQ01BE;+50;0;722&#10;CALIBRACAO;TTZ001_TQ01BE;+25;0;431&#10;..."
                            className="min-h-[400px] font-mono text-xs"
                        />
                    </div>
                </div>
            </Card>

             <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmAndProcess}
                title="Confirmar Substituição de Tanques"
            >
                <p>Você selecionou o modo <strong className="text-foreground">"Substituir Todos"</strong>.</p>
                <p className="font-bold text-destructive">Esta ação irá apagar permanentemente todos os tanques e curvas de calibração existentes para a embarcação selecionada antes de adicionar os novos.</p>
                <p>Deseja continuar?</p>
            </ConfirmationModal>
        </main>
    );
};