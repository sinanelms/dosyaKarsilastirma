import { useState, useEffect } from 'react';
import { Scale, Loader2 } from 'lucide-react';

interface SplashScreenProps {
    onComplete: () => void;
    minDuration?: number;
}

const SPLASH_MESSAGES = [
    "UYAP verilerini kolayca karşılaştırın",
    "PDF ve Excel dışa aktarım desteği",
    "Koyu ve açık tema seçenekleri",
    "Klavye kısayolları ile hızlı kullanım",
    "Ortak dosyaları anında tespit edin",
    "Cumhuriyet Başsavcılıkları için özel tasarım",
];

export function SplashScreen({ onComplete, minDuration = 2500 }: SplashScreenProps) {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [fadeIn, setFadeIn] = useState(true);

    // Kayan yazılar için animasyon
    useEffect(() => {
        const messageInterval = setInterval(() => {
            setFadeIn(false);
            setTimeout(() => {
                setCurrentMessageIndex((prev) => (prev + 1) % SPLASH_MESSAGES.length);
                setFadeIn(true);
            }, 300);
        }, 2000);

        return () => clearInterval(messageInterval);
    }, []);

    // Minimum süre sonra uygulamaya geç
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, minDuration);

        return () => clearTimeout(timer);
    }, [onComplete, minDuration]);

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label="Uygulama yükleniyor"
            style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-primary)',
                zIndex: 9999,
                transition: 'opacity 0.5s ease-out',
            }}
        >
            {/* Logo Container */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.5rem',
                }}
            >
                {/* Animated Logo */}
                <div
                    className="animate-pulse"
                    style={{
                        backgroundColor: '#b91c1c',
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-xl)',
                        boxShadow: '0 0 40px rgba(185, 28, 28, 0.3)',
                    }}
                >
                    <Scale size={48} color="white" />
                </div>

                {/* Title */}
                <div style={{ textAlign: 'center' }}>
                    <h1
                        style={{
                            fontSize: '1.75rem',
                            fontWeight: 'bold',
                            color: 'var(--text-primary)',
                            marginBottom: '0.25rem',
                        }}
                    >
                        UYAP Dosya Karşılaştırma
                    </h1>
                    <p
                        style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-tertiary)',
                        }}
                    >
                        Cumhuriyet Başsavcılığı Analiz Modülü
                    </p>
                </div>

                {/* Loading Spinner */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginTop: '1rem',
                    }}
                >
                    <Loader2
                        size={20}
                        className="animate-spin"
                        style={{ color: 'var(--color-primary)' }}
                    />
                    <span
                        style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        Yükleniyor...
                    </span>
                </div>

                {/* Rotating Messages */}
                <div
                    style={{
                        marginTop: '2rem',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <p
                        style={{
                            fontSize: '0.9375rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 500,
                            textAlign: 'center',
                            opacity: fadeIn ? 1 : 0,
                            transform: fadeIn ? 'translateY(0)' : 'translateY(10px)',
                            transition: 'opacity 0.3s ease, transform 0.3s ease',
                        }}
                    >
                        {SPLASH_MESSAGES[currentMessageIndex]}
                    </p>
                </div>

                {/* Progress Dots */}
                <div
                    style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginTop: '1rem',
                    }}
                >
                    {SPLASH_MESSAGES.map((_, index) => (
                        <div
                            key={index}
                            style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor:
                                    index === currentMessageIndex
                                        ? 'var(--color-primary)'
                                        : 'var(--border-primary)',
                                transition: 'background-color 0.3s ease',
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Version Footer */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '2rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-tertiary)',
                }}
            >
                v1.0.0
            </div>
        </div>
    );
}
