import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PipelineIcon, TrainIcon, ShipIcon, TruckIcon, PlaneIcon, AnchorIcon } from '../components/ui/icons';

const MODALS = [
    { id: 'dutoviario', label: 'Dutoviário', icon: <PipelineIcon className="h-10 w-10 text-primary" />, path: '/planning/pipeline', description: 'Planejamento de Dutos' },
    { id: 'ferroviario', label: 'Ferroviário', icon: <TrainIcon className="h-10 w-10 text-primary" />, path: '/planning/rail', description: 'Planejamento de Trens' },
    { id: 'fluvial', label: 'Fluvial', icon: <AnchorIcon className="h-10 w-10 text-primary" />, path: '/planning/fluvial', description: 'Planejamento de Balsas' },
    { id: 'maritimo', label: 'Marítimo', icon: <ShipIcon className="h-10 w-10 text-primary" />, path: '/planning/maritime', description: 'Planejamento de Navios' },
    { id: 'rodoviario', label: 'Rodoviário', icon: <TruckIcon className="h-10 w-10 text-primary" />, path: '/planning/road', description: 'Planejamento de Caminhões' },
    { id: 'aereo', label: 'Aéreo', icon: <PlaneIcon className="h-10 w-10 text-primary" />, path: '/planning/air', description: 'Planejamento Aéreo' },
];

const ModalCard: React.FC<{ label: string; icon: React.ReactNode; description?: string; onClick: () => void; }> = ({ label, icon, description, onClick }) => (
    <Card 
        padding="lg" 
        onClick={onClick}
        className="text-center group cursor-pointer hover:!border-primary hover:-translate-y-1 transform-gpu"
    >
        <div className="mb-4 inline-block p-4 bg-secondary rounded-full group-hover:bg-primary/10 transition-colors duration-300">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-foreground">{label}</h3>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </Card>
);

export const MultimodalPlanningScreen: React.FC = () => {
    const navigate = useNavigate();

    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight">Central de planejamento multimodal</h1>
                <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Selecione o modal que deseja programar. Cada um possui um fluxo de planejamento e operação específico.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {MODALS.map(modal => (
                    <ModalCard 
                        key={modal.id}
                        label={modal.label}
                        icon={modal.icon}
                        description={modal.description}
                        onClick={() => navigate(modal.path)}
                    />
                ))}
            </div>
        </main>
    );
};