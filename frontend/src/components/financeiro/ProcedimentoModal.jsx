// src/components/financeiro/ProcedimentoModal.jsx
import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, 
    CircularProgress, Box, Typography, List, ListItem, ListItemText, 
    IconButton, Select, MenuItem, FormControl, InputLabel, Divider, Grid, InputAdornment 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { faturamentoService } from '../../services/faturamentoService';

// Lista de Categorias (Igual ao Backend)
const CATEGORIAS = [
    { value: 'US_GERAL', label: 'Ultrassonografia Geral' },
    { value: 'MED_FETAL', label: 'Medicina Fetal' },
    { value: 'ECOCARDIOGRAMA', label: 'Ecocardiograma' },
    { value: 'MUSCULO', label: 'Musculoesquelético' },
    { value: 'DOPPLER', label: 'Doppler Vascular' },
    { value: 'OUTROS', label: 'Outros' },
];

export default function ProcedimentoModal({ open, onClose, onSave, procedimento }) {
    const { showSnackbar } = useSnackbar();
    
    // Se 'procedimento' for null, estamos criando um novo.
    const isEditing = !!procedimento;

    const [formData, setFormData] = useState({ 
        codigo_tuss: '', 
        descricao: '', 
        categoria: 'OUTROS',
        valor_particular: '' 
    });
    
    // Estados para Preços de Convênio (Apenas Edição)
    const [valoresConvenio, setValoresConvenio] = useState([]);
    const [planosDisponiveis, setPlanosDisponiveis] = useState([]);
    const [planoSelecionadoId, setPlanoSelecionadoId] = useState('');
    const [valorConvenio, setValorConvenio] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            if (isEditing) {
                // Modo Edição: Carrega dados existentes
                setFormData({
                    codigo_tuss: procedimento.codigo_tuss || '',
                    descricao: procedimento.descricao || '',
                    categoria: procedimento.categoria || 'OUTROS',
                    valor_particular: procedimento.valor_particular || '',
                });
                setValoresConvenio(procedimento.valores_convenio || []);
                
                // Carrega Planos apenas se estiver editando
                faturamentoService.getPlanosConvenio()
                    .then(response => {
                        const planosFiltrados = response.data.filter(plano => 
                            (plano.convenio_nome || '').toLowerCase() !== 'particular'
                        );
                        planosFiltrados.sort((a, b) => (a.convenio_nome || '').localeCompare(b.convenio_nome || ''));
                        setPlanosDisponiveis(planosFiltrados);
                    })
                    .catch(() => showSnackbar('Erro ao carregar planos.', 'error'));
            } else {
                // Modo Criação: Reseta
                setFormData({ codigo_tuss: '', descricao: '', categoria: 'OUTROS', valor_particular: '' });
                setValoresConvenio([]);
            }
        }
    }, [procedimento, open, isEditing, showSnackbar]);

    const handleSaveBasicData = async () => {
        if (!formData.descricao) {
            showSnackbar('Descrição é obrigatória.', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                codigo_tuss: formData.codigo_tuss,
                descricao: formData.descricao,
                categoria: formData.categoria,
                valor_particular: formData.valor_particular ? parseFloat(formData.valor_particular) : 0
            };

            if (isEditing) {
                await faturamentoService.updateProcedimento(procedimento.id, payload);
                showSnackbar('Dados atualizados!', 'success');
            } else {
                await faturamentoService.createProcedimento(payload);
                showSnackbar('Procedimento criado com sucesso!', 'success');
            }
            onSave(); // Recarrega a lista no pai
            if (!isEditing) onClose(); 
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao salvar.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- NOVA LÓGICA: Deletar Procedimento ---
    const handleDelete = async () => {
        if (!isEditing) return;

        if (!window.confirm(`Deseja realmente excluir o procedimento "${formData.descricao}"? Isso pode afetar agendamentos passados.`)) {
            return;
        }

        setIsSubmitting(true);
        try {
            await faturamentoService.deleteProcedimento(procedimento.id);
            showSnackbar('Procedimento excluído com sucesso.', 'success');
            onSave(); // Atualiza a lista no pai
            onClose(); // Fecha modal
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao excluir procedimento. Verifique se existem agendamentos vinculados.', 'error');
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
            onSave();
        } catch (error) {
            showSnackbar('Erro ao salvar preço.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
                {isEditing ? 'Editar Procedimento e Preços' : 'Cadastrar Novo Exame'}
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                
                {/* DADOS BÁSICOS */}
                <Box sx={{ bgcolor: '#fff', p: 1, mb: 2 }}>
                    <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 'bold' }}>
                        DADOS DO EXAME (PARTICULAR)
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <TextField 
                                label="Código TUSS" 
                                value={formData.codigo_tuss} 
                                onChange={(e) => setFormData({...formData, codigo_tuss: e.target.value})}
                                size="small" fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} sm={8}>
                             <FormControl fullWidth size="small">
                                <InputLabel>Categoria</InputLabel>
                                <Select
                                    value={formData.categoria}
                                    label="Categoria"
                                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                                >
                                    {CATEGORIAS.map(cat => (
                                        <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={8}>
                            <TextField 
                                label="Descrição do Procedimento" 
                                value={formData.descricao} 
                                onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
                                size="small" fullWidth multiline maxRows={2}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField 
                                label="Valor Particular" 
                                type="number"
                                value={formData.valor_particular} 
                                onChange={(e) => setFormData({...formData, valor_particular: e.target.value})} 
                                size="small" fullWidth
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                }}
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button 
                            variant="contained" 
                            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit"/> : <SaveIcon />}
                            onClick={handleSaveBasicData}
                            disabled={isSubmitting}
                        >
                            {isEditing ? 'Atualizar Dados Básicos' : 'Salvar e Criar'}
                        </Button>
                    </Box>
                </Box>
                
                {/* SEÇÃO DE PREÇOS DE CONVÊNIO (SÓ APARECE SE ESTIVER EDITANDO) */}
                {isEditing && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 'bold' }}>
                            TABELA DE PREÇOS POR CONVÊNIO
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', p: 2, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                            <FormControl fullWidth size="small" sx={{flex: 2}}>
                                <InputLabel>Selecione o Convênio/Plano</InputLabel>
                                <Select
                                    value={planoSelecionadoId}
                                    label="Selecione o Convênio/Plano"
                                    onChange={(e) => setPlanoSelecionadoId(e.target.value)}
                                >
                                    {planosDisponiveis.map(plano => (
                                        <MenuItem key={plano.id} value={plano.id}>
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
                                size="small" sx={{ flex: 1 }}
                            />
                            <Button onClick={handleAddPrecoConvenio} variant="contained" color="secondary" disabled={isSubmitting} sx={{height: '40px'}}>
                                Adicionar
                            </Button>
                        </Box>

                        <List dense sx={{ bgcolor: 'white', border: '1px solid #eee', borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
                            {valoresConvenio.map(item => (
                                <ListItem key={item.id} divider>
                                    <ListItemText 
                                        primary={item.plano_convenio?.convenio_nome ? `${item.plano_convenio.convenio_nome} - ${item.plano_convenio.nome}` : 'Plano Desconhecido'}
                                        secondary={<Typography variant="body2" color="primary" fontWeight="bold">R$ {item.valor}</Typography>} 
                                    />
                                </ListItem>
                            ))}
                            {valoresConvenio.length === 0 && <ListItem><ListItemText secondary="Nenhum preço específico definido (Usa tabela padrão)." /></ListItem>}
                        </List>
                    </>
                )}

            </DialogContent>
            
            {/* AÇÕES FINAIS (INCLUINDO DELETAR) */}
            <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
                <Box>
                {isEditing && (
                    <Button 
                        color="error" 
                        startIcon={<DeleteIcon />} 
                        onClick={handleDelete}
                        disabled={isSubmitting}
                    >
                        Excluir Procedimento
                    </Button>
                )}
                </Box>
                <Button onClick={onClose} disabled={isSubmitting}>Fechar</Button>
            </DialogActions>
        </Dialog>
    );
}