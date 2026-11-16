import React from 'react';
import styled from 'styled-components';
import type { UnstableUnicornsGame, Ctx } from '../game/state';
import type { BoardState } from '../BoardStateManager';
import type { Moves } from '../game/types';
import type { BoardStateInfo } from '../game/types';
import type { SearchTarget, AddFromDiscardPileToHandTarget, ReviveTarget } from '../game/operations';
import type { CardID } from '../game/card';
import type { CardInteraction } from '../BoardUtil';

type Props = {
    G: UnstableUnicornsGame;
    ctx: Ctx;
    playerID: string;
    moves: Moves;
    boardStates: BoardState[];
    cardInteraction: CardInteraction | undefined;
    setCardInteraction: (ci: CardInteraction | undefined) => void;
    setShowDeckFinder: (x: SearchTarget[] | undefined) => void;
    setShowDiscardFinder: (x: { cardID: CardID }[] | undefined) => void;
    setShowNurseryFinder: (x: boolean) => void;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

const C2C_TYPES = new Set([
    'steal__cardToCard', 'destroy__cardToCard', 'sacrifice__cardToCard',
    'returnToHand__cardToCard', 'backKick__card_to_card', 'unicornswap1', 'move__cardToCard',
]);
const C2P_TYPES = new Set([
    'swapHands__cardToPlayer', 'pullRandom__cardToPlayer', 'blatantThievery1',
    'makeSomeoneDiscard__cardToPlayer', 'move2__cardToPlayer', 'unicornswap2',
]);

function getAfterActivateHint(type: string): string {
    if (C2P_TYPES.has(type)) return "Click on a player's name above.";
    return 'Click on a target card in a stable.';
}

function getFallbackLabel(type: string): string {
    switch (type) {
        case 'steal__cardToCard': return 'Steal a card';
        case 'destroy__cardToCard': return 'Destroy a card';
        case 'sacrifice__cardToCard': return 'Sacrifice a card';
        case 'returnToHand__cardToCard': return 'Return to hand';
        case 'backKick__card_to_card': return 'Back-kick a card';
        case 'unicornswap1': return 'Select card to swap';
        case 'move__cardToCard': return 'Move a card';
        case 'swapHands__cardToPlayer': return 'Swap hands';
        case 'pullRandom__cardToPlayer': return 'Pull random card';
        case 'blatantThievery1': return 'Choose player (view hand)';
        case 'makeSomeoneDiscard__cardToPlayer': return 'Make player discard';
        case 'move2__cardToPlayer': return 'Choose destination player';
        case 'unicornswap2': return 'Choose destination player';
        default: return 'Activate';
    }
}

// ─── component ────────────────────────────────────────────────────────────────

const ActionPanel = ({
    G, ctx, playerID, moves, boardStates,
    cardInteraction, setCardInteraction,
    setShowDeckFinder, setShowDiscardFinder, setShowNurseryFinder,
}: Props) => {
    const entries: React.ReactNode[] = [];

    // ── helpers ──
    const skipBtn = (instructionID: string) => (
        <SkipBtn key={`skip-${instructionID}`} onClick={() => moves.skipExecuteDo(playerID, instructionID)}>
            Skip
        </SkipBtn>
    );

    const activateC2C = (bs: BoardState) => setCardInteraction({
        key: 'click_on_other_stable_card',
        info: { instructionID: bs.info!.instructionID, targets: bs.info!.targets! },
    });

    const activateC2P = (e: React.MouseEvent, bs: BoardState) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const pos = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        setCardInteraction({
            key: 'card_to_player',
            info: {
                sourceCardID: bs.info!.sourceCardID!,
                instructionID: bs.info!.instructionID,
                targets: bs.info!.targets!,
                currentMousePosition: pos,
                startingMousePosition: pos,
            },
        });
    };

    const getLabel = (bs: BoardState): string => {
        if (bs.info?.actionLabel) return bs.info.actionLabel;
        return getFallbackLabel(bs.type);
    };

    const makeHeader = (info: BoardStateInfo | undefined) => {
        const sourceCard = info?.sourceCardID != null ? G.deck[info.sourceCardID] : undefined;
        const stepLabel = (info?.actionCount ?? 0) > 1
            ? `Step ${(info?.actionIndex ?? 0) + 1}/${info?.actionCount}`
            : undefined;
        if (!sourceCard && !stepLabel) return null;
        return (
            <EntryHeader>
                {sourceCard && <CardTitle>{sourceCard.title}</CardTitle>}
                {stepLabel && <StepBadge>{stepLabel}</StepBadge>}
            </EntryHeader>
        );
    };

    // ── Group boardStates by (sceneID, actionIndex) → handle OR alternatives ──
    const grouped: { key: string; states: BoardState[] }[] = [];
    const keyToGroup = new Map<string, BoardState[]>();
    boardStates.forEach((bs, idx) => {
        const key = bs.info?.sceneID != null && bs.info?.actionIndex != null
            ? `${bs.info.sceneID}__${bs.info.actionIndex}`
            : `__single__${bs.info?.instructionID ?? idx}`;
        if (!keyToGroup.has(key)) {
            const s: BoardState[] = [];
            keyToGroup.set(key, s);
            grouped.push({ key, states: s });
        }
        keyToGroup.get(key)!.push(bs);
    });

    // ── Render each group ──
    grouped.forEach(({ key, states }) => {
        // Check if this is an OR group (multiple C2C/C2P options in same action)
        const allInteractive = states.every(bs => C2C_TYPES.has(bs.type) || C2P_TYPES.has(bs.type));
        if (states.length > 1 && allInteractive) {
            const firstInfo = states[0].info!;
            const header = makeHeader(firstInfo);
            const activeBS = states.find(bs => cardInteraction?.info?.instructionID === bs.info!.instructionID);
            entries.push(
                <ActionEntry key={key}>
                    {header}
                    <EntryBody>
                        {activeBS ? (
                            <>
                                <ActiveHint>{getAfterActivateHint(activeBS.type)}</ActiveHint>
                                <CancelBtn onClick={() => setCardInteraction(undefined)}>Cancel</CancelBtn>
                            </>
                        ) : (
                            states.map((bs, i) => (
                                <React.Fragment key={bs.info!.instructionID}>
                                    {i > 0 && <OrSeparator>OR</OrSeparator>}
                                    <PrimaryBtn onClick={(e) =>
                                        C2C_TYPES.has(bs.type) ? activateC2C(bs) : activateC2P(e, bs)
                                    }>
                                        {getLabel(bs)}
                                    </PrimaryBtn>
                                </React.Fragment>
                            ))
                        )}
                        {!activeBS && firstInfo.mandatory === false && skipBtn(firstInfo.instructionID)}
                    </EntryBody>
                </ActionEntry>
            );
            return;
        }

        // Single state or non-groupable group: render each individually
        states.forEach((bs, idx) => {
            const info = bs.info;
            const header = makeHeader(info);

            // ── Single-action popup buttons ────────────────────────────────
            if (bs.type === 'discard__popup__ask' && info) {
                entries.push(<ActionEntry key={info.instructionID}>{header}<EntryBody>
                    <PrimaryBtn onClick={() => moves.commit(info.sceneID!)}>{info.singleActionText ?? 'Discard'}</PrimaryBtn>
                    {skipBtn(info.instructionID)}
                </EntryBody></ActionEntry>);
                return;
            }
            if (bs.type === 'bring__popup__ask' && info) {
                entries.push(<ActionEntry key={info.instructionID}>{header}<EntryBody>
                    <PrimaryBtn onClick={() => moves.commit(info.sceneID!)}>{info.singleActionText ?? 'Bring to stable'}</PrimaryBtn>
                    {skipBtn(info.instructionID)}
                </EntryBody></ActionEntry>);
                return;
            }
            if ((bs.type === 'shakeUp' || bs.type === 'reset' || bs.type === 'shuffleDiscardPileIntoDrawPile') && info) {
                entries.push(<ActionEntry key={info.instructionID}>{header}<EntryBody>
                    <PrimaryBtn onClick={() => moves.executeDo(info.instructionID, { protagonist: playerID, sourceCardID: info.sourceCardID })}>{info.singleActionText ?? bs.type}</PrimaryBtn>
                    {info.mandatory === false && skipBtn(info.instructionID)}
                </EntryBody></ActionEntry>);
                return;
            }
            if (bs.type === 'revive' && info) {
                entries.push(<ActionEntry key={info.instructionID}>{header}<EntryBody>
                    <PrimaryBtn onClick={() => setShowDiscardFinder(info.targets?.map((t: ReviveTarget) => ({ cardID: t.cardID })))}>{info.singleActionText ?? 'Revive a card'}</PrimaryBtn>
                    {info.mandatory === false && skipBtn(info.instructionID)}
                </EntryBody></ActionEntry>);
                return;
            }
            if (bs.type === 'reviveFromNursery' && info) {
                entries.push(<ActionEntry key={info.instructionID}>{header}<EntryBody>
                    <PrimaryBtn onClick={() => setShowNurseryFinder(true)}>{info.singleActionText ?? 'Revive from nursery'}</PrimaryBtn>
                    {info.mandatory === false && skipBtn(info.instructionID)}
                </EntryBody></ActionEntry>);
                return;
            }
            if (bs.type === 'addFromDiscardPileToHand__single_action_popup' && info) {
                entries.push(<ActionEntry key={info.instructionID}>{header}<EntryBody>
                    <PrimaryBtn onClick={() => setShowDiscardFinder(info.targets?.map((t: AddFromDiscardPileToHandTarget) => ({ cardID: t.cardID })))}>{info.singleActionText ?? 'Add from discard pile'}</PrimaryBtn>
                    {info.mandatory === false && skipBtn(info.instructionID)}
                </EntryBody></ActionEntry>);
                return;
            }
            if (bs.type === 'search__single_action_popup' && info) {
                entries.push(<ActionEntry key={info.instructionID}>{header}<EntryBody>
                    <PrimaryBtn onClick={() => setShowDeckFinder(info.targets)}>{info.singleActionText ?? 'Search deck'}</PrimaryBtn>
                    {info.mandatory === false && skipBtn(info.instructionID)}
                </EntryBody></ActionEntry>);
                return;
            }
            if (bs.type === 'stowawaydraw__popup' && info) {
                entries.push(<ActionEntry key={info.instructionID}>{header}<EntryBody>
                    <PrimaryBtn onClick={() => moves.executeDo(info.instructionID, { protagonist: playerID })}>{info.singleActionText ?? 'Draw and reveal'}</PrimaryBtn>
                    {info.mandatory === false && skipBtn(info.instructionID)}
                </EntryBody></ActionEntry>);
                return;
            }
            if (bs.type === 'returnSelf__popup' && info) {
                entries.push(<ActionEntry key={info.instructionID}>{header}<EntryBody>
                    <PrimaryBtn onClick={() => moves.executeDo(info.instructionID, { protagonist: playerID })}>{info.singleActionText ?? 'Return to hand'}</PrimaryBtn>
                    {skipBtn(info.instructionID)}
                </EntryBody></ActionEntry>);
                return;
            }

            // ── Card-to-card: button → click_on_other_stable_card ───────────
            if (C2C_TYPES.has(bs.type) && info) {
                const isActive = cardInteraction?.info?.instructionID === info.instructionID;
                entries.push(
                    <ActionEntry key={info.instructionID}>
                        {header}
                        <EntryBody>
                            {isActive ? (
                                <>
                                    <ActiveHint>{getAfterActivateHint(bs.type)}</ActiveHint>
                                    <CancelBtn onClick={() => setCardInteraction(undefined)}>Cancel</CancelBtn>
                                </>
                            ) : (
                                <PrimaryBtn onClick={() => activateC2C(bs)}>
                                    {getLabel(bs)}
                                </PrimaryBtn>
                            )}
                            {!isActive && info.mandatory === false && skipBtn(info.instructionID)}
                        </EntryBody>
                    </ActionEntry>
                );
                return;
            }

            // ── Card-to-player: button → card_to_player ──────────────────────
            if (C2P_TYPES.has(bs.type) && info) {
                const isActive = cardInteraction?.info?.instructionID === info.instructionID;
                entries.push(
                    <ActionEntry key={info.instructionID}>
                        {header}
                        <EntryBody>
                            {isActive ? (
                                <>
                                    <ActiveHint>{getAfterActivateHint(bs.type)}</ActiveHint>
                                    <CancelBtn onClick={() => setCardInteraction(undefined)}>Cancel</CancelBtn>
                                </>
                            ) : (
                                <PrimaryBtn onClick={(e) => activateC2P(e, bs)}>
                                    {getLabel(bs)}
                                </PrimaryBtn>
                            )}
                            {!isActive && info.mandatory === false && skipBtn(info.instructionID)}
                        </EntryBody>
                    </ActionEntry>
                );
                return;
            }

            // ── Info-only states ─────────────────────────────────────────────
            if (bs.type === 'discard' || bs.type === 'discard__popup__committed') {
                const remaining = info?.count ?? 1;
                const label = remaining > 1
                    ? `You must discard ${remaining} more cards — click on a card in your hand.`
                    : 'You must discard a card — click on a card in your hand.';
                entries.push(<InfoEntry key={`${bs.type}-${idx}`}>{header}
                    <InfoText>{label}</InfoText>
                </InfoEntry>);
                return;
            }
            if (bs.type === 'destroy__click_on_card_in_stable') {
                entries.push(<InfoEntry key={`${bs.type}-${idx}`}>{header}
                    <InfoText>You must destroy a card — click on a card in a player's stable.</InfoText>
                </InfoEntry>);
                return;
            }
            if (bs.type === 'sacrifice__clickOnCardInStable') {
                entries.push(<InfoEntry key={`${bs.type}-${idx}`}>{header}
                    <InfoText>You must sacrifice a card — click on a card in your stable.</InfoText>
                </InfoEntry>);
                return;
            }
            if (bs.type === 'draw__clickOnDrawPile' && info) {
                if (info.mandatory === false) {
                    // Optional draw (e.g. Extreme Adventurer): show button + skip
                    const count = info.count ?? 1;
                    entries.push(<ActionEntry key={info.instructionID}>{header}<EntryBody>
                        <PrimaryBtn onClick={() => moves.executeDo(info.instructionID, { protagonist: playerID, count })}>
                            Draw {count} card{count > 1 ? 's' : ''}
                        </PrimaryBtn>
                        {skipBtn(info.instructionID)}
                    </EntryBody></ActionEntry>);
                } else {
                    // Mandatory draw: info only (click draw pile)
                    entries.push(<InfoEntry key={`${bs.type}-${idx}`}>{header}
                        <InfoText>Click on the draw pile to draw {info.count} card{(info.count ?? 1) > 1 ? 's' : ''}.</InfoText>
                    </InfoEntry>);
                }
                return;
            }
            if (bs.type === 'wait_for_other_players') {
                entries.push(<InfoEntry key="waiting"><InfoText>Waiting for other players…</InfoText></InfoEntry>);
                return;
            }
        });
    });

    // ── Generic action-phase hint (no specific action pending) ───────────────
    const hasSpecific = boardStates.some(
        (s) => !['playCard', 'drawCard', 'endTurn', 'neigh__playNeigh', 'neigh__wait'].includes(s.type)
    );
    if (
        !hasSpecific &&
        ctx.currentPlayer === playerID &&
        ctx.activePlayers![playerID] === 'action_phase' &&
        G.countPlayedCardsInActionPhase === 0 &&
        G.neighDiscussion === undefined &&
        boardStates.find((s) => s.type === 'playCard' || s.type === 'drawCard')
    ) {
        entries.push(
            <InfoEntry key="action-phase-generic">
                <InfoText>Play a card from your hand or draw a card. You cannot do both.</InfoText>
            </InfoEntry>
        );
    }

    if (entries.length === 0 && !G.deckWasReshuffled) return null;

    return (
        <PanelWrapper>
            {entries}
            {G.deckWasReshuffled && (
                <InfoEntry key="reshuffle">
                    <InfoText>The draw pile was empty — the discard pile was shuffled in!</InfoText>
                </InfoEntry>
            )}
        </PanelWrapper>
    );
};

export default ActionPanel;

// ── Styled components ──────────────────────────────────────────────────────────

const PanelWrapper = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 4000;
    pointer-events: none;
`;

const baseEntry = `
    pointer-events: all;
    background: rgba(12, 12, 26, 0.95);
    border-radius: 14px;
    padding: 14px 24px;
    min-width: 420px;
    max-width: 700px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-family: 'Nunito', sans-serif;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
`;

const ActionEntry = styled.div`
    ${baseEntry}
    border: 1.5px solid rgba(155, 89, 182, 0.7);
`;

const InfoEntry = styled.div`
    ${baseEntry}
    border: 1.5px solid rgba(80, 140, 240, 0.5);
`;

const EntryHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const CardTitle = styled.span`
    color: #d8c0ff;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
`;

const StepBadge = styled.span`
    margin-left: auto;
    background: rgba(155, 89, 182, 0.3);
    border: 1px solid rgba(155, 89, 182, 0.6);
    color: #c8a8f0;
    font-size: 10px;
    font-weight: 600;
    padding: 1px 8px;
    border-radius: 20px;
`;

const EntryBody = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const PrimaryBtn = styled.button`
    background: linear-gradient(135deg, #9b59b6, #6c3483);
    color: white;
    border: none;
    border-radius: 9px;
    padding: 9px 22px;
    font-size: 15px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s ease, transform 0.1s ease;
    &:hover { opacity: 0.88; transform: scale(1.03); }
    &:active { transform: scale(0.97); }
`;

const SkipBtn = styled.button`
    background: transparent;
    color: #888;
    border: 1px solid #555;
    border-radius: 9px;
    padding: 7px 16px;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Nunito', sans-serif;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.15s ease, border-color 0.15s ease;
    &:hover { color: #ddd; border-color: #999; }
`;

const CancelBtn = styled.button`
    background: transparent;
    color: #e88;
    border: 1px solid #c66;
    border-radius: 7px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    font-family: 'Nunito', sans-serif;
    cursor: pointer;
    white-space: nowrap;
    &:hover { color: #faa; border-color: #f88; }
`;

const ActiveHint = styled.span`
    color: #a8d0ff;
    font-size: 12px;
    font-weight: 500;
    font-family: 'Nunito', sans-serif;
    flex: 1;
`;

const OrSeparator = styled.span`
    color: #888;
    font-size: 11px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0 2px;
`;

const InfoText = styled.p`
    margin: 0;
    color: #b8cce8;
    font-size: 15px;
    font-weight: 500;
    line-height: 1.4;
    font-family: 'Nunito', sans-serif;
    b { color: #e0d0ff; font-weight: 700; }
`;

