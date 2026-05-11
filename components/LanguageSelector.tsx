
import React, { useState } from 'react';
import { Icon } from './Icon';

export const LOCALE_LIST = [
    'en-US', 'de-DE', 'en-AU', 'en-GB', 'es-419', 'es-ES', 'fi-FI', 
    'fr-CA', 'fr-FR', 'it-IT', 'ja-JP', 'ko-KR', 'nl-NL', 'pt-BR', 
    'pt-PT', 'zh-CN', 'zh-HK', 'zh-TW'
];

interface LanguageSelectorProps {
    data: any[];
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ data }) => {
    // Default to all selected
    const [selected, setSelected] = useState<Set<string>>(new Set(LOCALE_LIST));

    const toggleLang = (lang: string) => {
        const newSet = new Set(selected);
        if (newSet.has(lang)) {
            newSet.delete(lang);
        } else {
            newSet.add(lang);
        }
        setSelected(newSet);
    };

    const handleSelectAll = () => setSelected(new Set(LOCALE_LIST));
    const handleDeselectAll = () => setSelected(new Set());

    const handleDownload = () => {
        if (selected.size === 0) return;

        const today = new Date();
        const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        const filteredData = data.map((item: any) => {
            const newItem: any = { key: item.key };
            // We iterate over the selected languages and grab them from the item if they exist
            selected.forEach(lang => {
                if (Object.prototype.hasOwnProperty.call(item, lang)) {
                    newItem[lang] = item[lang];
                }
            });
            return newItem;
        });

        const jsonString = JSON.stringify(filteredData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `merged_selection_${dateStr}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="mt-8 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg text-sky-600 dark:text-sky-400">
                        <Icon name="combine" className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-tight">
                            Custom Language Download
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Select specific languages to export</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={handleSelectAll}
                        className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                    >
                        Select All
                    </button>
                    <button 
                        onClick={handleDeselectAll}
                        className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                        Deselect All
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
                {LOCALE_LIST.map(lang => {
                    const isSelected = selected.has(lang);
                    return (
                        <button
                            key={lang}
                            onClick={() => toggleLang(lang)}
                            className={`
                                relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border text-center
                                ${isSelected 
                                    ? 'bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/20' 
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50 dark:hover:bg-slate-700/50'
                                }
                            `}
                        >
                            {lang}
                        </button>
                    );
                })}
            </div>

            <div className="flex justify-end border-t border-slate-200 dark:border-slate-700 pt-6">
                <button
                    onClick={handleDownload}
                    disabled={selected.size === 0}
                    className={`
                        flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white transition-all duration-200
                        ${selected.size > 0 
                            ? 'bg-sky-500 hover:bg-sky-600 shadow-lg shadow-sky-500/25 transform hover:-translate-y-0.5 active:translate-y-0' 
                            : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-70'
                        }
                    `}
                >
                    <Icon name="download" className="w-5 h-5" />
                    Download Selected ({selected.size})
                </button>
            </div>
        </div>
    );
};
