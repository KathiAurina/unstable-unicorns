import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import type { UnstableUnicornsGame, Ctx } from '../game/state';
import type { Moves } from '../game/types';
import { Cards, hasType } from '../game/card';
import type { CardDefinition } from '../game/card';
import { CONSTANTS } from '../game/constants';
import { KNOWN_EFFECTS } from '../game/effect';
import type { Effect } from '../game/effect';
import ImageLoader from '../assets/card/imageLoader';
import { serializeSandboxSnapshot } from '../game/sandbox/sandboxMoves';
import { useSandboxControl } from './sandboxContext';

type Props = {
    G: UnstableUnicornsGame;
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
const LS_RECENT = "sandbox_recentPicks";
const LS_SLOTS = "sandbox_slots";

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
    const [searchResults, setSearchResults] = useState<{ def: CardDefinition; defIndex: number }[]>([]);
    const [selectedResult, setSelectedResult] = useState<{ def: CardDefinition; defIndex: number } | null>(null);
    const [recentPicks, setRecentPicks] = useState<number[]>(() => loadJSON(LS_RECENT, []));

    // Effects
    const [selectedEffect, setSelectedEffect] = useState<Effect["key"]>(KNOWN_EFFECTS[0]);

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
    useEffect(() => {
        if (!autoSkipRef.current) return;
        if (ctx.currentPlayer === playerID) return;
        if (playerID !== G.owner) return; // only owner panel drives auto-skip
        if (G.neighDiscussion) return;
        const pendingScenes = G.script?.scenes?.filter(s =>
            s.actions.some(a => a.instructions.some(i => i.protagonist === ctx.currentPlayer && (i.state === "open" || i.state === "in_progress")))
        );
        if (pendingScenes && pendingScenes.length > 0) return;
        const timer = setTimeout(() => {
            if (autoSkipRef.current && ctx.currentPlayer !== playerID) {
                moves.sandboxForceEndTurn();
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [ctx.currentPlayer, ctx.turn, G.neighDiscussion, G.script]);

    // Belt-and-braces: auto-resolve any neigh discussion that sneaks through when skipNeigh is on
    useEffect(() => {
        if (playerID !== G.owner) return; // only owner panel resolves neigh
        if (!G.neighDiscussion) return;
        if (!G.sandboxSettings?.skipNeigh) return;
        moves.sandboxResolveNeighAsPlayed();
    }, [G.neighDiscussion]);

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
        const results: { def: CardDefinition; defIndex: number }[] = [];
        const seen = new Set<string>();
        Cards.forEach((def, idx) => {
            if (seen.has(def.title)) return;
            if (fuzzyMatch(searchQuery, def.title) || fuzzyMatch(searchQuery, Array.isArray(def.type) ? def.type.join(' ') : def.type)) {
                seen.add(def.title);
                results.push({ def, defIndex: idx });
            }
        });
        setSearchResults(results.slice(0, 12));
    }, [searchQuery]);

    const addRecentPick = useCallback((defIndex: number) => {
        setRecentPicks(prev => {
            const next = [defIndex, ...prev.filter(i => i !== defIndex)].slice(0, 8);
            saveJSON(LS_RECENT, next);
            return next;
        });
    }, []);

    // Quick-action helpers
    const randomDefOf = (filter: (d: CardDefinition) => boolean): number | null => {
        const candidates = Cards.reduce<number[]>((acc, d, i) => { if (filter(d)) acc.push(i); return acc; }, []);
        if (!candidates.length) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    };

    const drawToHandSize = (pid: string) => {
        const count = Math.max(0, CONSTANTS.numberOfHandCardsAtStart - G.hand[pid].length);
        if (count > 0) moves.sandboxDraw(pid, count);
    };

    // Destination picker for search results
    type Dest = "hand" | "stable_enter" | "stable_silent" | "discard" | "deck_top" | "nursery";
    const dispatchToDestination = (defIndex: number, dest: Dest, pid: TargetPlayer) => {
        addRecentPick(defIndex);
        switch (dest) {
            case "hand": moves.sandboxAddToHand(pid, defIndex); break;
            case "stable_enter": moves.sandboxAddToStable(pid, defIndex, true); break;
            case "stable_silent": moves.sandboxAddToStable(pid, defIndex, false); break;
            case "discard": moves.sandboxAddToDiscard(defIndex); break;
            case "deck_top": moves.sandboxAddToDeckTop(defIndex); break;
            case "nursery": moves.sandboxAddToNursery(defIndex); break;
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
                                    const i = randomDefOf(d => hasType({ type: d.type }, 'basic'));
                                    if (i != null) moves.sandboxAddToStable(targetPlayer, i, false);
                                }}>+ Basic Unicorn (silent)</CheatBtn>
                                <CheatBtn onClick={() => {
                                    const i = randomDefOf(d => hasType({ type: d.type }, 'unicorn') && !hasType({ type: d.type }, 'baby'));
                                    if (i != null) moves.sandboxAddToStable(targetPlayer, i, false);
                                }}>+ Magical Unicorn (silent)</CheatBtn>
                                <CheatBtn onClick={() => {
                                    const i = randomDefOf(d => hasType({ type: d.type }, 'unicorn') && !hasType({ type: d.type }, 'baby'));
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
                                            <ActionLabel>Steal "{G.deck[sandboxAction.cardID]?.title}" → move to:</ActionLabel>
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
                                            <ActionLabel>Place "{G.deck[sandboxAction.cardID]?.title}" into:</ActionLabel>
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
                                                {G.hand[sandboxAction.playerID]?.map(cardID => {
                                                    const card = G.deck[cardID];
                                                    if (!card) return null;
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
                                                                <ResultType>{Array.isArray(card.type) ? card.type.join(', ') : card.type}</ResultType>
                                                            </ResultInfo>
                                                        </ResultItem>
                                                    );
                                                })}
                                                {(!G.hand[sandboxAction.playerID] || G.hand[sandboxAction.playerID].length === 0) && (
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
                                        {recentPicks.map(idx => {
                                            const def = Cards[idx];
                                            if (!def) return null;
                                            return (
                                                <ResultItem key={idx} onClick={() => setSelectedResult({ def, defIndex: idx })}>
                                                    <ResultThumb src={ImageLoader.load(def.image)} alt={def.title} />
                                                    <ResultInfo>
                                                        <ResultTitle>{def.title}</ResultTitle>
                                                        <ResultType>{Array.isArray(def.type) ? def.type.join(', ') : def.type}</ResultType>
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
                                    {searchResults.map(({ def, defIndex }) => (
                                        <ResultItem key={defIndex} onClick={() => setSelectedResult({ def, defIndex })}>
                                            <ResultThumb src={ImageLoader.load(def.image)} alt={def.title} />
                                            <ResultInfo>
                                                <ResultTitle>{def.title}</ResultTitle>
                                                <ResultType>{Array.isArray(def.type) ? def.type.join(', ') : def.type}</ResultType>
                                            </ResultInfo>
                                        </ResultItem>
                                    ))}
                                </ResultList>
                            )}

                            {/* Destination picker */}
                            {selectedResult && (
                                <DestPicker>
                                    <DestTitle>"{selectedResult.def.title}" → where?</DestTitle>
                                    <DestGrid>
                                        {(["0", "1", "2"] as TargetPlayer[]).map(pid => (
                                            <DestGroup key={pid}>
                                                <DestGroupLabel>{PLAYER_LABELS[pid]}</DestGroupLabel>
                                                <SmallCheatBtn onClick={() => dispatchToDestination(selectedResult.defIndex, "hand", pid)}>Hand</SmallCheatBtn>
                                                <SmallCheatBtn onClick={() => dispatchToDestination(selectedResult.defIndex, "stable_enter", pid)}>Stable (enter)</SmallCheatBtn>
                                                <SmallCheatBtn onClick={() => dispatchToDestination(selectedResult.defIndex, "stable_silent", pid)}>Stable (silent)</SmallCheatBtn>
                                            </DestGroup>
                                        ))}
                                        <DestGroup>
                                            <DestGroupLabel>Zones</DestGroupLabel>
                                            <SmallCheatBtn onClick={() => dispatchToDestination(selectedResult.defIndex, "discard", targetPlayer)}>Discard</SmallCheatBtn>
                                            <SmallCheatBtn onClick={() => dispatchToDestination(selectedResult.defIndex, "deck_top", targetPlayer)}>Top of Deck</SmallCheatBtn>
                                            <SmallCheatBtn onClick={() => dispatchToDestination(selectedResult.defIndex, "nursery", targetPlayer)}>Nursery</SmallCheatBtn>
                                        </DestGroup>
                                    </DestGrid>
                                    <CancelBtn onClick={() => setSelectedResult(null)}>Cancel</CancelBtn>
                                </DestPicker>
                            )}
                        </Section>

                        {/* ── Effects ── */}
                        <Section>
                            <SectionTitle>Effects</SectionTitle>
                            {(["0", "1", "2"] as TargetPlayer[]).map(pid => (
                                <div key={pid} style={{ marginBottom: 8 }}>
                                    <SmallLabel>{PLAYER_LABELS[pid]}</SmallLabel>
                                    <EffectChips>
                                        {G.playerEffects[pid]?.map((e, idx) => (
                                            <EffectChip key={idx}>
                                                {e.effect.key}
                                                <ChipRemove onClick={() => moves.sandboxRemoveEffect(pid, idx)}>✕</ChipRemove>
                                            </EffectChip>
                                        ))}
                                        {(!G.playerEffects[pid] || G.playerEffects[pid].length === 0) && (
                                            <EmptyChips>none</EmptyChips>
                                        )}
                                    </EffectChips>
                                </div>
                            ))}
                            <EffectAddRow>
                                <EffectSelect value={selectedEffect} onChange={e => setSelectedEffect(e.target.value as Effect["key"])}>
                                    {KNOWN_EFFECTS.map(k => <option key={k} value={k}>{k}</option>)}
                                </EffectSelect>
                                <SmallCheatBtn onClick={() => moves.sandboxAddEffect(targetPlayer, selectedEffect)}>
                                    Add to {PLAYER_LABELS[targetPlayer]}
                                </SmallCheatBtn>
                            </EffectAddRow>
                            <DangerBtn onClick={() => moves.sandboxClearAllEffects()} style={{ marginTop: 6 }}>
                                Clear all effects
                            </DangerBtn>
                        </Section>

                        {/* ── Flow ── */}
                        <Section>
                            <SectionTitle>Flow</SectionTitle>
                            <ButtonGrid>
                                <CheatBtn onClick={() => moves.sandboxCancelNeigh()}>Cancel Neigh</CheatBtn>
                                <DangerBtn onClick={() => moves.sandboxClearSceneQueue()} title="May strand cards mid-resolution">
                                    Clear scene queue
                                </DangerBtn>
                            </ButtonGrid>
                            <InfoLine>Turn: {ctx.turn} | Current: {G.players[parseInt(ctx.currentPlayer)]?.name ?? ctx.currentPlayer}</InfoLine>
                            <InfoLine>Stage: {ctx.activePlayers ? Object.values(ctx.activePlayers)[0] ?? '—' : '—'}</InfoLine>
                            <InfoLine>Scenes: {G.script?.scenes?.length ?? 0}</InfoLine>
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
                                        hand: G.hand,
                                        stable: G.stable,
                                        upgradeDowngradeStable: G.upgradeDowngradeStable,
                                        playerEffects: G.playerEffects,
                                        script: G.script,
                                        neighDiscussion: G.neighDiscussion,
                                        drawPile: G.drawPile.length + ' cards',
                                        discardPile: G.discardPile.length + ' cards',
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

const ChipRemove = styled.button`
    background: none;
    border: none;
    color: #ff8080;
    cursor: pointer;
    padding: 0;
    font-size: 10px;
    line-height: 1;
`;

const EmptyChips = styled.span`
    color: #4a3570;
    font-size: 10px;
    font-style: italic;
`;

const EffectAddRow = styled.div`
    display: flex;
    gap: 4px;
    align-items: center;
    flex-wrap: wrap;
`;

const EffectSelect = styled.select`
    flex: 1;
    min-width: 0;
    background: #12092a;
    border: 1px solid #4a3570;
    border-radius: 5px;
    color: #c9b8f0;
    font-size: 10px;
    padding: 3px 5px;
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
