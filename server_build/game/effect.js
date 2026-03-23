"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasEffect = hasEffect;
exports.isCardBasicDueToEffect = isCardBasicDueToEffect;
function hasEffect(playerEffects, key) {
    return playerEffects.some(e => e.effect.key === key);
}
/** Returns true if the card's special abilities are suppressed because all unicorns
 *  are treated as basic (my_unicorns_are_basic) while pandamonium is NOT also active. */
function isCardBasicDueToEffect(playerEffects, card) {
    if (!hasEffect(playerEffects, "my_unicorns_are_basic"))
        return false;
    if (hasEffect(playerEffects, "pandamonium"))
        return false;
    return card.type === "narwhal" || card.type === "unicorn";
}
