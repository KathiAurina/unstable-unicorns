import type { CardType } from '../view/cards';
import { typeColor } from '../view/cards';

export function _typeToColor(type: CardType): string {
    return typeColor(type);
}
