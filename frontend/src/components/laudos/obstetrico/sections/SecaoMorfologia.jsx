import React from 'react';
import { FaHeartbeat, FaCheckSquare, FaExclamationTriangle } from 'react-icons/fa';

// Componente auxiliar para Checkbox simples
const CheckItem = ({ label, name, checked, onChange }) => (
    <label className="laudo-checkbox-label" style={{display:'flex', alignItems:'center', marginBottom:'3px'}}>
        <input 
            type="checkbox" 
            name={name} 
            checked={!!checked} 
            onChange={onChange} 
        /> 
        <span style={{marginLeft:'6px'}}>{label}</span>
    </label>
);

const SecaoMorfologia = ({ data, handleChange }) => {

  const isMorfo1Tri = data.subtipo === 'OBSTETRICO_1_TRI';

  return (
    <>
        {/* BLOCO 1: ANÁLISE MORFOLÓGICA */}
        <div className="laudo-section">
            <div className="header-base header-green">
                <FaCheckSquare size={12} style={{marginRight:'5px'}}/> 
                Análise Morfológica {isMorfo1Tri ? '(1º Trimestre)' : '(2º Trimestre)'}
            </div>
            
            <div className="laudo-section-body">

                {/* --- EXCLUSIVO: RASTREAMENTO 1º TRIMESTRE --- */}
                {isMorfo1Tri && (
                    <div style={{background:'#FFF8E1', padding:'10px', borderRadius:'4px', marginBottom:'15px', border:'1px solid #FFECB3'}}>
                        <div style={{fontWeight:'bold', color:'#F57F17', marginBottom:'8px', fontSize:'12px', display:'flex', alignItems:'center'}}>
                            <FaExclamationTriangle size={12} style={{marginRight:'5px'}}/>
                            Rastreamento de Cromossomopatias (11 - 14 semanas)
                        </div>
                        
                        <div className="laudo-grid-2" style={{alignItems:'center'}}>
                            {/* Checkbox Osso Nasal */}
                            <label className="laudo-checkbox-label" style={{fontWeight:'bold', color:'#333'}}>
                                <input 
                                    type="checkbox" 
                                    name="ossoNasalPresente" 
                                    checked={!!data.ossoNasalPresente} 
                                    onChange={handleChange} 
                                />
                                Osso Nasal Presente
                            </label>

                            {/* Inputs de Risco */}
                            <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                    <span className="label-pequeno" style={{width:'100px'}}>Risco Idade:</span>
                                    <input 
                                        type="text" 
                                        name="riscoIdade" 
                                        value={data.riscoIdade} 
                                        onChange={handleChange} 
                                        className="laudo-input" 
                                        placeholder="ex: 1:1400"
                                        style={{flex:1}}
                                    />
                                </div>
                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                    <span className="label-pequeno" style={{width:'100px'}}>Risco Exame:</span>
                                    <input 
                                        type="text" 
                                        name="riscoExame" 
                                        value={data.riscoExame} 
                                        onChange={handleChange} 
                                        className="laudo-input" 
                                        placeholder="ex: 1:5000"
                                        style={{flex:1}}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- CHECKLIST ANATÔMICO (Comum) --- */}
                <div className="laudo-grid-2" style={{gap: '15px'}}>
                    
                    {/* Coluna Esquerda */}
                    <div className="laudo-col" style={{gap: '2px'}}>
                        <div className="sub-header-mini">Cabeça e Tórax</div>
                        <CheckItem label="Crânio / Calota" name="morfCranio" checked={data.morfCranio} onChange={handleChange} />
                        <CheckItem label="Encéfalo / Ventrículos" name="morfCerebro" checked={data.morfCerebro} onChange={handleChange} />
                        <CheckItem label="Face / Perfil" name="morfFace" checked={data.morfFace} onChange={handleChange} />
                        <CheckItem label="Coluna Vertebral" name="morfColuna" checked={data.morfColuna} onChange={handleChange} />
                        <CheckItem label="Tórax / Pulmões" name="morfTorax" checked={data.morfTorax} onChange={handleChange} />
                        <CheckItem label="Coração (4 Câmaras)" name="morfCoracao" checked={data.morfCoracao} onChange={handleChange} />
                        <CheckItem label="Vasos da base" name="morfVasosBase" checked={data.morfVasosBase} onChange={handleChange} />
                    </div>

                    {/* Coluna Direita */}
                    <div className="laudo-col" style={{gap: '2px'}}>
                        <div className="sub-header-mini">Abdome e Membros</div>
                        <CheckItem label="Estômago" name="morfEstomago" checked={data.morfEstomago} onChange={handleChange} />
                        <CheckItem label="Fígado / Vesícula" name="morfFigado" checked={data.morfFigado} onChange={handleChange} />
                        <CheckItem label="Rins" name="morfRins" checked={data.morfRins} onChange={handleChange} />
                        <CheckItem label="Bexiga" name="morfBexiga" checked={data.morfBexiga} onChange={handleChange} />
                        <CheckItem label="Parede Abdominal" name="morfParedeAbd" checked={data.morfParedeAbd} onChange={handleChange} />
                        <CheckItem label="Genitália Externa" name="morfGenitalia" checked={data.morfGenitalia} onChange={handleChange} />
                        <CheckItem label="Membros (sup/inf)" name="morfMembros" checked={data.morfMembros} onChange={handleChange} />
                    </div>
                </div>
            </div>
        </div>

        {/* BLOCO 2: VITALIDADE FETAL */}
        <div className="laudo-section">
             <div className="header-base header-green">
                <FaHeartbeat size={12} style={{marginRight:'5px'}}/> 
                Vitalidade Fetal
            </div>
             <div className="laudo-section-body">
                 <div className="laudo-row" style={{alignItems:'center', background:'#f9f9f9', padding:'8px', borderRadius:'4px'}}>
                     <span style={{fontWeight:'bold'}}>BCF:</span>
                     <input 
                        name="bcf" 
                        value={data.bcf} 
                        onChange={handleChange} 
                        className="laudo-input" 
                        style={{width:'60px', marginLeft:'5px', marginRight:'5px', fontWeight:'bold', color:'#2E7D32'}}
                    /> 
                     <span style={{marginRight:'20px'}}>bpm</span>

                     <div style={{borderLeft:'1px solid #ccc', height:'20px', marginRight:'15px'}}></div>

                     <CheckItem label="Movimentação Ativa" name="movFetal" checked={data.movFetal} onChange={handleChange} />
                     <span style={{margin: '0 10px', color:'#ccc'}}>|</span>
                     <CheckItem label="Deglutição" name="degluticao" checked={data.degluticao} onChange={handleChange} />
                 </div>
             </div>
        </div>
    </>
  );
};

export default SecaoMorfologia;