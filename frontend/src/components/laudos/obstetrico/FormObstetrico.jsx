import React from 'react';
import { FaChartLine, FaUserFriends } from 'react-icons/fa';
import '../Laudos.css'; 
import GraficosObstetricos from '../GraficosObstetricos'; 

// Importação do Hook Personalizado
import { useObstetricoForm } from './hooks/useObstetricoForm';

// Importação das Seções Visuais
import SecaoSubtipo from './sections/SecaoSubtipo';
import SecaoDatacao from './sections/SecaoDatacao';
import SecaoColoDados from './sections/SecaoColoDados';
import SecaoBiometria from './sections/SecaoBiometria';
import SecaoMorfologia from './sections/SecaoMorfologia';
import SecaoAnexos from './sections/SecaoAnexos';
import SecaoDoppler from './sections/SecaoDoppler';
import SecaoIndicesGraficos from './sections/SecaoIndicesGraficos';
import SecaoConclusao from './sections/SecaoConclusao';

import SecaoDadosMaternos1Tri from './sections/SecaoDadosMaternos1Tri';
import SecaoSacoGestacional from './sections/SecaoSacoGestacional';
import SecaoEmbriao from './sections/SecaoEmbriao';

const FormObstetrico = ({ onUpdate }) => {
  // Toda a lógica complexa está aqui dentro:
  const { 
      data, 
      handleChange, 
      handleDatacaoChange,
      isGemelar, 
      toggleGemelar, 
      fetoAtivo, 
      handleTabChange,
      mostrarGraficos,
      setMostrarGraficos
  } = useObstetricoForm(onUpdate);

  const isPrimeiroTri = data.subtipo === 'OBSTETRICO_1_TRI';

  return (
    <div className="laudo-container">
      
      {/* CHECKBOX GEMELAR */}
      <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label className="laudo-checkbox-label" style={{fontWeight: 'bold', color: '#4A3B80', fontSize: '13px'}}>
              <input type="checkbox" checked={isGemelar} onChange={toggleGemelar} />
              <FaUserFriends size={16} /> GESTAÇÃO GEMELAR
          </label>
      </div>

      {/* ABAS GEMELAR */}
      {isGemelar && (
          <div className="gemelar-tabs">
              <div className={`gemelar-tab ${fetoAtivo === 1 ? 'active' : ''}`} onClick={() => handleTabChange(1)}>
                  FETO 1
              </div>
              <div className={`gemelar-tab ${fetoAtivo === 2 ? 'active' : ''}`} onClick={() => handleTabChange(2)}>
                  FETO 2
              </div>
          </div>
      )}

      {/* CONTEÚDO DO FORMULÁRIO */}
      <div style={{ opacity: isGemelar && fetoAtivo === 2 ? 0.95 : 1 }}>
          
          <SecaoSubtipo data={data} handleChange={handleChange} />
          
          <SecaoDatacao 
            data={data} 
            handleChange={handleChange} 
            handleDatacaoChange={handleDatacaoChange} 
          />
          
          {isPrimeiroTri ? (
              // --- LAYOUT 1º TRIMESTRE ---
              <>
                <SecaoDadosMaternos1Tri data={data} handleChange={handleChange} />
                <SecaoSacoGestacional data={data} handleChange={handleChange} />
                <SecaoEmbriao data={data} handleChange={handleChange} />
                <SecaoDoppler data={data} handleChange={handleChange} />
                <SecaoConclusao data={data} handleChange={handleChange} />
              </>
          ) : (
              // --- LAYOUT 2º/3º TRIMESTRE ---
              <>
                <SecaoColoDados data={data} handleChange={handleChange} />
                <SecaoBiometria data={data} handleChange={handleChange} />
                
                <div style={{ margin: '5px 0' }}>
                    <SecaoIndicesGraficos data={data} handleChange={handleChange} />
                </div>
                
                {/* Botão de Gráficos */}
                <div style={{ margin: '5px 0', border: '1px solid #ddd', padding: '5px', background: '#f9f9f9', borderRadius: '4px' }}>
                    <button onClick={() => setMostrarGraficos(!mostrarGraficos)} style={{cursor: 'pointer', border: 'none', background: 'transparent', color: '#1565C0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <FaChartLine /> {mostrarGraficos ? 'Ocultar Curvas' : 'Visualizar Curvas de Crescimento'}
                    </button>
                    {mostrarGraficos && <GraficosObstetricos igSemanas={20} peso={data.pesoEstimado} femur={data.femur} />}
                </div>

                <SecaoMorfologia data={data} handleChange={handleChange} />
                <SecaoAnexos data={data} handleChange={handleChange} />
                <SecaoDoppler data={data} handleChange={handleChange} />
                <SecaoConclusao data={data} handleChange={handleChange} />
              </>
          )}

      </div>
    </div>
  );
};

export default FormObstetrico;