// src/components/financeiro/ProcedimentoModal.jsx
import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, 
    CircularProgress, Box, Typography, List, ListItem, ListItemText, 
    IconButton, Select, MenuItem, FormControl, InputLabel, Divider 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { faturamentoService } from '../../services/faturamentoService';

export default function ProcedimentoModal({ open, onClose, onSave, procedimento }) {
    const { showSnackbar } = useSnackbar();
    
    const [formData, setFormData] = useState({ codigo_tuss: '', descricao: '', valor_particular: '' });
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

        // CARREGA E FILTRA OS PLANOS
        faturamentoService.getPlanosConvenio()
            .then(response => {
                // Filtra para NÃO mostrar "Particular" (case insensitive)
                // e garante que só mostra planos ativos
                const planosFiltrados = response.data.filter(plano => {
                    const nomeConvenio = plano.convenio_nome || ''; 
                    return nomeConvenio.toLowerCase() !== 'particular';
                });
                
                // Ordena por nome do convênio para ficar organizado visualmente
                planosFiltrados.sort((a, b) => (a.convenio_nome || '').localeCompare(b.convenio_nome || ''));
                
                setPlanosDisponiveis(planosFiltrados);
            })
            .catch(() => showSnackbar('Erro ao carregar planos.', 'error'));
            
    }, [procedimento, open, showSnackbar]);

    const handleSaveBasicData = async () => {
        setIsSubmitting(true);
        try {
            await faturamentoService.updateProcedimento(procedimento.id, {
                descricao: formData.descricao,
                valor_particular: formData.valor_particular
            });
            showSnackbar('Dados atualizados!', 'success');
            onSave(); 
        } catch (error) {
            showSnackbar('Erro ao atualizar.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddPrecoConvenio = async () => {
        if (!planoSelecionadoId || !valorConvenio) {
            showSnackbar('Selecione um plano e informe um valor.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            const data = { plano_convenio_id: planoSelecionadoId, valor: valorConvenio };
            await faturamentoService.definirPrecoConvenio(procedimento.id, data);
            
            showSnackbar('Preço salvo!', 'success');
            setPlanoSelecionadoId('');
            setValorConvenio('');
            onSave(); // Recarrega dados do pai
        } catch (error) {
            showSnackbar('Erro ao salvar preço.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
                Gerenciar Preços do Procedimento
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                
                {/* DADOS BÁSICOS (TUSS + PARTICULAR) */}
                <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2, mb: 3, mt: 2 }}>
                    <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>
                        VALOR PARTICULAR & DESCRIÇÃO
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField 
                                label="Código TUSS" 
                                value={formData.codigo_tuss} 
                                InputProps={{ readOnly: true }} 
                                disabled size="small" sx={{ width: 150 }}
                            />
                            <TextField 
                                label="Descrição" 
                                value={formData.descricao} 
                                onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
                                size="small" fullWidth
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField 
                                label="Valor Particular (R$)" 
                                type="number"
                                value={formData.valor_particular} 
                                onChange={(e) => setFormData({...formData, valor_particular: e.target.value})} 
                                size="small" sx={{ width: 200 }}
                            />
                            <Button 
                                variant="contained" 
                                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit"/> : <SaveIcon />}
                                onClick={handleSaveBasicData}
                                disabled={isSubmitting}
                            >
                                Salvar Base
                            </Button>
                        </Box>
                    </Box>
                </Box>
                
                <Divider sx={{ my: 3 }} />

                {/* PREÇOS DE CONVÊNIOS */}
                <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 'bold' }}>
                    TABELA DE PREÇOS POR CONVÊNIO
                </Typography>
                <Typography variant="caption" display="block" sx={{ mb: 2, color: 'text.secondary' }}>
                    Adicione preços específicos para planos de saúde. Se não definido, o sistema usará o valor padrão do convênio ou TUSS.
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', p: 2, border: '1px dashed #ccc', borderRadius: 2 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Selecione o Convênio/Plano</InputLabel>
                        <Select
                            value={planoSelecionadoId}
                            label="Selecione o Convênio/Plano"
                            onChange={(e) => setPlanoSelecionadoId(e.target.value)}
                        >
                            {planosDisponiveis.map(plano => (
                                <MenuItem key={plano.id} value={plano.id}>
                                    {/* AQUI ESTÁ A CORREÇÃO VISUAL: */}
                                    <strong>{plano.convenio_nome}</strong> &nbsp;—&nbsp; {plano.nome}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Valor (R$)"
                        type="number"
                        value={valorConvenio}
                        onChange={(e) => setValorConvenio(e.target.value)}
                        size="small" sx={{ minWidth: 120 }}
                    />
                    <Button onClick={handleAddPrecoConvenio} variant="outlined" disabled={isSubmitting}>
                        Adicionar
                    </Button>
                </Box>

                <List dense sx={{ bgcolor: 'white', border: '1px solid #eee', borderRadius: 1, maxHeight: 300, overflow: 'auto' }}>
                    {valoresConvenio.map(item => (
                        <ListItem 
                            key={item.id} 
                            divider
                            secondaryAction={
                                <IconButton edge="end" disabled title="Para remover, defina o valor como 0 ou implemente delete">
                                    <DeleteIcon fontSize="small" color="disabled" />
                                </IconButton>
                            }
                        >
                            <ListItemText 
                                // Ajuste para mostrar o nome corretamente caso já venha do backend populado
                                primary={item.plano_convenio?.convenio_nome ? `${item.plano_convenio.convenio_nome} - ${item.plano_convenio.nome}` : (item.plano_convenio?.nome || 'Plano')}
                                secondary={
                                    <Typography variant="body2" component="span" color="primary" fontWeight="bold">
                                        R$ {item.valor}
                                    </Typography>
                                } 
                            />
                        </ListItem>
                    ))}
                    {valoresConvenio.length === 0 && (
                        <ListItem><ListItemText secondary="Nenhum preço específico definido." /></ListItem>
                    )}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Fechar</Button>
            </DialogActions>
        </Dialog>
    );
}