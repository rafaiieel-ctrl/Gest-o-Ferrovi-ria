
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/library';
import { XIcon } from '../ui/icons';
import { Button } from '../ui/Button';

interface QRCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (result: string) => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, onScan }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState('');
    const controlsRef = useRef<IScannerControls | null>(null);

    const stopScan = useCallback(() => {
        if (controlsRef.current) {
            controlsRef.current.stop();
            controlsRef.current = null;
        }
    }, []);

    const startScan = useCallback(async () => {
        if (!videoRef.current) return;
        setError('');
        stopScan(); // Ensure any previous scan is stopped
        const codeReader = new BrowserQRCodeReader();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                controlsRef.current = await codeReader.decodeFromStream(stream, videoRef.current, (result, err) => {
                    if (result) {
                        onScan(result.getText());
                        stopScan();
                    }
                    if (err && !(err instanceof DOMException && err.name === 'NotFoundError')) {
                       // Non-critical decoding errors can be ignored to allow retries
                    }
                });
            }
        } catch (err) {
            console.error("Camera Error:", err);
            let message = 'Ocorreu um erro desconhecido ao acessar a câmera.';
            if (err instanceof Error) {
                if (err.name === 'NotAllowedError') {
                    message = 'Permissão para acessar a câmera foi negada.';
                } else if (err.name === 'NotFoundError') {
                     message = 'Nenhuma câmera foi encontrada neste dispositivo.';
                } else {
                    message = 'Não foi possível iniciar a câmera.';
                }
            }
            setError(`${message} Por favor, tente enviar uma foto do QR code.`);
        }
    }, [onScan, stopScan]);

    useEffect(() => {
        if (isOpen) {
            startScan();
        } else {
            stopScan();
        }
        return () => {
            stopScan();
        };
    }, [isOpen, startScan, stopScan]);
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError('');
        const codeReader = new BrowserQRCodeReader();
        try {
            const imageUrl = URL.createObjectURL(file);
            const result = await codeReader.decodeFromImageUrl(imageUrl);
            URL.revokeObjectURL(imageUrl);
            onScan(result.getText());
        } catch (err) {
            console.error("File Scan Error:", err);
            setError('Não foi possível encontrar um QR code na imagem selecionada.');
        } finally {
            // Reset file input to allow scanning the same file again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Ler QR Code do Lacre</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-4">
                    <video ref={videoRef} className="w-full rounded-md bg-black" />
                    <p className="text-muted-foreground text-xs mt-2 text-center">Aponte a câmera para o QR code para leitura automática.</p>
                </div>
                <div className="p-4 border-t border-border">
                    {error && <p className="text-destructive text-sm text-center mb-3">{error}</p>}
                    <Button 
                        variant="secondary" 
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}>
                        📸 Enviar Foto do QR Code
                    </Button>
                     <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>
            </div>
        </div>
    );
};
