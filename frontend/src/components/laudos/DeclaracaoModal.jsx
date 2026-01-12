import React, { useState } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, FormControl, RadioGroup, 
    FormControlLabel, Radio, Box, Typography 
} from '@mui/material';
import jsPDF from 'jspdf'; // Certifique-se de ter: npm install jspdf

export default function DeclaracaoModal({ open, onClose, paciente, medico }) {
    const [tipo, setTipo] = useState('PACIENTE'); // ou ACOMPANHANTE
    const [periodo, setPeriodo] = useState('MANHA');
    const [acompanhanteNome, setAcompanhanteNome] = useState('');
    const [horarioInicio, setHorarioInicio] = useState('');
    const [horarioFim, setHorarioFim] = useState('');

    const handleImprimir = () => {
        const doc = new jsPDF();
        
        // Configuração básica do PDF
        doc.setFontSize(18);
        doc.text("DECLARAÇÃO DE COMPARECIMENTO", 105, 40, null, null, "center");
        
        doc.setFontSize(12);
        const dataHoje = new Date().toLocaleDateString('pt-BR');
        const nomePaciente = paciente?.nome_completo || paciente?.nome || "Paciente";
        const nomeMedico = medico?.nome || medico || "Médico Responsável"; // Aceita objeto ou string
        
        let texto = "";

        if (tipo === 'PACIENTE') {
            texto = `Declaro para os devidos fins que o(a) Sr(a). ${nomePaciente} esteve em atendimento nesta clínica no dia ${dataHoje}, no período: ${periodo} (das ${horarioInicio} às ${horarioFim}).`;
        } else {
            texto = `Declaro para os devidos fins que o(a) Sr(a). ${acompanhanteNome} esteve nesta clínica acompanhando o paciente ${nomePaciente} no dia ${dataHoje}, no período: ${periodo} (das ${horarioInicio} às ${horarioFim}).`;
        }

        // Quebra de linha automática (margem esq: 20, topo: 70, largura: 170)
        doc.text(texto, 20, 70, { maxWidth: 170, align: "justify" });

        // Assinatura
        doc.text("__________________________________________", 105, 150, null, null, "center");
        doc.text(nomeMedico, 105, 158, null, null, "center");
        // doc.text(`CRM: ${medico.crm}`, 105, 164, null, null, "center");

        // Abre o PDF em nova aba para impressão
        window.open(doc.output('bloburl'), '_blank');
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
                    Gerar PDF
                </Button>
            </DialogActions>
        </Dialog>
    );
}