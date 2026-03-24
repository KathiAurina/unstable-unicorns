import { createGlobalStyle } from 'styled-components';
import { Theme } from './theme';

const GlobalStyle = createGlobalStyle<{ theme: Theme }>`
    body {
        font-family: ${({ theme }) => theme.fonts.primary};
        background-color: ${({ theme }) => theme.colors.background};
        margin: 0;
        padding: 0;
    }
`;

export default GlobalStyle;
