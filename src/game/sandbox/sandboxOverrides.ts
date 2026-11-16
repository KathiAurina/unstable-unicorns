import type { UnstableUnicornsGame } from '../state';

export function sandboxBypassActionLimit(G: UnstableUnicornsGame): boolean {
    return G.sandbox === true && G.sandboxSettings?.infiniteActions === true;
}

export function sandboxSkipNeigh(G: UnstableUnicornsGame): boolean {
    return G.sandbox === true && G.sandboxSettings?.skipNeigh === true;
}
