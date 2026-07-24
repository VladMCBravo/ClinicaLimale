import { useState, useEffect } from 'react';
import { ecoCongenitoInitialState } from '../logic/ecoCongenitoInitialState';
import { montarTextoCongenito, aplicarDiagnosticoCongenito } from '../logic/ecoCongenitoTextBuilder';
import { calcularBSA } from '../../../../utils/growth/bsa';

const useEcoCongenitoForm = (onUpdate, initialValues) => {
    const [data, setData] = useState(() => {
        if (initialValues && Object.keys(initialValues).length > 0) {
            return { ...ecoCongenitoInitialState, ...initialValues };
        }
        return ecoCongenitoInitialState;
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const selecionarDiagnostico = (diagnosticoKey) => {
        setData((prev) => aplicarDiagnosticoCongenito(prev, diagnosticoKey));
    };

    // BSA automática (Haycock) a partir de peso/altura.
    useEffect(() => {
        const bsa = calcularBSA(data.peso, data.altura, 'haycock');
        const scStr = bsa != null ? String(bsa) : '';
        if (scStr !== data.sc) setData((prev) => ({ ...prev, sc: scStr }));
    }, [data.peso, data.altura, data.sc]);

    useEffect(() => {
        const { textoPreview, dadosEstruturados, tituloExame } = montarTextoCongenito(data);
        if (onUpdate) onUpdate({ texto: textoPreview, dadosEstruturados, tituloExame });
    }, [data, onUpdate]);

    return { data, handleChange, selecionarDiagnostico };
};

export default useEcoCongenitoForm;
