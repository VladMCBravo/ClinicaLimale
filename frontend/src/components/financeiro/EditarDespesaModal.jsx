// src/components/financeiro/EditarDespesaModal.jsx
import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, 
    MenuItem, Grid, Typography, Alert, Divider, Box, Tab, Tabs
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { faturamentoService } from '../../services/faturamentoService';
import { DeleteForever, Save, Warning } from '@mui/icons-material';

export default function EditarDespesaModal({ open, despesa, onClose, onSave, showSnackbar }) {
    const [formData, setFormData] = useState({});
    const [categorias, setCategorias] = useState([]);
    const [tabIndex, setTabIndex] = useState(0); // 0: Edição Simples, 1: Ações em Série

    useEffect(() => {
        if (open && despesa) {
            setFormData({
                ...despesa,
                data_vencimento: dayjs(despesa.data_vencimento || despesa.data_despesa),
                data_despesa: dayjs(despesa.data_despesa),
                categoria: despesa.categoria // ID da categoria
            });
            carregarCategorias();
            
            // Se detectar "(x/y)" na descrição, sugere a aba de série
            if (/\(\d+\/\d+\)/.test(despesa.descricao)) {
                // Opcional: setTabIndex(0) mas mostra badge
            }
        }
    }, [open, despesa]);

    const carregarCategorias = async () => {
        try {
            const res = await faturamentoService.getCategoriasDespesa();
            setCategorias(res.data);
        } catch (error) {
            console.error("Erro categorias", error);
        }
    };

    const handleSaveSimples = async () => {
        try {
            const payload = {
                ...formData,
                data_vencimento: formData.data_vencimento.format('YYYY-MM-DD'),
                data_despesa: formData.data_despesa.format('YYYY-MM-DD'),
            };
            await faturamentoService.updateDespesa(despesa.id, payload);
            showSnackbar('Despesa atualizada com sucesso', 'success');
            onSave();
            onClose();
        } catch (error) {
            showSnackbar('Erro ao salvar', 'error');
        }
    };

    const handleExcluirSerie = async () => {
        if (!window.confirm(`ATENÇÃO: Isso apagará TODAS as parcelas criadas junto com esta (${despesa.descricao}). Tem certeza?`)) return;
        try {
            const res = await faturamentoService.excluirSerieDespesas(despesa.id);
            showSnackbar(res.data.msg, 'success');
            onSave();
            onClose();
        } catch (error) {
            showSnackbar('Erro ao excluir série', 'error');
        }
    };

    const handleEditarSerie = async () => {
        if (!window.confirm(`Isso alterará o VALOR e CATEGORIA de todas as parcelas desta série. Continuar?`)) return;
        try {
            await faturamentoService.editarSerieDespesas(despesa.id, {
                valor: formData.valor,
                categoria: formData.categoria
            });
            showSnackbar('Série atualizada!', 'success');
            onSave();
            onClose();
        } catch (error) {
            showSnackbar('Erro ao atualizar série', 'error');
        }
    };

    if (!despesa) return null;

    const isParcelado = /\(\d+\/\d+\)/.test(despesa.descricao);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 0 }}>Editar Despesa</DialogTitle>
            
            {isParcelado && (
                <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label="Edição Única" />
                    <Tab label="Gerenciar Série (Parcelas)" sx={{ color: 'warning.main' }} icon={<Warning sx={{fontSize: 16}}/>} iconPosition="start"/>
                </Tabs>
            )}

            <DialogContent sx={{ pt: 2 }}>
                {tabIndex === 0 ? (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField 
                                label="Descrição" fullWidth 
                                value={formData.descricao || ''} 
                                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField 
                                label="Valor (R$)" fullWidth type="number"
                                value={formData.valor || ''} 
                                onChange={(e) => setFormData({...formData, valor: e.target.value})}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField 
                                select label="Categoria" fullWidth 
                                value={formData.categoria || ''} 
                                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                            >
                                {categorias.map(c => (
                                    <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={6}>
                            <DatePicker 
                                label="Data Competência" 
                                value={formData.data_despesa}
                                onChange={(v) => setFormData({...formData, data_despesa: v})}
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <DatePicker 
                                label="Vencimento" 
                                value={formData.data_vencimento}
                                onChange={(v) => setFormData({...formData, data_vencimento: v})}
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        </Grid>
                    </Grid>
                ) : (
                    <Box sx={{ mt: 2, bgcolor: '#fff3e0', p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle2" color="warning.dark" gutterBottom>
                            Zona de Perigo: Ações em Lote
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Você está editando o item <b>{despesa.descricao}</b>. O sistema detectou que ele faz parte de um parcelamento.
                        </Typography>
                        
                        <Button 
                            variant="contained" color="warning" fullWidth sx={{ mb: 2 }}
                            onClick={handleEditarSerie}
                        >
                            Aplicar Novo Valor/Categoria a Todos
                        </Button>

                        <Divider sx={{ my: 2 }} />

                        <Button 
                            variant="outlined" color="error" fullWidth startIcon={<DeleteForever />}
                            onClick={handleExcluirSerie}
                        >
                            Excluir Todas as Parcelas (Série Inteira)
                        </Button>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                {tabIndex === 0 && (
                    <Button variant="contained" onClick={handleSaveSimples} startIcon={<Save />}>
                        Salvar
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}