
import React, { useRef, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DownloadIcon, UploadIcon, RotateCcwIcon } from '../components/ui/icons';
import { AppSettings, VolumeUnit, MassUnit } from '../types';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';

interface SettingsScreenProps {
    onCreateBackup: () => void;
    onRestoreBackup: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onResetSystem: () => void;
    appSettings: AppSettings;
    setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
    onCreateBackup,
    onRestoreBackup,
    onResetSystem,
    appSettings,
    setAppSettings,
    showToast,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [pendingChange, setPendingChange] = useState<{ unitType: 'volume' | 'mass'; value: VolumeUnit | MassUnit } | null>(null);


    const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setAppSettings(prev => ({
            ...prev,
            notifications: {
                ...prev.notifications,
                [name]: type === 'checkbox' ? checked : value,
            }
        }));
    };

    const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target as { name: 'volume' | 'mass'; value: VolumeUnit | MassUnit };
        // Don't trigger confirm if value is the same
        if (appSettings.units[name] === value) {
            return;
        }
        setPendingChange({ unitType: name, value });
        setIsConfirmOpen(true);
    };

    const confirmUnitChange = () => {
        if (pendingChange) {
            setAppSettings(prev => ({
                ...prev,
                units: {
                    ...prev.units,
                    [pendingChange.unitType]: pendingChange.value,
                }
            }));
            showToast('Unidade de medida atualizada com sucesso!');
        }
        setIsConfirmOpen(false);
        setPendingChange(null);
    };


    return (
        <>
            <main className="max-w-8xl mx-auto p-4 md:p-8">
                <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
                        <p className="text-muted-foreground">Gerencie backups, notificações e dados do sistema.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8 max-w-6xl mx-auto">
                    <Card>
                        <h2 className="text-lg font-semibold mb-4">Unidades de Medida</h2>
                        <div className="space-y-4">
                            <Select
                                label="Unidade de Volume"
                                name="volume"
                                value={appSettings.units.volume}
                                onChange={handleUnitChange}
                            >
                                <option value="L">Litros (L)</option>
                                <option value="m³">Metros Cúbicos (m³)</option>
                            </Select>
                            <Select
                                label="Unidade de Massa"
                                name="mass"
                                value={appSettings.units.mass}
                                onChange={handleUnitChange}
                            >
                                <option value="Kg">Quilogramas (Kg)</option>
                                <option value="t">Toneladas (t)</option>
                            </Select>
                            <p className="text-xs text-muted-foreground pt-2 border-t">
                                As unidades selecionadas serão usadas para exibição em toda a aplicação. Os dados são sempre armazenados em Litros e Quilogramas.
                            </p>
                        </div>
                    </Card>
                    <Card>
                        <h2 className="text-lg font-semibold mb-4">Configurações de Notificação</h2>
                        <div className="space-y-4">
                            <Input
                                label="Email para Notificações"
                                name="email"
                                type="email"
                                placeholder="seuemail@exemplo.com"
                                value={appSettings.notifications.email}
                                onChange={handleNotificationChange}
                            />
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">Receber alertas sobre:</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" name="notifyOnOperationConcluded" checked={appSettings.notifications.notifyOnOperationConcluded} onChange={handleNotificationChange} className="h-4 w-4 rounded border-input text-primary focus:ring-ring"/>
                                        Conclusão de operações
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" name="notifyOnVesselDelayed" checked={appSettings.notifications.notifyOnVesselDelayed} onChange={handleNotificationChange} className="h-4 w-4 rounded border-input text-primary focus:ring-ring"/>
                                        Atrasos de embarcações
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" name="notifyOnCertificateExpires" checked={appSettings.notifications.notifyOnCertificateExpires} onChange={handleNotificationChange} className="h-4 w-4 rounded border-input text-primary focus:ring-ring"/>
                                        Vencimento de certificados
                                    </label>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h2 className="text-lg font-semibold mb-4">Backup e Restauração</h2>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Crie um backup de segurança de todos os seus dados ou restaure o sistema a partir de um arquivo de backup anterior.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button onClick={onCreateBackup} icon={<DownloadIcon className="h-4 w-4"/>} variant="secondary" className="w-full">
                                    Criar Backup
                                </Button>
                                <input type="file" ref={fileInputRef} onChange={onRestoreBackup} accept=".json,application/json" className="hidden" />
                                <Button onClick={() => fileInputRef.current?.click()} icon={<UploadIcon className="h-4 w-4"/>} variant="secondary" className="w-full">
                                    Restaurar
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card className="border-destructive/50 md:col-span-2 lg:col-span-3">
                        <h2 className="text-lg font-semibold mb-4 text-destructive">Zona de Perigo</h2>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                            A ação abaixo é irreversível. Ela apagará todos os cadastros, programações e operações, retornando o sistema ao seu estado inicial.
                            </p>
                            <Button onClick={onResetSystem} icon={<RotateCcwIcon className="h-4 w-4"/>} variant="destructive">
                                Limpar Dados e Reiniciar
                            </Button>
                        </div>
                    </Card>
                </div>
            </main>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => {
                    setIsConfirmOpen(false);
                    setPendingChange(null);
                }}
                onConfirm={confirmUnitChange}
                title="Confirmar Alteração de Unidade"
                confirmText="Sim, Aplicar para Tudo"
                variant="default"
            >
                <p>Você tem certeza que deseja alterar a unidade de medida?</p>
                <p className="font-semibold text-foreground mt-2">Esta alteração será aplicada em toda a aplicação.</p>
            </ConfirmationModal>
        </>
    );
};
