export type Effect = {
    key: "save_mate_by_sacrifice" | "basic_unicorns_can_only_join_your_stable" | "can_play_two_cards" | "your_cards_cannot_be_neighed" | "your_unicorns_cannot_be_destroyed" | "double_dutch" | "my_unicorns_are_basic" | "you_cannot_play_upgrades" | "pandamonium" | "you_cannot_play_neigh" | "tiny_stable" | "change_of_luck" | "your_hand_is_visible" | "count_as_two"
};

type PlayerEffectEntry = { effect: Effect };

export function hasEffect(playerEffects: PlayerEffectEntry[], key: Effect["key"]): boolean {
    return playerEffects.some(e => e.effect.key === key);
}

/** Returns true if the card's special abilities are suppressed because all unicorns
 *  are treated as basic (my_unicorns_are_basic) while pandamonium is NOT also active. */
export function isCardBasicDueToEffect(playerEffects: PlayerEffectEntry[], card: { type: string }): boolean {
    if (!hasEffect(playerEffects, "my_unicorns_are_basic")) return false;
    if (hasEffect(playerEffects, "pandamonium")) return false;
    return card.type === "narwhal" || card.type === "unicorn";
}