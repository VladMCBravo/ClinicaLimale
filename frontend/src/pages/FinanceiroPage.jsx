// src/pages/FinanceiroPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Paper, Box, Tabs, Tab, Button, Stack, CircularProgress } from '@mui/material';
import { 
    FaChartLine, FaHandHoldingUsd, FaMoneyBillWave, 
    FaFileInvoiceDollar, FaListAlt 
} from 'react-icons/fa';
import { AccountBalanceWallet, ReceiptLong } from '@mui/icons-material';

// Serviços
import { faturamentoService } from '../services/faturamentoService';

// Componentes Filhos
import FinanceiroDashboardView from '../components/financeiro/FinanceiroDashboardView';
import ContasReceberView from '../components/financeiro/ContasReceberView';
import DespesasView from '../components/financeiro/DespesasView';
import FaturamentoConveniosView from '../components/financeiro/FaturamentoConveniosView';
import ProcedimentosView from '../components/financeiro/ProcedimentosView';
import LancamentoCaixaModal from '../components/financeiro/LancamentoCaixaModal';

function a11yProps(index) {
    return { id: `tab-${index}`, 'aria-controls': `tabpanel-${index}` };
}

export default function FinanceiroPage() {
    const [activeTab, setActiveTab] = useState(0);
    
    // ESTADO UNIFICADO: Vamos guardar tudo junto, pois agora o banco é unificado
    const [transacoes, setTransacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // GATILHO DE ATUALIZAÇÃO: Serve para forçar a página a recarregar quando você salva algo no modal
    const [triggerReload, setTriggerReload] = useState(0);

    // Controle do Modal de Lançamento
    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({ tab: 0, type: 'receita' });

    // 1. CARREGAMENTO INTELIGENTE (Busca tudo de uma vez)
    useEffect(() => {
        const carregarDados = async () => {
            setLoading(true);
            try {
                // Buscamos as duas listas em paralelo
                const [resReceitas, resDespesas] = await Promise.all([
                    faturamentoService.getPagamentos(), // ou endpoint unificado se tiver
                    faturamentoService.getDespesas()
                ]);

                // Adicionamos uma "etiqueta" para saber quem é quem
                const receitas = (resReceitas.data || []).map(item => ({ ...item, tipo: 'receita' }));
                const despesas = (resDespesas.data || []).map(item => ({ ...item, tipo: 'despesa' }));

                // Juntamos tudo numa lista só
                setTransacoes([...receitas, ...despesas]);
            } catch (err) {
                console.error("Erro ao carregar financeiro:", err);
            } finally {
                setLoading(false);
            }
        };
        carregarDados();
    }, [triggerReload]); // Recarrega sempre que 'triggerReload' mudar

    // 2. FILTROS MEMOIZADOS (Separa os dados instantaneamente sem travar)
    const receitasList = useMemo(() => transacoes.filter(t => t.tipo === 'receita'), [transacoes]);
    const despesasList = useMemo(() => transacoes.filter(t => t.tipo === 'despesa'), [transacoes]);

    // Função que passaremos para os filhos: "Quando você salvar algo, me avise para eu atualizar tudo"
    const handleReload = () => setTriggerReload(prev => prev + 1);

    const handleOpenModal = (tabIndex, type = 'receita') => {
        setModalConfig({ tab: tabIndex, type: type });
        setModalOpen(true);
    };

    return (
        <Paper sx={{ p: 2, width: '100%', minHeight: '85vh', bgcolor: '#f4f5f7' }}>
            
            {/* CABEÇALHO: ABAS E BOTÕES */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable">
                    <Tab icon={<FaChartLine />} label="Dashboard" {...a11yProps(0)} />
                    <Tab icon={<FaHandHoldingUsd />} label="Recebimentos" {...a11yProps(1)} />
                    <Tab icon={<FaMoneyBillWave />} label="Despesas" {...a11yProps(2)} />
                    <Tab icon={<FaFileInvoiceDollar />} label="TISS" {...a11yProps(3)} />
                    <Tab icon={<FaListAlt />} label="Procedimentos" {...a11yProps(4)} />
                </Tabs>

                <Stack direction="row" spacing={2} mb={1}>
                    <Button 
                        variant="contained" startIcon={<ReceiptLong />} 
                        onClick={() => handleOpenModal(0, 'receita')}
                    >
                        Receber
                    </Button>
                    <Button 
                        variant="contained" color="error" startIcon={<AccountBalanceWallet />} 
                        onClick={() => handleOpenModal(1, 'despesa')}
                    >
                        Pagar
                    </Button>
                </Stack>
            </Box>

            {/* CONTEÚDO DAS ABAS */}
            <Box sx={{ p: 1 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>
                ) : (
                    <>
                        {activeTab === 0 && (
                            /* Passamos as listas JÁ PRONTAS. O Dashboard só exibe. */
                            <FinanceiroDashboardView 
                                lancamentos={receitasList} 
                                despesas={despesasList} 
                            />
                        )}

                        {activeTab === 1 && (
                            /* Recebimentos: Recebe a lista pronta + função de recarregar */
                            <ContasReceberView 
                                dadosIniciais={receitasList} 
                                onReload={handleReload} 
                            />
                        )}

                        {activeTab === 2 && (
                            /* Despesas: Recebe a lista pronta + função de recarregar */
                            <DespesasView 
                                dadosIniciais={despesasList} 
                                onReload={handleReload} 
                            />
                        )}
                        
                        {/* Estas abas mantivemos igual pois podem ter lógicas muito específicas */}
                        {activeTab === 3 && <FaturamentoConveniosView />} 
                        {activeTab === 4 && <ProcedimentosView />}
                    </>
                )}
            </Box>

            {/* MODAL GLOBAL DE LANÇAMENTO */}
            <LancamentoCaixaModal 
                open={modalOpen} 
                onClose={() => {
                    setModalOpen(false);
                    handleReload(); // Atualiza a tela ao fechar o modal
                }} 
                initialTab={modalConfig.tab} 
                initialType={modalConfig.type} 
            />
        </Paper>
    );
}