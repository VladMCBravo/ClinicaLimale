// src/components/financeiro/ProcedimentoModal.jsx
import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, 
    CircularProgress, Box, Typography, List, ListItem, ListItemText, 
    IconButton, Select, MenuItem, FormControl, InputLabel, Divider, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { faturamentoService } from '../../services/faturamentoService';

export default function ProcedimentoModal({ open, onClose, onSave, procedimento }) {
    const { showSnackbar } = useSnackbar();
    
    // Estados para edição dos dados principais
    const [formData, setFormData] = useState({ codigo_tuss: '', descricao: '', valor_particular: '' });
    
    // Estados para tabela de convênios
    const [valoresConvenio, setValoresConvenio] = useState([]);
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

        // Carrega planos para o dropdown
        // Nota: Assumindo que existe este método. Se não, use o endpoint direto.
        faturamentoService.getPlanosConvenio?.()
            .then(response => setPlanosDisponiveis(response.data))
            .catch(() => console.log('Erro ao carregar planos (verifique se o método existe no service)'));
            
    }, [procedimento, open]);

    // --- 1. FUNÇÃO PARA SALVAR DADOS DO PROCEDIMENTO (RESOLVE O BUG) ---
    const handleSaveBasicData = async () => {
        setIsSubmitting(true);
        try {
            await faturamentoService.updateProcedimento(procedimento.id, {
                descricao: formData.descricao,
                valor_particular: formData.valor_particular
            });
            showSnackbar('Dados do procedimento atualizados!', 'success');
            onSave(); // Recarrega a lista pai
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao atualizar procedimento.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- 2. FUNÇÃO PARA ADICIONAR PREÇO DE CONVÊNIO ---
    const handleAddPrecoConvenio = async () => {
        if (!planoSelecionadoId || !valorConvenio) {
            showSnackbar('Selecione um plano e informe um valor.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            const data = { plano_convenio_id: planoSelecionadoId, valor: valorConvenio };
            const response = await faturamentoService.definirPrecoConvenio(procedimento.id, data);
            
            // O backend retorna o objeto procedimento atualizado, ou o item criado.
            // Vamos forçar um reload via onSave() para garantir dados frescos
            onSave(); 
            
            // Atualiza visualmente se possível (opcional, pois o onSave vai fechar ou atualizar pai)
            // Mas para UX rápida, limpamos os campos:
            setPlanoSelecionadoId('');
            setValorConvenio('');
            showSnackbar('Preço do convênio salvo!', 'success');
        } catch (error) {
            showSnackbar('Erro ao salvar preço do convênio.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
                Gerenciar Procedimento
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                
                {/* ÁREA DE EDIÇÃO DOS DADOS PRINCIPAIS */}
                <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2, mb: 3, mt: 2 }}>
                    <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 'bold' }}>
                        DADOS GERAIS
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                        <TextField 
                            label="Código TUSS" 
                            value={formData.codigo_tuss} 
                            InputProps={{ readOnly: true }} 
                            disabled 
                            size="small"
                            helperText="O código TUSS não pode ser alterado."
                        />
                        <TextField 
                            label="Descrição" 
                            value={formData.descricao} 
                            onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
                            size="small"
                            fullWidth
                        />
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField 
                                label="Valor Particular (R$)" 
                                value={formData.valor_particular} 
                                onChange={(e) => setFormData({...formData, valor_particular: e.target.value})} 
                                size="small"
                                sx={{ width: '200px' }}
                            />
                            <Button 
                                variant="contained" 
                                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit"/> : <SaveIcon />}
                                onClick={handleSaveBasicData}
                                disabled={isSubmitting}
                            >
                                Salvar Alterações
                            </Button>
                        </Box>
                    </Box>
                </Box>
                
                <Divider sx={{ my: 3 }} />

                {/* ÁREA DE PREÇOS DE CONVÊNIOS */}
                <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 'bold' }}>
                    TABELA DE PREÇOS POR CONVÊNIO
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', p: 2, border: '1px dashed #ccc', borderRadius: 2 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Selecionar Plano</InputLabel>
                        <Select
                            value={planoSelecionadoId}
                            label="Selecionar Plano"
                            onChange={(e) => setPlanoSelecionadoId(e.target.value)}
                        >
                            {planosDisponiveis.map(plano => (
                                <MenuItem key={plano.id} value={plano.id}>
                                    {plano.convenio?.nome ? `${plano.convenio.nome} - ` : ''}{plano.nome}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Valor (R$)"
                        value={valorConvenio}
                        onChange={(e) => setValorConvenio(e.target.value)}
                        size="small"
                        sx={{ minWidth: 120 }}
                    />
                    <Button 
                        onClick={handleAddPrecoConvenio} 
                        variant="outlined" 
                        disabled={isSubmitting}
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        Adicionar
                    </Button>
                </Box>

                <List dense sx={{ bgcolor: 'white', border: '1px solid #eee', borderRadius: 1 }}>
                    {valoresConvenio.length > 0 ? valoresConvenio.map(item => (
                        <ListItem 
                            key={item.id} 
                            secondaryAction={
                                <IconButton edge="end" disabled>
                                    <DeleteIcon fontSize="small" color="disabled" titleAccess="Exclusão ainda não implementada" />
                                </IconButton>
                            }
                            divider
                        >
                            <ListItemText 
                                primary={item.plano_convenio?.nome || 'Plano Desconhecido'} 
                                secondary={`Valor Acordado: R$ ${item.valor}`} 
                                primaryTypographyProps={{ fontWeight: 500 }}
                            />
                        </ListItem>
                    )) : (
                        <ListItem>
                            <ListItemText secondary="Nenhum preço específico definido. Será usado o valor particular ou regra geral." />
                        </ListItem>
                    )}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Fechar</Button>
            </DialogActions>
        </Dialog>
    );
}