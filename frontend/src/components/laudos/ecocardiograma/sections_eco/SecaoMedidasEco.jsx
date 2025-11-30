import React from 'react';

const MedidaRow = ({ label, name, value, onChange, unit='mm', refVal }) => (
    <div className="laudo-row" style={{marginBottom:'2px', fontSize:'11px'}}>
        <div style={{flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={label}>{label}</div>
        <input 
            type="number" name={name} value={value} onChange={onChange} 
            className="laudo-input" style={{width:'45px', textAlign:'right', marginRight:'3px'}} 
        />
        <span style={{color:'#555', width:'25px'}}>{unit}</span>
        {refVal && <span style={{color:'#777', fontStyle:'italic', fontSize:'9px'}}>ref:{refVal}</span>}
    </div>
);

const SecaoMedidasEco = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Medidas e Cálculos</div>
        <div className="laudo-section-body" style={{padding:'5px'}}>
            
            {/* AORTA & AE */}
            <div style={{borderBottom:'1px dashed #ccc', marginBottom:'5px', paddingBottom:'5px'}}>
                <MedidaRow label="Raiz Aórtica (calibre)" name="raizAorta" value={data.raizAorta} onChange={handleChange} refVal="21-37 mm" />
                <div style={{paddingLeft:'10px', fontSize:'10px'}}>
                     <label className="laudo-checkbox-label"><input type="checkbox" checked={!!data.aortaAsc} readOnly /> aorta ascendente</label>
                     <label className="laudo-checkbox-label" style={{marginLeft:'10px'}}><input type="checkbox" checked={!!data.arcoAorta} readOnly /> arco</label>
                </div>
                <MedidaRow label="Átrio Esquerdo" name="atrioEsq" value={data.atrioEsq} onChange={handleChange} refVal="25-40 mm" />
                <div className="laudo-row">
                    <input type="checkbox" checked={!!data.volAe} readOnly />
                    <span style={{fontSize:'10px', marginLeft:'3px'}}>Volume AE:</span>
                    <input name="volAe" value={data.volAe} onChange={handleChange} className="laudo-input" style={{width:'35px', margin:'0 3px'}}/>
                    <span style={{fontSize:'9px'}}>ml/m²</span>
                </div>
            </div>

            {/* VENTRÍCULO ESQUERDO E DIREITO */}
            <div>
                <MedidaRow label="Ventrículo Direito (eixo longo)" name="ventriculoDir" value={data.ventriculoDir} onChange={handleChange} refVal="<42" />
                <MedidaRow label="Septo Ventricular (diástole)" name="siv" value={data.siv} onChange={handleChange} refVal="F<10; M<11" />
                <MedidaRow label="Parede Posterior do VE" name="ppve" value={data.ppve} onChange={handleChange} refVal="F<10; M<11" />
                <MedidaRow label="Diâmetro Diastólico Final VE" name="ddve" value={data.ddve} onChange={handleChange} refVal="36-52" />
                <MedidaRow label="Diâmetro Sistólico Final VE" name="dsve" value={data.dsve} onChange={handleChange} refVal="26-34" />
                
                <MedidaRow label="Volume Diastólico Final VE" name="volDiast" value={data.volDiast} onChange={handleChange} unit="ml" />
                <MedidaRow label="Volume Sistólico Final VE" name="volSist" value={data.volSist} onChange={handleChange} unit="ml" />

                {/* RESULTADOS CALCULADOS */}
                <div style={{background:'#E3F2FD', padding:'4px', marginTop:'5px', borderRadius:'3px'}}>
                    <div className="laudo-row" style={{justifyContent:'space-between'}}>
                        <span style={{fontWeight:'bold', fontSize:'11px'}}>Fração de Ejeção:</span>
                        <div className="laudo-row">
                            <label style={{fontSize:'9px'}}><input type="radio" name="metodoFe" value="Teichholz" checked={data.metodoFe === 'Teichholz'} onChange={handleChange}/> Teich</label>
                            <label style={{fontSize:'9px'}}><input type="radio" name="metodoFe" value="Simpson" checked={data.metodoFe === 'Simpson'} onChange={handleChange}/> Simp</label>
                        </div>
                        <span style={{fontWeight:'bold', color:'#1565C0'}}>{data.resFe || '--'} %</span>
                    </div>
                    <div className="laudo-row" style={{justifyContent:'space-between'}}>
                         <span style={{fontSize:'10px'}}>Enc.: {data.resEncurtamento}%</span>
                         <span style={{fontSize:'10px'}}>Massa: {data.resMassaVE}g</span>
                    </div>
                    <div className="laudo-row" style={{justifyContent:'space-between', marginTop:'2px'}}>
                         <span style={{fontSize:'10px'}}>Índice Massa: {data.resImVE} g/m²</span>
                    </div>
                     <div className="laudo-row" style={{justifyContent:'space-between', marginTop:'2px', borderTop:'1px solid #BBDEFB'}}>
                         <span style={{fontSize:'10px', fontWeight:'bold'}}>Espessura Relativa (RWT):</span>
                         <span style={{fontWeight:'bold'}}>{data.resRwt}</span>
                    </div>
                </div>

                {/* VOLUMES DIREITOS (Novo do Print) */}
                <div style={{marginTop:'5px', paddingTop:'5px', borderTop:'1px solid #eee'}}>
                    <div className="laudo-row">
                         <input type="checkbox" checked={!!data.volAd} readOnly />
                         <span style={{fontSize:'10px'}}>Vol. AD:</span>
                         <input name="volAd" value={data.volAd} onChange={handleChange} className="laudo-input" style={{width:'30px', margin:'0 3px'}}/>
                         <span style={{fontSize:'9px'}}>ml/m²</span>
                    </div>
                    <div className="laudo-row">
                         <input type="checkbox" checked={!!data.volDiastVd} readOnly />
                         <span style={{fontSize:'10px'}}>Vol. Diast Final VD:</span>
                         <input name="volDiastVd" value={data.volDiastVd} onChange={handleChange} className="laudo-input" style={{width:'30px', margin:'0 3px'}}/>
                    </div>
                     <div className="laudo-row">
                         <input type="checkbox" checked={!!data.volSistVd} readOnly />
                         <span style={{fontSize:'10px'}}>Vol. Sist Final VD:</span>
                         <input name="volSistVd" value={data.volSistVd} onChange={handleChange} className="laudo-input" style={{width:'30px', margin:'0 3px'}}/>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};

export default SecaoMedidasEco;