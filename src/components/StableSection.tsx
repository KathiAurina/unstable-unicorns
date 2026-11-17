import React from 'react';
import Stable, { StableHandle } from '../ui/Stable';
import Hand from '../ui/Hand';
import type { CardID, GameState } from '../game/engine';
import type { Moves } from '../game/game';
import { cardViews, stableUnicorns, stableUpgrades } from '../view/cards';
import type { BoardController } from '../view/useBoard';
import { useSandboxControl } from '../sandbox/sandboxContext';

type Props = {
    G: GameState;
    playerID: string;
    moves: Moves;
    board: BoardController;
    stableRef: React.RefObject<StableHandle>;
    /** Cards that stay fully visible while the others are dimmed (targets of the open prompt). */
    stableHighlightMode: CardID[] | undefined;
    setHoveringOverHandCard: (x: boolean) => void;
    playHubMouseOverSound: () => void;
}

// The player's own stable and hand. Clicks go to the board controller, which knows what they mean.
const StableSection = ({
    G,
    playerID,
    moves,
    board,
    stableRef,
    stableHighlightMode,
    setHoveringOverHandCard,
    playHubMouseOverSound,
}: Props) => {
    const { sandboxAction, setSandboxAction } = useSandboxControl();
    const marked = Array.from(board.marks.keys());

    const onHandCardClick = (_evt: React.MouseEvent, cardID: CardID) => {
        if (sandboxAction) {
            if (sandboxAction.type === 'move_to_stable' && sandboxAction.step === 'pick_card') {
                setSandboxAction({ type: 'move_to_stable', step: 'pick_stable', cardID });
            } else if (sandboxAction.type === 'force_discard') {
                moves.sandboxForceDiscardCard(sandboxAction.playerID, cardID);
                setSandboxAction(null);
            }
            return;
        }
        if (board.clickCard(cardID)) setHoveringOverHandCard(false);
    };

    const onStableCardClick = (_evt: React.MouseEvent, cardID: CardID) => {
        if (sandboxAction) {
            if (sandboxAction.type === 'bounce') {
                moves.sandboxBounceCard(cardID);
                setSandboxAction(null);
            } else if (sandboxAction.type === 'destroy') {
                moves.sandboxDestroyCard(cardID);
                setSandboxAction(null);
            } else if (sandboxAction.type === 'steal' && sandboxAction.step === 'pick_card') {
                setSandboxAction({ type: 'steal', step: 'pick_target', cardID });
            }
            return;
        }
        board.clickCard(cardID);
    };

    return (
        <>
            <Stable
                ref={stableRef}
                cards={cardViews(G, stableUnicorns(G, playerID))}
                upgradeDowngradeCards={cardViews(G, stableUpgrades(G, playerID))}
                glowing={marked}
                highlightMode={stableHighlightMode}
                onStableItemClick={onStableCardClick}
                onStableItemMouseEnter={() => playHubMouseOverSound()}
                onStableItemMouseLeave={() => undefined}
                renderAccessoryHoverItem={() => undefined}
                onPlaceHereClick={() => { board.clickPlayer(playerID); }}
            />
            <Hand
                cards={cardViews(G, G.zones.hand[playerID] ?? [])}
                glowingCards={marked}
                onClick={onHandCardClick}
                onMouseEnterHandCard={() => { setHoveringOverHandCard(true); }}
                onMouseLeaveHandCard={() => { setHoveringOverHandCard(false); }}
            />
        </>
    );
}

export default StableSection;
