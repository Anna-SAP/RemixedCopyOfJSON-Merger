
import React from 'react';
import { Icon } from './Icon';

interface ErrorMessageProps {
    message: string;
    onClear: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onClear }) => {
    return (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-md" role="alert">
            <div className="flex">
                <div className="py-1">
                    <Icon name="error" className="w-6 h-6 text-red-500 mr-4"/>
                </div>
                <div>
                    <p className="font-bold">An Error Occurred</p>
                    <p className="text-sm">{message}</p>
                    <button
                        onClick={onClear}
                        className="mt-4 px-3 py-1 text-sm font-semibold text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 rounded-md transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        </div>
    );
};
