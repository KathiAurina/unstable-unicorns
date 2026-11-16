import { hasEffect, isCardBasicDueToEffect } from '../effect';
import type { Effect } from '../effect';

// ─── hasEffect ────────────────────────────────────────────────────────────────

describe('hasEffect', () => {
    it('returns true when the key is present in the effects list', () => {
        const effects = [{ effect: { key: 'double_dutch' as Effect['key'] } }];
        expect(hasEffect(effects, 'double_dutch')).toBe(true);
    });

    it('returns false when the key is not in the effects list', () => {
        const effects = [{ effect: { key: 'double_dutch' as Effect['key'] } }];
        expect(hasEffect(effects, 'pandamonium')).toBe(false);
    });

    it('returns false for an empty effects list', () => {
        expect(hasEffect([], 'double_dutch')).toBe(false);
    });

    it('returns true when the matching key is one of several effects', () => {
        const effects = [
            { effect: { key: 'double_dutch' as Effect['key'] } },
            { effect: { key: 'pandamonium' as Effect['key'] } },
        ];
        expect(hasEffect(effects, 'pandamonium')).toBe(true);
    });

    it('returns false when list contains unrelated effects only', () => {
        const effects = [
            { effect: { key: 'tiny_stable' as Effect['key'] } },
            { effect: { key: 'count_as_two' as Effect['key'] } },
        ];
        expect(hasEffect(effects, 'double_dutch')).toBe(false);
    });
});

// ─── isCardBasicDueToEffect ───────────────────────────────────────────────────

describe('isCardBasicDueToEffect', () => {
    it('returns false when my_unicorns_are_basic is not active', () => {
        expect(isCardBasicDueToEffect([], { type: 'unicorn' })).toBe(false);
    });

    it('returns true for a unicorn card when only my_unicorns_are_basic is active', () => {
        const effects = [{ effect: { key: 'my_unicorns_are_basic' as Effect['key'] } }];
        expect(isCardBasicDueToEffect(effects, { type: 'unicorn' })).toBe(true);
    });

    it('returns true for a narwhal card when only my_unicorns_are_basic is active', () => {
        const effects = [{ effect: { key: 'my_unicorns_are_basic' as Effect['key'] } }];
        expect(isCardBasicDueToEffect(effects, { type: ['basic', 'narwhal'] as any })).toBe(true);
    });

    it('returns false for a basic card even when my_unicorns_are_basic is active (only unicorn/narwhal are suppressed)', () => {
        const effects = [{ effect: { key: 'my_unicorns_are_basic' as Effect['key'] } }];
        expect(isCardBasicDueToEffect(effects, { type: 'basic' })).toBe(false);
    });

    it('returns false for a magic card when my_unicorns_are_basic is active', () => {
        const effects = [{ effect: { key: 'my_unicorns_are_basic' as Effect['key'] } }];
        expect(isCardBasicDueToEffect(effects, { type: 'magic' })).toBe(false);
    });

    it('returns false for a downgrade card when my_unicorns_are_basic is active', () => {
        const effects = [{ effect: { key: 'my_unicorns_are_basic' as Effect['key'] } }];
        expect(isCardBasicDueToEffect(effects, { type: 'downgrade' })).toBe(false);
    });

    it('returns false for a unicorn when BOTH my_unicorns_are_basic AND pandamonium are active (pandamonium cancels suppression)', () => {
        const effects = [
            { effect: { key: 'my_unicorns_are_basic' as Effect['key'] } },
            { effect: { key: 'pandamonium' as Effect['key'] } },
        ];
        expect(isCardBasicDueToEffect(effects, { type: 'unicorn' })).toBe(false);
    });

    it('returns false for a narwhal when BOTH my_unicorns_are_basic AND pandamonium are active', () => {
        const effects = [
            { effect: { key: 'my_unicorns_are_basic' as Effect['key'] } },
            { effect: { key: 'pandamonium' as Effect['key'] } },
        ];
        expect(isCardBasicDueToEffect(effects, { type: ['basic', 'narwhal'] as any })).toBe(false);
    });
});
