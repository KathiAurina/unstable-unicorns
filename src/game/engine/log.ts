// Game log (expansion-plan.md section 7). Entries are written by the event pipeline, the effect
// interpreter (decisions) and the turn machine — never by card definitions.

import type { GameState, LogEntry } from './state';
import { nextId } from './state';

export type NewLogEntry = Omit<LogEntry, 'id' | 'turn' | 'phase' | 'visibility'> & { visibility?: LogEntry['visibility'] };

/** Appends an entry and returns its id. */
export function pushLog(G: GameState, entry: NewLogEntry): number {
    const id = nextId(G);
    G.log.push({
        id,
        turn: G.turn.number,
        phase: G.turn.phase,
        visibility: 'public',
        ...entry,
    });
    return id;
}
