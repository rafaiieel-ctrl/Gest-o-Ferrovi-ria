
import React, { useState, useEffect } from 'react';
import { Signatures } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SignaturePad } from './SignaturePad';

interface SignatureSectionProps {
    signatures: Signatures;
    setSignatures: React.Dispatch<React.SetStateAction<Signatures>>;
}

export const SignatureSection: React.FC<SignatureSectionProps> = ({ signatures, setSignatures }) => {
    const [isLocked, setIsLocked] = useState(true);
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        let timer: number | undefined;
        if (countdown > 0) {
            timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
        } else if (!isLocked) {
            setIsLocked(true);
        }
        return () => clearTimeout(timer);
    }, [countdown, isLocked]);

    const handleUnlock = () => {
        setIsLocked(false);
        setCountdown(15);
    };

    const handleLock = () => {
        setIsLocked(true);
        setCountdown(0);
    };

    const handleSignatureChange = (key: keyof Signatures, dataUrl: string | null) => {
        setSignatures(prev => ({ ...prev, [key]: dataUrl }));
    };

    const handleClear = (key: keyof Signatures) => {
        setSignatures(prev => ({ ...prev, [key]: null }));
    };

    return (
        <Card>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <h2 className="text-xl font-semibold">Assinaturas</h2>
                <div className="flex items-center gap-2">
                    <span className={`text-sm px-3 py-1 rounded-full ${isLocked ? 'bg-muted/30' : 'bg-success-500/30 text-success-500'}`}>
                        {isLocked ? '🔒 Bloqueado' : `🔓 Desbloqueado (${countdown}s)`}
                    </span>
                    {isLocked ? (
                        <Button onClick={handleUnlock} variant="secondary">Desbloquear</Button>
                    ) : (
                        <Button onClick={handleLock} variant="secondary">Bloquear</Button>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SignaturePad
                    title="Transportador"
                    isLocked={isLocked}
                    signature={signatures.transportador}
                    onSave={(dataUrl) => handleSignatureChange('transportador', dataUrl)}
                    onClear={() => handleClear('transportador')}
                />
                <SignaturePad
                    title="Certificadora"
                    isLocked={isLocked}
                    signature={signatures.certificadora}
                    onSave={(dataUrl) => handleSignatureChange('certificadora', dataUrl)}
                    onClear={() => handleClear('certificadora')}
                />
                <SignaturePad
                    title="Representante"
                    isLocked={isLocked}
                    signature={signatures.representante}
                    onSave={(dataUrl) => handleSignatureChange('representante', dataUrl)}
                    onClear={() => handleClear('representante')}
                />
            </div>
        </Card>
    );
};
