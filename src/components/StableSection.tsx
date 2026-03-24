import _ from 'underscore';
import React from 'react';
import Stable, { StableHandle } from '../ui/Stable';
import Hand from '../ui/Hand';
import CardPopupSingleAction from '../ui/CardPopupSingleAction';
import { CardInteraction, HoverTarget, findUITargets } from '../BoardUtil';
import { canPlayCard, _findInstruction, Instruction, Scene, UnstableUnicornsGame, Ctx } from '../game/game';
import { AddFromDiscardPileToHandTarget, BringToStableTarget, DiscardTarget, ReviveTarget, SearchTarget } from '../game/do';
import { CardID } from '../game/card';
import type { Moves } from '../game/types';
import { BoardState } from '../BoardStateManager';

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
    setShowDeckFinder: (x: SearchTarget[] | undefined) => void;
    setShowDiscardFinder: (x: { cardID: CardID }[] | undefined) => void;
    setShowNurseryFinder: (x: boolean) => void;
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
    setShowDeckFinder,
    setShowDiscardFinder,
    setShowNurseryFinder,
    isHoveringOverHandCard,
    setHoveringOverHandCard,
    playHubMouseOverSound,
    playExecuteDoSound,
}: Props) => {
    // renderHand logic inlined
    let glowingCards: CardID[] = [];

    if (boardStates.find(s => s.type === "playCard")) {
        // current player may play cards from its hand
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
        if (boardStates.find(s => s.type === "playCard")) {
            const cardsOnHandThatCanBePlayed = G.hand[playerID].map(c => [canPlayCard(G, ctx, playerID, c), c]).filter(s => s[0]).map(s => s[1]) as CardID[];
            if (cardsOnHandThatCanBePlayed.includes(cardID)) {
                const card = G.deck[cardID];
                if (card.type === "upgrade" || card.type === "downgrade") {
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
                // if click on hand card that is discardable
                playExecuteDoSound(discardState.type);
                moves.executeDo(discardState.info!.instructionID, { protagonist: playerID, cardID });
                setHoveringOverHandCard(false);
            }
        } else if (boardStates.find(s => s.type === "bring__popup__committed")) {
            const discardState = boardStates.find(s => s.type === "bring__popup__committed")!;
            if (discardState.info!.targets!.find((s: BringToStableTarget) => s.cardID === cardID)) {
                // if click on hand card that is discardable
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
                    // initiate card to card interaction for destroy and steal actions
                    if (cardInteraction === undefined) {
                        // check if it is a destroy or steal action
                        // check if the card that is clicked is the source for the action
                        let boardState = _.first(boardStates.filter(s => s.info?.sourceCardID === cardID && (s.type === "destroy__cardToCard" || s.type === "steal__cardToCard" || s.type === "sacrifice__cardToCard" || s.type === "move__cardToCard" || s.type === "returnToHand__cardToCard" || s.type === "backKick__card_to_card" || s.type === "unicornswap1")));

                        if (boardState) {
                            const cardRef = stableRef.current?.getStableItemRef(cardID)!;
                            const coord = cardRef.current!.getBoundingClientRect();
                            const from = {
                                x: coord.left + coord.width / 2.0,
                                y: coord.top + coord.height / 2.0,
                            };
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
                            const from = {
                                x: coord.left + coord.width / 2.0,
                                y: coord.top + coord.height / 2.0,
                            };
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
                        // cancel card interaction
                        if ((cardInteraction.key === "card_to_card" || cardInteraction.key === "card_to_player") && cardInteraction.info.sourceCardID === cardID) {
                            setCardInteraction(undefined);
                            return;
                        }

                        if (cardInteraction?.key === "click_on_other_stable_card" || cardInteraction?.key === "card_to_card") {
                            console.log("Detected click for cardInteraction with key <click_on_other_stable_card>");
                            // is clicked card a valid target?
                            if (cardInteraction.info.targets.find(s => s.cardID === cardID)) {
                                console.log(`Clicked card is a valid target. Execute instruction with id <${cardInteraction.info.instructionID}>`);
                                const bsType = boardStates.find(s => s.info?.instructionID === cardInteraction.info.instructionID)?.type;
                                playExecuteDoSound(bsType);
                                moves.executeDo(cardInteraction.info.instructionID, {
                                    protagonist: playerID, cardID
                                });
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

                    // show hover targets if the hovered card is a source card
                    if (o.length > 0) {
                        setHoverTargets({ sourceCardID: cardID, targets });
                    }
                }}
                onStableItemMouseLeave={cardID => {
                    // if a card to card interaction is in progress we do not want to unhighlight the targets
                    // thus we unhighlight the targets when are not in a card to card interaction
                    // this if query checks this condition
                    if (cardInteraction?.key !== "card_to_card") {
                        setHoverTargets(undefined);
                    }
                }}
                renderAccessoryHoverItem={cardID => {
                    let boardState = boardStates.find(s => s.type === "discard__popup__ask" && s.info?.sourceCardID === cardID);
                    if (boardState) {
                        const { instruction, scene } = _findInstruction(G, boardState.info!.instructionID)!;
                        // this if condition is just for typescript interference
                        if (instruction.do.key === "discard" && instruction.ui.type === "single_action_popup") {
                            return (
                                <CardPopupSingleAction
                                    text={instruction.ui.info?.singleActionText!}
                                    onClick={() => {
                                        moves.commit(scene!.id);
                                    }}
                                />
                            );
                        }
                    }

                    boardState = boardStates.find(s => s.type === "bring__popup__ask" && s.info?.sourceCardID === cardID);
                    if (boardState) {
                        const { instruction, scene } = _findInstruction(G, boardState.info!.instructionID)!;
                        // this if condition is just for typescript interference
                        if (instruction.do.key === "bringToStable" && instruction.ui.type === "single_action_popup") {
                            return (
                                <CardPopupSingleAction
                                    text={instruction.ui.info?.singleActionText!}
                                    onClick={() => {
                                        moves.commit(scene!.id);
                                    }}
                                />
                            );
                        }
                    }

                    boardState = boardStates.find(s => (s.type === "shakeUp" || s.type === "reset" || s.type === "shuffleDiscardPileIntoDrawPile") && s.info?.sourceCardID === cardID);
                    if (boardState) {
                        const { instruction } = _findInstruction(G, boardState.info!.instructionID)!;
                        // this if condition is just for typescript interference
                        if ((instruction.do.key === "shakeUp" || instruction.do.key === "reset" || instruction.do.key === "shuffleDiscardPileIntoDrawPile") && instruction.ui.type === "single_action_popup") {
                            return (
                                <CardPopupSingleAction
                                    text={instruction.ui.info?.singleActionText!}
                                    onClick={() => {
                                        moves.executeDo(instruction.id, { protagonist: playerID, sourceCardID: cardID });
                                    }}
                                />
                            );
                        }
                    }

                    boardState = boardStates.find(s => (s.type === "revive") && s.info?.sourceCardID === cardID);
                    if (boardState) {
                        const { instruction } = _findInstruction(G, boardState.info!.instructionID)!;
                        // this if condition is just for typescript interference
                        if ((instruction.do.key === "revive") && instruction.ui.type === "single_action_popup") {
                            return (
                                <CardPopupSingleAction
                                    text={instruction.ui.info?.singleActionText!}
                                    onClick={() => {
                                        setShowDiscardFinder(boardState?.info?.targets?.map((s: ReviveTarget) => ({ cardID: s.cardID })));
                                    }}
                                />
                            );
                        }
                    }

                    boardState = boardStates.find(s => (s.type === "reviveFromNursery") && s.info?.sourceCardID === cardID);
                    if (boardState) {
                        const { instruction } = _findInstruction(G, boardState.info!.instructionID)!;
                        // this if condition is just for typescript interference
                        if ((instruction.do.key === "reviveFromNursery") && instruction.ui.type === "single_action_popup") {
                            return (
                                <CardPopupSingleAction
                                    text={instruction.ui.info?.singleActionText!}
                                    onClick={() => {
                                        setShowNurseryFinder(true);
                                    }}
                                />
                            );
                        }
                    }

                    boardState = boardStates.find(s => (s.type === "addFromDiscardPileToHand__single_action_popup") && s.info?.sourceCardID === cardID);
                    if (boardState) {
                        const { instruction } = _findInstruction(G, boardState.info!.instructionID)!;
                        // this if condition is just for typescript interference
                        if ((instruction.do.key === "addFromDiscardPileToHand") && instruction.ui.type === "single_action_popup") {
                            return (
                                <CardPopupSingleAction
                                    text={instruction.ui.info?.singleActionText!}
                                    onClick={() => {
                                        setShowDiscardFinder(boardState?.info?.targets?.map((s: AddFromDiscardPileToHandTarget) => ({ cardID: s.cardID })));
                                    }}
                                />
                            );
                        }
                    }

                    boardState = boardStates.find(s => (s.type === "search__single_action_popup") && s.info?.sourceCardID === cardID);
                    if (boardState) {
                        const { instruction } = _findInstruction(G, boardState.info!.instructionID)!;
                        // this if condition is just for typescript interference
                        if ((instruction.do.key === "search") && instruction.ui.type === "single_action_popup") {
                            return (
                                <CardPopupSingleAction
                                    text={instruction.ui.info?.singleActionText!}
                                    onClick={() => {
                                        setShowDeckFinder(boardState?.info?.targets);
                                    }}
                                />
                            );
                        }
                    }

                    return undefined;
                }}
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
                onMouseEnterHandCard={(idx) => {
                    setHoveringOverHandCard(true);
                }}
                onMouseLeaveHandCard={(idx) => {
                    setHoveringOverHandCard(false);
                }}
            />
        </>
    );
}

export default StableSection;
