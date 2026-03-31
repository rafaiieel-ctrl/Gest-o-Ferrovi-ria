
import React, { useRef, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';

interface SignaturePadProps {
    title: string;
    isLocked: boolean;
    signature: string | null;
    onSave: (dataUrl: string) => void;
    onClear: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ title, isLocked, signature, onSave, onClear }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const lastPos = useRef<{ x: number, y: number } | null>(null);

    const getPos = useCallback((e: MouseEvent | TouchEvent) => {
        if (!canvasRef.current) return null;
        const rect = canvasRef.current.getBoundingClientRect();
        const touch = (e as TouchEvent).touches?.[0];
        const clientX = touch ? touch.clientX : (e as MouseEvent).clientX;
        const clientY = touch ? touch.clientY : (e as MouseEvent).clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }, []);

    const draw = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDrawing.current || isLocked) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        const pos = getPos(e);
        if (!pos || !lastPos.current) return;

        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastPos.current = pos;
    }, [isLocked, getPos]);

    const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
        if (isLocked) return;
        e.preventDefault();
        isDrawing.current = true;
        lastPos.current = getPos(e);
    }, [isLocked, getPos]);

    const stopDrawing = useCallback(() => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        if (canvasRef.current) {
            onSave(canvasRef.current.toDataURL('image/png'));
        }
    }, [onSave]);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        onClear();
    }, [onClear]);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        
        if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        }
        
        ctx.strokeStyle = '#000000'; // Always draw in black
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (signature) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
            };
            img.src = signature;
        }
        
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        window.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        window.addEventListener('touchend', stopDrawing);
        
        return () => {
            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mousemove', draw);
            window.removeEventListener('mouseup', stopDrawing);
            canvas.removeEventListener('touchstart', startDrawing);
            canvas.removeEventListener('touchmove', draw);
            window.removeEventListener('touchend', stopDrawing);
        };
    }, [startDrawing, draw, stopDrawing, signature]);

    return (
        <div className="border border-border rounded-lg p-2 bg-card">
            <h4 className="text-sm font-semibold text-muted-foreground text-center mb-2">{title}</h4>
            <div className={`w-full h-36 rounded-md bg-gray-100 dark:bg-gray-800`}>
                <canvas
                    ref={canvasRef}
                    className={`w-full h-full dark:invert ${isLocked ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
                    style={{ touchAction: 'none' }}
                />
            </div>
            <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearCanvas} disabled={isLocked}>Limpar</Button>
            </div>
        </div>
    );
};
