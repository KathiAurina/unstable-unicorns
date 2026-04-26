"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPANSION_LABELS = exports.AVAILABLE_EXPANSIONS = void 0;
exports.hasType = hasType;
exports.getPrimaryType = getPrimaryType;
exports.initializeDeck = initializeDeck;
exports.isUnicorn = isUnicorn;
function hasType(card, type) {
    return Array.isArray(card.type) ? card.type.includes(type) : card.type === type;
}
/** Returns the primary (first) type for display/UI purposes. */
function getPrimaryType(card) {
    return Array.isArray(card.type) ? card.type[0] : card.type;
}
exports.AVAILABLE_EXPANSIONS = ["base_game", "adventures_2nd_edition"];
exports.EXPANSION_LABELS = {
    base_game: "Base Game",
    adventures_2nd_edition: "Adventures (2nd Edition)"
};
const Cards = [{
        title: "Baby Unicorn",
        expansions: ["base_game"],
        type: "baby",
        image: "baby0",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Baby Unicorn",
        expansions: ["base_game"],
        type: "baby",
        image: "baby1",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Baby Unicorn",
        expansions: ["base_game"],
        type: "baby",
        image: "baby2",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Baby Unicorn",
        expansions: ["base_game"],
        type: "baby",
        image: "baby3",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Baby Unicorn",
        expansions: ["base_game"],
        type: "baby",
        image: "baby4",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Baby Unicorn",
        expansions: ["base_game"],
        type: "baby",
        image: "baby5",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Baby Unicorn",
        expansions: ["base_game"],
        type: "baby",
        image: "baby6",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Baby Unicorn",
        expansions: ["base_game"],
        type: "baby",
        image: "baby7",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Baby Unicorn",
        expansions: ["base_game"],
        type: "baby",
        image: "baby8",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Baby Unicorn",
        expansions: ["base_game"],
        type: "baby",
        image: "baby9",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Baby Unicorn",
        expansions: ["base_game"],
        type: "baby",
        image: "baby10",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Baby Unicorn",
        expansions: ["base_game"],
        type: "baby",
        image: "baby11",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Baby Narwhal",
        expansions: ["base_game"],
        type: "baby",
        image: "baby12",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Baby Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "baby",
        image: "baby_fisherman",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Baby Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "baby",
        image: "baby_forest",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Baby Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "baby",
        image: "baby_pirate",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Baby Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "baby",
        image: "baby_safari",
        count: 1,
        on: [],
        description: {
            en: "If this card would be sacrificed, destroyed, or returned to your hand, return it to the Nursery instead.",
            de: "Falls diese Karte geopfert, zerstört oder auf deine Hand zurückgeschickt werden würde, lege sie stattdessen zurück in den Kindergarten."
        }
    }, {
        title: "Eager Adventurer Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "basic",
        image: "eager_adventurer_unicorn",
        count: 1,
        on: [],
        description: {
            en: "\"OOOH! What's that??\"",
            de: "\"OOOH! Was ist das??\"",
        }
    }, {
        title: "Glamping Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "basic",
        image: "glamping_unicorn",
        count: 1,
        on: [],
        description: {
            en: "\"What do you mean I'm not roughing it? My phone has, like, zero bars!\"",
            de: "\"Wie meinst du das, ich bin nicht tough genug? Mein Handy hat keinen Akku mehr!\"",
        }
    }, {
        title: "Indoor Rockclimbing Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "basic",
        image: "indoor_rockclimbing_unicorn",
        count: 1,
        on: [],
        description: {
            en: "\"Always reach for new heights. Just don't bump your head on the ceiling.\"",
            de: "\"Klettere immer höher und höher. Nur nicht den Kopf an der Decke stoßen.\"",
        }
    }, {
        title: "Landlubber Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "basic",
        image: "landlubber_unicorn",
        count: 1,
        on: [],
        description: {
            en: "\"A little help? I'm still learning the ropes.\"",
            de: "\"Etwas Hilfe? Ich lerne noch die Grundlagen mit den Seilen.\"",
        }
    }, {
        title: "Alluring Narwhal",
        expansions: ["base_game"],
        type: "narwhal",
        image: "alluring_narwhal",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "steal",
                                            info: { type: "upgrade" },
                                        },
                                        ui: {
                                            type: "card_to_card"
                                        }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may STEAL an Upgrade card.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du eine Upgradekarte stehlen."
        }
    }, {
        title: "Americorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "americorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "pullRandom",
                                        },
                                        ui: { type: "card_to_player" }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may pull a card at random from another player's hand.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du eine zufällige Karte aus der Hand eines Mitspieler stehlen."
        }
    }, {
        title: "Annoying Flying Unicorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "annoying_flying_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "makeSomeoneDiscard",
                                        },
                                        ui: { type: "card_to_player" }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false,
                    }
                }
            }, {
                trigger: "this_destroyed_or_sacrificed",
                do: {
                    type: "return_to_hand",
                }
            }],
        description: {
            en: "When this card enters your Stable, you may force another player to DISCARD a card. 👼 If this card is sacrificed or destroyed, return it to your hand.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du einen Mitspieler auswählen. Dieser Mitspieler muss eine Karte abwerfen. 👼 Wenn diese Karte geopfert oder zerstört wird, kommt sie stattdessen auf deine Hand zurück."
        }
    }, {
        title: "Chainsaw Unicorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "chainsaw_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                // when there are two instructions for the same protagonist, the protagonist must execute exactly one instruction before the game may advance
                                // in this case the protagonist may destroy an upgrade card or sacrifice a downgrade card
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "destroy",
                                            info: { type: "my_downgrade_other_upgrade" }
                                        },
                                        ui: { type: "card_to_card" }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may DESTROY an Upgrade card or SACRIFICE a Downgrade card.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du eine Upgradekarte oder eine Downgradekarte opfern."
        }
    }, {
        title: "Classy Narwhal",
        expansions: ["base_game"],
        type: "narwhal",
        image: "classy_narwhal",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "search",
                                            info: { type: "upgrade" }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "search" } }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may search the deck for an Upgrade card and add it to your hand, then shuffle the deck.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du im Deck nach einer Upgradekarte suchen und sie deiner Hand hinzufügen."
        }
    }, {
        title: "Dark Angel Unicorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "dark_angel_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        // typical action chain: sacrifice to revive
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "sacrifice",
                                            info: { type: "unicorn" }
                                        },
                                        ui: { type: "card_to_card" }
                                    }]
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "revive",
                                            info: { type: "unicorn" }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Revive" } }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may SACRIFICE a Unicorn card, then bring a Unicorn card from the discard pile into your Stable.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du eine Einhornkarte 🦄 opfern. Du darfst dann ein Einhorn aus dem Friedhof in deinen Stall legen."
        }
    }, {
        title: "Ginormous Unicorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "ginormous_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_effect",
                    info: { key: "you_cannot_play_neigh" },
                    ui: { type: "none" }
                }
            }, {
                trigger: "enter",
                do: {
                    type: "add_effect",
                    info: { key: "count_as_two" },
                    ui: { type: "none" }
                }
            }],
        description: {
            en: "This card counts for 2 Unicorns. You cannot play any Neigh cards.",
            de: "Diese Karte zählt als zwei Einhörner. Du kannst keine Neigh Karten spielen, solange diese Karte in deinem Stall ist."
        }
    }, {
        title: "Greedy Flying Unicorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "greedy_flying_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "draw",
                                            info: {
                                                count: 1,
                                            }
                                        },
                                        ui: { type: "click_on_drawPile" }
                                    }]
                            }],
                        mandatory: true,
                        endTurnImmediately: false
                    }
                }
            }, {
                trigger: "this_destroyed_or_sacrificed",
                do: {
                    type: "return_to_hand",
                }
            }],
        description: {
            en: "When this card enters your Stable, DRAW a card. If this card is sacrificed or destroyed, return it to your hand.",
            de: "Wenn diese Karte deinen Stall betritt, ziehe eine Karte. 👼 Wenn diese Karte geopfert oder zerstört wird, kommt sie stattdessen auf deine Hand zurück."
        }
    }, {
        title: "Llamacorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "llamacorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "all",
                                        do: {
                                            key: "discard",
                                            info: { count: 1, type: "any" }
                                        },
                                        ui: {
                                            type: "click_on_own_card_in_hand"
                                        }
                                    }]
                            }],
                        mandatory: true,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, each player (including you) must DISCARD a card.",
            de: "Wenn diese Karte deinen Stall betritt, muss jeder Spieler (auch du) eine Karte abwerfen"
        }
    }, {
        title: "Magical Flying Unicorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "magical_flying_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "addFromDiscardPileToHand",
                                            info: { type: "magic" }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Add magic card" } }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }, {
                trigger: "this_destroyed_or_sacrificed",
                do: {
                    type: "return_to_hand",
                }
            }],
        description: {
            en: "When this card enters your Stable, you may add a Magic card from the discard pile to your hand. If this card is sacrificed or destroyed, return it to your hand.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du eine Magiekarte aus dem Friedhof deiner Hand hinzufügen. Wenn diese Karte geopfert oder zerstört wird, kommt sie stattdessen auf deine Hand zurück."
        }
    }, {
        title: "Magical Kittencorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "magical_kittencorn",
        count: 1,
        passive: ["cannot_be_destroyed_by_magic"],
        description: {
            en: "This card cannot be destroyed by Magic cards.",
            de: "Diese Karte kann nicht von Magiekarten zerstört werden"
        }
    }, {
        title: "Majestic Flying Unicorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "majestic_flying_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "addFromDiscardPileToHand",
                                            info: { type: "unicorn" }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Add card from discard pile" } }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }, {
                trigger: "this_destroyed_or_sacrificed",
                do: {
                    type: "return_to_hand",
                }
            }],
        description: {
            en: "When this card enters your Stable, you may add a Unicorn card from the discard pile to your hand. If this card is sacrificed or destroyed, return it to your hand.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du ein Einhorn aus dem Friedhof deiner Hand hinzufügen. 👼 Wenn diese Karte geopfert oder zerstört wird, kommt sie stattdessen auf deine Hand zurück."
        }
    }, {
        title: "Mother Goose Unicorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "mother_goose_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "reviveFromNursery",
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Revive Baby Unicorn" } }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may bring a Baby Unicorn card from the Nursery into your Stable.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du ein Babyeinhorn aus der Kita adoptieren und es deinem Stall hinzufügen."
        }
    }, {
        title: "Mermaid Unicorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "mermaid_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "returnToHand",
                                            info: { who: "another" }
                                        },
                                        ui: { type: "card_to_card" }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, return a card in another player's Stable to their hand.",
            de: "Wenn diese Karte deinen Stall betritt, wähle eine Karte aus. Diese Karte wird zurück auf die Hand geschickt."
        }
    }, {
        title: "Narwhal Torpedo",
        expansions: ["base_game"],
        type: "narwhal",
        image: "narwhal_torpedo",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "auto",
                    info: {
                        key: "sacrifice_all_downgrades",
                    },
                    ui: { type: "none" }
                },
            }],
        description: {
            en: "When this card enters your Stable, SACRIFICE all Downgrade cards in your Stable.",
            de: "Wenn diese Karte deinen Stall betritt, opfere alle Downgradekarten in deinem Stall."
        }
    }, {
        title: "Necromancer Unicorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "necromancer_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "discard",
                                            info: { count: 2, type: "unicorn" }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Discard 2 cards" } }
                                    }]
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "revive",
                                            info: { type: "unicorn" }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Revive" } }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may DISCARD 2 Unicorn cards, then bring a Unicorn card from the discard pile into your Stable.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du zwei Einhörner aus deiner Hand abwerfen. Belebe ein Einhorn aus dem Friedhof wieder und füge das Einhorn deinem Stall hinzu."
        }
    }, {
        title: "Queen Bee Unicorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "queen_bee_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_effect",
                    info: { key: "basic_unicorns_can_only_join_your_stable" },
                    ui: { type: "none" }
                }
            }],
        description: {
            en: "Basic Unicorn cards cannot enter any player's Stable except yours.",
            de: "Basic Einhörner können keinen Stall mehr betreten außer dein Stall."
        }
    }, {
        title: "Rainbow Unicorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "rainbow_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "bringToStable",
                                            info: { type: "basic_unicorn" }
                                        },
                                        ui: {
                                            type: "single_action_popup", info: { singleActionText: "Bring basic unicorn to stable" },
                                        }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may bring a Basic Unicorn card from your hand into your Stable.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du ein Basic Einhorn von deiner Hand in dein Stall bringen."
        }
    }, {
        title: "Rhinocorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "rhinocorn",
        count: 1,
        on: [{
                trigger: "begin_of_turn",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "destroy",
                                            info: { type: "unicorn" }
                                        },
                                        ui: {
                                            type: "card_to_card"
                                        }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: true,
                    }
                }
            }],
        description: {
            en: "If this card is in your Stable at the beginning of your turn, you may DESTROY a Unicorn card. If you do, immediately end your turn.",
            de: "Ist diese Karte am Anfang deiner Runde in deinem Stall, darfst du ein Einhorn zerstören. Du musst danach dein Zug sofort beenden."
        }
    }, {
        title: "Seductive Unicorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "seductive_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "discard",
                                            info: { count: 1, type: "any" }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Discard to steal" } }
                                    }]
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "steal",
                                            info: { type: "unicorn" }
                                        },
                                        ui: {
                                            type: "card_to_card"
                                        }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may DISCARD a card, then STEAL a Unicorn card.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du eine Karte von deiner Hand abwerfen, um ein Einhorn zu stehlen."
        }
    }, {
        title: "Shabby the Narwhal",
        expansions: ["base_game"],
        type: "narwhal",
        image: "shabby_the_narwhal",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "search",
                                            info: { type: "downgrade" }
                                        },
                                        ui: {
                                            type: "single_action_popup", info: { singleActionText: "Search" }
                                        }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may search the deck for a Downgrade card and add it to your hand, then shuffle the deck.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du nach einer Downgradekarte im Deck suchen und sie deiner Hand hinzufügen."
        }
    }, {
        title: "Vagabond Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "unicorn",
        image: "vagabond_unicorn",
        count: 1,
        on: [{
                trigger: "begin_of_turn",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "discard",
                                            info: { type: "any", count: 1 }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Discard to pull" } }
                                    }]
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "pullRandom",
                                        },
                                        ui: { type: "card_to_player" }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "If this is in your Stable at the beginning of your turn, you may DISCARD a card, then pull a card at random from another player's hand.",
            de: "Wenn diese Karte am Anfang deiner Runde in deinem Stall ist, darfst du eine Karte abwerfen, um eine zufällige Handkarte eines Spielers stehlen."
        }
    }, {
        title: "Survivalist Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "unicorn",
        image: "survivalist_unicorn",
        count: 1,
        on: [{
                trigger: "begin_of_turn",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "discard",
                                            info: { type: "any", count: 1 }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Discard to pull" } }
                                    }]
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "sacrifice", info: { type: "downgrade" }
                                        },
                                        ui: { type: "card_to_card" }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "If this card is in your Stable at the beginning of your turn, you may DISCARD a card, then SACRIFICE a Downgrade card.",
            de: "Wenn diese Karte am Anfang deiner Runde in deinem Stall ist, darfst du eine Karte von deiner Hand abwerfen, um eine Downgradekarte zu opfern."
        }
    }, {
        title: "Bungee Jumping Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "unicorn",
        image: "bungee_jumping_unicorn",
        count: 1,
        on: [{
                trigger: "this_destroyed_or_sacrificed",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                // when there are two instructions for the same protagonist, the protagonist must execute exactly one
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "sacrifice",
                                            info: { type: "downgrade" }
                                        },
                                        ui: { type: "click_on_card_in_stable" }
                                    }, {
                                        protagonist: "owner",
                                        do: {
                                            key: "returnSelf"
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Return to hand" } }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "If this card is sacrificed or destroyed, you may SACRIFICE a Downgrade card OR return this card to your hand.",
            de: "Wenn diese Karte geopfert oder zerstört wird, darfst du eine Downgradekarte opfern ODER diese Karte auf deine Hand zurücknehmen."
        }
    }, {
        title: "Cutthroat Captain Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "unicorn",
        image: "cutthroat_captain_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                // two instructions: player picks one
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "steal",
                                            info: { type: "baby" }
                                        },
                                        ui: { type: "card_to_card" }
                                    }, {
                                        protagonist: "owner",
                                        do: {
                                            key: "revive",
                                            info: { type: "basic_unicorn" }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Revive Basic Unicorn" } }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may: STEAL a Baby Unicorn card. OR Bring a Basic Unicorn card from the discard pile into your Stable.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du: Ein Babyeinhorn STEHLEN. ODER Ein Basic Einhorn vom Ablagestapel in deinen Stall legen."
        }
    }, {
        title: "Extreme Adventurer Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "unicorn",
        image: "extreme_adventurer_unicorn",
        count: 1,
        passive: ["basic_unicorns_cannot_enter"],
        on: [{
                trigger: "begin_of_turn",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "draw",
                                            info: { count: 1 }
                                        },
                                        ui: { type: "click_on_drawPile" }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "Basic Unicorn cards cannot enter your Stable. If this card is in your Stable at the beginning of your turn, you may DRAW a card.",
            de: "Basic Einhörner können deinen Stall nicht betreten. Wenn diese Karte am Anfang deiner Runde in deinem Stall ist, darfst du eine Karte ziehen."
        }
    }, {
        title: "Fearless Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "unicorn",
        image: "fearless_unicorn",
        count: 1,
        on: [{
                trigger: "this_destroyed_or_sacrificed",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "addFromDiscardPileToHand",
                                            info: { type: "neigh" }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Add Instant card" } }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "If this card is sacrificed or destroyed, you may add an Instant card from the discard pile to your hand.",
            de: "Wenn diese Karte geopfert oder zerstört wird, darfst du eine Sofortkarte vom Ablagestapel auf deine Hand nehmen."
        }
    }, {
        title: "First Mer-Mate Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "unicorn",
        image: "first_mer_mate_unicorn",
        count: 1,
        on: [{
                trigger: "this_destroyed_or_sacrificed",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                // two instructions: player picks one
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "draw",
                                            info: { count: 2 }
                                        },
                                        ui: { type: "click_on_drawPile" }
                                    }, {
                                        protagonist: "owner",
                                        do: {
                                            key: "bringToStable",
                                            info: { type: "basic_unicorn" }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Bring Basic Unicorn to Stable" } }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "If this card is sacrificed or destroyed, you may: DRAW 2 cards. OR Bring a Basic Unicorn card from your hand into your Stable.",
            de: "Wenn diese Karte geopfert oder zerstört wird, darfst du: 2 Karten ZIEHEN. ODER Ein Basic Einhorn von deiner Hand in deinen Stall legen."
        }
    }, {
        title: "Fisherman Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "unicorn",
        image: "fisherman_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "blatantThievery1",
                                        },
                                        ui: { type: "card_to_player" }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may look at another player's hand. Choose a card and add it to your hand.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du die Hand eines Mitspielers ansehen. Wähle eine Karte und nimm sie auf deine Hand."
        }
    }, {
        title: "Hornswoggler Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "unicorn",
        image: "hornswoggler_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                // two instructions: player picks one
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "draw",
                                            info: { count: 3 }
                                        },
                                        ui: { type: "click_on_drawPile" }
                                    }, {
                                        protagonist: "owner",
                                        do: {
                                            key: "swapHands",
                                        },
                                        ui: { type: "card_to_player" }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may: DISCARD your hand, then DRAW 3 cards. OR Trade hands with any other player.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du: Deine Hand abwerfen und dann 3 Karten ZIEHEN. ODER Tausche deine Hand mit einem anderen Spieler."
        }
    }, {
        title: "Pillaging Pirate Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "unicorn",
        image: "pillaging_pirate_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                // two instructions: player picks one
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "steal",
                                            info: { type: "upgrade" }
                                        },
                                        ui: { type: "card_to_card" }
                                    }, {
                                        protagonist: "owner",
                                        do: {
                                            key: "move",
                                            info: { type: "upgradeAndDowngrade" }
                                        },
                                        ui: { type: "card_to_card" }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may: STEAL an Upgrade card. OR Move a Downgrade card in your Stable to another player's Stable.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du: Eine Upgradekarte STEHLEN. ODER Eine Downgradekarte aus deinem Stall in den Stall eines anderen Spielers verschieben."
        }
    }, {
        title: "Salty Seadogicorn",
        expansions: ["adventures_2nd_edition"],
        type: "unicorn",
        image: "salty_seadogicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                // two instructions: player picks one
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "makeSomeoneDiscard",
                                        },
                                        ui: { type: "card_to_player" }
                                    }, {
                                        protagonist: "owner",
                                        do: {
                                            key: "draw",
                                            info: { count: 1 }
                                        },
                                        ui: { type: "click_on_drawPile" }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may: Force each other player to DISCARD a card. OR DRAW a card.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du: Jeden anderen Spieler zwingen eine Karte ABZUWERFEN. ODER Eine Karte ZIEHEN."
        }
    }, {
        title: "Stowaway Unicorn",
        expansions: ["adventures_2nd_edition"],
        type: "unicorn",
        image: "stowaway_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "stowawaydraw",
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Draw and reveal" } }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may DRAW a card and reveal it. If it is a Unicorn, Upgrade, or Downgrade card, bring it into your Stable.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du eine Karte ZIEHEN und aufdecken. Wenn es ein Einhorn, Upgrade oder Downgrade ist, lege es in deinen Stall."
        }
    }, {
        title: "Zombie Unicorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "zombie",
        count: 1,
        on: [{
                trigger: "begin_of_turn",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "discard",
                                            info: { type: "any", count: 1 }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Discard to revive" } }
                                    }]
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "revive", info: { type: "unicorn" }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Revive" } }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: true
                    }
                }
            }],
        description: {
            en: "If this card is in your Stable at the beginning of your turn, you may DISCARD a Unicorn card. If you do, choose a Unicorn card from the discard pile and bring it directly into your Stable.",
            de: "Wenn diese Karte am Anfang deiner Runde in deinem Stall ist, darfst du ein Einhorn von deiner Hand abwerfen. Belebe ein Einhorn vom Friedhof wieder und lege es in deinem Stall."
        }
    }, {
        title: "Swift Flying Unicorn",
        expansions: ["base_game"],
        type: "unicorn",
        image: "swift_flying_unicorn",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "addFromDiscardPileToHand",
                                            info: { type: "neigh" }
                                        },
                                        ui: {
                                            type: "single_action_popup",
                                            info: { singleActionText: "Add Neigh card" }
                                        }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }, {
                trigger: "this_destroyed_or_sacrificed",
                do: {
                    type: "return_to_hand",
                }
            }],
        description: {
            en: "When this card enters your Stable, you may add a Neigh card from the discard pile to your hand. If this card is sacrificed or destroyed, return it to your hand.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du eine Neighkarte aus dem Friedhof deiner Hand hinzufügen. 👼 Wenn diese Karte geopfert oder zerstört wird, kommt sie stattdessen auf deine Hand zurück."
        }
    }, {
        title: "The Great Narwhal",
        expansions: ["base_game"],
        type: "narwhal",
        image: "the_great_narwhal",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "search",
                                            info: { type: "narwhal" }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Search" } }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, you may search the deck for a card with Narwhal in its name and add it to your hand, then shuffle the deck.",
            de: "Wenn diese Karte deinen Stall betritt, darfst du eine Narwhalkarte aus dem Deck deiner Hand hinzufügen."
        }
    }, {
        title: "Unicorn on the Cob",
        expansions: ["base_game"],
        type: "unicorn",
        image: "unicorn_on_the_cob",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "draw",
                                            info: { count: 2 }
                                        },
                                        ui: { type: "click_on_drawPile" }
                                    }]
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "discard",
                                            info: { count: 1, type: "any" }
                                        },
                                        ui: { type: "click_on_own_card_in_hand" }
                                    }]
                            }],
                        mandatory: true,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "When this card enters your Stable, DRAW 2 cards and DISCARD a card.",
            de: "Wenn diese Karte deinen Stall betritt, ziehe zwei Karten und werfe eine Karte von deiner Hand ab."
        }
    }, {
        title: "Neigh",
        expansions: ["base_game"],
        type: "neigh",
        image: "neigh",
        count: 14,
        description: {
            en: "Play this card when another player tries to play a card. Stop their card from being played and send it to the discard pile.",
            de: "Neigh die Karte eines Spielers. Die Karte hat dann keinen Effekt mehr und wird auf den Friedhof gelegt."
        }
    }, {
        title: "Super Neigh",
        expansions: ["base_game"],
        type: "super_neigh",
        image: "super_neigh",
        count: 1,
        description: {
            en: "Play this card when another player tries to play a card. Stop their card from being played and send it to the discard pile. This card cannot be Neigh'd.",
            de: "Neigh die Karte eines Spielers. Die Karte hat dann keinen Effekt mehr und wird auf den Friedhof gelegt. Diese Karte kann nicht geneight werden."
        }
    }, {
        title: "Yay",
        expansions: ["base_game"],
        type: "upgrade",
        image: "yay",
        count: 2,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_effect",
                    info: { key: "your_cards_cannot_be_neighed" },
                    ui: { type: "none" }
                }
            }],
        description: {
            en: "Cards you play cannot be Neigh'd.",
            de: "Deine Karten können nicht geneight werden."
        }
    }, {
        title: "Stable Artillery",
        expansions: ["base_game"],
        type: "upgrade",
        image: "stable_artillery",
        count: 3,
        on: [{
                trigger: "begin_of_turn",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "discard",
                                            info: { count: 2, type: "any" }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Discard 2 cards" } }
                                    }]
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "destroy",
                                            info: { type: "unicorn" }
                                        },
                                        ui: { type: "click_on_card_in_stable" }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "If this card is in your Stable at the beginning of your turn, you may DISCARD 2 cards, then DESTROY a Unicorn card.",
            de: "Wenn diese Karte am Anfang deiner Runde in deinem Stall ist, darfst du zwei Karten von deiner Hand abwerfen, um ein Einhorn zu zerstören."
        }
    }, {
        title: "Rainbow Lasso",
        expansions: ["base_game"],
        type: "upgrade",
        image: "rainbow_lasso",
        count: 1,
        on: [{
                trigger: "begin_of_turn",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "discard",
                                            info: { count: 3, type: "any" }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Discard 3 cards to steal" } }
                                    }]
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "steal",
                                            info: { type: "unicorn" }
                                        },
                                        ui: { type: "card_to_card" }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "If this card is in your Stable at the beginning of your turn, you may DISCARD 3 cards, then STEAL a Unicorn card.",
            de: "Wenn diese Karte am Anfang deiner Runde in deinem Stall ist, darfst du drei Karten von deiner Hand abwerfen, um ein Einhorn zu stehlen."
        }
    }, {
        title: "Rainbow Aura",
        expansions: ["base_game"],
        type: "upgrade",
        image: "rainbow_aura",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_effect",
                    info: { key: "your_unicorns_cannot_be_destroyed" },
                    ui: { type: "none" }
                }
            }],
        description: {
            en: "Your Unicorn cards cannot be destroyed.",
            de: "Deine Einhörner können nicht zerstört werden",
        }
    }, {
        title: "Glitter Bomb",
        expansions: ["base_game"],
        type: "upgrade",
        image: "glitter_bomb",
        count: 2,
        on: [{
                trigger: "begin_of_turn",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "sacrifice",
                                            info: { type: "any" }
                                        },
                                        ui: { type: "card_to_card" }
                                    }]
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "destroy",
                                            info: { type: "any" }
                                        },
                                        ui: { type: "click_on_card_in_stable" }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "If this card is in your Stable at the beginning of your turn, you may SACRIFICE a card, then DESTROY a card.",
            de: "Wenn diese Karte am Anfang deiner Runde in deinem Stall ist, darfst du eine Karte opfern. Zerstöre dann eine Karte."
        }
    }, {
        title: "Double Dutch",
        expansions: ["base_game"],
        type: "upgrade",
        image: "double_dutch",
        count: 1,
        on: [{
                trigger: "begin_of_turn",
                do: {
                    type: "add_effect",
                    info: { key: "double_dutch" },
                    ui: { type: "none" }
                }
            }],
        description: {
            en: "If this card is in your Stable at the beginning of your turn, you may play 2 cards during your Action phase.",
            de: "Wenn diese Karte am Anfang deiner Runde in deinem Stall ist, darfst du zwei Karten während deiner Aktionsphase spielen."
        }
    }, {
        title: "Claw Machine",
        expansions: ["base_game"],
        type: "upgrade",
        image: "claw_machine",
        count: 3,
        on: [{
                trigger: "begin_of_turn",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "discard",
                                            info: { type: "any", count: 1 }
                                        },
                                        ui: { type: "single_action_popup", info: {
                                                singleActionText: "Discard to draw"
                                            } }
                                    }]
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "draw",
                                            info: { count: 1 }
                                        },
                                        ui: { type: "click_on_drawPile" }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "If this card is in your Stable at the beginning of your turn, you may DISCARD a card, then DRAW a card.",
            de: "Wenn diese Karte am Anfang deiner Runde in deinem Stall ist, darfst du eine Karte abwerfen. Du darfst dann eine Karte ziehen."
        }
    }, {
        title: "Caffeine Overload",
        expansions: ["base_game"],
        type: "upgrade",
        image: "caffeine_overload",
        count: 1,
        on: [{
                trigger: "begin_of_turn",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "sacrifice",
                                            info: { type: "any" }
                                        },
                                        ui: { type: "card_to_card" }
                                    }]
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "draw",
                                            info: { count: 2 }
                                        },
                                        ui: { type: "click_on_drawPile" }
                                    }]
                            }],
                        mandatory: false,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "If this card is in your Stable at the beginning of your turn, you may SACRIFICE a card, then DRAW 2 cards.",
            de: "Wenn diese Karte am Anfang deiner Runde in deinem Stall ist, darfst du eine Karte opfern, um zwei Karten zu ziehen."
        }
    }, {
        title: "Barbed Wire",
        expansions: ["base_game"],
        type: "downgrade",
        image: "barbed_wire",
        count: 1,
        on: [{
                trigger: "unicorn_enters_your_stable",
                do: {
                    type: "inject_action",
                    info: {
                        instruction: {
                            do: {
                                key: "discard",
                                info: { count: 1, type: "any" }
                            },
                            ui: { type: "click_on_own_card_in_hand" }
                        }
                    }
                }
            }, {
                trigger: "unicorn_leaves_your_stable",
                do: {
                    type: "inject_action",
                    info: {
                        instruction: {
                            do: {
                                key: "discard",
                                info: { count: 1, type: "any" }
                            },
                            ui: { type: "click_on_own_card_in_hand" }
                        }
                    }
                }
            }],
        description: {
            en: "Each time a Unicorn card enters or leaves your Stable, DISCARD a card.",
            de: "Immer wenn ein Einhorn dein Stall betritt oder verlässt, musst du eine Karte abwerfen."
        }
    }, {
        title: "Blinding Light",
        expansions: ["base_game"],
        type: "downgrade",
        image: "blinding_light",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_effect",
                    info: { key: "my_unicorns_are_basic" },
                    ui: { type: "none" }
                }
            }],
        description: {
            en: "All of your Unicorn cards are considered Basic Unicorns with no effects.",
            de: "Alle deiner Einhörner haben keinen Effekt und gelten als Basiceinhörner."
        }
    }, {
        title: "Broken Stable",
        expansions: ["base_game"],
        type: "downgrade",
        image: "broken_stable",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_effect",
                    info: { key: "you_cannot_play_upgrades" },
                    ui: { type: "none" }
                }
            }],
        description: {
            en: "You cannot play Upgrade cards.",
            de: "Du kannst keine Upgradekarten spielen"
        }
    }, {
        title: "Pandamonium",
        expansions: ["base_game"],
        type: "downgrade",
        image: "pandamonium",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_effect",
                    info: { key: "pandamonium" },
                    ui: { type: "none" }
                }
            }],
        description: {
            en: "All of your Unicorns are considered Pandas. Cards that affect Unicorn cards do not affect your Pandas.",
            de: "All deine Einhörner gelten als Pandas. Karten, die Einhörner betreffen, betreffen nicht deine Pandas."
        }
    }, {
        title: "Slowdown",
        expansions: ["base_game"],
        type: "downgrade",
        image: "slowdown",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_effect",
                    info: { key: "you_cannot_play_neigh" },
                    ui: { type: "none" }
                }
            }],
        description: {
            en: "You cannot play Neigh cards.",
            de: "Du kannst keine Neighkarten spielen"
        }
    }, {
        title: "Tiny Stable",
        expansions: ["base_game"],
        type: "downgrade",
        image: "tiny_stable",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_effect",
                    info: { key: "tiny_stable" },
                    ui: { type: "none" }
                }
            }],
        description: {
            en: "If at any time you have more than 5 Unicorns in your Stable, SACRIFICE a Unicorn card.",
            de: "Wenn dein Stall mehr als 5 Einhörner umfasst, opfere ein Einhorn."
        }
    }, {
        title: "Unicorn Poison",
        expansions: ["base_game"],
        type: "magic",
        image: "unicorn_poison",
        count: 3,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: { key: "destroy", info: { type: "unicorn" } },
                                        ui: {
                                            type: "card_to_card",
                                        }
                                    }],
                            }],
                        mandatory: true,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "DESTROY a Unicorn card.",
            de: "Zerstöre ein Einhorn"
        }
    }, {
        title: "Alignment Change",
        expansions: ["base_game"],
        type: "magic",
        image: "alignment_change",
        count: 2,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: { key: "discard", info: { type: "any", count: 2 } },
                                        ui: {
                                            type: "single_action_popup", info: { singleActionText: "Discard to steal" },
                                        }
                                    }],
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: { key: "steal", info: { type: "unicorn" } },
                                        ui: {
                                            type: "card_to_card",
                                        }
                                    }],
                            }],
                        mandatory: true,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "DISCARD 2 cards, then STEAL a Unicorn card.",
            de: "Werfe zwei Handkarten ab, und zerstöre ein Einhorn"
        }
    }, {
        title: "Unfair Bargain",
        expansions: ["base_game"],
        type: "magic",
        image: "unfair_bargain",
        count: 2,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: { key: "swapHands" },
                                        ui: {
                                            type: "card_to_player",
                                        }
                                    }],
                            }],
                        mandatory: true,
                        endTurnImmediately: false
                    }
                }
            }],
        description: {
            en: "Trade hands with any other player.",
            de: "Tausche deine Handkarte mit jemandem."
        }
    }, {
        title: "Two-For-One",
        expansions: ["base_game"],
        type: "magic",
        image: "two-for-one",
        count: 2,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "sacrifice",
                                            info: { type: "any" }
                                        },
                                        ui: { type: "card_to_card" }
                                    }]
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "destroy",
                                            info: { type: "any", count: 2 }
                                        },
                                        ui: { type: "card_to_card" }
                                    }]
                            }],
                        mandatory: true,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "SACRIFICE a card, then DESTROY 2 cards.",
            de: "Opfere eine Karte und zerstöre zwei Karten."
        }
    }, {
        title: "Targeted Destruction",
        expansions: ["base_game"],
        type: "magic",
        image: "targeted_destruction",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "destroy",
                                            info: { type: "my_downgrade_other_upgrade" }
                                        },
                                        ui: { type: "card_to_card" }
                                    }]
                            }],
                        mandatory: true,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "DESTROY an Upgrade card or SACRIFICE a Downgrade card.",
            de: "Zerstöre eine Upgradekarte oder opfere eine Downgradekarte."
        }
    }, {
        title: "Shake Up",
        expansions: ["base_game"],
        type: "magic",
        image: "shake_up",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "shakeUp",
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "SHAKE IT UUUUP" } }
                                    }]
                            }],
                        mandatory: true,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "Shuffle this card, your hand, and the discard pile into the deck. DRAW 5 cards.",
            de: "Lege deine Hand und diese Karte und den Friedhof in das Deck. Mische das Deck. Zeihe 5 Karten."
        }
    }, {
        title: "Reset Button",
        expansions: ["base_game"],
        type: "magic",
        image: "reset_button",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "reset",
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Let's reset the game! Yay!" } }
                                    }]
                            }],
                        mandatory: true,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "Each player (including you) must SACRIFICE all Upgrade and Downgrade cards in their Stable. Shuffle the discard pile into the deck.",
            de: "Jeder Spieler (auch du) muss alle Upgrade und Downgradekarten opfern. Mische den Friedhof in das Deck."
        }
    }, {
        title: "Mystical Vortex",
        expansions: ["base_game"],
        type: "magic",
        image: "mystical_vortex",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "all",
                                        do: {
                                            key: "discard",
                                            info: { type: "any", count: 1 }
                                        },
                                        ui: { type: "click_on_own_card_in_hand" }
                                    }]
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "shuffleDiscardPileIntoDrawPile",
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Shuffle" } }
                                    }]
                            }],
                        mandatory: true,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "Each player (including you) must DISCARD a card. Shuffle the discard pile into the deck.",
            de: "Jeder Spieler (auch du) muss eine Handkarte abwerfen. Mische den Friedhof in das Deck"
        }
    }, {
        title: "Kiss of Life",
        expansions: ["base_game"],
        type: "magic",
        image: "kiss_of_life",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "revive",
                                            info: { type: "unicorn" }
                                        },
                                        ui: { type: "single_action_popup", info: { singleActionText: "Revive" } }
                                    }]
                            }],
                        mandatory: true,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "Bring a Unicorn card from the discard pile into your Stable.",
            de: "Belebe ein Einhorn von dem Friedhof wieder und lege das Einhorn in deinen Stall."
        }
    }, {
        title: "Good Deal",
        expansions: ["base_game"],
        type: "magic",
        image: "good_deal",
        count: 1,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "draw",
                                            info: { count: 3 }
                                        },
                                        ui: { type: "click_on_drawPile" }
                                    }]
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "discard",
                                            info: { count: 1, type: "any" }
                                        },
                                        ui: { type: "click_on_own_card_in_hand" }
                                    }]
                            }],
                        mandatory: true,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "DRAW 3 cards and DISCARD a card.",
            de: "Ziehe 3 Karten und werfe eine Handkarte ab."
        }
    }, {
        title: "Change of Luck",
        expansions: ["base_game"],
        type: "magic",
        image: "change_of_luck",
        count: 2,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "draw",
                                            info: { count: 2 }
                                        },
                                        ui: { type: "click_on_drawPile" }
                                    }]
                            }, {
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "discard",
                                            info: { count: 3, type: "any", changeOfLuck: true }
                                        },
                                        ui: { type: "click_on_own_card_in_hand" }
                                    }]
                            }],
                        mandatory: true,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "DRAW 2 cards and DISCARD 3 cards, then take another turn.",
            de: "Ziehe zwei Karten und werfe 3 Handkarten ab. Du kannst dann einen erneuten Zug machen."
        }
    }, {
        title: "Back Kick",
        expansions: ["base_game"],
        type: "magic",
        image: "back_kick",
        count: 3,
        on: [{
                trigger: "enter",
                do: {
                    type: "add_scene",
                    info: {
                        actions: [{
                                instructions: [{
                                        protagonist: "owner",
                                        do: {
                                            key: "backKick",
                                        },
                                        ui: { type: "card_to_card" }
                                    }]
                            }],
                        mandatory: true,
                        endTurnImmediately: false,
                    }
                }
            }],
        description: {
            en: "Return a card in another player's Stable to their hand. That player must DISCARD a card.",
            de: "Schicke eine Karte zurück auf die Hand des Besitzers. Der Besitzer muss eine Karte abwerfen."
        }
    }, {
        title: "Basic Unicorn",
        expansions: ["base_game"],
        type: "basic",
        image: "basic0",
        count: 3,
        on: [],
        description: {
            en: "Beards are like, so hot.",
            de: "Bärte sind soooo heiß."
        }
    }, {
        title: "Basic Unicorn",
        expansions: ["base_game"],
        type: "basic",
        image: "basic1",
        count: 3,
        on: [],
        description: {
            en: "Pumpkin spice is the pumpkin spice of life.",
            de: "Kürbisse sind lecker"
        }
    }, {
        title: "Basic Unicorn",
        expansions: ["base_game"],
        type: "basic",
        image: "basic2",
        count: 3,
        on: [],
        description: {
            en: "Dance like nobody's watching.",
            de: "Tanze als würde niemand zuschauen."
        }
    }, {
        title: "Basic Unicorn",
        expansions: ["base_game"],
        type: "basic",
        image: "basic3",
        count: 3,
        on: [],
        description: {
            en: "Vinyl records and mixtapes only.",
            de: "Oldschoooool musik"
        }
    }, {
        title: "Basic Unicorn",
        expansions: ["base_game"],
        type: "basic",
        image: "basic4",
        count: 3,
        on: [],
        description: {
            en: "Popped collars are for date nights only.",
            de: "Kragen trägt man nur auf Dates"
        }
    }, {
        title: "Basic Unicorn",
        expansions: ["base_game"],
        type: "basic",
        image: "basic5",
        count: 3,
        on: [],
        description: {
            en: "💖🙌💅🙌💖💁💁😂😂😂",
            de: "💖🙌💅🙌💖💁💁😂😂😂",
        }
    }, {
        title: "Basic Unicorn",
        expansions: ["base_game"],
        type: "basic",
        image: "basic6",
        count: 3,
        on: [],
        description: {
            en: "#nomakeup #nofilter #sunnies #shameless #selfie #basic #TGIF # unicornhairdontcare",
            de: "#nomakeup #nofilter #sonne #schamlos #selfie #basic #TGIF # unicornhairdontcare"
        }
    }, {
        title: "Narwhal",
        expansions: ["base_game"],
        type: ["basic", "narwhal"],
        image: "basic7",
        count: 3,
        on: [],
        description: {
            en: "This card has no special powers, but it sure is cute!",
            de: "Diese Karte hat keine Kräft, aber süß ist sie!"
        }
    }];
function initializeDeck(expansions = ["base_game"]) {
    const deck = [];
    let currentId = 0;
    const filteredCards = Cards.filter(c => c.expansions.some(e => expansions.includes(e)));
    for (const card of filteredCards) {
        for (let i = 0; i < card.count; i++) {
            deck.push({
                id: currentId++,
                title: card.title,
                on: card.on,
                passive: card.passive,
                expansions: card.expansions,
                type: card.type,
                image: card.image,
                description: card.description,
            });
        }
    }
    return deck;
}
// Helper
function isUnicorn(card) {
    return hasType(card, "baby") || hasType(card, "basic") || hasType(card, "unicorn") || hasType(card, "narwhal");
}
