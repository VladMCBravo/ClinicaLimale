import React from 'react';
// As classes vêm do ../Laudos.css importado no Pai

const BiometriaRow = ({ label, name, value, onChange, checkName, checkValue }) => (
    <div className="laudo-row" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {checkName && <input type="checkbox" name={checkName} checked={checkValue} onChange={onChange} />}
            <span style={{ fontWeight: 'bold', color: '#1565C0' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <input 
                name={name} 
                value={value} 
                onChange={onChange} 
                className="laudo-input laudo-input-small" 
            />
            <span style={{ color: '#777', fontSize: '9px' }}>mm</span>
        </div>
    </div>
);

const SecaoBiometria = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-green">Biometria fetal</div>
        <div className="laudo-section-body">
            <div className="laudo-grid-3">
                
                {/* Coluna 1: Principais */}
                <div className="laudo-col">
                    <BiometriaRow label="DBP" name="dbp" value={data.dbp} onChange={handleChange} checkName="incDbp" checkValue={data.incDbp} />
                    <BiometriaRow label="DOF" name="dof" value={data.dof} onChange={handleChange} checkName="incDof" checkValue={data.incDof} />
                    <BiometriaRow label="CC" name="cc" value={data.cc} onChange={handleChange} checkName="incCc" checkValue={data.incCc} />
                    <BiometriaRow label="CA" name="ca" value={data.ca} onChange={handleChange} checkName="incCa" checkValue={data.incCa} />
                    <BiometriaRow label="Fêmur" name="femur" value={data.femur} onChange={handleChange} checkName="incFemur" checkValue={data.incFemur} />
                    <BiometriaRow label="Úmero" name="umero" value={data.umero} onChange={handleChange} />
                </div>

                {/* Coluna 2: Ossos Longos */}
                <div className="laudo-col">
                    <BiometriaRow label="Ulna" name="ulna" value={data.ulna} onChange={handleChange} />
                    <BiometriaRow label="Tíbia" name="tibia" value={data.tibia} onChange={handleChange} />
                    <BiometriaRow label="Rádio" name="radio" value={data.radio} onChange={handleChange} />
                    <BiometriaRow label="Fíbula" name="fibula" value={data.fibula} onChange={handleChange} />
                    <BiometriaRow label="Comp. pé" name="pe" value={data.pe} onChange={handleChange} />
                    
                    <div style={{ height: '1px', background: '#eee', margin: '5px 0' }} />
                    
                    <BiometriaRow label="D. Binocular" name="diametroBinocular" value={data.diametroBinocular} onChange={handleChange} />
                    <BiometriaRow label="D. Interoc." name="diametroInterocular" value={data.diametroInterocular} onChange={handleChange} />
                </div>

                {/* Coluna 3: Neuro/Torax */}
                <div className="laudo-col">
                    <BiometriaRow label="Cerebelo" name="cerebelo" value={data.cerebelo} onChange={handleChange} />
                    <BiometriaRow label="Ventrículo Lat." name="ventriculoLat" value={data.ventriculoLat} onChange={handleChange} />
                    <BiometriaRow label="Cist. Magna" name="cisternaMagna" value={data.cisternaMagna} onChange={handleChange} />
                    <BiometriaRow label="Tórax Trans." name="toraxTrans" value={data.toraxTrans} onChange={handleChange} />
                    <BiometriaRow label="Tórax AP" name="toraxAP" value={data.toraxAP} onChange={handleChange} />
                    <BiometriaRow label="Osso Nasal" name="ossoNasal" value={data.ossoNasal} onChange={handleChange} />
                    <BiometriaRow label="Prega Nucal" name="pregaNucal" value={data.pregaNucal} onChange={handleChange} />
                </div>

            </div>
        </div>
    </div>
  );
};

export default SecaoBiometria;