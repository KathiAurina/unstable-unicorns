import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

function hasTouch(): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0) {
        return true;
    }
    return typeof window !== 'undefined' && 'ontouchstart' in window;
}

function detectMobile(): boolean {
    if (typeof window === 'undefined') return false;

    // Tier 1: matchMedia — most accurate, distinguishes coarse pointer from touch-capable desktop
    if (typeof window.matchMedia === 'function') {
        const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
        const smallScreen = window.matchMedia(
            `(max-width: ${MOBILE_BREAKPOINT}px), (max-height: ${MOBILE_BREAKPOINT}px)`
        ).matches;
        return coarsePointer && smallScreen;
    }

    // Tier 2: feature detection — touch + phone-sized viewport.
    // Requiring BOTH prevents touchscreen laptops from being flagged as mobile.
    const w = window.innerWidth || 0;
    const h = window.innerHeight || 0;
    const smallViewport = (w > 0 && w <= MOBILE_BREAKPOINT) || (h > 0 && h <= MOBILE_BREAKPOINT);
    if (hasTouch() && smallViewport) return true;

    // Tier 3: UA sniff — only strict phone patterns (excludes iPad and Android tablets,
    // which drop "Mobile" from their UA string). Desktop UAs won't match.
    if (typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string') {
        return /Android.+Mobile|iPhone|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent);
    }

    return false;
}

export function useMobile(): boolean {
    const [isMobile, setIsMobile] = useState<boolean>(detectMobile);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const check = () => setIsMobile(detectMobile());

        let mq: MediaQueryList | null = null;
        if (typeof window.matchMedia === 'function') {
            mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px), (max-height: ${MOBILE_BREAKPOINT}px)`);
            if (typeof mq.addEventListener === 'function') {
                mq.addEventListener('change', check);
            } else {
                (mq as any).addListener(check);
            }
        }
        window.addEventListener('orientationchange', check);
        window.addEventListener('resize', check);

        return () => {
            if (mq) {
                if (typeof mq.removeEventListener === 'function') {
                    mq.removeEventListener('change', check);
                } else {
                    (mq as any).removeListener(check);
                }
            }
            window.removeEventListener('orientationchange', check);
            window.removeEventListener('resize', check);
        };
    }, []);

    return isMobile;
}
