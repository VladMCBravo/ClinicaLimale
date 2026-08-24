import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../contexts/ChatContext';
import '../../atendimento.css';

const ChatInterno = ({ onClose, token }) => {
  const { socket, mensagensNaoLidas, isChatOpen, abrirChat, fecharChat } = useChat();
  const [contatoAtivo, setContatoAtivo] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [abaDireita, setAbaDireita] = useState('agendamentos'); 
  
  // Novos estados para os dados reais do banco
  const [agendamentosHoje, setAgendamentosHoje] = useState([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [loading, setLoading] = useState(false);

  const mensagemInputRef = useRef(null);
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://clinicalimale.onrender.com'
    : 'http://localhost:8000';

  // Estado para armazenar a lista da equipe (simulando que você buscou da API)
  const [equipe, setEquipe] = useState([
    { id: 2, nome: 'Dra. Ana', is_online: false },
    { id: 3, nome: 'Recepção - Maria', is_online: false },
    { id: 4, nome: 'Dr. Carlos', is_online: false },
  ]);

  // OUVINTE DO WEBSOCKET
  useEffect(() => {
    if (socket) {
      const handleMessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Se for mensagem de texto/card
        if (data.type === 'chat_message') {
          setMensagens((prev) => [...prev, data.message]);
        }
        
        // Se for aviso de alguém ficando Online/Offline
        else if (data.type === 'user_status') {
          setEquipe((prevEquipe) => 
            prevEquipe.map((func) => 
              func.id === data.user_id 
                ? { ...func, is_online: data.is_online } 
                : func
            )
          );
        }
      };

      socket.addEventListener('message', handleMessage);
      return () => socket.removeEventListener('message', handleMessage);
    }
  }, [socket]);

  // 2. BUSCAR AGENDAMENTOS DO DIA
  useEffect(() => {
    if (abaDireita === 'agendamentos') {
      setLoading(true);
      // Usando sua rota exata: /api/agendamentos/hoje/
      fetch(`${baseUrl}/api/agendamentos/hoje/`, {
        headers: { 'Authorization': `Token ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setAgendamentosHoje(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao buscar agendamentos", err);
        setLoading(false);
      });
    }
  }, [abaDireita, token]);

  // Adicione este bloco logo abaixo dos outros useEffects no ChatInterno.jsx

useEffect(() => {
  if (contatoAtivo) {
    // 1. Limpa as mensagens enquanto carrega o novo contato
    setMensagens([]); 
    
    // 2. Busca o histórico REST
    fetch(`${baseUrl}/api/chat/history/?contact_id=${contatoAtivo.id}`, {
      headers: { 'Authorization': `Token ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      // 3. Formata os dados para o padrão que o nosso layout já entende
      const historicoFormatado = data.map(msg => ({
        ...msg,
        sender: msg.is_mine ? 'me' : 'other' // A mágica do is_mine que fizemos no DRF
      }));
      setMensagens(historicoFormatado);
    })
    .catch(err => console.error("Erro ao carregar histórico", err));
  }
}, [contatoAtivo, token]);

  // 3. BUSCAR PACIENTES
  const buscarPacientes = (e) => {
    e.preventDefault();
    if (!termoBusca) return;
    
    setLoading(true);
    // Usando sua rota exata: /api/pacientes/
    // Assumindo que sua API suporta o parâmetro ?search=
    fetch(`${baseUrl}/api/pacientes/?search=${termoBusca}`, {
      headers: { 'Authorization': `Token ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      // DRF geralmente retorna a lista em data.results se houver paginação
      setResultadosBusca(data.results || data); 
      setLoading(false);
    })
    .catch(err => {
      console.error("Erro ao buscar pacientes", err);
      setLoading(false);
    });
  };

  // 4. FUNÇÕES DE ENVIO PARA O CHAT
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
      // Formata a hora para exibição (depende de como sua API retorna a data/hora)
      const horaStr = agendamento.data_hora ? new Date(agendamento.data_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
      const nomePaciente = agendamento.paciente?.nome || 'Paciente não informado';

      socket.send(JSON.stringify({
        receiver_id: contatoAtivo.id,
        content: `Agendamento: ${nomePaciente} às ${horaStr}`, // Texto de fallback
        attachment_type: 'appointment',
        attachment_id: agendamento.id,
        attachment_data: agendamento // Envia o dado completo para renderização imediata na tela de quem mandou
      }));
    }
  };

  return (
    <div className="tasy-workspace fixed inset-0 bg-black/50 flex justify-center items-center z-[9999]">
      <div className="tasy-flat-panel w-[95vw] h-[90vh] flex relative flex-row">
        
        {/* COLUNA ESQUERDA: LISTA DA EQUIPE */}
        <div className="w-1/4 border-r border-gray-200 flex flex-col bg-white">
          <div className="tasy-section-header !m-0 !border-x-0 !border-t-0">
            Equipe Interna
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {equipe.map((func) => (
              <div 
                key={func.id}
                onClick={() => setContatoAtivo(func)}
                className={`flex items-center p-2 cursor-pointer border-b border-gray-100 transition-colors ${contatoAtivo?.id === func.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'}`}
              >
                {/* A BOLINHA VERDE MÁGICA */}
                <div className={`w-2 h-2 rounded-full mr-3 shadow-sm ${func.is_online ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                
                <span className="text-[13px] text-gray-700 font-semibold">{func.nome}</span>
              </div>
            ))}
          </div>
        </div>

        {/* === COLUNA DO MEIO: CONVERSA E RENDERIZAÇÃO DOS CARDS === */}
        <div className="w-2/4 border-r border-gray-200 flex flex-col bg-[#f8f9fa] relative">
          {contatoAtivo ? (
            <>
              <div className="tasy-section-header !m-0 !border-x-0 !border-t-0 flex justify-between items-center">
                <span>Conversando com: {contatoAtivo.nome}</span>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2">
                {mensagens.map((msg, idx) => (
                  <div key={idx} className={`max-w-[75%] ${msg.sender === 'me' ? 'self-end' : 'self-start'}`}>
                    
                    {/* CONDICIONAL DE RENDERIZAÇÃO */}
                    {msg.attachment_type === 'appointment' ? (
                      /* RENDERIZA CARD DE AGENDAMENTO */
                      <div className="tasy-panel theme-blue !mb-0 shadow-sm border border-[#1c7ed6]">
                        <div className="tasy-panel-header !bg-[#e7f5ff]">
                          <div className="tasy-panel-title text-[#1864ab]">📅 Ficha de Agendamento</div>
                        </div>
                        <div className="tasy-panel-body bg-white text-[12px]">
                          <p className="font-bold text-[#495057]">{msg.content}</p>
                          <button className="mt-2 text-[11px] text-[#1c7ed6] font-bold hover:underline uppercase">
                            Abrir no Sistema
                          </button>
                        </div>
                      </div>
                    ) : msg.attachment_type === 'patient' ? (
                      /* RENDERIZA CARD DE PACIENTE */
                      <div className="tasy-panel theme-purple !mb-0 shadow-sm border border-[#7048e8]">
                        <div className="tasy-panel-header !bg-[#f3f0ff]">
                          <div className="tasy-panel-title text-[#5f3dc4]">👤 Contato de Paciente</div>
                        </div>
                        <div className="tasy-panel-body bg-white text-[12px]">
                          <p className="font-bold text-[#495057]">{msg.content}</p>
                        </div>
                      </div>
                    ) : (
                      /* RENDERIZA TEXTO NORMAL */
                      <div className={`px-3 py-1.5 text-[13px] rounded-sm border ${msg.sender === 'me' ? 'bg-blue-100 border-blue-200 text-[#222]' : 'bg-white border-gray-300 text-[#222]'}`}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={enviarMensagemTexto} className="p-2 bg-white border-t border-gray-300 flex gap-2">
                <input 
                  type="text" 
                  ref={mensagemInputRef}
                  placeholder="Digite sua mensagem..." 
                  className="flex-1 border border-gray-300 px-3 py-1.5 text-[13px] focus:outline-none focus:border-gray-500 bg-[#f8f9fa] rounded-sm"
                />
                <button type="submit" className="bg-[#495057] hover:bg-[#343a40] text-white px-4 py-1.5 text-[13px] font-bold rounded-sm uppercase tracking-wide">
                  Enviar
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#adb5bd] text-[13px] font-semibold uppercase">
              Selecione um contato
            </div>
          )}
        </div>

        {/* === COLUNA DIREITA: INTEGRAÇÃO COM DADOS REAIS === */}
        <div className="w-1/4 flex flex-col bg-white relative">
          <div className="tasy-section-header !m-0 !border-x-0 !border-t-0 flex justify-between items-center">
            <span>Apoio Clínico</span>
            <button onClick={onClose} className="text-[#e03131] hover:text-[#c92a2a] text-[11px] font-bold cursor-pointer">✕ FECHAR</button>
          </div>

          <div className="flex text-[11px] font-bold text-gray-500 border-b border-gray-200 bg-[#f8f9fa]">
            <button 
              className={`flex-1 p-2 uppercase transition-colors ${abaDireita === 'agendamentos' ? 'border-b-2 border-[#868e96] text-[#495057] bg-white' : 'hover:bg-gray-100'}`}
              onClick={() => setAbaDireita('agendamentos')}
            >
              Agendamentos
            </button>
            <button 
              className={`flex-1 p-2 uppercase transition-colors ${abaDireita === 'busca' ? 'border-b-2 border-[#868e96] text-[#495057] bg-white' : 'hover:bg-gray-100'}`}
              onClick={() => setAbaDireita('busca')}
            >
              Busca
            </button>
          </div>

          <div className="p-3 flex-1 overflow-y-auto">
            {loading && <div className="text-center text-xs text-gray-400 py-4">Carregando dados...</div>}

            {abaDireita === 'agendamentos' && !loading && (
              <div>
                {agendamentosHoje.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center">Nenhum agendamento para hoje.</p>
                ) : (
                  agendamentosHoje.map(agendamento => (
                    <div key={agendamento.id} className="tasy-panel theme-blue">
                      <div className="tasy-panel-header">
                        {/* Tratamento para exibir nome do paciente e hora */}
                        <div className="tasy-panel-title">
                          {agendamento.data_hora ? new Date(agendamento.data_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'} • {agendamento.paciente?.nome || 'Paciente ID: ' + agendamento.paciente}
                        </div>
                      </div>
                      <div className="tasy-panel-body">
                        <div className="text-[12px] text-[#495057] mb-2">{agendamento.procedimento?.nome || 'Consulta Padrão'}</div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => enviarCardAgendamento(agendamento)}
                            className="text-[10px] font-bold text-white bg-[#1c7ed6] hover:bg-[#1864ab] px-2 py-1 rounded-sm uppercase"
                          >
                            Enviar p/ Chat
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {abaDireita === 'busca' && (
              <div>
                <form onSubmit={buscarPacientes} className="flex gap-1 mb-3">
                  <input 
                    type="text" 
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    placeholder="Nome ou CPF..." 
                    className="flex-1 border border-gray-300 px-3 py-2 text-[13px] bg-[#f8f9fa] focus:outline-none focus:border-gray-500 rounded-sm"
                  />
                  <button type="submit" className="bg-[#495057] text-white px-2 rounded-sm text-[11px] font-bold">BUSCAR</button>
                </form>

                {!loading && resultadosBusca.map(paciente => (
                  <div key={paciente.id} className="tasy-panel theme-purple">
                    <div className="tasy-panel-header">
                      <div className="tasy-panel-title">{paciente.nome}</div>
                    </div>
                    <div className="tasy-panel-body">
                      <div className="text-[12px] text-[#495057] mb-2">CPF: {paciente.cpf || 'Não informado'}</div>
                      {/* Aqui você faria uma função enviarCardPaciente similar à de agendamento */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChatInterno;