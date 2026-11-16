import styled from 'styled-components';
import { useSandboxControl } from './sandboxContext';
import type { SandboxAction } from './sandboxContext';

function getActionText(action: SandboxAction): string | null {
    if (!action) return null;
    switch (action.type) {
        case 'bounce': return 'Click on a card in any stable to bounce it to hand';
        case 'destroy': return 'Click on a card in any stable to destroy it';
        case 'steal':
            return action.step === 'pick_card'
                ? 'Click on a card in any stable to steal'
                : 'Choose target player in the Sandbox panel';
        case 'move_to_stable':
            return action.step === 'pick_card'
                ? 'Click on a card in your hand to move it to a stable'
                : 'Choose target stable in the Sandbox panel';
        case 'force_discard':
            return 'Pick a card to discard in the Sandbox panel';
        default: return null;
    }
}

const SandboxActionBanner = () => {
    const { sandboxAction, setSandboxAction } = useSandboxControl();
    const text = getActionText(sandboxAction);
    if (!text) return null;

    return (
        <Banner>
            <BannerText>{text}</BannerText>
            <CancelBtn onClick={() => setSandboxAction(null)}>Cancel</CancelBtn>
        </Banner>
    );
};

const Banner = styled.div`
    position: fixed;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    z-index: 8000;
    background: linear-gradient(135deg, #2a1a4e 0%, #1a0f35 100%);
    border: 2px solid #7c4dff;
    border-top: none;
    border-radius: 0 0 12px 12px;
    padding: 10px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 20px rgba(124, 77, 255, 0.3);
`;

const BannerText = styled.span`
    color: #e0d0ff;
    font-size: 13px;
    font-weight: 600;
`;

const CancelBtn = styled.button`
    background: #3a1a1a;
    color: #ff8080;
    border: 1px solid #6a2a2a;
    border-radius: 5px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    &:hover { background: #5a2020; }
`;

export default SandboxActionBanner;
