import type { GameState, PlayerID } from '../game/engine';
import { cardViews, playerName } from '../view/cards';
import type { BoardController } from '../view/useBoard';
import Finder from '../ui/Finder';
import RainbowArrow from '../ui/RainbowArrow';

/** A pile or hand the player opened just to look at it. */
export type Browse = { zone: 'discard' } | { zone: 'nursery' } | { zone: 'hand'; player: PlayerID } | undefined;

type Props = {
    G: GameState;
    board: BoardController;
    browse: Browse;
    setBrowse: (b: Browse) => void;
    /** Arrow from the hand card that waits for its destination to the mouse. */
    arrow: { from: { x: number; y: number }; to: { x: number; y: number } } | undefined;
}

// Full-screen overlays of the desktop board: the card picker for prompts about cards that are not on
// the table (discard pile, Nursery, deck, another player's hand) and the piles a player opens to look.
const OverlayManager = ({ G, board, browse, setBrowse, arrow }: Props) => {
    const finder = board.finder;
    const skip = board.panels[0]?.buttons.find(b => b.tone === 'skip');
    // A prompt for several cards is confirmed inside the picker, which covers the action panel.
    const submit = board.panels[0]?.buttons.find(b => b.key === 'submit');

    return (
        <>
            {finder &&
                <Finder
                    cards={cardViews(G, finder.cards)}
                    title={`${finder.title} — click on a card.`}
                    showBackButton={true}
                    onBackClick={() => board.closeFinder()}
                    onFailToFindClick={finder.optional && skip ? () => board.press(skip) : undefined}
                    failLabel={finder.zone === 'deck' ? 'Fail to Find' : 'Skip'}
                    selected={board.ui.selected}
                    onConfirmClick={submit ? () => board.press(submit) : undefined}
                    confirmLabel={submit?.label}
                    confirmDisabled={submit?.disabled}
                    onCardClick={cardID => { board.clickCard(cardID); }}
                />
            }
            {!finder && browse?.zone === 'discard' &&
                <Finder cards={cardViews(G, G.zones.discard)} onBackClick={() => setBrowse(undefined)} onCardClick={() => undefined} />
            }
            {!finder && browse?.zone === 'nursery' &&
                <Finder cards={cardViews(G, G.zones.nursery)} onBackClick={() => setBrowse(undefined)} onCardClick={() => undefined} />
            }
            {!finder && browse?.zone === 'hand' &&
                <Finder
                    cards={cardViews(G, G.zones.hand[browse.player] ?? [])}
                    title={`${playerName(G, browse.player)}'s hand`}
                    onBackClick={() => setBrowse(undefined)}
                    showBackButton={true}
                    onCardClick={() => undefined}
                    hide={true}
                />
            }
            {arrow && <RainbowArrow from={arrow.from} to={arrow.to} />}
        </>
    );
}

export default OverlayManager;
