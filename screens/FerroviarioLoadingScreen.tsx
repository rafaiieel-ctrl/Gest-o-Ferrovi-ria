import React, { useState, useMemo, useCallback, useRef } from 'react';
import { FerroviarioSchedule, FerroviarioRateio, Vagao, VagaoStatus, ScheduleStatus, Anexo, DocumentStatus } from '../types';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { CheckCircleIcon, ClockIcon, Loader2Icon, PenSquareIcon, XIcon, TrainIcon, AlertTriangleIcon, FileTextIcon } from '../components/ui/icons';
import { nowLocal, brToNumber, numberToBr, formatDateTime } from '../utils/helpers';

interface FerroviarioLoadingScreenProps {
    schedule: FerroviarioSchedule;
    onUpdateSchedule: (schedule: FerroviarioSchedule) => void;
    onBack: () => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const statusConfig: Record<VagaoStatus, { text: string, style: string, icon: React.ReactNode }> = {
    'AGUARDANDO': { text: 'Aguardando', style: 'bg-yellow-400/10 text-yellow-500', icon: <ClockIcon className="h-4 w-4" /> },
    'EM CARREGAMENTO': { text: 'Carregando', style: 'bg-blue-400/10 text-blue-500', icon: <Loader2Icon className="h-4 w-4" /> },
    'CARREGADO': { text: 'Carregado', style: 'bg-green-400/10 text-green-500', icon: <CheckCircleIcon className="h-4 w-4" /> },
    'REPROVADO': { text: 'Reprovado', style: 'bg-red-400/10 text-red-500', icon: <XIcon className="h-4 w-4" /> },
};

const VagaoStatusBadge: React.FC<{ status: VagaoStatus }> = ({ status }) => {
    const config = statusConfig[status] || statusConfig.AGUARDANDO;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full ${config.style}`}>
            {config.icon}
            {config.text}
        </span>
    );
};

const FileInput: React.FC<{
    label: string;
    anexo: Anexo | undefined;
    onFileChange: (anexo: Anexo | null) => void;
}> = ({ label, anexo, onFileChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                onFileChange({ name: file.name, dataUrl });
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    return (
        <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
            />
            {anexo ? (
                <div className="flex items-center justify-between p-2 border rounded-md bg-secondary/50">
                    <span className="text-sm truncate" title={anexo.name}>{anexo.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => onFileChange(null)}>
                        <XIcon className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <Button variant="secondary" className="w-full" onClick={triggerFileSelect}>
                    Selecionar Arquivo
                </Button>
            )}
        </div>
    );
};

const DocStatusIcon: React.FC<{ status: DocumentStatus | undefined, label: string }> = ({ status, label }) => {
    const isEmitted = status === 'EMITIDO';
    return (
        <div title={`${label}: ${isEmitted ? 'Emitido' : 'Pendente'}`} className={`p-1 rounded-full ${isEmitted ? 'bg-green-500 text-white' : 'bg-secondary text-muted-foreground'}`}>
            <FileTextIcon className="h-3 w-3" />
        </div>
    );
};

export const FerroviarioLoadingScreen: React.FC<FerroviarioLoadingScreenProps> = ({ schedule, onUpdateSchedule, onBack, showToast }) => {
    const [editingVagao, setEditingVagao] = useState<Vagao | null>(null);

    const stats = useMemo(() => {
        const total = schedule.vagoes.length;
        const carregado = schedule.vagoes.filter(v => v.status === 'CARREGADO').length;
        const aguardando = schedule.vagoes.filter(v => v.status === 'AGUARDANDO').length;
        const emCarregamento = schedule.vagoes.filter(v => v.status === 'EM CARREGAMENTO').length;
        const progress = total > 0 ? (carregado / total) * 100 : 0;
        return { total, carregado, aguardando, emCarregamento, progress };
    }, [schedule.vagoes]);

    const handleUpdateVagao = (updatedVagao: Vagao) => {
        const newVagoes = schedule.vagoes.map(v => v.id === updatedVagao.id ? updatedVagao : v);
        onUpdateSchedule({ ...schedule, vagoes: newVagoes });
    };

    const handleSaveVagao = (vagaoToSave: Vagao) => {
        if(vagaoToSave.status === 'CARREGADO' && !vagaoToSave.timestampCarregamento){
            vagaoToSave.timestampCarregamento = nowLocal();
        }
        handleUpdateVagao(vagaoToSave);
        setEditingVagao(null);
        showToast(`Vagão ${vagaoToSave.numero} atualizado.`);
    }
    
    const getRateioForVagao = (vagao: Vagao) => {
        return schedule.rateios.find(r => r.id === vagao.rateioId);
    };

    const breadcrumbItems = [
        { label: 'Planejamento Multimodal', onClick: onBack },
        { label: 'Programação Ferroviária', onClick: onBack },
        { label: schedule.composicao }
    ];

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <Breadcrumb items={breadcrumbItems} />
            <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Painel de Carregamento: {schedule.composicao}</h1>
                    <p className="text-muted-foreground">{schedule.origem} → {schedule.destino}</p>
                </div>
                <Button variant="secondary" onClick={onBack}>Voltar</Button>
            </div>

            <Card className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Janela de Carregamento</p>
                        <p className="font-semibold">{formatDateTime(schedule.janela_carregamento_prevista)}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Saída Prevista</p>
                        <p className="font-semibold">{formatDateTime(schedule.saida_prevista)}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Chegada Prevista</p>
                        <p className="font-semibold">{formatDateTime(schedule.chegada_prevista)}</p>
                    </div>
                </div>
            </Card>

            <Card className="mb-8">
                <div className="flex flex-wrap gap-6 justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">Progresso Total</h2>
                         <span className="text-sm text-muted-foreground font-mono">({stats.carregado}/{stats.total})</span>
                    </div>
                    <div className="w-full md:w-1/2">
                        <div className="w-full bg-secondary rounded-full h-2.5">
                            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${stats.progress}%` }}></div>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-xl font-semibold">Pedidos (Rateios)</h3>
                    {schedule.rateios.map(rateio => {
                        const vagoesForRateio = schedule.vagoes.filter(v => v.rateioId === rateio.id);
                        const loadedCount = vagoesForRateio.filter(v => v.status === 'CARREGADO').length;
                        const totalCount = vagoesForRateio.length;
                        const progress = totalCount > 0 ? (loadedCount / totalCount) * 100 : 0;
                        return (
                            <Card key={rateio.id} padding="sm">
                                <p className="font-bold">{rateio.cliente}</p>
                                <p className="text-sm text-muted-foreground">Pedido: {rateio.pedido}</p>
                                <div className="mt-3">
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                        <span>Progresso</span>
                                        <span>{loadedCount} / {totalCount} vagões</span>
                                    </div>
                                    <div className="w-full bg-secondary rounded-full h-1.5">
                                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>

                <div className="lg:col-span-2 space-y-4">
                     <h3 className="text-xl font-semibold">Vagões</h3>
                     <div className="space-y-3">
                        {schedule.vagoes.map(vagao => (
                            <Card key={vagao.id} padding="sm" className="flex items-center justify-between gap-4 cursor-pointer hover:border-primary/50" onClick={() => setEditingVagao(vagao)}>
                                <div className="flex items-center gap-3">
                                    <TrainIcon className="h-6 w-6 text-muted-foreground"/>
                                    <div>
                                        <p className="font-bold">{vagao.numero || 'Vagão sem N°'}</p>
                                        <p className="text-xs text-muted-foreground">{getRateioForVagao(vagao)?.cliente} - Pedido {getRateioForVagao(vagao)?.pedido}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {vagao.status === 'CARREGADO' && (
                                        <div className="flex items-center gap-1.5 mr-2">
                                            <DocStatusIcon status={vagao.statusNotaRemessa} label="NF Remessa" />
                                            <DocStatusIcon status={vagao.statusNotaEmitida} label="NF Emitida" />
                                            <DocStatusIcon status={vagao.statusCte} label="CT-e" />
                                        </div>
                                    )}
                                    <VagaoStatusBadge status={vagao.status} />
                                </div>
                            </Card>
                        ))}
                     </div>
                </div>
            </div>

            {editingVagao && (
                <VagaoEditModal 
                    vagao={editingVagao}
                    rateio={getRateioForVagao(editingVagao)!}
                    onSave={handleSaveVagao}
                    onClose={() => setEditingVagao(null)}
                    tipoVeiculo={schedule.tipo_veiculo}
                />
            )}
        </main>
    );
};


interface VagaoEditModalProps {
    vagao: Vagao;
    rateio: FerroviarioRateio;
    onSave: (vagao: Vagao) => void;
    onClose: () => void;
    tipoVeiculo: FerroviarioSchedule['tipo_veiculo'];
}

const VagaoEditModal: React.FC<VagaoEditModalProps> = ({ vagao, rateio, onSave, onClose, tipoVeiculo }) => {
    const [formData, setFormData] = useState(vagao);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFileChange = (fieldName: 'anexoNotaRemessa' | 'anexoNotaEmitida' | 'anexoCte', anexo: Anexo | null) => {
        setFormData(prev => ({ ...prev, [fieldName]: anexo || undefined }));
    };

    const isTankCar = tipoVeiculo === 'vagao-tanque';

    const { volumeRetorno, volumeEmitida, hasDivergence } = useMemo(() => {
        const volRetorno = brToNumber(formData.volumeNotaRetorno || '');
        const volEmitida = brToNumber(formData.volumeNotaEmitida || '');
        const divergence = isFinite(volRetorno) && volRetorno > 0 && isFinite(volEmitida) && volEmitida > 0 && volRetorno !== volEmitida;
        return { volumeRetorno: volRetorno, volumeEmitida: volEmitida, hasDivergence: divergence };
    }, [formData.volumeNotaRetorno, formData.volumeNotaEmitida]);

    return (
         <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Editar Vagão ({isTankCar ? 'Tanque' : 'Granel/Container'})</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                </header>
                <main className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <Input label="Número do Vagão" name="numero" value={formData.numero} onChange={handleChange} />
                    <Input label="Cliente / Pedido" value={`${rateio.cliente} / ${rateio.pedido}`} disabled />
                    <Select label="Status" name="status" value={formData.status} onChange={handleChange}>
                        {Object.keys(statusConfig).map(status => (
                            <option key={status} value={status}>
                                {statusConfig[status as VagaoStatus].text}
                            </option>
                        ))}
                    </Select>
                    
                    {formData.status === 'CARREGADO' && (
                        <div className="space-y-6 pt-6 border-t animate-fade-in">
                            <fieldset>
                                <legend className="text-sm font-semibold text-muted-foreground mb-2">Medidas de Carregamento</legend>
                                {isTankCar ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="Volume Observado (L)" name="volumeObservado" value={formData.volumeObservado || ''} onChange={handleChange} />
                                        <Input label="Temperatura (°C)" name="temperatura" value={formData.temperatura || ''} onChange={handleChange} />
                                        <Input label="Densidade (kg/m³)" name="densidade" value={formData.densidade || ''} onChange={handleChange} />
                                        <Input label="FCV a 20°C" name="fcv" value={formData.fcv || ''} onChange={handleChange} />
                                        <Input label="Lacre do Vagão" name="lacre" value={formData.lacre || ''} onChange={handleChange} containerClassName="col-span-2" />
                                    </div>
                                ) : (
                                     <div className="grid grid-cols-2 gap-4">
                                        <Input label="Peso Carregado (Kg)" name="pesoCarregado" value={formData.pesoCarregado || ''} onChange={handleChange} />
                                        <Input label="Lacre do Vagão" name="lacre" value={formData.lacre || ''} onChange={handleChange} />
                                    </div>
                                )}
                            </fieldset>
                            
                           <fieldset>
                                <legend className="text-sm font-semibold text-muted-foreground mb-2">Documentação Fiscal e Logística</legend>
                                <div className="space-y-4">
                                    {/* NF Remessa */}
                                    <div className="p-3 border rounded-lg bg-secondary/30">
                                        <h4 className="text-sm font-semibold mb-3">NF de Remessa (Retorno de Armazenagem)</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input label="Número da Nota" name="notaRetorno" value={formData.notaRetorno || ''} onChange={handleChange} />
                                            <Input label="Volume da Nota (L)" name="volumeNotaRetorno" value={formData.volumeNotaRetorno || ''} onChange={handleChange} type="number" />
                                            <FileInput label="Anexo da NF de Remessa" anexo={formData.anexoNotaRemessa} onFileChange={(anexo) => handleFileChange('anexoNotaRemessa', anexo)} />
                                            <Select label="Status" name="statusNotaRemessa" value={formData.statusNotaRemessa || 'PENDENTE'} onChange={handleChange}>
                                                <option value="PENDENTE">Aguardando Emissão</option>
                                                <option value="EMITIDO">Emitido</option>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* NF Emitida */}
                                    <div className="p-3 border rounded-lg bg-secondary/30">
                                        <h4 className="text-sm font-semibold mb-3">NF Emitida (Venda ou Remessa)</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input label="Volume da Nota Fiscal (L)" name="volumeNotaEmitida" value={formData.volumeNotaEmitida || ''} onChange={handleChange} type="number" />
                                            <FileInput label="Anexo da NF Emitida" anexo={formData.anexoNotaEmitida} onFileChange={(anexo) => handleFileChange('anexoNotaEmitida', anexo)} />
                                            <Select label="Status" name="statusNotaEmitida" value={formData.statusNotaEmitida || 'PENDENTE'} onChange={handleChange} containerClassName="md:col-span-2">
                                                <option value="PENDENTE">Aguardando Emissão</option>
                                                <option value="EMITIDO">Emitido</option>
                                            </Select>
                                        </div>
                                    </div>

                                    {hasDivergence && (
                                        <div className="flex items-start gap-2 p-3 text-sm text-destructive bg-danger-100/50 rounded-lg border border-destructive/20">
                                            <AlertTriangleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="font-bold">Alerta de Divergência de Volume</p>
                                                <p>O volume da Nota de Retorno ({numberToBr(volumeRetorno, 0)} L) é diferente do volume da Nota Fiscal Emitida ({numberToBr(volumeEmitida, 0)} L).</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* CT-e */}
                                    <div className="p-3 border rounded-lg bg-secondary/30">
                                        <h4 className="text-sm font-semibold mb-3">CT-e da Transportadora</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input label="Número do CT-e" name="cteNumero" value={formData.cteNumero || ''} onChange={handleChange} />
                                            <FileInput label="Anexo do CT-e" anexo={formData.anexoCte} onFileChange={(anexo) => handleFileChange('anexoCte', anexo)} />
                                            <Select label="Status" name="statusCte" value={formData.statusCte || 'PENDENTE'} onChange={handleChange} containerClassName="md:col-span-2">
                                                <option value="PENDENTE">Aguardando Emissão</option>
                                                <option value="EMITIDO">Emitido</option>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </fieldset>
                        </div>
                    )}
                </main>
                <footer className="p-4 bg-secondary/50 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={() => onSave(formData)}>Salvar Alterações</Button>
                </footer>
            </div>
        </div>
    );
};