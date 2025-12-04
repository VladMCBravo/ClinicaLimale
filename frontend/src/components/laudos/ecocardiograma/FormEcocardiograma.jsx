// src/components/laudos/ecocardiograma/FormEcocardiograma.jsx
import React from 'react';
// Ícones: Usando SVG nativo para evitar dependências externas (como lucide-react) que podem quebrar o build
import '../Laudos.css'; 

// Importação do Hook Customizado
// ATENÇÃO: Certifique-se de que o arquivo 'useEcoForm.js' está na pasta '/hooks' dentro de 'ecocardiograma'
import useEcoForm from './hooks/useEcoForm';

// Importação das Seções
// ATENÇÃO: Certifique-se de que todos estes arquivos estão na pasta '/sections_eco' dentro de 'ecocardiograma'
import SecaoTecnicaEco from './sections_eco/SecaoTecnicaEco';
import SecaoMedidasEco from './sections_eco/SecaoMedidasEco';
import SecaoRitmoCamaras from './sections_eco/SecaoRitmoCamaras';
import SecaoEspessura from './sections_eco/SecaoEspessura';
import SecaoValvaMitral from './sections_eco/SecaoValvaMitral';
import SecaoValvaTricuspide from './sections_eco/SecaoValvaTricuspide';
import SecaoValvaPulmonar from './sections_eco/SecaoValvaPulmonar';
import SecaoFuncaoVentricular from './sections_eco/SecaoFuncaoVentricular';
import SecaoAortaVenaCava from './sections_eco/SecaoAortaVenaCava';
import SecaoPericardio from './sections_eco/SecaoPericardio';
import SecaoStrain from './sections_eco/SecaoStrain'; 

const FormEcocardiograma = ({ onUpdate }) => {
  const { data, handleChange } = useEcoForm(onUpdate);

  return (
    <div className="laudo-container">
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px', paddingBottom:'10px', borderBottom:'1px solid #ccc' }}>
             {/* Ícone SVG Nativo */}
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.28 3.6-2.34 4.58-2.74a.92.92 0 0 0 .17-.06.92.92 0 0 0-.17-1.78c-2.4-.6-5.83-.24-8.58 2.06" />
                <path d="M5 14c-1.49-1.28-3.6-2.34-4.58-2.74a.92.92 0 0 1-.17-.06.92.92 0 0 1 .17-1.78c2.4-.6 5.83-.24 8.58 2.06" />
                <path d="M12 4.5v15" />
                <path d="M9.5 7.5a2.5 2.5 0 0 1 5 0" />
             </svg>
             
             <span style={{fontWeight:'bold', color:'#333'}}>CONFIGURAÇÃO DO EXAME:</span>
             <select 
                name="subtipo" 
                value={data.subtipo} 
                onChange={handleChange} 
                className="laudo-select" 
                style={{flex:1, fontWeight:'bold', fontSize:'14px', border:'1px solid #1565C0', color:'#1565C0'}}
             >
                 <option value="ECO_TRANSTORACICO">Ecocardiograma Transtorácico</option>
                 <option value="ECO_DOPPLER">Ecocardiograma Transtorácico com Doppler Colorido</option>
                 <option value="ECO_STRAIN">Eco com Strain</option>
             </select>
        </div>

        <div style={{display:'flex', gap:'10px', alignItems:'flex-start'}}>
            <div style={{flex: '1', minWidth: '350px'}}>
                <SecaoTecnicaEco data={data} handleChange={handleChange} />
                <SecaoMedidasEco data={data} handleChange={handleChange} />
                <SecaoRitmoCamaras data={data} handleChange={handleChange} />
                <SecaoEspessura data={data} handleChange={handleChange} />
                <SecaoFuncaoVentricular data={data} handleChange={handleChange} />
            </div>

            <div style={{flex: '1', minWidth: '350px'}}>
                {data.subtipo === 'ECO_STRAIN' && (
                    <SecaoStrain data={data} handleChange={handleChange} />
                )}
                <SecaoValvaMitral data={data} handleChange={handleChange} />
                <SecaoValvaTricuspide data={data} handleChange={handleChange} />
                <SecaoValvaPulmonar data={data} handleChange={handleChange} />
                <SecaoAortaVenaCava data={data} handleChange={handleChange} />
                <SecaoPericardio data={data} handleChange={handleChange} />
            </div>
        </div>
    </div>
  );
};

export default FormEcocardiograma;