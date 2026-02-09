import React from 'react';
import { triggerHaptic, HapticStyle } from '../../../utils/haptics';

/**
 * Higher-order component that adds haptic feedback to any component
 */
export function withHapticFeedback<P extends { onClick?: (e: any) => void }>(
    Component: React.ComponentType<P>,
    hapticStyle: HapticStyle = 'light'
) {
    return React.forwardRef<any, P>((props, ref) => {
        const handleClick = (e: any) => {
            triggerHaptic(hapticStyle);
            props.onClick?.(e);
        };

        return <Component ref={ref} {...props} onClick={handleClick} />;
    });
}

/**
 * Hook to get a haptic-enhanced onClick handler
 */
export function useHapticClick(
    onClick?: (e: any) => void,
    hapticStyle: HapticStyle = 'light'
) {
    return React.useCallback(
        (e: any) => {
            triggerHaptic(hapticStyle);
            onClick?.(e);
        },
        [onClick, hapticStyle]
    );
}
