import React from 'react';
import { Tank, OperationDetails } from '../../types';
import { TankCard } from './TankCard';
import { Card } from '../ui/Card';
import { ShipIcon } from '../ui/icons';

interface TankListProps {
    tanks: Tank[];
    operationDetails: OperationDetails;
    onUpdate: (id: number, updatedTank: Tank) => void;
    onDelete: (id: number) => void;
    onDuplicate: (id: number) => void;
    activeOperationType: 'loading' | 'unloading' | null;
    tankErrors: Record<number, Partial<Record<keyof Tank, string>>>;
    onValidateTankField: (tankId: number, field: keyof Tank, value: string) => boolean;
    onClearTankError: (tankId: number, field: keyof Tank) => void;
}

export const TankList: React.FC<TankListProps> = ({ 
    tanks, operationDetails, onUpdate, onDelete, onDuplicate, activeOperationType,
    tankErrors, onValidateTankField, onClearTankError
}) => {
    if (operationDetails.vesselId && tanks.length === 0) {
        return (
            <Card padding="lg">
                <div className="text-center text-muted-foreground">
                    <ShipIcon className="mx-auto h-12 w-12 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">Nenhum Tanque Configurado</h3>
                    <p className="mt-1">Esta embarcação ainda não possui tanques cadastrados.</p>
                    <p>Vá para a tela de <span className="font-semibold text-primary">Equipamentos</span> para adicionar os tanques e suas curvas de calibração.</p>
                </div>
            </Card>
        );
    }
    
    return (
        <div className="space-y-4">
            {tanks.map((tank, index) => (
                <TankCard
                    key={tank.id}
                    tank={tank}
                    index={index}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    activeOperationType={activeOperationType}
                    errors={tankErrors[tank.id] || {}}
                    onValidate={onValidateTankField}
                    onClearError={onClearTankError}
                />
            ))}
        </div>
    );
};
