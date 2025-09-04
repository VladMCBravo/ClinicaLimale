// src/components/financeiro/ProcedimentoModal.jsx
import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, 
    CircularProgress, Box, Typography, List, ListItem, ListItemText, 
    IconButton, Select, MenuItem, FormControl, InputLabel, Divider 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { faturamentoService } from '../../services/faturamentoService';

export default function ProcedimentoModal({ open, onClose, onSave, procedimento }) {
    const { showSnackbar } = useSnackbar();
    const [formData, setFormData] = useState({ codigo_tuss: '', descricao: '', valor_particular: '' });
    const [valoresConvenio, setValoresConvenio] = useState([]);
    
    // Para o formulário de adicionar novo preço
    const [planosDisponiveis, setPlanosDisponiveis] = useState([]);
    const [planoSelecionadoId, setPlanoSelecionadoId] = useState('');
    const [valorConvenio, setValorConvenio] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (procedimento) {
            setFormData({
                codigo_tuss: procedimento.codigo_tuss,
                descricao: procedimento.descricao,
                valor_particular: procedimento.valor_particular,
            });
            setValoresConvenio(procedimento.valores_convenio || []);
        }

        // Busca a lista de planos para o dropdown
        faturamentoService.getPlanosConvenio()
            .then(response => setPlanosDisponiveis(response.data))
            .catch(() => showSnackbar('Erro ao carregar planos de convênio.', 'error'));
            
    }, [procedimento, open, showSnackbar]);

    const handleAddPrecoConvenio = async () => {
        if (!planoSelecionadoId || !valorConvenio) {
            showSnackbar('Selecione um plano e informe um valor.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            const data = { plano_convenio_id: planoSelecionadoId, valor: valorConvenio };
            const response = await faturamentoService.definirPrecoConvenio(procedimento.id, data);
            
            // Atualiza a lista de preços localmente com a resposta da API
            setValoresConvenio(response.data.valores_convenio);
            showSnackbar('Preço do convênio salvo!', 'success');
            setPlanoSelecionadoId('');
            setValorConvenio('');
            onSave(); // Recarrega a lista principal
        } catch (error) {
            showSnackbar('Erro ao salvar preço do convênio.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Editar Procedimento</DialogTitle>
            <DialogContent>
                {/* Seção de Dados Principais */}
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField label="Código TUSS" value={formData.codigo_tuss} InputProps={{ readOnly: true }} />
                    <TextField label="Descrição" value={formData.descricao} InputProps={{ readOnly: true }} />
                    <TextField label="Valor Particular (R$)" value={formData.valor_particular} InputProps={{ readOnly: true }} />
                </Box>
                
                <Divider sx={{ my: 3 }} />

                {/* Seção da Tabela de Preços */}
                <Typography variant="h6" gutterBottom>Tabela de Preços por Convênio</Typography>
                
                {/* Formulário para adicionar novo preço */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                    <FormControl fullWidth>
                        <InputLabel>Plano de Convênio</InputLabel>
                        <Select
                            value={planoSelecionadoId}
                            label="Plano de Convênio"
                            onChange={(e) => setPlanoSelecionadoId(e.target.value)}
                        >
                            {planosDisponiveis.map(plano => (
                                <MenuItem key={plano.id} value={plano.id}>{plano.nome}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Valor (R$)"
                        value={valorConvenio}
                        onChange={(e) => setValorConvenio(e.target.value)}
                        sx={{ minWidth: 150 }}
                    />
                    <Button onClick={handleAddPrecoConvenio} variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Adicionar'}
                    </Button>
                </Box>

                {/* Lista de preços já definidos */}
                <List>
                    {valoresConvenio.map(item => (
                        <ListItem key={item.id} secondaryAction={<IconButton edge="end" aria-label="delete"><DeleteIcon /></IconButton>}>
                            <ListItemText primary={item.plano_convenio.nome} secondary={`Valor: R$ ${item.valor}`} />
                        </ListItem>
                    ))}
                     {valoresConvenio.length === 0 && <Typography variant="body2" color="text.secondary">Nenhum preço de convênio definido.</Typography>}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Fechar</Button>
            </DialogActions>
        </Dialog>
    );
}