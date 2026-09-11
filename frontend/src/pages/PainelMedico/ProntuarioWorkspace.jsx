// src/pages/PainelMedico/ProntuarioWorkspace.jsx

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { 
    Box, Typography, List, ListItem, ListItemButton, ListItemText, 
    CircularProgress, IconButton, Tooltip, Divider, Tabs, Tab, Chip
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderIcon from '@mui/icons-material/Folder';
import ImageIcon from '@mui/icons-material/Image';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VideocamIcon from '@mui/icons-material/Videocam';

// --- ÍCONES E LÓGICA DA AGENDA ---
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { calcularStatusSemaforo } from '../../utils/semaforoAgendamento';

import apiClient from '../../api/axiosConfig'; 
import { formatarHoraTZ } from '../../utils/format';

// --- Importação Tardia (Lazy) das Ferramentas e Formulários ---
const AtendimentoPediatria = lazy(() => import('../../components/prontuario/AtendimentoPediatria'));
const AtendimentoNeonatologia = lazy(() => import('../../components/prontuario/AtendimentoNeonatologia'));
const AtendimentoClinicaGeral = lazy(() => import('../../components/prontuario/AtendimentoClinicaGeral'));
const AtendimentoCardiologia = lazy(() => import('../../components/prontuario/AtendimentoCardiologia'));
const AtendimentoObstetricia = lazy(() => import('../../components/prontuario/AtendimentoObstetricia'));
const PrescricoesTab = lazy(() => import('../../components/prontuario/PrescricoesTab'));
const RelatoriosTab = lazy(() => import('../../components/prontuario/RelatoriosTab'));
const DocumentosTab = lazy(() => import('../../components/prontuario/DocumentosTab'));
const ExamesDicomTab = lazy(() => import('../../components/prontuario/ExamesDicomTab'));
const LaudosTab = lazy(() => import('../../components/laudos/LaudosTab'));
const VisaoGeralPaciente = lazy(() => import('../../components/prontuario/VisaoGeralPaciente'));
const TelemedicinaTab = lazy(() => import('../../components/prontuario/TelemedicinaTab'));

export default function ProntuarioWorkspace() {
    // --- ESTADOS GLOBAIS DA TELA ---
    const [pacienteAtivo, setPacienteAtivo] = useState(null); 
    const [agendamentoAtivo, setAgendamentoAtivo] = useState(null); 
    
    // Controle das Colunas
    const [abaEsquerda, setAbaEsquerda] = useState(0); 
    const [listaEsquerda, setListaEsquerda] = useState([]);
    const [isLoadingLista, setIsLoadingLista] = useState(false);
    
    const [conteudoCentral, setConteudoCentral] = useState({ tipo: 'VAZIO' }); 
    const [ferramentaDireita, setFerramentaDireita] = useState(null);

    // Relógio para o cronômetro do semáforo da agenda
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(interval);
    }, []);

    // Formata a data de AAAA-MM-DD para DD/MM/AAAA
    const formatarData = (dataBase) => {
        if (!dataBase) return 'N/A';
        if (dataBase.includes('-')) {
            const [ano, mes, dia] = dataBase.split('-');
            return `${dia}/${mes}/${ano}`;
        }
        return dataBase;
    };

    // --- CARREGAMENTO DA COLUNA ESQUERDA (Listas) ---
    useEffect(() => {
        carregarListaEsquerda();
    }, [abaEsquerda]);

    const carregarListaEsquerda = async () => {
        setIsLoadingLista(true);
        try {
            const endpoint = abaEsquerda === 0 
                ? '/prontuario/workspace/minhas-consultas/' 
                : '/prontuario/workspace/meus-pacientes/';
            
            const response = await apiClient.get(endpoint);
            setListaEsquerda(response.data);
        } catch (error) {
            console.error("Erro ao carregar lista lateral", error);
            if (abaEsquerda === 0) {
                setListaEsquerda([
                    { id: 101, paciente_id: 1, paciente_nome: 'Maria Silva Teste', horario: '14:00', especialidade: 'Clínica Geral' },
                    { id: 102, paciente_id: 2, paciente_nome: 'João Pediatria', horario: '14:30', especialidade: 'Pediatria' }
                ]);
            } else {
                setListaEsquerda([
                    { id: 1, nome_completo: 'Maria Silva Teste', ultima_consulta: '10/05/2026' },
                    { id: 2, nome_completo: 'João Pediatria', ultima_consulta: 'Ontem' }
                ]);
            }
        } finally {
            setIsLoadingLista(false);
        }
    };

    const carregarBanner = async (pacId) => {
        try {
            const resBanner = await apiClient.get(`/prontuario/workspace/banner/${pacId}/`);
            setPacienteAtivo(resBanner.data);
        } catch (error) {
            console.error("Erro ao recarregar banner", error);
        }
    };

    // --- AÇÕES DO USUÁRIO ---
    const selecionarPaciente = (itemLista) => {
        const pacId = abaEsquerda === 0 ? itemLista.paciente_id : itemLista.id;
        const agendamento = abaEsquerda === 0 ? itemLista : null;
        
        setAgendamentoAtivo(agendamento);
        setFerramentaDireita(null);

        carregarBanner(pacId); 

        if (agendamento) {
            setConteudoCentral({ tipo: 'NOVO_ATENDIMENTO', especialidade: agendamento.especialidade });
        } else {
            setConteudoCentral({ tipo: 'HISTORICO_GERAL' });
        }
    };

    const toggleFerramenta = (ferramenta) => {
        if (!pacienteAtivo) return;
        setFerramentaDireita(prev => prev === ferramenta ? null : ferramenta);
    };

    // --- RENDERIZADORES DINÂMICOS ---
    const renderizarCentro = () => {
        if (conteudoCentral.tipo === 'VAZIO' || !pacienteAtivo) {
            return (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f4f6f8' }}>
                    <Typography color="text.secondary">Selecione um paciente na lista à esquerda.</Typography>
                </Box>
            );
        }

        if (conteudoCentral.tipo === 'NOVO_ATENDIMENTO') {
            const esp = conteudoCentral.especialidade?.toLowerCase() || '';
            const props = { 
                pacienteId: pacienteAtivo.id, 
                agendamentoId: agendamentoAtivo?.id,
                onEvolucaoSalva: () => {
                    carregarBanner(pacienteAtivo.id); 
                } 
            };

            return (
                <Suspense fallback={<CircularProgress sx={{ m: 'auto', display: 'block', mt: 4 }} />}>
                    {esp.includes('pediatria') ? <AtendimentoPediatria {...props} /> :
                     esp.includes('neonatologia') ? <AtendimentoNeonatologia {...props} /> :
                     esp.includes('cardio') ? <AtendimentoCardiologia {...props} /> :
                     esp.includes('obstetr') ? <AtendimentoObstetricia {...props} /> :
                     <AtendimentoClinicaGeral {...props} />}
                </Suspense>
            );
        }

        if (conteudoCentral.tipo === 'HISTORICO_GERAL') {
            return (
                <Suspense fallback={<CircularProgress sx={{ m: 'auto', display: 'block', mt: 4 }} />}>
                    <VisaoGeralPaciente pacienteId={pacienteAtivo.id} />
                </Suspense>
            );
        }
    };

    return (
        <Box sx={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#ffffff', overflow: 'hidden' }}>
            
            {/* PATIENT BANNER (Topo) */}
            <Box sx={{ 
                height: '45px', bgcolor: '#2c3338', color: '#f8f9fa', px: 2, 
                display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                borderBottom: '3px solid #1976d2' 
            }}>
                {pacienteAtivo ? (
                    <>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, minWidth: '200px' }}>
                            {pacienteAtivo.nome_completo}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 3, fontSize: '0.75rem', color: '#ced4da', flexGrow: 1 }}>
                            <Box><strong>Prontuário:</strong> {pacienteAtivo.id}</Box>
                            <Box><strong>Nascimento:</strong> {formatarData(pacienteAtivo.data_nascimento)} ({pacienteAtivo.idade_formatada || 'Indisponível'})</Box>
                            <Box><strong>Sexo:</strong> {pacienteAtivo.genero}</Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, fontSize: '0.75rem', color: '#ced4da', borderLeft: '1px solid #555', pl: 2 }}>
                            <Box><strong>PA:</strong> {pacienteAtivo.sinais_vitais?.pa}</Box>
                            <Box><strong>FC:</strong> {pacienteAtivo.sinais_vitais?.fc}</Box>
                            <Box><strong>Peso:</strong> {pacienteAtivo.sinais_vitais?.peso}</Box>
                            <Box><strong>Altura:</strong> {pacienteAtivo.sinais_vitais?.altura}</Box>
                        </Box>
                    </>
                ) : (
                    <Typography variant="body2" color="#888">Nenhum paciente selecionado</Typography>
                )}
            </Box>

            {/* ÁREA DE TRABALHO */}
            <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
                
                {/* COLUNA ESQUERDA (Navegação Mestre) */}
                <Box sx={{ width: '290px', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', flexShrink: 0, bgcolor: '#fafafa' }}>
                    <Tabs value={abaEsquerda} onChange={(e, val) => setAbaEsquerda(val)} variant="fullWidth" sx={{ minHeight: '36px' }}>
                        <Tab label="Consultas" sx={{ minHeight: '36px', py: 0, fontSize: '0.8rem' }} />
                        <Tab label="Pacientes" sx={{ minHeight: '36px', py: 0, fontSize: '0.8rem' }} />
                    </Tabs>
                    <Divider />
                    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                        {isLoadingLista ? <CircularProgress size={24} sx={{ m: 2, display: 'block' }} /> : (
                            <List dense disablePadding sx={{ px: 1, py: 0.5 }}>
                                {listaEsquerda.map((item, index) => {
                                    if (abaEsquerda === 0) {
                                        // ==========================================
                                        // CARDS ESTILO AGENDA (Semáforo)
                                        // ==========================================
                                        const isCancelado = item.status === 'Cancelado' || item.status === 'Não Compareceu';
                                        const isDevendo = item.status_pagamento === 'Pendente';
                                        const isEncaixe = item.is_encaixe && !isCancelado;
                                        
                                        const semaforo = calcularStatusSemaforo(item, now);
                                        const isSelected = pacienteAtivo?.id === item.paciente_id;
                                        
                                        const borderColor = isSelected ? '#1976d2' : semaforo.cor.border;
                                        const indicatorColor = isSelected ? '#1976d2' : semaforo.cor.indicator;

                                        return (
                                            <ListItem key={index} disablePadding sx={{ mb: 0.8 }}>
                                                <ListItemButton 
                                                    onClick={() => selecionarPaciente(item)} 
                                                    selected={isSelected}
                                                    sx={{ 
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'stretch',
                                                        py: 0.6, px: 1, borderRadius: 1.5,
                                                        bgcolor: isSelected ? '#f0f7ff' : semaforo.cor.bg,
                                                        border: `1px solid ${borderColor}`,
                                                        borderLeft: `4px solid ${indicatorColor}`,
                                                        opacity: isCancelado ? 0.6 : 1,
                                                        transition: 'all 0.3s ease',
                                                        '&:hover': { filter: 'brightness(0.97)' }
                                                    }}
                                                >
                                                    {/* LINHA 1: Horário, ID, Nome e Cronômetro/Status */}
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 0.5, mb: 0.25, width: '100%' }}>
                                                        <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center', overflow: 'hidden', minWidth: 0, flexGrow: 1 }}>
                                                            <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', color: semaforo.cor.text, flexShrink: 0 }}>
                                                                {item.data_hora_inicio ? formatarHoraTZ(item.data_hora_inicio) : item.horario}
                                                            </Typography>

                                                            <Box component="span" sx={{
                                                                bgcolor: semaforo.cor.text, color: semaforo.cor.bg,
                                                                px: 0.5, py: 0.1, borderRadius: '4px', fontSize: '0.55rem',
                                                                fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', flexShrink: 0
                                                            }}>
                                                                ID: {item.paciente_id || item.id}
                                                            </Box>

                                                            <Tooltip title={item.paciente_nome || ''}>
                                                                <Typography noWrap sx={{ fontWeight: 700, fontSize: '0.72rem', color: semaforo.cor.text, minWidth: 0, textDecoration: isCancelado ? 'line-through' : 'none' }}>
                                                                    {item.paciente_nome}
                                                                </Typography>
                                                            </Tooltip>
                                                        </Box>

                                                        {/* CRONÔMETRO + STATUS */}
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexShrink: 0, ml: 0.5, maxWidth: '46%' }}>
                                                            {semaforo.timer && (
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, bgcolor: 'rgba(255,255,255,0.5)', px: 0.5, py: 0.05, borderRadius: 1, flexShrink: 0 }}>
                                                                    <AccessTimeIcon sx={{ fontSize: 10, color: semaforo.cor.text }} />
                                                                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: semaforo.cor.text, whiteSpace: 'nowrap' }}>
                                                                        {semaforo.timer}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                            <Tooltip title={semaforo.label}>
                                                                <Typography noWrap sx={{ fontSize: '0.6rem', fontWeight: 600, color: semaforo.cor.text, opacity: 0.9, minWidth: 0 }}>
                                                                    {semaforo.label}
                                                                </Typography>
                                                            </Tooltip>
                                                        </Box>
                                                    </Box>

                                                    {/* LINHA 2: Procedimento e Tags */}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5, width: '100%' }}>
                                                        <Tooltip title={item.procedimento_descricao || item.especialidade || 'Consulta'}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, overflow: 'hidden', minWidth: 0, flexGrow: 1 }}>
                                                                <MedicalInformationIcon sx={{ fontSize: 11, color: semaforo.cor.indicator, flexShrink: 0 }} />
                                                                <Typography noWrap sx={{ fontSize: '0.6rem', color: semaforo.cor.text, opacity: 0.9, minWidth: 0 }}>
                                                                    {item.procedimento_descricao || item.especialidade || 'Consulta'}
                                                                </Typography>
                                                            </Box>
                                                        </Tooltip>

                                                        <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center', flexShrink: 0 }}>
                                                            {item.primeira_consulta ? (
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
                                                </ListItemButton>
                                            </ListItem>
                                        );
                                    } else {
                                        // ==========================================
                                        // CARDS DA ABA "PACIENTES" (Simplificado)
                                        // ==========================================
                                        const isSelectedPac = pacienteAtivo?.id === item.id;
                                        return (
                                            <ListItem key={index} disablePadding sx={{ mb: 0.8 }}>
                                                <ListItemButton 
                                                    onClick={() => selecionarPaciente(item)} 
                                                    selected={isSelectedPac}
                                                    sx={{ 
                                                        borderRadius: 1.5,
                                                        border: `1px solid ${isSelectedPac ? '#1976d2' : '#e0e0e0'}`,
                                                        borderLeft: `4px solid ${isSelectedPac ? '#1976d2' : 'transparent'}`,
                                                        bgcolor: isSelectedPac ? '#f0f7ff' : '#fff', 
                                                        pl: 1.5, py: 1,
                                                        '&:hover': { bgcolor: '#f8fbff' }
                                                    }}
                                                >
                                                    <Box sx={{ width: '100%' }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1C2E4A', lineHeight: 1.2, pr: 1 }}>
                                                                {item.nome_completo}
                                                            </Typography>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <Typography variant="caption" sx={{ color: '#495057', fontWeight: 500 }}>
                                                                Última: {item.ultima_consulta}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </ListItemButton>
                                            </ListItem>
                                        );
                                    }
                                })}
                            </List>
                        )}
                    </Box>
                </Box>

                {/* COLUNA CENTRAL (Detalhe/Ação Principal) */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 0, bgcolor: '#ffffff', transition: 'width 0.3s' }}>
                    {renderizarCentro()}
                </Box>

                {/* COLUNA DIREITA (Ferramentas Ocultas) */}
                {ferramentaDireita && (
                    <Box sx={{ width: '400px', borderLeft: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', flexShrink: 0, bgcolor: '#fafafa' }}>
                        
                        {ferramentaDireita !== 'PRESCRIÇÕES' && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderBottom: '1px solid #e0e0e0' }}>
                                <Typography variant="subtitle2" fontWeight="bold" color="primary" sx={{ textTransform: 'uppercase' }}>
                                    {ferramentaDireita}
                                </Typography>
                                <IconButton size="small" onClick={() => setFerramentaDireita(null)}><CloseIcon fontSize="small" /></IconButton>
                            </Box>
                        )}
                        
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: ferramentaDireita === 'PRESCRIÇÕES' ? 0 : 2 }}>
                            <Suspense fallback={<CircularProgress sx={{ m: 'auto', display: 'block' }} />}>
                                {ferramentaDireita === 'PRESCRIÇÕES' && (
                                    <PrescricoesTab 
                                        pacienteId={pacienteAtivo?.id} 
                                        onClose={() => setFerramentaDireita(null)} 
                                    />
                                )}
                                {ferramentaDireita === 'DOCUMENTOS' && <DocumentosTab pacienteId={pacienteAtivo?.id} />}
                                {ferramentaDireita === 'LAUDOS' && <LaudosTab pacienteId={pacienteAtivo?.id} />}
                                {ferramentaDireita === 'IMAGENS' && <ExamesDicomTab pacienteId={pacienteAtivo?.id} />}
                                {ferramentaDireita === 'ATESTADOS' && (
                                    <RelatoriosTab 
                                        pacienteId={pacienteAtivo?.id} 
                                        consultaAtualId={agendamentoAtivo?.id} 
                                        especialidade={agendamentoAtivo?.especialidade} 
                                    />
                                )}
                                {ferramentaDireita === 'TELEMEDICINA' && <TelemedicinaTab agendamento={agendamentoAtivo} />}
                            </Suspense>
                        </Box>
                    </Box>
                )}

                {/* BARRA DE ÍCONES LATERAL */}
                <Box sx={{ width: '48px', borderLeft: '1px solid #e0e0e0', bgcolor: '#f8f9fa', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1, gap: 1, flexShrink: 0 }}>
                    <Tooltip title="Prescrições" placement="left"><IconButton size="small" color={ferramentaDireita === 'PRESCRIÇÕES' ? 'primary' : 'default'} onClick={() => toggleFerramenta('PRESCRIÇÕES')}><LocalPharmacyIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Atestados/Relatórios" placement="left"><IconButton size="small" color={ferramentaDireita === 'ATESTADOS' ? 'primary' : 'default'} onClick={() => toggleFerramenta('ATESTADOS')}><DescriptionIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Documentos" placement="left"><IconButton size="small" color={ferramentaDireita === 'DOCUMENTOS' ? 'primary' : 'default'} onClick={() => toggleFerramenta('DOCUMENTOS')}><FolderIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Imagens DICOM" placement="left"><IconButton size="small" color={ferramentaDireita === 'IMAGENS' ? 'primary' : 'default'} onClick={() => toggleFerramenta('IMAGENS')}><ImageIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Laudos" placement="left"><IconButton size="small" color={ferramentaDireita === 'LAUDOS' ? 'primary' : 'default'} onClick={() => toggleFerramenta('LAUDOS')}><AssignmentIcon fontSize="small" /></IconButton></Tooltip>
                    <Divider flexItem sx={{ my: 1 }} />
                    <Tooltip title="Telemedicina" placement="left">
                        <IconButton 
                            size="small" 
                            color={ferramentaDireita === 'TELEMEDICINA' ? 'primary' : 'default'} 
                            onClick={() => toggleFerramenta('TELEMEDICINA')}
                        >
                            <VideocamIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>

            </Box>
        </Box>
    );
}