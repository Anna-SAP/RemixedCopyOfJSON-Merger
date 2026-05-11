
// This function offloads the heavy ZIP processing to a Web Worker
// to prevent the UI from freezing with large files.

export const processZipFiles = (files: File[]): Promise<{ blob: Blob; preview: string; data: any[] }> => {
    // The worker code is inlined as a string to create a Blob.
    // This avoids cross-origin issues when loading the worker script
    // in sandboxed environments.
    const workerCode = `
        // Use importScripts for classic workers, as 'import' is for module workers.
        self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');

        const processZipFilesInWorker = async (files) => {
            // Predefined language order for sorting the final output
            const LANGUAGE_ORDER = [
                'de-DE', 'en-AU', 'en-GB', 'es-419', 'es-ES', 'fi-FI', 'fr-CA', 
                'fr-FR', 'it-IT', 'ja-JP', 'ko-KR', 'nl-NL', 'pt-BR', 'pt-PT', 
                'zh-CN', 'zh-HK', 'zh-TW'
            ];

            const sourceFilePromises = [];

            // Iterate over all provided files
            for (const file of files) {
                let zip;
                try {
                    // Access JSZip from the global scope (self) after importScripts.
                    zip = await self.JSZip.loadAsync(file);
                } catch (e) {
                    throw new Error('Invalid ZIP file: ' + file.name + '. The file may be corrupt or not a valid ZIP archive.');
                }

                zip.forEach((relativePath, zipEntry) => {
                    if (zipEntry.dir) {
                        return;
                    }

                    let lang = null;

                    // Ignore macOS resource fork files and hidden files
                    if (!relativePath.startsWith('__MACOSX') && !relativePath.split('/').pop().startsWith('.')) {
                        // We only care about files ending in .json or .json.xlf
                        if (relativePath.match(/\\.json(?:\\.xlf)?$/)) {
                            const segments = relativePath.split('/');
                            const filename = segments.pop();
                            
                            // Check for simple structure: language_code.json or language_code.json.xlf
                            const simpleStructureRegex = /^([a-zA-Z]{2,3}(?:[-_][a-zA-Z0-9]{2,4})*)\.json(?:\.xlf)?$/;
                            const simpleMatch = filename ? filename.match(simpleStructureRegex) : null;
                            
                            if (simpleMatch) {
                                lang = simpleMatch[1].replace(/_/g, '-');
                            } else if (segments.includes('opus_jsons')) {
                                // Complex structure: e.g., de_DE/Task-123/en-US/trunk/opus_jsons/source.json.xlf
                                // The language code is typically the first valid language segment.
                                // We use a strict regex to avoid false positives like 'Bug-123' or 'Task-123'.
                                const langRegex = /^(?:[a-zA-Z]{2}[-_][a-zA-Z0-9]{2,4}|[a-zA-Z]{3}[-_][a-zA-Z]{2,4})(?:[-_][a-zA-Z0-9]{2,4})*$/;
                                
                                for (const segment of segments) {
                                    if (langRegex.test(segment)) {
                                        lang = segment.replace(/_/g, '-');
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if (lang) {
                        const promise = (async () => {
                            try {
                                const content = await zipEntry.async('string');
                                const jsonData = JSON.parse(content);

                                let translationData;

                                if (Array.isArray(jsonData)) {
                                    // Support both existing key/value format and new opusID/stringValue format
                                    translationData = jsonData.reduce((acc, item) => {
                                        if (item) {
                                            if (typeof item.key === 'string' && typeof item.value === 'string') {
                                                // Existing format: { "key": "...", "value": "..." }
                                                acc.push({ key: item.key, value: item.value });
                                            } else if (typeof item.opusID === 'string' && typeof item.stringValue === 'string') {
                                                // New format: { "opusID": "...", "stringValue": "...", "pseudoHash": "..." }
                                                acc.push({ key: item.opusID, value: item.stringValue });
                                            }
                                        }
                                        return acc;
                                    }, []);
                                } else if (typeof jsonData === 'object' && jsonData !== null) {
                                    // Existing format: Flat object { "key": "value" }
                                    translationData = Object.entries(jsonData)
                                        .filter(([, value]) => typeof value === 'string')
                                        .map(([key, value]) => ({ key, value }));
                                } else {
                                    throw new Error('is not in a supported format. It must be a JSON array (key/value or opusID/stringValue) or a simple JSON object.');
                                }
                                
                                return { lang, data: translationData };

                            } catch (e) {
                                 let errorMessage = e.message;
                                 if (e.name === 'SyntaxError') {
                                     errorMessage = 'The file contains invalid JSON.';
                                 }
                                 throw new Error("Error processing file for language '" + lang + "' (" + relativePath + ") in zip '" + file.name + "': " + errorMessage);
                            }
                        })();
                        sourceFilePromises.push(promise);
                    }
                });
            }

            if (sourceFilePromises.length === 0) {
                throw new Error("No valid translation files found in the provided ZIPs. Ensure the ZIP files contain either language-named JSON files (e.g., 'en-US.json') or follow a structure like 'en-US/.../opus_jsons/source.json'.");
            }

            const allLanguageData = await Promise.all(sourceFilePromises);

            const mergedData = new Map();
            const foundLangs = new Set();

            for (const { lang, data } of allLanguageData) {
                foundLangs.add(lang);
                for (const item of data) {
                    if (!mergedData.has(item.key)) {
                        mergedData.set(item.key, {});
                    }
                    const keyEntry = mergedData.get(item.key);
                    // If multiple zips have the same language, the later one overwrites.
                    // Or if a zip has multiple files for same language.
                    // Logic here: keyEntry[lang] = item.value
                    keyEntry[lang] = item.value;
                }
            }
            
            // Sort keys alphabetically
            const sortedKeys = Array.from(mergedData.keys()).sort();
            
            // Sort found languages based on the predefined order, ensuring en-US is always first
            const sortedLangs = Array.from(foundLangs).sort((a, b) => {
                // Requirement: en-US always comes first
                if (a === 'en-US') return -1;
                if (b === 'en-US') return 1;

                const indexA = LANGUAGE_ORDER.indexOf(a);
                const indexB = LANGUAGE_ORDER.indexOf(b);

                if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB; // Both are in the predefined list
                }
                if (indexA !== -1) {
                    return -1; // Only A is in the list, so A comes first
                }
                if (indexB !== -1) {
                    return 1; // Only B is in the list, so B comes first
                }
                return a.localeCompare(b); // Neither is in the list, sort alphabetically
            });

            // Build the final result with sorted keys and sorted languages
            const finalResult = sortedKeys.map(key => {
                const entry = { key };
                const languageValues = mergedData.get(key);
                for (const lang of sortedLangs) {
                    // Check if the key has a translation for this language
                    if (languageValues.hasOwnProperty(lang)) {
                        entry[lang] = languageValues[lang];
                    }
                }
                return entry;
            });
            
            const fullJsonString = JSON.stringify(finalResult, null, 2);
            const blob = new Blob([fullJsonString], { type: 'application/json' });

            const PREVIEW_LENGTH = 20000;
            let preview = fullJsonString;

            if (fullJsonString.length > PREVIEW_LENGTH) {
                preview = fullJsonString.substring(0, PREVIEW_LENGTH) + '\\n\\n[...]\\n\\n--- CONTENT TRUNCATED ---\\n\\n\\nThe full file is available for download.';
            }

            // Return blob, preview AND the structured data for filtering in the UI
            return { blob, preview, data: finalResult };
        };

        self.onmessage = async (event) => {
            const files = event.data;
            try {
                const result = await processZipFilesInWorker(files);
                // Post the result object back to the main thread.
                self.postMessage({ type: 'success', result });
            } catch (e) {
                const errorMessage = e.message || 'An unknown worker error occurred.';
                self.postMessage({ type: 'error', error: errorMessage });
            }
        };
    `;

    return new Promise((resolve, reject) => {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        
        const worker = new Worker(workerUrl);

        const cleanup = () => {
            URL.revokeObjectURL(workerUrl);
            worker.terminate();
        };

        worker.onmessage = (event: MessageEvent) => {
            const { type, result, error } = event.data;
            if (type === 'success') {
                resolve(result);
            } else if (type === 'error') {
                reject(new Error(error));
            }
            cleanup();
        };

        worker.onerror = (event: ErrorEvent) => {
            reject(new Error(`An error occurred in the processing worker: ${event.message}`));
            cleanup();
        };

        worker.postMessage(files);
    });
};
