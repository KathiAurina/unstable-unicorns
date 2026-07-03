import { initializeDeck, isUnicorn, hasType, getPrimaryType } from '../card';

describe('initializeDeck', () => {
    const deck = initializeDeck();

    it('assigns unique sequential IDs starting at 0', () => {
        const ids = deck.map(c => c.id);
        expect(ids[0]).toBe(0);
        expect(ids[ids.length - 1]).toBe(deck.length - 1);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(deck.length);
    });

    it('contains exactly 13 baby unicorns', () => {
        const babies = deck.filter(c => c.type === 'baby');
        expect(babies.length).toBe(13);
    });

    it('contains at least one of each major card type', () => {
        const types = new Set(deck.flatMap(c => Array.isArray(c.type) ? c.type : [c.type]));
        expect(types.has('basic')).toBe(true);
        expect(types.has('unicorn')).toBe(true);
        expect(types.has('magic')).toBe(true);
        expect(types.has('upgrade')).toBe(true);
        expect(types.has('downgrade')).toBe(true);
        expect(types.has('neigh')).toBe(true);
    });

    it('every card has required fields', () => {
        deck.forEach(card => {
            expect(card.id).toBeGreaterThanOrEqual(0);
            expect(typeof card.title).toBe('string');
            expect(typeof card.image).toBe('string');
            const type = card.type;
            expect(typeof type === 'string' || (Array.isArray(type) && type.every(t => typeof t === 'string'))).toBe(true);
            expect(card.description).toBeDefined();
            expect(card.description.en).toBeDefined();
        });
    });

    it('has a total of more than 100 cards (sanity check for full deck)', () => {
        expect(deck.length).toBeGreaterThan(100);
    });
});

describe('isUnicorn', () => {
    const deck = initializeDeck();

    it('returns true for baby, basic, unicorn, narwhal types', () => {
        const baby = deck.find(c => c.type === 'baby')!;
        const basic = deck.find(c => c.type === 'basic')!;
        const unicorn = deck.find(c => c.type === 'unicorn')!;

        expect(isUnicorn(baby)).toBe(true);
        expect(isUnicorn(basic)).toBe(true);
        expect(isUnicorn(unicorn)).toBe(true);
    });

    it('returns false for non-unicorn types', () => {
        const magic = deck.find(c => c.type === 'magic')!;
        const upgrade = deck.find(c => c.type === 'upgrade')!;
        const downgrade = deck.find(c => c.type === 'downgrade')!;

        expect(isUnicorn(magic)).toBe(false);
        expect(isUnicorn(upgrade)).toBe(false);
        expect(isUnicorn(downgrade)).toBe(false);
    });
});

// ─── hasType ────────────────────────────────────────────────────────────────────

describe('hasType', () => {
    it('returns true when card type is a string matching the query', () => {
        expect(hasType({ type: 'basic' }, 'basic')).toBe(true);
    });

    it('returns false when card type is a string not matching the query', () => {
        expect(hasType({ type: 'magic' }, 'basic')).toBe(false);
    });

    it('returns true when card type is an array containing the query', () => {
        expect(hasType({ type: ['basic', 'unicorn'] }, 'unicorn')).toBe(true);
    });

    it('returns false when card type is an array not containing the query', () => {
        expect(hasType({ type: ['basic', 'unicorn'] }, 'magic')).toBe(false);
    });

    it('returns false for an empty type array', () => {
        expect(hasType({ type: [] as any }, 'basic')).toBe(false);
    });
});

// ─── getPrimaryType ───────────────────────────────────────────────────────────

describe('getPrimaryType', () => {
    it('returns the type directly when it is a single string', () => {
        expect(getPrimaryType({ type: 'magic' })).toBe('magic');
    });

    it('returns the first element when type is an array', () => {
        expect(getPrimaryType({ type: ['basic', 'unicorn'] })).toBe('basic');
    });

    it('returns the only element when the array has one entry', () => {
        expect(getPrimaryType({ type: ['upgrade'] })).toBe('upgrade');
    });
});
