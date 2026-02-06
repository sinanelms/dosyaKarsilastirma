import { useEffect, useCallback, useRef } from 'react';

type KeyboardShortcut = {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    handler: () => void;
    description?: string;
};

interface UseKeyboardShortcutsOptions {
    enabled?: boolean;
}

export const useKeyboardShortcuts = (
    shortcuts: KeyboardShortcut[],
    options: UseKeyboardShortcutsOptions = {}
) => {
    const { enabled = true } = options;
    const shortcutsRef = useRef(shortcuts);
    shortcutsRef.current = shortcuts;

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            // Don't trigger shortcuts when typing in input fields
            const target = event.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                // Allow ESC to work even in inputs
                if (event.key.toLowerCase() !== 'escape') {
                    return;
                }
            }

            for (const shortcut of shortcutsRef.current) {
                const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
                const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
                const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
                const altMatch = shortcut.alt ? event.altKey : !event.altKey;

                if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                    event.preventDefault();
                    shortcut.handler();
                    break;
                }
            }
        },
        [enabled]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return {
        shortcuts: shortcuts.map((s) => ({
            combo: [s.ctrl && 'Ctrl', s.shift && 'Shift', s.alt && 'Alt', s.key.toUpperCase()]
                .filter(Boolean)
                .join('+'),
            description: s.description || '',
        })),
    };
};

// Predefined shortcut parser
export const parseShortcut = (shortcutString: string): Omit<KeyboardShortcut, 'handler'> => {
    const parts = shortcutString.toLowerCase().split('+');
    const key = parts[parts.length - 1];

    return {
        key,
        ctrl: parts.includes('ctrl'),
        shift: parts.includes('shift'),
        alt: parts.includes('alt'),
    };
};
