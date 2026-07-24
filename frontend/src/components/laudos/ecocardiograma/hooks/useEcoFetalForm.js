import { useState, useEffect } from 'react';
import { ecoFetalInitialState } from '../logic/ecoFetalInitialState';
import { montarTextoFetal, aplicarDiagnostico } from '../logic/ecoFetalTextBuilder';

const useEcoFetalForm = (onUpdate, initialValues) => {
    const [data, setData] = useState(() => {
        if (initialValues && Object.keys(initialValues).length > 0) {
            return { ...ecoFetalInitialState, ...initialValues };
        }
        return ecoFetalInitialState;
    });

    // Mudança genérica de input (texto, número, radio, checkbox).
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    // Troca de diagnóstico → aplica o preset (sobrescreve campos segmentares
    // + conclusão/comentários/conduta). O médico pode editar tudo depois.
    const selecionarDiagnostico = (diagnosticoKey) => {
        setData((prev) => aplicarDiagnostico(prev, diagnosticoKey));
    };

    // Geração de texto + envio ao componente pai.
    useEffect(() => {
        const { textoPreview, dadosEstruturados, tituloExame } = montarTextoFetal(data);
        if (onUpdate) {
            onUpdate({ texto: textoPreview, dadosEstruturados, tituloExame });
        }
    }, [data, onUpdate]);

    return { data, handleChange, selecionarDiagnostico };
};

export default useEcoFetalForm;
