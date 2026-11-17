import React from 'react';
import styled from 'styled-components';
import type { GameState } from '../game/engine';
import { cardName } from '../view/cards';
import type { Panel, PanelButton } from '../view/describe';

type Props = {
    G: GameState;
    /** The blocks of the action panel (board.panels). */
    panels: Panel[];
    onPress: (button: PanelButton) => void;
};

/** The buttons of one panel; disabled buttons are greyed and show why. */
export const MobilePanelButtons = ({ buttons, onPress }: { buttons: PanelButton[]; onPress: (button: PanelButton) => void }) => (
    <>
        {buttons.map(button => {
            const Btn = button.tone === 'primary' ? PrimaryBtn : SkipBtn;
            const press = () => { if (!button.disabled) onPress(button); };
            return (
                <ButtonWithHint key={button.key}>
                    <Btn
                        disabled={button.disabled === true}
                        onTouchEnd={e => { e.preventDefault(); e.stopPropagation(); press(); }}
                        onClick={e => { e.stopPropagation(); press(); }}
                    >
                        {button.label}
                    </Btn>
                    {button.disabled && button.hint && <Hint>{button.hint}</Hint>}
                </ButtonWithHint>
            );
        })}
    </>
);

// The action panel of the mobile board: a small floating bar above the hand with one entry per panel
// that has buttons (modes, Yes/No, Skip, Confirm, destination stables, begin-of-turn abilities …).
// Panels without buttons are plain text; the info bar already shows that line.
const MobileActionBar = ({ G, panels, onPress }: Props) => {
    const active = panels.filter(p => p.buttons.length > 0);
    if (active.length === 0) return null;

    return (
        <Bar>
            {active.map(panel => {
                const heading = panel.source !== undefined ? cardName(G, panel.source) : panel.heading;
                return (
                    <Entry key={panel.key}>
                        {(heading || panel.title) && (
                            <EntryText>
                                {heading && <Label>{heading}:</Label>}
                                {panel.title && <Title>{panel.title}</Title>}
                            </EntryText>
                        )}
                        {(panel.preview ?? []).map(line => <Preview key={line}>{line}</Preview>)}
                        <ButtonRow>
                            <MobilePanelButtons buttons={panel.buttons} onPress={onPress} />
                        </ButtonRow>
                    </Entry>
                );
            })}
        </Bar>
    );
};

const Bar = styled.div`
    position: fixed;
    bottom: 120px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 5px;
    z-index: 300;
    pointer-events: all;
    max-width: 90vw;
    max-height: 45vh;
    overflow-y: auto;
`;

const Entry = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: rgba(20, 20, 40, 0.94);
    border: 1.5px solid rgba(180, 120, 255, 0.6);
    border-radius: 8px;
    padding: 5px 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.5);
`;

const EntryText = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px;
`;

const Label = styled.span`
    color: #ccc;
    font-size: 10px;
    font-family: 'Nunito', sans-serif;
    white-space: nowrap;
`;

const Title = styled.span`
    color: white;
    font-size: 10px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
`;

const Preview = styled.div`
    color: rgba(255,255,255,0.55);
    font-size: 9px;
    font-style: italic;
    font-family: 'Nunito', sans-serif;
`;

const ButtonRow = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
`;

const ButtonWithHint = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
`;

const PrimaryBtn = styled.div<{ disabled: boolean }>`
    background: ${p => p.disabled ? 'rgba(255,255,255,0.12)' : 'linear-gradient(135deg, #9B59B6, #6C3483)'};
    color: ${p => p.disabled ? 'rgba(255,255,255,0.4)' : 'white'};
    border-radius: 6px;
    padding: 5px 9px;
    font-size: 11px;
    font-family: 'Nunito', sans-serif;
    font-weight: 700;
    cursor: ${p => p.disabled ? 'default' : 'pointer'};
    -webkit-tap-highlight-color: transparent;
    user-select: none;
`;

const SkipBtn = styled.div<{ disabled: boolean }>`
    color: ${p => p.disabled ? '#666' : '#bbb'};
    font-size: 11px;
    font-family: 'Nunito', sans-serif;
    cursor: ${p => p.disabled ? 'default' : 'pointer'};
    padding: 4px 8px;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    border: 1px solid #555;
    border-radius: 6px;
`;

const Hint = styled.div`
    color: rgba(255,255,255,0.45);
    font-size: 8px;
    font-family: 'Nunito', sans-serif;
    max-width: 120px;
    text-align: center;
`;

export default MobileActionBar;
