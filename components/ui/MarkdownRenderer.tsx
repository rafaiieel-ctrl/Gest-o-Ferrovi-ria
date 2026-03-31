import React from 'react';

export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    // A very simple markdown-to-React parser
    const renderLines = () => {
        const lines = content.split('\n');
        const elements: React.ReactNode[] = [];
        let listItems: string[] = [];

        const flushList = () => {
            if (listItems.length > 0) {
                elements.push(
                    <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1">
                        {listItems.map((item, index) => <li key={index}>{renderInlines(item)}</li>)}
                    </ul>
                );
                listItems = [];
            }
        };

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                listItems.push(trimmedLine.substring(2));
            } else {
                flushList();
                elements.push(<p key={`p-${index}`}>{renderInlines(line)}</p>);
            }
        });

        flushList();
        return elements;
    };

    const renderInlines = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div className="text-sm whitespace-pre-wrap font-sans space-y-2">
            {renderLines()}
        </div>
    );
};