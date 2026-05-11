
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultDisplay } from './components/ResultDisplay';
import { Spinner } from './components/Spinner';
import { ErrorMessage } from './components/ErrorMessage';
import { processZipFiles } from './services/zipProcessor';
import { Icon } from './components/Icon';
import { LanguageSelector } from './components/LanguageSelector';
import { IndividualLanguageDownloader } from './components/IndividualLanguageDownloader';

const App: React.FC = () => {
    // We don't strictly need to store files in state for this logic, 
    // but useful if we want to display selected file names in the future.
    // For now, we process immediately.
    const [processing, setProcessing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ blob: Blob; preview: string; data: any[] } | null>(null);

    const handleFilesChange = (selectedFiles: File[]) => {
        setError(null);
        setResult(null);
        if (selectedFiles && selectedFiles.length > 0) {
            handleProcessFiles(selectedFiles);
        }
    };

    const handleProcessFiles = useCallback(async (filesToProcess: File[]) => {
        if (!filesToProcess || filesToProcess.length === 0) return;

        setProcessing(true);
        setError(null);
        setResult(null);

        try {
            const jsonResult = await processZipFiles(filesToProcess);
            setResult(jsonResult);
        } catch (e: unknown) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('An unexpected error occurred.');
            }
        } finally {
            setProcessing(false);
        }
    }, []);
    
    const resetState = () => {
        setProcessing(false);
        setError(null);
        setResult(null);
    };

    return (
        <div className="min-h-screen font-sans text-slate-800 dark:text-slate-200 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-4xl mx-auto">
                <header className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <Icon name="combine" className="w-10 h-10 text-sky-500" />
                        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Localization JSON Merger</h1>
                    </div>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Upload one or more ZIP archives with language-specific JSON files to merge them into one.
                    </p>
                </header>

                <main className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-black/20 p-6 md:p-10 transition-all duration-300">
                    {!result && !processing && !error && (
                        <FileUpload onFileSelect={handleFilesChange} />
                    )}
                    
                    {processing && (
                        <div className="flex flex-col items-center justify-center space-y-4 text-slate-600 dark:text-slate-400">
                            <Spinner />
                            <p className="text-lg font-medium">Processing your ZIP files...</p>
                            <p className="text-sm">This may take a moment.</p>
                        </div>
                    )}

                    {error && (
                        <ErrorMessage message={error} onClear={resetState} />
                    )}

                    {result && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                               <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                   <Icon name="check" className="w-8 h-8"/>
                                   <h2 className="text-2xl font-semibold">Processing Complete!</h2>
                               </div>
                                <button
                                    onClick={resetState}
                                    className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors"
                                >
                                    Process Another File
                                </button>
                            </div>
                            <ResultDisplay content={result.preview} blob={result.blob} />
                            
                            <LanguageSelector data={result.data} />
                            <IndividualLanguageDownloader data={result.data} />
                        </div>
                    )}
                </main>
                <footer className="text-center mt-8 text-slate-500 dark:text-slate-500 text-sm">
                    <p>Built with React, TypeScript, and Tailwind CSS.</p>
                </footer>
            </div>
        </div>
    );
};

export default App;
