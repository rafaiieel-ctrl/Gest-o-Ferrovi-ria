import React from 'react';
import { Button } from '../ui/Button';
import { AlertTriangleIcon, HelpCircleIcon } from '../ui/icons';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    children: React.ReactNode;
    variant?: 'default' | 'destructive';
    confirmText?: string;
    icon?: React.ReactNode;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    children, 
    variant = 'destructive', 
    confirmText,
    icon
}) => {
    if (!isOpen) return null;

    const themes = {
        default: {
            borderColor: 'border-border',
            iconBg: 'bg-secondary',
            icon: <HelpCircleIcon className="h-6 w-6 text-primary" />,
            confirmVariant: 'primary' as const,
            confirmText: 'Confirmar',
        },
        destructive: {
            borderColor: 'border-destructive/50',
            iconBg: 'bg-danger-100',
            icon: <AlertTriangleIcon className="h-6 w-6 text-destructive" />,
            confirmVariant: 'destructive' as const,
            confirmText: 'Excluir Permanentemente',
        },
    };

    const currentTheme = themes[variant];
    const finalConfirmText = confirmText || currentTheme.confirmText;


    return (
        <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in"
            style={{ animationDuration: '200ms' }}
            onClick={onClose}
        >
            <div 
                className={`bg-card rounded-lg shadow-xl w-full max-w-md m-4 border-2 ${currentTheme.borderColor}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${currentTheme.iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
                            {icon || currentTheme.icon}
                        </div>
                        <div className="mt-0 text-left">
                            <h3 className="text-lg leading-6 font-bold text-foreground" id="modal-title">
                                {title}
                            </h3>
                            <div className="mt-2">
                                <div className="text-sm text-muted-foreground space-y-2">
                                    {children}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-secondary/50 px-6 py-3 flex flex-row-reverse gap-2 rounded-b-lg">
                    <Button variant={currentTheme.confirmVariant} onClick={onConfirm}>
                        {finalConfirmText}
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                </div>
            </div>
        </div>
    );
};