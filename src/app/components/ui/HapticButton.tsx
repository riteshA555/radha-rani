import React from 'react';
import { triggerHaptic, HapticStyle } from '../../../utils/haptics';

interface HapticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    hapticStyle?: HapticStyle;
    children: React.ReactNode;
}

/**
 * A wrapper for native HTML button that automatically triggers haptic feedback
 * Use this for icon buttons, modal close buttons, and other raw HTML buttons
 */
export const HapticButton = React.forwardRef<HTMLButtonElement, HapticButtonProps>(
    ({ hapticStyle = 'light', onClick, children, ...props }, ref) => {
        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            triggerHaptic(hapticStyle);
            onClick?.(e);
        };

        return (
            <button ref={ref} onClick={handleClick} {...props}>
                {children}
            </button>
        );
    }
);

HapticButton.displayName = 'HapticButton';
