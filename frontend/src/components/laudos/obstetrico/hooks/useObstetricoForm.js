import { useState, useEffect, useRef } from 'react';
import { initialState } from '../logic/obstetricInitialState';
import { 
    calcularIGeDPP_DUM, 
    calcularIGeDPP_Anterior, 
    calcularIndicesBiometricos, 
    calcularDMSG,
    calcularIGDmsg,
    calcularIG_CCN,
} from '../logic/obstetricCalculations';
import { gerarRelatorioFeto, montarTextoFinal } from '../logic/obstetricTextBuilder';

// AJUSTE 1: Adicionei valor padrão para onUpdate e initialValues para evitar crash
export const useObstetricoForm = (onUpdate = () => {}, initialValues = {}) => {
    
    // Estado principal
    const [data, setData] = useState(() => {
        if (initialValues && Object.keys(initialValues).length > 0) {
            return { ...initialState, ...initialValues };
        }
        return initialState;
    });
    
    // Controles de Interface
    const [isGemelar, setIsGemelar] = useState(false);
    const [fetoAtivo, setFetoAtivo] = useState(1);
    const [mostrarGraficos, setMostrarGraficos] = useState(false);

    const dadosFeto1 = useRef({ ...initialState });
    const dadosFeto2 = useRef({ ...initialState });

    // --- 1. CÁLCULOS AUTOMÁTICOS ---
    useEffect(() => {
        setData(prev => {
            const newState = { ...prev };
            let mudou = false;

            // A. DUM e DPP
            if (prev.dum && prev.usarDum) {
                const { ig, dpp } = calcularIGeDPP_DUM(prev.dum);
                if (prev.igDum !== ig) { newState.igDum = ig; mudou = true; }
                if (prev.dppDum !== dpp) { newState.dppDum = dpp; mudou = true; }
                
                if (prev.citarDppBiometria && prev.dppBiometriaCalculada !== dpp) {
                     newState.dppBiometriaCalculada = dpp; 
                     mudou = true; 
                }
            }

            // === CORREÇÃO AQUI: EXAME ANTERIOR ===
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
            // ======================================

            // C. Índices Biométricos
            const indices = calcularIndicesBiometricos(prev);
            if (prev.resIc !== indices.ic) { newState.resIc = indices.ic; mudou = true; }
            if (prev.resCcCa !== indices.ccCa) { newState.resCcCa = indices.ccCa; mudou = true; }
            if (prev.resCfCa !== indices.cfCa) { newState.resCfCa = indices.cfCa; mudou = true; }
            if (prev.resCfDbp !== indices.cfDbp) { newState.resCfDbp = indices.cfDbp; mudou = true; }
            if (prev.resCfCc !== indices.cfCc) { newState.resCfCc = indices.cfCc; mudou = true; }

            // D. Checkboxes Automáticos
            if (indices.ic && !prev.checkIndiceCefalico) { newState.checkIndiceCefalico = true; mudou = true; }

            // E. DMSG
            const novoDmsg = calcularDMSG(prev.sg1, prev.sg2, prev.sg3);
            if (prev.resDmsg !== novoDmsg) { 
                newState.resDmsg = novoDmsg; 
                const novaIgSg = calcularIGDmsg(novoDmsg); 
                newState.resIgSg = novaIgSg;
                mudou = true; 
            }

            // F. CCN
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
        data.dum, data.usarDum, data.dataExameAnterior, data.igAnteriorSemanas, data.igAnteriorDias, data.ccn,
        data.dbp, data.dof, data.cc, data.ca, data.femur, 
        data.sg1, data.sg2, data.sg3, data.citarDppBiometria
    ]);

    // --- 2. GERAÇÃO DE TEXTO ---
    useEffect(() => {
        if (fetoAtivo === 1) dadosFeto1.current = data;
        else dadosFeto2.current = data;

        const resultadoF1 = gerarRelatorioFeto(dadosFeto1.current);
        const resultadoF2 = isGemelar ? gerarRelatorioFeto(dadosFeto2.current) : null;

        const textoFinal = montarTextoFinal(
            { ...resultadoF1, listaComentarios: resultadoF1.listaComentarios, listaConclusao: resultadoF1.listaConclusao },
            isGemelar ? { ...resultadoF2, listaComentarios: resultadoF2.listaComentarios, listaConclusao: resultadoF2.listaConclusao } : null,
            isGemelar
        );

        const mapTitulo = {
            'OBSTETRICO_MORFOLOGICO': 'ULTRASSONOGRAFIA MORFOLÓGICA FETAL',
            'OBSTETRICO_1_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA DE 1º TRIMESTRE',
            'OBSTETRICO_2_3_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA'
        };

        // Verifica se onUpdate é função antes de chamar
        if (typeof onUpdate === 'function') {
            onUpdate({ 
                texto: textoFinal, 
                dadosEstruturados: { 
                    feto1: { ...dadosFeto1.current, ...resultadoF1 }, 
                    feto2: isGemelar ? { ...dadosFeto2.current, ...resultadoF2 } : null,
                    isGemelar
                }, 
                tituloExame: mapTitulo[data.subtipo] || 'ULTRASSONOGRAFIA OBSTÉTRICA'
            });
        }

    }, [data, isGemelar, fetoAtivo, onUpdate]);

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
            if (!dadosFeto2.current.dum) {
                dadosFeto2.current = { ...initialState, dum: data.dum, usarDum: data.usarDum, subtipo: data.subtipo };
            }
        }
    };

    const handleTabChange = (novoFeto) => {
        if (novoFeto === fetoAtivo) return;
        if (fetoAtivo === 1) dadosFeto1.current = { ...data };
        else dadosFeto2.current = { ...data };
        const dadosNovo = novoFeto === 1 ? dadosFeto1.current : dadosFeto2.current;
        setData({ ...dadosNovo });
        setFetoAtivo(novoFeto);
    };

    // AJUSTE 2: Mapeando os nomes para o que o FormObstetrico espera
    return {
        formState: data,           // O componente espera formState
        handleInputChange: handleChange, // O componente espera handleInputChange
        setFormState: setData,     // Útil se precisar
        
        // Outros exportados originais
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