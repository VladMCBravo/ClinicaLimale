// src/components/laudos/ecocardiograma/FormEcoFetal.jsx
import React from 'react';
import '../Laudos.css';

import useEcoFetalForm from './hooks/useEcoFetalForm';
import { parseIgParaSemanas } from './logic/ecoFetalCalculations';
import CalculadoraCrescimento from '../shared/CalculadoraCrescimento';

import SecaoGestacaoBiometria from './sections_eco_fetal/SecaoGestacaoBiometria';
import SecaoBibliotecaDiagnosticos from './sections_eco_fetal/SecaoBibliotecaDiagnosticos';
import SecaoSegmentarFetal from './sections_eco_fetal/SecaoSegmentarFetal';
import SecaoRitmoArritmia from './sections_eco_fetal/SecaoRitmoArritmia';
import SecaoScoreHidropsia from './sections_eco_fetal/SecaoScoreHidropsia';
import SecaoComentariosConduta from './sections_eco_fetal/SecaoComentariosConduta';

const FormEcoFetal = ({ onUpdate, initialValues }) => {
  const { data, handleChange, selecionarDiagnostico } = useEcoFetalForm(onUpdate, initialValues);

  // Idade gestacional (semanas) parseada do texto do laudo, para pré-preencher
  // a calculadora de biometria fetal.
  const gaSemanas = parseIgParaSemanas(data.idadeGestacional);
  const inserirComentario = (texto) => {
    if (!texto) return;
    const novo = data.comentarios ? `${data.comentarios}\n${texto}` : texto;
    handleChange({ target: { name: 'comentarios', value: novo } });
  };

  return (
    <div className="laudo-container">
        <div style={{display:'flex', gap:'10px', alignItems:'flex-start', flexWrap:'wrap'}}>
            <div style={{flex:'1', minWidth:'350px'}}>
                <SecaoGestacaoBiometria data={data} handleChange={handleChange} />
                <SecaoBibliotecaDiagnosticos
                    data={data} handleChange={handleChange}
                    selecionarDiagnostico={selecionarDiagnostico}
                />
                <SecaoSegmentarFetal data={data} handleChange={handleChange} />
            </div>

            <div style={{flex:'1', minWidth:'350px'}}>
                <SecaoRitmoArritmia data={data} handleChange={handleChange} />
                <CalculadoraCrescimento
                    padraoInicial="ig_fetal"
                    idadeFixa={gaSemanas}
                    onInserir={inserirComentario}
                />
                <SecaoScoreHidropsia data={data} handleChange={handleChange} />
                <SecaoComentariosConduta data={data} handleChange={handleChange} />
            </div>
        </div>
    </div>
  );
};

export default FormEcoFetal;
