// src/components/AgendamentoModal.jsx
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress, Box, Typography, Chip, Grid, Paper, TextField
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import { useAgendamentoForm } from './agendamento/useAgendamentoForm';
import SecaoIdentificacaoPaciente from './agendamento/SecaoIdentificacaoPaciente';
import SecaoDadosClinicos from './agendamento/SecaoDadosClinicos';
import SecaoOrganizacao from './agendamento/SecaoOrganizacao';
import SecaoFaturamento from './agendamento/SecaoFaturamento';
import DialogConfirmarJornada from './agendamento/DialogConfirmarJornada';

export default function AgendamentoModal({ open, onClose, onSave, editingEvent, initialData, onAbrirNovoPaciente, refreshTrigger }) {
    const {
        MAX_CONS, MAX_PROC,
        formData, setFormData,
        isSubmitting,
        dataInicioVisual, dataFimVisual, handleDataInicioChange, handleDataFimChange,
        pacientes, procedimentos, planos, convenios, convenioSelecionado, setConvenioSelecionado,
        medicos, especialidades, salasFiltradas,
        isEncaixe, setIsEncaixe,
        inputValuePaciente, setInputValuePaciente,
        pacienteDetalhes,
        tipoAgendamento, setTipoAgendamento,
        capacidade, bloqueioCapacidade,
        confirmarJornadaOpen, setConfirmarJornadaOpen,
        setEsperandoNovoPaciente,
        handlePacienteChange,
        handleProcedimentosChange,
        handleSubmit,
        handleDelete,
        executarSubmitReal,
        infoFinanceira,
        removerAcentos
    } = useAgendamentoForm({ open, editingEvent, initialData, refreshTrigger, onSave, onClose });

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 3, bgcolor: '#fbfcff' } }}>
            <DialogTitle sx={{ p: 1.5, pb: 1, borderBottom: '1px solid #e0e0e0', bgcolor: '#fff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight="bold" color="primary.main">
                        {editingEvent ? 'Editar Agendamento' : 'Novo Agendamento'}
                    </Typography>
                    {formData.data_hora_inicio && (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            {capacidade.loading ? <CircularProgress size={16} /> : (
                                <>
                                    <Chip label={`Consultas: ${capacidade.consultas}/${MAX_CONS}`} color={capacidade.consultas >= MAX_CONS ? "error" : "success"} size="small" variant={tipoAgendamento === 'Consulta' ? "filled" : "outlined"} sx={{ height: 20 }} />
                                    <Chip label={`Procedimentos: ${capacidade.procedimentos}/${MAX_PROC}`} color={capacidade.procedimentos >= MAX_PROC ? "error" : "success"} size="small" variant={tipoAgendamento === 'Procedimento' ? "filled" : "outlined"} sx={{ height: 20 }} />
                                </>
                            )}
                        </Box>
                    )}
                </Box>
            </DialogTitle>

            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ p: 1.5 }}>
                    <Grid container spacing={1.5}>

                        <Grid item xs={12} md={7}>
                            <SecaoIdentificacaoPaciente
                                pacientes={pacientes}
                                paciente={formData.paciente}
                                onPacienteChange={handlePacienteChange}
                                inputValuePaciente={inputValuePaciente}
                                setInputValuePaciente={setInputValuePaciente}
                                onAbrirNovoPaciente={onAbrirNovoPaciente}
                                setEsperandoNovoPaciente={setEsperandoNovoPaciente}
                                removerAcentos={removerAcentos}
                                pacienteDetalhes={pacienteDetalhes}
                            />

                            <SecaoDadosClinicos
                                tipoAgendamento={tipoAgendamento}
                                setTipoAgendamento={setTipoAgendamento}
                                formData={formData}
                                setFormData={setFormData}
                                especialidades={especialidades}
                                medicos={medicos}
                                salasFiltradas={salasFiltradas}
                                procedimentos={procedimentos}
                                onProcedimentosChange={handleProcedimentosChange}
                                editingEvent={editingEvent}
                                bloqueioCapacidade={bloqueioCapacidade}
                                isEncaixe={isEncaixe}
                                setIsEncaixe={setIsEncaixe}
                            />

                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: '#e0e0e0', bgcolor: '#fff' }}>
                                <TextField
                                    label="Observações Gerais (Opcional)"
                                    fullWidth
                                    size="small"
                                    value={formData.observacoes || ''}
                                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                    placeholder="Ex: Paciente cadeirante..."
                                />
                            </Paper>
                        </Grid>

                        <Grid item xs={12} md={5}>
                            <SecaoOrganizacao
                                dataInicioVisual={dataInicioVisual}
                                dataFimVisual={dataFimVisual}
                                onDataInicioChange={handleDataInicioChange}
                                onDataFimChange={handleDataFimChange}
                                formData={formData}
                                setFormData={setFormData}
                            />

                            <SecaoFaturamento
                                formData={formData}
                                setFormData={setFormData}
                                convenios={convenios}
                                convenioSelecionado={convenioSelecionado}
                                setConvenioSelecionado={setConvenioSelecionado}
                                planos={planos}
                                infoFinanceira={infoFinanceira}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>

                <DialogActions sx={{ p: 1.5, borderTop: '1px solid #e0e0e0', bgcolor: '#fff' }}>
                    <Box>{editingEvent && (<Button onClick={handleDelete} color="error" startIcon={<DeleteIcon />} disabled={isSubmitting} size="small">Excluir</Button>)}</Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button onClick={onClose} disabled={isSubmitting} color="inherit" size="small">Cancelar</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting} size="small" sx={{ px: 3, borderRadius: 2 }}>{isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Salvar'}</Button>
                    </Box>
                </DialogActions>
            </form>

            <DialogConfirmarJornada
                open={confirmarJornadaOpen}
                onClose={() => setConfirmarJornadaOpen(false)}
                dataInicioVisual={dataInicioVisual}
                dataFimVisual={dataFimVisual}
                nomeMedico={formData.medico?.first_name}
                onForcar={() => { setConfirmarJornadaOpen(false); executarSubmitReal(); }}
            />
        </Dialog>
    );
}
