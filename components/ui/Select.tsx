
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    containerClassName?: string;
    children: React.ReactNode;
    error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, id, containerClassName = '', className = '', children, error, ...props }) => {
    const hasError = !!error;
    const errorClasses = "border-destructive focus-visible:ring-destructive";
    const baseClasses = `flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${hasError ? errorClasses : ''}`;
    
    return (
        <div className={containerClassName}>
            {label && <label htmlFor={id} className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>}
            <select id={id} className={`${baseClasses} ${className}`} {...props}>
                {children}
            </select>
            {hasError && <p className="text-xs text-destructive mt-1.5">{error}</p>}
        </div>
    );
};
