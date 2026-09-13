import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App';
import { ThemeProvider, ToastProvider } from './context';
import { ErrorFallback, SplashScreen } from './components/common';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import './styles/globals.css';

function Root() {
    const [showSplash, setShowSplash] = useState(true);

    return (
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
                        {showSplash ? (
                            <SplashScreen onComplete={() => setShowSplash(false)} />
                        ) : (
                            <App />
                        )}
                    </ToastProvider>
                </ThemeProvider>
            </ErrorBoundary>
        </React.StrictMode>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
