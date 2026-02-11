// src/components/financeiro/TransactionDrawer.jsx
import React, { useState, useEffect } from 'react';
import { 
    Drawer, Box, Typography, IconButton, Divider, Chip, 
    List, ListItem, ListItemText, ListItemIcon, Button, 
    TextField, Grid, Skeleton, ButtonGroup, InputAdornment 
} from '@mui/material';
import { 
    Close, Event, AttachMoney, Description, Delete, 
    CheckCircle, RadioButtonUnchecked, Edit, History, Save
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { faturamentoService } from '../../services/faturamentoService';

export default function TransactionDrawer({ open, onClose, transactionId, onUpdate }) {
    const [loading, setLoading] = useState(true);
    const [timeline, setTimeline] = useState([]);
    const [editingId, setEditingId] = useState(null); // Qual ID da timeline estamos editando?
    
    // Dados temporários de edição
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        if (open && transactionId) {
            loadData();
        }
    }, [open, transactionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Busca a série completa
            const res = await faturamentoService.getDespesaTimeline(transactionId);
            setTimeline(res.data);
            // Inicia edição focado no item clicado ou no primeiro
            const current = res.data.find(t => t.id === transactionId) || res.data[0];
            if (current) enterEditMode(current);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const enterEditMode = (item) => {
        setEditingId(item.id);
        setEditForm({
            descricao: item.descricao,
            valor: item.valor,
            data_vencimento: dayjs(item.data_vencimento),
            categoria: item.categoria // ID
        });
    };

    const handleSave = async () => {
        try {
            await faturamentoService.updateDespesa(editingId, {
                ...editForm,
                data_vencimento: editForm.data_vencimento.format('YYYY-MM-DD'),
                data_despesa: editForm.data_vencimento.format('YYYY-MM-DD') // Mantém sincrono
            });
            // Recarrega a timeline para mostrar atualizado
            loadData();
            if(onUpdate) onUpdate(); // Avisa a tela principal para atualizar KPIs
        } catch (error) {
            alert('Erro ao salvar');
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Apagar este lançamento?")) return;
        try {
            await faturamentoService.deleteDespesa(id);
            if (timeline.length <= 1) onClose(); // Se era o único, fecha
            else loadData(); // Se tem mais, recarrega
            if(onUpdate) onUpdate();
        } catch (error) { alert('Erro ao apagar'); }
    };

    // Formatações
    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatDate = (dateStr) => dayjs(dateStr).format('DD/MM/YYYY');

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { width: { xs: '100%', md: 450 }, p: 0 } }}
        >
            {/* 1. CABEÇALHO (Sticky) */}
            <Box sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fafafa' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a233b' }}>
                    Detalhes da Despesa
                </Typography>
                <IconButton onClick={onClose}><Close /></IconButton>
            </Box>

            {loading ? (
                <Box sx={{ p: 3 }}><Skeleton variant="rectangular" height={100} /><Skeleton variant="text" sx={{ mt: 2 }} /></Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    
                    {/* 2. ÁREA DE DESTAQUE (Edição Rápida) */}
                    <Box sx={{ p: 3, bgcolor: '#fff' }}>
                        
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField 
                                    label="Descrição" fullWidth size="small"
                                    value={editForm.descricao || ''}
                                    onChange={e => setEditForm({...editForm, descricao: e.target.value})}
                                    InputProps={{ startAdornment: <InputAdornment position="start"><Description fontSize="small"/></InputAdornment> }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField 
                                    label="Valor" fullWidth size="small" type="number"
                                    value={editForm.valor || ''}
                                    onChange={e => setEditForm({...editForm, valor: e.target.value})}
                                    InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <DatePicker 
                                    label="Vencimento"
                                    value={editForm.data_vencimento}
                                    onChange={v => setEditForm({...editForm, data_vencimento: v})}
                                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                />
                            </Grid>
                        </Grid>

                        <Button 
                            variant="contained" fullWidth sx={{ mt: 2 }} 
                            startIcon={<Save />}
                            onClick={handleSave}
                        >
                            Salvar Alterações
                        </Button>
                    </Box>

                    <Divider />

                    {/* 3. TIMELINE (O Histórico que você pediu) */}
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: '#f4f6f8', p: 2 }}>
                        <Typography variant="overline" color="text.secondary" fontWeight="bold">
                            SÉRIE / HISTÓRICO ({timeline.length} Parcelas)
                        </Typography>

                        <List sx={{ mt: 1 }}>
                            {timeline.map((item, index) => {
                                const isSelected = item.id === editingId;
                                const isPago = item.pago;
                                
                                return (
                                    <ListItem 
                                        key={item.id}
                                        onClick={() => enterEditMode(item)}
                                        sx={{ 
                                            bgcolor: isSelected ? '#e3f2fd' : 'white',
                                            mb: 1, borderRadius: 2, border: '1px solid',
                                            borderColor: isSelected ? 'primary.main' : '#eee',
                                            cursor: 'pointer',
                                            transition: '0.2s',
                                            '&:hover': { borderColor: 'primary.light' }
                                        }}
                                        secondaryAction={
                                            <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                                                <Delete fontSize="small" color="disabled" />
                                            </IconButton>
                                        }
                                    >
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            {isPago ? <CheckCircle color="success" /> : <RadioButtonUnchecked color="disabled" />}
                                        </ListItemIcon>
                                        
                                        <ListItemText 
                                            primary={
                                                <Box display="flex" justifyContent="space-between">
                                                    <Typography variant="body2" fontWeight="bold">{formatDate(item.data_vencimento)}</Typography>
                                                    <Typography variant="body2" fontWeight="bold" color={isPago ? 'success.main' : 'text.primary'}>
                                                        {formatMoney(item.valor)}
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.descricao} • {item.categoria_nome}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Box>
                </Box>
            )}
        </Drawer>
    );
}