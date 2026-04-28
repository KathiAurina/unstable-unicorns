"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KNOWN_EFFECTS = void 0;
exports.hasEffect = hasEffect;
exports.isCardBasicDueToEffect = isCardBasicDueToEffect;
const card_1 = require("./card");
exports.KNOWN_EFFECTS = [
    "save_mate_by_sacrifice",
    "basic_unicorns_can_only_join_your_stable",
    "can_play_two_cards",
    "your_cards_cannot_be_neighed",
    "your_unicorns_cannot_be_destroyed",
    "double_dutch",
    "my_unicorns_are_basic",
    "you_cannot_play_upgrades",
    "pandamonium",
    "you_cannot_play_neigh",
    "tiny_stable",
    "change_of_luck",
    "your_hand_is_visible",
    "count_as_two",
];
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
