// src/components/laudos/DeclaracaoModal.jsx
import React, { useState } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, FormControl, RadioGroup, 
    FormControlLabel, Radio, Box, Typography 
} from '@mui/material';

// Importa suas ferramentas de PDF existentes
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import logoImagemPath from '../../assets/Logo-pdf.png';
import { getBase64FromUrl } from "../../utils/imageHelper";

// Configura as fontes (igual ao seu laudoPdfGenerator)
if (pdfFonts && pdfFonts.pdfMake) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
} else if (pdfFonts && pdfFonts.vfs) {
    pdfMake.vfs = pdfFonts.vfs;
}

export default function DeclaracaoModal({ open, onClose, paciente, medico }) {
    const [tipo, setTipo] = useState('PACIENTE'); 
    const [periodo, setPeriodo] = useState(''); // Deixe vazio para o usuário digitar livre se quiser
    const [acompanhanteNome, setAcompanhanteNome] = useState('');
    const [horarioInicio, setHorarioInicio] = useState('');
    const [horarioFim, setHorarioFim] = useState('');

    const handleImprimir = async () => {
        // 1. Busca o Logo (se disponível)
        let logoBase64 = null;
        try {
            logoBase64 = await getBase64FromUrl(logoImagemPath);
        } catch (error) {
            console.error("Erro logo:", error);
        }

        // 2. Prepara os Textos
        const dataHoje = new Date().toLocaleDateString('pt-BR');
        const nomePaciente = paciente?.nome_completo || paciente?.nome || "Paciente";
        
        let nomeMedico = "Médico Responsável";
        let crmMedico = "";

        if (typeof medico === 'string') {
            nomeMedico = medico;
        } else if (medico) {
            nomeMedico = medico.nome || medico.first_name || "Médico";
            crmMedico = medico.crm || "";
        }

        let textoPrincipal = "";
        const periodoTexto = periodo ? ` no período: ${periodo}` : "";
        const horarioTexto = (horarioInicio && horarioFim) ? ` (das ${horarioInicio} às ${horarioFim})` : "";

        if (tipo === 'PACIENTE') {
            textoPrincipal = `Declaro para os devidos fins que o(a) Sr(a). ${nomePaciente.toUpperCase()} esteve em atendimento nesta clínica no dia ${dataHoje}${periodoTexto}${horarioTexto}.`;
        } else {
            textoPrincipal = `Declaro para os devidos fins que o(a) Sr(a). ${acompanhanteNome.toUpperCase()} esteve nesta clínica acompanhando o paciente ${nomePaciente.toUpperCase()} no dia ${dataHoje}${periodoTexto}${horarioTexto}.`;
        }

        // 3. Define o Documento (Mesmo padrão visual do Laudo)
        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 130, 40, 80], // Margens para caber o cabeçalho
            
            // CABEÇALHO (Igual ao do Laudo)
            header: {
                margin: [40, 20, 40, 0], 
                stack: [
                    { 
                        image: logoBase64 ? logoBase64 : null, 
                        width: 140, 
                        alignment: 'center',
                        margin: [0, 0, 0, 10] 
                    },
                    { canvas: [{ type: 'line', x1: 40, y1: 0, x2: 475, y2: 0, lineWidth: 1.5, lineColor: '#C6A87C' }], alignment: 'center', margin: [0, 5] },
                ]
            },

            // RODAPÉ (Igual ao do Laudo)
            footer: (currentPage, pageCount) => {
                return {
                    margin: [40, 10, 40, 0],
                    stack: [
                        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#C6A87C' }], alignment: 'center', margin: [0, 5] },
                        { 
                            text: [
                                { text: 'Clínica Limalé', bold: true }, '  |  ', 'www.limale.com.br', '  |  ', '(11) 91951-1842'
                            ], 
                            fontSize: 9, color: '#555', alignment: 'center'
                        },
                        { 
                            text: [
                                'contato@limale.com.br', '  |  ', { text: '@clinicalimale', bold: true }
                            ], 
                            fontSize: 9, color: '#555', alignment: 'center', margin: [0, 2]
                        }
                    ]
                };
            },

            // CONTEÚDO
            content: [
                { text: 'DECLARAÇÃO DE COMPARECIMENTO', fontSize: 14, bold: true, color: '#1C2E4A', alignment: 'center', margin: [0, 0, 0, 40] },
                
                { text: textoPrincipal, fontSize: 12, alignment: 'justify', lineHeight: 1.5, margin: [20, 0, 20, 60] },

                // ASSINATURA
                { text: '_______________________________', alignment: 'center', color: '#999', margin: [0, 0, 0, 5] },
                { text: nomeMedico, alignment: 'center', bold: true, fontSize: 10 },
                { text: crmMedico ? `CRM: ${crmMedico}` : '', alignment: 'center', fontSize: 9, color: '#555' },
                
                { text: `Diadema, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.`, alignment: 'center', margin: [0, 20, 0, 0], fontSize: 10, color: '#666' }
            ],
            
            defaultStyle: { font: 'Roboto' }
        };

        pdfMake.createPdf(docDefinition).open();
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Emitir Declaração</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    
                    <FormControl>
                        <Typography variant="subtitle2">Tipo de Declaração:</Typography>
                        <RadioGroup row value={tipo} onChange={(e) => setTipo(e.target.value)}>
                            <FormControlLabel value="PACIENTE" control={<Radio />} label="Paciente" />
                            <FormControlLabel value="ACOMPANHANTE" control={<Radio />} label="Acompanhante" />
                        </RadioGroup>
                    </FormControl>

                    {tipo === 'ACOMPANHANTE' && (
                        <TextField 
                            label="Nome do Acompanhante" 
                            fullWidth 
                            value={acompanhanteNome}
                            onChange={(e) => setAcompanhanteNome(e.target.value)}
                        />
                    )}

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField 
                            label="Chegada" 
                            type="time" 
                            value={horarioInicio} 
                            onChange={(e) => setHorarioInicio(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                        <TextField 
                            label="Saída" 
                            type="time" 
                            value={horarioFim} 
                            onChange={(e) => setHorarioFim(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={handleImprimir} variant="contained" color="primary">
                    Gerar PDF (Padronizado)
                </Button>
            </DialogActions>
        </Dialog>
    );
}