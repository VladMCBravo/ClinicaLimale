import React from 'react';

const styles = {
    section: { border: '1px solid #ccc', borderRadius: '4px', marginBottom: '5px', background: '#fff' },
    header: { background: '#2E7D32', color: 'white', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold' },
    body: { padding: '5px', display: 'flex', gap: '10px' }, // Flex para dividir colunas
    col: { flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' },
    rowInput: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' },
    inputSmall: { width: '40px', textAlign: 'center', border: '1px solid #ccc', borderRadius: '2px' }
};

const BiometriaRow = ({ label, name, value, onChange, checkName, checkValue }) => (
    <div style={styles.rowInput}>
        <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
            {checkName && <input type="checkbox" name={checkName} checked={checkValue} onChange={onChange} />}
            <span style={{fontWeight:'bold', color: '#1565C0'}}>{label}</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'2px'}}>
            <input name={name} value={value} onChange={onChange} style={styles.inputSmall} />
            <span style={{color:'#777', fontSize:'9px'}}>mm</span>
        </div>
    </div>
);

const SecaoBiometria = ({ data, handleChange }) => {
  return (
    <div style={styles.section}>
        <div style={styles.header}>Biometria fetal</div>
        <div style={styles.body}>
            {/* Coluna 1: Principais + Inclusão */}
            <div style={styles.col}>
                <BiometriaRow label="DBP" name="dbp" value={data.dbp} onChange={handleChange} checkName="incDbp" checkValue={data.incDbp} />
                <BiometriaRow label="DOF" name="dof" value={data.dof} onChange={handleChange} checkName="incDof" checkValue={data.incDof} />
                <BiometriaRow label="CC" name="cc" value={data.cc} onChange={handleChange} checkName="incCc" checkValue={data.incCc} />
                <BiometriaRow label="CA" name="ca" value={data.ca} onChange={handleChange} checkName="incCa" checkValue={data.incCa} />
                <BiometriaRow label="Úmero" name="umero" value={data.umero} onChange={handleChange} />
                <BiometriaRow label="Fêmur" name="femur" value={data.femur} onChange={handleChange} checkName="incFemur" checkValue={data.incFemur} />
            </div>

            {/* Coluna 2: Ossos Longos e Detalhes */}
            <div style={styles.col}>
                <BiometriaRow label="Ulna" name="ulna" value={data.ulna} onChange={handleChange} />
                <BiometriaRow label="Tíbia" name="tibia" value={data.tibia} onChange={handleChange} />
                <BiometriaRow label="Rádio" name="radio" value={data.radio} onChange={handleChange} />
                <BiometriaRow label="Fíbula" name="fibula" value={data.fibula} onChange={handleChange} />
                <BiometriaRow label="Comp. pé" name="pe" value={data.pe} onChange={handleChange} />
                
                <div style={{height:'1px', background:'#eee', margin:'5px 0'}} />
                
                <BiometriaRow label="D. Binocular" name="diametroBinocular" value={data.diametroBinocular} onChange={handleChange} />
                <BiometriaRow label="D. Interoc." name="diametroInterocular" value={data.diametroInterocular} onChange={handleChange} />
            </div>

            {/* Coluna 3: Neuro/Torax/Face */}
            <div style={styles.col}>
                <BiometriaRow label="Cerebelo" name="cerebelo" value={data.cerebelo} onChange={handleChange} />
                <BiometriaRow label="Ventrículo Lat." name="ventriculoLat" value={data.ventriculoLat} onChange={handleChange} />
                <BiometriaRow label="Cist. Magna" name="cisternaMagna" value={data.cisternaMagna} onChange={handleChange} />
                <BiometriaRow label="Tórax Trans." name="toraxTrans" value={data.toraxTrans} onChange={handleChange} />
                <BiometriaRow label="Tórax AP" name="toraxAP" value={data.toraxAP} onChange={handleChange} />
                <BiometriaRow label="Osso Nasal" name="ossoNasal" value={data.ossoNasal} onChange={handleChange} />
                <BiometriaRow label="Prega Nucal" name="pregaNucal" value={data.pregaNucal} onChange={handleChange} />
            </div>
        </div>
        
        {/* Índices (Rodapé da Biometria no Print 3) */}
        <div style={{borderTop: '1px solid #ccc', padding: '5px', background:'#F9F9F9'}}>
            <div style={{fontWeight:'bold', fontSize:'11px', marginBottom:'3px', color:'#2E7D32'}}>Índices</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', fontSize:'11px'}}>
                <div>Índice Cefálico: <strong>{data.indiceCefalico || '--'}</strong></div>
                <div>Relação CC/CA: <strong>{data.relacaoCcCa || '--'}</strong></div>
                <div>Relação CF/CA: <strong>{data.relacaoFlAc || '--'}</strong></div>
            </div>
        </div>
    </div>
  );
};

export default SecaoBiometria;