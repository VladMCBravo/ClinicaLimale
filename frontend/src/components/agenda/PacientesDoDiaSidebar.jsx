// src/components/agenda/PacientesDoDiaSidebar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Typography, Paper, List, ListItem, CircularProgress, 
    Tooltip, Box, IconButton, Divider, Chip, Dialog, DialogTitle, 
    DialogContent, DialogActions, Button, FormControl, RadioGroup, FormControlLabel, Radio
} from '@mui/material';
import { agendamentoService } from '../../services/agendamentoService';
import { formatarHoraTZ, formatarDataTZ } from '../../utils/format';
import { calcularStatusSemaforo } from '../../utils/semaforoAgendamento'; // <-- NOSSO MOTOR DE CORES

// Ícones
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DoneIcon from '@mui/icons-material/Done';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import PrintIcon from '@mui/icons-material/Print';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { gerarPdfAgendaDia } from '../../utils/agendaPdfGenerator';
import apiClient from '../../api/axiosConfig';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import StethoscopeIcon from '@mui/icons-material/MedicalServices';

const statusMap = {
    'Agendado': { icon: <AccessTimeIcon />, color: '#1976d2', title: 'Agendado' },
    'Confirmado': { icon: <CheckCircleIcon />, color: '#2e7d32', title: 'Confirmado (WhatsApp/Tel)' },
    'Aguardando': { icon: <AirlineSeatReclineNormalIcon />, color: '#eab308', title: 'Check-in Realizado' },
    'Em Atendimento': { icon: <StethoscopeIcon />, color: '#0ea5e9', title: 'Paciente em Atendimento' },
    'Realizado': { icon: <DoneIcon />, color: '#757575', title: 'Realizado/Atendido' },
    'Não Compareceu': { icon: <PersonOffIcon />, color: '#9e9e9e', title: 'Não Compareceu' },
    'Cancelado': { icon: <CancelIcon />, color: '#d32f2f', title: 'Cancelado' }
};

function PacientesDoDiaSidebar({ refreshTrigger, medicoFiltro, dataSelecionada }) {
    const [pacientes, setPacientes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [now, setNow] = useState(new Date()); // <-- O Relógio para o cronômetro

    // Ticker: Atualiza o estado "now" a cada 30 segundos
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(interval);
    }, []);

    const obterDataSegura = (dataInput) => {
        if (!dataInput) return new Date();
        const d = new Date(dataInput);
        if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
            const ano = d.getUTCFullYear();
            const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
            const dia = String(d.getUTCDate()).padStart(2, '0');
            return new Date(`${ano}-${mes}-${dia}T12:00:00`);
        }
        return d;
    };

    const dataExibicao = obterDataSegura(dataSelecionada);

    // --- ESTADOS PARA O MODAL DE IMPRESSÃO ---
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printLoading, setPrintLoading] = useState(false);
    const [agendamentosPrint, setAgendamentosPrint] = useState([]);
    const [medicosPrint, setMedicosPrint] = useState([]);
    const [medicoSelecionadoPrint, setMedicoSelecionadoPrint] = useState('todos');

    const hojeLocal = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const dataExibicaoLocal = dataExibicao.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const isHoje = hojeLocal === dataExibicaoLocal;
    
    const dataFormatada = dataExibicao.toLocaleDateString('pt-BR', { 
        weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' 
    });

    const fetchPacientesDoDia = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await agendamentoService.getAgendamentosHoje(medicoFiltro, dataExibicao);
            const agrupadosMap = new Map();
            
            response.data.forEach(ag => {
                const chave = `${ag.paciente_id || ag.paciente}_${ag.data_hora_inicio}`;
                const procAtual = ag.procedimento_descricao || ag.especialidade_nome || ag.procedimento || 'Consulta';
                
                if (agrupadosMap.has(chave)) {
                    const existente = agrupadosMap.get(chave);
                    existente.procedimento_descricao += ` + ${procAtual}`;
                    if (ag.pagamento_status === 'Pendente') existente.pagamento_status = 'Pendente';
                    if (ag.procedimento) existente.lista_procedimentos_ids.push(ag.procedimento);
                    existente.is_encaixe = existente.is_encaixe || ag.is_encaixe;
                } else {
                    const novo = { ...ag };
                    novo.procedimento_descricao = procAtual;
                    novo.lista_procedimentos_ids = ag.procedimento ? [ag.procedimento] : [];
                    agrupadosMap.set(chave, novo);
                }
            });

            const dadosOrdenados = Array.from(agrupadosMap.values()).sort((a, b) => 
                new Date(a.data_hora_inicio) - new Date(b.data_hora_inicio)
            );
            setPacientes(dadosOrdenados);
        } catch (error) {
            console.error("Erro ao buscar pacientes do dia:", error);
            setPacientes([]);
        } finally {
            setIsLoading(false);
        }
    }, [medicoFiltro, dataSelecionada]);

    useEffect(() => { fetchPacientesDoDia(); }, [fetchPacientesDoDia, refreshTrigger]); 

    // --- FUNÇÕES DE IMPRESSÃO MANTIDAS INTACTAS ---
    const handleOpenPrintClick = async () => {
        setPrintModalOpen(true);
        setPrintLoading(true);
        try {
            const response = await agendamentoService.getAgendamentosHoje(null, dataExibicao);
            setAgendamentosPrint(response.data);
            const mapMedicos = new Map();
            response.data.forEach(ag => {
                if (ag.medico) mapMedicos.set(ag.medico, ag.medico_nome_com_prefixo || ag.medico_nome);
            });
            setMedicosPrint(Array.from(mapMedicos.entries()).map(([id, nome]) => ({id, nome})));
            setMedicoSelecionadoPrint('todos');
        } catch (error) {
            console.error("Erro ao preparar impressão:", error);
        } finally {
            setPrintLoading(false);
        }
    };

    const executePrint = async () => {
        let aImprimir = agendamentosPrint;
        if (medicoSelecionadoPrint !== 'todos') {
            aImprimir = agendamentosPrint.filter(ag => String(ag.medico) === String(medicoSelecionadoPrint));
        }

        if (aImprimir.length === 0) {
            alert("Não há pacientes para o filtro selecionado.");
            return;
        }

        const agrupadosMap = new Map();
        aImprimir.forEach(ag => {
            const chave = `${ag.paciente_id || ag.paciente}_${ag.data_hora_inicio}`;
            const procAtual = ag.procedimento_descricao || ag.especialidade_nome || ag.procedimento || 'Consulta';
            
            if (agrupadosMap.has(chave)) {
                const existente = agrupadosMap.get(chave);
                existente.procedimento_descricao += ` + ${procAtual}`;
                if (ag.pagamento_status === 'Pendente') existente.pagamento_status = 'Pendente';
                if (ag.procedimento) existente.lista_procedimentos_ids.push(ag.procedimento);
                existente.is_encaixe = existente.is_encaixe || ag.is_encaixe;
            } else {
                const novo = { ...ag };
                novo.procedimento_descricao = procAtual;
                novo.lista_procedimentos_ids = ag.procedimento ? [ag.procedimento] : [];
                agrupadosMap.set(chave, novo);
            }
        });

        const dadosOrdenados = Array.from(agrupadosMap.values()).sort((a, b) => 
            new Date(a.data_hora_inicio) - new Date(b.data_hora_inicio)
        );

        setPrintLoading(true);
        await gerarPdfAgendaDia(dadosOrdenados, dataExibicao, async (blobTransparente) => {
            try {
                const formData = new FormData();
                formData.append('arquivo_pdf', blobTransparente, 'agenda_rascunho.pdf');
                const response = await apiClient.post('/prontuario/aplicar-mascara/', formData, { responseType: 'blob' });
                const blobFinal = new Blob([response.data], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(blobFinal);
                window.open(blobUrl, '_blank');
                setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
            } catch (error) {
                console.error("Erro ao aplicar máscara na agenda:", error);
                alert("Erro ao gerar o PDF com o timbre. Verifique a conexão.");
            } finally {
                setPrintLoading(false);
                setPrintModalOpen(false);
            }
        }); 
    };

    return (
        <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#fdfdfd', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            
            <Box sx={{
                px: 1.5, py: 0.9, borderBottom: '1px solid #eee', bgcolor: '#fff',
                borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1
            }}>
                <Box sx={{ overflow: 'hidden' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#1C2E4A', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isHoje ? 'Agenda Hoje' : 'Agenda do Dia'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: '#666', textTransform: 'capitalize', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {dataFormatada} • {pacientes.length} agendamentos
                    </Typography>
                </Box>
                <Tooltip title="Imprimir Relação do Dia">
                    <IconButton size="small" onClick={handleOpenPrintClick} sx={{ color: '#1976d2', bgcolor: '#f0f7ff', flexShrink: 0 }}>
                        <PrintIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
                {isLoading ? (
                    <CircularProgress size={24} sx={{ display: 'block', margin: '20px auto' }} />
                ) : (
                    <List disablePadding sx={{ width: '100%' }}>
                        {pacientes.length > 0 ? pacientes.map(ag => {
                            const isCancelado = ag.status === 'Cancelado' || ag.status === 'Não Compareceu';
                            const statusInfo = statusMap[ag.status] || { icon: <HelpOutlineIcon />, color: '#9e9e9e', title: ag.status };
                            const isDevendo = ag.pagamento_status === 'Pendente';
                            const isEncaixe = ag.is_encaixe && !isCancelado;
                            
                            // ==========================================
                            // MAGICA: Calculamos a cor baseada no nosso Semáforo
                            // ==========================================
                            const semaforo = calcularStatusSemaforo(ag, now);

                            return (
                                <ListItem
                                    key={ag.id}
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'stretch',
                                        py: 0.5, px: 1, mb: 0.5, borderRadius: 1.5,
                                        bgcolor: semaforo.cor.bg,
                                        border: `1px solid ${semaforo.cor.border}`,
                                        borderLeft: `4px solid ${semaforo.cor.indicator}`,
                                        opacity: isCancelado ? 0.6 : 1,
                                        transition: 'all 0.3s ease',
                                        '&:hover': { filter: 'brightness(0.97)' }
                                    }}
                                >
                                    {/* LINHA 1: Horário, ID, Nome e Cronômetro/Status */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.25 }}>
                                        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', overflow: 'hidden', flexGrow: 1 }}>
                                            <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', color: semaforo.cor.text }}>
                                                {formatarHoraTZ(ag.data_hora_inicio)}
                                            </Typography>
                                            
                                            <Box component="span" sx={{
                                                bgcolor: semaforo.cor.text, color: semaforo.cor.bg,
                                                px: 0.5, py: 0.1, borderRadius: '4px', fontSize: '0.55rem',
                                                fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', flexShrink: 0 
                                            }}>
                                                ID: {ag.paciente_id || ag.paciente}
                                            </Box>

                                            <Typography sx={{ fontWeight: 700, fontSize: '0.72rem', color: semaforo.cor.text, noWrap: true, textOverflow: 'ellipsis' }}>
                                                {ag.paciente_nome}
                                            </Typography>
                                        </Box>
                                        
                                        {/* CRONÔMETRO / TEXTO DO STATUS */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, ml: 1 }}>
                                            {semaforo.timer && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(255,255,255,0.5)', px: 0.5, borderRadius: 1, mb: 0.25 }}>
                                                    <AccessTimeIcon sx={{ fontSize: 10, color: semaforo.cor.text }} />
                                                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: semaforo.cor.text }}>
                                                        {semaforo.timer}
                                                    </Typography>
                                                </Box>
                                            )}
                                            <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: semaforo.cor.text, opacity: 0.9 }}>
                                                {semaforo.label}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* LINHA 2: Procedimento e Tags (1ª Vez, Pendente, Encaixe) */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, overflow: 'hidden' }}>
                                            <MedicalInformationIcon sx={{ fontSize: 11, color: semaforo.cor.indicator }} />
                                            <Typography sx={{ fontSize: '0.6rem', color: semaforo.cor.text, opacity: 0.9, noWrap: true, textOverflow: 'ellipsis' }}>
                                                {ag.procedimento_descricao || ag.especialidade_nome || ag.procedimento || 'Consulta'}
                                            </Typography>
                                        </Box>

                                        <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center', flexShrink: 0 }}>
                                            {ag.primeira_consulta ? (
                                                <Chip label="1ª Vez" size="small" sx={{ height: '12px', fontSize: '0.5rem', bgcolor: '#fff8e1', color: '#f57f17', border: '1px solid #ffe082', '& .MuiChip-label': { px: 0.4 } }} />
                                            ) : (
                                                <Tooltip title="Retorno"><AssignmentReturnIcon sx={{ color: semaforo.cor.indicator, fontSize: 12 }} /></Tooltip>
                                            )}
                                            
                                            {isEncaixe && (
                                                <Chip label="⚡ Encaixe" size="small" sx={{ height: '12px', fontSize: '0.5rem', bgcolor: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80', fontWeight: 'bold', '& .MuiChip-label': { px: 0.4 }, ml: 0.4 }} />
                                            )}

                                            {isDevendo && !isCancelado && (
                                                <Tooltip title="Pagamento Pendente"><MonetizationOnIcon sx={{ color: '#d32f2f', fontSize: 13 }} /></Tooltip>
                                            )}
                                        </Box>
                                    </Box>

                                    {/* LINHA 3: Sala e Médico */}
                                    {(ag.sala_nome || ag.medico_nome) && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.3 }}>
                                            {ag.sala_nome && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, overflow: 'hidden' }}>
                                                    <MeetingRoomOutlinedIcon sx={{ fontSize: 10, color: semaforo.cor.text, opacity: 0.7 }} />
                                                    <Typography sx={{ fontSize: '0.55rem', color: semaforo.cor.text, opacity: 0.8, noWrap: true }}>{ag.sala_nome}</Typography>
                                                </Box>
                                            )}
                                            {ag.medico_nome && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, overflow: 'hidden' }}>
                                                    <PersonOutlineIcon sx={{ fontSize: 10, color: semaforo.cor.text, opacity: 0.7 }} />
                                                    <Typography sx={{ fontSize: '0.55rem', color: semaforo.cor.text, opacity: 0.8, noWrap: true }}>{ag.medico_nome_com_prefixo || ag.medico_nome}</Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    )}
                                </ListItem>
                            );
                        }) : (
                            <Typography sx={{ color: '#999', textAlign: 'center', fontSize: '0.8rem', mt: 4 }}>
                                Nenhum agendamento para hoje.
                            </Typography>
                        )}
                    </List>
                )}
            </Box>

            {/* MODAL DE IMPRESSÃO - PRESERVADO */}
            <Dialog open={printModalOpen} onClose={() => !printLoading && setPrintModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1C2E4A', fontSize: '1.1rem' }}>Imprimir Agenda</DialogTitle>
                <DialogContent dividers>
                    {printLoading && agendamentosPrint.length === 0 ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
                    ) : (
                        <Box>
                            <Typography variant="body2" sx={{ mb: 2, color: '#555' }}>
                                Selecione a agenda de qual profissional você deseja imprimir (Data: {dataFormatada}):
                            </Typography>
                            <FormControl fullWidth>
                                <RadioGroup value={medicoSelecionadoPrint} onChange={(e) => setMedicoSelecionadoPrint(e.target.value)}>
                                    <FormControlLabel value="todos" control={<Radio size="small" />} label={<Typography variant="body2" fontWeight="bold">Todos os Médicos (Completa)</Typography>} />
                                    {medicosPrint.map(m => (
                                        <FormControlLabel key={m.id} value={String(m.id)} control={<Radio size="small" />} label={<Typography variant="body2">{m.nome}</Typography>} />
                                    ))}
                                </RadioGroup>
                            </FormControl>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setPrintModalOpen(false)} color="inherit" disabled={printLoading} sx={{ textTransform: 'none', fontWeight: 'bold' }}>Cancelar</Button>
                    <Button onClick={executePrint} variant="contained" color="primary" disabled={printLoading || medicosPrint.length === 0} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                        {printLoading ? <CircularProgress size={20} color="inherit" /> : 'Gerar PDF'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}

export default React.memo(PacientesDoDiaSidebar);