import React, { useMemo, useState } from 'react';
import ModalTabelaVPS from './ModalTabelaVPS';

const MetricLine = ({ label, checkName, checkValue, inputName, inputValue, onChange, unit }) => (
    <div className="laudo-row" style={{marginBottom: '3px'}}>
        <input type="checkbox" name={checkName} checked={checkValue} onChange={onChange} />
        <span style={{width: '25px', display: 'inline-block'}}>{label}</span>
        <input 
            type="number" step="0.01" 
            name={inputName} value={inputValue} onChange={onChange} 
            disabled={!checkValue} 
            className="laudo-input" 
            style={{width: '50px', textAlign: 'right'}} 
        />
        {unit && <span>{unit}</span>}
    </div>
);

const SecaoDoppler = ({ data, handleChange }) => {
  const [showModalVPS, setShowModalVPS] = useState(false);

  const ipMedio = useMemo(() => {
      const dir = parseFloat(data.utDirIP);
      const esq = parseFloat(data.utEsqIP);
      if (!isNaN(dir) && !isNaN(esq)) return ((dir + esq) / 2).toFixed(2);
      if (!isNaN(dir)) return dir.toFixed(2);
      if (!isNaN(esq)) return esq.toFixed(2);
      return '';
  }, [data.utDirIP, data.utEsqIP]);

  return (
    <div className="laudo-section" style={{background: '#F2F2F2'}}>
        <div className={`header-base ${data.usarDoppler ? 'header-blue' : 'header-gray'}`}>
            <label className="laudo-checkbox-label" style={{width:'100%'}}>
                <input type="checkbox" checked={data.usarDoppler} onChange={(e) => handleChange({target: {name: 'usarDoppler', value: e.target.checked}})} />
                Doppler / Incluir Doppler
            </label>
        </div>

        {data.usarDoppler && (
            <div className="laudo-section-body">
                <div className="laudo-grid-2">
                    
                    {/* COLUNA ESQUERDA */}
                    <div className="laudo-col" style={{gap: '15px'}}>
                        <div>
                            <div className="laudo-checkbox-label" style={{fontWeight: 'bold', marginBottom: '4px'}}>
                                <input type="checkbox" name="checkUtDir" checked={data.checkUtDir} onChange={handleChange} /> Artéria uterina DIR
                            </div>
                            <div style={{paddingLeft: '5px'}}>
                                <MetricLine label="S/D" checkName="checkUtDirSD" checkValue={data.checkUtDirSD} inputName="utDirSD" inputValue={data.utDirSD} onChange={handleChange} />
                                <MetricLine label="I.R." checkName="checkUtDirIR" checkValue={data.checkUtDirIR} inputName="utDirIR" inputValue={data.utDirIR} onChange={handleChange} />
                                <div className="laudo-row">
                                    <MetricLine label="I.P." checkName="checkUtDirIP" checkValue={data.checkUtDirIP} inputName="utDirIP" inputValue={data.utDirIP} onChange={handleChange} />
                                    {ipMedio && (
                                        <div style={{background:'#E3F2FD', padding:'2px 5px', borderRadius:'2px', border:'1px solid #90CAF9', fontWeight:'bold', fontSize:'10px', color:'#1565C0'}}>
                                            I.P. médio: {ipMedio.replace('.',',')}
                                        </div>
                                    )}
                                </div>
                                <div style={{marginTop: '5px'}}>
                                    <label className="laudo-checkbox-label"><input type="checkbox" name="utDirIncisura" checked={data.utDirIncisura} onChange={handleChange} /> incisura protodiastólica presente</label>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="laudo-checkbox-label" style={{fontWeight: 'bold', marginBottom: '4px'}}>
                                <input type="checkbox" name="checkUmb" checked={data.checkUmb} onChange={handleChange} /> Artérias umbilicais
                            </div>
                            <div style={{paddingLeft: '5px'}}>
                                <MetricLine label="S/D" checkName="checkUmbSD" checkValue={data.checkUmbSD} inputName="umbSD" inputValue={data.umbSD} onChange={handleChange} />
                                <MetricLine label="I.R." checkName="checkUmbIR" checkValue={data.checkUmbIR} inputName="umbIR" inputValue={data.umbIR} onChange={handleChange} />
                                <MetricLine label="I.P." checkName="checkUmbIP" checkValue={data.checkUmbIP} inputName="umbIP" inputValue={data.umbIP} onChange={handleChange} />
                                
                                <div className="laudo-col" style={{marginTop: '5px', gap:'2px'}}>
                                    <label className="laudo-checkbox-label"><input type="checkbox" name="umbTraçadoNormal" checked={data.umbTraçadoNormal} onChange={handleChange} /> traçado normal</label>
                                    <label className="laudo-checkbox-label"><input type="checkbox" name="umbDiastoleBaixa" checked={data.umbDiastoleBaixa} onChange={handleChange} /> diástole 'baixa'</label>
                                    <label className="laudo-checkbox-label"><input type="checkbox" name="umbDiastoleZero" checked={data.umbDiastoleZero} onChange={handleChange} /> diástole 'zero'</label>
                                    <label className="laudo-checkbox-label"><input type="checkbox" name="umbDiastoleReversa" checked={data.umbDiastoleReversa} onChange={handleChange} /> diástole reversa</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA */}
                    <div className="laudo-col" style={{gap: '15px'}}>
                         <div>
                            <div className="laudo-checkbox-label" style={{fontWeight: 'bold', marginBottom: '4px'}}>
                                <input type="checkbox" name="checkUtEsq" checked={data.checkUtEsq} onChange={handleChange} /> Artéria uterina ESQ
                            </div>
                            <div style={{paddingLeft: '5px'}}>
                                <MetricLine label="S/D" checkName="checkUtEsqSD" checkValue={data.checkUtEsqSD} inputName="utEsqSD" inputValue={data.utEsqSD} onChange={handleChange} />
                                <MetricLine label="I.R." checkName="checkUtEsqIR" checkValue={data.checkUtEsqIR} inputName="utEsqIR" inputValue={data.utEsqIR} onChange={handleChange} />
                                <MetricLine label="I.P." checkName="checkUtEsqIP" checkValue={data.checkUtEsqIP} inputName="utEsqIP" inputValue={data.utEsqIP} onChange={handleChange} />
                                <div style={{marginTop: '5px'}}>
                                    <label className="laudo-checkbox-label"><input type="checkbox" name="utEsqIncisura" checked={data.utEsqIncisura} onChange={handleChange} /> incisura protodiastólica presente</label>
                                </div>
                            </div>
                        </div>

                        <div style={{position: 'relative'}}>
                            <button 
                                onClick={() => setShowModalVPS(true)} 
                                style={{position: 'absolute', top: 0, right: 0, background: '#5C6BC0', color: 'white', border: 'none', borderRadius: '2px', padding: '4px', fontSize: '10px', cursor: 'pointer', boxShadow: '1px 1px 2px rgba(0,0,0,0.2)'}}
                            >
                                Tabela VPS<br/>da ACM
                            </button>

                            <div className="laudo-checkbox-label" style={{fontWeight: 'bold', marginBottom: '4px'}}>
                                <input type="checkbox" name="checkAcm" checked={data.checkAcm} onChange={handleChange} /> Artéria cerebral média
                            </div>
                            <div style={{paddingLeft: '5px'}}>
                                <MetricLine label="PVS" checkName="checkAcmPVS" checkValue={data.checkAcmPVS} inputName="acmPVS" inputValue={data.acmPVS} onChange={handleChange} unit="cm/s" />
                                <MetricLine label="S/D" checkName="checkAcmSD" checkValue={data.checkAcmSD} inputName="acmSD" inputValue={data.acmSD} onChange={handleChange} />
                                <MetricLine label="I.R." checkName="checkAcmIR" checkValue={data.checkAcmIR} inputName="acmIR" inputValue={data.acmIR} onChange={handleChange} />
                                <MetricLine label="I.P." checkName="checkAcmIP" checkValue={data.checkAcmIP} inputName="acmIP" inputValue={data.acmIP} onChange={handleChange} />
                                <div className="laudo-col" style={{marginTop: '5px', gap:'2px'}}>
                                    <label className="laudo-checkbox-label"><input type="checkbox" name="acmTraçadoNormal" checked={data.acmTraçadoNormal} onChange={handleChange} /> traçado normal</label>
                                    <label className="laudo-checkbox-label"><input type="checkbox" name="acmDiastoleAlta" checked={data.acmDiastoleAlta} onChange={handleChange} /> diástole 'alta' (vasodilatação)</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RODAPÉ DO DOPPLER */}
                <div style={{marginTop: '15px', display: 'flex', gap: '20px', alignItems: 'flex-start'}}>
                     <div style={{flex: 1}}>
                        <div className="laudo-checkbox-label" style={{fontWeight: 'bold', marginBottom: '4px'}}>
                            <input type="checkbox" name="checkDv" checked={data.checkDv} onChange={handleChange} /> Ducto Venoso
                        </div>
                        <div style={{paddingLeft: '5px'}}>
                            <MetricLine label="I.P." checkName="checkDvIP" checkValue={data.checkDvIP} inputName="dvIP" inputValue={data.dvIP} onChange={handleChange} />
                            <div className="laudo-col" style={{marginTop: '5px', gap:'2px'}}>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="dvTraçadoNormal" checked={data.dvTraçadoNormal} onChange={handleChange} /> traçado normal</label>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="dvOndaAZero" checked={data.dvOndaAZero} onChange={handleChange} /> onda A 'zero'</label>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="dvOndaAReversa" checked={data.dvOndaAReversa} onChange={handleChange} /> onda A reversa</label>
                            </div>
                        </div>
                     </div>
                     <div style={{flex: 1}}>
                        <div style={{border: '1px solid #ccc', background: '#E0E0E0', padding: '8px', fontSize: '9px', color: '#666', marginTop: '10px', textAlign: 'justify'}}>
                            A avaliação dos parâmetros do Doppler é muitas vezes subjetiva e consiste em ato exclusivamente médico, portanto os achados do Doppler não serão referidos automaticamente na Conclusão.
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