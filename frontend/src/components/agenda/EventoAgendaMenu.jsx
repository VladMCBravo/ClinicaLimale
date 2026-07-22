// src/components/agenda/EventoAgendaMenu.jsx
import React, { useState } from 'react';
import { Box, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Select, FormControl, Snackbar, Alert } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaFileMedical, FaStethoscope, FaWhatsapp, FaUserEdit } from 'react-icons/fa';
import AtestadoModal from '../laudos/AtestadoModal';
import apiClient from '../../api/axiosConfig'; 

const CLINICA_ENDERECO = 'Rua Orense, 41 - Sala 512, Centro - Diadema/SP';
const CLINICA_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Rua Orense, 41 - Centro, Diadema - SP')}`;
const capitalizar = (texto) => texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
const formatarDataYYYYMMDD = (data) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
const formatarHoraHHMM = (data) => data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function EventoAgendaMenu({ anchorEl, selectedEvent, onClose, onEditar, onEditarPaciente, onStatusUpdated }) {
    const navigate = useNavigate();
    const [documentoAberto, setDocumentoAberto] = useState(false);
    const [documentoDados, setDocumentoDados] = useState(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [alertaAuthOpen, setAlertaAuthOpen] = useState(false);

    // --- FUNÇÃO DE ALTERAÇÃO DE STATUS BLINDADA E INTEGRADA AO FINANCEIRO ---
    const handleStatusChange = async (event) => {
        const novoStatus = event.target.value;
        if (!selectedEvent) return;

        setIsUpdatingStatus(true);
        try {
            // 1. Buscamos o agendamento fresco do banco de dados para ler o estado atual completo
            const res = await apiClient.get(`/agendamentos/${selectedEvent.id}/`);
            const ag = res.data;

            // 2. Extrator de IDs: Garante que chaves estrangeiras ricas (objetos) virem IDs numéricos limpos
            // Isso resolve o erro 400 que o Django joga quando recebe um dicionário em vez de número.
            const extrairId = (campo) => (campo && typeof campo === 'object' && 'id' in campo) ? campo.id : campo;

            const pacienteId = extrairId(ag.paciente);
            const medicoId = extrairId(ag.medico);
            const salaId = extrairId(ag.sala);
            const procedimentoId = extrairId(ag.procedimento);

            // 3. Montamos o pacote de dados perfeitamente limpo exigido pelo Django Rest Framework
            const payloadSeguro = {
                status: novoStatus,
                paciente: pacienteId,
                data_hora_inicio: ag.data_hora_inicio,
                data_hora_fim: ag.data_hora_fim,
                medico: medicoId,
                sala: salaId,
                procedimento: procedimentoId,
                tipo_atendimento: ag.tipo_atendimento || 'Particular',
                plano_utilizado: extrairId(ag.plano_utilizado)
            };

            // 4. Executa a atualização parcial sanitizada do agendamento
            await apiClient.patch(`/agendamentos/${selectedEvent.id}/`, payloadSeguro);

            // 5. REGRA OPERACIONAL FINANCEIRA INTEGRADA:
            // Se o status mudou para 'Realizado' ou 'Confirmado', precisamos verificar se há 
            // um pagamento pendente atrelado a este agendamento para atualizar o caixa operacional
            if (novoStatus === 'Realizado' && ag.pagamento_detalhes?.status === 'Pendente') {
                try {
                    // Dá a baixa automática no pagamento associado se a regra da clínica permitir
                    const pagamentoId = ag.pagamento_detalhes.id;
                    await apiClient.patch(`/faturamento/pagamentos/${pagamentoId}/`, {
                        status: 'Pago',
                        data_pagamento: timezone.now().date(),
                        forma_pagamento: ag.pagamento_detalhes.forma_pagamento || 'Dinheiro'
                    });
                } catch (finErr) {
                    console.warn("Agendamento atualizado, mas houve restrição na baixa automática do financeiro:", finErr);
                }
            }
            
            if (onStatusUpdated) {
                onStatusUpdated();
            }
            onClose();
        } catch (error) {
            const erroBackend = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            console.error("Erro detalhado do faturamento/agendamento:", erroBackend);
            alert(`O servidor recusou a atualização rápida.\nMotivo: ${erroBackend.replace(/[\[\]"{}]/g, '')}`);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleActionEditar = () => {
        if (selectedEvent) {
            onEditar({
                event: {
                    id: selectedEvent.id,
                    start: selectedEvent.start,
                    end: selectedEvent.end,
                    ...selectedEvent.extendedProps
                }
            });
        }
        onClose();
    };

    const handleActionEditarPaciente = () => {
        const dados = selectedEvent?.extendedProps;
        if (dados && dados.paciente_id && onEditarPaciente) {
            onEditarPaciente(dados.paciente_id);
        } else if (!dados?.paciente_id) {
            alert("Erro: Este agendamento não tem um paciente vinculado.");
        }
        onClose();
    };

    const handleActionLaudo = () => {
        const dados = selectedEvent?.extendedProps;
        if (!dados || !dados.paciente_id) {
            alert("Erro: Este agendamento não tem um paciente vinculado.");
            return;
        }

        const rawProc = (dados.tipo_procedimento || dados.procedimento_descricao || '').toUpperCase();
        let tipoSeguro = 'OBSTETRICO'; 

        if (rawProc.includes('TRANSVAGINAL') || rawProc.includes('TV')) tipoSeguro = 'TRANSVAGINAL';
        else if (rawProc.includes('ABDOME') || rawProc.includes('ABDOMINAL')) tipoSeguro = 'ABDOME';
        else if (rawProc.includes('ECOCARDIOGRAMA') || rawProc.includes('CARDIO')) tipoSeguro = 'ECOCARDIOGRAMA';
        else if (rawProc.includes('CAROTIDA')) tipoSeguro = 'DOPPLER_CAROTIDAS';
        else if (rawProc.includes('ELETRO')) tipoSeguro = 'ELETROCARDIOGRAMA';

        const draftLaudo = {
            paciente: { id: dados.paciente_id, nome_completo: selectedEvent.title },
            medicoNome: dados.medico_nome,
            medicoCrm: dados.medico_crm,
            tipoExame: tipoSeguro,
            textoFinal: '',
            dadosEstruturados: {}
        };
        sessionStorage.setItem('laudos_rascunho_auto_save', JSON.stringify(draftLaudo));
        onClose();
        navigate('/laudos');
    };

    const handleActionOriginalConsulta = () => {
        const dados = selectedEvent?.extendedProps;
        if (!dados?.paciente_id) {
            alert("Erro: Paciente não identificado.");
            return;
        }

        let temAcessoMedico = false;
        try {
            const userStorage = localStorage.getItem('user') || localStorage.getItem('usuario');
            if (userStorage) {
                const userObj = JSON.parse(userStorage);
                if (userObj.cargo === 'medico' || userObj.cargo === 'admin') {
                    temAcessoMedico = true;
                }
            }
        } catch (error) {
            console.error("Erro ao verificar acesso", error);
        }

        if (!temAcessoMedico) {
            setAlertaAuthOpen(true); 
            onClose();               
            return;                  
        }

        navigate('/painel-medico', {
            state: {
                agendamentoId: selectedEvent.id,
                pacienteId: dados.paciente_id
            }
        });
        onClose();
    };

    const handleActionConfirmarWhatsapp = () => {
        const dados = selectedEvent?.extendedProps;
        const telefoneBruto = dados?.paciente_telefone;
        if (!telefoneBruto) {
            alert('Este paciente não tem telefone/WhatsApp cadastrado.');
            onClose();
            return;
        }

        let numero = telefoneBruto.replace(/\D/g, '');
        if (numero.length <= 11) numero = `55${numero}`; 

        const primeiroNome = (selectedEvent.title || '').trim().split(' ')[0];
        const inicio = selectedEvent.start ? new Date(selectedEvent.start) : null;
        const dataFormatada = inicio ? capitalizar(inicio.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })) : '';
        const horaFormatada = inicio ? formatarHoraHHMM(inicio) : '';
        const procedimento = dados.tipo_procedimento || dados.procedimento_descricao || dados.especialidade_nome || 'sua consulta';
        const medico = dados.medico_nome_com_prefixo || dados.medico_nome;

        const mensagem = `Olá, ${primeiroNome}!\n\n`
            + `Aqui é da *Clínica Limalé*. Passando para confirmar o seu agendamento:\n\n`
            + `Data: ${dataFormatada}, às ${horaFormatada}\n`
            + `${dados.tipo_agendamento === 'Consulta' ? 'Especialidade' : 'Procedimento'}: ${procedimento}\n`
            + (medico ? `Médico(a): ${medico}\n` : '')
            + `\n*Endereço da clínica*\n${CLINICA_ENDERECO}\n`
            + `Como chegar: ${CLINICA_MAPS_URL}\n\n`
            + `Você confirma sua presença? Basta responder *SIM* ou nos avisar se precisar remarcar.`;

        window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
        onClose();
    };

    const handleAbrirDocumento = () => {
        const dados = selectedEvent?.extendedProps;
        if (selectedEvent && dados?.paciente_id) {
            const inicio = selectedEvent.start ? new Date(selectedEvent.start) : null;
            const fim = selectedEvent.end ? new Date(selectedEvent.end) : null;
            setDocumentoDados({
                paciente: { id: dados.paciente_id, nome_completo: selectedEvent.title },
                medicoNome: dados.medico_nome_com_prefixo || dados.medico_nome,
                medicoCrm: dados.medico_crm,
                dataInicial: inicio ? formatarDataYYYYMMDD(inicio) : undefined,
                horaInicioInicial: inicio ? formatarHoraHHMM(inicio) : undefined,
                horaFimInicial: fim ? formatarHoraHHMM(fim) : undefined
            });
            setDocumentoAberto(true);
        } else {
            alert('Erro: Este agendamento não tem um paciente vinculado.');
        }
        onClose();
    };

    return (
        <>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={onClose}
                PaperProps={{ 
                  elevation: 4, 
                  sx: { 
                    minWidth: 260, 
                    borderRadius: 2.5, 
                    overflow: 'hidden',
                    border: '1px solid #e0e0e0'
                  } 
                }}
            >
                {/* CABEÇALHO ESCURO */}
                <Box sx={{ p: 2, bgcolor: '#1C2E4A', color: '#fff' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedEvent?.title || 'Agendamento'}
                    </div>
                    {selectedEvent?.extendedProps && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1, fontSize: '11px', lineHeight: 1.4 }}>
                            <div><strong>🩺 Médico:</strong> {selectedEvent.extendedProps.medico_nome_com_prefixo || selectedEvent.extendedProps.medico_nome || 'Não vinculado'}</div>
                            <div><strong>📋 Exame/Consulta:</strong> {selectedEvent.extendedProps.tipo_procedimento || 'Consulta'}</div>
                            <div><strong>⏰ Horário:</strong> {selectedEvent.start ? formatarHoraHHMM(new Date(selectedEvent.start)) : '--:--'} às {selectedEvent.end ? formatarHoraHHMM(new Date(selectedEvent.end)) : '--:--'}</div>
                        </Box>
                    )}
                </Box>

                {/* SELETOR DE STATUS EXPRESSO */}
                <Box sx={{ p: 1.5, bgcolor: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
                    <FormControl fullWidth size="small">
                        <Select
                            value={selectedEvent?.extendedProps?.status || ''}
                            onChange={handleStatusChange}
                            disabled={isUpdatingStatus}
                            displayEmpty
                            sx={{ bgcolor: '#fff', fontSize: '0.85rem', fontWeight: 600, borderRadius: 1 }}
                        >
                            <MenuItem value="Agendado">🗓️ Agendado</MenuItem>
                            <MenuItem value="Confirmado">✅ Confirmado</MenuItem>
                            <MenuItem value="Aguardando Pagamento">⏳ Aguardando Pgto.</MenuItem>
                            <MenuItem value="Realizado">🏁 Realizado</MenuItem>
                            <MenuItem value="Não Compareceu">👻 Não Compareceu</MenuItem>
                            <MenuItem value="Cancelado">❌ Cancelado</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                <Box sx={{ py: 0.5 }}>
                    <MenuItem onClick={handleActionConfirmarWhatsapp} disabled={!selectedEvent?.extendedProps?.paciente_telefone}>
                        <ListItemIcon><FaWhatsapp fontSize="small" color="#25D366" /></ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }}>Confirmar via WhatsApp</ListItemText>
                    </MenuItem>

                    <MenuItem onClick={handleAbrirDocumento} disabled={!selectedEvent?.extendedProps?.paciente_id}>
                        <ListItemIcon><DescriptionOutlinedIcon fontSize="small" sx={{ color: '#1C2E4A' }} /></ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }}>Atestado / Declaração</ListItemText>
                    </MenuItem>

                    <Divider sx={{ my: 0.5 }} />

                    <MenuItem onClick={handleActionEditar}>
                        <ListItemIcon><FaEdit fontSize="small" color="#78909c" /></ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }}>Editar Agendamento</ListItemText>
                    </MenuItem>

                    <MenuItem onClick={handleActionEditarPaciente} disabled={!selectedEvent?.extendedProps?.paciente_id}>
                        <ListItemIcon><FaUserEdit fontSize="small" color="#ed6c02" /></ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }}>Editar Cadastro do Paciente</ListItemText>
                    </MenuItem>

                    <Divider sx={{ my: 0.5 }} />

                    <MenuItem onClick={handleActionLaudo} disabled={!selectedEvent?.extendedProps?.paciente_id}>
                        <ListItemIcon><FaFileMedical fontSize="small" color="#2E7D32" /></ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }}>Realizar Laudo</ListItemText>
                    </MenuItem>

                    <MenuItem onClick={handleActionOriginalConsulta} disabled={!selectedEvent?.extendedProps?.paciente_id}>
                        <ListItemIcon><FaStethoscope fontSize="small" color="#1976d2" /></ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }}>Iniciar Atendimento</ListItemText>
                    </MenuItem>
                </Box>
            </Menu>

            {documentoAberto && (
                <AtestadoModal
                    open={documentoAberto}
                    onClose={() => setDocumentoAberto(false)}
                    paciente={documentoDados?.paciente}
                    medicoNome={documentoDados?.medicoNome}
                    medicoCrm={documentoDados?.medicoCrm}
                    dataInicial={documentoDados?.dataInicial}
                    horaInicioInicial={documentoDados?.horaInicioInicial}
                    horaFimInicial={documentoDados?.horaFimInicial}
                />
            )}

            <Snackbar 
                open={alertaAuthOpen} 
                autoHideDuration={4000} 
                onClose={() => setAlertaAuthOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    onClose={() => setAlertaAuthOpen(false)} 
                    severity="warning" 
                    variant="filled" 
                    sx={{ width: '100%', fontWeight: 600, borderRadius: 2, fontSize: '0.9rem' }}
                >
                    Acesso Restrito: O atendimento iniciará após o login médico.
                </Alert>
            </Snackbar>
        </>
    );
}