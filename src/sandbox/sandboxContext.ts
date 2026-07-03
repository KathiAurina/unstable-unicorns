import { createContext, useContext } from 'react';
import type { CardID } from '../game/card';

export type SandboxAction =
    | { type: 'bounce' }
    | { type: 'destroy' }
    | { type: 'steal'; step: 'pick_card' }
    | { type: 'steal'; step: 'pick_target'; cardID: CardID }
    | { type: 'move_to_stable'; step: 'pick_card' }
    | { type: 'move_to_stable'; step: 'pick_stable'; cardID: CardID }
    | { type: 'force_discard'; playerID: string }
    | null;

type SandboxControl = {
    viewedPlayerID: string;
    setViewedPlayerID: (pid: string) => void;
    sandboxAction: SandboxAction;
    setSandboxAction: (action: SandboxAction) => void;
};

export const SandboxControlContext = createContext<SandboxControl>({
    viewedPlayerID: "0",
    setViewedPlayerID: () => {},
    sandboxAction: null,
    setSandboxAction: () => {},
});

export function useSandboxControl(): SandboxControl {
    return useContext(SandboxControlContext);
}
