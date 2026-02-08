import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Box, Typography, Card, CardContent, Chip, Avatar, LinearProgress, IconButton, Tooltip } from '@mui/material';
import { FaWhatsapp, FaExclamationTriangle, FaRegCalendarAlt } from 'react-icons/fa';
import CicloDetalhesModal from './CicloDetalhesModal';
import { crmService } from '../../services/crmService';

// Cores das colunas
const COLUMNS = {
  'F1': { title: 'F1 - Entrada', color: '#90caf9' },
  'F2': { title: 'F2 - Conversão', color: '#a5d6a7' },
  'F3': { title: 'F3 - Pós-Exame', color: '#ffcc80' },
  'F4': { title: 'F4 - Retenção', color: '#ce93d8' }
};

export default function CRMKanbanPage() {
  const [columns, setColumns] = useState({ F1: [], F2: [], F3: [], F4: [] });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCicloId, setSelectedCicloId] = useState(null);

  useEffect(() => {
    loadKanban();
  }, []);

  const loadKanban = async () => {
    try {
      const response = await crmService.getKanban();
      const rawData = response.data;

      // Ordenação: Data do Agendamento (Mais urgente no topo)
      const sortCiclos = (lista) => {
        return lista.sort((a, b) => {
          const dateA = a.dados_agendamento ? new Date(a.dados_agendamento.data) : new Date(9999, 11, 31);
          const dateB = b.dados_agendamento ? new Date(b.dados_agendamento.data) : new Date(9999, 11, 31);
          return dateA - dateB;
        });
      };

      setColumns({
        F1: sortCiclos(rawData.F1 || []),
        F2: sortCiclos(rawData.F2 || []),
        F3: sortCiclos(rawData.F3 || []),
        F4: sortCiclos(rawData.F4 || []),
        ENCERRADO: rawData.ENCERRADO || []
      }); 
    } catch (error) {
      console.error("Erro ao carregar Kanban", error);
    } finally {
      setLoading(false);
    }
  };

  // Abre Modal apenas para ver detalhes
  const handleOpenDetalhes = (e, cicloId) => {
    e.stopPropagation(); // Garante que não dispare outros eventos
    setSelectedCicloId(cicloId);
    setModalOpen(true);
  };

  // Abre WhatsApp
  const handleWhatsappClick = (e, numero, nome) => {
    e.stopPropagation(); // IMPEDE QUE O MODAL ABRA
    if (!numero) return alert("Paciente sem número cadastrado");
    
    // Limpa o número para formato internacional
    const cleanNum = numero.replace(/\D/g, '');
    const url = `https://wa.me/55${cleanNum}?text=Olá ${nome}, tudo bem? Falamos da Clínica Limalé.`;
    window.open(url, '_blank');
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceCol = [...columns[source.droppableId]];
    const destCol = [...columns[destination.droppableId]];
    const [movedItem] = sourceCol.splice(source.index, 1);
    
    movedItem.fase_atual = destination.droppableId;
    destCol.splice(destination.index, 0, movedItem);

    setColumns({
      ...columns,
      [source.droppableId]: sourceCol,
      [destination.droppableId]: destCol
    });

    try {
      await crmService.moverFase(draggableId, destination.droppableId);
    } catch (error) {
      console.error("Erro ao mover card", error);
      loadKanban();
    }
  };

  if (loading) return <LinearProgress />;

  return (
    <Box sx={{ p: 2, height: 'calc(100vh - 80px)', overflowX: 'auto', backgroundColor: '#f4f5f7' }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#444' }}>
        Funil de Atendimentos
      </Typography>

      <DragDropContext onDragEnd={onDragEnd}>
        <Box sx={{ display: 'flex', gap: 1.5, minWidth: '1000px', height: '100%' }}>
          {Object.entries(COLUMNS).map(([colId, colDef]) => (
            <Box key={colId} sx={{ width: '280px', display: 'flex', flexDirection: 'column' }}>
              {/* Header Compacto */}
              <Box sx={{ 
                p: 1, mb: 1, borderRadius: 1, 
                backgroundColor: colDef.color, fontWeight: 'bold', fontSize: '0.85rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                {colDef.title}
                <Chip label={columns[colId]?.length || 0} size="small" sx={{ height: 20, fontSize: '0.7rem', backgroundColor: 'rgba(255,255,255,0.6)' }} />
              </Box>

              <Droppable droppableId={colId}>
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      flexGrow: 1,
                      backgroundColor: snapshot.isDraggingOver ? '#e3f2fd' : '#ebecf0',
                      borderRadius: 2, p: 0.5, overflowY: 'auto'
                    }}
                  >
                    {columns[colId]?.map((ciclo, index) => (
                      <Draggable key={String(ciclo.id)} draggableId={String(ciclo.id)} index={index}>
                        {(provided, snapshot) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{ mb: 1, ...provided.draggableProps.style }}
                          >
                            <Card
                              sx={{ 
                                backgroundColor: 'white',
                                transition: 'all 0.2s',
                                boxShadow: snapshot.isDragging ? 4 : 1,
                                borderLeft: ciclo.proxima_acao_imediata?.atrasada ? '3px solid #f44336' : '3px solid transparent',
                                '&:hover': { boxShadow: 3 }
                              }}
                            >
                              <CardContent sx={{ p: '8px !important', '&:last-child': { pb: '8px !important' } }}>
  
                                {/* LINHA 1: Avatar + Nome (Clicável) + WhatsApp */}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                  <Box 
                                    onClick={(e) => handleOpenDetalhes(e, ciclo.id)}
                                    sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexGrow: 1 }}
                                  >
                                    <Avatar sx={{ bgcolor: colDef.color, width: 20, height: 20, fontSize: '0.65rem', mr: 0.8 }}>
                                      {ciclo.paciente_nome?.charAt(0)}
                                    </Avatar>
                                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 'bold', fontSize: '0.8rem', maxWidth: '180px', color: '#333' }}>
                                      {ciclo.paciente_nome}
                                    </Typography>
                                  </Box>
                                  
                                  {/* Botão WhatsApp isolado */}
                                  <IconButton 
                                    size="small" 
                                    sx={{ padding: 0.5, marginLeft: 0.5 }}
                                    onClick={(e) => handleWhatsappClick(e, ciclo.paciente_whatsapp, ciclo.paciente_nome)}
                                  >
                                    <FaWhatsapp color="#25D366" size={16} />
                                  </IconButton>
                                </Box>
                                {/* --- NOVO: BARRA DE ALERTA GESTACIONAL (Lógica do PDF) --- */}
                                {ciclo.alerta_clinico && (
                                  <Box 
                                      onClick={(e) => handleOpenDetalhes(e, ciclo.id)} // Clicar aqui também abre detalhes para ajustar DUM
                                      sx={{ 
                                          mt: 0.5, mb: 1, p: 0.5, borderRadius: 1, cursor: 'pointer',
                                          backgroundColor: 
                                          ciclo.alerta_clinico.prioridade === 'urgente' ? '#ffebee' : 
                                          ciclo.alerta_clinico.prioridade === 'alta' ? '#fff8e1' : '#e3f2fd',
                                          border: 
                                          ciclo.alerta_clinico.prioridade === 'urgente' ? '1px solid #ef5350' : '1px solid transparent',
                                          display: 'flex', alignItems: 'center', gap: 1
                                      }}
                                  >
                                      <Chip 
                                          // --- AQUI ESTÁ A CORREÇÃO MÁGICA ---
                                          // Se o backend mandou "8s + 5d", usa isso. Se não, usa o fallback antigo.
                                          label={ciclo.idade_gestacional || `${ciclo.alerta_clinico.semanas} sem`} 
                                          // ------------------------------------
                                          size="small" 
                                          sx={{ 
                                              height: 16, fontSize: '0.6rem', fontWeight: 'bold',
                                              bgcolor: 'white', color: '#333'
                                          }} 
                                      />
                                      <Typography variant="caption" noWrap sx={{ 
                                          fontSize: '0.65rem', fontWeight: 'bold', 
                                          color: 
                                              ciclo.alerta_clinico.prioridade === 'urgente' ? '#c62828' : 
                                              ciclo.alerta_clinico.prioridade === 'alta' ? '#f57f17' : '#1565c0'
                                      }}>
                                      {ciclo.alerta_clinico.texto}
                                      </Typography>
                                  </Box>
                                )}
                                {/* ----------------------------------------------------------- */}

                                {/* LINHA 2: Data + Status (A Pedido: Mesma linha) */}
                                {ciclo.dados_agendamento ? (
                                  <>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, flexWrap: 'nowrap' }}>
                                        {/* Data Compacta */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', color: '#555', fontSize: '0.7rem', minWidth: 'fit-content' }}>
                                            <FaRegCalendarAlt style={{ marginRight: 3, fontSize: '0.65rem' }} />
                                            {new Date(ciclo.dados_agendamento.data).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                                            {' '}
                                            {new Date(ciclo.dados_agendamento.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                                        </Box>

                                        {/* Chips de Status (Mini) */}
                                        <Chip 
                                            label={ciclo.dados_agendamento.status_ag} 
                                            size="small" 
                                            sx={{ 
                                                height: 14, fontSize: '0.55rem', px: 0,
                                                bgcolor: ciclo.dados_agendamento.status_ag === 'Confirmado' ? '#e8f5e9' : '#fff3e0',
                                                color: ciclo.dados_agendamento.status_ag === 'Confirmado' ? '#2e7d32' : '#ef6c00'
                                            }} 
                                        />
                                        <Chip 
                                            label={ciclo.dados_agendamento.status_pag} 
                                            size="small" 
                                            sx={{ 
                                                height: 14, fontSize: '0.55rem', px: 0,
                                                bgcolor: ciclo.dados_agendamento.status_pag === 'Pago' ? '#e3f2fd' : '#ffebee',
                                                color: ciclo.dados_agendamento.status_pag === 'Pago' ? '#1565c0' : '#c62828'
                                            }} 
                                        />
                                    </Box>

                                    {/* LINHA 3: Procedimento e Preço */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Typography noWrap title={ciclo.dados_agendamento.procedimento} sx={{ fontSize: '0.7rem', color: '#666', maxWidth: '160px' }}>
                                            {ciclo.dados_agendamento.procedimento}
                                        </Typography>
                                        {parseFloat(ciclo.receita_acumulada) > 0 && (
                                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'green', fontSize: '0.7rem' }}>
                                                R$ {parseInt(ciclo.receita_acumulada)}
                                            </Typography>
                                        )}
                                    </Box>
                                  </>
                                ) : (
                                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#aaa', fontSize: '0.65rem', fontStyle: 'italic' }}>
                                        Sem agendamento
                                    </Typography>
                                )}

                                {/* LINHA 4: Barra de Ação (Clicável) */}
                                <Box 
                                    onClick={(e) => handleOpenDetalhes(e, ciclo.id)}
                                    sx={{ 
                                        display: 'flex', alignItems: 'center', 
                                        bgcolor: ciclo.proxima_acao_imediata?.atrasada ? '#ffebee' : '#f5f5f5', 
                                        p: 0.5, borderRadius: 1, cursor: 'pointer',
                                        '&:hover': { bgcolor: '#e0e0e0' }
                                    }}
                                >
                                    {ciclo.proxima_acao_imediata ? (
                                        <>
                                            {ciclo.proxima_acao_imediata.atrasada && <FaExclamationTriangle color="red" size={10} style={{ marginRight: 4 }} />}
                                            <Typography noWrap sx={{ fontSize: '0.65rem', color: '#444', fontWeight: '500' }}>
                                                {ciclo.proxima_acao_imediata.descricao}
                                            </Typography>
                                        </>
                                    ) : (
                                        <Typography sx={{ fontSize: '0.65rem', color: '#ff9800', fontStyle: 'italic' }}>
                                            ⚠️ Definir próxima ação...
                                        </Typography>
                                    )}
                                </Box>

                              </CardContent>
                            </Card>
                          </Box>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Box>
          ))}
        </Box>
      </DragDropContext>

      <CicloDetalhesModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        cicloId={selectedCicloId}
        onUpdate={loadKanban}
      />
    </Box>
  );
}