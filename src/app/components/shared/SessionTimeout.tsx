import { useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const TIMEOUT_MS = 30 * 60 * 1000; // 30 Minutes

export function SessionTimeout() {
    const { signOut, user } = useAuth();
    const navigate = useNavigate();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimer = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (user) {
            timeoutRef.current = setTimeout(async () => {
                console.log('Session timed out due to inactivity');
                await signOut();
                navigate('/login');
            }, TIMEOUT_MS);
        }
    };

    useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        const handleActivity = () => resetTimer();

        if (user) {
            resetTimer();
            events.forEach(event => window.addEventListener(event, handleActivity));
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [user, signOut, navigate]);

    return null; // Side-effect only component
}
