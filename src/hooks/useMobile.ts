import { useEffect, useState } from 'react';

function detectMobile(): boolean {
    // Landscape phone: small height + touch (coarse pointer)
    // max-height:500px catches landscape phones where width >> height
    const smallHeight = window.matchMedia('(max-height: 500px)').matches;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    return smallHeight && coarsePointer;
}

export function useMobile(): boolean {
    const [isMobile, setIsMobile] = useState<boolean>(detectMobile);

    useEffect(() => {
        const check = () => setIsMobile(detectMobile());
        const mq = window.matchMedia('(max-height: 500px)');

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
