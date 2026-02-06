import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Box, Typography, Card, CardContent, Chip, Avatar, LinearProgress } from '@mui/material';
import { FaWhatsapp, FaExclamationTriangle } from 'react-icons/fa';
import CicloDetalhesModal from './CicloDetalhesModal'; // <--- Importe aqui
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

  // Adicione estes states:
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCicloId, setSelectedCicloId] = useState(null);

  // Função ao clicar no card
  const handleCardClick = (ciclo) => {
    setSelectedCicloId(ciclo.id);
    setModalOpen(true);
  };

  // Carrega dados do Backend
  useEffect(() => {
    loadKanban();
  }, []);

  const loadKanban = async () => {
    try {
      const response = await crmService.getKanban(); // <--- Alterado
      // Adicionado .data na leitura
      setColumns({ F1: [], F2: [], F3: [], F4: [], ...response.data }); 
    } catch (error) {
      console.error("Erro ao carregar Kanban", error);
    } finally {
      setLoading(false);
    }
  };

  // Lógica do Drag and Drop
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // 1. Atualização Otimista (Visual instantâneo)
    const sourceCol = [...columns[source.droppableId]];
    const destCol = [...columns[destination.droppableId]];
    const [movedItem] = sourceCol.splice(source.index, 1);
    
    // Atualiza a fase visualmente
    movedItem.fase_atual = destination.droppableId;
    destCol.splice(destination.index, 0, movedItem);

    setColumns({
      ...columns,
      [source.droppableId]: sourceCol,
      [destination.droppableId]: destCol
    });

    // 2. Chama API para persistir
    try {
      await crmService.moverFase(draggableId, destination.droppableId);
    } catch (error) {
      console.error("Erro ao mover card", error);
      loadKanban(); // Reverte em caso de erro
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
              {/* Header da Coluna */}
              <Box sx={{ 
                p: 1.5, mb: 1, borderRadius: 1, 
                backgroundColor: colDef.color, fontWeight: 'bold', 
                display: 'flex', justifyContent: 'space-between'
              }}>
                {colDef.title}
                <Chip size="small" label={columns[colId]?.length || 0} sx={{ backgroundColor: 'rgba(255,255,255,0.5)' }} />
              </Box>

              {/* Área Droppable */}
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
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            // --- AQUI ESTÁ A MÁGICA ---
                            onClick={() => handleCardClick(ciclo)} 
                            sx={{ 
                              mb: 2, cursor: 'pointer', // Cursor de mãozinha
                              '&:hover': { boxShadow: 6 } // Efeito visual ao passar mouse
                            }}
                          >
                            // ---------------------------
                            sx={{
                              mb: 1.5,
                              backgroundColor: snapshot.isDragging ? '#fff' : '#fff',
                              boxShadow: snapshot.isDragging ? 6 : 1,
                              borderLeft: ciclo.proxima_acao_imediata?.atrasada ? '4px solid #f44336' : '4px solid transparent'
                            }}
                            <CardContent sx={{ p: '12px !important' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {ciclo.paciente_nome}
                                </Typography>
                                {ciclo.tipo && <Chip label={ciclo.tipo} size="small" sx={{ fontSize: '0.6rem', height: 20 }} />}
                              </Box>

                              {/* Indicador de Receita */}
                              {parseFloat(ciclo.receita_acumulada) > 0 && (
                                <Typography variant="caption" sx={{ color: 'green', display: 'block' }}>
                                  Receita: R$ {ciclo.receita_acumulada}
                                </Typography>
                              )}

                              {/* Próxima Ação (Regra de Ouro) */}
                              {ciclo.proxima_acao_imediata ? (
                                <Box sx={{ mt: 1, p: 0.5, backgroundColor: ciclo.proxima_acao_imediata.atrasada ? '#ffebee' : '#f5f5f5', borderRadius: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
                                  {ciclo.proxima_acao_imediata.atrasada && <FaExclamationTriangle color="red" style={{ marginRight: 4 }} />}
                                  {ciclo.proxima_acao_imediata.descricao}
                                </Box>
                              ) : (
                                <Box sx={{ mt: 1, p: 0.5, backgroundColor: '#fff3e0', borderRadius: 1, fontSize: '0.75rem', color: '#e65100' }}>
                                  ⚠️ Sem próxima ação
                                </Box>
                              )}
                              
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                <FaWhatsapp color="#25D366" style={{ cursor: 'pointer' }} />
                              </Box>
                            </CardContent>
                          </Card>
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
    </Box>
  );
}