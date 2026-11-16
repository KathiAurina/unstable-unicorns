// Rule options (expansion-plan.md 5.10, rules.md section 7).
//
// Every decided rule change is a named option. They are read only inside engine/ — card definitions
// never look at them. Two presets are planned: LEGACY (the behaviour of the game before the engine
// rewrite) and STANDARD (the decided rules, stage 4).
//
// Implemented for both values today: blindingBeatsMasquerade, winThreshold, masqueradeScope, tinyStable,
// winCheck, stableLimit, playUnicornIntoAnyStable, destroyOwnStable, yayCoversInstants,
// blindingRestoresEffects, barbedWireOnMaskedLeave, multiTarget, revealSearch, cardVariants.
// Only the legacy value is implemented so far: superNeigh, playRequirement, targetsBeforeVoting,
// twoPlayerRules (stages 4 and 5).

export interface RuleOptions {
    /** R1 — Blinding has priority over masquerade. Legacy: masquerade wins, unicorns keep their abilities. */
    blindingBeatsMasquerade: boolean;
    /** R2 — Unicorns needed to win. */
    winThreshold: 'byPlayerCount' | 7;
    /** R3 — What a Super Neigh does to the voting. */
    superNeigh: 'cancelsTarget' | 'endsDiscussion';
    /** R4 — Which effects cannot touch masked unicorns (Pandas). */
    masqueradeScope: 'unicornFilters' | 'legacy';
    /** R5 — When Tiny Stable is checked. */
    tinyStable: 'continuous' | 'onEnter';
    /** R7 — When a win is detected. */
    winCheck: 'whenResolved' | 'everyMove';
    /** R8 — A stable holding this many Unicorn cards accepts no further card. */
    stableLimit: number | null;
    /** R9 */
    playUnicornIntoAnyStable: boolean;
    /** R10 — A card can only be played if its first required action is possible. */
    playRequirement: boolean;
    /** R11 — Destroy may target the acting player's own stable. */
    destroyOwnStable: boolean;
    /** R12 — Yay also protects the owner's Instant cards. */
    yayCoversInstants: boolean;
    /** R13 — Continuous effects of a unicorn that entered while blinded become active when the blinding ends. */
    blindingRestoresEffects: boolean;
    /** R14 — "Each time a Unicorn card leaves" also fires for a masked unicorn. */
    barbedWireOnMaskedLeave: boolean;
    /** R15 — Several targets of one step: chosen together, or chosen and applied one after another. */
    multiTarget: 'atOnce' | 'sequential';
    /** R16 — A card found by searching the deck is shown to everyone. */
    revealSearch: boolean;
    /** R18 — Destination and first targets are named before the voting. */
    targetsBeforeVoting: boolean;
    /** R19 */
    twoPlayerRules: boolean;
    /** R6, R17 — definition ids that use their `@legacy` variant. */
    cardVariants: Record<string, 'legacy'>;
}

/** The behaviour of the game before the engine rewrite (rules.md sections 1–5). */
export const LEGACY_RULES: RuleOptions = {
    blindingBeatsMasquerade: false,
    winThreshold: 7,
    superNeigh: 'endsDiscussion',
    masqueradeScope: 'legacy',
    tinyStable: 'onEnter',
    winCheck: 'everyMove',
    stableLimit: 7,
    playUnicornIntoAnyStable: false,
    playRequirement: false,
    destroyOwnStable: true,
    yayCoversInstants: false,
    blindingRestoresEffects: false,
    barbedWireOnMaskedLeave: true,
    multiTarget: 'sequential',
    revealSearch: false,
    targetsBeforeVoting: false,
    twoPlayerRules: false,
    cardVariants: { mermaid_unicorn: 'legacy', zombie_unicorn: 'legacy' },
};

export type RulePreset = 'legacy';

export const RULE_PRESETS: Record<RulePreset, RuleOptions> = {
    legacy: LEGACY_RULES,
};

export interface GameOptions {
    /** Resolved set ids: one base set plus expansions. */
    sets: string[];
    preset: RulePreset;
    rules: RuleOptions;
}

export const HAND_SIZE_AT_START = 5;
export const BASE_HAND_LIMIT = 7;
