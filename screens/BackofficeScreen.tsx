import React, { useState, SetStateAction, useRef } from 'react';
import { Order, OrderStatus, ProductType } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { PlusCircleIcon, XIcon, PenSquareIcon, Trash2Icon, BriefcaseIcon } from '../components/ui/icons';
import { numberToBr } from '../utils/helpers';

interface BackofficeScreenProps {
    orders: Order[];
    setOrders: React.Dispatch<SetStateAction<Order[]>>;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

interface OrderFormModalProps {
    order: Order | null;
    onClose: () => void;
    onSave: (order: Order) => void;
    ordersCount: number;
}

const statusConfig: Record<OrderStatus, { text: string, style: string }> = {
    'PENDENTE': { text: 'Pendente', style: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-400' },
    'EM_ANDAMENTO': { text: 'Em Andamento', style: 'bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-400' },
    'CONCLUIDO': { text: 'Concluído', style: 'bg-green-100 text-green-800 dark:bg-green-400/10 dark:text-green-400' },
    'CANCELADO': { text: 'Cancelado', style: 'bg-gray-200 text-gray-800 dark:bg-gray-400/10 dark:text-gray-400' },
};

const productLabels: Record<ProductType, string> = {
    'anidro': 'Etanol Anidro',
    'hidratado': 'Etanol Hidratado',
    'granel': 'Granel',
};

const OrderFormModal: React.FC<OrderFormModalProps> = ({ order, onClose, onSave, ordersCount }) => {
    const isNew = !order;
    const [formData, setFormData] = useState<Omit<Order, 'id' | 'orderNumber'>>(() => {
        if (order) {
            return {
                clientName: order.clientName,
                product: order.product,
                volume: order.volume,
                unit: order.unit,
                origin: order.origin,
                destination: order.destination,
                creationDate: order.creationDate,
                status: order.status,
                notes: order.notes,
            };
        }
        const today = new Date().toISOString().slice(0, 10);
        return {
            clientName: '',
            product: 'anidro',
            volume: 0,
            unit: 'L',
            origin: '',
            destination: '',
            creationDate: today,
            status: 'PENDENTE',
            notes: '',
        };
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.clientName.trim()) newErrors.clientName = "Nome do cliente é obrigatório.";
        if (formData.volume <= 0) newErrors.volume = "O volume deve ser maior que zero.";
        if (!formData.origin.trim()) newErrors.origin = "A origem é obrigatória.";
        if (!formData.destination.trim()) newErrors.destination = "O destino é obrigatório.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        const savedOrder: Order = {
            id: order?.id || Date.now(),
            orderNumber: order?.orderNumber || `PED-${new Date().getFullYear()}-${String(ordersCount + 1).padStart(4, '0')}`,
            ...formData,
        };
        onSave(savedOrder);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isNumber = e.target.getAttribute('type') === 'number';
        setFormData(prev => ({ ...prev, [name]: isNumber ? parseFloat(value) || 0 : value }));
        
        if (name === 'product') {
            const newUnit = value === 'granel' ? 'Kg' : 'L';
            setFormData(prev => ({ ...prev, unit: newUnit }));
        }

        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    return (
         <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">{isNew ? 'Criar Novo Pedido' : `Editar Pedido ${order?.orderNumber}`}</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                </header>
                <main className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Cliente" name="clientName" value={formData.clientName} onChange={handleChange} error={errors.clientName} />
                        <Input label="Data de Criação" name="creationDate" type="date" value={formData.creationDate} onChange={handleChange} />
                    </div>
                     <div className="grid grid-cols-3 gap-4">
                        <Select label="Produto" name="product" value={formData.product} onChange={handleChange}>
                            {Object.entries(productLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </Select>
                        <Input label="Volume" name="volume" type="number" value={formData.volume} onChange={handleChange} error={errors.volume} />
                        <Input label="Unidade" name="unit" value={formData.unit} disabled />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <Input label="Origem" name="origin" value={formData.origin} onChange={handleChange} error={errors.origin} />
                        <Input label="Destino" name="destination" value={formData.destination} onChange={handleChange} error={errors.destination} />
                    </div>
                    <Select label="Status" name="status" value={formData.status} onChange={handleChange}>
                        {Object.entries(statusConfig).map(([key, config]) => (
                            <option key={key} value={key}>{config.text}</option>
                        ))}
                    </Select>
                    <Textarea label="Observações" name="notes" value={formData.notes || ''} onChange={handleChange} placeholder="Informações adicionais sobre o pedido..." />
                </main>
                <footer className="p-4 bg-secondary/50 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar Pedido</Button>
                </footer>
            </div>
        </div>
    );
};


export const BackofficeScreen: React.FC<BackofficeScreenProps> = ({ orders, setOrders, showToast }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

    const handleNewOrder = () => {
        setEditingOrder(null);
        setModalOpen(true);
    };

    const handleEditOrder = (order: Order) => {
        setEditingOrder(order);
        setModalOpen(true);
    };
    
    const handleSaveOrder = (order: Order) => {
        setOrders(prev => {
            const exists = prev.some(o => o.id === order.id);
            if(exists) {
                return prev.map(o => o.id === order.id ? order : o);
            }
            return [...prev, order];
        });
        setModalOpen(false);
        setEditingOrder(null);
        showToast('Pedido salvo com sucesso!');
    };

    const handleDeleteOrder = () => {
        if (orderToDelete) {
            setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
            setOrderToDelete(null);
        }
    };

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Central de Backoffice</h1>
                    <p className="text-muted-foreground">Gerencie pedidos e outras tarefas administrativas.</p>
                </div>
            </div>

            <Card>
                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                    <h2 className="text-lg font-semibold">Gestão de Pedidos</h2>
                     <Button onClick={handleNewOrder} icon={<PlusCircleIcon className="h-4 w-4"/>}>
                        Novo Pedido
                    </Button>
                </div>
                
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b-0">
                            <tr className="text-left text-muted-foreground">
                                {['Nº Pedido', 'Cliente', 'Produto', 'Volume', 'Rota', 'Data', 'Status', 'Ações'].map(h => 
                                    <th key={h} className="p-3 font-medium">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length > 0 ? (
                                orders.sort((a,b) => b.id - a.id).map(order => {
                                    const status = statusConfig[order.status];
                                    return (
                                        <tr key={order.id} className="border-b last:border-0 hover:bg-secondary/30">
                                            <td className="p-3 font-mono font-semibold">{order.orderNumber}</td>
                                            <td className="p-3">{order.clientName}</td>
                                            <td className="p-3">{productLabels[order.product]}</td>
                                            <td className="p-3 font-mono text-right">{numberToBr(order.volume, 0)} {order.unit}</td>
                                            <td className="p-3">{order.origin} → {order.destination}</td>
                                            <td className="p-3">{new Date(order.creationDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.style}`}>{status.text}</span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="sm" className="!p-2" onClick={() => handleEditOrder(order)} title="Editar"><PenSquareIcon className="h-4 w-4"/></Button>
                                                    <Button variant="ghost" size="sm" className="!p-2" onClick={() => setOrderToDelete(order)} title="Excluir"><Trash2Icon className="h-4 w-4 text-destructive"/></Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} className="text-center p-16 text-muted-foreground">
                                        <BriefcaseIcon className="mx-auto h-12 w-12 mb-4" />
                                        <p>Nenhum pedido cadastrado.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {modalOpen && (
                <OrderFormModal 
                    order={editingOrder}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSaveOrder}
                    ordersCount={orders.length}
                />
            )}
            
             <ConfirmationModal
                isOpen={!!orderToDelete}
                onClose={() => setOrderToDelete(null)}
                onConfirm={handleDeleteOrder}
                title="Confirmar Exclusão de Pedido"
            >
                <p>Tem certeza que deseja excluir o pedido <strong className="text-foreground">{orderToDelete?.orderNumber}</strong>?</p>
            </ConfirmationModal>
        </main>
    );
};