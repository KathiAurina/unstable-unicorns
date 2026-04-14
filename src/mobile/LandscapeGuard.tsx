import React from 'react';
import styled from 'styled-components';

// Shown only on touch devices in portrait orientation via CSS media query.
const Overlay = styled.div`
    display: none;

    @media (pointer: coarse) and (orientation: portrait) {
        display: flex;
    }

    position: fixed;
    inset: 0;
    background: #1a1a2e;
    z-index: 100000;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    font-family: 'Nunito', sans-serif;
    font-size: 18px;
    font-weight: 700;
    text-align: center;
    padding: 2rem;
    gap: 1.2rem;
`;

const RotateGraphic = styled.div`
    width: 56px;
    height: 56px;
    border: 4px solid white;
    border-radius: 8px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;

    &::before {
        content: '';
        width: 30px;
        height: 18px;
        border: 3px solid white;
        border-radius: 3px;
        display: block;
    }

    &::after {
        content: '';
        position: absolute;
        bottom: -14px;
        right: -14px;
        width: 20px;
        height: 20px;
        border: 3px solid white;
        border-top: none;
        border-left: none;
        border-radius: 0 6px 6px 0;
        transform: rotate(-30deg);
    }
`;

const LandscapeGuard = () => (
    <Overlay>
        <RotateGraphic />
        <div>Please rotate your device to landscape mode to play</div>
    </Overlay>
);

export default LandscapeGuard;
