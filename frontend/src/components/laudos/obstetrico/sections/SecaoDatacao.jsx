import React from 'react';

const SecaoDatacao = ({ data, handleChange }) => {

  // Lógica para garantir exclusividade dos Checkboxes
  const handleModeChange = (modo) => {
      // Cria eventos sintéticos para atualizar o estado corretamente
      const updates = [
          { name: 'usarDum', value: modo === 'USAR_DUM' },
          { name: 'dumDesconhecida', value: modo === 'DUM_DESCONHECIDA' },
          { name: 'naoUsarDum', value: modo === 'NAO_USAR' }
      ];

      updates.forEach(up => {
          handleChange({ target: { name: up.name, value: up.value, type: 'checkbox', checked: up.value } });
      });
  };

  return (
    <div className="laudo-section">
        {/* TÍTULO VISUAL ROXO */}
        <div className="header-base header-purple">Datação (DUM / DPP)</div>
        
        <div className="laudo-section-body">
            {/* GRUPO DUM */}
            <div style={{marginBottom: '10px'}}>
                {/* 1. Usar DUM */}
                <div className="laudo-row" style={{marginBottom: '5px'}}>
                    <input 
                        type="radio" 
                        name="modoDatacao" 
                        checked={data.usarDum} 
                        onChange={() => handleModeChange('USAR_DUM')}
                        style={{marginRight: '8px'}}
                    />
                    <span style={{fontWeight: 'bold', marginRight: '5px'}}>Usar a D.U.M.</span>
                    
                    <input 
                        type="date" 
                        name="dum" 
                        value={data.dum || ''} 
                        onChange={handleChange}
                        disabled={!data.usarDum}
                        className="laudo-input"
                    />

                    {/* Exibe IG Calculada se existir */}
                    {data.usarDum && data.igDum && (
                        <span style={{marginLeft: '10px', fontWeight: 'bold', color: '#2E7D32'}}>
                            I.G. (DUM): {data.igDum}
                        </span>
                    )}
                </div>

                {/* 2. DUM Desconhecida */}
                <div className="laudo-row" style={{marginBottom: '5px'}}>
                    <input 
                        type="radio" 
                        name="modoDatacao" 
                        checked={data.dumDesconhecida} 
                        onChange={() => handleModeChange('DUM_DESCONHECIDA')}
                        style={{marginRight: '8px'}}
                    />
                    <span>D.U.M. desconhecida</span>
                </div>

                {/* 3. Não usar DUM */}
                <div className="laudo-row" style={{marginBottom: '10px'}}>
                    <input 
                        type="radio" 
                        name="modoDatacao" 
                        checked={data.naoUsarDum} 
                        onChange={() => handleModeChange('NAO_USAR')}
                        style={{marginRight: '8px'}}
                    />
                    <span>NÃO usar a D.U.M.</span>
                </div>

                {/* Opções visuais da DUM */}
                <div style={{marginLeft: '25px', display: 'flex', gap: '15px'}}>
                    <label className="laudo-checkbox-label">
                        <input 
                            type="checkbox" 
                            name="exibirDataDum" 
                            checked={data.exibirDataDum || false} 
                            onChange={handleChange}
                            disabled={!data.usarDum}
                        />
                        exibir a data no texto
                    </label>
                    <label className="laudo-checkbox-label">
                        <input 
                            type="checkbox" 
                            name="citarDppDum" // Garanta que este nome existe no initialState se for usar
                            checked={true} // Forçado true conforme print, ou ligue ao state
                            readOnly
                        />
                        citar D.P.P. pela D.U.M.
                    </label>
                </div>
            </div>

            <hr style={{border: '0', borderTop: '1px solid #eee', margin: '5px 0 10px 0'}} />

            {/* OPÇÃO: DPP Pela Biometria */}
            <div className="laudo-row" style={{justifyContent: 'space-between', marginBottom: '10px'}}>
                <label className="laudo-checkbox-label" style={{fontWeight: 'bold'}}>
                    <input 
                        type="checkbox" 
                        name="citarDppBiometria" 
                        checked={data.citarDppBiometria || false} 
                        onChange={handleChange} 
                    />
                    citar D.P.P. pela biometria do exame atual
                </label>
                <span style={{fontWeight: 'bold', color: '#555'}}>
                    {data.dppBiometriaCalculada || ''}
                </span>
            </div>

            {/* OPÇÃO: Exame Anterior */}
            <div style={{background: '#f9f9f9', padding: '5px', borderRadius: '4px', border: '1px solid #eee'}}>
                <div className="laudo-row">
                    <label className="laudo-checkbox-label" style={{fontWeight: 'bold', color: '#4A148C'}}>
                        <input 
                            type="checkbox" 
                            name="usarExameAnterior" 
                            checked={data.usarExameAnterior || false} 
                            onChange={handleChange} 
                        />
                        Idade Gestacional Corrigida por exame anterior
                    </label>
                </div>
                
                {/* Inputs do Exame Anterior (Só habilitam se checkbox marcado) */}
                <div className="laudo-row" style={{marginTop: '5px', marginLeft: '20px', gap: '10px'}}>
                    <div>
                        <div style={{fontSize: '9px', color: '#777'}}>DATA ANTERIOR</div>
                        <input 
                            type="date" 
                            name="dataExameAnterior" 
                            value={data.dataExameAnterior || ''} 
                            onChange={handleChange}
                            disabled={!data.usarExameAnterior}
                            className="laudo-input"
                        />
                    </div>
                    <div>
                        <div style={{fontSize: '9px', color: '#777'}}>IG NAQUELA DATA</div>
                        <input 
                            type="number" 
                            name="igAnteriorSemanas" 
                            value={data.igAnteriorSemanas || ''} 
                            onChange={handleChange}
                            disabled={!data.usarExameAnterior}
                            className="laudo-input" 
                            style={{width: '30px'}}
                        /> s 
                        <input 
                            type="number" 
                            name="igAnteriorDias" 
                            value={data.igAnteriorDias || ''} 
                            onChange={handleChange}
                            disabled={!data.usarExameAnterior}
                            className="laudo-input" 
                            style={{width: '30px'}}
                        /> d
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SecaoDatacao;