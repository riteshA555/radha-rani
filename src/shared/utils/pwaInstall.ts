// PWA Installation Utilities

export interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Initialize PWA install prompt capture
export const initPWA = () => {
    // Capture the install prompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e as BeforeInstallPromptEvent;
        console.log('PWA install prompt ready');
    });

    // Log when app is installed
    window.addEventListener('appinstalled', () => {
        console.log('PWA installed successfully');
        deferredPrompt = null;
    });
};

// Check if PWA is installable
export const canInstallPWA = (): boolean => {
    return deferredPrompt !== null;
};

// Check if already installed
export const isInstalled = (): boolean => {
    return window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
};

// Trigger install prompt
export const installPWA = async (): Promise<boolean> => {
    if (!deferredPrompt) {
        console.log('Install prompt not available');
        return false;
    }

    try {
        // Show the install prompt
        await deferredPrompt.prompt();

        // Wait for user response
        const { outcome } = await deferredPrompt.userChoice;

        console.log(`User response: ${outcome}`);

        deferredPrompt = null;

        return outcome === 'accepted';
    } catch (error) {
        console.error('Install failed:', error);
        return false;
    }
};
