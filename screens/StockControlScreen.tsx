import React, { useState, useMemo, SetStateAction } from 'react';
import { Location, StockTransaction, ProductType, LocationType, StockTransactionType } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PlusCircleIcon, WarehouseIcon, XIcon } from '../components/ui/icons';
import { numberToBr, nowLocal } from '../utils/helpers';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';

interface StockControlScreenProps {
    locations: Location[];
    stockTransactions: StockTransaction[];
    setStockTransactions: React.Dispatch<SetStateAction<StockTransaction[]>>;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const productLabels: Record<ProductType, { label: string, unit: 'L' | 'Kg' }> = {
    'anidro': { label: 'Etanol Anidro', unit: 'L' },
    'hidratado': { label: 'Etanol Hidratado', unit: 'L' },
    'granel': { label: 'DDGS / Granel Sólido', unit: 'Kg' },
};

const productsByLocationType: Record<LocationType, ProductType[]> = {
    'terminal-liquido': ['anidro', 'hidratado'],
    'armazem-granel': ['granel'],
    'recinto-alfandegado': ['anidro', 'hidratado', 'granel'],
};

interface StockTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transaction: StockTransaction) => void;
    locations: Location[];
}

const StockTransactionModal: React.FC<StockTransactionModalProps> = ({ isOpen, onClose, onSave, locations }) => {
    const [locationId, setLocationId] = useState<string>('');
    const [product, setProduct] = useState<ProductType | ''>('');
    const [type, setType] = useState<StockTransactionType>('entrada');
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');

    const selectedLocation = useMemo(() => locations.find(l => l.id === Number(locationId)), [locationId, locations]);
    const availableProducts = selectedLocation ? productsByLocationType[selectedLocation.type] : [];

    const resetForm = () => {
        setLocationId('');
        setProduct('');
        setType('entrada');
        setQuantity('');
        setNotes('');
    };
    
    const handleSave = () => {
        if (!locationId || !product || !quantity || Number(quantity) <= 0) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const newTransaction: StockTransaction = {
            id: Date.now(),
            locationId: Number(locationId),
            product: product,
            type: type,
            quantity: Number(quantity),
            unit: productLabels[product].unit,
            timestamp: nowLocal(),
            notes: notes,
        };

        onSave(newTransaction);
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Registrar Movimentação de Estoque</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><XIcon /></Button>
                </header>
                <main className="p-6 space-y-4">
                    <Select label="Local / Terminal" value={locationId} onChange={e => { setLocationId(e.target.value); setProduct(''); }}>
                        <option value="" disabled>Selecione o local</option>
                        {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                    </Select>
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Tipo de Movimentação" value={type} onChange={e => setType(e.target.value as StockTransactionType)}>
                            <option value="entrada">Entrada</option>
                            <option value="saida">Saída</option>
                        </Select>
                         <Select label="Produto" value={product} onChange={e => setProduct(e.target.value as ProductType)} disabled={!selectedLocation}>
                            <option value="" disabled>Selecione o produto</option>
                            {availableProducts.map(p => <option key={p} value={p}>{productLabels[p].label}</option>)}
                        </Select>
                    </div>
                     <Input label="Quantidade" type="number" placeholder={`em ${product ? productLabels[product].unit : ''}`} value={quantity} onChange={e => setQuantity(e.target.value)} />
                     <Textarea label="Observações (Opcional)" placeholder="Ex: NF-e 12345, Transferência..." value={notes} onChange={e => setNotes(e.target.value)} />
                </main>
                <footer className="p-4 bg-secondary/50 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar Movimentação</Button>
                </footer>
            </div>
        </div>
    );
};


export const StockControlScreen: React.FC<StockControlScreenProps> = ({ locations, stockTransactions, setStockTransactions, showToast }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const currentStock = useMemo(() => {
        const stockByLocation: Record<number, Record<string, { quantity: number; unit: 'L' | 'Kg' }>> = {};

        stockTransactions.forEach(tx => {
            if (!stockByLocation[tx.locationId]) {
                stockByLocation[tx.locationId] = {};
            }
            if (!stockByLocation[tx.locationId][tx.product]) {
                stockByLocation[tx.locationId][tx.product] = { quantity: 0, unit: tx.unit };
            }

            const quantityChange = tx.type === 'entrada' ? tx.quantity : -tx.quantity;
            stockByLocation[tx.locationId][tx.product].quantity += quantityChange;
        });

        return stockByLocation;
    }, [stockTransactions]);

    const handleSaveTransaction = (transaction: StockTransaction) => {
        setStockTransactions(prev => [...prev, transaction]);
        showToast('Movimentação de estoque salva.');
    };

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Controle de Estoque</h1>
                    <p className="text-muted-foreground">Visão geral do inventário nos terminais e armazéns.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} icon={<PlusCircleIcon className="h-4 w-4"/>}>
                    Registrar Movimentação
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {locations.length > 0 ? locations.map(location => {
                    const locationStock = currentStock[location.id] || {};
                    const relevantProducts = productsByLocationType[location.type] || [];
                    
                    return (
                        <Card key={location.id}>
                            <h2 className="text-xl font-bold mb-1">{location.name}</h2>
                            <p className="text-sm text-muted-foreground mb-4">{location.city}, {location.state}</p>
                            <div className="space-y-3">
                                {relevantProducts.map(product => {
                                    const stock = locationStock[product];
                                    const quantity = stock ? stock.quantity : 0;
                                    const unit = productLabels[product].unit;

                                    return (
                                        <div key={product} className="flex justify-between items-baseline border-b border-border/50 pb-2">
                                            <p className="font-medium text-foreground">{productLabels[product].label}</p>
                                            <p className="text-lg font-semibold font-mono">
                                                {numberToBr(quantity, 0)}
                                                <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    );
                }) : (
                     <Card className="lg:col-span-2 text-center py-16">
                        <WarehouseIcon className="mx-auto h-16 w-16 text-muted-foreground/50" />
                        <h3 className="mt-4 text-xl font-medium">Nenhum Local Cadastrado</h3>
                        <p className="text-muted-foreground mt-2">
                            Vá para a <span className="font-semibold text-primary">Central de Cadastros</span> para adicionar seus terminais e armazéns.
                        </p>
                    </Card>
                )}
            </div>

            <StockTransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTransaction}
                locations={locations}
            />
        </main>
    );
};