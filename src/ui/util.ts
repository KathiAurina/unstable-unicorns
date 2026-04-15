import type { CardType } from "../game/card";

export function _typeToColor(type: CardType | CardType[]): string {
    const t = Array.isArray(type) ? type[0] : type;
    if (t === "baby") return "#6C6D70";
    if (t === "basic") return "#6C6D70";
    if (t === "downgrade") return "#FCB820";
    if (t === "upgrade") return "#F57F22";
    if (t === "narwhal") return "#6C6D70";
    if (t === "neigh" || t === "super_neigh") return "#E94343";
    if (t === "magic") return "#88C652";
    if (t === "unicorn") return "#6C6D70";
    return "#000000";
}