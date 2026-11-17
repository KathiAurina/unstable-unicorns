import type { CardType } from '../../game/cards/types';
import BACK from './UU-Back-Main.png';
import NeighIcon from './neigh-icon.png';
import MagicIcon from './star-icon.png';
import UnicornIcon from './unicorn-icon.png';
import UpgradeIcon from './upgrade-icon.png';
import DowngradeIcon from './downgrade-icon.png';


const ImageLoader = {
    count: () => {
        return require.context('./square', true).keys().length;
    },
    load: (key: string) => {
        if (key === "back") {
            return BACK;
        }
        return require(`./square/${key}.png`);
    },
    icon: (type: CardType) => {
        switch (type) {
            case "magic":
                return MagicIcon;
            case "upgrade":
                return UpgradeIcon;
            case "downgrade":
                return DowngradeIcon;
            case "instant":
                return NeighIcon;
            default:
                return UnicornIcon;
        }
    }
};

export default ImageLoader;
