import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Theme, AppNotification } from '../../types';
import { ThemeToggle } from './ThemeToggle';
import { HomeIcon, ShipIcon, BarChart3Icon, ClipboardPasteIcon, ChevronLeftIcon, GlobeIcon, DatabaseIcon, LockIcon, FileTextIcon, WarehouseIcon, DollarSignIcon, BriefcaseIcon, Settings2Icon, BellIcon, XIcon } from '../ui/icons';
import { NotificationPopover } from '../notifications/NotificationPopover';
import { Button } from '../ui/Button';

interface HeaderProps {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    onLock: () => void;
    notifications: AppNotification[];
    setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
}

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <BarChart3Icon /> },
    { path: '/planning', label: 'Planejamento', icon: <GlobeIcon /> },
    { path: '/operations-hub', label: 'Operações', icon: <HomeIcon /> },
    { path: '/stock-control', label: 'Estoque', icon: <WarehouseIcon /> },
    { path: '/cost-control', label: 'Custos', icon: <DollarSignIcon /> },
    { path: '/registration-hub', label: 'Cadastros', icon: <DatabaseIcon /> },
    { path: '/backoffice', label: 'Backoffice', icon: <BriefcaseIcon /> },
    { path: '/settings', label: 'Configurações', icon: <Settings2Icon /> },
    { path: '/reports', label: 'Relatórios', icon: <FileTextIcon /> },
];

const mobileNavItems = [
    { path: '/planning', label: 'Planejamento', icon: <GlobeIcon /> },
    { path: '/operations-hub', label: 'Operações', icon: <HomeIcon /> },
    { path: '/registration-hub', label: 'Cadastros', icon: <DatabaseIcon /> },
    { path: '/dashboard', label: 'Dashboard', icon: <BarChart3Icon /> },
    { path: '/settings', label: 'Ajustes', icon: <Settings2Icon /> },
];


export const Header: React.FC<HeaderProps> = ({ theme, setTheme, onLock, notifications, setNotifications }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsPopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const togglePopover = () => {
        setIsPopoverOpen(prev => !prev);
    };

    return (
        <aside className={`
            fixed bg-card z-50
            bottom-0 left-0 w-full h-20 border-t border-border  /* Mobile styles */
            md:top-0 md:left-0 md:h-full md:w-20 md:border-r md:border-t-0 md:py-6 /* Desktop styles */
            flex md:flex-col items-center
        `}>
            {/* Desktop Nav */}
            <nav className="hidden md:flex flex-col items-center gap-4 mt-0">
                {navItems.map(item => {
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                        <Link 
                            key={item.path}
                            to={item.path}
                            title={item.label}
                            className={`
                                p-3 rounded-lg transition-all duration-200
                                ${isActive 
                                    ? 'bg-primary text-primary-foreground shadow-lg' 
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'}
                            `}
                        >
                            {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: 'h-6 w-6' })}
                        </Link>
                    );
                })}
            </nav>

            {/* Mobile Nav */}
            <nav className="flex md:hidden w-full h-full justify-around items-center">
                {mobileNavItems.map(item => {
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                        <Link 
                            key={item.path}
                            to={item.path}
                            title={item.label}
                            className={`
                                flex flex-col items-center justify-center h-full p-2 transition-all duration-200 w-full
                                ${isActive 
                                    ? 'text-primary' 
                                    : 'text-muted-foreground hover:text-foreground'}
                            `}
                        >
                            {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: 'h-6 w-6' })}
                            <span className="text-xs mt-1 font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Desktop Controls */}
            <div className="hidden md:flex mt-auto flex-col items-center gap-2">
                 <div className="relative">
                    <button 
                        onClick={togglePopover}
                        title="Notificações" 
                        className="p-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <BellIcon className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">{unreadCount}</span>
                            </span>
                        )}
                    </button>
                    {isPopoverOpen && (
                        <div ref={popoverRef}>
                            <NotificationPopover 
                                notifications={notifications} 
                                setNotifications={setNotifications}
                                onClose={() => setIsPopoverOpen(false)}
                            />
                        </div>
                    )}
                </div>
                <button 
                    onClick={onLock} 
                    title="Bloquear e Sair" 
                    className="p-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                    <LockIcon className="h-5 w-5" />
                </button>
                <ThemeToggle theme={theme} setTheme={setTheme} />
            </div>
        </aside>
    );
};
