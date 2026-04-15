import React, { useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import type { UnstableUnicornsGame, Ctx } from '../game/state';
import type { Moves } from '../game/types';
import type { PlayerID } from '../game/player';
import { _findOpenScenesWithProtagonist } from '../game/state';
import { LanguageContext } from '../LanguageContextProvider';

const API_URL = process.env.REACT_APP_LOBBY_URL || window.location.origin;

type Props = {
    isOpen: boolean;
    onClose: () => void;
    isOwner: boolean;
    isCurrentPlayer: boolean;
    playerID: PlayerID;
    G: UnstableUnicornsGame;
    ctx: Ctx;
    moves: Moves;
    autoEndTurn: boolean;
    setAutoEndTurn: (v: boolean) => void;
    autoDontNeigh: boolean;
    setAutoDontNeigh: (v: boolean) => void;
};

const EscapeMenu = ({ isOpen, onClose, isOwner, isCurrentPlayer, playerID, G, ctx, moves, autoEndTurn, setAutoEndTurn, autoDontNeigh, setAutoDontNeigh }: Props) => {
    const languageContext = useContext(LanguageContext);
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
    const supportsFullscreen = !!document.documentElement.requestFullscreen;

    useEffect(() => {
        const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    const handleToggleFullscreen = async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await document.documentElement.requestFullscreen();
            }
        } catch (e) {
            // Fullscreen API not supported or blocked (e.g. Safari iOS)
        }
    };

    if (!isOpen) return null;

    const handleLeaveGame = async () => {
        const pathParts = window.location.pathname.split('/');
        const matchID = pathParts[1];
        const searchParams = new URLSearchParams(window.location.search);
        const credentials = searchParams.get('credentials');

        try {
            await fetch(`${API_URL}/games/unstable_unicorns/${matchID}/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerID, credentials }),
            });
        } catch (e) {
            // proceed regardless
        }
        window.location.href = '/lobby';
    };

    const handleEndGame = () => {
        moves.abolishGame(playerID);
        onClose();
    };

    const handleForceEndTurn = () => {
        moves.end(ctx.currentPlayer);
        onClose();
    };

    const handleSkipAction = () => {
        const openScenes = _findOpenScenesWithProtagonist(G, ctx.currentPlayer);
        if (openScenes.length > 0) {
            const [instruction] = openScenes[0];
            moves.skipExecuteDo(ctx.currentPlayer, instruction.id);
        }
        onClose();
    };

    const showEmergencyButtons = isOwner || isCurrentPlayer;

    return (
        <Backdrop onClick={onClose}>
            <Modal onClick={e => e.stopPropagation()}>
                <Title>Menu</Title>

                <MenuButton onClick={handleLeaveGame}>
                    Leave Game
                </MenuButton>

                {isOwner && (
                    <DangerButton onClick={handleEndGame}>
                        End Game for Everyone
                    </DangerButton>
                )}

                {showEmergencyButtons && (
                    <>
                        <Divider />
                        <SectionLabel>Emergency</SectionLabel>
                        <MenuButton onClick={handleForceEndTurn}>
                            Force End Turn
                        </MenuButton>
                        <MenuButton onClick={handleSkipAction}>
                            Skip Current Action
                        </MenuButton>
                    </>
                )}

                <Divider />
                <SectionLabel>Automation</SectionLabel>
                <CheckboxRow>
                    <CheckboxLabel>
                        <input
                            type="checkbox"
                            checked={autoEndTurn}
                            onChange={e => setAutoEndTurn(e.target.checked)}
                        />
                        Automatically end turn when no actions remain
                    </CheckboxLabel>
                </CheckboxRow>
                <CheckboxRow>
                    <CheckboxLabel>
                        <input
                            type="checkbox"
                            checked={autoDontNeigh}
                            onChange={e => setAutoDontNeigh(e.target.checked)}
                        />
                        Automatically pass neigh discussion when not having a neigh card in hand
                    </CheckboxLabel>
                </CheckboxRow>

                <Divider />
                <SectionLabel>Language</SectionLabel>
                <LangRow>
                    <LangButton
                        $active={languageContext?.language === 'de'}
                        onClick={() => { languageContext?.setLanguage('de'); onClose(); }}
                    >
                        Deutsch
                    </LangButton>
                    <LangButton
                        $active={languageContext?.language === 'en'}
                        onClick={() => { languageContext?.setLanguage('en'); onClose(); }}
                    >
                        English
                    </LangButton>
                </LangRow>

                {supportsFullscreen && (
                    <>
                        <Divider />
                        <SectionLabel>Display</SectionLabel>
                        <MenuButton onClick={handleToggleFullscreen}>
                            {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                        </MenuButton>
                    </>
                )}

                <CloseButton onClick={onClose}>Close</CloseButton>
            </Modal>
        </Backdrop>
    );
};

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const Modal = styled.div`
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
    padding: 32px 36px;
    width: 320px;
    max-width: calc(100vw - 32px);
    max-height: 90dvh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;

    @media (max-height: 500px) {
        padding: 14px 18px;
        gap: 7px;
        border-radius: 12px;
    }
`;

const Title = styled.h2`
    font-size: 22px;
    font-weight: 800;
    color: #333;
    margin: 0 0 8px 0;
    text-align: center;

    @media (max-height: 500px) {
        font-size: 16px;
        margin: 0 0 2px 0;
    }
`;

const MenuButton = styled.button`
    width: 100%;
    padding: 12px;
    font-size: 14px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    background: linear-gradient(90deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF, #9B59B6);
    color: white;
    transition: transform 0.15s ease, box-shadow 0.15s ease;

    &:hover {
        transform: scale(1.02);
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
    }

    @media (max-height: 500px) {
        padding: 8px;
        font-size: 12px;
    }
`;

const DangerButton = styled(MenuButton)`
    background: linear-gradient(90deg, #cc3333, #ff6b6b);
`;

const Divider = styled.hr`
    border: none;
    border-top: 1px solid #eeeeee;
    margin: 4px 0;
`;

const SectionLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: -4px;
`;

const LangRow = styled.div`
    display: flex;
    gap: 8px;
`;

const LangButton = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 8px;
    font-size: 13px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    border: 2px solid ${({ $active }) => ($active ? '#4D96FF' : '#e0e0e0')};
    border-radius: 8px;
    cursor: pointer;
    background: ${({ $active }) => ($active ? '#eef4ff' : '#f9f9f9')};
    color: ${({ $active }) => ($active ? '#4D96FF' : '#888')};
    transition: border-color 0.15s ease, background 0.15s ease;

    &:hover {
        border-color: #4D96FF;
        color: #4D96FF;
    }
`;

const CloseButton = styled.button`
    width: 100%;
    padding: 10px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'Nunito', sans-serif;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    background: transparent;
    color: #888;
    margin-top: 4px;
    transition: border-color 0.15s ease;

    &:hover {
        border-color: #aaa;
        color: #555;
    }
`;

const CheckboxRow = styled.div`
    display: flex;
    align-items: flex-start;
`;

const CheckboxLabel = styled.label`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #555;
    cursor: pointer;
    line-height: 1.4;

    input[type="checkbox"] {
        margin-top: 2px;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        cursor: pointer;
        accent-color: #4D96FF;
    }
`;

export default EscapeMenu;
