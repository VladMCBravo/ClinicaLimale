import { useState, useEffect, useRef } from 'react';
import { initialState } from '../logic/obstetricInitialState';
import { calcularIGeDPP_DUM, calcularIGeDPP_Anterior, calcularIndicesBiometricos, calcularDMSG } from '../logic/obstetricCalculations';
import { gerarRelatorioFeto, montarTextoFinal } from '../logic/obstetricTextBuilder';

export const useObstetricoForm = (onUpdate) => {
    // Estado principal (Feto Ativo)
    const [data, setData] = useState(initialState);
    
    // Controles de Interface
    const [isGemelar, setIsGemelar] = useState(false);
    const [fetoAtivo, setFetoAtivo] = useState(1);
    const [mostrarGraficos, setMostrarGraficos] = useState(false);

    // Armazenamento dos dados dos fetos (para não perder ao trocar abas)
    const dadosFeto1 = useRef({ ...initialState });
    const dadosFeto2 = useRef({ ...initialState });

    // --- 1. EFEITO DE CÁLCULOS AUTOMÁTICOS ---
    useEffect(() => {
        setData(prev => {
            const newState = { ...prev };
            let mudou = false;

            // A. DUM e DPP
            if (prev.dum && prev.usarDum) {
                const { ig, dpp } = calcularIGeDPP_DUM(prev.dum);
                if (prev.igDum !== ig) { newState.igDum = ig; mudou = true; }
                if (prev.dppDum !== dpp) { newState.dppDum = dpp; mudou = true; }
                
                // Placeholder para DPP Biometria (se não tiver lógica complexa ainda)
                if (prev.citarDppBiometria && prev.dppBiometriaCalculada !== dpp) {
                     newState.dppBiometriaCalculada = dpp; 
                     mudou = true; 
                }
            }

            // B. Exame Anterior
            if (prev.dataExameAnterior) {
                const { dpp: dppCorr } = calcularIGeDPP_Anterior(prev.dataExameAnterior, prev.igAnteriorSemanas, prev.igAnteriorDias);
                if (prev.dppIgCorrigidaCalculada !== dppCorr) { newState.dppIgCorrigidaCalculada = dppCorr; mudou = true; }
            }

            // C. Índices Biométricos (Calculados em tempo real)
            const indices = calcularIndicesBiometricos(prev);
            if (prev.resIc !== indices.ic) { newState.resIc = indices.ic; mudou = true; }
            if (prev.resCcCa !== indices.ccCa) { newState.resCcCa = indices.ccCa; mudou = true; }
            if (prev.resCfCa !== indices.cfCa) { newState.resCfCa = indices.cfCa; mudou = true; }
            if (prev.resCfDbp !== indices.cfDbp) { newState.resCfDbp = indices.cfDbp; mudou = true; }
            if (prev.resCfCc !== indices.cfCc) { newState.resCfCc = indices.cfCc; mudou = true; }

            // D. Checkboxes Automáticos de Índices (Ativa se tiver valor)
            if (indices.ic && !prev.checkIndiceCefalico) { newState.checkIndiceCefalico = true; mudou = true; }
            // ... (pode adicionar lógica para os outros checkboxes se desejar automação total)

            // E. DMSG (1º Trimestre)
            const novoDmsg = calcularDMSG(prev.sg1, prev.sg2, prev.sg3);
            if (prev.resDmsg !== novoDmsg) { newState.resDmsg = novoDmsg; mudou = true; }

            return mudou ? newState : prev;
        });
    }, [
        data.dum, data.usarDum, data.dataExameAnterior, data.igAnteriorSemanas, data.igAnteriorDias,
        data.dbp, data.dof, data.cc, data.ca, data.femur, 
        data.sg1, data.sg2, data.sg3, data.citarDppBiometria
    ]);

    // --- 2. EFEITO DE GERAÇÃO DE TEXTO E SINCRONIA ---
    useEffect(() => {
        // 1. Salva o estado atual no Ref do feto correspondente
        if (fetoAtivo === 1) dadosFeto1.current = data;
        else dadosFeto2.current = data;

        // 2. Gera os relatórios usando o Builder
        const resultadoF1 = gerarRelatorioFeto(dadosFeto1.current);
        const resultadoF2 = isGemelar ? gerarRelatorioFeto(dadosFeto2.current) : null;

        // 3. Monta o texto final
        const textoFinal = montarTextoFinal(
            { ...resultadoF1, listaComentarios: resultadoF1.listaComentarios, listaConclusao: resultadoF1.listaConclusao },
            isGemelar ? { ...resultadoF2, listaComentarios: resultadoF2.listaComentarios, listaConclusao: resultadoF2.listaConclusao } : null,
            isGemelar
        );

        // 4. Define o Título do Exame
        const mapTitulo = {
            'OBSTETRICO_MORFOLOGICO': 'ULTRASSONOGRAFIA MORFOLÓGICA FETAL',
            'OBSTETRICO_1_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA DE 1º TRIMESTRE',
            'OBSTETRICO_2_3_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA'
        };

        // 5. Envia para o Pai (LaudosPage)
        onUpdate({ 
            texto: textoFinal, 
            dadosEstruturados: { 
                feto1: { ...dadosFeto1.current, ...resultadoF1 }, 
                feto2: isGemelar ? { ...dadosFeto2.current, ...resultadoF2 } : null,
                isGemelar
            }, 
            tituloExame: mapTitulo[data.subtipo] || 'ULTRASSONOGRAFIA OBSTÉTRICA'
        });

    }, [data, isGemelar, fetoAtivo, onUpdate]);

    // --- HANDLERS (Funções de interação) ---
    
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleDatacaoChange = (tipo) => {
        if (tipo === 'USAR_DUM') setData(prev => ({ ...prev, usarDum: true, dumDesconhecida: false, naoUsarDum: false }));
        else if (tipo === 'DUM_DESCONHECIDA') setData(prev => ({ ...prev, usarDum: false, dumDesconhecida: true, naoUsarDum: false }));
        else if (tipo === 'NAO_USAR_DUM') setData(prev => ({ ...prev, usarDum: false, dumDesconhecida: false, naoUsarDum: true }));
    };

    const toggleGemelar = (e) => {
        const checked = e.target.checked;
        setIsGemelar(checked);
        if (!checked) {
            setFetoAtivo(1);
            if(dadosFeto1.current) setData({ ...dadosFeto1.current });
        } else {
            // Ao ativar, garante que Feto 2 tenha DUM sincronizada inicialmente
            if (!dadosFeto2.current.dum) {
                dadosFeto2.current = { ...initialState, dum: data.dum, usarDum: data.usarDum, subtipo: data.subtipo };
            }
        }
    };

    const handleTabChange = (novoFeto) => {
        if (novoFeto === fetoAtivo) return;
        
        // Salva estado atual antes de trocar
        if (fetoAtivo === 1) dadosFeto1.current = { ...data };
        else dadosFeto2.current = { ...data };
        
        // Carrega novo estado
        const dadosNovo = novoFeto === 1 ? dadosFeto1.current : dadosFeto2.current;
        setData({ ...dadosNovo });
        setFetoAtivo(novoFeto);
    };

    return {
        data,
        handleChange,
        handleDatacaoChange,
        isGemelar,
        toggleGemelar,
        fetoAtivo,
        handleTabChange,
        mostrarGraficos,
        setMostrarGraficos
    };
};