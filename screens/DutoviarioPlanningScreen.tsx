

import React, { useState, SetStateAction } from 'react';
import { DutoviarioSchedule, ScheduleStatus } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { CopyIcon, CalendarDaysIcon } from '../components/ui/icons';
import { Breadcrumb } from '../components/ui/Breadcrumb';

interface DutoviarioPlanningScreenProps {
    onBack: () => void;
    setSchedules: React.Dispatch<SetStateAction<DutoviarioSchedule[]>>;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

type FormData = Omit<DutoviarioSchedule, 'id' | 'status'>;

const initialFormState: FormData = {
  empresa_solicitante: '',
  base_destino: '',
  usina_origem: '',
  cliente_final: '',
  pedido_remessa_armazenagem: '',
  pedido_venda_cliente: '',
  data_agendamento_desejada: '',
  periodo_agendamento_desejada: '',
  volume_solicitado: '',
};

const FieldLabel: React.FC<{ label: string, required?: boolean }> = ({ label, required = true }) => (
    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
        {label}{required && <span className="text-red-500">*</span>}
    </label>
);

const SelectWithIcon: React.FC<{
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    name: string;
    children: React.ReactNode;
    error?: string;
}> = ({ label, value, onChange, name, children, error }) => (
    <div>
        <FieldLabel label={label} />
        <div className="relative">
            <Select
                name={name}
                value={value}
                onChange={onChange}
                className={`w-full ${!value ? 'text-muted-foreground' : ''}`}
                error={error}
            >
                {children}
            </Select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <CopyIcon className="h-5 w-5 text-gray-400" />
            </div>
        </div>
    </div>
);


export const DutoviarioPlanningScreen: React.FC<DutoviarioPlanningScreenProps> = ({ onBack, setSchedules, showToast }) => {
    const [formData, setFormData] = useState<FormData>(initialFormState);
    const [isDateFocused, setIsDateFocused] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof FormData, string>> = {};
        if (!formData.empresa_solicitante) newErrors.empresa_solicitante = "Campo obrigatório.";
        if (!formData.usina_origem) newErrors.usina_origem = "Campo obrigatório.";
        if (!formData.base_destino) newErrors.base_destino = "Campo obrigatório.";
        if (!formData.cliente_final) newErrors.cliente_final = "Campo obrigatório.";
        if (!formData.data_agendamento_desejada) newErrors.data_agendamento_desejada = "Campo obrigatório.";
        if (!formData.periodo_agendamento_desejada) newErrors.periodo_agendamento_desejada = "Campo obrigatório.";
        if (!formData.volume_solicitado || Number(formData.volume_solicitado) <= 0) newErrors.volume_solicitado = "O volume deve ser maior que zero.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const clearError = (name: keyof FormData) => {
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        clearError(name as keyof FormData);
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value as any }));
        clearError(name as keyof FormData);
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            showToast('Por favor, corrija os erros no formulário.', 'error');
            return;
        }
        const newSchedule: DutoviarioSchedule = {
            id: Date.now(),
            status: 'PLANEJADO',
            ...formData,
        };
        setSchedules(prev => [...prev, newSchedule]);
        showToast('Programação salva com sucesso!');
        setFormData(initialFormState); // Reset form
        setErrors({});
    };

    const breadcrumbItems = [
        { label: 'Central de planejamento multimodal', onClick: onBack },
        { label: 'Programação Dutoviária' }
    ];

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                <Breadcrumb items={breadcrumbItems} />
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Programação Dutoviária</h1>
                    <hr className="mt-4" />
                </div>

                <Card>
                    <form onSubmit={handleSubmit}>
                        <h2 className="text-xl font-semibold mb-6 text-foreground">Dados Principais</h2>
                        <div className="space-y-6">
                            <SelectWithIcon
                                label="Empresa Solicitante"
                                name="empresa_solicitante"
                                value={formData.empresa_solicitante}
                                onChange={handleSelectChange}
                                error={errors.empresa_solicitante}
                            >
                                <option value="" disabled>Selecionar Empresa Solicitante</option>
                                <option value="Petrobras">Petrobras</option>
                                <option value="Vibra">Vibra</option>
                                <option value="Raízen">Raízen</option>
                                <option value="Ipiranga">Ipiranga</option>
                            </SelectWithIcon>

                             <SelectWithIcon
                                label="Usina de Origem"
                                name="usina_origem"
                                value={formData.usina_origem}
                                onChange={handleSelectChange}
                                error={errors.usina_origem}
                            >
                                <option value="" disabled>Selecionar Usina de Origem</option>
                                <option value="São Martinho">Usina São Martinho</option>
                                <option value="Raízen">Usina da Raízen</option>
                                <option value="BP Bunge">Usina BP Bunge</option>
                            </SelectWithIcon>

                             <SelectWithIcon
                                label="Base Destino"
                                name="base_destino"
                                value={formData.base_destino}
                                onChange={handleSelectChange}
                                error={errors.base_destino}
                            >
                                <option value="" disabled>Selecionar Base Destino</option>
                                <option value="Guarulhos">Base de Guarulhos (SP)</option>
                                <option value="Betim">Base de Betim (MG)</option>
                                <option value="Duque de Caxias">Base de Duque de Caxias (RJ)</option>
                            </SelectWithIcon>

                             <SelectWithIcon
                                label="Cliente Final"
                                name="cliente_final"
                                value={formData.cliente_final}
                                onChange={handleSelectChange}
                                error={errors.cliente_final}
                            >
                                <option value="" disabled>Selecionar Cliente Final</option>
                                <option value="Cliente A">Cliente A</option>
                                <option value="Cliente B">Cliente B</option>
                                <option value="Cliente C">Cliente C</option>
                            </SelectWithIcon>
                            
                            <div>
                                <FieldLabel label="Pedido Remessa Armazenagem" required={false} />
                                <Input
                                    name="pedido_remessa_armazenagem"
                                    type="text"
                                    value={formData.pedido_remessa_armazenagem || ''}
                                    onChange={handleChange}
                                    placeholder="nº do pedido"
                                />
                            </div>

                            <div>
                                <FieldLabel label="Pedido Venda Cliente" required={false} />
                                <Input
                                    name="pedido_venda_cliente"
                                    type="text"
                                    value={formData.pedido_venda_cliente || ''}
                                    onChange={handleChange}
                                    placeholder="nº do pedido"
                                />
                            </div>

                            <div>
                                <FieldLabel label="Data de Agendamento Desejada" />
                                <div className="relative">
                                     <Input
                                        name="data_agendamento_desejada"
                                        type={isDateFocused || formData.data_agendamento_desejada ? 'date' : 'text'}
                                        value={formData.data_agendamento_desejada}
                                        onChange={handleChange}
                                        onFocus={() => setIsDateFocused(true)}
                                        onBlur={(e) => { if (!e.target.value) setIsDateFocused(false); }}
                                        placeholder="por exemplo 31/12/2025"
                                        required
                                        error={errors.data_agendamento_desejada}
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <FieldLabel label="Período Agendamento Desejada" />
                                <Select
                                    name="periodo_agendamento_desejada"
                                    value={formData.periodo_agendamento_desejada}
                                    onChange={handleSelectChange}
                                    required
                                    className={!formData.periodo_agendamento_desejada ? 'text-muted-foreground' : ''}
                                    error={errors.periodo_agendamento_desejada}
                                >
                                    <option value="" disabled>Selecione um período</option>
                                    <option value="MANHÃ">Manhã (08:00 - 12:00)</option>
                                    <option value="TARDE">Tarde (13:00 - 18:00)</option>
                                    <option value="NOITE">Noite (19:00 - 22:00)</option>
                                    <option value="COMERCIAL">Comercial (08:00 - 18:00)</option>
                                </Select>
                            </div>
                            
                            <div>
                                <FieldLabel label="Volume Solicitado" />
                                <Input
                                    name="volume_solicitado"
                                    type="number"
                                    value={formData.volume_solicitado}
                                    onChange={handleChange}
                                    placeholder="em litros"
                                    required
                                    error={errors.volume_solicitado}
                                />
                            </div>
                        </div>
                    </form>
                </Card>
                <div className="flex justify-end gap-2 mt-0 border-t py-4">
                    <Button variant="secondary" onClick={onBack}>Sair</Button>
                    <Button onClick={handleSubmit}>Salvar</Button>
                </div>
            </div>
        </main>
    );
};