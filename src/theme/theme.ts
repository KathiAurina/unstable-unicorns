export const theme = {
    colors: {
        background: '#F8F9FA',
        card: '#FFFFFF',
        activeBlue: '#4D96FF',
        divider: '#EEEEEE',
        textDark: '#333333',
        textMuted: '#666666',
        success: '#6BCB77',
    },
    gradients: {
        rainbow: 'linear-gradient(90deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF, #9B59B6)',
    },
    shadows: {
        card: '0 4px 20px rgba(0,0,0,0.05)',
        cardHover: '0 6px 24px rgba(0,0,0,0.08)',
    },
    radii: {
        card: '12px',
        cardLg: '16px',
        input: '8px',
        button: '8px',
        circle: '50%',
    },
    fonts: {
        primary: "'Nunito', sans-serif",
    },
    breakpoints: {
        mobile: '768px',
    },
} as const;

export type Theme = typeof theme;
