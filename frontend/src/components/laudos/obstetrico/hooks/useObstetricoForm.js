import { useState, useEffect, useRef } from 'react';
import { initialState } from '../logic/obstetricInitialState';
import { 
    calcularIGeDPP_DUM, 
    calcularIGeDPP_Anterior, 
    calcularIndicesBiometricos, 
    calcularDMSG,
    calcularIGDmsg,
    calcularIG_CCN,
    calcularMediaBiometria // <--- 1. IMPORTAR AQUI
} from '../logic/obstetricCalculations';

// --- CORREÇÃO AQUI ---
// Adicionei montarTextoFinalMultiplo na importação abaixo:
import { 
    gerarRelatorioFeto,  
    montarTextoFinalMultiplo // <--- FALTAVA ISSO
} from '../logic/obstetricTextBuilder';

// AJUSTE 1: Adicionei valor padrão para onUpdate e initialValues para evitar crash
export const useObstetricoForm = (onUpdate = () => {}, initialValues = {}) => {
    
    // Estado principal
    const [data, setData] = useState(() => {
        if (initialValues && Object.keys(initialValues).length > 0) {
            return { ...initialState, ...initialValues };
        }
        return initialState;
    });
    
    // Controles de Gestão Múltipla
    const [qtdFetos, setQtdFetos] = useState(1); // 1, 2 ou 3
    const [fetoAtivo, setFetoAtivo] = useState(1); // Qual aba está aberta
    const [mostrarGraficos, setMostrarGraficos] = useState(false);

    // Armazém de dados dos fetos que não estão na tela
    const dadosFeto1 = useRef({ ...initialState });
    const dadosFeto2 = useRef({ ...initialState });
    const dadosFeto3 = useRef({ ...initialState });
 
    // --- 1. CÁLCULOS AUTOMÁTICOS ---
    useEffect(() => {
        setData(prev => {
            const newState = { ...prev };
            let mudou = false;

            // A. DUM e DPP
            if (prev.dum && prev.usarDum) {
                const { ig, dpp } = calcularIGeDPP_DUM(prev.dum); // Declarado aqui
                
                if (prev.igDum !== ig) { newState.igDum = ig; mudou = true; }
                if (prev.dppDum !== dpp) { newState.dppDum = dpp; mudou = true; }
                
                if (prev.citarDppBiometria && prev.dppBiometriaCalculada !== dpp) {
                     newState.dppBiometriaCalculada = dpp; 
                     mudou = true; 
                }

            // === SINCRONIA DE GÊMEOS (TEM QUE ESTAR DENTRO DESTE IF) ===
                if (fetoAtivo === 1) {
                    if (dadosFeto2.current) {
                        dadosFeto2.current.dum = prev.dum;
                        dadosFeto2.current.igDum = ig; // Usa 'ig' daqui
                        dadosFeto2.current.dppDum = dpp; // Usa 'dpp' daqui
                        dadosFeto2.current.usarDum = true;
                    }
                    if (dadosFeto3.current) {
                        dadosFeto3.current.dum = prev.dum;
                        dadosFeto3.current.igDum = ig;
                        dadosFeto3.current.dppDum = dpp;
                        dadosFeto3.current.usarDum = true;
                    }
                }
            } // <--- O FECHAMENTO DO IF DEVE SER AQUI, APÓS O BLOCO DE SINCRONIA
            
            // =========================================================
            // B. NOVO: CÁLCULO DA BIOMETRIA MÉDIA (IG/DPP pelo USG)
            // =========================================================
            // Só calcula se tiver pelo menos um dado biométrico preenchido
            if (prev.dbp || prev.cc || prev.femur || prev.ca) {
                const bio = calcularMediaBiometria(prev);
                
                if (prev.igBiometria !== bio.ig) {
                    newState.igBiometria = bio.ig;
                    mudou = true;
                }
                if (prev.dppBiometriaCalculada !== bio.dpp) {
                    newState.dppBiometriaCalculada = bio.dpp;
                    mudou = true;
                }
            } else if (prev.igBiometria !== '') {
                // Se o usuário apagou as medidas, limpa os campos calculados
                newState.igBiometria = '';
                newState.dppBiometriaCalculada = '';
                mudou = true;
            }
            // =========================================================
            if (prev.usarExameAnterior && prev.dataExameAnterior) {
                // Importante: Certifique-se que calcularIGeDPP_Anterior está importado corretamente
                const { ig, dpp } = calcularIGeDPP_Anterior(
                    prev.dataExameAnterior, 
                    prev.igAnteriorSemanas, 
                    prev.igAnteriorDias
                );
                
                if (prev.igIgCorrigidaCalculada !== ig) { 
                    newState.igIgCorrigidaCalculada = ig; 
                    mudou = true; 
                }
                if (prev.dppIgCorrigidaCalculada !== dpp) { 
                    newState.dppIgCorrigidaCalculada = dpp; 
                    mudou = true; 
                }
            }
            // =========================================================

            // C. Índices Biométricos e Peso (AGORA COM NOMES CORRETOS)
            const indices = calcularIndicesBiometricos(prev);
            
            // Atualiza apenas se mudou, usando as chaves corretas
            if (prev.resIc !== indices.resIc) { newState.resIc = indices.resIc; mudou = true; }
            if (prev.resCcCa !== indices.resCcCa) { newState.resCcCa = indices.resCcCa; mudou = true; }
            if (prev.resCfCa !== indices.resCfCa) { newState.resCfCa = indices.resCfCa; mudou = true; }
            if (prev.resCfCc !== indices.resCfCc) { newState.resCfCc = indices.resCfCc; mudou = true; }
            if (prev.pesoEstimado !== indices.pesoEstimado) { newState.pesoEstimado = indices.pesoEstimado; mudou = true; }

            // D. Checkboxes Automáticos (Feedback visual)
            if (indices.resIc && !prev.checkIndiceCefalico) { newState.checkIndiceCefalico = true; mudou = true; }

            // C. DMSG
            const novoDmsg = calcularDMSG(prev.sg1, prev.sg2, prev.sg3);
            if (prev.resDmsg !== novoDmsg) { 
                newState.resDmsg = novoDmsg; 
                const novaIgSg = calcularIGDmsg(novoDmsg); 
                newState.resIgSg = novaIgSg;
                mudou = true; 
            }

            // D. CCN
            if (prev.ccn) {
                const novaIgCcn = calcularIG_CCN(prev.ccn);
                if (prev.resIgCcn !== novaIgCcn) {
                    newState.resIgCcn = novaIgCcn;
                    mudou = true;
                }
            } else if (prev.resIgCcn !== '') {
                newState.resIgCcn = '';
                mudou = true;
            }

            return mudou ? newState : prev;
        });
    }, [
        data.dum, data.usarDum, data.dataExameAnterior, fetoAtivo, 
        data.ccn, data.dbp, data.dof, data.cc, data.ca, data.femur, 
        data.sg1, data.sg2, data.sg3,
        // ADICIONE ESTAS DUAS LINHAS NOVAS:
        data.igAnteriorSemanas, 
        data.igAnteriorDias
]);

    // --- 2. GERAÇÃO DE TEXTO E SINCRONIZAÇÃO ---
    useEffect(() => {
        // Salva o estado atual no Ref correto antes de gerar relatório
        if (fetoAtivo === 1) dadosFeto1.current = data;
        if (fetoAtivo === 2) dadosFeto2.current = data;
        if (fetoAtivo === 3) dadosFeto3.current = data;

        // Gera relatórios individuais
        const resF1 = gerarRelatorioFeto(dadosFeto1.current);
        const resF2 = qtdFetos >= 2 ? gerarRelatorioFeto(dadosFeto2.current) : null;
        const resF3 = qtdFetos >= 3 ? gerarRelatorioFeto(dadosFeto3.current) : null;

        // MUDANÇA AQUI: Passamos um array com os dados brutos de todos os fetos
        const listaFetos = [dadosFeto1.current, dadosFeto2.current, dadosFeto3.current];
        
        const textoFinal = montarTextoFinalMultiplo(resF1, resF2, resF3, qtdFetos, listaFetos);

        const mapTitulo = {
            'OBSTETRICO_MORFOLOGICO': 'ULTRASSONOGRAFIA MORFOLÓGICA FETAL',
            'OBSTETRICO_1_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA DE 1º TRIMESTRE',
            'OBSTETRICO_2_3_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA'
        };

        if (typeof onUpdate === 'function') {
            onUpdate({ 
                texto: textoFinal, 
                dadosEstruturados: { 
                    feto1: { ...dadosFeto1.current, ...resF1 }, 
                    feto2: qtdFetos >= 2 ? { ...dadosFeto2.current, ...resF2 } : null,
                    feto3: qtdFetos >= 3 ? { ...dadosFeto3.current, ...resF3 } : null,
                    qtdFetos
                }, 
                tituloExame: mapTitulo[data.subtipo] || 'ULTRASSONOGRAFIA OBSTÉTRICA'
            });
        }

    }, [data, qtdFetos, fetoAtivo, onUpdate]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleDatacaoChange = (tipo) => {
        if (tipo === 'USAR_DUM') setData(prev => ({ ...prev, usarDum: true, dumDesconhecida: false, naoUsarDum: false }));
        else if (tipo === 'DUM_DESCONHECIDA') setData(prev => ({ ...prev, usarDum: false, dumDesconhecida: true, naoUsarDum: false }));
        else if (tipo === 'NAO_USAR_DUM') setData(prev => ({ ...prev, usarDum: false, dumDesconhecida: false, naoUsarDum: true }));
    };

    // Nova função para alterar quantidade de fetos
    const handleChangeQtdFetos = (novaQtd) => {
        setQtdFetos(novaQtd);
        
        // Se reduzir (ex: 3 para 1), volta para a aba 1
        if (novaQtd < fetoAtivo) {
            setFetoAtivo(1);
            setData({ ...dadosFeto1.current });
        }

        // Inicializa dados do feto novo se estiver vazio
        if (novaQtd >= 2 && !dadosFeto2.current.subtipo) {
            dadosFeto2.current = { ...initialState, dum: data.dum, usarDum: data.usarDum, subtipo: data.subtipo };
        }
        if (novaQtd >= 3 && !dadosFeto3.current.subtipo) {
            dadosFeto3.current = { ...initialState, dum: data.dum, usarDum: data.usarDum, subtipo: data.subtipo };
        }
    };

    const handleTabChange = (novoFeto) => {
        if (novoFeto === fetoAtivo) return;
        // 1. Salva o que está na tela no Ref atual
        if (fetoAtivo === 1) dadosFeto1.current = { ...data };
        else if (fetoAtivo === 2) dadosFeto2.current = { ...data };
        else if (fetoAtivo === 3) dadosFeto3.current = { ...data };

        // 2. Carrega o Ref do novo feto para a tela
        let dadosNovo;
        if (novoFeto === 1) dadosNovo = dadosFeto1.current;
        else if (novoFeto === 2) dadosNovo = dadosFeto2.current;
        else dadosNovo = dadosFeto3.current;

        setData({ ...dadosNovo });
        setFetoAtivo(novoFeto);
    };

    return {
        formState: data,
        handleInputChange: handleChange,
        setFormState: setData,
        data, 
        handleChange,
        handleDatacaoChange,
        qtdFetos,            // Novo
        handleChangeQtdFetos, // Novo
        fetoAtivo,
        handleTabChange,
        mostrarGraficos,
        setMostrarGraficos
    };
};