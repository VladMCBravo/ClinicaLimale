// src/components/financeiro/TransactionDrawer.jsx
import React, { useState, useEffect } from 'react';
import { 
    Drawer, Box, Typography, IconButton, Divider, 
    List, ListItem, ListItemText, ListItemIcon, Button, 
    TextField, Grid, Skeleton, InputAdornment, Tooltip
} from '@mui/material';
import { 
    Close, Description, Delete, 
    CheckCircle, RadioButtonUnchecked, Save, CalendarMonth
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { faturamentoService } from '../../services/faturamentoService';

/// --- CORREÇÃO E LOG DE DATAS ---
const safeDate = (dateStr) => {
    // LOG DE DEBUG PARA DESCOBRIR O QUE ESTÁ VINDO
    if (dateStr === undefined || dateStr === null) {
        // console.warn("⚠️ safeDate recebeu nulo/undefined");
        return null;
    }
    
    const d = dayjs(dateStr);
    if (!d.isValid()) {
        console.error("❌ safeDate falhou para:", dateStr);
        return null;
    }
    return d;
};

const formatDate = (dateStr) => {
    const d = safeDate(dateStr);
    // Se a data for inválida, mostra "--/--/----" em vez de quebrar ou mostrar Invalid Date
    return d ? d.format('DD/MM/YYYY') : '--/--/----';
};

export default function TransactionDrawer({ open, onClose, transactionId, onUpdate }) {
    const [loading, setLoading] = useState(true);
    const [timeline, setTimeline] = useState([]);
    const [editingId, setEditingId] = useState(null);
    
    // Dados temporários de edição
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        if (open && transactionId) {
            console.log("📂 [Drawer] Abrindo para ID:", transactionId);
            loadData();
        } else {
            setTimeline([]);
            setLoading(true);
        }
    }, [open, transactionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await faturamentoService.getDespesaTimeline(transactionId);
            console.log("📥 [Drawer] Dados recebidos:", res.data); // <--- LOG IMPORTANTE
            setTimeline(res.data);
            
            const current = res.data.find(t => t.id === transactionId) || res.data[0];
            if (current) enterEditMode(current);
            
        } catch (error) {
            console.error("❌ [Drawer] Erro ao carregar:", error);
        } finally {
            setLoading(false);
        }
    };

    const enterEditMode = (item) => {
        console.log("✏️ [Drawer] Editando item:", item);
        setEditingId(item.id);
        
        // Verifica o que está sendo passado para o DatePicker
        const dataSegura = safeDate(item.data_vencimento);
        console.log("📅 [Drawer] Data processada:", dataSegura);

        setEditForm({
            descricao: item.descricao,
            valor: item.valor,
            data_vencimento: dataSegura,
            categoria: item.categoria
        });
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...editForm,
                data_vencimento: editForm.data_vencimento ? editForm.data_vencimento.format('YYYY-MM-DD') : null,
                data_despesa: editForm.data_vencimento ? editForm.data_vencimento.format('YYYY-MM-DD') : null
            };
            console.log("💾 [Drawer] Salvando payload:", payload);

            await faturamentoService.updateDespesa(editingId, payload);
            loadData(); 
            if(onUpdate) onUpdate(); 
        } catch (error) {
            alert('Erro ao salvar');
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Apagar este lançamento?")) return;
        try {
            await faturamentoService.deleteDespesa(id);
            if (timeline.length <= 1) {
                onClose();
                if(onUpdate) onUpdate();
            } else {
                loadData();
                if(onUpdate) onUpdate();
            }
        } catch (error) { alert('Erro ao apagar'); }
    };

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { width: { xs: '100%', md: 400 }, p: 0 } }} 
        >
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fafafa' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1a233b', fontSize: '1rem' }}>
                    Detalhes da Despesa
                </Typography>
                <IconButton onClick={onClose} size="small"><Close fontSize="small" /></IconButton>
            </Box>

            {loading ? (
                <Box sx={{ p: 2 }}>
                    <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
                    <Skeleton variant="text" sx={{ mt: 2 }} width="60%" />
                    <Skeleton variant="text" width="40%" />
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    
                    {/* ÁREA DE EDIÇÃO */}
                    <Box sx={{ p: 2, bgcolor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <Grid container spacing={1.5}>
                            <Grid item xs={12}>
                                <TextField 
                                    label="Descrição" fullWidth size="small" variant="outlined"
                                    value={editForm.descricao || ''}
                                    onChange={e => setEditForm({...editForm, descricao: e.target.value})}
                                    InputProps={{ 
                                        style: { fontSize: '0.9rem' },
                                        startAdornment: <InputAdornment position="start"><Description sx={{ fontSize: 18 }} /></InputAdornment> 
                                    }}
                                    InputLabelProps={{ style: { fontSize: '0.85rem' } }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField 
                                    label="Valor" fullWidth size="small" type="number"
                                    value={editForm.valor || ''}
                                    onChange={e => setEditForm({...editForm, valor: e.target.value})}
                                    InputProps={{ 
                                        style: { fontSize: '0.9rem', fontWeight: 600 },
                                        startAdornment: <InputAdornment position="start"><Typography variant="caption" fontWeight="bold">R$</Typography></InputAdornment> 
                                    }}
                                    InputLabelProps={{ style: { fontSize: '0.85rem' } }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <DatePicker 
                                    label="Vencimento"
                                    value={editForm.data_vencimento}
                                    onChange={v => setEditForm({...editForm, data_vencimento: v})}
                                    slotProps={{ 
                                        textField: { 
                                            size: 'small', 
                                            fullWidth: true,
                                            InputProps: { style: { fontSize: '0.9rem' } },
                                            InputLabelProps: { style: { fontSize: '0.85rem' } }
                                        } 
                                    }}
                                />
                            </Grid>
                        </Grid>

                        <Button 
                            variant="contained" fullWidth sx={{ mt: 1.5, py: 0.8, fontSize: '0.8rem' }} 
                            startIcon={<Save fontSize="small" />}
                            onClick={handleSave}
                        >
                            Salvar Alteração
                        </Button>
                    </Box>

                    <Divider />

                    {/* LISTA HISTÓRICO */}
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: '#f8f9fa', px: 1, py: 2 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ px: 1, mb: 1, display: 'block', textTransform: 'uppercase' }}>
                            Série / Histórico ({timeline.length} itens)
                        </Typography>

                        <List dense sx={{ pt: 0 }}>
                            {timeline.map((item) => {
                                const isSelected = item.id === editingId;
                                const isPago = item.pago;
                                
                                return (
                                    <ListItem 
                                        key={item.id}
                                        onClick={() => enterEditMode(item)}
                                        sx={{ 
                                            bgcolor: isSelected ? '#e3f2fd' : 'white',
                                            mb: 0.8, borderRadius: 1.5, 
                                            border: '1px solid',
                                            borderColor: isSelected ? 'primary.main' : 'transparent',
                                            boxShadow: isSelected ? 'none' : '0 1px 2px rgba(0,0,0,0.03)',
                                            cursor: 'pointer',
                                            transition: '0.1s',
                                            '&:hover': { bgcolor: '#f0f7ff', borderColor: 'primary.light' },
                                            py: 0.5 
                                        }}
                                        secondaryAction={
                                            <Tooltip title="Excluir Parcela">
                                                <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                                                    <Delete sx={{ fontSize: 16 }} color="disabled" />
                                                </IconButton>
                                            </Tooltip>
                                        }
                                    >
                                        <ListItemIcon sx={{ minWidth: 32 }}>
                                            {isPago ? 
                                                <CheckCircle color="success" sx={{ fontSize: 18 }} /> : 
                                                <RadioButtonUnchecked color="disabled" sx={{ fontSize: 18 }} />
                                            }
                                        </ListItemIcon>
                                        
                                        <ListItemText 
                                            primary={
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Box display="flex" alignItems="center" gap={0.5}>
                                                        <CalendarMonth sx={{ fontSize: 12, color: 'text.secondary', opacity: 0.7 }} />
                                                        {/* AQUI ESTAVA O PROBLEMA: Usamos formatDate que trata nulos */}
                                                        <Typography variant="body2" fontWeight="600" fontSize="0.85rem">
                                                            {formatDate(item.data_vencimento)}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="body2" fontWeight="700" fontSize="0.85rem" color={isPago ? 'success.dark' : 'text.primary'}>
                                                        {formatMoney(item.valor)}
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', mt: 0.2 }}>
                                                    {item.descricao} • {item.categoria_nome || 'Sem Categoria'}
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