import React, { useState } from 'react';
import { OperationDetails, Vessel } from '../../types';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { ChevronDownIcon } from '../ui/icons';

const VesselSelectModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    vessels: Vessel[];
    selectedValue: number | null;
    onSelect: (value: number | null) => void;
}> = ({ isOpen, onClose, vessels, selectedValue, onSelect }) => {
    if (!isOpen) return null;

    const options = [
        { id: null, name: 'Operação Manual / Outro Modal' },
        ...vessels
    ];

    return (
        <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in"
            style={{ animationDuration: '200ms' }}
            onClick={onClose}
        >
            <div 
                className="bg-card rounded-lg shadow-xl w-full max-w-sm m-4 border border-border"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="divide-y divide-border">
                    {options.map(option => (
                        <label 
                            key={option.id ?? 'manual'} 
                            className="flex items-center p-4 hover:bg-secondary cursor-pointer transition-colors"
                        >
                            <input 
                                type="radio" 
                                name="vessel-option" 
                                checked={selectedValue === option.id}
                                onChange={() => onSelect(option.id)}
                                className="w-5 h-5 accent-brand-500 focus:ring-ring"
                            />
                            <span className="ml-4 text-lg font-medium text-foreground">{option.name}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};


export const OperationDetailsForm: React.FC<{
    details: OperationDetails;
    setDetails: (details: OperationDetails) => void;
    vessels: Vessel[];
    isReadOnly?: boolean;
    errors: Partial<Record<keyof OperationDetails, string>>;
    setErrors: React.Dispatch<React.SetStateAction<Partial<Record<keyof OperationDetails, string>>>>;
}> = ({ details, setDetails, vessels, isReadOnly = false, errors, setErrors }) => {

    const [isVesselModalOpen, setIsVesselModalOpen] = useState(false);

    const validateField = (name: string, value: string) => {
        let errorMsg = '';
        if (!value.trim()) {
            switch(name) {
                case 'id': errorMsg = 'O ID da operação é obrigatório.'; break;
                case 'responsavel': errorMsg = 'O responsável é obrigatório.'; break;
                case 'terminal': errorMsg = 'O terminal é obrigatório.'; break;
                case 'local': errorMsg = 'O local é obrigatório.'; break;
                case 'dateTime': errorMsg = 'A data/hora é obrigatória.'; break;
            }
        }
        setErrors(prev => {
            const newErrors = { ...prev };
            if (errorMsg) {
                newErrors[name as keyof OperationDetails] = errorMsg;
            } else {
                delete newErrors[name as keyof OperationDetails];
            }
            return newErrors;
        });
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setDetails({ ...details, [name]: value });
        // Clear error on change
        if (errors[name as keyof OperationDetails]) {
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors[name as keyof OperationDetails];
                return newErrors;
            });
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (isReadOnly) return;
        const { name, value } = e.target;
        validateField(name, value);
    };
    
    const handleVesselSelect = (vesselId: number | null) => {
        const newModal = vesselId ? 'fluvial' : details.modal;
        setDetails({ 
            ...details, 
            vesselId: vesselId,
            modal: newModal
        });
        setIsVesselModalOpen(false);
    };

    const isVesselSelected = !!details.vesselId;
    const selectedVesselName = isVesselSelected 
        ? vessels.find(v => v.id === details.vesselId)?.name
        : 'Operação Manual / Outro Modal';

    return (
        <>
            <Card>
                <h2 className="text-lg font-semibold mb-4 text-foreground">Detalhes da Operação</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                    <Input label="Operação" name="id" value={details.id} onChange={handleChange} onBlur={handleBlur} error={errors.id} readOnly={isReadOnly} />
                    <Select label="Tipo de Operação" name="type" value={details.type} onChange={handleChange} disabled={isReadOnly}>
                        <option value="recebimento">Recebimento</option>
                        <option value="expedicao">Expedição</option>
                        <option value="transferencia">Transferência</option>
                    </Select>

                     <Select label="Status" name="status" value={details.status} onChange={handleChange}>
                        <option value="pendente">Pendente</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="concluida">Concluída</option>
                        <option value="cancelada">Cancelada</option>
                    </Select>

                    <div className="space-y-1.5 lg:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground">Embarcação (Opcional)</label>
                        <button
                            type="button"
                            onClick={() => !isReadOnly && setIsVesselModalOpen(true)}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left"
                            disabled={isReadOnly}
                        >
                            <span className="truncate">{selectedVesselName}</span>
                            <ChevronDownIcon className="h-4 w-4 opacity-50 flex-shrink-0"/>
                        </button>
                    </div>

                    <Select 
                        label="Modal" 
                        name="modal" 
                        value={details.modal} 
                        onChange={handleChange} 
                        disabled={isVesselSelected || isReadOnly}
                        title={isVesselSelected ? "O modal é definido automaticamente ao selecionar uma embarcação." : ""}
                    >
                        <option value="rodoviario">Rodoviário</option>
                        <option value="fluvial">Fluvial (Balsa/Tanque)</option>
                        <option value="ferroviario">Ferroviário</option>
                        <option value="terra">Tanque de Terra</option>
                    </Select>

                    <Input label="Responsável" name="responsavel" value={details.responsavel} onChange={handleChange} onBlur={handleBlur} error={errors.responsavel} />
                    <Input label="Terminal" name="terminal" value={details.terminal} onChange={handleChange} onBlur={handleBlur} error={errors.terminal} readOnly={isReadOnly} />
                    <Input label="Local" name="local" value={details.local} onChange={handleChange} onBlur={handleBlur} error={errors.local} readOnly={isReadOnly} />
                    <Input label="Data de Criação" name="dateTime" type="datetime-local" value={details.dateTime} onChange={handleChange} onBlur={handleBlur} error={errors.dateTime} readOnly={isReadOnly}/>
                    <Input label="Data de Início de Operação" name="operationStartDate" type="datetime-local" value={details.operationStartDate || ''} onChange={handleChange} onBlur={handleBlur} readOnly={isReadOnly}/>
                    <Textarea 
                        label="Observações da Operação" 
                        name="observations"
                        value={details.observations || ''}
                        onChange={handleChange}
                        placeholder="Notas importantes, ocorrências ou detalhes adicionais da operação..."
                        containerClassName="lg:col-span-3"
                        readOnly={isReadOnly}
                    />
                </div>
            </Card>

            <VesselSelectModal
                isOpen={isVesselModalOpen}
                onClose={() => setIsVesselModalOpen(false)}
                vessels={vessels}
                selectedValue={details.vesselId}
                onSelect={handleVesselSelect}
            />
        </>
    );
};
