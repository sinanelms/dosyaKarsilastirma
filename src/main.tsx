import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App';
import { ThemeProvider, ToastProvider } from './context';
import { ErrorFallback } from './components/common';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onError={(error, info) => {
                // Log errors to console in development
                console.error('Application Error:', error);
                console.error('Component Stack:', info.componentStack);
            }}
            onReset={() => {
                // Clear any cached state on reset
                window.location.reload();
            }}
        >
            <ThemeProvider>
                <ToastProvider>
                    <App />
                </ToastProvider>
            </ThemeProvider>
        </ErrorBoundary>
    </React.StrictMode>
);
