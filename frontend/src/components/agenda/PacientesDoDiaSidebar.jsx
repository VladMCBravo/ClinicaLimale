import React, { useState, useEffect, useCallback } from 'react';
import { 
    Typography, Paper, List, ListItem, CircularProgress, 
    Tooltip, Box, IconButton, Divider, Chip, Dialog, DialogTitle, 
    DialogContent, DialogActions, Button, FormControl, RadioGroup, FormControlLabel, Radio
} from '@mui/material';
import { agendamentoService } from '../../services/agendamentoService';
import { formatarHoraTZ, formatarDataTZ } from '../../utils/format'; // <-- IMPORTANDO AQUI

// Ícones
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import StarIcon from '@mui/icons-material/Star';
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

const statusMap = {
    'Agendado': { icon: <AccessTimeIcon />, color: '#1976d2', title: 'Agendado' },
    'Aguardando Pagamento': { icon: <HourglassEmptyIcon />, color: '#ed6c02', title: 'Aguardando Pagamento' },
    'Confirmado': { icon: <CheckCircleIcon />, color: '#2e7d32', title: 'Confirmado (WhatsApp/Tel)' },
    'Cancelado': { icon: <CancelIcon />, color: '#d32f2f', title: 'Cancelado' },
    'Realizado': { icon: <DoneIcon />, color: '#757575', title: 'Realizado/Atendido' },
    'Não Compareceu': { icon: <PersonOffIcon />, color: '#9e9e9e', title: 'Não Compareceu' }
};

// Adicione a prop dataSelecionada aqui na declaração
function PacientesDoDiaSidebar({ refreshTrigger, medicoFiltro, dataSelecionada }) {
    const [pacientes, setPacientes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Usa a data clicada ou o dia de hoje se não tiver nada
    const dataExibicao = dataSelecionada || new Date();
    // --- NOVOS ESTADOS PARA O MODAL DE IMPRESSÃO ---
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printLoading, setPrintLoading] = useState(false);
    const [agendamentosPrint, setAgendamentosPrint] = useState([]);
    const [medicosPrint, setMedicosPrint] = useState([]);
    const [medicoSelecionadoPrint, setMedicoSelecionadoPrint] = useState('todos');

    // Verifica se a data selecionada é hoje
    const isHoje = dataExibicao.toDateString() === new Date().toDateString();
    
    // Formata visualmente: "Sex., 27 De Mar."
    const dataFormatada = dataExibicao.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

    const fetchPacientesDoDia = useCallback(async () => {
        setIsLoading(true);
        
        try {
            const response = await agendamentoService.getAgendamentosHoje(medicoFiltro, dataExibicao);
            
            // Lógica de agrupamento visual
            const agrupadosMap = new Map();
            
            response.data.forEach(ag => {
                // A chave considera o paciente e a hora de início exata
                const chave = `${ag.paciente_id || ag.paciente}_${ag.data_hora_inicio}`;
                const procAtual = ag.procedimento_descricao || ag.especialidade_nome || ag.procedimento || 'Consulta';
                
                if (agrupadosMap.has(chave)) {
                    const existente = agrupadosMap.get(chave);
                    existente.procedimento_descricao += ` + ${procAtual}`;
                    if (ag.pagamento_status === 'Pendente') existente.pagamento_status = 'Pendente';
                    // ADICIONADO: Guarda a ID dos outros exames na mochila
                    if (ag.procedimento) existente.lista_procedimentos_ids.push(ag.procedimento);
                    // Se qualquer exame do grupo for encaixe, o grupo inteiro é exibido como encaixe
                    existente.is_encaixe = existente.is_encaixe || ag.is_encaixe;
                } else {
                    const novo = { ...ag };
                    novo.procedimento_descricao = procAtual;
                    // ADICIONADO: Inicia a mochila com o primeiro exame
                    novo.lista_procedimentos_ids = ag.procedimento ? [ag.procedimento] : [];
                    agrupadosMap.set(chave, novo);
                }
            });

            // Converte o Map de volta para array e ordena
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

    // =========================================================================
    // AQUI ESTÁ O CARA QUE FALTAVA PARA FAZER A BUSCA ACONTECER:
    useEffect(() => {
        fetchPacientesDoDia();
    }, [fetchPacientesDoDia, refreshTrigger]); 
    // =========================================================================

    // 1. Função que abre o modal e busca quem são os médicos de hoje
    const handleOpenPrintClick = async () => {
        setPrintModalOpen(true);
        setPrintLoading(true);
        try {
            // Traz a agenda do dia INTEIRA (ignorando o filtro lateral) para listar os médicos
            const response = await agendamentoService.getAgendamentosHoje(null, dataExibicao);
            setAgendamentosPrint(response.data);

            // Filtra médicos únicos que têm agenda neste dia
            const mapMedicos = new Map();
            response.data.forEach(ag => {
                if (ag.medico) {
                    mapMedicos.set(ag.medico, ag.medico_nome_com_prefixo || ag.medico_nome);
                }
            });
            setMedicosPrint(Array.from(mapMedicos.entries()).map(([id, nome]) => ({id, nome})));
            setMedicoSelecionadoPrint('todos');
        } catch (error) {
            console.error("Erro ao preparar impressão:", error);
        } finally {
            setPrintLoading(false);
        }
    };

    // 2. Função que de fato filtra, agrupa e manda imprimir
    const executePrint = async () => {
        let aImprimir = agendamentosPrint;
        if (medicoSelecionadoPrint !== 'todos') {
            aImprimir = agendamentosPrint.filter(ag => String(ag.medico) === String(medicoSelecionadoPrint));
        }

        if (aImprimir.length === 0) {
            alert("Não há pacientes para o filtro selecionado.");
            return;
        }

        // Agrupa igual a sidebar faz (para juntar exames e não sair duplicado no papel)
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
                const response = await apiClient.post('/prontuario/aplicar-mascara/', formData, {
                    responseType: 'blob' 
                });
                const blobFinal = new Blob([response.data], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(blobFinal);
                window.open(blobUrl, '_blank');
                setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
            } catch (error) {
                console.error("Erro ao aplicar máscara na agenda:", error);
                alert("Erro ao gerar o PDF com o timbre. Verifique a conexão.");
            } finally {
                setPrintLoading(false);
                setPrintModalOpen(false); // Fecha o modal após abrir o PDF
            }
        }); 
    };

    return (
        <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#fdfdfd', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            
            {/* CABEÇALHO FIXO — título em cima, data e contagem embaixo (mesmo padrão da Lista de Espera) */}
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

            {/* LISTA ROLÁVEL */}
<Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
    {isLoading ? (
        <CircularProgress size={24} sx={{ display: 'block', margin: '20px auto' }} />
    ) : (
        <List disablePadding sx={{ width: '100%' }}>
            {pacientes.length > 0 ? pacientes.map(ag => {
                const isCancelado = ag.status === 'Cancelado';
                const statusInfo = statusMap[ag.status] || { icon: <HelpOutlineIcon />, color: '#9e9e9e', title: ag.status };
                const isRetorno = ag.tipo_visita === 'Retorno' || !ag.primeira_consulta;
                const isDevendo = ag.pagamento_status === 'Pendente';
                const isEncaixe = ag.is_encaixe && !isCancelado;

                return (
                    <ListItem
                        key={ag.id}
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            py: 0.35, // REDUZIDO: padding vertical
                            px: 0.75, // REDUZIDO: padding horizontal
                            mb: 0.35, // REDUZIDO: margem inferior
                            bgcolor: isCancelado ? '#f9f9f9' : (isEncaixe ? '#fffaf3' : '#fff'),
                            borderRadius: 1.5,
                            border: isEncaixe ? '1px solid #ffcc80' : '1px solid #f0f0f0',
                            borderLeft: `4px solid ${isCancelado ? '#e0e0e0' : (isEncaixe ? '#ffab00' : statusInfo.color)}`,
                            opacity: isCancelado ? 0.6 : 1,
                            transition: 'all 0.2s',
                            '&:hover': { bgcolor: '#f8fbff' }
                        }}
                    >
                        {/* LINHA 1: Horário, Nome e Ícone Status */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.15 }}>
                            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', overflow: 'hidden' }}>
                                <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', color: isCancelado ? '#999' : '#1C2E4A' }}>
                                    {formatarHoraTZ(ag.data_hora_inicio)}
                                </Typography>

                                {/* --- ADICIONADO AQUI: Badge com o ID do paciente --- */}
                                <Box component="span" sx={{
                                    bgcolor: isCancelado ? '#999' : '#1C2E4A', // Fica cinza se cancelado, padrão caso contrário
                                    color: '#FFF',
                                    px: 0.5,
                                    py: 0.2,
                                    borderRadius: '4px',
                                    fontSize: '0.55rem',
                                    fontWeight: 'bold',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    flexShrink: 0 // Impede que o ID seja espremido se o nome do paciente for muito grande
                                }}>
                                    ID: {ag.paciente_id || ag.paciente}
                                </Box>

                                {/* O 'noWrap' impede que o nome quebre em duas linhas, economizando altura */}
                                <Typography sx={{ fontWeight: 600, fontSize: '0.7rem', color: isCancelado ? '#999' : '#333', noWrap: true, textOverflow: 'ellipsis' }}>
                                    {ag.paciente_nome}
                                </Typography>
                            </Box>
                            <Tooltip title={statusInfo.title} placement="left">
                                {React.cloneElement(statusInfo.icon, { sx: { color: statusInfo.color, fontSize: 14 } })}
                            </Tooltip>
                        </Box>

                        {/* LINHA 2: Procedimento e Tags */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, overflow: 'hidden' }}>
                                <MedicalInformationIcon sx={{ fontSize: 11, color: '#78909c' }} />
                                <Typography sx={{ fontSize: '0.6rem', color: '#546e7a', noWrap: true, textOverflow: 'ellipsis' }}>
                                    {/* AQUI: O frontend tenta ler o nome. Se não tiver, cai pro que tem (o ID 38) */}
                                    {ag.procedimento_descricao || ag.especialidade_nome || ag.procedimento || 'Consulta'}
                                </Typography>
                            </Box>

                            {/* Ícones de Alerta / Tags Menores */}
                            <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center', flexShrink: 0 }}>
                                {ag.primeira_consulta ? (
                                    <Chip
                                        label="1ª Vez"
                                        size="small"
                                        sx={{ height: '12px', fontSize: '0.5rem', bgcolor: '#fff8e1', color: '#f57f17', border: '1px solid #ffe082', '& .MuiChip-label': { px: 0.4 } }}
                                    />
                                ) : (
                                    <Tooltip title="Retorno">
                                        <AssignmentReturnIcon sx={{ color: '#90caf9', fontSize: 12 }} />
                                    </Tooltip>
                                )}
                                {/* Adicione este bloco logo abaixo ou ao lado do Chip de '1ª Vez' */}
                                {isEncaixe && (
                                    <Chip
                                        label="⚡ Encaixe"
                                        size="small"
                                        sx={{
                                            height: '12px',
                                            fontSize: '0.5rem',
                                            bgcolor: '#fff3e0',
                                            color: '#e65100',
                                            border: '1px solid #ffcc80',
                                            fontWeight: 'bold',
                                            '& .MuiChip-label': { px: 0.4 },
                                            ml: 0.4 // Margem à esquerda para não colar nos outros ícones
                                        }}
                                    />
                                )}

                                {isDevendo && !isCancelado && (
                                    <Tooltip title="Pagamento Pendente">
                                        <MonetizationOnIcon sx={{ color: '#d32f2f', fontSize: 12 }} />
                                    </Tooltip>
                                )}
                            </Box>
                        </Box>

                        {/* LINHA 3: Sala e Médico */}
                        {(ag.sala_nome || ag.medico_nome) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.1 }}>
                                {ag.sala_nome && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, overflow: 'hidden' }}>
                                        <MeetingRoomOutlinedIcon sx={{ fontSize: 10, color: '#90a4ae' }} />
                                        <Typography sx={{ fontSize: '0.55rem', color: '#78909c', noWrap: true, textOverflow: 'ellipsis' }}>
                                            {ag.sala_nome}
                                        </Typography>
                                    </Box>
                                )}
                                {ag.medico_nome && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, overflow: 'hidden' }}>
                                        <PersonOutlineIcon sx={{ fontSize: 10, color: '#90a4ae' }} />
                                        <Typography sx={{ fontSize: '0.55rem', color: '#78909c', noWrap: true, textOverflow: 'ellipsis' }}>
                                            {ag.medico_nome_com_prefixo || ag.medico_nome}
                                        </Typography>
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
{/* MODAL DE IMPRESSÃO */}
            <Dialog open={printModalOpen} onClose={() => !printLoading && setPrintModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1C2E4A', fontSize: '1.1rem' }}>
                    Imprimir Agenda
                </DialogTitle>
                <DialogContent dividers>
                    {printLoading && agendamentosPrint.length === 0 ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
                    ) : (
                        <Box>
                            <Typography variant="body2" sx={{ mb: 2, color: '#555' }}>
                                Selecione a agenda de qual profissional você deseja imprimir (Data: {dataFormatada}):
                            </Typography>
                            <FormControl fullWidth>
                                <RadioGroup 
                                    value={medicoSelecionadoPrint} 
                                    onChange={(e) => setMedicoSelecionadoPrint(e.target.value)}
                                >
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
                    <Button onClick={() => setPrintModalOpen(false)} color="inherit" disabled={printLoading} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                        Cancelar
                    </Button>
                    <Button onClick={executePrint} variant="contained" color="primary" disabled={printLoading || medicosPrint.length === 0} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                        {printLoading ? <CircularProgress size={20} color="inherit" /> : 'Gerar PDF'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}

export default React.memo(PacientesDoDiaSidebar);