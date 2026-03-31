
import React from 'react';
import { Button } from '../ui/Button';
import { PlusCircleIcon, FileDownIcon, FileTextIcon, CalculatorIcon } from '../ui/icons';

interface MainActionsProps {
    onAddTank: () => void;
    onCalcAll: () => void;
    onExport: () => void;
    onReport: () => void;
    isVesselOperation: boolean;
}

export const MainActions: React.FC<MainActionsProps> = ({ onAddTank, onCalcAll, onExport, onReport, isVesselOperation }) => {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {!isVesselOperation && (
                <Button onClick={onAddTank} variant="secondary" icon={<PlusCircleIcon className="w-4 h-4"/>}>
                    Adicionar Tanque
                </Button>
            )}
             <div className="flex-grow"></div>
            <Button onClick={onExport} variant="secondary" icon={<FileDownIcon className="w-4 h-4"/>}>Exportar CSV</Button>
            <Button onClick={onReport} variant="secondary" icon={<FileTextIcon className="w-4 h-4"/>}>Gerar Relatório</Button>
            <Button onClick={onCalcAll} variant="primary" icon={<CalculatorIcon className="w-4 h-4"/>}>Calcular Todos</Button>
        </div>
    );
};
