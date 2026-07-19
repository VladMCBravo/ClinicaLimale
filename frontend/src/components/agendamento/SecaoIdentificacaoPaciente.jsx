// src/components/agendamento/SecaoIdentificacaoPaciente.jsx
// Busca/seleção do paciente + atalho de cadastro rápido. Extraído do AgendamentoModal.jsx
// sem mudar nada de visual ou comportamento — só isolando essa parte do formulário.
import React from 'react';
import { Box, Paper, Typography, FormControl, Autocomplete, TextField, Button, Tooltip, Alert } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

export default function SecaoIdentificacaoPaciente({
    pacientes, paciente, onPacienteChange,
    inputValuePaciente, setInputValuePaciente,
    onAbrirNovoPaciente, setEsperandoNovoPaciente,
    removerAcentos, pacienteDetalhes
}) {
    const handleCadastrarNovo = () => {
        if (onAbrirNovoPaciente) {
            setEsperandoNovoPaciente(true);
            onAbrirNovoPaciente(inputValuePaciente);
        }
    };

    return (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2, borderColor: '#e0e0e0', bgcolor: '#fff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'primary.main' }}>
                <PersonOutlineIcon sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight="bold">Identificação</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <FormControl fullWidth>
                    <Autocomplete
                        options={pacientes}
                        ListboxProps={{ style: { maxHeight: 200 } }}
                        getOptionLabel={(option) => option.nome_completo || ''}
                        value={paciente}
                        isOptionEqualToValue={(o, v) => o.id === v.id}
                        onChange={onPacienteChange}
                        onInputChange={(event, newInputValue) => setInputValuePaciente(newInputValue || '')}
                        noOptionsText={
                            <Box sx={{ textAlign: 'center', py: 1 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Nenhum paciente encontrado.</Typography>
                                <Button variant="outlined" size="small" startIcon={<PersonAddIcon />} onClick={handleCadastrarNovo}>
                                    Cadastrar "{inputValuePaciente}"
                                </Button>
                            </Box>
                        }
                        filterOptions={(options, params) => {
                            const termo = params.inputValue || '';
                            const inputLimpo = removerAcentos(termo.toLowerCase().trim());
                            const inputApenasNumeros = termo.replace(/\D/g, '');
                            if (inputLimpo === '') return options.slice(0, 50);
                            const filtered = options.filter(option => {
                                const nomeBanco = option.nome_completo ? removerAcentos(option.nome_completo.toLowerCase()) : '';
                                const matchNome = nomeBanco.includes(inputLimpo);
                                const cpfBanco = option.cpf ? option.cpf.replace(/\D/g, '') : '';
                                const matchCpf = inputApenasNumeros.length > 0 && cpfBanco.startsWith(inputApenasNumeros);
                                return matchNome || matchCpf;
                            });
                            return filtered.slice(0, 50);
                        }}
                        renderOption={(props, option) => {
                            const { key, ...optionProps } = props;
                            return (
                                <li key={key} {...optionProps} style={{ padding: 0 }}>
                                    <Box sx={{ p: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>{option.nome_completo}</Typography>
                                        <Typography variant="caption" sx={{ color: '#757575' }}>{option.cpf ? `CPF: ${option.cpf}` : 'Sem CPF'}</Typography>
                                    </Box>
                                </li>
                            );
                        }}
                        renderInput={(params) => (<TextField {...params} label="Buscar paciente por nome ou CPF *" size="small" error={!paciente} />)}
                    />
                </FormControl>
                <Tooltip title="Cadastrar Novo Paciente">
                    <Button variant="contained" color="primary" sx={{ minWidth: '40px', width: '40px', height: '40px', p: 0 }} onClick={handleCadastrarNovo}>
                        <PersonAddIcon />
                    </Button>
                </Tooltip>
            </Box>
            {pacienteDetalhes?.plano_convenio_detalhes && (
                <Alert severity="info" sx={{ mt: 1, py: 0, px: 2, '& .MuiAlert-message': { py: 0 } }}>
                    Plano: <strong>{pacienteDetalhes.plano_convenio_detalhes.convenio_nome}</strong>
                </Alert>
            )}
        </Paper>
    );
}
