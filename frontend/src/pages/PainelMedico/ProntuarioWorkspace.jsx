// src/pages/PainelMedico/ProntuarioWorkspace.jsx

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { 
    Box, Typography, List, ListItem, ListItemButton, ListItemText, 
    CircularProgress, IconButton, Tooltip, Divider, Tabs, Tab 
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderIcon from '@mui/icons-material/Folder';
import ImageIcon from '@mui/icons-material/Image';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VideocamIcon from '@mui/icons-material/Videocam';

import apiClient from '../../api/axiosConfig'; // Ajuste o caminho se necessário

// --- Importação Tardia (Lazy) das Ferramentas e Formulários ---
const AtendimentoPediatria = lazy(() => import('../../components/prontuario/AtendimentoPediatria'));
const AtendimentoClinicaGeral = lazy(() => import('../../components/prontuario/AtendimentoClinicaGeral'));
const AtendimentoCardiologia = lazy(() => import('../../components/prontuario/AtendimentoCardiologia'));
const AtendimentoObstetricia = lazy(() => import('../../components/prontuario/AtendimentoObstetricia'));
const PrescricoesTab = lazy(() => import('../../components/prontuario/PrescricoesTab'));
const RelatoriosTab = lazy(() => import('../../components/prontuario/RelatoriosTab'));
const DocumentosTab = lazy(() => import('../../components/prontuario/DocumentosTab'));
const ExamesDicomTab = lazy(() => import('../../components/prontuario/ExamesDicomTab'));
const LaudosTab = lazy(() => import('../../components/laudos/LaudosTab'));

export default function ProntuarioWorkspace() {
    // --- ESTADOS GLOBAIS DA TELA ---
    const [pacienteAtivo, setPacienteAtivo] = useState(null); // Dados do Banner
    const [agendamentoAtivo, setAgendamentoAtivo] = useState(null); // Contexto da consulta
    
    // Controle das Colunas
    const [abaEsquerda, setAbaEsquerda] = useState(0); // 0 = Consultas (Agenda), 1 = Meus Pacientes
    const [listaEsquerda, setListaEsquerda] = useState([]);
    const [isLoadingLista, setIsLoadingLista] = useState(false);
    
    const [conteudoCentral, setConteudoCentral] = useState({ tipo: 'VAZIO' }); 
    const [ferramentaDireita, setFerramentaDireita] = useState(null);

    // --- CARREGAMENTO DA COLUNA ESQUERDA (Listas) ---
    useEffect(() => {
        carregarListaEsquerda();
    }, [abaEsquerda]);

    const carregarListaEsquerda = async () => {
        setIsLoadingLista(true);
        try {
            // Usa as rotas que definimos no backend
            const endpoint = abaEsquerda === 0 
                ? '/prontuario/workspace/minhas-consultas/' 
                : '/prontuario/workspace/meus-pacientes/';
            
            const response = await apiClient.get(endpoint);
            setListaEsquerda(response.data);
        } catch (error) {
            console.error("Erro ao carregar lista lateral", error);
            // Dados Mockados de emergência para você testar o visual imediatamente:
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

    // --- AÇÕES DO USUÁRIO ---
    const selecionarPaciente = async (itemLista) => {
        const pacId = abaEsquerda === 0 ? itemLista.paciente_id : itemLista.id;
        const agendamento = abaEsquerda === 0 ? itemLista : null;
        
        setAgendamentoAtivo(agendamento);
        setFerramentaDireita(null); // Fecha a direita ao trocar de paciente

        try {
            // Busca os dados do banner
            const resBanner = await apiClient.get(`/prontuario/workspace/banner/${pacId}/`);
            setPacienteAtivo(resBanner.data);
        } catch (error) {
            // Mock de emergência para o banner
            setPacienteAtivo({
                id: pacId,
                nome_completo: itemLista.paciente_nome || itemLista.nome_completo,
                genero: 'Feminino',
                data_nascimento: '01/06/2019',
                idade_formatada: '6 anos',
                sinais_vitais: { pa: '100x80', fc: '89', peso: '22kg' }
            });
        }

        // Se veio da agenda, abre o formulário da especialidade automaticamente
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
                onEvolucaoSalva: () => console.log('Evolução Salva! Recarregar listas se necessário.') 
            };

            return (
                <Suspense fallback={<CircularProgress sx={{ m: 'auto', display: 'block', mt: 4 }} />}>
                    {esp.includes('pediatria') ? <AtendimentoPediatria {...props} /> :
                     esp.includes('cardio') ? <AtendimentoCardiologia {...props} /> :
                     esp.includes('obstetr') ? <AtendimentoObstetricia {...props} /> :
                     <AtendimentoClinicaGeral {...props} />}
                </Suspense>
            );
        }

        if (conteudoCentral.tipo === 'HISTORICO_GERAL') {
            return (
                <Box sx={{ p: 3 }}>
                    <Typography variant="h6">Visão Geral do Paciente</Typography>
                    <Typography variant="body2" color="text.secondary">Aqui renderizamos o componente de timeline de evoluções antigas.</Typography>
                </Box>
            );
        }
    };

    // --- O LAYOUT PRINCIPAL (O ESQUELETO TASY) ---
    return (
        <Box sx={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#ffffff', overflow: 'hidden' }}>
            
            {/* 1. PATIENT BANNER (Topo) */}
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
                            <Box><strong>Nascimento:</strong> {pacienteAtivo.data_nascimento} ({pacienteAtivo.idade_formatada})</Box>
                            <Box><strong>Sexo:</strong> {pacienteAtivo.genero}</Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, fontSize: '0.75rem', color: '#ced4da', borderLeft: '1px solid #555', pl: 2 }}>
                            <Box><strong>PA:</strong> {pacienteAtivo.sinais_vitais?.pa}</Box>
                            <Box><strong>FC:</strong> {pacienteAtivo.sinais_vitais?.fc}</Box>
                            <Box><strong>Peso:</strong> {pacienteAtivo.sinais_vitais?.peso}</Box>
                        </Box>
                    </>
                ) : (
                    <Typography variant="body2" color="#888">Nenhum paciente selecionado</Typography>
                )}
            </Box>

            {/* 2. ÁREA DE TRABALHO (As 3 Colunas) */}
            <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
                
                {/* COLUNA ESQUERDA (Navegação Mestre) */}
                <Box sx={{ width: '280px', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', flexShrink: 0, bgcolor: '#fafafa' }}>
                    <Tabs value={abaEsquerda} onChange={(e, val) => setAbaEsquerda(val)} variant="fullWidth" sx={{ minHeight: '36px' }}>
                        <Tab label="Consultas" sx={{ minHeight: '36px', py: 0, fontSize: '0.8rem' }} />
                        <Tab label="Pacientes" sx={{ minHeight: '36px', py: 0, fontSize: '0.8rem' }} />
                    </Tabs>
                    <Divider />
                    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                        {isLoadingLista ? <CircularProgress size={24} sx={{ m: 2, display: 'block' }} /> : (
                            <List dense disablePadding>
                                {listaEsquerda.map((item, index) => (
                                    <ListItem key={index} disablePadding divider>
                                        <ListItemButton onClick={() => selecionarPaciente(item)} selected={pacienteAtivo?.id === (abaEsquerda === 0 ? item.paciente_id : item.id)}>
                                            <ListItemText 
                                                primary={<Typography variant="body2" fontWeight="500">{abaEsquerda === 0 ? item.paciente_nome : item.nome_completo}</Typography>}
                                                secondary={<Typography variant="caption" color="text.secondary">{abaEsquerda === 0 ? `${item.horario} - ${item.especialidade}` : `Últ. consulta: ${item.ultima_consulta}`}</Typography>}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
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
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderBottom: '1px solid #e0e0e0' }}>
                            <Typography variant="subtitle2" fontWeight="bold" color="primary" sx={{ textTransform: 'uppercase' }}>
                                {ferramentaDireita}
                            </Typography>
                            <IconButton size="small" onClick={() => setFerramentaDireita(null)}><CloseIcon fontSize="small" /></IconButton>
                        </Box>
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                            <Suspense fallback={<CircularProgress sx={{ m: 'auto', display: 'block' }} />}>
                                {ferramentaDireita === 'PRESCRIÇÕES' && <PrescricoesTab pacienteId={pacienteAtivo?.id} />}
                                {ferramentaDireita === 'DOCUMENTOS' && <DocumentosTab pacienteId={pacienteAtivo?.id} />}
                                {ferramentaDireita === 'LAUDOS' && <LaudosTab pacienteId={pacienteAtivo?.id} />}
                                {/* NOVA LINHA ADICIONADA PARA O DICOM */}
                                {ferramentaDireita === 'IMAGENS' && <ExamesDicomTab pacienteId={pacienteAtivo?.id} />}
                                {ferramentaDireita === 'ATESTADOS' && (
                                    <RelatoriosTab 
                                        pacienteId={pacienteAtivo?.id} 
                                        consultaAtualId={agendamentoAtivo?.id} 
                                        especialidade={agendamentoAtivo?.especialidade} 
                                    />
                                )}
                            </Suspense>
                        </Box>
                    </Box>
                )}

                {/* BARRA DE ÍCONES LATERAL (Extrema Direita) */}
                <Box sx={{ width: '48px', borderLeft: '1px solid #e0e0e0', bgcolor: '#f8f9fa', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1, gap: 1, flexShrink: 0 }}>
                    <Tooltip title="Prescrições" placement="left"><IconButton size="small" color={ferramentaDireita === 'PRESCRIÇÕES' ? 'primary' : 'default'} onClick={() => toggleFerramenta('PRESCRIÇÕES')}><LocalPharmacyIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Atestados/Relatórios" placement="left"><IconButton size="small" color={ferramentaDireita === 'ATESTADOS' ? 'primary' : 'default'} onClick={() => toggleFerramenta('ATESTADOS')}><DescriptionIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Documentos" placement="left"><IconButton size="small" color={ferramentaDireita === 'DOCUMENTOS' ? 'primary' : 'default'} onClick={() => toggleFerramenta('DOCUMENTOS')}><FolderIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Imagens DICOM" placement="left"><IconButton size="small" color={ferramentaDireita === 'IMAGENS' ? 'primary' : 'default'} onClick={() => toggleFerramenta('IMAGENS')}><ImageIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Laudos" placement="left"><IconButton size="small" color={ferramentaDireita === 'LAUDOS' ? 'primary' : 'default'} onClick={() => toggleFerramenta('LAUDOS')}><AssignmentIcon fontSize="small" /></IconButton></Tooltip>
                    <Divider flexItem sx={{ my: 1 }} />
                    <Tooltip title="Telemedicina" placement="left"><IconButton size="small"><VideocamIcon fontSize="small" /></IconButton></Tooltip>
                </Box>

            </Box>
        </Box>
    );
}