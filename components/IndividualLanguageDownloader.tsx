
import React, { useState } from 'react';
import { Icon } from './Icon';
import { LOCALE_LIST } from './LanguageSelector';

// Declare JSZip assuming it's loaded globally via script tag as per existing app structure
declare const JSZip: any;

interface IndividualLanguageDownloaderProps {
    data: any[];
}

export const IndividualLanguageDownloader: React.FC<IndividualLanguageDownloaderProps> = ({ data }) => {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    // Track which action is currently processing: 'json', 'csv', 'md', or null
    const [processingType, setProcessingType] = useState<'json' | 'csv' | 'md' | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

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

    const generateCsvContent = (lang: string) => {
        const rows = [];
        // Header
        rows.push(['Key', 'Value']);
        
        data.forEach((row: any) => {
            if (Object.prototype.hasOwnProperty.call(row, lang)) {
                rows.push([row.key, row[lang]]);
            }
        });

        // Convert to CSV string: escape quotes and wrap fields in quotes
        const csvString = rows.map(row => 
            row.map(field => {
                const stringField = String(field || '');
                return `"${stringField.replace(/"/g, '""')}"`;
            }).join(',')
        ).join('\n');

        // Add UTF-8 BOM (\uFEFF) so Excel recognizes it as UTF-8
        return '\uFEFF' + csvString;
    };

    const generateMarkdownContent = (lang: string) => {
        const rows = [];
        // Table Header
        rows.push('| Key | Value |');
        rows.push('| --- | --- |');
        
        data.forEach((row: any) => {
            if (Object.prototype.hasOwnProperty.call(row, lang)) {
                // Escape pipes | to prevent breaking table structure, replace newlines with <br>
                const key = row.key.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
                const value = String(row[lang] || '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
                rows.push(`| ${key} | ${value} |`);
            }
        });

        return rows.join('\n');
    };

    const handleDownload = async (type: 'json' | 'csv' | 'md') => {
        if (selected.size === 0) return;
        
        setProcessingType(type);
        setDownloadProgress(0);
        setError(null);

        const today = new Date();
        const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        try {
            const extension = type;
            let mimeType = 'application/json';
            if (type === 'csv') mimeType = 'text/csv;charset=utf-8;';
            if (type === 'md') mimeType = 'text/markdown;charset=utf-8;';

            // Case 1: Single file download
            if (selected.size === 1) {
                const lang = Array.from(selected)[0] as string;
                let content: string;

                if (type === 'json') {
                    const langData: Record<string, string> = {};
                    data.forEach((row: any) => {
                        if (Object.prototype.hasOwnProperty.call(row, lang)) {
                            langData[row.key] = row[lang];
                        }
                    });
                    content = JSON.stringify(langData, null, 2);
                } else if (type === 'csv') {
                    content = generateCsvContent(lang);
                } else {
                    content = generateMarkdownContent(lang);
                }

                const blob = new Blob([content], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                
                const filename = `${lang.replace('-', '_')}_locale_${dateStr}.${extension}`;
                
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                setDownloadProgress(100);
                setTimeout(() => {
                    setDownloadProgress(null);
                }, 1000);
            } 
            // Case 2: Multiple files (ZIP)
            else {
                const zip = new JSZip();
                
                selected.forEach((lang: string) => {
                    let content: string;
                    if (type === 'json') {
                         const langData: Record<string, string> = {};
                         data.forEach((row: any) => {
                             if (Object.prototype.hasOwnProperty.call(row, lang)) {
                                 langData[row.key] = row[lang];
                             }
                         });
                         content = JSON.stringify(langData, null, 2);
                    } else if (type === 'csv') {
                        content = generateCsvContent(lang);
                    } else {
                        content = generateMarkdownContent(lang);
                    }
                    
                    const filename = `${lang.replace('-', '_')}_locale_${dateStr}.${extension}`;
                    zip.file(filename, content);
                });

                await zip.generateAsync(
                    { type: "blob" }, 
                    (metadata: { percent: number }) => {
                        setDownloadProgress(metadata.percent);
                    }
                ).then((blob: Blob) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `locales_${extension}_bundle_${dateStr}.zip`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    setTimeout(() => setDownloadProgress(null), 1000);
                });
            }
        } catch (err: any) {
            console.error(err);
            setError(`Failed to generate ${type.toUpperCase()} files. Please try again.`);
        } finally {
            setProcessingType(null);
        }
    };

    return (
        <div className="mt-8 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <Icon name="layers" className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-tight">
                            Custom Language Download (Individual file per locale)
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Generate independent files for each language
                        </p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={handleSelectAll}
                        className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
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
                        <div key={lang} className="relative">
                            <input
                                type="checkbox"
                                id={`indiv-${lang}`}
                                checked={isSelected}
                                onChange={() => toggleLang(lang)}
                                className="peer absolute opacity-0 w-full h-full cursor-pointer z-10"
                            />
                            <div className={`
                                flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border text-center
                                ${isSelected 
                                    ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/20' 
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 peer-hover:border-indigo-300 dark:peer-hover:border-indigo-600 peer-hover:bg-indigo-50 dark:peer-hover:bg-slate-700/50'
                                }
                            `}>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-white border-white' : 'border-slate-300 dark:border-slate-500'}`}>
                                    {isSelected && <div className="w-2 h-2 rounded-sm bg-indigo-500"></div>}
                                </div>
                                {lang}
                            </div>
                        </div>
                    );
                })}
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                    <Icon name="error" className="w-4 h-4" />
                    {error}
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-slate-200 dark:border-slate-700 pt-6">
                {/* JSON Download Button */}
                <button
                    onClick={() => handleDownload('json')}
                    disabled={selected.size === 0 || processingType !== null}
                    className={`
                        relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white transition-all duration-200 overflow-hidden
                        ${selected.size > 0 && processingType === null
                            ? 'bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/25 transform hover:-translate-y-0.5 active:translate-y-0' 
                            : (processingType === 'json' ? 'bg-indigo-500 cursor-wait' : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-70')
                        }
                    `}
                >
                    {processingType === 'json' ? (
                         <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {downloadProgress !== null ? `${Math.round(downloadProgress)}%` : 'Processing...'}
                         </>
                    ) : (
                        <>
                            <Icon name="download" className="w-5 h-5" />
                            Download {selected.size} Files (JSON)
                        </>
                    )}
                </button>

                {/* CSV Download Button */}
                <button
                    onClick={() => handleDownload('csv')}
                    disabled={selected.size === 0 || processingType !== null}
                    className={`
                        relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white transition-all duration-200 overflow-hidden
                        ${selected.size > 0 && processingType === null
                            ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 transform hover:-translate-y-0.5 active:translate-y-0' 
                            : (processingType === 'csv' ? 'bg-indigo-600 cursor-wait' : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-70')
                        }
                    `}
                >
                     {processingType === 'csv' ? (
                         <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                             {downloadProgress !== null ? `${Math.round(downloadProgress)}%` : 'Processing...'}
                         </>
                    ) : (
                        <>
                            <Icon name="download" className="w-5 h-5" />
                            Download {selected.size} Files in CSV
                        </>
                    )}
                </button>

                {/* Markdown Download Button */}
                <button
                    onClick={() => handleDownload('md')}
                    disabled={selected.size === 0 || processingType !== null}
                    className={`
                        relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white transition-all duration-200 overflow-hidden
                        ${selected.size > 0 && processingType === null
                            ? 'bg-indigo-700 hover:bg-indigo-800 shadow-lg shadow-indigo-700/25 transform hover:-translate-y-0.5 active:translate-y-0' 
                            : (processingType === 'md' ? 'bg-indigo-700 cursor-wait' : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-70')
                        }
                    `}
                >
                     {processingType === 'md' ? (
                         <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                             {downloadProgress !== null ? `${Math.round(downloadProgress)}%` : 'Processing...'}
                         </>
                    ) : (
                        <>
                            <Icon name="download" className="w-5 h-5" />
                            Download {selected.size} Files in Markdown
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
