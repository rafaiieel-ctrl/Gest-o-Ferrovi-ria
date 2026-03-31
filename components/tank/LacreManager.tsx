
import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { QrCodeIcon, XIcon, PlusCircleIcon } from '../ui/icons';
import { QRCodeModal } from '../modals/QRCodeModal';

interface LacreManagerProps {
    lacres: string[];
    onLacreChange: (newLacres: string[]) => void;
}

export const LacreManager: React.FC<LacreManagerProps> = ({ lacres, onLacreChange }) => {
    const [inputValue, setInputValue] = useState('');
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);

    const addLacre = (lacre: string) => {
        const value = lacre.trim();
        if (value && !lacres.includes(value)) {
            onLacreChange([...lacres, value]);
        }
    };

    const handleAddClick = () => {
        addLacre(inputValue);
        setInputValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddClick();
        }
    };

    const removeLacre = (lacreToRemove: string) => {
        onLacreChange(lacres.filter(l => l !== lacreToRemove));
    };

    const handleQrScan = (scannedValue: string) => {
        addLacre(scannedValue);
        setIsQrModalOpen(false);
    };

    return (
        <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Lacres</label>
            <div className="flex flex-wrap gap-2 items-center">
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Adicionar número do lacre"
                    className="flex-grow min-w-[200px]"
                    containerClassName="flex-grow"
                    inputMode="numeric"
                    pattern="[0-9]*"
                />
                <Button variant="secondary" onClick={handleAddClick} icon={<PlusCircleIcon className="h-4 w-4" />}>Adicionar</Button>
                <Button variant="secondary" onClick={() => setIsQrModalOpen(true)} icon={<QrCodeIcon className="h-4 w-4" />}>Ler QR</Button>
            </div>
            {lacres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {lacres.map(lacre => (
                        <span key={lacre} className="flex items-center gap-1.5 bg-secondary text-secondary-foreground text-xs font-medium px-2.5 py-1 rounded-full">
                            {lacre}
                            <button onClick={() => removeLacre(lacre)} className="text-muted-foreground hover:text-foreground">
                                <XIcon className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <QRCodeModal
                isOpen={isQrModalOpen}
                onClose={() => setIsQrModalOpen(false)}
                onScan={handleQrScan}
            />
        </div>
    );
};
