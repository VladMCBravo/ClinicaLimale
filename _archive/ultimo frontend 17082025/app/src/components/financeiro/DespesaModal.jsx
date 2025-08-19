import React, { useState, useEffect } from 'react';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
  Select, MenuItem, FormControl, InputLabel, Box
} from '@mui/material';
import { LoadingButton } from '@mui/lab';

export default function DespesaModal({ open, onClose, onSave, editingDespesa }) {
  const { showSnackbar } = useSnackbar();
  const [formData, setFormData] = useState({ descricao: '', valor: '', data_despesa: '', categoria: '' });
  const [categorias, setCategorias] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchCategorias = async () => {
        const token = sessionStorage.getItem('authToken');
        try {
          const response = await fetch('http://127.0.0.1:8000/api/categorias-despesa/', {
            headers: { 'Authorization': `Token ${token}` }
          });
          const data = await response.json();
          setCategorias(data);
        } catch (error) {
          console.error("Falha ao carregar categorias:", error);
        }
      };
      fetchCategorias();
    }
  }, [open]);
  
  useEffect(() => {
    if (editingDespesa) {
      setFormData({
        descricao: editingDespesa.descricao || '',
        valor: editingDespesa.valor || '',
        data_despesa: editingDespesa.data_despesa || '',
        categoria: editingDespesa.categoria || '',
      });
    } else {
      setFormData({ descricao: '', valor: '', data_despesa: '', categoria: '' });
    }
  }, [editingDespesa, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    const token = sessionStorage.getItem('authToken');
    const isEditing = editingDespesa && editingDespesa.id;
    const url = isEditing ? `http://127.0.0.1:8000/api/despesas/${editingDespesa.id}/` : 'http://127.0.0.1:8000/api/despesas/';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(JSON.stringify(errData));
      }
      showSnackbar(isEditing ? 'Despesa atualizada!' : 'Despesa registrada!', 'success');
      onSave();
      onClose();
    } catch (err) {
      showSnackbar(`Erro ao salvar: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editingDespesa ? 'Editar Despesa' : 'Registrar Nova Despesa'}</DialogTitle>
      <DialogContent sx={{ pt: '20px !important' }}>
        {/*
          A CORREÇÃO ESTÁ ABAIXO.
          Usamos Box com Flexbox para um controle de layout mais preciso.
        */}
        <Box component="form" noValidate>
          <TextField name="descricao" label="Descrição" value={formData.descricao} onChange={handleChange} fullWidth required sx={{ mb: 2 }} />
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField name="valor" label="Valor (R$)" type="number" value={formData.valor} onChange={handleChange} fullWidth required />
            <TextField name="data_despesa" label="Data da Despesa" type="date" value={formData.data_despesa} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
          </Box>
          
          <FormControl fullWidth required>
            <InputLabel id="categoria-select-label">Categoria</InputLabel>
            <Select
              labelId="categoria-select-label"
              name="categoria"
              value={formData.categoria}
              label="Categoria"
              onChange={handleChange}
            >
              {categorias.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>Cancelar</Button>
        <LoadingButton onClick={handleSubmit} loading={isSaving} variant="contained">Salvar</LoadingButton>
      </DialogActions>
    </Dialog>
  );
}