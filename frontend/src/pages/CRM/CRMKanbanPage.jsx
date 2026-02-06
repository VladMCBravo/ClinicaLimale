import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Box, Typography, Card, CardContent, Chip, Avatar, LinearProgress } from '@mui/material';
import { FaWhatsapp, FaExclamationTriangle } from 'react-icons/fa';
import CicloDetalhesModal from './CicloDetalhesModal';
import { crmService } from '../../services/crmService';

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
      setColumns({ F1: [], F2: [], F3: [], F4: [], ...response.data }); 
    } catch (error) {
      console.error("Erro ao carregar Kanban", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (ciclo) => {
    console.log("Card clicado:", ciclo.id); // Debug no console
    setSelectedCicloId(ciclo.id);
    setModalOpen(true);
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
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: '#333' }}>
        Funil de Ciclos Clínicos
      </Typography>

      <DragDropContext onDragEnd={onDragEnd}>
        <Box sx={{ display: 'flex', gap: 2, minWidth: '1000px', height: '100%' }}>
          {Object.entries(COLUMNS).map(([colId, colDef]) => (
            <Box key={colId} sx={{ width: '300px', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ 
                p: 1.5, mb: 1, borderRadius: 1, 
                backgroundColor: colDef.color, fontWeight: 'bold', 
                display: 'flex', justifyContent: 'space-between'
              }}>
                {colDef.title}
                <Chip size="small" label={columns[colId]?.length || 0} sx={{ backgroundColor: 'rgba(255,255,255,0.5)' }} />
              </Box>

              <Droppable droppableId={colId}>
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      flexGrow: 1,
                      backgroundColor: snapshot.isDraggingOver ? '#e3f2fd' : '#ebecf0',
                      borderRadius: 2, p: 1, overflowY: 'auto'
                    }}
                  >
                    {columns[colId]?.map((ciclo, index) => (
                      <Draggable key={String(ciclo.id)} draggableId={String(ciclo.id)} index={index}>
                        {(provided, snapshot) => (
                          // --- CORREÇÃO AQUI: Box Wrapper ---
                          <Box
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{ mb: 2, ...provided.draggableProps.style }}
                          >
                            <Card
                              onClick={() => handleCardClick(ciclo)}
                              sx={{ 
                                cursor: 'pointer',
                                backgroundColor: 'white',
                                transition: 'all 0.2s',
                                boxShadow: snapshot.isDragging ? 6 : 1,
                                borderLeft: ciclo.proxima_acao_imediata?.atrasada ? '4px solid #f44336' : '4px solid transparent',
                                '&:hover': { 
                                  boxShadow: 6,
                                  transform: 'translateY(-2px)' 
                                }
                              }}
                            >
                              <CardContent sx={{ p: '8px 12px !important' }}> {/* Padding reduzido */}
  
                                {/* 1. Cabeçalho: Nome e Tipo */}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                                    <Avatar sx={{ bgcolor: colDef.color, width: 20, height: 20, fontSize: '0.7rem', mr: 1 }}>
                                      {ciclo.paciente_nome?.charAt(0)}
                                    </Avatar>
                                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 'bold', fontSize: '0.85rem', maxWidth: '140px' }}>
                                      {ciclo.paciente_nome}
                                    </Typography>
                                  </Box>
                                  {ciclo.tipo && (
                                    <Chip label={ciclo.tipo.substring(0, 3)} size="small" sx={{ fontSize: '0.6rem', height: 16 }} />
                                  )}
                                </Box>

                                {/* 2. Informações do Agendamento (O que você pediu) */}
                                {ciclo.dados_agendamento ? (
                                  <Box sx={{ 
                                    backgroundColor: '#f5f7fa', 
                                    borderRadius: 1, 
                                    p: 0.8, 
                                    mb: 1,
                                    border: '1px solid #eee'
                                  }}>
                                    {/* Linha 1: Data e Procedimento */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#333', fontSize: '0.75rem' }}>
                                        {new Date(ciclo.dados_agendamento.data).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                                        {' '}
                                        {new Date(ciclo.dados_agendamento.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                                      </Typography>
                                      <Typography variant="caption" noWrap sx={{ maxWidth: '100px', color: '#555', fontSize: '0.7rem' }} title={ciclo.dados_agendamento.procedimento}>
                                        {ciclo.dados_agendamento.procedimento}
                                      </Typography>
                                    </Box>

                                    {/* Linha 2: Status (Badges) */}
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                      {/* Status Agendamento */}
                                      <Chip 
                                        label={ciclo.dados_agendamento.status_ag} 
                                        size="small" 
                                        sx={{ 
                                          height: 16, fontSize: '0.6rem', 
                                          bgcolor: ciclo.dados_agendamento.status_ag === 'Confirmado' ? '#e8f5e9' : '#fff3e0',
                                          color: ciclo.dados_agendamento.status_ag === 'Confirmado' ? '#2e7d32' : '#ef6c00'
                                        }} 
                                      />
                                      {/* Status Pagamento */}
                                      <Chip 
                                        label={ciclo.dados_agendamento.status_pag} 
                                        size="small" 
                                        sx={{ 
                                          height: 16, fontSize: '0.6rem',
                                          bgcolor: ciclo.dados_agendamento.status_pag === 'Pago' ? '#e3f2fd' : '#ffebee',
                                          color: ciclo.dados_agendamento.status_pag === 'Pago' ? '#1565c0' : '#c62828'
                                        }} 
                                      />
                                    </Box>
                                  </Box>
                                ) : (
                                  // Se não tiver agendamento (Ex: F1 recém chegado)
                                  <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'gray', fontSize: '0.7rem', fontStyle: 'italic' }}>
                                    Sem agendamento vinculado
                                  </Typography>
                                )}

                                {/* 3. Próxima Ação e Receita (Rodapé Compacto) */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  
                                  {/* Ação */}
                                  {ciclo.proxima_acao_imediata ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', maxWidth: '180px' }}>
                                      {ciclo.proxima_acao_imediata.atrasada && <FaExclamationTriangle color="red" size={10} style={{ marginRight: 3 }} />}
                                      <Typography variant="caption" noWrap sx={{ fontSize: '0.65rem', color: ciclo.proxima_acao_imediata.atrasada ? 'red' : 'text.secondary' }}>
                                        {ciclo.proxima_acao_imediata.descricao}
                                      </Typography>
                                    </Box>
                                  ) : (
                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'orange' }}>⚠️ Ação necessária</Typography>
                                  )}

                                  {/* Ícone Whats */}
                                  <FaWhatsapp color="#25D366" size={14} style={{ cursor: 'pointer' }} />
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