import React, { useCallback, useMemo, useState } from 'react';
import { Tank, ModalType, ProductType } from '../../types';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { LacreManager } from './LacreManager';
import { Trash2Icon, CopyIcon, AlertTriangleIcon, ChevronDownIcon } from '../ui/icons';
import { numberToBr } from '../../utils/helpers';

interface TankCardProps {
    tank: Tank;
    index: number;
    onUpdate: (id: number, updatedTank: Tank) => void;
    onDelete: (id: number) => void;
    onDuplicate: (id: number) => void;
    activeOperationType: 'loading' | 'unloading' | null;
    errors: Partial<Record<keyof Tank, string>>;
    onValidate: (tankId: number, field: keyof Tank, value: string) => void;
    onClearError: (tankId: number, field: keyof Tank) => void;
}

const ResultDisplay: React.FC<{ label: string; value: string; unit?: string; isWarning?: boolean }> = ({ label, value, unit, isWarning = false }) => (
    <div className={`p-3 rounded-lg transition-colors border ${isWarning ? 'bg-danger-100/50 dark:bg-destructive/10 border-destructive/20' : 'bg-secondary/40 border-transparent'}`}>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{label}</span>
            {isWarning && <AlertTriangleIcon className="h-4 w-4 text-destructive" />}
        </div>
        <p className={`font-mono text-xl font-bold mt-1 ${isWarning ? 'text-destructive' : 'text-foreground'}`}>
            {value}
            <span className="text-sm font-medium text-muted-foreground ml-1">{unit}</span>
        </p>
    </div>
);

export const TankCard: React.FC<TankCardProps> = ({ tank, index, onUpdate, onDelete, onDuplicate, activeOperationType, errors, onValidate, onClearError }) => {
    const [isDetailsVisible, setIsDetailsVisible] = useState(false);
    
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const updatedValue = name === 'trim' ? parseInt(value, 10) : value;
        onUpdate(tank.id, { ...tank, [name]: updatedValue });
        onClearError(tank.id, name as keyof Tank);
    }, [tank, onUpdate, onClearError]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onValidate(tank.id, name as keyof Tank, value);
    }, [tank.id, onValidate]);

    const handleLacreChange = useCallback((newLacres: string[]) => {
        onUpdate(tank.id, { ...tank, lacres: newLacres });
    }, [tank, onUpdate]);

    const handleIsEmptyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isEmpty = e.target.checked;
        const updatedTank: Tank = { ...tank, isEmpty };

        if (isEmpty) {
            updatedTank.vamb = '0';
            updatedTank.rho = '';
            updatedTank.Ta = '';
            updatedTank.Tt = '';
            if (updatedTank.vesselTankId) {
                updatedTank.alturaMedidaCm = '';
                updatedTank.lastroMm = '';
            }
        }
        onUpdate(tank.id, updatedTank);
    };

    const isVesselOperation = !!tank.vesselTankId;
    const isEmpty = !!tank.isEmpty;
    const isLiquidProduct = tank.prod === 'anidro' || tank.prod === 'hidratado';

    const identLabel = useMemo(() => {
        if (isVesselOperation) return 'Embarcação';
        const labels: Record<ModalType, string> = {
            rodoviario: 'Placa',
            fluvial: 'Nº Balsa',
            ferroviario: 'Vagão',
            terra: 'Identificação',
            maritimo: 'Embarcação Marítima',
            aereo: 'Aeronave',
            dutoviario: 'Duto'
        };
        return labels[tank.tipo] || 'Identificação';
    }, [tank.tipo, isVesselOperation]);
    
    const { r20, fcv, inpm, v20, status, messages } = tank.results;
    
    const statusInfo = useMemo(() => {
        switch (status) {
            case 'OK': return { text: 'OK', classes: 'bg-success-100 text-green-600' };
            case 'FORA': return { text: 'FORA', classes: 'bg-danger-100 text-destructive' };
            default: return { text: 'PENDENTE', classes: 'bg-secondary text-muted-foreground' };
        }
    }, [status]);

    const isOutOfSpec = useCallback((metric: 'INPM' | 'ρ@20') => {
        if (status !== 'FORA') return false;
        return messages.some(msg => msg.toUpperCase().startsWith(metric.toUpperCase()));
    }, [status, messages]);

    const measurementsGridClass = 'md:grid-cols-4';

    return (
        <Card className="relative group animate-fade-in" padding="md" style={{ animationDelay: `${index * 70}ms`, opacity: 0 }}>
            <div className="absolute top-4 left-4">
                <span className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${statusInfo.classes}`}>
                    <span className={`h-2 w-2 rounded-full ${
                        status === 'OK' ? 'bg-green-600' : status === 'FORA' ? 'bg-destructive' : 'bg-muted-foreground'
                    }`}></span>
                    <span>{statusInfo.text}</span>
                </span>
            </div>

            <span className="absolute top-4 right-6 font-bold text-4xl text-foreground/5 opacity-50 group-hover:opacity-100 transition-opacity duration-300">#{index + 1}</span>
            <div className="space-y-6">
                {/* Seção de Identificação */}
                <fieldset>
                    <legend className="text-sm font-semibold text-muted-foreground mb-2 col-span-full">Identificação</legend>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <Select label="Tipo" name="tipo" value={tank.tipo} onChange={handleChange} containerClassName="sm:col-span-1" disabled={isVesselOperation}>
                            <option value="rodoviario">Rodoviário</option>
                            <option value="fluvial">Fluvial</option>
                            <option value="ferroviario">Ferroviário</option>
                            <option value="terra">Terra</option>
                        </Select>
                        <Select label="Produto" name="prod" value={tank.prod} onChange={handleChange} containerClassName="sm:col-span-1" disabled={isVesselOperation}>
                            <option value="anidro">Anidro</option>
                            <option value="hidratado">Hidratado</option>
                            <option value="granel">Granel</option>
                        </Select>
                        <Input label={identLabel} name="ident" value={tank.ident} onChange={handleChange} onBlur={handleBlur} error={errors.ident} containerClassName="sm:col-span-1" readOnly={isVesselOperation} placeholder="ABC-1234" />
                        <Input label="Tanque/Comp." name="tanque" value={tank.tanque} onChange={handleChange} onBlur={handleBlur} error={errors.tanque} containerClassName="sm:col-span-1" readOnly={isVesselOperation} placeholder="TQ-01"/>
                    </div>
                </fieldset>
                
                {/* Seção de Detalhes Adicionais (Colapsável) */}
                <div>
                    <button 
                        onClick={() => setIsDetailsVisible(!isDetailsVisible)}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left py-1"
                        aria-expanded={isDetailsVisible}
                        aria-controls={`additional-details-${tank.id}`}
                    >
                        <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isDetailsVisible ? 'rotate-180' : ''}`} />
                        <span>Detalhes Adicionais (Cliente, Rota)</span>
                    </button>
                    {isDetailsVisible && (
                        <div id={`additional-details-${tank.id}`} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border mt-2 animate-fade-in" style={{animationDuration: '300ms'}}>
                            <Input label="Cliente" name="cliente" value={tank.cliente} onChange={handleChange} containerClassName="sm:col-span-2" placeholder="Nome do cliente" />
                            <Input label="Terminal de Descarga" name="tdesc" value={tank.tdesc} onChange={handleChange} containerClassName="sm:col-span-1" placeholder="Ex: T01" />
                            <Input label="Local de Descarga" name="ldesc" value={tank.ldesc} onChange={handleChange} containerClassName="sm:col-span-1" placeholder="Ex: Betim-MG" />
                        </div>
                    )}
                </div>

                {activeOperationType === 'unloading' ? (
                     <fieldset>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Descarga</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input 
                                label="Volume Descarregado (L)" 
                                name="dischargedVolume" 
                                value={tank.dischargedVolume || ''} 
                                onChange={handleChange} 
                                placeholder="e.g., 50000" 
                                type="number"
                                containerClassName="sm:col-span-1"
                            />
                        </div>
                    </fieldset>
                ) : (
                    <>
                    {/* Seção de Medições */}
                    <fieldset>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-semibold text-muted-foreground">Medições</h3>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id={`isEmpty-${tank.id}`}
                                    checked={isEmpty}
                                    onChange={handleIsEmptyChange}
                                    className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-ring focus:ring-offset-2"
                                />
                                <label htmlFor={`isEmpty-${tank.id}`} className="text-sm font-medium text-muted-foreground cursor-pointer">
                                    Tanque Vazio
                                </label>
                            </div>
                        </div>
                        <div className={`grid grid-cols-2 ${measurementsGridClass} gap-4`}>
                            {isVesselOperation ? (
                                <>
                                    <Select label="Trim" name="trim" value={tank.trim} onChange={handleChange} disabled={isEmpty}>
                                        <option value={50}>+50</option>
                                        <option value={25}>+25</option>
                                        <option value={0}>0</option>
                                        <option value={-25}>-25</option>
                                        <option value={-50}>-50</option>
                                    </Select>
                                    <Input label="Altura Medida (cm)" name="alturaMedidaCm" value={tank.alturaMedidaCm || ''} onChange={handleChange} onBlur={handleBlur} error={errors.alturaMedidaCm} placeholder="e.g., 150,5" disabled={isEmpty} />
                                    <Input label="Lastro (mm)" name="lastroMm" value={tank.lastroMm || ''} onChange={handleChange} onBlur={handleBlur} error={errors.lastroMm} placeholder="e.g., 20" disabled={isEmpty} />
                                    <Input label="V.amb (L)" name="vamb" value={tank.vamb} onChange={handleChange} placeholder="Calculado" readOnly={isVesselOperation} disabled={isEmpty} />
                                    {isLiquidProduct && (
                                        <>
                                            <Input label="ρ obs (kg/m³)" name="rho" value={tank.rho} onChange={handleChange} onBlur={handleBlur} error={errors.rho} placeholder="e.g., 803,0" disabled={isEmpty} />
                                            <Input label="T amostra (°C)" name="Ta" value={tank.Ta} onChange={handleChange} onBlur={handleBlur} error={errors.Ta} placeholder="e.g., 25,0" disabled={isEmpty} />
                                            <Input label="T tanque (°C)" name="Tt" value={tank.Tt} onChange={handleChange} onBlur={handleBlur} error={errors.Tt} placeholder="e.g., 27,0 (Opcional)" disabled={isEmpty} />
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Input label="V.amb (L)" name="vamb" value={tank.vamb} onChange={handleChange} onBlur={handleBlur} error={errors.vamb} placeholder="e.g., 45000" disabled={isEmpty} />
                                    {isLiquidProduct && (
                                        <>
                                            <Input label="ρ obs (kg/m³)" name="rho" value={tank.rho} onChange={handleChange} onBlur={handleBlur} error={errors.rho} placeholder="e.g., 803,0" disabled={isEmpty} />
                                            <Input label="T amostra (°C)" name="Ta" value={tank.Ta} onChange={handleChange} onBlur={handleBlur} error={errors.Ta} placeholder="e.g., 25,0" disabled={isEmpty} />
                                            <Input label="T tanque (°C)" name="Tt" value={tank.Tt} onChange={handleChange} onBlur={handleBlur} error={errors.Tt} placeholder="e.g., 27,0 (Opcional)" disabled={isEmpty} />
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </fieldset>

                    <LacreManager lacres={tank.lacres} onLacreChange={handleLacreChange} />
                    
                    {/* Seção de Resultados */}
                    {isLiquidProduct && (
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-semibold text-muted-foreground">Resultados Calculados</h3>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <ResultDisplay label="ρ@20" value={numberToBr(r20, 2)} unit="kg/m³" isWarning={isOutOfSpec('ρ@20')}/>
                                <ResultDisplay label="FCV" value={numberToBr(fcv, 4)} />
                                <ResultDisplay label="INPM" value={numberToBr(inpm, 2)} unit="%" isWarning={isOutOfSpec('INPM')}/>
                                <ResultDisplay label="V@20" value={numberToBr(v20, 3)} unit="L"/>
                            </div>
                            {messages.length > 0 && (
                                <div className="text-xs mt-3 text-destructive/90 space-y-1">
                                    {messages.map((msg, i) => (
                                        <p key={i} className="flex items-center gap-1.5">
                                            <AlertTriangleIcon className="h-3 w-3 flex-shrink-0" /> 
                                            {msg}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    </>
                )}
            </div>

            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isVesselOperation && (
                    <Button variant="ghost" size="sm" onClick={() => onDuplicate(tank.id)} title="Duplicar">
                        <CopyIcon className="h-4 w-4" />
                    </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => onDelete(tank.id)} title="Remover">
                    <Trash2Icon className="h-4 w-4 text-destructive/80 hover:text-destructive" />
                </Button>
            </div>
        </Card>
    );
};
