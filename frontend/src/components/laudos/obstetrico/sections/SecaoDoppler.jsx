import React, { useEffect, useState } from 'react';
import ModalTabelaVPS from './ModalTabelaVPS';

// Componente de Linha de Métrica (Reutilizável)
const MetricLine = ({ label, checkName, checkValue, inputName, inputValue, onChange, unit }) => (
    <div className="laudo-row" style={{marginBottom: '3px'}}>
        <input 
            type="checkbox" 
            name={checkName} 
            checked={!!checkValue} 
            onChange={onChange} 
            title="Incluir no laudo"
        />
        <span style={{width: '30px', display: 'inline-block', fontSize:'11px', fontWeight:'bold'}}>{label}</span>
        <input 
            type="number" step="0.01" 
            name={inputName} 
            value={inputValue} 
            onChange={onChange} 
            disabled={!checkValue} 
            className="laudo-input" 
            style={{width: '60px', textAlign: 'right'}} 
            placeholder="0.00"
        />
        {unit && <span style={{fontSize:'10px', color:'#666', marginLeft:'2px'}}>{unit}</span>}
    </div>
);

const SecaoDoppler = ({ data, handleChange }) => {
  const [showModalVPS, setShowModalVPS] = useState(false);

  // --- CÁLCULOS AUTOMÁTICOS ---
  useEffect(() => {
      let updates = {};
      let hasUpdates = false;

      // 1. IP Médio das Uterinas
      const utDir = parseFloat(data.utDirIP);
      const utEsq = parseFloat(data.utEsqIP);
      let novoIpMedio = '';
      
      if (!isNaN(utDir) && !isNaN(utEsq)) novoIpMedio = ((utDir + utEsq) / 2).toFixed(2).replace('.', ',');
      else if (!isNaN(utDir)) novoIpMedio = utDir.toFixed(2).replace('.', ',');
      else if (!isNaN(utEsq)) novoIpMedio = utEsq.toFixed(2).replace('.', ',');

      if (novoIpMedio !== data.ipMedioUterinas) {
          updates.ipMedioUterinas = novoIpMedio;
          hasUpdates = true;
      }

      // 2. Relação Cérebro/Umbilical (CPR = ACM IP / Umb IP)
      // O cliente pede: "n/l maior / igual à 1,0"
      const acm = parseFloat(data.acmIP);
      const umb = parseFloat(data.umbIP);
      let novaRelacao = '';

      if (!isNaN(acm) && !isNaN(umb) && umb > 0) {
          novaRelacao = (acm / umb).toFixed(2).replace('.', ',');
      }

      if (novaRelacao !== data.relacaoCerebroUmbilical) {
          updates.relacaoCerebroUmbilical = novaRelacao;
          hasUpdates = true;
      }

      // Aplica atualizações se houver mudança
      if (hasUpdates) {
          // Precisamos iterar para simular eventos de change para cada campo calculado
          Object.keys(updates).forEach(key => {
              handleChange({ target: { name: key, value: updates[key] } });
          });
      }
  }, [data.utDirIP, data.utEsqIP, data.acmIP, data.umbIP, data.ipMedioUterinas, data.relacaoCerebroUmbilical, handleChange]);


  return (
    <div className="laudo-section" style={{background: '#F2F2F2', border:'1px solid #ddd'}}>
        {/* Cabeçalho com Checkbox Principal */}
        <div className={`header-base ${data.usarDoppler ? 'header-blue' : 'header-gray'}`} style={{transition: '0.3s'}}>
            <label className="laudo-checkbox-label" style={{width:'100%', cursor:'pointer'}}>
                <input 
                    type="checkbox" 
                    checked={!!data.usarDoppler} 
                    onChange={(e) => handleChange({target: {name: 'usarDoppler', value: e.target.checked}})} 
                />
                <span style={{marginLeft:'5px'}}>Estudo Dopplerfluxométrico</span>
            </label>
        </div>

        {data.usarDoppler && (
            <div className="laudo-section-body">
                <div className="laudo-grid-2" style={{alignItems:'start', gap:'20px'}}>
                    
                    {/* COLUNA ESQUERDA: Uterinas e Umbilicais */}
                    <div className="laudo-col" style={{gap: '15px'}}>
                        
                        {/* Uterina Direita */}
                        <div className="doppler-group">
                            <div className="doppler-title">
                                <input type="checkbox" name="checkUtDir" checked={!!data.checkUtDir} onChange={handleChange} /> 
                                Artéria Uterina Direita
                            </div>
                            <div style={{paddingLeft: '10px'}}>
                                <MetricLine label="IP" checkName="checkUtDirIP" checkValue={data.checkUtDirIP} inputName="utDirIP" inputValue={data.utDirIP} onChange={handleChange} />
                                <MetricLine label="IR" checkName="checkUtDirIR" checkValue={data.checkUtDirIR} inputName="utDirIR" inputValue={data.utDirIR} onChange={handleChange} />
                                <div style={{marginTop: '3px'}}>
                                    <label className="laudo-checkbox-label" style={{fontSize:'10px'}}>
                                        <input type="checkbox" name="utDirIncisura" checked={!!data.utDirIncisura} onChange={handleChange} /> 
                                        Incisura protodiastólica
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Umbilicais */}
                        <div className="doppler-group">
                            <div className="doppler-title">
                                <input type="checkbox" name="checkUmb" checked={!!data.checkUmb} onChange={handleChange} /> 
                                Artérias Umbilicais
                            </div>
                            <div style={{paddingLeft: '10px'}}>
                                <MetricLine label="IP" checkName="checkUmbIP" checkValue={data.checkUmbIP} inputName="umbIP" inputValue={data.umbIP} onChange={handleChange} />
                                <MetricLine label="IR" checkName="checkUmbIR" checkValue={data.checkUmbIR} inputName="umbIR" inputValue={data.umbIR} onChange={handleChange} />
                                <MetricLine label="S/D" checkName="checkUmbSD" checkValue={data.checkUmbSD} inputName="umbSD" inputValue={data.umbSD} onChange={handleChange} />
                                
                                <div className="laudo-col" style={{marginTop: '5px', gap:'2px', fontSize:'11px'}}>
                                    <label><input type="checkbox" name="umbTraçadoNormal" checked={!!data.umbTraçadoNormal} onChange={handleChange} /> Traçado normal</label>
                                    <label style={{color:'#D32F2F'}}><input type="checkbox" name="umbDiastoleZero" checked={!!data.umbDiastoleZero} onChange={handleChange} /> Diástole Zero</label>
                                    <label style={{color:'#D32F2F'}}><input type="checkbox" name="umbDiastoleReversa" checked={!!data.umbDiastoleReversa} onChange={handleChange} /> Diástole Reversa</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA: Uterina Esq e ACM */}
                    <div className="laudo-col" style={{gap: '15px'}}>
                         
                         {/* Uterina Esquerda */}
                         <div className="doppler-group">
                            <div className="doppler-title">
                                <input type="checkbox" name="checkUtEsq" checked={!!data.checkUtEsq} onChange={handleChange} /> 
                                Artéria Uterina Esquerda
                            </div>
                            <div style={{paddingLeft: '10px'}}>
                                <MetricLine label="IP" checkName="checkUtEsqIP" checkValue={data.checkUtEsqIP} inputName="utEsqIP" inputValue={data.utEsqIP} onChange={handleChange} />
                                <MetricLine label="IR" checkName="checkUtEsqIR" checkValue={data.checkUtEsqIR} inputName="utEsqIR" inputValue={data.utEsqIR} onChange={handleChange} />
                                <div style={{marginTop: '3px'}}>
                                    <label className="laudo-checkbox-label" style={{fontSize:'10px'}}>
                                        <input type="checkbox" name="utEsqIncisura" checked={!!data.utEsqIncisura} onChange={handleChange} /> 
                                        Incisura protodiastólica
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* RESULTADO IP MÉDIO (Display) */}
                        {data.ipMedioUterinas && (
                            <div style={{background:'#E3F2FD', padding:'5px', borderRadius:'4px', border:'1px solid #90CAF9', textAlign:'center', marginTop:'-10px', marginBottom:'10px'}}>
                                <span style={{fontSize:'11px', color:'#1565C0', fontWeight:'bold'}}>
                                    IP Médio Uterinas: {data.ipMedioUterinas}
                                </span>
                            </div>
                        )}

                        {/* ACM */}
                        <div className="doppler-group" style={{position: 'relative'}}>
                            <button 
                                onClick={() => setShowModalVPS(true)} 
                                style={{position: 'absolute', top: 0, right: 0, background: '#3F51B5', color: 'white', border: 'none', borderRadius: '3px', padding: '2px 6px', fontSize: '9px', cursor: 'pointer'}}
                                title="Abrir Tabela de Velocidade"
                            >
                                Tabela VPS
                            </button>

                            <div className="doppler-title">
                                <input type="checkbox" name="checkAcm" checked={!!data.checkAcm} onChange={handleChange} /> 
                                Artéria Cerebral Média
                            </div>
                            <div style={{paddingLeft: '10px'}}>
                                <MetricLine label="PVS" checkName="checkAcmPVS" checkValue={data.checkAcmPVS} inputName="acmPVS" inputValue={data.acmPVS} onChange={handleChange} unit="cm/s" />
                                <MetricLine label="IP" checkName="checkAcmIP" checkValue={data.checkAcmIP} inputName="acmIP" inputValue={data.acmIP} onChange={handleChange} />
                                
                                <div className="laudo-col" style={{marginTop: '5px', gap:'2px', fontSize:'11px'}}>
                                    <label><input type="checkbox" name="acmTraçadoNormal" checked={!!data.acmTraçadoNormal} onChange={handleChange} /> Traçado normal</label>
                                    <label style={{color:'#D32F2F'}}><input type="checkbox" name="acmDiastoleAlta" checked={!!data.acmDiastoleAlta} onChange={handleChange} /> Vasodilatação (Centralização)</label>
                                </div>
                            </div>
                        </div>

                        {/* RELAÇÃO CÉREBRO/UMBILICAL (Display) */}
                        {data.relacaoCerebroUmbilical && (
                            <div style={{background: parseFloat(data.relacaoCerebroUmbilical.replace(',','.')) < 1 ? '#FFEBEE' : '#E8F5E9', padding:'5px', borderRadius:'4px', border:'1px solid #ccc', textAlign:'center'}}>
                                <span style={{fontSize:'11px', fontWeight:'bold', color:'#333'}}>
                                    Relação Cérebro/Umbilical: {data.relacaoCerebroUmbilical}
                                </span>
                                <div style={{fontSize:'9px', color:'#666'}}>Normal &ge; 1,0</div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Ducto Venoso e Aviso */}
                <div style={{marginTop: '15px', display: 'flex', gap: '20px', alignItems: 'flex-start', borderTop:'1px solid #ddd', paddingTop:'10px'}}>
                     <div style={{flex: 1}}>
                        <div className="doppler-title">
                            <input type="checkbox" name="checkDv" checked={!!data.checkDv} onChange={handleChange} /> 
                            Ducto Venoso
                        </div>
                        <div style={{paddingLeft: '10px'}}>
                            <MetricLine label="IP" checkName="checkDvIP" checkValue={data.checkDvIP} inputName="dvIP" inputValue={data.dvIP} onChange={handleChange} />
                            <div className="laudo-col" style={{marginTop: '5px', gap:'2px', fontSize:'11px'}}>
                                <label><input type="checkbox" name="dvTraçadoNormal" checked={!!data.dvTraçadoNormal} onChange={handleChange} /> Traçado normal</label>
                                <label style={{color:'#D32F2F'}}><input type="checkbox" name="dvOndaAZero" checked={!!data.dvOndaAZero} onChange={handleChange} /> Onda A Zero</label>
                                <label style={{color:'#D32F2F'}}><input type="checkbox" name="dvOndaAReversa" checked={!!data.dvOndaAReversa} onChange={handleChange} /> Onda A Reversa</label>
                            </div>
                        </div>
                     </div>
                     <div style={{flex: 1}}>
                        <div style={{background: '#ECEFF1', padding: '8px', fontSize: '10px', color: '#546E7A', borderRadius:'4px', fontStyle:'italic'}}>
                            Nota: Os valores de referência e cálculos (IP Médio, Rel C/U) são auxiliares. A interpretação final cabe ao médico examinador.
                        </div>
                     </div>
                </div>
            </div>
        )}
        {showModalVPS && <ModalTabelaVPS onClose={() => setShowModalVPS(false)} />}
    </div>
  );
};

export default SecaoDoppler;