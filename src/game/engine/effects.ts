// The effect interpreter (expansion-plan.md 5.3, 5.4).
//
// `runLink` walks the effect tree of the top link. Every node keeps its progress in `link.mem`, keyed
// by its path in the tree, so the walk can stop at any player decision (a prompt) and be repeated
// later: finished nodes return their stored result, the waiting node continues with the answer.
//
// A step that cannot be performed is skipped and logged ("no legal target") — the impossible-action
// rule. `then` and `ifYouDo` see that their first part did not happen.

import type { CardFilter, Condition, Count, Effect, Step, Verb } from '../cards/types';
import type {
    Answer, Candidate, CardID, EngineEffect, GameState, Link, NodeMem, PlayerID, Prompt, Reason, Rng,
} from './state';
import { playersFrom } from './state';
import { pushLog } from './log';
import { addPrompt, cardCandidate } from './prompt';
import { effectOf, topLink } from './chain';
import { describeEffect, sentence } from './describe';
import { drawCards, moveCard, shuffleDiscardIntoDeck } from './events';
import type { Cause } from './events';
import {
    canBeAffected, canEnter, hiddenByMask, locate, matchesFilter, stableOwner,
} from './rules';

export interface Run {
    G: GameState;
    rng: Rng;
    L: Link;
}

export type Result = 'suspend' | { performed: boolean; declined?: boolean };

interface Env {
    /** The player this branch of the effect is about ("you" on the card; changes inside forEach). */
    you: PlayerID;
    /** Set while a "you may" rides on the next prompt of this branch: that prompt gets a Skip. */
    opt?: boolean;
    /** The outer "you may" of this link was already accepted by a free action. Only seen by the root node. */
    pre?: boolean;
    role?: 'cost' | 'effect';
    preview?: string[];
}

const ROOT = 'r';

// ─── Scope: what candidate searches need ──────────────────────────────────────

interface Scope {
    G: GameState;
    /** The card whose ability is resolving. */
    source?: CardID;
    vars: Link['vars'];
}

function scopeOf(run: Run): Scope {
    return { G: run.G, source: run.L.source?.card, vars: run.L.vars };
}

// ─── Candidates ───────────────────────────────────────────────────────────────

interface Options {
    ok: Candidate[];
    disabled: { candidate: Candidate; reason: Reason }[];
}

/** Stable cards of the given players that match the filter, split into legal picks and blocked ones. */
function stableOptions(
    s: Scope, players: PlayerID[], verb: Verb, filter: CardFilter | undefined,
    extra?: (card: CardID, owner: PlayerID) => Reason | undefined,
): Options {
    const out: Options = { ok: [], disabled: [] };
    players.forEach(owner => {
        s.G.zones.stable[owner].forEach(card => {
            if (!matchesFilter(s.G, card, filter)) return;
            const candidate = cardCandidate(card, 'stable', owner);
            if (hiddenByMask(s.G, card, verb, filter)) {
                out.disabled.push({ candidate, reason: { rule: 'masquerade' } });
                return;
            }
            const verdict = canBeAffected(s.G, card, verb, s.source);
            if (!verdict.ok) { out.disabled.push({ candidate, reason: verdict.reason }); return; }
            const blocked = extra?.(card, owner);
            if (blocked) { out.disabled.push({ candidate, reason: blocked }); return; }
            out.ok.push(candidate);
        });
    });
    return out;
}

function zoneOptions(s: Scope, cards: CardID[], zone: 'hand' | 'discard' | 'nursery' | 'deck', owner: PlayerID | undefined,
    filter: CardFilter | undefined, extra?: (card: CardID) => Reason | undefined): Options {
    const out: Options = { ok: [], disabled: [] };
    cards.forEach(card => {
        if (!matchesFilter(s.G, card, filter)) return;
        const candidate = cardCandidate(card, zone, owner);
        const blocked = extra?.(card);
        if (blocked) out.disabled.push({ candidate, reason: blocked });
        else out.ok.push(candidate);
    });
    return out;
}

const others = (G: GameState, you: PlayerID): PlayerID[] => G.players.map(p => p.id).filter(p => p !== you);
const everyone = (G: GameState): PlayerID[] => G.players.map(p => p.id);

function entryBlock(G: GameState, card: CardID, player: PlayerID): Reason | undefined {
    const verdict = canEnter(G, card, player);
    return verdict.ok ? undefined : verdict.reason;
}

/** Players into whose stable `you` may move `card` (never your own, never where it already is). */
function moveDestinations(G: GameState, card: CardID, you: PlayerID): PlayerID[] {
    const owner = stableOwner(G, card);
    return everyone(G).filter(p => p !== you && p !== owner && canEnter(G, card, p).ok);
}

/** The cards a card-choosing step may pick for player `you`. */
function stepOptions(s: Scope, node: Step, you: PlayerID): Options {
    const G = s.G;
    switch (node.op) {
        case 'discard':
            return zoneOptions(s, G.zones.hand[you], 'hand', you, node.filter);
        case 'sacrifice':
            return stableOptions(s, [you], 'sacrifice', node.filter);
        case 'destroy':
            return stableOptions(s, G.options.rules.destroyOwnStable ? everyone(G) : others(G, you), 'destroy', node.filter);
        case 'steal':
            return stableOptions(s, others(G, you), 'steal', node.filter, card => entryBlock(G, card, you));
        case 'returnToHand':
            return stableOptions(s, node.from === 'others' ? others(G, you) : everyone(G), 'return', node.filter);
        case 'move':
            return stableOptions(s, node.from === 'yours' ? [you] : everyone(G), 'move', node.filter,
                card => (moveDestinations(G, card, you).length > 0 ? undefined : { rule: 'noDestination' }));
        case 'bring': {
            if (node.cards) {
                const bound = s.vars[node.cards.ref]?.cards ?? [];
                const inZone = bound.filter(c => {
                    const at = locate(G, c);
                    return at?.zone === node.from && (node.from !== 'hand' || at.player === you);
                });
                return zoneOptions(s, inZone, node.from, node.from === 'hand' ? you : undefined, node.filter, card => entryBlock(G, card, you));
            }
            const cards = node.from === 'hand' ? G.zones.hand[you] : node.from === 'discard' ? G.zones.discard : G.zones.nursery;
            return zoneOptions(s, cards, node.from, node.from === 'hand' ? you : undefined, node.filter, card => entryBlock(G, card, you));
        }
        case 'addToHand':
            return zoneOptions(s, G.zones.discard, 'discard', undefined, node.filter);
        case 'search':
            return zoneOptions(s, G.zones.deck, 'deck', undefined, node.filter);
        default:
            return { ok: [], disabled: [] };
    }
}

// ─── Possibility ──────────────────────────────────────────────────────────────

/**
 * Can anything of this effect be performed by `you` right now?
 * `strict`: a counted step needs its full count (a cost of an optional ability must be payable in full);
 * otherwise one legal target is enough (a mandatory effect does as much as it can).
 */
function possible(s: Scope, effect: EngineEffect, you: PlayerID, strict: boolean): boolean {
    const G = s.G;
    const enough = (count: Count, available: number): boolean =>
        count === 'all' ? true : available >= (strict ? count : 1);

    switch (effect.op) {
        case 'all': return effect.parts.some(p => possible(s, p, you, strict));
        case 'then':
        case 'ifYouDo': return possible(s, effect.first, you, strict);
        case 'may': return possible(s, effect.effect, you, true);
        case 'oneOf': return effect.modes.some(m => possible(s, m, you, true));
        case 'forEach': {
            if (effect.players === 'each') return everyone(G).some(p => possible(s, effect.effect, p, strict));
            if (effect.players === 'eachOther') return others(G, you).some(p => possible(s, effect.effect, p, strict));
            if (effect.players === 'chosenOther') return others(G, you).some(p => possible(s, effect.effect, p, false));
            return true;
        }
        case 'when': return true;
        case 'draw': return G.zones.deck.length + G.zones.discard.length > 0;
        case 'discard':
        case 'sacrifice': return enough(effect.count, stepOptions(s, effect, you).ok.length);
        case 'destroy':
        case 'steal':
        case 'returnToHand': return enough(effect.count, stepOptions(s, effect, you).ok.length);
        case 'move':
        case 'search': return stepOptions(s, effect, you).ok.length > 0;
        case 'bring': return effect.cards ? true : stepOptions(s, effect, you).ok.length > 0;
        case 'addToHand':
            if (effect.self) return s.source !== undefined && G.zones.discard.includes(s.source);
            return stepOptions(s, effect, you).ok.length > 0;
        case 'takeFromHand': return others(G, you).some(p => G.zones.hand[p].length > 0);
        case 'tradeHands': return others(G, you).length > 0;
        case 'shuffleIntoDeck':
        case 'turn':
        case '$enterPlayed': return true;
    }
}

/** Could this ability do anything if its controller used it now? Used for begin-of-turn abilities. */
export function abilityPossible(G: GameState, card: CardID, effect: Effect, controller: PlayerID): boolean {
    return possible({ G, source: card, vars: {} }, effect, controller, true);
}

/**
 * Does the effect start with a choice of its controller among things everyone can see?
 * Then "you may" needs no separate yes/no question: the choice itself gets a Skip.
 * Effects that start by revealing hidden information or without any choice are confirmed first.
 */
function startsWithOpenChoice(effect: EngineEffect): boolean {
    switch (effect.op) {
        case 'all': return effect.parts.length > 0 && startsWithOpenChoice(effect.parts[0]);
        case 'then':
        case 'ifYouDo': return startsWithOpenChoice(effect.first);
        case 'oneOf': return true;
        case 'forEach': return effect.players === 'chosenOther';
        case 'discard':
        case 'sacrifice': return effect.count !== 'all';
        case 'destroy':
        case 'steal':
        case 'returnToHand':
        case 'move':
        case 'takeFromHand':
        case 'tradeHands': return true;
        case 'bring': return !effect.cards;
        case 'addToHand': return !effect.self;
        default: return false;
    }
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function memOf(run: Run, path: string): NodeMem {
    let m = run.L.mem[path];
    if (!m) { m = {}; run.L.mem[path] = m; }
    return m;
}

function finish(run: Run, path: string, performed: boolean, declined?: boolean): Result {
    const r = declined ? { performed, declined } : { performed };
    memOf(run, path).r = r;
    return r;
}

/** Is this link still the top of the chain? If not, a triggered ability was pushed and resolves first. */
function onTop(run: Run): boolean {
    return topLink(run.G)?.id === run.L.id;
}

/** Environment for a child node: optionality and pre-acceptance do not carry over unless stated. */
function childEnv(env: Env, extra: Partial<Env> = {}): Env {
    return { you: env.you, role: env.role, preview: env.preview, ...extra };
}

type PromptSpec = Pick<Prompt, 'kind' | 'verb' | 'title' | 'min' | 'max' | 'candidates'> &
    Partial<Pick<Prompt, 'disabled' | 'privateCards'>> & { optional: boolean; player: PlayerID };

/** Opens a prompt for this node (once) and suspends. */
function ask(run: Run, path: string, env: Env, spec: PromptSpec): 'suspend' {
    const m = memOf(run, path);
    if (m.prompt === undefined) {
        const L = run.L;
        const prompt = addPrompt(run.G, {
            ...spec,
            title: sentence(spec.title),
            source: L.source ? { card: L.source.card, ability: L.source.ability, controller: L.controller } : undefined,
            rule: L.rule,
            role: env.role,
            preview: env.preview,
            cause: L.parentLog,
            link: L.id,
            path,
        });
        m.prompt = prompt.id;
    }
    return 'suspend';
}

/** Takes the answer of this node's prompt, if it has arrived. */
function takeAnswer(run: Run, path: string): Answer | undefined {
    const m = memOf(run, path);
    if (m.prompt === undefined || m.answer === undefined) return undefined;
    const answer = m.answer;
    delete m.answer;
    delete m.prompt;
    return answer;
}

function sourceRef(run: Run): { card: CardID; ability?: number } | undefined {
    return run.L.source ? { card: run.L.source.card, ability: run.L.source.ability } : undefined;
}

function logFizzle(run: Run, env: Env, verb: Verb, rule: string): void {
    pushLog(run.G, {
        kind: 'info', verb, actor: env.you, source: sourceRef(run), parent: run.L.parentLog,
        role: env.role, outcome: 'fizzled', reason: { rule },
    });
}

function logDeclined(run: Run, env: Env, verb: Verb): void {
    pushLog(run.G, {
        kind: 'decision', verb, actor: env.you, source: sourceRef(run), parent: run.L.parentLog, outcome: 'declined',
    });
}

function bind(run: Run, name: string | undefined, cards: CardID[], players: PlayerID[]): void {
    if (!name) return;
    run.L.vars[name] = { cards: [...cards], players: Array.from(new Set(players)) };
}

const VERB_OF: Partial<Record<EngineEffect['op'], Verb>> = {
    draw: 'draw', discard: 'discard', sacrifice: 'sacrifice', destroy: 'destroy', steal: 'steal',
    returnToHand: 'return', move: 'move', bring: 'bring', addToHand: 'add', search: 'search',
    tradeHands: 'trade', shuffleIntoDeck: 'shuffle',
};

/** The verb a prompt or log entry should show for an effect: that of its first step. */
function verbOf(effect: EngineEffect): Verb {
    switch (effect.op) {
        case 'all': return effect.parts.length > 0 ? verbOf(effect.parts[0]) : 'choose';
        case 'then':
        case 'ifYouDo': return verbOf(effect.first);
        case 'may':
        case 'forEach':
        case 'when': return verbOf(effect.effect);
        case 'oneOf': return 'choose';
        case 'takeFromHand': return effect.how === 'random' ? 'pull' : 'take';
        case 'turn': return effect.action === 'extraTurn' ? 'extraTurn' : 'endTurn';
        case '$enterPlayed': return 'enter';
        default: return VERB_OF[effect.op] ?? 'choose';
    }
}

// ─── The walk ─────────────────────────────────────────────────────────────────

/** Resolves the link as far as possible. `suspend` = waiting for a prompt or for a link pushed on top. */
export function runLink(run: Run): Result {
    return exec(run, effectOf(run.G, run.L), ROOT, { you: run.L.controller, pre: run.L.preAccepted });
}

function exec(run: Run, node: EngineEffect, path: string, env: Env): Result {
    const done = run.L.mem[path]?.r;
    if (done) return done;

    switch (node.op) {
        case 'all': {
            let performed = true;
            for (let i = 0; i < node.parts.length; i++) {
                const r = exec(run, node.parts[i], `${path}.${i}`, i === 0 ? childEnv(env, { opt: env.opt }) : childEnv(env));
                if (r === 'suspend') return r;
                if (r.declined) return r;
                performed = performed && r.performed;
            }
            return { performed };
        }
        case 'then': {
            const first = exec(run, node.first, `${path}.0`, {
                you: env.you, opt: env.opt, role: 'cost', preview: [`then ${describeEffect(node.next)}`],
            });
            if (first === 'suspend' || first.declined) return first;
            if (!first.performed) return { performed: false };
            return exec(run, node.next, `${path}.1`, { you: env.you, role: 'effect' });
        }
        case 'ifYouDo': {
            const first = execMay(run, node.first, `${path}.0`, {
                you: env.you, pre: env.pre, role: 'cost', preview: [`if you do: ${describeEffect(node.next)}`],
            });
            if (first === 'suspend') return first;
            if (!first.performed) return { performed: false };
            const next = exec(run, node.next, `${path}.1`, { you: env.you, role: 'effect' });
            return next === 'suspend' ? next : { performed: true };
        }
        case 'may':
            return execMay(run, node.effect, path, env);
        case 'oneOf':
            return execOneOf(run, node, path, env);
        case 'forEach':
            return execForEach(run, node, path, env);
        case 'when': {
            const m = memOf(run, path);
            if (m.cond === undefined) m.cond = holds(run, node.cond);
            if (!m.cond) return { performed: false };
            return exec(run, node.effect, `${path}.0`, childEnv(env));
        }
        default:
            return execStep(run, node, path, env);
    }
}

function holds(run: Run, cond: Condition): boolean {
    switch (cond.cond) {
        case 'cardMatches':
            return (run.L.vars[cond.ref]?.cards ?? []).some(c => matchesFilter(run.G, c, cond.filter));
    }
}

/** "You may <effect>." */
function execMay(run: Run, inner: Effect, path: string, env: Env): Result {
    const m = memOf(run, path);
    if (m.r) return m.r;

    if (m.decision === undefined) {
        if (m.prompt === undefined) {
            if (!possible(scopeOf(run), inner, env.you, true)) {
                logFizzle(run, env, verbOf(inner), 'notPossible');
                return finish(run, path, false);
            }
            if (startsWithOpenChoice(inner)) {
                // The first choice itself can be skipped; no separate question.
                m.decision = 'choice';
            } else if (env.pre) {
                m.decision = 'yes';
            } else {
                return ask(run, path, env, {
                    kind: 'confirm', verb: verbOf(inner), title: `${describeEffect(inner)}?`,
                    player: env.you, optional: true, min: 0, max: 0, candidates: [],
                });
            }
        } else {
            const answer = takeAnswer(run, path);
            if (!answer) return 'suspend';
            m.decision = 'confirm' in answer ? 'yes' : 'no';
        }
    }

    if (m.decision === 'no') {
        logDeclined(run, env, verbOf(inner));
        return finish(run, path, false);
    }

    const r = exec(run, inner, `${path}.m`, {
        you: env.you, opt: m.decision === 'choice', role: env.role, preview: env.preview,
    });
    if (r === 'suspend') return r;
    if (r.declined) {
        if (env.pre) memOf(run, ROOT).refused = true;
        else logDeclined(run, env, verbOf(inner));
    }
    return finish(run, path, r.performed);
}

/** "A OR B" */
function execOneOf(run: Run, node: Extract<Effect, { op: 'oneOf' }>, path: string, env: Env): Result {
    const m = memOf(run, path);
    if (m.mode === undefined) {
        if (m.prompt === undefined) {
            const s = scopeOf(run);
            const candidates: Candidate[] = [];
            const disabled: { candidate: Candidate; reason: Reason }[] = [];
            node.modes.forEach((mode, i) => {
                const candidate: Candidate = { mode: i, label: sentence(describeEffect(mode)) };
                if (possible(s, mode, env.you, true)) candidates.push(candidate);
                else disabled.push({ candidate, reason: { rule: 'notPossible' } });
            });
            if (candidates.length === 0) {
                logFizzle(run, env, 'choose', 'notPossible');
                return finish(run, path, false);
            }
            return ask(run, path, env, {
                kind: 'chooseMode', verb: 'choose', title: 'choose one', player: env.you,
                optional: !!env.opt, min: 1, max: 1, candidates, disabled,
            });
        }
        const answer = takeAnswer(run, path);
        if (!answer) return 'suspend';
        if ('skip' in answer) return finish(run, path, false, true);
        if (!('mode' in answer)) return finish(run, path, false);
        m.mode = answer.mode;
        pushLog(run.G, {
            kind: 'decision', verb: 'choose', actor: env.you, source: sourceRef(run), parent: run.L.parentLog,
            text: sentence(describeEffect(node.modes[answer.mode])), outcome: 'done',
        });
    }
    const mode = m.mode as number;
    const r = exec(run, node.modes[mode], `${path}.${mode}`, { you: env.you });
    return r === 'suspend' ? r : finish(run, path, r.performed);
}

/** "Each player …", "another player …", "that player …" */
function execForEach(run: Run, node: Extract<Effect, { op: 'forEach' }>, path: string, env: Env): Result {
    const G = run.G;
    const m = memOf(run, path);

    if (m.players === undefined) {
        const sel = node.players;
        if (sel === 'each') {
            m.players = playersFrom(G, env.you);
        } else if (sel === 'eachOther') {
            m.players = playersFrom(G, env.you).filter(p => p !== env.you);
        } else if (sel === 'chosenOther') {
            if (m.prompt === undefined) {
                const s = scopeOf(run);
                const candidates = others(G, env.you).filter(p => possible(s, node.effect, p, false));
                if (candidates.length === 0) {
                    logFizzle(run, env, verbOf(node.effect), 'noTarget');
                    return finish(run, path, false);
                }
                return ask(run, path, env, {
                    kind: 'choosePlayers', verb: verbOf(node.effect), title: describeEffect(node), player: env.you,
                    optional: !!env.opt, min: 1, max: 1, candidates: candidates.map(player => ({ player })),
                });
            }
            const answer = takeAnswer(run, path);
            if (!answer) return 'suspend';
            if ('skip' in answer) return finish(run, path, false, true);
            m.players = 'players' in answer ? answer.players : [];
        } else {
            m.players = [...(run.L.vars[sel.ref]?.players ?? [])];
        }
    }

    const players = m.players as PlayerID[];
    let suspended = false;
    let performed = false;
    for (let i = 0; i < players.length; i++) {
        // Every player decides at the same time: do not stop at the first open prompt.
        const r = exec(run, node.effect, `${path}.${i}`, { you: players[i] });
        if (!onTop(run)) return 'suspend';
        if (r === 'suspend') suspended = true;
        else performed = performed || r.performed;
    }
    if (suspended) return 'suspend';
    return finish(run, path, performed);
}

// ─── Steps ────────────────────────────────────────────────────────────────────

interface ChooseSpec {
    verb: Verb;
    title: string;
    count: Count;
    options: () => Options;
    /** Applies the step to one chosen card. Returns whether it happened. */
    apply: (card: CardID) => boolean;
    /** Choose and apply one card at a time. */
    sequential?: boolean;
    /** The candidates are hidden information of the choosing player (deck search). */
    private?: boolean;
    bind?: string;
    /** Runs once when the step is over, whatever happened. */
    finally?: () => void;
}

/**
 * The common shape of most steps: the player picks `count` cards among the candidates, then the step
 * is applied to them one by one. Triggered abilities pushed by an application resolve before the next one.
 */
function chooseAndApply(run: Run, path: string, env: Env, spec: ChooseSpec): Result {
    const G = run.G;
    const m = memOf(run, path);
    if (m.stage === undefined) {
        m.done = 0;
        m.moved = [];
        m.owners = [];
        m.tried = [];
        if (spec.count === 'all') {
            m.queue = spec.options().ok.map(c => (c as { card: CardID }).card);
            m.stage = 'apply';
        } else {
            m.stage = 'ask';
        }
    }
    const tried = m.tried as CardID[];
    const moved = m.moved as CardID[];
    const owners = m.owners as PlayerID[];
    const wanted = spec.count === 'all' ? 0 : spec.count;

    const end = (declined?: boolean): Result => {
        spec.finally?.();
        bind(run, spec.bind, moved, owners);
        const done = m.done as number;
        if (spec.count !== 'all' && done === 0 && !declined) logFizzle(run, env, spec.verb, 'noTarget');
        return finish(run, path, spec.count === 'all' ? true : done >= wanted, declined);
    };

    for (;;) {
        if (m.stage === 'ask') {
            const need = wanted - (m.done as number);
            if (m.prompt === undefined) {
                const options = spec.options();
                const candidates = options.ok.filter(c => !tried.includes((c as { card: CardID }).card));
                if (need <= 0 || candidates.length === 0) return end();
                const n = spec.sequential ? 1 : Math.min(need, candidates.length);
                const first = (m.done as number) === 0 && !m.asked;
                m.asked = true;
                return ask(run, path, env, {
                    kind: 'chooseCards', verb: spec.verb, title: spec.title, player: env.you,
                    optional: !!env.opt && first, min: n, max: n, candidates, disabled: options.disabled,
                    privateCards: spec.private ? candidates.map(c => (c as { card: CardID }).card) : undefined,
                });
            }
            const answer = takeAnswer(run, path);
            if (!answer) return 'suspend';
            if ('skip' in answer) return end(true);
            if (!('cards' in answer)) return end();
            // The state may have changed since the answer was given: keep what is still legal.
            const legal = spec.options().ok.map(c => (c as { card: CardID }).card);
            const chosen = answer.cards.filter(c => legal.includes(c));
            if (chosen.length === 0) continue;
            m.queue = chosen;
            m.stage = 'apply';
        }

        const queue = m.queue as CardID[];
        while (queue.length > 0) {
            const card = queue.shift()!;
            tried.push(card);
            const at = locate(G, card);
            if (spec.apply(card)) {
                m.done = (m.done as number) + 1;
                moved.push(card);
                if (at?.player !== undefined) owners.push(at.player);
            }
            if (!onTop(run)) return 'suspend';
        }
        if (spec.count === 'all' || (m.done as number) >= wanted) return end();
        // R15: targets that are chosen together are all there is — a card that only became a legal
        // target through this step (its protection was just destroyed) is not asked for afterwards.
        if (!spec.sequential) return end();
        m.stage = 'ask';
    }
}

const isPicked = (x: { player: PlayerID } | Result): x is { player: PlayerID } => typeof x === 'object' && 'player' in x;

/** Asks `you` to pick one other player among `candidates`. Returns the player, or a Result to pass on. */
function choosePlayer(run: Run, path: string, env: Env, key: string, spec: { verb: Verb; title: string; candidates: PlayerID[]; kind?: 'choosePlayers' | 'chooseStable'; optional: boolean }): { player: PlayerID } | Result {
    const m = memOf(run, path);
    if (m[key] !== undefined) return { player: m[key] as PlayerID };
    if (m.prompt === undefined) {
        if (spec.candidates.length === 0) {
            logFizzle(run, env, spec.verb, 'noTarget');
            return finish(run, path, false);
        }
        return ask(run, path, env, {
            kind: spec.kind ?? 'choosePlayers', verb: spec.verb, title: spec.title, player: env.you,
            optional: spec.optional, min: 1, max: 1, candidates: spec.candidates.map(player => ({ player })),
        });
    }
    const answer = takeAnswer(run, path);
    if (!answer) return 'suspend';
    if ('skip' in answer) return finish(run, path, false, true);
    if (!('players' in answer) || answer.players.length !== 1) return finish(run, path, false);
    m[key] = answer.players[0];
    return { player: answer.players[0] };
}

function execStep(run: Run, node: Step | Extract<EngineEffect, { op: '$enterPlayed' }>, path: string, env: Env): Result {
    const { G, rng, L } = run;
    const you = env.you;
    const m = memOf(run, path);
    const source = L.source?.card;
    const meta = { actor: you, source, ability: L.source?.ability, parentLog: L.parentLog, role: env.role ?? (L.kind === 'rule' ? 'rule' as const : undefined) };
    const moveTo = (card: CardID, to: Parameters<typeof moveCard>[1]['to'], cause: Cause, extra: Partial<Parameters<typeof moveCard>[1]> = {}): boolean =>
        moveCard(G, { card, to, cause, ...meta, ...extra }).moved;
    const title = describeEffect(node);
    const sequentialTargets = G.options.rules.multiTarget === 'sequential';
    /** After a step that needs no choice: store the result, then let pushed triggers resolve. */
    const settle = (performed: boolean): Result => {
        const r = finish(run, path, performed);
        return onTop(run) ? r : 'suspend';
    };

    switch (node.op) {
        case 'draw': {
            const drawn = drawCards(G, rng, you, node.count, { ...meta, reveal: node.reveal });
            bind(run, node.bind, drawn, [you]);
            return settle(drawn.length === node.count);
        }

        case 'discard':
            return chooseAndApply(run, path, env, {
                verb: 'discard', title, count: node.count,
                options: () => stepOptions(scopeOf(run), node, you),
                apply: card => moveTo(card, { zone: 'discard' }, 'discard'),
            });

        case 'sacrifice':
            return chooseAndApply(run, path, env, {
                verb: 'sacrifice', title, count: node.count,
                options: () => stepOptions(scopeOf(run), node, you),
                apply: card => moveTo(card, { zone: 'discard' }, 'sacrifice'),
            });

        case 'destroy':
            return chooseAndApply(run, path, env, {
                verb: 'destroy', title, count: node.count, sequential: sequentialTargets,
                options: () => stepOptions(scopeOf(run), node, you),
                apply: card => moveTo(card, { zone: 'discard' }, 'destroy'),
            });

        case 'steal':
            return chooseAndApply(run, path, env, {
                verb: 'steal', title, count: node.count, sequential: sequentialTargets,
                options: () => stepOptions(scopeOf(run), node, you),
                apply: card => moveTo(card, { zone: 'stable', player: you }, 'steal'),
            });

        case 'returnToHand':
            return chooseAndApply(run, path, env, {
                verb: 'return', title, count: node.count, sequential: sequentialTargets, bind: node.bind,
                options: () => stepOptions(scopeOf(run), node, you),
                apply: card => {
                    const owner = stableOwner(G, card);
                    return owner !== undefined && moveTo(card, { zone: 'hand', player: owner }, 'return');
                },
            });

        case 'move': {
            if (m.card === undefined) {
                if (m.prompt === undefined) {
                    const options = stepOptions(scopeOf(run), node, you);
                    if (options.ok.length === 0) {
                        logFizzle(run, env, 'move', 'noTarget');
                        return finish(run, path, false);
                    }
                    return ask(run, path, env, {
                        kind: 'chooseCards', verb: 'move', title, player: you, optional: !!env.opt,
                        min: 1, max: 1, candidates: options.ok, disabled: options.disabled,
                    });
                }
                const answer = takeAnswer(run, path);
                if (!answer) return 'suspend';
                if ('skip' in answer) return finish(run, path, false, true);
                if (!('cards' in answer) || answer.cards.length !== 1) return finish(run, path, false);
                m.card = answer.cards[0];
            }
            const card = m.card as CardID;
            const dest = choosePlayer(run, path, env, 'dest', {
                verb: 'move', title: 'choose the Stable it moves to', kind: 'chooseStable', optional: false,
                candidates: stableOwner(G, card) === undefined ? [] : moveDestinations(G, card, you),
            });
            if (!isPicked(dest)) return dest;
            return settle(moveTo(card, { zone: 'stable', player: dest.player }, 'move'));
        }

        case 'bring':
            return chooseAndApply(run, path, env, {
                verb: 'bring', title, count: node.cards ? 'all' : 1,
                options: () => stepOptions(scopeOf(run), node, you),
                apply: card => moveTo(card, { zone: 'stable', player: you }, 'bring'),
            });

        case 'addToHand': {
            if (node.self) {
                const inDiscard = source !== undefined && G.zones.discard.includes(source);
                return settle(inDiscard && moveTo(source!, { zone: 'hand', player: you }, 'add'));
            }
            return chooseAndApply(run, path, env, {
                verb: 'add', title, count: 1,
                options: () => stepOptions(scopeOf(run), node, you),
                apply: card => moveTo(card, { zone: 'hand', player: you }, 'add'),
            });
        }

        case 'search':
            return chooseAndApply(run, path, env, {
                verb: 'search', title, count: 1, private: true,
                options: () => stepOptions(scopeOf(run), node, you),
                apply: card => moveTo(card, { zone: 'hand', player: you }, 'search',
                    G.options.rules.revealSearch ? {} : { visibility: [you] }),
                finally: () => { G.zones.deck = rng.shuffle(G.zones.deck); },
            });

        case 'takeFromHand': {
            const verb: Verb = node.how === 'random' ? 'pull' : 'take';
            const fromPick = choosePlayer(run, path, env, 'from', {
                verb, title, optional: !!env.opt,
                candidates: m.from !== undefined ? [] : others(G, you).filter(p => G.zones.hand[p].length > 0),
            });
            if (!isPicked(fromPick)) return fromPick;
            const from = fromPick.player;
            const hand = G.zones.hand[from];
            if (hand.length === 0) {
                logFizzle(run, env, verb, 'noTarget');
                return finish(run, path, false);
            }
            if (node.how === 'random') {
                const card = hand[rng.int(hand.length)];
                return settle(moveTo(card, { zone: 'hand', player: you }, 'pull', { visibility: [you, from] }));
            }
            if (m.picking === undefined) {
                m.picking = true;
                return ask(run, path, env, {
                    kind: 'chooseCards', verb: 'take', title: 'choose a card and add it to your hand', player: you,
                    optional: false, min: 1, max: 1,
                    candidates: hand.map(c => cardCandidate(c, 'hand', from)), privateCards: [...hand],
                });
            }
            const answer = takeAnswer(run, path);
            if (!answer) return 'suspend';
            const picked = 'cards' in answer ? answer.cards[0] : undefined;
            if (picked === undefined || !hand.includes(picked)) return finish(run, path, false);
            return settle(moveTo(picked, { zone: 'hand', player: you }, 'take', { visibility: [you, from] }));
        }

        case 'tradeHands': {
            const otherPick = choosePlayer(run, path, env, 'other', {
                verb: 'trade', title, optional: !!env.opt,
                candidates: m.other !== undefined ? [] : others(G, you),
            });
            if (!isPicked(otherPick)) return otherPick;
            const other = otherPick.player;
            const mine = [...G.zones.hand[you]];
            const theirs = [...G.zones.hand[other]];
            mine.forEach(card => moveTo(card, { zone: 'hand', player: other }, 'trade', { silent: true }));
            theirs.forEach(card => moveTo(card, { zone: 'hand', player: you }, 'trade', { silent: true }));
            pushLog(G, {
                kind: 'event', verb: 'trade', actor: you, players: [other], source: sourceRef(run),
                parent: L.parentLog, role: meta.role, outcome: 'done',
            });
            return settle(true);
        }

        case 'shuffleIntoDeck': {
            let count = 0;
            if (node.what.includes('self') && source !== undefined && locate(G, source)?.zone !== 'deck') {
                if (moveTo(source, { zone: 'deck' }, 'shuffleIn', { silent: true })) count += 1;
            }
            if (node.what.includes('hand')) {
                [...G.zones.hand[you]].forEach(card => { if (moveTo(card, { zone: 'deck' }, 'shuffleIn', { silent: true })) count += 1; });
            }
            if (node.what.includes('discard')) {
                shuffleDiscardIntoDeck(G, rng, { actor: you, source, parentLog: L.parentLog });
            } else {
                G.zones.deck = rng.shuffle(G.zones.deck);
            }
            if (count > 0) {
                pushLog(G, {
                    kind: 'event', verb: 'shuffle', actor: you, count, to: { zone: 'deck' }, source: sourceRef(run),
                    parent: L.parentLog, outcome: 'done',
                });
            }
            return settle(true);
        }

        case 'turn': {
            if (node.action === 'extraTurn') {
                G.extraTurns.push(you);
                pushLog(G, { kind: 'event', verb: 'extraTurn', actor: you, source: sourceRef(run), parent: L.parentLog, outcome: 'done' });
            } else if (G.turn.player === you) {
                G.turn.mustEnd = true;
            }
            return finish(run, path, true);
        }

        case '$enterPlayed': {
            const entered = moveCard(G, {
                card: node.card, to: { zone: 'stable', player: node.target }, cause: 'enter',
                actor: you, parentLog: L.parentLog,
            }).moved;
            // The card can no longer enter (the stable changed while it was being played): it is discarded.
            if (!entered && locate(G, node.card)?.zone === 'pile') {
                moveCard(G, { card: node.card, to: { zone: 'discard' }, cause: 'resolve', actor: you, parentLog: L.parentLog });
            }
            return settle(entered);
        }
    }
}
