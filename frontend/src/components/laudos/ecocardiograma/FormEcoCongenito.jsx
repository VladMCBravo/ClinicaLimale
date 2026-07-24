// src/components/laudos/ecocardiograma/FormEcoCongenito.jsx
import React from 'react';
import '../Laudos.css';

import useEcoCongenitoForm from './hooks/useEcoCongenitoForm';
import CalculadoraCrescimento from '../shared/CalculadoraCrescimento';

import SecaoContextoCongenito from './sections_eco_congenito/SecaoContextoCongenito';
import SecaoSegmentarCongenito from './sections_eco_congenito/SecaoSegmentarCongenito';
import SecaoConclusaoCongenito from './sections_eco_congenito/SecaoConclusaoCongenito';

const FormEcoCongenito = ({ onUpdate, initialValues }) => {
  const { data, handleChange, selecionarDiagnostico } = useEcoCongenitoForm(onUpdate, initialValues);

  const inserirComentario = (texto) => {
    if (!texto) return;
    const novo = data.comentarios ? `${data.comentarios}\n${texto}` : texto;
    handleChange({ target: { name: 'comentarios', value: novo } });
  };

  return (
    <div className="laudo-container">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '350px' }}>
                <SecaoContextoCongenito data={data} handleChange={handleChange} />
                <SecaoSegmentarCongenito data={data} handleChange={handleChange} selecionarDiagnostico={selecionarDiagnostico} />
            </div>
            <div style={{ flex: '1', minWidth: '350px' }}>
                <CalculadoraCrescimento padraoInicial="ig_preterm" onInserir={inserirComentario} />
                <SecaoConclusaoCongenito data={data} handleChange={handleChange} />
            </div>
        </div>
    </div>
  );
};

export default FormEcoCongenito;
