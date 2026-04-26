import { useState, useEffect } from 'react';

const STORAGE_KEY = 'uu_settings';

export type GameSettings = {
    autoEndTurn: boolean;
    autoDontNeigh: boolean;
};

const defaultSettings: GameSettings = {
    autoEndTurn: false,
    autoDontNeigh: false,
};

function loadSettings(): GameSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            return { ...defaultSettings, ...JSON.parse(raw) };
        }
    } catch {
        // ignore parse errors
    }
    return defaultSettings;
}

export function useGameSettings() {
    const [settings, setSettings] = useState<GameSettings>(loadSettings);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch {
            // ignore write errors
        }
    }, [settings]);

    const setAutoEndTurn = (v: boolean) => setSettings(s => ({ ...s, autoEndTurn: v }));
    const setAutoDontNeigh = (v: boolean) => setSettings(s => ({ ...s, autoDontNeigh: v }));

    return { ...settings, setAutoEndTurn, setAutoDontNeigh };
}
