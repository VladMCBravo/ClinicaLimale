import React from 'react';

// Helper usando CSS GRID para alinhamento
const MedidaGridRow = ({ label, name, value, onChange, unit='mm', refVal }) => (
    <div style={{
        display: 'grid', 
        gridTemplateColumns: '1fr 60px 30px', 
        gap: '5px', 
        alignItems: 'center', 
        marginBottom: '4px',
        borderBottom: '1px dotted #f0f0f0'
    }}>
        <div style={{fontSize:'11px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={label}>
            {label} 
            {refVal && <span style={{color:'#888', fontStyle:'italic', fontSize:'9px', marginLeft:'4px'}}>({refVal})</span>}
        </div>
        <input 
            type="number" name={name} value={value} onChange={onChange} 
            className="laudo-input" style={{width:'100%', textAlign:'right'}} 
        />
        <span style={{color:'#555', fontSize:'10px'}}>{unit}</span>
    </div>
);

const SecaoMedidasEco = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Medidas e Cálculos</div>
        <div className="laudo-section-body" style={{padding:'5px'}}>
            
            {/* GRUPO AORTA / AE */}
            <div style={{background:'#f9f9f9', padding:'5px', borderRadius:'4px', marginBottom:'5px'}}>
                <MedidaGridRow label="Raiz Aórtica" name="raizAorta" value={data.raizAorta} onChange={handleChange} refVal="21-37" />
                <MedidaGridRow label="Átrio Esquerdo" name="atrioEsq" value={data.atrioEsq} onChange={handleChange} refVal="25-40" />
                <MedidaGridRow label="Vol. Átrio Esq." name="volAe" value={data.volAe} onChange={handleChange} unit="ml/m²" />
                
                <div style={{display:'flex', gap:'10px', fontSize:'10px', marginTop:'2px', color:'#555'}}>
                     <label><input type="checkbox" checked={!!data.aortaAsc} readOnly /> Ao. Ascendente</label>
                     <label><input type="checkbox" checked={!!data.arcoAorta} readOnly /> Arco</label>
                </div>
            </div>

            {/* GRUPO VENTRÍCULOS */}
            <div>
                <MedidaGridRow label="Ventrículo Direito" name="ventriculoDir" value={data.ventriculoDir} onChange={handleChange} refVal="<42" />
                <MedidaGridRow label="Septo Interventricular" name="siv" value={data.siv} onChange={handleChange} refVal="F<10; M<11" />
                <MedidaGridRow label="Parede Posterior VE" name="ppve" value={data.ppve} onChange={handleChange} refVal="F<10; M<11" />
                <MedidaGridRow label="Diâm. Diastólico VE" name="ddve" value={data.ddve} onChange={handleChange} refVal="36-52" />
                <MedidaGridRow label="Diâm. Sistólico VE" name="dsve" value={data.dsve} onChange={handleChange} refVal="26-34" />
                
                <MedidaGridRow label="Vol. Diastólico VE" name="volDiast" value={data.volDiast} onChange={handleChange} unit="ml" />
                <MedidaGridRow label="Vol. Sistólico VE" name="volSist" value={data.volSist} onChange={handleChange} unit="ml" />

                {/* RESULTADOS EM DESTAQUE */}
                <div style={{background:'#E3F2FD', padding:'6px', marginTop:'5px', borderRadius:'3px', border:'1px solid #BBDEFB'}}>
                    <div className="laudo-row" style={{justifyContent:'space-between', marginBottom:'3px'}}>
                        <span style={{fontWeight:'bold', fontSize:'11px'}}>Fração de Ejeção:</span>
                        <div className="laudo-row">
                            <label style={{fontSize:'9px'}}><input type="radio" name="metodoFe" value="Teichholz" checked={data.metodoFe === 'Teichholz'} onChange={handleChange}/> Teich</label>
                            <label style={{fontSize:'9px'}}><input type="radio" name="metodoFe" value="Simpson" checked={data.metodoFe === 'Simpson'} onChange={handleChange}/> Simp</label>
                        </div>
                        <span style={{fontWeight:'bold', color:'#1565C0', fontSize:'12px'}}>{data.resFe || '--'} %</span>
                    </div>
                    
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px', fontSize:'10px'}}>
                         <div>Enc: <b>{data.resEncurtamento}%</b></div>
                         <div>Massa: <b>{data.resMassaVE}g</b></div>
                         <div>Índice: <b>{data.resImVE}</b></div>
                         <div>RWT: <b>{data.resRwt}</b></div>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};

export default SecaoMedidasEco;