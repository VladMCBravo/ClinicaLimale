import React, { useMemo } from 'react';
import { MdDateRange, MdWarning } from 'react-icons/md';
import { FaCalendarAlt, FaCalculator, FaHistory, FaCommentMedical} from 'react-icons/fa';

const SecaoDatacao = ({ data, handleChange }) => {

  // --- LÓGICA DO ALERTA (MANTIDA) ---
  const alertaDivergencia = useMemo(() => {
      if (!data.dppDum || !data.dppBiometriaCalculada || !data.usarDum) return null;
      try {
          const parseBR = (str) => {
              if(!str) return null;
              const [d, m, y] = str.split('/');
              return new Date(y, m - 1, d);
          };
          const d1 = parseBR(data.dppDum);
          const d2 = parseBR(data.dppBiometriaCalculada);
          if (!d1 || !d2) return null;
          const diffTime = Math.abs(d2 - d1);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays > 7) {
              return (
                  <div style={{marginTop: '5px', padding: '6px', background: '#FFF8E1', border: '1px solid #FFECB3', color: '#F57F17', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                      <MdWarning size={14} />
                      <strong>Atenção:</strong> Diferença de {diffDays} dias entre DUM e Biometria.
                  </div>
              );
          }
      } catch (e) { return null; }
      return null;
  }, [data.dppDum, data.dppBiometriaCalculada, data.usarDum]);

  const handleModeChange = (modo) => {
      const updates = [
          { name: 'usarDum', value: modo === 'USAR_DUM' },
          { name: 'dumDesconhecida', value: modo === 'DUM_DESCONHECIDA' },
          { name: 'naoUsarDum', value: modo === 'NAO_USAR' }
      ];
      updates.forEach(up => handleChange({ target: { name: up.name, value: up.value, type: 'checkbox', checked: up.value } }));
  };

  return (
    <div className="laudo-section">
        <div className="header-base header-purple">
            <MdDateRange size={14} style={{marginRight:'5px'}}/> Datação e Cronologia
        </div>
        
        <div className="laudo-section-body">
            
            {/* BLOCO 1: DUM PRINCIPAL (Card Azul) */}
            <div style={{background:'#E3F2FD', padding:'8px', borderRadius:'4px', border:'1px solid #BBDEFB'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px'}}>
                    <div style={{display:'flex', gap:'15px'}}>
                        <label className="laudo-checkbox-label" style={{fontWeight:'bold', color:'#0D47A1'}}>
                            <input type="radio" name="modoDatacao" checked={!!data.usarDum} onChange={() => handleModeChange('USAR_DUM')} />
                            Usar DUM
                        </label>
                        <label className="laudo-checkbox-label">
                            <input type="radio" name="modoDatacao" checked={!!data.dumDesconhecida} onChange={() => handleModeChange('DUM_DESCONHECIDA')} />
                            Desconhecida
                        </label>
                        <label className="laudo-checkbox-label">
                            <input type="radio" name="modoDatacao" checked={!!data.naoUsarDum} onChange={() => handleModeChange('NAO_USAR')} />
                            Não usar
                        </label>
                    </div>
                    
                    {/* Opções de Exibição */}
                    <div style={{display:'flex', gap:'10px', fontSize:'10px'}}>
                        <label className="laudo-checkbox-label"><input type="checkbox" name="exibirDataDum" checked={!!data.exibirDataDum} onChange={handleChange} disabled={!data.usarDum} /> exibir data</label>
                        <label className="laudo-checkbox-label"><input type="checkbox" name="citarDppDum" checked={!!data.citarDppDum} onChange={handleChange} disabled={!data.usarDum} /> citar DPP</label>
                    </div>
                </div>

                {/* Linha de Inputs DUM */}
                <div className="laudo-row" style={{opacity: data.usarDum ? 1 : 0.5}}>
                    <div style={{display:'flex', alignItems:'center', gap:'5px', background:'#fff', padding:'2px 5px', borderRadius:'3px', border:'1px solid #90CAF9'}}>
                        <FaCalendarAlt color="#1565C0" />
                        <input type="date" name="dum" value={data.dum || ''} onChange={handleChange} disabled={!data.usarDum} className="laudo-input" style={{border:'none', height:'20px'}}/>
                    </div>

                    {data.usarDum && data.igDum && (
                        <div style={{display:'flex', gap:'15px', marginLeft:'10px', fontWeight:'bold', color:'#0D47A1', fontSize:'11px'}}>
                            <span>IG: {data.igDum}</span>
                            <span>DPP: {data.dppDum}</span>
                        </div>
                    )}
                </div>
                
                {/* Alerta integrado aqui */}
                {alertaDivergencia}
            </div>

            {/* BLOCO 2: COMPARATIVO E ANTERIOR (Lado a Lado) */}
            <div className="laudo-grid-2" style={{marginTop:'10px', alignItems:'start'}}>
                
                {/* Coluna Esquerda: Biometria Atual */}
                <div style={{background:'#F5F5F5', padding:'6px', borderRadius:'4px', border:'1px solid #ddd'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'4px', color:'#555', fontWeight:'bold', fontSize:'10px'}}>
                        <FaCalculator /> BIOMETRIA ATUAL
                    </div>
                    <div className="laudo-row" style={{justifyContent:'space-between', fontSize:'11px'}}>
                        <span>IG: <strong>{data.igBiometria || '--'}</strong></span>
                        <span>DPP: <strong>{data.dppBiometriaCalculada || '--'}</strong></span>
                    </div>
                    <div style={{marginTop:'4px', borderTop:'1px solid #e0e0e0', paddingTop:'2px'}}>
                        <label className="laudo-checkbox-label" style={{fontWeight:'bold', color:'#2E7D32', fontSize:'10px'}}>
                            <input type="checkbox" name="citarDppBiometria" checked={!!data.citarDppBiometria} onChange={handleChange} />
                            Usar esta data no laudo
                        </label>
                    </div>
                </div>

                {/* Coluna Direita: Exame Anterior */}
                <div style={{background:'#F3E5F5', padding:'6px', borderRadius:'4px', border:'1px solid #E1BEE7'}}>
                    <label className="laudo-checkbox-label" style={{fontWeight:'bold', color:'#4A148C', fontSize:'10px', marginBottom:'4px'}}>
                        <input type="checkbox" name="usarExameAnterior" checked={!!data.usarExameAnterior} onChange={handleChange} />
                        <FaHistory style={{marginRight:'4px'}}/> USG ANTERIOR
                    </label>
                    
                    <div className="laudo-row" style={{gap:'5px', opacity: data.usarExameAnterior ? 1 : 0.6}}>
                        <input type="date" name="dataExameAnterior" value={data.dataExameAnterior || ''} onChange={handleChange} disabled={!data.usarExameAnterior} className="laudo-input" style={{width:'85px', fontSize:'10px'}}/>
                        
                        {/* AQUI ESTÁ A CORREÇÃO VISUAL DOS INPUTS */}
                        <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                            <input 
                                type="number" 
                                name="igAnteriorSemanas" 
                                value={data.igAnteriorSemanas || ''} 
                                onChange={handleChange} 
                                disabled={!data.usarExameAnterior} 
                                className="laudo-input laudo-input-small" 
                                style={{width:'45px', height:'26px', textAlign:'center'}} 
                                placeholder="sem"
                            />
                            <span style={{fontSize:'10px'}}>s</span>

                            <input 
                                type="number" 
                                name="igAnteriorDias" 
                                value={data.igAnteriorDias || ''} 
                                onChange={handleChange} 
                                disabled={!data.usarExameAnterior} 
                                className="laudo-input laudo-input-small" 
                                style={{width:'45px', height:'26px', textAlign:'center'}} 
                                placeholder="d"
                            />
                            <span style={{fontSize:'10px'}}>d</span>
                        </div>
                    </div>
                    {data.usarExameAnterior && data.igIgCorrigidaCalculada && (
                        <div style={{marginTop:'2px', textAlign:'right', fontSize:'10px', color:'#4A148C', fontWeight:'bold'}}>
                            IG Corrigida: {data.igIgCorrigidaCalculada}
                        </div>
                    )}
                </div>

            </div>
        </div>
        {/* CAMPO DE OBSERVAÇÃO PADRONIZADO (Inserir antes de fechar a laudo-section) */}
                     <div style={{
                         borderTop: '1px solid #eee', 
                         padding: '10px 12px', // Espaçamento interno para não colar na borda
                         background: '#FAFAFA', 
                         borderBottomLeftRadius: '4px',
                         borderBottomRightRadius: '4px'
                     }}>
                        <div style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px'}}>
                            <FaCommentMedical color="#555"/>
                            <span style={{fontWeight:'bold', fontSize:'11px', color:'#333'}}>Nota Médica (Datação e Cronologia):</span>
                        </div>
                        <textarea 
                            name="obsDatacao" 
                            value={data.obsDatacao || ''} 
                            onChange={handleChange} 
                            className="laudo-textarea"
                            rows="2"
                            style={{
                                width:'100%', 
                                fontSize:'11px', 
                                border:'1px solid #ccc', 
                                borderRadius: '4px', // Bordas arredondadas no campo
                                padding: '8px', // Espaço interno do texto
                                boxSizing: 'border-box' // Garante que não vaze a largura
                            }}
                            placeholder="Digite aqui observações específicas sobre a datação e cronologia..."
                        />
                    </div>
    </div>
);
};

export default SecaoDatacao;