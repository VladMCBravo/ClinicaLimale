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

// Configura as fontes
if (pdfFonts && pdfFonts.pdfMake) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
} else if (pdfFonts && pdfFonts.vfs) {
    pdfMake.vfs = pdfFonts.vfs;
}

export default function DeclaracaoModal({ open, onClose, paciente, medico }) {
    const [tipo, setTipo] = useState('PACIENTE'); 
    const [acompanhanteNome, setAcompanhanteNome] = useState('');
    const [horarioInicio, setHorarioInicio] = useState('');
    const [horarioFim, setHorarioFim] = useState('');

    // Função auxiliar para trocar 14:00 por 14h00
    const formatHour = (timeStr) => {
        if (!timeStr) return "___";
        return timeStr.replace(':', 'h');
    };

    const handleImprimir = async () => {
        // 1. Busca o Logo
        let logoBase64 = null;
        try {
            logoBase64 = await getBase64FromUrl(logoImagemPath);
        } catch (error) {
            console.error("Erro logo:", error);
        }

        // 2. Prepara os Dados
        const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
        const hoje = new Date();
        const dataExtenso = `${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
        
        const nomePaciente = paciente?.nome_completo || paciente?.nome || "PACIENTE";
        
        // Dados do Médico
        let nomeMedico = "Médico Responsável";
        let crmMedico = "";
        if (typeof medico === 'string') {
            nomeMedico = medico;
        } else if (medico) {
            nomeMedico = medico.nome || medico.first_name || "Médico";
            crmMedico = medico.crm || "";
        }

        // Montagem do Texto Principal
        let textoPrincipal = "";
        const periodoTexto = `no período das ${formatHour(horarioInicio)} às ${formatHour(horarioFim)}`;

        if (tipo === 'PACIENTE') {
            textoPrincipal = `Declaramos, para os devidos fins, que a Sr(a). ${nomePaciente.toUpperCase()} esteve em atendimento nesta clínica na data de ${dataExtenso}, ${periodoTexto}.`;
        } else {
            textoPrincipal = `Declaramos, para os devidos fins, que a Sr(a). ${acompanhanteNome.toUpperCase()} esteve nesta clínica acompanhando o paciente ${nomePaciente.toUpperCase()}, na data de ${dataExtenso}, ${periodoTexto}.`;
        }

        // 3. Define o Documento PDF
        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [60, 140, 60, 80], // Margens ajustadas para ficar elegante
            
            // CABEÇALHO
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

            // RODAPÉ
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
                            text: 'Rua Manoel da Nóbrega, 595 - Centro, Diadema - SP', 
                            fontSize: 8, color: '#777', alignment: 'center', margin: [0, 2]
                        }
                    ]
                };
            },

            // CONTEÚDO
            content: [
                { text: 'DECLARAÇÃO DE COMPARECIMENTO', fontSize: 16, bold: true, color: '#1C2E4A', alignment: 'center', margin: [0, 0, 0, 50] },
                
                // Texto Principal (Justificado e com espaçamento de linha)
                { text: textoPrincipal, fontSize: 12, alignment: 'justify', lineHeight: 1.6, margin: [0, 0, 0, 20] },

                // Segundo Parágrafo
                { text: 'Esta declaração é emitida a pedido da interessada, para fins de comprovação de comparecimento.', fontSize: 12, alignment: 'justify', lineHeight: 1.6, margin: [0, 0, 0, 60] },

                // ASSINATURA
                {
                    stack: [
                        { text: '_______________________________', alignment: 'center', color: '#999', margin: [0, 0, 0, 5] },
                        { text: nomeMedico, alignment: 'center', bold: true, fontSize: 12 },
                        { text: crmMedico ? `CRM: ${crmMedico}` : '', alignment: 'center', fontSize: 10, color: '#555', margin: [0, 0, 0, 2] },
                        { text: 'Clínica Limalé – Especialidades Médicas e Imagem', alignment: 'center', fontSize: 10, color: '#1C2E4A', bold: true }
                    ],
                    unbreakable: true
                },
                
                // Data no final
                { text: `Diadema, ${dataExtenso}.`, alignment: 'center', margin: [0, 40, 0, 0], fontSize: 11, color: '#666' }
            ],
            
            defaultStyle: { font: 'Roboto' }
        };

        pdfMake.createPdf(docDefinition).open();
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{color: '#1C2E4A', fontWeight:'bold'}}>Emitir Declaração</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                    
                    <FormControl>
                        <Typography variant="subtitle2" sx={{mb:1, fontWeight:'bold'}}>Quem esteve na clínica?</Typography>
                        <RadioGroup row value={tipo} onChange={(e) => setTipo(e.target.value)}>
                            <FormControlLabel value="PACIENTE" control={<Radio />} label="Apenas o Paciente" />
                            <FormControlLabel value="ACOMPANHANTE" control={<Radio />} label="Acompanhante" />
                        </RadioGroup>
                    </FormControl>

                    {tipo === 'ACOMPANHANTE' && (
                        <TextField 
                            label="Nome do Acompanhante" 
                            fullWidth 
                            variant="outlined"
                            value={acompanhanteNome}
                            onChange={(e) => setAcompanhanteNome(e.target.value)}
                            placeholder="Digite o nome completo"
                        />
                    )}

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField 
                            label="Horário Chegada" 
                            type="time" 
                            value={horarioInicio} 
                            onChange={(e) => setHorarioInicio(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            helperText="Ex: 14:10"
                        />
                        <TextField 
                            label="Horário Saída" 
                            type="time" 
                            value={horarioFim} 
                            onChange={(e) => setHorarioFim(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            helperText="Ex: 15:05"
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{padding: '20px'}}>
                <Button onClick={onClose} sx={{color:'#666'}}>Cancelar</Button>
                <Button onClick={handleImprimir} variant="contained" sx={{background:'#1C2E4A'}}>
                    Gerar PDF
                </Button>
            </DialogActions>
        </Dialog>
    );
}