
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    padding?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ children, className = '', padding = 'md', ...props }) => {
    const paddingClasses = {
        sm: 'p-2 md:p-3',
        md: 'p-4 md:p-6',
        lg: 'p-6 md:p-8',
    };

    return (
        <div {...props} className={`
            bg-card border border-border rounded-xl shadow-lg 
            bg-gradient-to-br from-card to-card/90
            transition-all duration-300
            hover:border-brand-500/50
            ${paddingClasses[padding]} ${className}
        `}>
            {children}
        </div>
    );
};
