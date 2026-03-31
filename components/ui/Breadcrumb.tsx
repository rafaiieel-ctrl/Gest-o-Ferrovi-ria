
import React from 'react';

interface BreadcrumbItem {
    label: string;
    onClick?: () => void;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => (
    <nav aria-label="breadcrumb" className="text-sm text-muted-foreground mb-6">
        <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
            <li key={index} className="flex items-center">
                {index > 0 && <span className="mx-2 text-foreground/50">/</span>}
                {item.onClick ? (
                    <button onClick={item.onClick} className="hover:text-foreground transition-colors hover:underline">
                        {item.label}
                    </button>
                ) : (
                    <span className="font-semibold text-foreground">{item.label}</span>
                )}
            </li>
        ))}
        </ol>
    </nav>
);
