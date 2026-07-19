// src/components/agenda/EventoAgendaMenu.jsx
// Menu de ações que abre ao clicar num agendamento na grade da Agenda
// (Editar, Realizar Laudo, Iniciar Atendimento, Confirmar via WhatsApp,
// Atestado/Declaração). Extraído do AgendaPrincipal.jsx pra não deixar aquele
// arquivo ainda maior — ele já cuida só do calendário, toolbar e filtros.
import React, { useState } from 'react';
import { Box, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaFileMedical, FaStethoscope, FaWhatsapp } from 'react-icons/fa';
import AtestadoModal from '../laudos/AtestadoModal';

// Mesmo endereço usado nas mensagens automáticas do chatbot (backend/chatbot/agente_*.py)
const CLINICA_ENDERECO = 'Rua Orense, 41 - Sala 512, Centro - Diadema/SP';
const CLINICA_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Rua Orense, 41 - Centro, Diadema - SP')}`;
const capitalizar = (texto) => texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
const formatarDataYYYYMMDD = (data) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
const formatarHoraHHMM = (data) => data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// selectedEvent: objeto de evento do FullCalendar (title, start, end, extendedProps).
// onEditar: callback do AgendaPrincipal pra abrir o AgendamentoModal em modo de edição.
export default function EventoAgendaMenu({ anchorEl, selectedEvent, onClose, onEditar }) {
    const navigate = useNavigate();

    // Abre o AtestadoModal (que também gera Declaração de Comparecimento/Acompanhante —
    // o nome do componente ficou legado). Quem não é médico só consegue gerar os tipos de
    // Declaração por ali (o backend bloqueia Atestado de Afastamento/Aptidão pra quem não
    // é médico — ver CanCreateAtestado); a assinatura sai institucional nesse caso.
    const [documentoAberto, setDocumentoAberto] = useState(false);
    const [documentoDados, setDocumentoDados] = useState(null);

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

    const handleActionLaudo = () => {
        const dados = selectedEvent?.extendedProps;
        if (!dados || !dados.paciente_id) {
            alert("Erro: Este agendamento não tem um paciente vinculado.");
            return;
        }
        const draftLaudo = {
            paciente: { id: dados.paciente_id, nome_completo: selectedEvent.title },
            medicoNome: dados.medico_nome,
            medicoCrm: dados.medico_crm,
            tipoExame: dados.tipo_procedimento !== 'CONSULTA' ? dados.tipo_procedimento : 'OBSTETRICO',
            textoFinal: '',
            dadosEstruturados: {}
        };
        sessionStorage.setItem('laudos_rascunho_auto_save', JSON.stringify(draftLaudo));
        onClose();
        navigate('/laudos');
    };

    const handleActionConsulta = () => {
        const dados = selectedEvent?.extendedProps;
        if (!dados?.paciente_id) {
            alert("Erro: Paciente não identificado.");
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

    // Abre o WhatsApp com uma mensagem pronta pedindo a confirmação do paciente, já com
    // data/hora e o endereço da clínica. Quem efetivamente envia é a recepção, clicando
    // em enviar no WhatsApp — nada é disparado automaticamente por aqui.
    const handleActionConfirmarWhatsapp = () => {
        const dados = selectedEvent?.extendedProps;
        const telefoneBruto = dados?.paciente_telefone;
        if (!telefoneBruto) {
            alert('Este paciente não tem telefone/WhatsApp cadastrado.');
            onClose();
            return;
        }

        let numero = telefoneBruto.replace(/\D/g, '');
        if (numero.length <= 11) numero = `55${numero}`; // adiciona o DDI do Brasil se faltando

        const primeiroNome = (selectedEvent.title || '').trim().split(' ')[0];
        const inicio = selectedEvent.start ? new Date(selectedEvent.start) : null;
        const dataFormatada = inicio ? capitalizar(inicio.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })) : '';
        const horaFormatada = inicio ? formatarHoraHHMM(inicio) : '';
        const procedimento = dados.tipo_procedimento || dados.procedimento_descricao || dados.especialidade_nome || 'sua consulta';
        const medico = dados.medico_nome_com_prefixo || dados.medico_nome;

        // SEM emojis de fora do plano básico do Unicode (😊 📅 📋 🩺 📍 💛 etc.): mesmo com
        // o encoding correto na URL, eles chegam corrompidos ("�") no WhatsApp em todas as
        // plataformas testadas (Mac, Windows, iPhone, Android) — limitação do próprio link
        // wa.me com o parâmetro de texto, não do nosso código. Só texto e negrito (*assim*).
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

    // Captura um retrato do evento ANTES de fechar o menu pequeno (que zera o selectedEvent
    // lá no AgendaPrincipal), pro documento continuar com os dados certos depois de aberto.
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
                PaperProps={{ elevation: 3, sx: { minWidth: 220 } }}
            >
                <Box sx={{ p: 2, pb: 1, borderBottom: '1px solid #eee' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1C2E4A' }}>
                        {selectedEvent?.title || 'Agendamento'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>Selecione uma ação:</div>
                </Box>

                <MenuItem onClick={handleActionConfirmarWhatsapp} disabled={!selectedEvent?.extendedProps?.paciente_telefone}>
                    <ListItemIcon><FaWhatsapp fontSize="small" color="#25D366" /></ListItemIcon>
                    <ListItemText>Confirmar via WhatsApp</ListItemText>
                </MenuItem>

                <MenuItem onClick={handleAbrirDocumento} disabled={!selectedEvent?.extendedProps?.paciente_id}>
                    <ListItemIcon><DescriptionOutlinedIcon fontSize="small" sx={{ color: '#1C2E4A' }} /></ListItemIcon>
                    <ListItemText>Atestado / Declaração</ListItemText>
                </MenuItem>

                <Divider />

                <MenuItem onClick={handleActionEditar}>
                    <ListItemIcon><FaEdit fontSize="small" /></ListItemIcon>
                    <ListItemText>Editar Agendamento</ListItemText>
                </MenuItem>

                <Divider />

                <MenuItem onClick={handleActionLaudo} disabled={!selectedEvent?.extendedProps?.paciente_id}>
                    <ListItemIcon><FaFileMedical fontSize="small" color="#2E7D32" /></ListItemIcon>
                    <ListItemText>Realizar Laudo</ListItemText>
                </MenuItem>

                <MenuItem onClick={handleActionConsulta} disabled={!selectedEvent?.extendedProps?.paciente_id}>
                    <ListItemIcon><FaStethoscope fontSize="small" color="#1976d2" /></ListItemIcon>
                    <ListItemText>Iniciar Atendimento</ListItemText>
                </MenuItem>
            </Menu>

            {/* Só monta o modal quando abre — o AtestadoModal guarda data/hora/tipo em estado
                local que só lê as props "iniciais" na primeira montagem. Mantendo montado o
                tempo todo, o segundo agendamento clicado reaproveitava a data do primeiro. */}
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
        </>
    );
}
