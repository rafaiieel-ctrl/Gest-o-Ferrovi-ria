import React, { useEffect } from 'react';
import { AppNotification } from '../../types';
import { BellIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon, XIcon } from '../ui/icons';
import { Button } from '../ui/Button';

interface NotificationPopoverProps {
    notifications: AppNotification[];
    setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
    onClose: () => void;
}

const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " anos atrás";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses atrás";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " dias atrás";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " horas atrás";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " min atrás";
    if (seconds < 5) return "agora";
    return Math.floor(seconds) + " seg atrás";
};

const typeIcons = {
    info: <CheckCircleIcon className="h-5 w-5 text-blue-500" />,
    warning: <AlertTriangleIcon className="h-5 w-5 text-yellow-500" />,
    error: <XCircleIcon className="h-5 w-5 text-red-500" />,
};

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ notifications, setNotifications, onClose }) => {
    
    useEffect(() => {
        // Mark notifications as read when popover opens
        const hasUnread = notifications.some(n => !n.isRead);
        if(hasUnread) {
            const timeoutId = setTimeout(() => {
                setNotifications(prev => prev.map(n => ({...n, isRead: true})));
            }, 1000); // Delay marking as read for a better UX
             return () => clearTimeout(timeoutId);
        }
    }, [notifications, setNotifications]);

    const clearAll = () => {
        setNotifications([]);
        onClose();
    };

    return (
        <div className="absolute bottom-0 left-full ml-2 w-80 bg-card border rounded-lg shadow-2xl z-50 flex flex-col max-h-[400px]">
            <header className="p-3 border-b flex justify-between items-center">
                <h3 className="font-semibold">Notificações</h3>
                <div className="flex items-center gap-2">
                    {notifications.length > 0 && <Button variant="ghost" size="sm" onClick={clearAll}>Limpar tudo</Button>}
                    <Button variant="ghost" size="sm" className="!p-2" onClick={onClose}><XIcon className="h-4 w-4"/></Button>
                </div>
            </header>
            <div className="overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        <BellIcon className="h-8 w-8 mx-auto mb-2" />
                        <p>Nenhuma notificação nova.</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div key={n.id} className="p-3 border-b last:border-0 flex gap-3 hover:bg-secondary/50">
                            <div className="flex-shrink-0 mt-1">{typeIcons[n.type]}</div>
                            <div>
                                <p className="font-semibold text-sm">{n.title}</p>
                                <p className="text-xs text-muted-foreground">{n.message}</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">{formatTimeAgo(n.timestamp)}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};