/**
 * Haptic Feedback Utility
 * Provides tactile feedback for mobile interactions
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

/**
 * Triggers haptic feedback on supported devices
 * Falls back gracefully on unsupported devices
 */
export const triggerHaptic = (style: HapticStyle = 'light'): void => {
    // Check if the device supports haptic feedback
    if (!('vibrate' in navigator)) {
        return; // Silently fail on unsupported devices
    }

    // Map haptic styles to vibration patterns
    const patterns: Record<HapticStyle, number | number[]> = {
        light: 10,           // Quick, subtle tap
        medium: 20,          // Standard button press
        heavy: 30,           // Strong feedback
        selection: 5,        // Very light for selections/scrolling
        success: [10, 50, 10], // Double tap pattern
        warning: [20, 100, 20], // Alert pattern
        error: [30, 100, 30, 100, 30], // Strong alert pattern
    };

    const pattern = patterns[style];

    try {
        navigator.vibrate(pattern);
    } catch (error) {
        // Silently fail if vibration API throws an error
        console.debug('Haptic feedback not available:', error);
    }
};

/**
 * Higher-order function to add haptic feedback to click handlers
 */
export const withHaptic = <T extends (...args: any[]) => any>(
    handler: T,
    style: HapticStyle = 'light'
): T => {
    return ((...args: any[]) => {
        triggerHaptic(style);
        return handler(...args);
    }) as T;
};

/**
 * React hook for haptic feedback
 */
export const useHaptic = () => {
    return {
        trigger: triggerHaptic,
        light: () => triggerHaptic('light'),
        medium: () => triggerHaptic('medium'),
        heavy: () => triggerHaptic('heavy'),
        selection: () => triggerHaptic('selection'),
        success: () => triggerHaptic('success'),
        warning: () => triggerHaptic('warning'),
        error: () => triggerHaptic('error'),
    };
};
