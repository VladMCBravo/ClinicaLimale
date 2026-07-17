import React, { useState, useEffect, useCallback } from 'react';
import { 
    Typography, Paper, List, ListItem, CircularProgress, 
    Tooltip, Box, IconButton, Divider, Chip
} from '@mui/material';
import { agendamentoService } from '../../services/agendamentoService';

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

    // A função de imprimir usando a data correta:
    const handlePrint = async () => {
        if (pacientes.length === 0) {
            alert("Não há pacientes para imprimir neste dia.");
            return;
        }
        
        // Colocamos um feedback visual simples para o usuário não clicar duas vezes
        const btnPrint = document.getElementById('btn-imprimir-agenda');
        if(btnPrint) btnPrint.style.opacity = '0.5';

        // Chamamos o gerador passando uma função de callback que recebe o blob transparente
        await gerarPdfAgendaDia(pacientes, dataExibicao, async (blobTransparente) => {
            try {
                // 1. Preparamos o arquivo para envio
                const formData = new FormData();
                formData.append('arquivo_pdf', blobTransparente, 'agenda_rascunho.pdf');

                // 2. Enviamos para a nova rota do Django (Vamos criar ela já já)
                const response = await apiClient.post('/prontuario/aplicar-mascara/', formData, {
                    responseType: 'blob' // É vital pedir um blob de volta, pois o Django devolverá um arquivo PDF direto
                });

                // 3. Recebemos o PDF final carimbado e abrimos na tela
                const blobFinal = new Blob([response.data], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(blobFinal);
                window.open(blobUrl, '_blank');
                
                // Opcional: Forçar download silencioso
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = blobUrl;
                a.download = `Agenda_Limale_${dataExibicao.toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

            } catch (error) {
                console.error("Erro ao aplicar máscara na agenda:", error);
                alert("Erro ao gerar o PDF com o timbre da clínica. Verifique a conexão.");
            } finally {
                if(btnPrint) btnPrint.style.opacity = '1';
            }
        }); 
    };

    return (
        <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#fdfdfd', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            
            {/* CABEÇALHO FIXO */}
            <Box sx={{ p: 1.5, borderBottom: '1px solid #eee', bgcolor: '#fff', borderRadius: '8px 8px 0 0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box>
                        {/* <--- ADICIONADO AQUI: Título dinâmico */}
                        <Typography variant="subtitle1" sx={{ fontWeight: '800', color: '#1C2E4A', lineHeight: 1.2 }}>
                            {isHoje ? 'Agenda Hoje' : 'Agenda do Dia'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#666', textTransform: 'capitalize' }}>
                            {dataFormatada} • {pacientes.length} agendamentos
                        </Typography>
                    </Box>
                    <Tooltip title="Imprimir Relação do Dia">
                        <IconButton size="small" onClick={handlePrint} sx={{ color: '#1976d2', bgcolor: '#f0f7ff' }}>
                            <PrintIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
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
                            py: 0.5,  // REDUZIDO: padding vertical
                            px: 1,    // REDUZIDO: padding horizontal
                            mb: 0.5,  // REDUZIDO: margem inferior
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
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', overflow: 'hidden' }}>
                                <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: isCancelado ? '#999' : '#1C2E4A' }}>
                                    {new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </Typography>

                                {/* --- ADICIONADO AQUI: Badge com o ID do paciente --- */}
                                <Box component="span" sx={{
                                    bgcolor: isCancelado ? '#999' : '#1C2E4A', // Fica cinza se cancelado, padrão caso contrário
                                    color: '#FFF', 
                                    px: 0.6, 
                                    py: 0.3, 
                                    borderRadius: '4px', 
                                    fontSize: '0.6rem',
                                    fontWeight: 'bold',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    flexShrink: 0 // Impede que o ID seja espremido se o nome do paciente for muito grande
                                }}>
                                    ID: {ag.paciente_id || ag.paciente}
                                </Box>

                                {/* O 'noWrap' impede que o nome quebre em duas linhas, economizando altura */}
                                <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: isCancelado ? '#999' : '#333', noWrap: true, textOverflow: 'ellipsis' }}>
                                    {ag.paciente_nome}
                                </Typography>
                            </Box>
                            <Tooltip title={statusInfo.title} placement="left">
                                {React.cloneElement(statusInfo.icon, { sx: { color: statusInfo.color, fontSize: 16 } })}
                            </Tooltip>
                        </Box>

                        {/* LINHA 2: Procedimento e Tags */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                                <MedicalInformationIcon sx={{ fontSize: 13, color: '#78909c' }} />
                                <Typography sx={{ fontSize: '0.65rem', color: '#546e7a', noWrap: true, textOverflow: 'ellipsis' }}>
                                    {/* AQUI: O frontend tenta ler o nome. Se não tiver, cai pro que tem (o ID 38) */}
                                    {ag.procedimento_descricao || ag.especialidade_nome || ag.procedimento || 'Consulta'}
                                </Typography>
                            </Box>

                            {/* Ícones de Alerta / Tags Menores */}
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
                                {ag.primeira_consulta ? (
                                    <Chip 
                                        label="1ª Vez" 
                                        size="small" 
                                        sx={{ height: '14px', fontSize: '0.55rem', bgcolor: '#fff8e1', color: '#f57f17', border: '1px solid #ffe082', '& .MuiChip-label': { px: 0.5 } }} 
                                    />
                                ) : (
                                    <Tooltip title="Retorno">
                                        <AssignmentReturnIcon sx={{ color: '#90caf9', fontSize: 14 }} />
                                    </Tooltip>
                                )}
                                {/* Adicione este bloco logo abaixo ou ao lado do Chip de '1ª Vez' */}
                                {isEncaixe && (
                                    <Chip
                                        label="⚡ Encaixe"
                                        size="small"
                                        sx={{
                                            height: '14px',
                                            fontSize: '0.55rem',
                                            bgcolor: '#fff3e0',
                                            color: '#e65100',
                                            border: '1px solid #ffcc80',
                                            fontWeight: 'bold',
                                            '& .MuiChip-label': { px: 0.5 },
                                            ml: 0.5 // Margem à esquerda para não colar nos outros ícones
                                        }}
                                    />
                                )}
                                
                                {isDevendo && !isCancelado && (
                                    <Tooltip title="Pagamento Pendente">
                                        <MonetizationOnIcon sx={{ color: '#d32f2f', fontSize: 14 }} />
                                    </Tooltip>
                                )}
                            </Box>
                        </Box>

                        {/* LINHA 3: Sala e Médico */}
                        {(ag.sala_nome || ag.medico_nome) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                                {ag.sala_nome && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                                        <MeetingRoomOutlinedIcon sx={{ fontSize: 12, color: '#90a4ae' }} />
                                        <Typography sx={{ fontSize: '0.6rem', color: '#78909c', noWrap: true, textOverflow: 'ellipsis' }}>
                                            {ag.sala_nome}
                                        </Typography>
                                    </Box>
                                )}
                                {ag.medico_nome && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                                        <PersonOutlineIcon sx={{ fontSize: 12, color: '#90a4ae' }} />
                                        <Typography sx={{ fontSize: '0.6rem', color: '#78909c', noWrap: true, textOverflow: 'ellipsis' }}>
                                            Dr(a). {ag.medico_nome}
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
        </Paper>
    );
}

export default React.memo(PacientesDoDiaSidebar);