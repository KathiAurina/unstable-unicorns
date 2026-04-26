"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasEffect = hasEffect;
exports.isCardBasicDueToEffect = isCardBasicDueToEffect;
const card_1 = require("./card");
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
    return (0, card_1.hasType)(card, "narwhal") || (0, card_1.hasType)(card, "unicorn");
}
