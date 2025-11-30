import React from 'react';
import { FaHeartbeat, FaCheckSquare } from 'react-icons/fa';

const CheckItem = ({ label, name, checked, onChange }) => (
    <label className="laudo-checkbox-label">
        <input type="checkbox" name={name} checked={checked} onChange={onChange} /> 
        {label}
    </label>
);

const SecaoMorfologia = ({ data, handleChange }) => {
  return (
    <>
        <div className="laudo-section">
            <div className="header-base header-green"><FaCheckSquare size={10}/> Morfologia fetal</div>
            <div className="laudo-section-body">
                <div className="laudo-grid-2" style={{gap: '5px'}}>
                    {/* Coluna Esquerda */}
                    <div className="laudo-col" style={{gap: '2px'}}>
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
                    <div className="laudo-col" style={{gap: '2px'}}>
                        <CheckItem label="citar estômago normal" name="morfEstomago" checked={data.morfEstomago} onChange={handleChange} />
                        <CheckItem label="citar fígado normal" name="morfFigado" checked={data.morfFigado} onChange={handleChange} />
                        <CheckItem label="citar rins normais" name="morfRins" checked={data.morfRins} onChange={handleChange} />
                        <CheckItem label="citar bexiga normal" name="morfBexiga" checked={data.morfBexiga} onChange={handleChange} />
                        <CheckItem label="citar parede abdominal íntegra" name="morfParedeAbd" checked={data.morfParedeAbd} onChange={handleChange} />
                        <CheckItem label="citar genitália externa normal" name="morfGenitalia" checked={data.morfGenitalia} onChange={handleChange} />
                        <CheckItem label="citar membros normais" name="morfMembros" checked={data.morfMembros} onChange={handleChange} />
                        
                        <div className="laudo-row" style={{marginTop: '5px', paddingLeft: '18px'}}>
                             <span>Sexo:</span>
                             <select name="sexoFetal" value={data.sexoFetal} onChange={handleChange} className="laudo-select" style={{fontWeight:'bold'}}>
                                 <option>MASCULINO</option>
                                 <option>FEMININO</option>
                                 <option>NÃO VISUALIZADO</option>
                             </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Vitalidade Fetal */}
        <div className="laudo-section">
             <div className="header-base header-green"><FaHeartbeat size={10}/> Vitalidade fetal</div>
             <div className="laudo-section-body">
                 <div className="laudo-info-box laudo-row">
                     <span>BCF presentes com frequência de</span>
                     <input name="bcf" value={data.bcf} onChange={handleChange} className="laudo-input laudo-input-small" /> 
                     <span>bpm</span>
                 </div>
                 <div className="laudo-info-box laudo-row">
                     <CheckItem label="movimentação ativa" name="movFetal" checked={data.movFetal} onChange={handleChange} />
                     <span style={{margin: '0 10px'}}>|</span>
                     <CheckItem label="deglutição presente" name="degluticao" checked={data.degluticao} onChange={handleChange} />
                 </div>
             </div>
        </div>
    </>
  );
};

export default SecaoMorfologia;