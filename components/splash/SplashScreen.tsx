
import React, { useEffect } from 'react';
import { Loader2Icon } from '../ui/icons';

interface SplashScreenProps {
    onStart: () => void;
    isDataReady: boolean;
    loadingMessage: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart, isDataReady, loadingMessage }) => {
    
    useEffect(() => {
        document.body.classList.add('splash-active');
        // Clean up when the component unmounts
        return () => {
            document.body.classList.remove('splash-active');
        };
    }, []);

    return (
        <div className="splash-container">
            {isDataReady ? (
                <>
                    <div className="logo-container">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M12 2L3 22H21L12 2Z"
                                stroke="rgba(255, 255, 255, 0.9)"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M12 11.5L16.5 22H7.5L12 11.5Z"
                                fill="rgba(255, 255, 255, 0.4)"
                            />
                            <path
                                d="M7 18H17"
                                stroke="rgba(255, 255, 255, 0.9)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                    <h1>Blue Multimodal</h1>
                    <p className="slogan">“Sua logística, no tom certo”</p>
                    <div className="divider"></div>
                    <button className="btn" onClick={onStart}>
                        Enter Dashboard
                    </button>
                    <p className="footer-text">v1.0 • operations module</p>
                </>
            ) : (
                 <>
                    <div className="logo-container">
                         <Loader2Icon className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-2xl mt-4">Aguarde...</h1>
                    <p className="slogan mt-2">{loadingMessage}</p>
                    <div className="divider"></div>
                    <p className="footer-text">v1.0 • operations module</p>
                </>
            )}
        </div>
    );
};
