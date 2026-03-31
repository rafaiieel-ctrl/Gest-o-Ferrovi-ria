
import React, { useRef } from 'react';
import { Button } from '../ui/Button';

interface OperationActionsProps {
    onSave: () => void;
    onLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onNew: () => void;
    onConclude: () => void;
}

export const OperationActions: React.FC<OperationActionsProps> = ({ onSave, onLoad, onNew, onConclude }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onNew}>Novo</Button>
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>Abrir</Button>
            <Button variant="secondary" size="sm" onClick={onSave}>Salvar</Button>
            <input type="file" ref={fileInputRef} onChange={onLoad} accept=".json,application/json" className="hidden" />
            <Button variant="primary" onClick={onConclude}>Concluir Operação</Button>
        </div>
    );
};
