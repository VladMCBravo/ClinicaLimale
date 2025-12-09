import React from 'react';
import { FaCube, FaSmile, FaHandPaper, FaShoePrints } from 'react-icons/fa';

const Secao3D = ({ data, handleChange }) => {
  return (
    <div className="laudo-section" style={{ borderLeft: '4px solid #FBC02D' }}>
        <div className="header-base" style={{ background: 'linear-gradient(135deg, #FBC02D, #F57F17)', color: 'white' }}>
            <label className="laudo-checkbox-label" style={{ width: '100%', fontWeight: 'bold', cursor:'pointer' }}>
                <input 
                    type="checkbox" 
                    name="usar3D" 
                    checked={data.usar3D} 
                    onChange={handleChange} 
                />
                <FaCube style={{marginRight:'5px'}}/> Estudo 3D / 4D
            </label>
        </div>

        {data.usar3D && (
            <div className="laudo-section-body">
                
                <div className="laudo-grid-2" style={{alignItems:'start'}}>
                    
                    {/* Coluna 1: Qualidade e Face */}
                    <div className="laudo-col" style={{gap:'10px'}}>
                        <div className="laudo-row">
                            <span className="label-pequeno" style={{fontWeight:'bold'}}>Qualidade:</span>
                            <select name="qualidade3D" value={data.qualidade3D} onChange={handleChange} className="laudo-select full-width">
                                <option value="ótima">Ótima</option>
                                <option value="boa">Boa</option>
                                <option value="regular">Regular</option>
                                <option value="prejudicada">Prejudicada</option>
                            </select>
                        </div>

                        <div className="laudo-row">
                            <span className="label-pequeno" style={{fontWeight:'bold', display:'flex', alignItems:'center', gap:'4px'}}>
                                <FaSmile size={12}/> Face:
                            </span>
                            <select name="face3D" value={data.face3D} onChange={handleChange} className="laudo-select full-width">
                                <option value="visualizada">Visualizada (Nítida)</option>
                                <option value="parcial">Parcial</option>
                                <option value="encoberta">Encoberta</option>
                            </select>
                        </div>
                    </div>

                    {/* Coluna 2: Membros e Obs */}
                    <div className="laudo-col" style={{gap:'8px'}}>
                        <div className="laudo-row" style={{background:'#FFF9C4', padding:'5px', borderRadius:'4px'}}>
                            <label className="laudo-checkbox-label" style={{marginRight:'15px'}}>
                                <input type="checkbox" name="mao3D" checked={data.mao3D} onChange={handleChange} />
                                <FaHandPaper size={10} style={{marginRight:'4px'}}/> Mãos
                            </label>
                            <label className="laudo-checkbox-label">
                                <input type="checkbox" name="pe3D" checked={data.pe3D} onChange={handleChange} />
                                <FaShoePrints size={10} style={{marginRight:'4px'}}/> Pés
                            </label>
                        </div>

                        <textarea 
                            name="obs3D" 
                            value={data.obs3D} 
                            onChange={handleChange} 
                            className="laudo-textarea" 
                            rows="2"
                            placeholder="Obs: Mímica facial, bocejo, etc."
                            style={{fontSize:'11px', width:'100%'}}
                        />
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Secao3D;