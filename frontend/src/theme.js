// src/theme.js
import { createTheme } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1a233b', // Azul escuro do seu Navbar
        },
        secondary: {
            main: '#c0a46f', // Dourado do seu sistema
        },
        background: {
            default: '#f4f7fa',
        },
    },
    typography: {
        fontFamily: "'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif",
        fontSize: 13, // Reduz ligeiramente a fonte base (padrão é 14) para ficar mais compacto
        h5: {
            fontWeight: 600,
            fontSize: '1.25rem', // Títulos menos agressivos
        },
        h6: {
            fontWeight: 600,
            fontSize: '1.1rem',
        },
        button: {
            textTransform: 'none', // Remove o CAIXA ALTA dos botões para ficar mais elegante
            fontWeight: 600,
        },
    },
    components: {
        // --- FORÇA O TAMANHO PEQUENO EM TUDO ---
        MuiButton: {
            defaultProps: {
                size: 'small',
                disableElevation: true, // Botões planos (sem sombra excessiva)
            },
            styleOverrides: {
                root: {
                    borderRadius: 6, // Cantos ligeiramente arredondados
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
                margin: 'dense', // Reduz espaçamento entre campos
            },
        },
        MuiInputLabel: {
            defaultProps: {
                margin: 'dense',
            },
            styleOverrides: {
                root: {
                    fontSize: '0.9rem', // Etiqueta mais delicada
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
                size: 'small', // Tabelas mais compactas
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    padding: '8px 16px', // Espaçamento interno menor nas células
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
}, ptBR); // Aplica traduções PT-BR padrão do Material UI

export default theme;