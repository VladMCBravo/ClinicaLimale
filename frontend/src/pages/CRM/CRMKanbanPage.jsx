import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Box, Typography, Card, CardContent, Chip, Avatar, LinearProgress, IconButton } from '@mui/material';
import { FaWhatsapp, FaExclamationTriangle, FaRegCalendarAlt } from 'react-icons/fa';
import CicloDetalhesModal from './CicloDetalhesModal';
import { crmService } from '../../services/crmService';

const COLUMNS = {
  'F1': { title: '1. Novos Leads', color: '#e3f2fd', border: '#90caf9' }, 
  'F2': { title: '2. Agendados', color: '#e8f5e9', border: '#a5d6a7' },   
  'F3': { title: '3. Pós-Atendimento', color: '#fff3e0', border: '#ffcc80' }, 
  'F4': { title: '4. Retenção / Retorno', color: '#f3e5f5', border: '#ce93d8' }, 
  'F5': { title: '5. Recuperação (Faltas)', color: '#ffebee', border: '#ef5350' } 
};

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

export default function CRMKanbanPage() {
  const [columns, setColumns] = useState({ F1: [], F2: [], F3: [], F4: [], F5: [] });
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
        F5: sortCiclos(rawData.F5 || [])
      }); 
    } catch (error) {
      console.error("Erro ao carregar Kanban", error);
    } finally {
      setLoading(false);
    }
  };

  const getColumnTotal = (colId) => {
    return columns[colId]?.reduce((acc, item) => acc + (parseFloat(item.receita_acumulada) || 0), 0) || 0;
  };

  const handleOpenDetalhes = (e, cicloId) => {
    e.stopPropagation();
    setSelectedCicloId(cicloId);
    setModalOpen(true);
  };

  const handleWhatsappClick = (e, numero, nome) => {
    e.stopPropagation();
    if (!numero) return alert("Paciente sem número cadastrado");
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

  // --- NOVA FUNÇÃO PARA RENDERIZAR O STATUS EXPLICITO ---
  const renderStatusChip = (ciclo) => {
    if (!ciclo.dados_agendamento) {
      return <Chip label="Apenas Cadastro" size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#e0e0e0' }} />;
    }
    
    const status = ciclo.dados_agendamento.status_ag;
    let corBadge = '#e0e0e0';
    let corTexto = '#333';

    if (['Confirmado', 'Realizado'].includes(status)) { corBadge = '#c8e6c9'; corTexto = '#2e7d32'; }
    if (['Agendado', 'Aguardando', 'Em Atendimento', 'Laudando'].includes(status)) { corBadge = '#bbdefb'; corTexto = '#1565c0'; }
    if (['Cancelado', 'Não Compareceu'].includes(status)) { corBadge = '#ffcdd2'; corTexto = '#c62828'; }

    return (
      <Chip 
        label={status} 
        size="small" 
        sx={{ height: 18, fontSize: '0.6rem', fontWeight: 'bold', bgcolor: corBadge, color: corTexto }} 
      />
    );
  };

  if (loading) return <LinearProgress />;

  return (
    <Box sx={{ p: 1, height: 'calc(100vh - 70px)', overflow: 'hidden', bgcolor: '#f4f5f7', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#444' }}>
            CRM - Jornada do Paciente
          </Typography>
      </Box>

      <DragDropContext onDragEnd={onDragEnd}>
        <Box sx={{ display: 'flex', gap: 1, flexGrow: 1, height: '100%', overflowX: 'auto', pb: 1 }}>
          {Object.entries(COLUMNS).map(([colId, colDef]) => (
            <Box key={colId} sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                minWidth: '240px', 
                bgcolor: '#ebecf0',
                borderRadius: 2,
                maxHeight: '100%'
            }}>
              
              <Box sx={{ p: 1, bgcolor: colDef.color, borderBottom: `2px solid ${colDef.border}`, borderRadius: '8px 8px 0 0', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#333', fontSize: '0.8rem' }}>
                        {colDef.title}
                    </Typography>
                    <Chip label={columns[colId]?.length || 0} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 'bold', bgcolor: 'white' }} />
                </Box>
                <Typography variant="caption" sx={{ color: '#555', fontWeight: 600, fontSize: '0.7rem', alignSelf: 'flex-end' }}>
                    Valor: {formatMoney(getColumnTotal(colId))}
                </Typography>
              </Box>

              <Droppable droppableId={colId}>
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      flexGrow: 1, overflowY: 'auto', p: 0.8,
                      backgroundColor: snapshot.isDraggingOver ? 'rgba(0,0,0,0.03)' : 'transparent',
                      '&::-webkit-scrollbar': { width: '4px' },
                      '&::-webkit-scrollbar-thumb': { background: '#ccc', borderRadius: '4px' }
                    }}
                  >
                    {columns[colId]?.map((ciclo, index) => (
                      <Draggable key={String(ciclo.id)} draggableId={String(ciclo.id)} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            elevation={snapshot.isDragging ? 6 : 1}
                            sx={{ mb: 0.8, borderRadius: 2, borderLeft: ciclo.proxima_acao_imediata?.atrasada ? '4px solid #f44336' : `4px solid ${colDef.border}`, ...provided.draggableProps.style }}
                          >
                            <CardContent sx={{ p: '8px !important' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                    <Avatar sx={{ bgcolor: colDef.border, width: 22, height: 22, fontSize: '0.7rem', mr: 1, color: '#333', fontWeight: 'bold' }}>
                                        {ciclo.paciente_nome?.charAt(0)}
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1, minWidth: 0, cursor: 'pointer' }} onClick={(e) => handleOpenDetalhes(e, ciclo.id)}>
                                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 'bold', fontSize: '0.75rem', lineHeight: 1.1 }}>
                                            {ciclo.paciente_nome}
                                        </Typography>
                                    </Box>
                                    <IconButton size="small" sx={{ p: 0.3, ml: 0.5, bgcolor: '#e8f5e9' }} onClick={(e) => handleWhatsappClick(e, ciclo.paciente_whatsapp, ciclo.paciente_nome)}>
                                        <FaWhatsapp color="#25D366" size={12} />
                                    </IconButton>
                                </Box>

                                {ciclo.alerta_clinico && (
                                    <Box sx={{ bgcolor: ciclo.alerta_clinico.prioridade === 'urgente' ? '#ffebee' : '#fff8e1', color: ciclo.alerta_clinico.prioridade === 'urgente' ? '#c62828' : '#f57f17', borderRadius: 1, px: 0.5, py: 0.2, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.65rem', fontWeight: 'bold' }}>
                                        <Typography variant="inherit">{ciclo.idade_gestacional || `${ciclo.alerta_clinico.semanas} sem`}</Typography>
                                        <Typography variant="inherit" noWrap>• {ciclo.alerta_clinico.texto}</Typography>
                                    </Box>
                                )}

                                {/* LINHA DE STATUS E DATA EXPLICITOS */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, mt: 1 }}>
                                    {renderStatusChip(ciclo)}
                                    
                                    {ciclo.dados_agendamento && (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#666' }}>
                                          <FaRegCalendarAlt size={10} />
                                          <Typography sx={{ fontSize: '0.65rem', fontWeight: 500 }}>
                                              {new Date(ciclo.dados_agendamento.data).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                                          </Typography>
                                      </Box>
                                    )}
                                </Box>

                                {/* PROCEDIMENTO ABAIXO DO STATUS */}
                                {ciclo.dados_agendamento && (
                                    <Typography noWrap sx={{ display: 'block', mt: 0.5, fontSize: '0.65rem', color: '#444', fontWeight: 'bold' }} title={ciclo.dados_agendamento.procedimento || ciclo.tipo}>
                                        {ciclo.dados_agendamento.procedimento || ciclo.tipo}
                                    </Typography>
                                )}

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, pt: 0.5, borderTop: '1px dashed #eee' }}>
                                    <Box onClick={(e) => handleOpenDetalhes(e, ciclo.id)} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: ciclo.proxima_acao_imediata?.atrasada ? '#d32f2f' : '#1976d2', bgcolor: ciclo.proxima_acao_imediata?.atrasada ? '#ffebee' : 'transparent', borderRadius: 1, px: 0.5 }}>
                                        {ciclo.proxima_acao_imediata?.atrasada && <FaExclamationTriangle size={10} />}
                                        <Typography noWrap sx={{ fontSize: '0.65rem', fontWeight: 600, maxWidth: '110px' }}>
                                            {ciclo.proxima_acao_imediata?.descricao || "Definir próxima ação"}
                                        </Typography>
                                    </Box>
                                    {parseFloat(ciclo.receita_acumulada) > 0 && (
                                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#2e7d32' }}>
                                            {formatMoney(ciclo.receita_acumulada)}
                                        </Typography>
                                    )}
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

      <CicloDetalhesModal open={modalOpen} onClose={() => setModalOpen(false)} cicloId={selectedCicloId} onUpdate={loadKanban} />
    </Box>
  );
}