
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    containerClassName?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, id, containerClassName = '', className = '', error, ...props }) => {
    const hasError = !!error;
    const errorClasses = "border-destructive focus-visible:ring-destructive";
    const baseClasses = `flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${hasError ? errorClasses : ''}`;

    return (
        <div className={containerClassName}>
            {label && <label htmlFor={id} className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>}
            <input id={id} className={`${baseClasses} ${className}`} {...props} />
            {hasError && <p className="text-xs text-destructive mt-1.5">{error}</p>}
        </div>
    );
};
