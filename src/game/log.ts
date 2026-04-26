import type { UnstableUnicornsGame, Ctx } from './state';
import type { PlayerID } from './player';
import type { CardID } from './card';
import _ from 'underscore';

export type LogEntryKind =
    | 'play'
    | 'play_neigh'
    | 'play_super_neigh'
    | 'card_neighed'
    | 'destroy'
    | 'sacrifice'
    | 'steal'
    | 'pull'
    | 'discard'
    | 'draw'
    | 'search'
    | 'revive'
    | 'return_to_hand'
    | 'bring_to_stable'
    | 'move'
    | 'swap'
    | 'shuffle';

export interface LogEntry {
    id: string;
    turn: number;
    timestamp: number;
    actor: PlayerID;
    kind: LogEntryKind;
    sourceCardID?: CardID;
    targetCardID?: CardID;
    targetPlayer?: PlayerID;
    count?: number;
}

export function pushLog(
    G: UnstableUnicornsGame,
    ctx: Ctx,
    entry: Omit<LogEntry, 'id' | 'turn' | 'timestamp'>
) {
    G.gameLog.push({
        id: _.uniqueId('log_'),
        turn: ctx.turn,
        timestamp: Date.now(),
        ...entry,
    });
}
