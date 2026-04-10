import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
                    <div className="max-w-md">
                        <div className="bg-red-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                        <p className="text-gray-400 mb-8">
                            We're sorry for the inconvenience. Mzansi Videos encountered an unexpected error.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-orange-500 text-white px-8 py-3 rounded-2xl font-bold flex items-center justify-center mx-auto space-x-2"
                        >
                            <RefreshCcw className="w-5 h-5" />
                            <span>Refresh Page</span>
                        </button>
                        {process.env.NODE_ENV === 'development' && (
                            <pre className="mt-8 p-4 bg-gray-900 rounded-xl text-xs text-red-400 overflow-auto text-left">
                                {this.state.error?.message}
                            </pre>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
