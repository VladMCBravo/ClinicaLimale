// src/components/laudos/ecocardiograma/FormEcocardiograma.jsx
//
// Roteador de categoria do Ecocardiograma. Escolhe entre o fluxo ADULTO
// (transtorácico / doppler / strain) e o fluxo FETAL. Cada fluxo é um
// componente independente com seu próprio hook de estado, de modo que apenas
// UM deles chama onUpdate por vez (evita corrida entre os dois motores de texto).
import React, { useState } from 'react';
import '../Laudos.css';

import FormEcoAdulto from './FormEcoAdulto';
import FormEcoFetal from './FormEcoFetal';

const FormEcocardiograma = ({ onUpdate, initialValues }) => {
  // Deriva a categoria inicial dos valores recebidos (retomada de rascunho).
  const categoriaInicial =
    (initialValues && (initialValues.subtipoFetal === 'ECO_FETAL' || initialValues.__tipo === 'ECO_FETAL'))
      ? 'FETAL'
      : 'ADULTO';

  const [categoria, setCategoria] = useState(categoriaInicial);

  return (
    <div className="laudo-container">
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px', paddingBottom:'10px', borderBottom:'1px solid #ccc' }}>
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.28 3.6-2.34 4.58-2.74a.92.92 0 0 0 .17-.06.92.92 0 0 0-.17-1.78c-2.4-.6-5.83-.24-8.58 2.06" />
                <path d="M5 14c-1.49-1.28-3.6-2.34-4.58-2.74a.92.92 0 0 1-.17-.06.92.92 0 0 1 .17-1.78c2.4-.6 5.83-.24 8.58 2.06" />
                <path d="M12 4.5v15" />
                <path d="M9.5 7.5a2.5 2.5 0 0 1 5 0" />
             </svg>
             <span style={{fontWeight:'bold', color:'#333'}}>CATEGORIA DO EXAME:</span>
             <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="laudo-select"
                style={{flex:1, fontWeight:'bold', fontSize:'14px', border:'1px solid #1565C0', color:'#1565C0'}}
             >
                 <option value="ADULTO">Ecocardiograma (Adulto / Transtorácico)</option>
                 <option value="FETAL">Ecocardiograma Fetal</option>
             </select>
        </div>

        {categoria === 'FETAL'
            ? <FormEcoFetal onUpdate={onUpdate} initialValues={initialValues} />
            : <FormEcoAdulto onUpdate={onUpdate} initialValues={initialValues} />}
    </div>
  );
};

export default FormEcocardiograma;
