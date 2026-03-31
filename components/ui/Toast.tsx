import React, { useEffect } from 'react';
import { Button } from './Button';
import { CheckCircleIcon, XCircleIcon, XIcon } from './icons';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, action }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Increased duration to 5s to allow user to click

    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: {
      icon: <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0" />,
      style: 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
    },
    error: {
      icon: <XCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />,
      style: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
    },
  };
  
  const currentConfig = config[type];

  return (
    <div 
        className={`fixed top-8 right-8 z-[100] flex items-start gap-4 p-4 rounded-lg border shadow-lg max-w-sm ${currentConfig.style}`}
        style={{ animation: 'fadeIn 0.5s ease-out, fadeOut 0.5s ease-in 4.5s forwards' }}
    >
      {currentConfig.icon}
      <div className="flex-grow">
        <p className="font-semibold">{message}</p>
        {action && (
             <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                    e.stopPropagation(); // prevent toast from closing if clicked
                    action.onClick();
                    onClose(); // close toast after action
                }}
                className="!p-0 !h-auto mt-2 text-current font-bold underline hover:bg-transparent"
            >
                {action.label}
            </Button>
        )}
      </div>
       <button onClick={onClose} className="flex-shrink-0 -mt-1 -mr-1 p-1 rounded-full hover:bg-black/10">
            <XIcon className="h-5 w-5 opacity-70 hover:opacity-100" />
       </button>
    </div>
  );
};
