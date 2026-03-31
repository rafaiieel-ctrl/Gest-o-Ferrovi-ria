import React from 'react';
import { Theme } from '../../types';
import { Button } from '../ui/Button';
import { SunIcon, MoonIcon } from '../ui/icons';

interface ThemeToggleProps {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, setTheme }) => {
    // Determine the current visual theme, resolving 'system' preference.
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const toggleTheme = () => {
        // Explicitly set theme to light or dark, moving away from 'system'
        setTheme(isDark ? 'light' : 'dark');
    };

    return (
        <Button
            variant="secondary"
            size="sm"
            onClick={toggleTheme}
            className="px-2"
            aria-label={`Mudar para tema ${isDark ? 'claro' : 'escuro'}`}
            title={`Mudar para tema ${isDark ? 'claro' : 'escuro'}`}
        >
            {isDark
                ? <SunIcon className="h-4 w-4" />
                : <MoonIcon className="h-4 w-4" />
            }
        </Button>
    );
};
