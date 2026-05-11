
import React, { useState, useCallback } from 'react';
import { Icon } from './Icon';

interface FileUploadProps {
    onFileSelect: (files: File[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const filesArray = Array.from(e.dataTransfer.files) as File[];
            const validFiles = filesArray.filter(
                file => file.type === 'application/zip' || 
                        file.type === 'application/x-zip-compressed' || 
                        file.name.toLowerCase().endsWith('.zip')
            );

            if (validFiles.length > 0) {
                if (validFiles.length !== filesArray.length) {
                    alert('Some files were ignored because they are not valid ZIP files.');
                }
                onFileSelect(validFiles);
            } else {
                alert('Please upload valid ZIP files.');
            }
        }
    }, [onFileSelect]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileSelect(Array.from(e.target.files));
        }
    };

    return (
        <div 
            className={`relative border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all duration-300 ease-in-out ${isDragging ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-sky-400 dark:hover:border-sky-500'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
        >
            <input
                id="file-input"
                type="file"
                multiple
                accept=".zip,application/zip,application/x-zip-compressed"
                className="hidden"
                onChange={handleChange}
            />
            <div className="flex flex-col items-center justify-center space-y-4 text-slate-500 dark:text-slate-400">
                <Icon name="upload" className={`w-16 h-16 transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`} />
                <p className="text-xl font-semibold">
                    <span className="text-sky-500">Click to upload</span> or drag and drop
                </p>
                <p className="text-sm">ZIP files only (Multiple allowed)</p>
            </div>
        </div>
    );
};
