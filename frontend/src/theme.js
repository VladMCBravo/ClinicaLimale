// src/theme.js
import { createTheme } from '@mui/material/styles';
// A LINHA ABAIXO FOI REMOVIDA PARA CORRIGIR O ERRO NO VERCEL:
// import { ptBR } from '@mui/material/locale';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1a233b',
        },
        secondary: {
            main: '#c0a46f',
        },
        background: {
            default: '#f4f7fa',
        },
    },
    typography: {
        fontFamily: "'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif",
        fontSize: 13,
        h5: {
            fontWeight: 600,
            fontSize: '1.25rem',
        },
        h6: {
            fontWeight: 600,
            fontSize: '1.1rem',
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    components: {
        MuiButton: {
            defaultProps: {
                size: 'small',
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    padding: '6px 16px',
                },
            },
        },
        MuiTextField: {
            defaultProps: {
                size: 'small',
                variant: 'outlined',
            },
        },
        MuiSelect: {
            defaultProps: {
                size: 'small',
            },
        },
        MuiFormControl: {
            defaultProps: {
                size: 'small',
                margin: 'dense',
            },
        },
        MuiInputLabel: {
            defaultProps: {
                margin: 'dense',
            },
            styleOverrides: {
                root: {
                    fontSize: '0.9rem',
                },
            },
        },
        MuiIconButton: {
            defaultProps: {
                size: 'small',
            },
        },
        MuiTable: {
            defaultProps: {
                size: 'small',
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    padding: '8px 16px',
                },
                head: {
                    fontWeight: 600,
                    backgroundColor: '#f8f9fa',
                },
            },
        },
        MuiDialogTitle: {
            styleOverrides: {
                root: {
                    fontSize: '1.1rem',
                    padding: '16px 24px',
                },
            },
        },
    },
}); // REMOVIDO O SEGUNDO ARGUMENTO 'ptBR'

export default theme;