import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, FormControlLabel, Checkbox } from '@mui/material';

const AtestadoModal = ({ open, onClose, paciente, medicoNome, medicoCrm, usaAssinaturaDigital }) => {
    const [tipoAtestado, setTipoAtestado] = useState('Comparecimento'); // Comparecimento, Afastamento, Aptidao
    const [observacoes, setObservacoes] = useState('');
    const [diasAfastamento, setDiasAfastamento] = useState('');
    const [cid, setCid] = useState('');

    const handlePrint = () => {
        const nomePaciente = paciente?.nome_completo || "__________________________________";
        const hoje = new Date();
        const dataFormatada = hoje.toLocaleDateString('pt-BR');

        // Lógica do Texto Baseada no Seu Template Django
        let textoPrincipal = "";
        
        if (tipoAtestado === 'Comparecimento') {
            textoPrincipal = `esteve presente nesta unidade em ${dataFormatada} para consulta médica.`;
        } else if (tipoAtestado === 'Afastamento') {
            const txtDias = diasAfastamento ? ` por ${diasAfastamento} dia(s)` : "";
            const txtCid = cid ? ` (CID: ${cid})` : "";
            textoPrincipal = `necessita de afastamento de suas atividades laborais/escolares${txtDias} a partir desta data${txtCid}.`;
        } else if (tipoAtestado === 'Aptidao') {
            textoPrincipal = `encontra-se apto(a) para a prática de atividades físicas.`;
        }

        const conteudoObservacoes = observacoes ? observacoes : "Sem observações.";

        // HTML para Impressão (Baseado no atestado_template.html)
        const htmlContent = `
        <html>
        <head>
            <title>Atestado Médico</title>
            <style>
                body { font-family: 'Arial', sans-serif; padding: 40px; }
                h1 { text-align: center; font-size: 24px; margin-bottom: 40px; text-transform: uppercase; }
                .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .info-grid td { padding: 8px; font-size: 14px; border-bottom: 1px solid #ddd; }
                .label { font-weight: bold; width: 100px; color: #555; }
                .section { margin-top: 20px; }
                .section-title { font-weight: bold; margin-bottom: 10px; font-size: 14px; background: #f0f0f0; padding: 5px; }
                .content-text { text-align: justify; margin-top: 20px; font-size: 16px; line-height: 1.6; }
                .obs-box { margin-top: 30px; padding: 15px; border: 1px solid #eee; background: #fafafa; min-height: 60px; font-size: 14px; white-space: pre-wrap; }
                .footer { text-align: center; margin-top: 80px; }
                .assinatura-digital { border: 1px solid #ccc; background-color: #f8f9fa; padding: 10px; display: inline-block; width: 60%; }
                .assinatura-digital p { margin: 2px 0; }
            </style>
        </head>
        <body>
            <h1>Atestado Médico</h1>

            <table class="info-grid">
                <tr>
                    <td class="label">Paciente:</td>
                    <td>${nomePaciente}</td>
                    <td class="label">Data:</td>
                    <td>${dataFormatada}</td>
                </tr>
                <tr>
                    <td class="label">Médico(a):</td>
                    <td colspan="3">${medicoNome} (CRM: ${medicoCrm || 'N/A'})</td>
                </tr>
            </table>

            <div class="section">
                <div class="section-title">Finalidade: ${tipoAtestado.toUpperCase()}</div>
                
                <div class="content-text">
                    Atesto para os devidos fins que o(a) paciente <strong>${nomePaciente}</strong> ${textoPrincipal}
                </div>
                
                <div class="obs-box">
                    <strong>Observações:</strong><br>
                    ${conteudoObservacoes}
                </div>
            </div>

            <div class="footer">
                ${usaAssinaturaDigital ? `
                <div class="assinatura-digital">
                    <p style="font-size: 10px; color: #555;">DOCUMENTO ASSINADO DIGITALMENTE</p>
                    <p style="font-weight: bold; font-size: 14px; margin-top: 5px;">Dr(a). ${medicoNome}</p>
                    <p style="font-size: 12px;">CRM: ${medicoCrm}</p>
                    <br/>
                    <p style="font-size: 9px; color: #777;">Assinado eletronicamente conforme MP 2.200-2/2001 (ICP-Brasil).</p>
                </div>
                ` : `
                <p>___________________________________</p>
                <p>Dr(a). ${medicoNome}</p>
                <p>CRM: ${medicoCrm}</p>
                `}
            </div>
            <script>
                window.onload = function() { window.print(); window.close(); }
            </script>
        </body>
        </html>
        `;

        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle style={{ background: '#f5f5f5', fontSize: '16px' }}>Emitir Atestado Médico</DialogTitle>
            <DialogContent style={{ paddingTop: '20px' }}>
                <TextField
                    select
                    label="Tipo de Atestado"
                    fullWidth
                    value={tipoAtestado}
                    onChange={(e) => setTipoAtestado(e.target.value)}
                    margin="dense"
                    size="small"
                >
                    <MenuItem value="Comparecimento">Declaração de Comparecimento</MenuItem>
                    <MenuItem value="Afastamento">Atestado de Afastamento</MenuItem>
                    <MenuItem value="Aptidao">Atestado de Aptidão Física</MenuItem>
                </TextField>

                {tipoAtestado === 'Afastamento' && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <TextField
                            label="Dias de Afastamento"
                            type="number"
                            value={diasAfastamento}
                            onChange={(e) => setDiasAfastamento(e.target.value)}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="CID (Opcional)"
                            value={cid}
                            onChange={(e) => setCid(e.target.value)}
                            fullWidth
                            size="small"
                        />
                    </div>
                )}

                <TextField
                    label="Observações Adicionais"
                    multiline
                    rows={4}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    fullWidth
                    margin="normal"
                    placeholder="Ex: Deverá permanecer em repouso..."
                    size="small"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancelar</Button>
                <Button onClick={handlePrint} variant="contained" style={{ background: '#00897B', color: 'white' }}>
                    Imprimir Atestado
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AtestadoModal;