import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast, { ToastProps } from './Toast';

interface ToastContextType {
    showToast: (type: ToastProps['type'], message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

interface ToastProviderProps {
    children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<Omit<ToastProps, 'onClose'>[]>([]);

    const showToast = (type: ToastProps['type'], message: string, duration = 3000) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, type, message, duration }]);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] space-y-2">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <Toast key={toast.id} {...toast} onClose={removeToast} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};
