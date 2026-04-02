import { useEffect, useState } from 'react';

function detectMobile(): boolean {
    // Touch device (coarse pointer) with at least one phone-sized dimension
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const smallScreen = window.matchMedia('(max-width: 768px), (max-height: 768px)').matches;
    return coarsePointer && smallScreen;
}

export function useMobile(): boolean {
    const [isMobile, setIsMobile] = useState<boolean>(detectMobile);

    useEffect(() => {
        const check = () => setIsMobile(detectMobile());
        const mq = window.matchMedia('(max-width: 768px), (max-height: 768px)');

        if (typeof mq.addEventListener === 'function') {
            mq.addEventListener('change', check);
        } else {
            (mq as any).addListener(check);
        }
        window.addEventListener('orientationchange', check);
        window.addEventListener('resize', check);

        return () => {
            if (typeof mq.removeEventListener === 'function') {
                mq.removeEventListener('change', check);
            } else {
                (mq as any).removeListener(check);
            }
            window.removeEventListener('orientationchange', check);
            window.removeEventListener('resize', check);
        };
    }, []);

    return isMobile;
}
