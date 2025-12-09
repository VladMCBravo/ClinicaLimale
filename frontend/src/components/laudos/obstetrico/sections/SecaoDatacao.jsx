import React, { useMemo } from 'react';
import { MdDateRange, MdWarning } from 'react-icons/md';

const SecaoDatacao = ({ data, handleChange }) => {

  // --- LÓGICA DO ALERTA DE 7 DIAS ---
  const alertaDivergencia = useMemo(() => {
      // Só calcula se tivermos as duas datas e se estiver usando DUM
      if (!data.dppDum || !data.dppBiometriaCalculada || !data.usarDum) return null;

      try {
          // Helper para converter DD/MM/YYYY para Objeto Date
          const parseBR = (str) => {
              if(!str) return null;
              const [d, m, y] = str.split('/');
              return new Date(y, m - 1, d);
          };

          const d1 = parseBR(data.dppDum);
          const d2 = parseBR(data.dppBiometriaCalculada);
          
          if (!d1 || !d2) return null;

          // Diferença em dias
          const diffTime = Math.abs(d2 - d1);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays > 7) {
              return (
                  <div style={{
                      marginTop: '8px',
                      padding: '8px',
                      background: '#FFF8E1', 
                      border: '1px solid #FFECB3', 
                      color: '#F57F17',
                      borderRadius: '4px',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                  }}>
                      <MdWarning size={14} />
                      <strong>Atenção:</strong> Diferença de {diffDays} dias entre DUM e Biometria. Recomendado datar pelo USG.
                  </div>
              );
          }
      } catch (e) {
          return null;
      }
      return null;
  }, [data.dppDum, data.dppBiometriaCalculada, data.usarDum]);

  // Lógica para garantir exclusividade dos Checkboxes (Simulando Radio Buttons)
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
        <div className="header-base header-purple">
            <MdDateRange size={14} style={{marginRight:'5px'}}/> Datação (DUM / DPP)
        </div>
        
        <div className="laudo-section-body">
            {/* GRUPO DUM */}
            <div style={{marginBottom: '10px'}}>
                {/* 1. Usar DUM */}
                <div className="laudo-row" style={{marginBottom: '5px', alignItems:'center'}}>
                    <input 
                        type="radio" 
                        name="modoDatacao" 
                        checked={!!data.usarDum} 
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
                        checked={!!data.dumDesconhecida} 
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
                        checked={!!data.naoUsarDum} 
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
                            checked={!!data.exibirDataDum} 
                            onChange={handleChange}
                            disabled={!data.usarDum}
                        />
                        exibir a data no texto
                    </label>
                    <label className="laudo-checkbox-label">
                        <input 
                            type="checkbox" 
                            name="citarDppDum"
                            checked={!!data.citarDppDum} 
                            onChange={handleChange}
                            disabled={!data.usarDum}
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
                        checked={!!data.citarDppBiometria} 
                        onChange={handleChange} 
                    />
                    citar D.P.P. pela biometria do exame atual
                </label>
                <span style={{fontWeight: 'bold', color: '#555', background:'#f0f0f0', padding:'2px 5px', borderRadius:'3px'}}>
                    {data.dppBiometriaCalculada || '---'}
                </span>
            </div>

            {/* ALERTA VISUAL (Diferença > 7 dias) */}
            {alertaDivergencia}

            {/* OPÇÃO: Exame Anterior */}
            <div style={{background: '#f9f9f9', padding: '8px', borderRadius: '4px', border: '1px solid #eee', marginTop:'10px'}}>
                <div className="laudo-row">
                    <label className="laudo-checkbox-label" style={{fontWeight: 'bold', color: '#4A148C'}}>
                        <input 
                            type="checkbox" 
                            name="usarExameAnterior" 
                            checked={!!data.usarExameAnterior} 
                            onChange={handleChange} 
                        />
                        Idade Gestacional Corrigida por exame anterior
                    </label>
                </div>
                
                {/* Inputs do Exame Anterior (Só habilitam se checkbox marcado) */}
                <div className="laudo-row" style={{marginTop: '5px', marginLeft: '20px', gap: '10px', alignItems:'flex-end'}}>
                    <div>
                        <div style={{fontSize: '9px', color: '#777', marginBottom:'2px'}}>DATA ANTERIOR</div>
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
                        <div style={{fontSize: '9px', color: '#777', marginBottom:'2px'}}>IG NAQUELA DATA</div>
                        <input 
                            type="number" 
                            name="igAnteriorSemanas" 
                            value={data.igAnteriorSemanas || ''} 
                            onChange={handleChange}
                            disabled={!data.usarExameAnterior}
                            className="laudo-input" 
                            style={{width: '35px'}}
                            placeholder="sem"
                        /> s 
                        <input 
                            type="number" 
                            name="igAnteriorDias" 
                            value={data.igAnteriorDias || ''} 
                            onChange={handleChange}
                            disabled={!data.usarExameAnterior}
                            className="laudo-input" 
                            style={{width: '35px'}}
                            placeholder="dias"
                        /> d
                    </div>
                    {/* Display da IG Corrigida Calculada */}
                    {data.usarExameAnterior && data.igIgCorrigidaCalculada && (
                        <div style={{marginLeft:'auto', fontWeight:'bold', color:'#4A148C', fontSize:'11px'}}>
                            IG Atual Corrigida: {data.igIgCorrigidaCalculada}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default SecaoDatacao;