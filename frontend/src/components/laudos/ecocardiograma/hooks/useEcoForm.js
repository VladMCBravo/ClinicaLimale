import { useState, useEffect, useRef } from 'react';
import { ecoInitialState } from '../logic/ecoInitialState';
import { runAllCalculations } from '../logic/ecoCalculations';
import { montarTextoFinal } from '../logic/ecoTextBuilder';

const useEcoForm = (onUpdate, initialValues) => {
    const [data, setData] = useState(() => {
        if (initialValues && Object.keys(initialValues).length > 0) {
            return { ...ecoInitialState, ...initialValues };
        }
        return ecoInitialState;
    });
    const isFirstRender = useRef(true);

    // 1. Handlers de Mudança de Input
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    // 2. Efeito: Cálculos Matemáticos (Monitora inputs numéricos)
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }

        const updates = runAllCalculations(data);
        
        // Só atualiza se houver diferença para evitar loops infinitos ou renders desnecessários
        const hasChanges = Object.keys(updates).some(key => updates[key] !== data[key]);
        
        if (hasChanges) {
            setData(prev => ({ ...prev, ...updates }));
        }
    }, [
        data.peso, data.altura, data.ddve, data.dsve, data.siv, data.ppve, data.sc
    ]);

    // 3. Efeito: Geração de Texto e Envio ao Pai (Monitora todo o data)
    useEffect(() => {
        const { textoPreview, dadosEstruturados, tituloExame } = montarTextoFinal(data);
        
        // Envia para o componente pai (que gerencia o editor ou PDF)
        if (onUpdate) {
            onUpdate({ 
                texto: textoPreview, 
                dadosEstruturados, 
                tituloExame 
            });
        }
    }, [data, onUpdate]);

    return {
        data,
        handleChange
    };
};

export default useEcoForm;