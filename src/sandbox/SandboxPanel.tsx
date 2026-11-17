import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import type { Ctx, Moves } from '../game/game';
import type { GameState } from '../game/engine';
import { HAND_SIZE_AT_START, activeStatics } from '../game/engine';
import { ALL_DEFS, getDef, hasDef } from '../game/cards/registry';
import type { CardDef } from '../game/cards/types';
import ImageLoader from '../assets/card/imageLoader';
import { serializeSandboxSnapshot } from '../game/sandbox/cheats';
import { cardName, cardView, typeLabel } from '../view/cards';
import { useSandboxControl } from './sandboxContext';

type Props = {
    G: GameState;
    ctx: Ctx;
    moves: Moves;
    playerID: string;
};

type TargetPlayer = "0" | "1" | "2";
const PLAYER_LABELS: Record<TargetPlayer, string> = {
    "0": "Player",
    "1": "Dummy 1",
    "2": "Dummy 2",
};

// ─── Fuzzy search ─────────────────────────────────────────────────────────────

function fuzzyMatch(query: string, title: string): boolean {
    const q = query.toLowerCase();
    const t = title.toLowerCase();
    if (t.includes(q)) return true;
    let qi = 0;
    for (let i = 0; i < t.length && qi < q.length; i++) {
        if (t[i] === q[qi]) qi++;
    }
    return qi === q.length;
}

const LS_AUTO_SKIP = "sandbox_autoSkip";
const LS_EXPANDED = "sandbox_expanded";
// Keys changed with the engine rewrite: older entries hold card indices and snapshots of the old state.
const LS_RECENT = "sandbox_recentDefs";
const LS_SLOTS = "sandbox_slots_v2";

function loadBool(key: string, def: boolean): boolean {
    try { const v = localStorage.getItem(key); return v === null ? def : v === "true"; } catch { return def; }
}
function saveBool(key: string, v: boolean) {
    try { localStorage.setItem(key, String(v)); } catch {}
}
function loadJSON<T>(key: string, def: T): T {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function saveJSON(key: string, v: any) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}

// ─── Main component ───────────────────────────────────────────────────────────

const SandboxPanel = ({ G, ctx, moves, playerID }: Props) => {
    const [open, setOpen] = useState(() => loadBool(LS_EXPANDED, true));
    const [autoSkip, setAutoSkip] = useState(() => loadBool(LS_AUTO_SKIP, true));
    const [targetPlayer, setTargetPlayer] = useState<TargetPlayer>("0");
    const { viewedPlayerID, setViewedPlayerID, sandboxAction, setSandboxAction } = useSandboxControl();

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<CardDef[]>([]);
    const [selectedResult, setSelectedResult] = useState<CardDef | null>(null);
    const [recentPicks, setRecentPicks] = useState<string[]>(() =>
        loadJSON<unknown[]>(LS_RECENT, []).filter((id): id is string => typeof id === 'string' && hasDef(id)));

    // Inspect
    const [showRawG, setShowRawG] = useState(false);

    // Save/Load
    const [slots, setSlots] = useState<(string | null)[]>(() => loadJSON(LS_SLOTS, [null, null, null]));

    // Toggle persistence
    const toggleOpen = () => setOpen(v => { saveBool(LS_EXPANDED, !v); return !v; });
    const toggleAutoSkip = () => setAutoSkip(v => { saveBool(LS_AUTO_SKIP, !v); return !v; });

    // Auto-skip dummy turns
    const autoSkipRef = useRef(autoSkip);
    autoSkipRef.current = autoSkip;
    const turnPlayer = G.turn.player;
    const busy = G.prompts.length > 0 || G.round !== undefined || G.chain.length > 0;
    useEffect(() => {
        if (!autoSkipRef.current) return;
        if (turnPlayer === playerID) return;
        if (playerID !== G.owner) return; // only owner panel drives auto-skip
        if (busy || G.gameOver) return;   // a dummy has to decide something: switch seats or use "Answer open decision"
        const timer = setTimeout(() => {
            if (autoSkipRef.current) moves.sandboxForceEndTurn();
        }, 200);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [turnPlayer, G.turn.number, busy]);

    // Keyboard shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === '\\') { e.preventDefault(); toggleOpen(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        const results: CardDef[] = [];
        const seen = new Set<string>();
        ALL_DEFS.forEach(def => {
            if (seen.has(def.name)) return;
            if (fuzzyMatch(searchQuery, def.name) || fuzzyMatch(searchQuery, typeLabel(def.type))) {
                seen.add(def.name);
                results.push(def);
            }
        });
        setSearchResults(results.slice(0, 12));
    }, [searchQuery]);

    const addRecentPick = useCallback((def: string) => {
        setRecentPicks(prev => {
            const next = [def, ...prev.filter(i => i !== def)].slice(0, 8);
            saveJSON(LS_RECENT, next);
            return next;
        });
    }, []);

    // Quick-action helpers
    const randomDefOf = (filter: (d: CardDef) => boolean): string | null => {
        const candidates = ALL_DEFS.filter(d => filter(d) && !d.id.includes('@'));
        if (!candidates.length) return null;
        return candidates[Math.floor(Math.random() * candidates.length)].id;
    };

    const drawToHandSize = (pid: string) => {
        const count = Math.max(0, HAND_SIZE_AT_START - G.zones.hand[pid].length);
        if (count > 0) moves.sandboxDraw(pid, count);
    };

    // Destination picker for search results
    type Dest = "hand" | "stable_enter" | "stable_silent" | "discard" | "deck_top" | "nursery";
    const dispatchToDestination = (def: string, dest: Dest, pid: TargetPlayer) => {
        addRecentPick(def);
        switch (dest) {
            case "hand": moves.sandboxAddToHand(pid, def); break;
            case "stable_enter": moves.sandboxAddToStable(pid, def, true); break;
            case "stable_silent": moves.sandboxAddToStable(pid, def, false); break;
            case "discard": moves.sandboxAddToDiscard(def); break;
            case "deck_top": moves.sandboxAddToDeckTop(def); break;
            case "nursery": moves.sandboxAddToNursery(def); break;
        }
        setSelectedResult(null);
        setSearchQuery("");
    };

    // Save/Load
    const saveSlot = (i: number) => {
        const snap = JSON.stringify(serializeSandboxSnapshot(G));
        const next = [...slots];
        next[i] = snap;
        setSlots(next);
        saveJSON(LS_SLOTS, next);
    };
    const loadSlot = (i: number) => {
        if (!slots[i]) return;
        try {
            const snap = JSON.parse(slots[i]!);
            moves.sandboxLoadState(snap);
        } catch {}
    };
    const clearSlot = (i: number) => {
        const next = [...slots];
        next[i] = null;
        setSlots(next);
        saveJSON(LS_SLOTS, next);
    };
    const copyToClipboard = () => {
        const text = JSON.stringify(serializeSandboxSnapshot(G), null, 2);
        navigator.clipboard.writeText(text).catch(() => {});
    };
    const pasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const snap = JSON.parse(text);
            moves.sandboxLoadState(snap);
        } catch {}
    };

    return (
        <>
            <ToggleButton onClick={toggleOpen} title="Toggle Sandbox Panel (Ctrl+\)">
                {open ? '»' : '«'}
            </ToggleButton>
            {open && (
                <Drawer>
                    <DrawerHeader>
                        <DrawerTitle>Sandbox</DrawerTitle>
                        <SkipToggle active={autoSkip} onClick={toggleAutoSkip} title="Auto-skip dummy turns">
                            {autoSkip ? 'Auto-skip ON' : 'Auto-skip OFF'}
                        </SkipToggle>
                    </DrawerHeader>

                    <PlayerPills>
                        {(["0", "1", "2"] as TargetPlayer[]).map(pid => (
                            <PlayerPill key={pid} active={targetPlayer === pid} onClick={() => setTargetPlayer(pid)}>
                                {PLAYER_LABELS[pid]}
                            </PlayerPill>
                        ))}
                    </PlayerPills>

                    <DrawerBody>
                        {/* ── Settings ── */}
                        <Section>
                            <SectionTitle>Settings</SectionTitle>
                            <SettingRow>
                                <SettingLabel>Infinite actions / draws</SettingLabel>
                                <ToggleSwitch
                                    active={G.sandboxSettings?.infiniteActions ?? false}
                                    onClick={() => moves.sandboxSetSetting("infiniteActions", !(G.sandboxSettings?.infiniteActions))}
                                />
                            </SettingRow>
                            <SettingRow>
                                <SettingLabel>Auto-resolve Neigh</SettingLabel>
                                <ToggleSwitch
                                    active={G.sandboxSettings?.skipNeigh ?? false}
                                    onClick={() => moves.sandboxSetSetting("skipNeigh", !(G.sandboxSettings?.skipNeigh))}
                                />
                            </SettingRow>
                        </Section>

                        {/* ── Seat ── */}
                        <Section>
                            <SectionTitle>View as</SectionTitle>
                            <PlayerPills>
                                {(["0", "1", "2"] as TargetPlayer[]).map(pid => (
                                    <PlayerPill key={pid} active={viewedPlayerID === pid} onClick={() => setViewedPlayerID(pid)}>
                                        {PLAYER_LABELS[pid]}
                                    </PlayerPill>
                                ))}
                            </PlayerPills>
                            <InfoLine style={{ marginTop: 4 }}>Swapping seat remounts the board — G is unchanged.</InfoLine>
                        </Section>

                        {/* ── Quick Actions ── */}
                        <Section>
                            <SectionTitle>Quick Actions — {PLAYER_LABELS[targetPlayer]}</SectionTitle>
                            <ButtonGrid>
                                <CheatBtn onClick={() => {
                                    const i = randomDefOf(d => d.type === 'basic');
                                    if (i != null) moves.sandboxAddToStable(targetPlayer, i, false);
                                }}>+ Basic Unicorn (silent)</CheatBtn>
                                <CheatBtn onClick={() => {
                                    const i = randomDefOf(d => d.type === 'magical');
                                    if (i != null) moves.sandboxAddToStable(targetPlayer, i, false);
                                }}>+ Magical Unicorn (silent)</CheatBtn>
                                <CheatBtn onClick={() => {
                                    const i = randomDefOf(d => d.type === 'magical');
                                    if (i != null) moves.sandboxAddToStable(targetPlayer, i, true);
                                }}>+ Magical Unicorn (enter)</CheatBtn>
                                <CheatBtn onClick={() => moves.sandboxDraw(targetPlayer, 1)}>Draw 1</CheatBtn>
                                <CheatBtn onClick={() => moves.sandboxDraw(targetPlayer, 5)}>Draw 5</CheatBtn>
                                <CheatBtn onClick={() => drawToHandSize(targetPlayer)}>Draw to hand size</CheatBtn>
                                <CheatBtn onClick={() => moves.sandboxDiscardRandom(targetPlayer)}>Discard random</CheatBtn>
                                <CheatBtn onClick={() => moves.sandboxEmptyHand(targetPlayer)}>Empty hand</CheatBtn>
                            </ButtonGrid>
                            <ButtonGrid style={{ marginTop: 6 }}>
                                <CheatBtn onClick={() => moves.sandboxForceEndTurn()}>End turn</CheatBtn>
                                <CheatBtn onClick={() => {
                                    moves.sandboxForceEndTurn();
                                    setTimeout(() => moves.sandboxForceEndTurn(), 50);
                                    setTimeout(() => moves.sandboxForceEndTurn(), 100);
                                }}>End turn ×3</CheatBtn>
                                <CheatBtn onClick={() => moves.sandboxReshuffleDiscard()}>Reshuffle discard</CheatBtn>
                            </ButtonGrid>
                        </Section>

                        {/* ── Interactive Actions ── */}
                        <Section>
                            <SectionTitle>Interactive Actions</SectionTitle>
                            {!sandboxAction ? (
                                <ButtonGrid>
                                    <ActionBtn onClick={() => setSandboxAction({ type: 'bounce' })}>Bounce card</ActionBtn>
                                    <ActionBtn onClick={() => setSandboxAction({ type: 'destroy' })}>Destroy card</ActionBtn>
                                    <ActionBtn onClick={() => setSandboxAction({ type: 'steal', step: 'pick_card' })}>Steal card</ActionBtn>
                                    <ActionBtn onClick={() => setSandboxAction({ type: 'move_to_stable', step: 'pick_card' })}>Hand → Stable</ActionBtn>
                                    <ActionBtn onClick={() => setSandboxAction({ type: 'force_discard', playerID: targetPlayer })}>Force discard</ActionBtn>
                                </ButtonGrid>
                            ) : (
                                <ActionActiveBox>
                                    {sandboxAction.type === 'steal' && sandboxAction.step === 'pick_target' && (
                                        <>
                                            <ActionLabel>Steal "{cardName(G, sandboxAction.cardID)}" → move to:</ActionLabel>
                                            <ButtonGrid>
                                                {(["0", "1", "2"] as TargetPlayer[]).map(pid => (
                                                    <SmallCheatBtn key={pid} onClick={() => {
                                                        if (sandboxAction.type === 'steal' && sandboxAction.step === 'pick_target') {
                                                            moves.sandboxStealCard(sandboxAction.cardID, pid);
                                                        }
                                                        setSandboxAction(null);
                                                    }}>{PLAYER_LABELS[pid]}'s stable</SmallCheatBtn>
                                                ))}
                                            </ButtonGrid>
                                        </>
                                    )}
                                    {sandboxAction.type === 'move_to_stable' && sandboxAction.step === 'pick_stable' && (
                                        <>
                                            <ActionLabel>Place "{cardName(G, sandboxAction.cardID)}" into:</ActionLabel>
                                            <ButtonGrid>
                                                {(["0", "1", "2"] as TargetPlayer[]).map(pid => (
                                                    <SmallCheatBtn key={pid} onClick={() => {
                                                        if (sandboxAction.type === 'move_to_stable' && sandboxAction.step === 'pick_stable') {
                                                            moves.sandboxHandToStable(sandboxAction.cardID, pid);
                                                        }
                                                        setSandboxAction(null);
                                                    }}>{PLAYER_LABELS[pid]}'s stable</SmallCheatBtn>
                                                ))}
                                            </ButtonGrid>
                                        </>
                                    )}
                                    {sandboxAction.type === 'force_discard' && (
                                        <>
                                            <ActionLabel>Pick a card from {PLAYER_LABELS[sandboxAction.playerID as TargetPlayer]}'s hand to discard:</ActionLabel>
                                            <HandPickerList>
                                                {(G.zones.hand[sandboxAction.playerID] ?? []).map(cardID => {
                                                    const card = cardView(G, cardID);
                                                    return (
                                                        <ResultItem key={cardID} onClick={() => {
                                                            if (sandboxAction.type === 'force_discard') {
                                                                moves.sandboxForceDiscardCard(sandboxAction.playerID, cardID);
                                                            }
                                                            setSandboxAction(null);
                                                        }}>
                                                            <ResultThumb src={ImageLoader.load(card.image)} alt={card.title} />
                                                            <ResultInfo>
                                                                <ResultTitle>{card.title}</ResultTitle>
                                                                <ResultType>{typeLabel(card.type)}</ResultType>
                                                            </ResultInfo>
                                                        </ResultItem>
                                                    );
                                                })}
                                                {(G.zones.hand[sandboxAction.playerID] ?? []).length === 0 && (
                                                    <EmptyChips>Hand is empty</EmptyChips>
                                                )}
                                            </HandPickerList>
                                        </>
                                    )}
                                    {sandboxAction.type !== 'force_discard' &&
                                     !(sandboxAction.type === 'steal' && sandboxAction.step === 'pick_target') &&
                                     !(sandboxAction.type === 'move_to_stable' && sandboxAction.step === 'pick_stable') && (
                                        <ActionLabel>
                                            {sandboxAction.type === 'bounce' && 'Click a card in any stable on the board...'}
                                            {sandboxAction.type === 'destroy' && 'Click a card in any stable on the board...'}
                                            {sandboxAction.type === 'steal' && sandboxAction.step === 'pick_card' && 'Click a card in any stable on the board...'}
                                            {sandboxAction.type === 'move_to_stable' && sandboxAction.step === 'pick_card' && 'Click a card in your hand on the board...'}
                                        </ActionLabel>
                                    )}
                                    <CancelBtn onClick={() => setSandboxAction(null)}>Cancel</CancelBtn>
                                </ActionActiveBox>
                            )}
                        </Section>

                        {/* ── Card Search ── */}
                        <Section>
                            <SectionTitle>Add Card (Search)</SectionTitle>
                            <SearchInput
                                placeholder="Search cards…"
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setSelectedResult(null); }}
                            />

                            {/* Recent picks */}
                            {!searchQuery && recentPicks.length > 0 && (
                                <>
                                    <SmallLabel>Recent</SmallLabel>
                                    <ResultList>
                                        {recentPicks.map(id => {
                                            const def = getDef(id);
                                            return (
                                                <ResultItem key={id} onClick={() => setSelectedResult(def)}>
                                                    <ResultThumb src={ImageLoader.load(def.image)} alt={def.name} />
                                                    <ResultInfo>
                                                        <ResultTitle>{def.name}</ResultTitle>
                                                        <ResultType>{typeLabel(def.type)}</ResultType>
                                                    </ResultInfo>
                                                </ResultItem>
                                            );
                                        })}
                                    </ResultList>
                                </>
                            )}

                            {/* Search results */}
                            {searchResults.length > 0 && (
                                <ResultList>
                                    {searchResults.map(def => (
                                        <ResultItem key={def.id} onClick={() => setSelectedResult(def)}>
                                            <ResultThumb src={ImageLoader.load(def.image)} alt={def.name} />
                                            <ResultInfo>
                                                <ResultTitle>{def.name}</ResultTitle>
                                                <ResultType>{typeLabel(def.type)}</ResultType>
                                            </ResultInfo>
                                        </ResultItem>
                                    ))}
                                </ResultList>
                            )}

                            {/* Destination picker */}
                            {selectedResult && (
                                <DestPicker>
                                    <DestTitle>"{selectedResult.name}" → where?</DestTitle>
                                    <DestGrid>
                                        {(["0", "1", "2"] as TargetPlayer[]).map(pid => (
                                            <DestGroup key={pid}>
                                                <DestGroupLabel>{PLAYER_LABELS[pid]}</DestGroupLabel>
                                                <SmallCheatBtn onClick={() => dispatchToDestination(selectedResult.id, "hand", pid)}>Hand</SmallCheatBtn>
                                                <SmallCheatBtn onClick={() => dispatchToDestination(selectedResult.id, "stable_enter", pid)}>Stable (enter)</SmallCheatBtn>
                                                <SmallCheatBtn onClick={() => dispatchToDestination(selectedResult.id, "stable_silent", pid)}>Stable (silent)</SmallCheatBtn>
                                            </DestGroup>
                                        ))}
                                        <DestGroup>
                                            <DestGroupLabel>Zones</DestGroupLabel>
                                            <SmallCheatBtn onClick={() => dispatchToDestination(selectedResult.id, "discard", targetPlayer)}>Discard</SmallCheatBtn>
                                            <SmallCheatBtn onClick={() => dispatchToDestination(selectedResult.id, "deck_top", targetPlayer)}>Top of Deck</SmallCheatBtn>
                                            <SmallCheatBtn onClick={() => dispatchToDestination(selectedResult.id, "nursery", targetPlayer)}>Nursery</SmallCheatBtn>
                                        </DestGroup>
                                    </DestGrid>
                                    <CancelBtn onClick={() => setSelectedResult(null)}>Cancel</CancelBtn>
                                </DestPicker>
                            )}
                        </Section>

                        {/* ── Effects ── */}
                        <Section>
                            <SectionTitle>Continuous effects</SectionTitle>
                            {(["0", "1", "2"] as TargetPlayer[]).map(pid => {
                                const statics = activeStatics(G).filter(st => st.owner === pid);
                                return (
                                    <div key={pid} style={{ marginBottom: 8 }}>
                                        <SmallLabel>{PLAYER_LABELS[pid]}</SmallLabel>
                                        <EffectChips>
                                            {statics.map((st, idx) => (
                                                <EffectChip key={idx} title={cardName(G, st.card)}>
                                                    {st.rule.kind} · {cardName(G, st.card)}
                                                </EffectChip>
                                            ))}
                                            {statics.length === 0 && <EmptyChips>none</EmptyChips>}
                                        </EffectChips>
                                    </div>
                                );
                            })}
                            <InfoLine>Effects come from the cards in the stables: add or remove the card to change them.</InfoLine>
                        </Section>

                        {/* ── Flow ── */}
                        <Section>
                            <SectionTitle>Flow</SectionTitle>
                            <ButtonGrid>
                                <CheatBtn onClick={() => moves.forceAnswer()} disabled={G.prompts.length === 0} title="Answers the oldest open decision with its default (decline, pass or a random legal choice)">
                                    Answer open decision
                                </CheatBtn>
                                <DangerBtn onClick={() => moves.sandboxClearPending()} title="Drops everything that is resolving; cards being played go to the discard pile">
                                    Clear pending
                                </DangerBtn>
                            </ButtonGrid>
                            <InfoLine>Turn: {G.turn.number} (boardgame.io {ctx.turn}) | Current: {G.players.find(p => p.id === G.turn.player)?.name ?? G.turn.player}</InfoLine>
                            <InfoLine>Phase: {G.turn.phase} | played {G.turn.played}{G.turn.mustEnd ? ' | must end' : ''}</InfoLine>
                            <InfoLine>Open: {G.prompts.length} prompt(s), {G.chain.length} effect(s){G.round ? ', response round' : ''}</InfoLine>
                        </Section>

                        {/* ── Inspect ── */}
                        <Section>
                            <SectionTitle>Inspect</SectionTitle>
                            <CheatBtn onClick={() => setShowRawG(v => !v)}>
                                {showRawG ? 'Hide raw G' : 'Show raw G (JSON)'}
                            </CheatBtn>
                            {showRawG && (
                                <RawG>
                                    {JSON.stringify({
                                        hand: G.zones.hand,
                                        stable: G.zones.stable,
                                        pile: G.zones.pile,
                                        turn: G.turn,
                                        prompts: G.prompts,
                                        chain: G.chain,
                                        round: G.round,
                                        deck: G.zones.deck.length + ' cards',
                                        discard: G.zones.discard.length + ' cards',
                                    }, null, 2)}
                                </RawG>
                            )}
                        </Section>

                        {/* ── Save / Load ── */}
                        <Section>
                            <SectionTitle>Save / Load</SectionTitle>
                            <ButtonGrid>
                                <CheatBtn onClick={copyToClipboard}>Copy state</CheatBtn>
                                <CheatBtn onClick={pasteFromClipboard}>Paste state</CheatBtn>
                            </ButtonGrid>
                            {(['A', 'B', 'C'] as const).map((label, i) => (
                                <SlotRow key={label}>
                                    <SlotLabel>Slot {label}</SlotLabel>
                                    <SmallCheatBtn onClick={() => saveSlot(i)}>Save</SmallCheatBtn>
                                    <SmallCheatBtn onClick={() => loadSlot(i)} disabled={!slots[i]}>Load</SmallCheatBtn>
                                    <SmallCheatBtn onClick={() => clearSlot(i)} disabled={!slots[i]}>Clear</SmallCheatBtn>
                                </SlotRow>
                            ))}
                        </Section>
                    </DrawerBody>
                </Drawer>
            )}
        </>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const ToggleButton = styled.button`
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1001;
    background: #2a1a4e;
    color: #fff;
    border: 1px solid #7c4dff;
    border-right: none;
    border-radius: 6px 0 0 6px;
    padding: 8px 6px;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    transition: background 0.15s;
    &:hover { background: #3d2970; }
`;

const Drawer = styled.div`
    position: fixed;
    right: 0;
    top: 0;
    height: 100vh;
    width: 300px;
    background: #1a0f35;
    border-left: 2px solid #7c4dff;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    @media (pointer: coarse) {
        width: 33vw;
        height: 100vh;
        top: 0;
        bottom: auto;
        border-left: 2px solid #7c4dff;
        border-top: none;
    }
`;

const DrawerHeader = styled.div`
    padding: 10px 14px;
    border-bottom: 1px solid #3d2970;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

const DrawerTitle = styled.span`
    color: #c084fc;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    flex: 1;
`;

const SkipToggle = styled.button<{ active: boolean }>`
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 10px;
    border: 1px solid ${p => p.active ? '#6BCB77' : '#555'};
    background: ${p => p.active ? '#1a3a1e' : '#2a1a4e'};
    color: ${p => p.active ? '#6BCB77' : '#888'};
    cursor: pointer;
    transition: all 0.15s;
`;

const PlayerPills = styled.div`
    display: flex;
    gap: 4px;
    padding: 8px 14px;
    border-bottom: 1px solid #2a1a4e;
    flex-shrink: 0;
`;

const PlayerPill = styled.button<{ active: boolean }>`
    flex: 1;
    padding: 4px 0;
    border-radius: 12px;
    border: 1px solid ${p => p.active ? '#7c4dff' : '#3d2970'};
    background: ${p => p.active ? '#3d2970' : 'transparent'};
    color: ${p => p.active ? '#e0d0ff' : '#7060a0'};
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s;
`;

const DrawerBody = styled.div`
    flex: 1;
    overflow-y: auto;
    padding-bottom: 16px;
    @media (pointer: coarse) {
        font-size: 10px;
    }
`;

const Section = styled.div`
    padding: 10px 14px 12px;
    border-bottom: 1px solid #2a1a4e;
`;

const SectionTitle = styled.div`
    color: #9d7fe0;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 8px;
`;

const SmallLabel = styled.div`
    color: #6040a0;
    font-size: 10px;
    margin-bottom: 4px;
`;

const ButtonGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    @media (pointer: coarse) {
        grid-template-columns: 1fr;
    }
`;

const baseBtn = `
    border-radius: 5px;
    padding: 5px 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
    transition: all 0.12s;
    border: 1px solid;
    font-family: inherit;
    line-height: 1.3;
`;

const CheatBtn = styled.button`
    ${baseBtn}
    background: #2a1a4e;
    color: #c9b8f0;
    border-color: #4a3570;
    &:hover { background: #3d2970; border-color: #7c4dff; }
    &:disabled { opacity: 0.4; cursor: default; }
`;

const SmallCheatBtn = styled(CheatBtn)`
    padding: 3px 6px;
    font-size: 10px;
`;

const DangerBtn = styled.button`
    ${baseBtn}
    background: #3a1a1a;
    color: #ff8080;
    border-color: #6a2a2a;
    &:hover { background: #5a2020; }
`;

const CancelBtn = styled.button`
    ${baseBtn}
    background: transparent;
    color: #7060a0;
    border-color: #4a3570;
    margin-top: 6px;
    width: 100%;
    &:hover { color: #ccc; }
`;

const SearchInput = styled.input`
    width: 100%;
    box-sizing: border-box;
    background: #12092a;
    border: 1px solid #4a3570;
    border-radius: 5px;
    color: #e0d0ff;
    font-size: 12px;
    padding: 5px 8px;
    margin-bottom: 6px;
    outline: none;
    &:focus { border-color: #7c4dff; }
`;

const ResultList = styled.div`
    max-height: 180px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const ResultItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
    background: #12092a;
    border: 1px solid transparent;
    &:hover { border-color: #7c4dff; background: #2a1a4e; }
`;

const ResultThumb = styled.img`
    width: 28px;
    height: 40px;
    object-fit: cover;
    border-radius: 3px;
    flex-shrink: 0;
`;

const ResultInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const ResultTitle = styled.div`
    color: #e0d0ff;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const ResultType = styled.div`
    color: #7060a0;
    font-size: 10px;
`;

const DestPicker = styled.div`
    background: #12092a;
    border: 1px solid #7c4dff;
    border-radius: 6px;
    padding: 10px;
    margin-top: 6px;
`;

const DestTitle = styled.div`
    color: #c084fc;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 8px;
`;

const DestGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
`;

const DestGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const DestGroupLabel = styled.div`
    color: #6040a0;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 2px;
`;

const EffectChips = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 6px;
`;

const EffectChip = styled.span`
    background: #2a1a4e;
    border: 1px solid #4a3570;
    border-radius: 10px;
    color: #c084fc;
    font-size: 10px;
    padding: 2px 6px;
    display: flex;
    align-items: center;
    gap: 4px;
`;

const EmptyChips = styled.span`
    color: #4a3570;
    font-size: 10px;
    font-style: italic;
`;

const InfoLine = styled.div`
    color: #6040a0;
    font-size: 10px;
    margin-top: 4px;
`;

const RawG = styled.pre`
    background: #080415;
    border: 1px solid #3a2060;
    border-radius: 5px;
    color: #9070c0;
    font-size: 9px;
    padding: 8px;
    overflow: auto;
    max-height: 200px;
    margin-top: 6px;
    white-space: pre-wrap;
    word-break: break-all;
`;

const SlotRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 5px;
`;

const SlotLabel = styled.span`
    color: #7060a0;
    font-size: 11px;
    width: 44px;
    flex-shrink: 0;
`;

const SettingRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
`;

const SettingLabel = styled.span`
    color: #c9b8f0;
    font-size: 11px;
`;

const ToggleSwitch = styled.button<{ active: boolean }>`
    width: 36px;
    height: 20px;
    border-radius: 10px;
    border: 1px solid ${p => p.active ? '#6BCB77' : '#4a3570'};
    background: ${p => p.active ? '#1a3a1e' : '#2a1a4e'};
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
    transition: all 0.15s;
    &::after {
        content: '';
        position: absolute;
        top: 3px;
        left: ${p => p.active ? '17px' : '3px'};
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${p => p.active ? '#6BCB77' : '#7060a0'};
        transition: left 0.15s;
    }
`;

const ActionBtn = styled(CheatBtn)`
    background: #1a2a4e;
    border-color: #3a5a8a;
    color: #90c0ff;
    &:hover { background: #253a6a; border-color: #5080cc; }
`;

const ActionActiveBox = styled.div`
    background: #12092a;
    border: 1px solid #7c4dff;
    border-radius: 6px;
    padding: 10px;
`;

const ActionLabel = styled.div`
    color: #c084fc;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 8px;
`;

const HandPickerList = styled.div`
    max-height: 200px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 8px;
`;

export default SandboxPanel;
