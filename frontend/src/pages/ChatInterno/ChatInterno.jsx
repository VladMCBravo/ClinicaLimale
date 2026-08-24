import React, { useState, useEffect, useRef } from 'react';
import { Dialog, Box } from '@mui/material'; // <-- IMPORTAÇÃO NOVA DO MUI
import { useChat } from '../../contexts/ChatContext';
import apiClient from '../../api/axiosConfig';
import '../../atendimento.css';

const ChatInterno = ({ onClose, token }) => {
  const { socket } = useChat();
  const [contatoAtivo, setContatoAtivo] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [abaDireita, setAbaDireita] = useState('agendamentos'); 
  
  const [agendamentosHoje, setAgendamentosHoje] = useState([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [loading, setLoading] = useState(false);

  const mensagemInputRef = useRef(null);

  const [equipe, setEquipe] = useState([
    { id: 2, nome: 'Dra. Ana', is_online: false },
    { id: 3, nome: 'Recepção - Maria', is_online: false },
    { id: 4, nome: 'Dr. Carlos', is_online: false },
  ]);

  // 1. OUVINTE DO WEBSOCKET
  useEffect(() => {
    if (socket) {
      const handleMessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message') {
          setMensagens((prev) => [...prev, data.message]);
        } else if (data.type === 'user_status') {
          setEquipe((prevEquipe) => 
            prevEquipe.map((func) => 
              func.id === data.user_id ? { ...func, is_online: data.is_online } : func
            )
          );
        }
      };
      socket.addEventListener('message', handleMessage);
      return () => socket.removeEventListener('message', handleMessage);
    }
  }, [socket]);

  // 2. BUSCAR AGENDAMENTOS DO DIA (Usando apiClient blindado)
  useEffect(() => {
    if (abaDireita === 'agendamentos') {
      setLoading(true);
      apiClient.get('/agendamentos/hoje/')
        .then(res => {
          const data = res.data;
          setAgendamentosHoje(Array.isArray(data) ? data : (data.results || []));
          setLoading(false);
        })
        .catch(err => {
          console.error("Erro ao buscar agendamentos:", err);
          setAgendamentosHoje([]); 
          setLoading(false);
        });
    }
  }, [abaDireita]);

  // 3. BUSCAR HISTÓRICO REST
  useEffect(() => {
    if (contatoAtivo) {
      setMensagens([]); 
      apiClient.get(`/chat/history/?contact_id=${contatoAtivo.id}`)
        .then(res => {
          const data = res.data;
          const lista = Array.isArray(data) ? data : (data.results || []);
          const historicoFormatado = lista.map(msg => ({
            ...msg,
            sender: msg.is_mine ? 'me' : 'other' 
          }));
          setMensagens(historicoFormatado);
        })
        .catch(err => console.error("Erro ao carregar histórico:", err));
    }
  }, [contatoAtivo]);

  // 4. BUSCAR PACIENTES
  const buscarPacientes = (e) => {
    e.preventDefault();
    if (!termoBusca) return;
    
    setLoading(true);
    apiClient.get(`/pacientes/?search=${termoBusca}`)
      .then(res => {
        const data = res.data;
        setResultadosBusca(Array.isArray(data) ? data : (data.results || []));
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao buscar pacientes:", err);
        setResultadosBusca([]);
        setLoading(false);
      });
  };

  // 5. FUNÇÕES DE ENVIO
  const enviarMensagemTexto = (e) => {
    e.preventDefault();
    const texto = mensagemInputRef.current.value;
    if (texto && socket && contatoAtivo) {
      socket.send(JSON.stringify({
        receiver_id: contatoAtivo.id,
        content: texto,
        attachment_type: 'text'
      }));
      mensagemInputRef.current.value = '';
    }
  };

  const enviarCardAgendamento = (agendamento) => {
    if (socket && contatoAtivo) {
      const horaStr = agendamento.data_hora ? new Date(agendamento.data_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
      const nomePaciente = agendamento.paciente?.nome || 'Paciente não informado';

      socket.send(JSON.stringify({
        receiver_id: contatoAtivo.id,
        content: `Agendamento: ${nomePaciente} às ${horaStr}`, 
        attachment_type: 'appointment',
        attachment_id: agendamento.id,
        attachment_data: agendamento 
      }));
    }
  };

  // RENDERIZAÇÃO BLINDADA COM MUI DIALOG
  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: '95vw',
          maxWidth: '1400px',
          height: '90vh',
          display: 'flex',
          flexDirection: 'row',
          borderRadius: 2,
          overflow: 'hidden',
          backgroundColor: '#f8f9fa'
        }
      }}
    >
        {/* COLUNA ESQUERDA: LISTA DA EQUIPE */}
        <Box sx={{ width: '25%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e7eb', bgcolor: '#fff' }}>
          <div className="p-3 bg-white border-b border-gray-200 text-[#495057] font-bold text-[12px] uppercase tracking-wide">
            Equipe Interna
          </div>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
            {equipe.map((func) => (
              <div 
                key={func.id}
                onClick={() => setContatoAtivo(func)}
                className={`flex items-center p-2 mb-1 rounded-md cursor-pointer transition-colors ${contatoAtivo?.id === func.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full mr-3 shadow-sm ${func.is_online ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="text-[13px] text-gray-700 font-semibold">{func.nome}</span>
              </div>
            ))}
          </Box>
        </Box>

        {/* COLUNA DO MEIO: CONVERSA */}
        <Box sx={{ width: '50%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {contatoAtivo ? (
            <>
              <div className="p-3 bg-white border-b border-gray-200 text-[#495057] font-bold text-[12px] uppercase tracking-wide flex justify-between items-center shadow-sm z-10">
                <span>Conversando com: {contatoAtivo.nome}</span>
              </div>
              
              <Box sx={{ flex: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {mensagens.map((msg, idx) => (
                  <div key={idx} className={`max-w-[80%] ${msg.sender === 'me' ? 'self-end' : 'self-start'}`}>
                    {msg.attachment_type === 'appointment' ? (
                      <div className="tasy-panel theme-blue shadow-sm border border-[#1c7ed6] rounded-md overflow-hidden bg-white">
                        <div className="px-3 py-1.5 bg-[#e7f5ff] text-[#1864ab] font-bold text-[11px] uppercase border-b border-[#1c7ed6]">
                          📅 Ficha de Agendamento
                        </div>
                        <div className="p-3 text-[12px]">
                          <p className="font-bold text-[#495057]">{msg.content}</p>
                          <button className="mt-2 text-[11px] text-[#1c7ed6] font-bold hover:underline uppercase">Abrir no Sistema</button>
                        </div>
                      </div>
                    ) : msg.attachment_type === 'patient' ? (
                      <div className="tasy-panel theme-purple shadow-sm border border-[#7048e8] rounded-md overflow-hidden bg-white">
                        <div className="px-3 py-1.5 bg-[#f3f0ff] text-[#5f3dc4] font-bold text-[11px] uppercase border-b border-[#7048e8]">
                          👤 Contato de Paciente
                        </div>
                        <div className="p-3 text-[12px]">
                          <p className="font-bold text-[#495057]">{msg.content}</p>
                        </div>
                      </div>
                    ) : (
                      <div className={`px-3 py-2 text-[13px] rounded-lg shadow-sm border ${msg.sender === 'me' ? 'bg-[#e7f5ff] border-blue-200 text-[#222]' : 'bg-white border-gray-200 text-[#222]'}`}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))}
              </Box>

              <form onSubmit={enviarMensagemTexto} className="p-3 bg-white border-t border-gray-200 flex gap-2">
                <input 
                  type="text" ref={mensagemInputRef} placeholder="Digite sua mensagem..." 
                  className="flex-1 border border-gray-300 px-4 py-2 text-[13px] focus:outline-none focus:border-blue-500 bg-[#f8f9fa] rounded-full transition-colors"
                />
                <button type="submit" className="bg-[#1c7ed6] hover:bg-[#1864ab] text-white px-5 py-2 text-[13px] font-bold rounded-full uppercase tracking-wide transition-colors shadow-sm">
                  Enviar
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#adb5bd] text-[13px] font-bold uppercase tracking-widest">
              Selecione um contato para iniciar
            </div>
          )}
        </Box>

        {/* COLUNA DIREITA: DADOS REAIS */}
        <Box sx={{ width: '25%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e5e7eb', bgcolor: '#fff' }}>
          <div className="p-3 bg-white border-b border-gray-200 flex justify-between items-center">
            <span className="text-[#495057] font-bold text-[12px] uppercase tracking-wide">Apoio Clínico</span>
            <button onClick={onClose} className="text-[#e03131] hover:text-[#c92a2a] text-[10px] font-bold cursor-pointer uppercase tracking-wider">✕ Fechar</button>
          </div>

          <div className="flex text-[11px] font-bold text-gray-500 border-b border-gray-200 bg-[#f8f9fa]">
            <button 
              className={`flex-1 p-2.5 uppercase transition-colors ${abaDireita === 'agendamentos' ? 'border-b-2 border-[#1c7ed6] text-[#1c7ed6] bg-white' : 'hover:bg-gray-100'}`}
              onClick={() => setAbaDireita('agendamentos')}
            >
              Agendamentos
            </button>
            <button 
              className={`flex-1 p-2.5 uppercase transition-colors ${abaDireita === 'busca' ? 'border-b-2 border-[#1c7ed6] text-[#1c7ed6] bg-white' : 'hover:bg-gray-100'}`}
              onClick={() => setAbaDireita('busca')}
            >
              Busca
            </button>
          </div>

          <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
            {loading && <div className="text-center text-xs text-gray-400 py-4 font-semibold uppercase">Carregando dados...</div>}

            {abaDireita === 'agendamentos' && !loading && (
              <div className="flex flex-col gap-2">
                {agendamentosHoje?.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center mt-4">Nenhum agendamento hoje.</p>
                ) : (
                  agendamentosHoje?.map(agendamento => (
                    <div key={agendamento.id} className="border border-gray-200 rounded-md shadow-sm overflow-hidden bg-white">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-700">
                        {agendamento.data_hora ? new Date(agendamento.data_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'} • {agendamento.paciente?.nome || 'Paciente ID: ' + agendamento.paciente}
                      </div>
                      <div className="p-3">
                        <div className="text-[12px] text-[#495057] mb-3 font-medium">{agendamento.procedimento?.nome || 'Consulta Padrão'}</div>
                        <button onClick={() => enviarCardAgendamento(agendamento)} className="w-full text-[10px] font-bold text-[#1c7ed6] border border-[#1c7ed6] hover:bg-[#e7f5ff] py-1.5 rounded-sm uppercase transition-colors">
                          Enviar p/ Chat
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {abaDireita === 'busca' && (
              <div>
                <form onSubmit={buscarPacientes} className="flex gap-1 mb-4">
                  <input 
                    type="text" value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} placeholder="Nome ou CPF..." 
                    className="flex-1 border border-gray-300 px-3 py-2 text-[12px] bg-[#f8f9fa] focus:outline-none focus:border-blue-500 rounded-sm"
                  />
                  <button type="submit" className="bg-[#495057] hover:bg-[#343a40] text-white px-3 rounded-sm text-[11px] font-bold transition-colors">BUSCAR</button>
                </form>
                <div className="flex flex-col gap-2">
                  {!loading && resultadosBusca?.map(paciente => (
                    <div key={paciente.id} className="border border-gray-200 rounded-md shadow-sm overflow-hidden bg-white">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-700">{paciente.nome}</div>
                      <div className="p-3 text-[12px] text-[#495057] font-medium">CPF: {paciente.cpf || 'Não informado'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Box>
        </Box>
    </Dialog>
  );
};

export default ChatInterno;