import React from 'react';
import styled from 'styled-components';
import type { GameState } from '../game/engine';
import { cardView } from '../view/cards';
import type { Panel, PanelButton } from '../view/describe';
import CardNameToken from './CardNameToken';

type Props = {
    G: GameState;
    /** The blocks to show, from getPanels (view/describe.ts). */
    panels: Panel[];
    onPress: (button: PanelButton) => void;
};

// Renders the action panel: who asks, what is being decided, how to do it, and the buttons.
// All texts and buttons come from the shared view layer; nothing here knows about cards or prompts.
const ActionPanel = ({ G, panels, onPress }: Props) => {
    if (panels.length === 0) return null;

    return (
        <PanelWrapper>
            {panels.map(panel => {
                const Entry = panel.buttons.length > 0 ? ActionEntry : InfoEntry;
                return (
                    <Entry key={panel.key}>
                        {(panel.source !== undefined || panel.heading) && (
                            <EntryHeader>
                                <CardTitle>
                                    {panel.source !== undefined ? <CardNameToken card={cardView(G, panel.source)} /> : panel.heading}
                                </CardTitle>
                                {panel.title && <StepBadge>{panel.title}</StepBadge>}
                            </EntryHeader>
                        )}
                        {panel.source === undefined && !panel.heading && panel.title && <InfoText>{panel.title}</InfoText>}
                        {panel.text && <InfoText>{panel.text}</InfoText>}
                        {(panel.preview ?? []).map(line => <ActiveHint key={line}>{line}</ActiveHint>)}
                        {panel.buttons.length > 0 && (
                            <EntryBody>
                                {panel.buttons.map(button => {
                                    const Btn = button.tone === 'skip' ? SkipBtn : button.tone === 'cancel' ? CancelBtn : PrimaryBtn;
                                    return (
                                        <Btn
                                            key={button.key}
                                            disabled={button.disabled}
                                            title={button.hint}
                                            onClick={() => onPress(button)}
                                        >
                                            {button.label}
                                        </Btn>
                                    );
                                })}
                            </EntryBody>
                        )}
                    </Entry>
                );
            })}
        </PanelWrapper>
    );
};

export default ActionPanel;

// ── Styled components ──────────────────────────────────────────────────────────

const PanelWrapper = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 4000;
    pointer-events: none;
`;

const baseEntry = `
    pointer-events: all;
    background: rgba(12, 12, 26, 0.95);
    border-radius: 14px;
    padding: 14px 24px;
    min-width: 420px;
    max-width: 700px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-family: 'Nunito', sans-serif;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
`;

const ActionEntry = styled.div`
    ${baseEntry}
    border: 1.5px solid rgba(155, 89, 182, 0.7);
`;

const InfoEntry = styled.div`
    ${baseEntry}
    border: 1.5px solid rgba(80, 140, 240, 0.5);
`;

const EntryHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const CardTitle = styled.span`
    color: #d8c0ff;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
`;

const StepBadge = styled.span`
    margin-left: auto;
    background: rgba(155, 89, 182, 0.3);
    border: 1px solid rgba(155, 89, 182, 0.6);
    color: #c8a8f0;
    font-size: 10px;
    font-weight: 600;
    padding: 1px 8px;
    border-radius: 20px;
`;

const EntryBody = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const PrimaryBtn = styled.button`
    background: linear-gradient(135deg, #9b59b6, #6c3483);
    color: white;
    border: none;
    border-radius: 9px;
    padding: 9px 22px;
    font-size: 15px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s ease, transform 0.1s ease;
    &:hover { opacity: 0.88; transform: scale(1.03); }
    &:active { transform: scale(0.97); }
    &:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
`;

const SkipBtn = styled.button`
    background: transparent;
    color: #888;
    border: 1px solid #555;
    border-radius: 9px;
    padding: 7px 16px;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Nunito', sans-serif;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.15s ease, border-color 0.15s ease;
    &:hover { color: #ddd; border-color: #999; }
`;

const CancelBtn = styled.button`
    background: transparent;
    color: #e88;
    border: 1px solid #c66;
    border-radius: 7px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    font-family: 'Nunito', sans-serif;
    cursor: pointer;
    white-space: nowrap;
    &:hover { color: #faa; border-color: #f88; }
`;

const ActiveHint = styled.span`
    color: #a8d0ff;
    font-size: 12px;
    font-weight: 500;
    font-family: 'Nunito', sans-serif;
    flex: 1;
`;

const InfoText = styled.p`
    margin: 0;
    color: #b8cce8;
    font-size: 15px;
    font-weight: 500;
    line-height: 1.4;
    font-family: 'Nunito', sans-serif;
    b { color: #e0d0ff; font-weight: 700; }
`;

