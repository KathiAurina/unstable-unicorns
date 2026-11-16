import _ from 'underscore';
import React from 'react';
import Stable, { StableHandle } from '../ui/Stable';
import Hand from '../ui/Hand';
import { CardInteraction, HoverTarget, findUITargets } from '../BoardUtil';
import { canPlayCard } from '../game/game';
import type { Instruction, Scene, UnstableUnicornsGame, Ctx } from '../game/state';
import type { BringToStableTarget, DiscardTarget } from '../game/operations';
import { CardID, hasType } from '../game/card';
import type { Moves } from '../game/types';
import { BoardState } from '../BoardStateManager';
import { useSandboxControl } from '../sandbox/sandboxContext';

type Props = {
    G: UnstableUnicornsGame;
    ctx: Ctx;
    playerID: string;
    moves: Moves;
    boardStates: BoardState[];
    stableRef: React.RefObject<StableHandle>;
    cardInteraction: CardInteraction | undefined;
    setCardInteraction: (ci: CardInteraction | undefined) => void;
    hoverTargets: { sourceCardID: CardID; targets: HoverTarget[] } | undefined;
    setHoverTargets: (x: { sourceCardID: CardID; targets: HoverTarget[] } | undefined) => void;
    openScenes: Array<[Instruction, Scene]>;
    glowingCardIDs: CardID[];
    stableHighlightMode: CardID[] | undefined;
    isHoveringOverHandCard: boolean;
    setHoveringOverHandCard: (x: boolean) => void;
    playHubMouseOverSound: () => void;
    playExecuteDoSound: (boardStateType: string | undefined) => void;
}

const StableSection = ({
    G,
    ctx,
    playerID,
    moves,
    boardStates,
    stableRef,
    cardInteraction,
    setCardInteraction,
    hoverTargets,
    setHoverTargets,
    openScenes,
    glowingCardIDs,
    stableHighlightMode,
    isHoveringOverHandCard,
    setHoveringOverHandCard,
    playHubMouseOverSound,
    playExecuteDoSound,
}: Props) => {
    // suppress unused warning
    void hoverTargets;

    const { sandboxAction, setSandboxAction } = useSandboxControl();

    let glowingCards: CardID[] = [];

    if (boardStates.find(s => s.type === "playCard")) {
        if (cardInteraction?.key === "play_upgradeDowngradeCardFromHand__choose_target") {
            // no glowing cards
        } else {
            glowingCards = G.hand[playerID].map(c => [canPlayCard(G, ctx, playerID, c), c]).filter(s => s[0]).map(s => s[1]) as CardID[];
        }
    } else if (boardStates.find(s => s.type === "neigh__playNeigh")) {
        if (G.playerEffects[playerID].find(s => s.effect.key === "you_cannot_play_neigh") === undefined) {
            glowingCards = G.hand[playerID].map(c => G.deck[c]).filter(c => c.type === "neigh" || c.type === "super_neigh").map(c => c.id);
        }
    } else if (boardStates.find(s => s.type === "discard" || s.type === "discard__popup__committed")) {
        const discardState = boardStates.find(s => s.type === "discard" || s.type === "discard__popup__committed")!;
        glowingCards = discardState.info!.targets!.map((c: DiscardTarget) => c.handIndex).map((c: number) => G.hand[playerID][c])
    } else if (boardStates.find(s => s.type === "bring__popup__committed")) {
        const discardState = boardStates.find(s => s.type === "discard" || s.type === "bring__popup__committed")!;
        glowingCards = discardState.info!.targets!.map((c: BringToStableTarget) => c.cardID);
    }

    const onHandCardClick = (evt: React.MouseEvent, cardID: CardID) => {
        if (sandboxAction) {
            if (sandboxAction.type === 'move_to_stable' && sandboxAction.step === 'pick_card') {
                setSandboxAction({ type: 'move_to_stable', step: 'pick_stable', cardID });
            } else if (sandboxAction.type === 'force_discard') {
                moves.sandboxForceDiscardCard(sandboxAction.playerID, cardID);
                setSandboxAction(null);
            }
            return;
        }
        if (boardStates.find(s => s.type === "playCard")) {
            const cardsOnHandThatCanBePlayed = G.hand[playerID].map(c => [canPlayCard(G, ctx, playerID, c), c]).filter(s => s[0]).map(s => s[1]) as CardID[];
            if (cardsOnHandThatCanBePlayed.includes(cardID)) {
                const card = G.deck[cardID];
                if (hasType(card, "upgrade") || hasType(card, "downgrade")) {
                    setCardInteraction({
                        key: "play_upgradeDowngradeCardFromHand__choose_target",
                        info: {
                            instructionID: "____________",
                            currentMousePosition: { x: evt.clientX, y: evt.clientY },
                            startingMousePosition: { x: evt.clientX, y: evt.clientY },
                            cardID
                        },
                    });
                } else {
                    moves.playCard(playerID, cardID);
                }
            }
            setHoveringOverHandCard(false);
        } else if (boardStates.find(s => s.type === "neigh__playNeigh")) {
            if (G.deck[cardID].type === "neigh" || G.deck[cardID].type === "super_neigh") {
                if (G.playerEffects[playerID].find(s => s.effect.key === "you_cannot_play_neigh") === undefined) {
                    moves.playNeigh(cardID, playerID, G.neighDiscussion!.rounds.length - 1);
                }
            }
            setHoveringOverHandCard(false);
        } else if (boardStates.find(s => s.type === "discard" || s.type === "discard__popup__committed")) {
            const discardState = boardStates.find(s => s.type === "discard" || s.type === "discard__popup__committed")!;
            if (discardState.info!.targets!.find((s: DiscardTarget) => G.deck[G.hand[playerID][s.handIndex]].id === cardID)) {
                playExecuteDoSound(discardState.type);
                moves.executeDo(discardState.info!.instructionID, { protagonist: playerID, cardID });
                setHoveringOverHandCard(false);
            }
        } else if (boardStates.find(s => s.type === "bring__popup__committed")) {
            const discardState = boardStates.find(s => s.type === "bring__popup__committed")!;
            if (discardState.info!.targets!.find((s: BringToStableTarget) => s.cardID === cardID)) {
                moves.executeDo(discardState.info!.instructionID, { protagonist: playerID, cardID });
                setHoveringOverHandCard(false);
            }
        }
    }

    return (
        <>
            <Stable
                ref={stableRef}
                cards={[...G.stable[playerID], ...G.temporaryStable[playerID]].map(c => G.deck[c])}
                upgradeDowngradeCards={G.upgradeDowngradeStable[playerID].map(c => G.deck[c])}
                glowing={glowingCardIDs}
                highlightMode={stableHighlightMode}
                onStableItemClick={(evt, cardID) => {
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
                    // initiate card to card interaction for destroy and steal actions
                    if (cardInteraction === undefined) {
                        let boardState = _.first(boardStates.filter(s => s.info?.sourceCardID === cardID && (s.type === "destroy__cardToCard" || s.type === "steal__cardToCard" || s.type === "sacrifice__cardToCard" || s.type === "move__cardToCard" || s.type === "returnToHand__cardToCard" || s.type === "backKick__card_to_card" || s.type === "unicornswap1")));
                        if (boardState) {
                            const cardRef = stableRef.current?.getStableItemRef(cardID)!;
                            const coord = cardRef.current!.getBoundingClientRect();
                            const from = { x: coord.left + coord.width / 2.0, y: coord.top + coord.height / 2.0 };
                            setCardInteraction({
                                key: "card_to_card",
                                info: {
                                    sourceCardID: cardID,
                                    instructionID: boardState.info!.instructionID,
                                    targets: boardState.info!.targets!,
                                    currentMousePosition: { x: evt.clientX, y: evt.clientY },
                                    startingMousePosition: { ...from }
                                }
                            });
                        }
                        boardState = _.first(boardStates.filter(s => (s.type === "swapHands__cardToPlayer" || s.type === "pullRandom__cardToPlayer" || s.type === "move2__cardToPlayer" || s.type === "makeSomeoneDiscard__cardToPlayer" || s.type === "unicornswap2" || s.type === "blatantThievery1") && s.info?.sourceCardID === cardID));
                        if (boardState) {
                            const cardRef = stableRef.current?.getStableItemRef(cardID)!;
                            const coord = cardRef.current!.getBoundingClientRect();
                            const from = { x: coord.left + coord.width / 2.0, y: coord.top + coord.height / 2.0 };
                            setCardInteraction({
                                key: "card_to_player",
                                info: {
                                    sourceCardID: cardID,
                                    instructionID: boardState.info!.instructionID,
                                    targets: boardState.info!.targets!,
                                    currentMousePosition: { x: evt.clientX, y: evt.clientY },
                                    startingMousePosition: { ...from }
                                }
                            });
                        }
                    } else {
                        if ((cardInteraction.key === "card_to_card" || cardInteraction.key === "card_to_player") && cardInteraction.info.sourceCardID === cardID) {
                            setCardInteraction(undefined);
                            return;
                        }
                        if (cardInteraction?.key === "click_on_other_stable_card" || cardInteraction?.key === "card_to_card") {
                            if (cardInteraction.info.targets.find(s => s.cardID === cardID)) {
                                const bsType = boardStates.find(s => s.info?.instructionID === cardInteraction.info.instructionID)?.type;
                                playExecuteDoSound(bsType);
                                moves.executeDo(cardInteraction.info.instructionID, { protagonist: playerID, cardID });
                                setCardInteraction(undefined);
                            }
                        }
                    }
                }}
                onStableItemMouseEnter={cardID => {
                    playHubMouseOverSound();
                    const o = openScenes.filter(([instr]) => instr.ui.info?.source === cardID);
                    let targets: HoverTarget[] = [];
                    o.forEach(([instruction]) => {
                        targets = [...targets, ...findUITargets(G, ctx, instruction)];
                    });
                    if (o.length > 0) {
                        setHoverTargets({ sourceCardID: cardID, targets });
                    }
                }}
                onStableItemMouseLeave={cardID => {
                    if (cardInteraction?.key !== "card_to_card") {
                        setHoverTargets(undefined);
                    }
                }}
                renderAccessoryHoverItem={() => undefined}
                onPlaceHereClick={() => {
                    if (cardInteraction?.key === "play_upgradeDowngradeCardFromHand__choose_target") {
                        moves.playUpgradeDowngradeCard(playerID, playerID, cardInteraction.info.cardID);
                        setCardInteraction(undefined);
                    }
                }}
            />
            <Hand
                cards={G.hand[playerID].map(c => G.deck[c]).filter(c => c !== undefined)}
                glowingCards={glowingCards}
                onClick={onHandCardClick}
                onMouseEnterHandCard={() => { setHoveringOverHandCard(true); }}
                onMouseLeaveHandCard={() => { setHoveringOverHandCard(false); }}
            />
        </>
    );
}

export default StableSection;

