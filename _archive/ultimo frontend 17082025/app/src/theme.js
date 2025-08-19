// src/theme.js

import { createTheme } from '@mui/material/styles';

// Paleta de Cores inspirada no seu logo e site
const palette = {
  primary: {
    main: '#1E293B', // Azul-acinzentado escuro
  },
  secondary: {
    main: '#D4AF37', // Dourado (usamos um tom web-friendly)
  },
  background: {
    default: '#F8F9FA', // Fundo principal bem claro para contraste
    paper: '#FFFFFF',   // Fundo dos "cards" e tabelas
  },
  text: {
    primary: '#1E293B', // Cor de texto principal
    secondary: '#64748B', // Cor de texto secundária
  }
};

const theme = createTheme({
  palette: palette,
  typography: {
    fontFamily: 'Inter, sans-serif',
    h4: {
      fontWeight: 700,
      color: palette.primary.main,
    },
    h5: {
      fontWeight: 600,
      color: palette.primary.main,
    },
    h6: {
        fontWeight: 600,
        color: palette.primary.main,
    }
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: palette.primary.main, // O Header agora terá a cor principal
          color: '#FFFFFF', // Texto branco no Header
        },
      },
    },
    MuiButton: {
        styleOverrides: {
            // Botão principal usará o dourado
            containedPrimary: {
                backgroundColor: palette.secondary.main,
                color: palette.primary.main,
                fontWeight: 'bold',
                '&:hover': {
                    backgroundColor: '#C8A430',
                }
            },
            // Botão delineado usará o azul
            outlinedPrimary: {
                borderColor: palette.primary.main,
                color: palette.primary.main,
            }
        }
    },
    MuiDrawer: {
        styleOverrides: {
            paper: {
                backgroundColor: '#FFFFFF',
                borderRight: '1px solid #E2E8F0',
            }
        }
    }
  },
});

export default theme;