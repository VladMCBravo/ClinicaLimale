import React from 'react';
import { FaCube, FaSmile, FaChild, FaHandPaper, FaExclamationTriangle, FaVideo } from 'react-icons/fa';
import { MdHighQuality, MdFace } from 'react-icons/md';

const Secao3D = ({ data, handleChange }) => {
  return (
    <div>
        {/* CHECKBOX DE ATIVAÇÃO NO TOPO (Dentro do card agora) */}
        <div style={{marginBottom:'10px', paddingBottom:'5px', borderBottom:'1px dashed #ccc'}}>
            <label className="laudo-checkbox-label" style={{width: '100%', fontWeight: 'bold', cursor:'pointer', color: data.usar3D ? '#F57F17' : '#777'}}>
                <input type="checkbox" name="usar3D" checked={data.usar3D} onChange={handleChange} />
                <FaCube style={{marginRight:'5px'}}/> Habilitar Descrição 3D/4D no Laudo
            </label>
        </div>

        {data.usar3D && (
            <div className="laudo-section-body">
                
                {/* BLOCO 1: TÉCNICA E QUALIDADE */}
                <div style={{background:'#FFFDE7', padding:'8px', borderRadius:'4px', border:'1px solid #FFF59D'}}>
                    <div className="laudo-grid-2" style={{alignItems:'center'}}>
                        
                        {/* Modos */}
                        <div className="laudo-row" style={{fontSize:'10px'}}>
                            <span style={{fontWeight:'bold', marginRight:'5px'}}>Modos:</span>
                            <label className="laudo-checkbox-label"><input type="checkbox" name="modoSurface" checked={data.modoSurface} onChange={handleChange} /> Surface</label>
                            <label className="laudo-checkbox-label"><input type="checkbox" name="modoMultiplanar" checked={data.modoMultiplanar} onChange={handleChange} /> Multiplanar</label>
                        </div>

                        {/* Qualidade */}
                        <div className="laudo-row">
                            <span className="label-pequeno" style={{fontWeight:'bold', display:'flex', alignItems:'center', gap:'4px'}}>
                                <MdHighQuality /> Qualidade:
                            </span>
                            <select name="qualidade3D" value={data.qualidade3D} onChange={handleChange} className="laudo-select" style={{flex:1}}>
    <option value="">Selecione...</option> {/* ADICIONADO */}
    <option value="otima">Ótima / Fotogênica</option>
    <option value="boa">Boa</option>
    <option value="regular">Regular</option>
    <option value="ruim">Ruim / Prejudicada</option>
</select>
                            
                            {/* Mostra se qualidade for regular ou ruim */}
                            {(data.qualidade3D === 'regular' || data.qualidade3D === 'ruim') && (
                                <select name="fatorLimitante" value={data.fatorLimitante} onChange={handleChange} className="laudo-select" style={{flex:1, color:'#D32F2F'}}>
                                    <option value="">Motivo...</option>
                                    <option value="posicao">Posição Fetal</option>
                                    <option value="liquido">Líquido Reduzido</option>
                                    <option value="biotipo">Biotipo Materno (IMC)</option>
                                    <option value="placenta">Interposição Placentária</option>
                                    <option value="membros">Membros na face</option>
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                <div className="laudo-grid-2" style={{alignItems:'start', gap:'20px'}}>
                    
                    {/* BLOCO 2: MORFOLOGIA 3D (ESTÁTICA) */}
                    <div className="laudo-col">
                        <div style={{fontSize:'11px', fontWeight:'bold', color:'#F57F17', marginBottom:'5px', display:'flex', alignItems:'center', gap:'5px'}}>
                            <MdFace size={14}/> ANÁLISE MORFOLÓGICA (3D)
                        </div>
                        
                        <div style={{background:'#FAFAFA', padding:'8px', borderRadius:'4px', border:'1px solid #eee'}}>
                            <div className="laudo-row" style={{marginBottom:'8px'}}>
                                <span className="label-pequeno">Face:</span>
                                <select name="face3D" value={data.face3D} onChange={handleChange} className="laudo-select full-width">
    <option value="">Selecione...</option> {/* ADICIONADO */}
    <option value="visualizada">Visualizada (Nítida)</option>
    <option value="parcial">Parcialmente Visualizada</option>
    <option value="encoberta">Encoberta / Não visualizada</option>
</select>
                            </div>

                            <div className="laudo-grid-2" style={{gap:'5px', marginBottom:'8px'}}>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="labios3D" checked={data.labios3D} onChange={handleChange} /> Lábios</label>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="nariz3D" checked={data.nariz3D} onChange={handleChange} /> Nariz</label>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="olhos3D" checked={data.olhos3D} onChange={handleChange} /> Olhos</label>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="orelhas3D" checked={data.orelhas3D} onChange={handleChange} /> Orelhas</label>
                            </div>

                            <div style={{borderTop:'1px dashed #ddd', paddingTop:'5px'}}>
                                <span style={{fontSize:'10px', color:'#777', display:'block', marginBottom:'3px'}}>Extremidades Identificadas:</span>
                                <div className="laudo-grid-2" style={{gap:'5px'}}>
                                    <label className="laudo-checkbox-label"><input type="checkbox" name="maoDir3D" checked={data.maoDir3D} onChange={handleChange} /> Mão Dir</label>
                                    <label className="laudo-checkbox-label"><input type="checkbox" name="maoEsq3D" checked={data.maoEsq3D} onChange={handleChange} /> Mão Esq</label>
                                    <label className="laudo-checkbox-label"><input type="checkbox" name="peDir3D" checked={data.peDir3D} onChange={handleChange} /> Pé Dir</label>
                                    <label className="laudo-checkbox-label"><input type="checkbox" name="peEsq3D" checked={data.peEsq3D} onChange={handleChange} /> Pé Esq</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BLOCO 3: COMPORTAMENTO 4D (DINÂMICA) */}
                    <div className="laudo-col">
                        <div style={{fontSize:'11px', fontWeight:'bold', color:'#E65100', marginBottom:'5px', display:'flex', alignItems:'center', gap:'5px'}}>
                            <FaVideo size={12}/> COMPORTAMENTO FETAL (4D)
                        </div>

                        <div style={{background:'#FFF3E0', padding:'8px', borderRadius:'4px', border:'1px solid #FFE0B2'}}>
                            <span style={{fontSize:'10px', fontWeight:'bold', color:'#E65100', display:'block', marginBottom:'5px'}}>Mímica Facial:</span>
                            <div className="laudo-grid-2" style={{gap:'5px', marginBottom:'10px'}}>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="movBocejo" checked={data.movBocejo} onChange={handleChange} /> Bocejo</label>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="movSorriso" checked={data.movSorriso} onChange={handleChange} /> Sorriso</label>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="movPiscar" checked={data.movPiscar} onChange={handleChange} /> Piscar</label>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="movLingua" checked={data.movLingua} onChange={handleChange} /> Língua</label>
                            </div>

                            <span style={{fontSize:'10px', fontWeight:'bold', color:'#E65100', display:'block', marginBottom:'5px', borderTop:'1px solid #FFE0B2', paddingTop:'5px'}}>Atividade Motora:</span>
                            <div className="laudo-grid-2" style={{gap:'5px'}}>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="movMaoFace" checked={data.movMaoFace} onChange={handleChange} /> Mão na face</label>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="movSuccao" checked={data.movSuccao} onChange={handleChange} /> Sucção</label>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="movDegluticao3D" checked={data.movDegluticao3D} onChange={handleChange} /> Deglutição</label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* OBSERVAÇÕES */}
                <div style={{ marginTop: '10px' }}>
                    <textarea 
                        name="obs3D" 
                        value={data.obs3D} 
                        onChange={handleChange} 
                        className="laudo-textarea" 
                        rows="2"
                        placeholder="Observações adicionais (Ex: Notada boa vitalidade facial, interação com estruturas...)"
                        style={{fontSize:'11px', width:'100%'}}
                    />
                </div>
            </div>
        )}
    </div>
  );
};

export default Secao3D;