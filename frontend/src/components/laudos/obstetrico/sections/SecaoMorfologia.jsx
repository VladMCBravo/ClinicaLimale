import React from 'react';
import { FaHeartbeat, FaCheckSquare } from 'react-icons/fa';

const styles = {
    section: { border: '1px solid #ccc', borderRadius: '4px', marginBottom: '5px', background: '#fff' },
    header: { background: '#2E7D32', color: 'white', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' },
    body: { padding: '5px' },
    gridCheck: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', fontSize: '11px' },
    checkLabel: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' },
    vitalidadeRow: { display: 'flex', gap: '15px', alignItems: 'center', marginTop: '5px', fontSize: '11px', background: '#F9F9F9', padding: '5px', borderRadius: '3px' }
};

const CheckItem = ({ label, name, checked, onChange }) => (
    <label style={styles.checkLabel}>
        <input type="checkbox" name={name} checked={checked} onChange={onChange} /> 
        {label}
    </label>
);

const SecaoMorfologia = ({ data, handleChange }) => {
  return (
    <>
        <div style={styles.section}>
            <div style={styles.header}><FaCheckSquare size={10}/> Morfologia fetal</div>
            <div style={styles.body}>
                <div style={styles.gridCheck}>
                    {/* Coluna Esquerda */}
                    <div>
                        <CheckItem label="citar coluna normal" name="morfColuna" checked={data.morfColuna} onChange={handleChange} />
                        <CheckItem label="citar crânio normal" name="morfCranio" checked={data.morfCranio} onChange={handleChange} />
                        <CheckItem label="citar cérebro normal" name="morfCerebro" checked={data.morfCerebro} onChange={handleChange} />
                        <CheckItem label="citar face normal" name="morfFace" checked={data.morfFace} onChange={handleChange} />
                        <CheckItem label="citar tórax normal" name="morfTorax" checked={data.morfTorax} onChange={handleChange} />
                        <CheckItem label="citar pulmões normais" name="morfPulmoes" checked={data.morfPulmoes} onChange={handleChange} />
                        <CheckItem label="citar coração normal" name="morfCoracao" checked={data.morfCoracao} onChange={handleChange} />
                        <CheckItem label="citar vasos da base normais" name="morfVasosBase" checked={data.morfVasosBase} onChange={handleChange} />
                    </div>
                    {/* Coluna Direita */}
                    <div>
                        <CheckItem label="citar estômago normal" name="morfEstomago" checked={data.morfEstomago} onChange={handleChange} />
                        <CheckItem label="citar fígado normal" name="morfFigado" checked={data.morfFigado} onChange={handleChange} />
                        <CheckItem label="citar rins normais" name="morfRins" checked={data.morfRins} onChange={handleChange} />
                        <CheckItem label="citar bexiga normal" name="morfBexiga" checked={data.morfBexiga} onChange={handleChange} />
                        <CheckItem label="citar parede abdominal íntegra" name="morfParedeAbd" checked={data.morfParedeAbd} onChange={handleChange} />
                        <CheckItem label="citar genitália externa normal" name="morfGenitalia" checked={data.morfGenitalia} onChange={handleChange} />
                        <CheckItem label="citar membros normais" name="morfMembros" checked={data.morfMembros} onChange={handleChange} />
                        
                        <div style={{marginTop: '5px', paddingLeft: '18px', display:'flex', alignItems:'center', gap:'5px'}}>
                             <span>Sexo:</span>
                             <select name="sexoFetal" value={data.sexoFetal} onChange={handleChange} style={{border:'1px solid #ccc', fontSize:'10px', fontWeight:'bold'}}>
                                 <option>MASCULINO</option>
                                 <option>FEMININO</option>
                                 <option>NÃO VISUALIZADO</option>
                             </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Vitalidade Fetal (Print 3 - Esquerda) */}
        <div style={styles.section}>
             <div style={styles.header}><FaHeartbeat size={10}/> Vitalidade fetal</div>
             <div style={styles.body}>
                 <div style={styles.vitalidadeRow}>
                     <div>BCF presentes com frequência de <input name="bcf" value={data.bcf} onChange={handleChange} style={{width:'35px', textAlign:'center', border:'1px solid #aaa'}} /> bpm</div>
                 </div>
                 <div style={styles.vitalidadeRow}>
                     <CheckItem label="movimentação ativa" name="movFetal" checked={data.movFetal} onChange={handleChange} />
                     <CheckItem label="deglutição presente" name="degluticao" checked={data.degluticao} onChange={handleChange} />
                 </div>
             </div>
        </div>
    </>
  );
};

export default Sec