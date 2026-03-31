import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Wand2Icon, Loader2Icon } from '../ui/icons';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';

interface AIAnalystProps {
    onAnalyze: (prompt: string) => void;
    result: string;
    isLoading: boolean;
}

export const AIAnalyst: React.FC<AIAnalystProps> = ({ onAnalyze, result, isLoading }) => {
    const [prompt, setPrompt] = useState('');
    const [showResult, setShowResult] = useState(false);

    const handleSubmit = () => {
        if (!prompt.trim()) return;
        setShowResult(true);
        onAnalyze(prompt);
    };

    const handleSuggestionClick = (suggestion: string) => {
        setPrompt(suggestion);
        setShowResult(true);
        onAnalyze(suggestion);
    };

    const suggestions = [
        "Resuma os pontos chave desta operação.",
        "Existe alguma medição fora dos padrões da ANP?",
        "Qual cliente teve o maior volume V@20 total?",
        "Compare o volume de produto anidro vs. hidratado."
    ];

    return (
        <Card padding="sm">
            <div className="flex items-center gap-2 mb-4">
                <Wand2Icon className="h-6 w-6 text-brand-500" />
                <h2 className="text-xl font-semibold">Análise com IA (Gemini)</h2>
            </div>
            <div className="space-y-4">
                <div>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Faça uma pergunta sobre os dados da operação..."
                        className="w-full p-2 rounded-md border border-input bg-background text-sm min-h-[60px]"
                        rows={2}
                    />
                    <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-2">
                        <span>Sugestões:</span>
                        {suggestions.map(s => (
                            <button key={s} onClick={() => handleSuggestionClick(s)} className="underline hover:text-foreground">{s}</button>
                        ))}
                    </div>
                </div>
                <Button onClick={handleSubmit} disabled={isLoading || !prompt.trim()}>
                    {isLoading ? <Loader2Icon className="h-4 w-4 mr-2"/> : null}
                    Analisar Dados
                </Button>
                {showResult && (
                    <div className="p-4 bg-secondary rounded-md min-h-[100px]">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <Loader2Icon className="h-6 w-6 mr-2"/>
                                Analisando...
                            </div>
                        ) : (
                            <MarkdownRenderer content={result} />
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
};