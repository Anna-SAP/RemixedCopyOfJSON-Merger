
import React, { useState } from 'react';
import { Icon } from './Icon';

interface ResultDisplayProps {
    content: string;
    blob: Blob;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ content, blob }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            const fullText = await blob.text();
            await navigator.clipboard.writeText(fullText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleDownload = () => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const today = new Date();
        const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        
        a.href = url;
        a.download = `merged_translations_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="relative bg-slate-100 dark:bg-slate-900 rounded-lg">
            <div className="absolute top-2 right-2 flex space-x-2">
                <button
                    onClick={handleCopy}
                    className="p-2 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
                    title={copied ? "Copied!" : "Copy full content to clipboard"}
                >
                    <Icon name={copied ? 'check' : 'copy'} className={`w-5 h-5 ${copied ? 'text-green-500' : 'text-slate-600 dark:text-slate-300'}`} />
                </button>
                <button
                    onClick={handleDownload}
                    className="p-2 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
                    title="Download as JSON"
                >
                    <Icon name="download" className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
            </div>
            <pre className="w-full h-96 overflow-auto p-4 text-sm text-left rounded-lg">
                <code className="language-json">{content}</code>
            </pre>
        </div>
    );
};
