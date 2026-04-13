import { useCallback, useEffect, useRef } from 'react';

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 10;

export function useLongPress(onLongPress: () => void) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startRef = useRef<{ x: number; y: number } | null>(null);
    const didFireRef = useRef(false);

    const cancel = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        startRef.current = null;
    }, []);

    useEffect(() => cancel, [cancel]);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        const t = e.touches[0];
        startRef.current = { x: t.clientX, y: t.clientY };
        didFireRef.current = false;
        timerRef.current = setTimeout(() => {
            didFireRef.current = true;
            timerRef.current = null;
            onLongPress();
        }, LONG_PRESS_MS);
    }, [onLongPress]);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        if (!startRef.current) return;
        const t = e.touches[0];
        const dx = t.clientX - startRef.current.x;
        const dy = t.clientY - startRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > MOVE_CANCEL_PX) {
            cancel();
        }
    }, [cancel]);

    const onTouchEnd = useCallback(() => {
        cancel();
        return didFireRef.current;
    }, [cancel]);

    return { onTouchStart, onTouchMove, onTouchEnd };
}
