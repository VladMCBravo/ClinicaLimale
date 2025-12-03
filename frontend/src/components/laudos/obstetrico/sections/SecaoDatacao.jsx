// src/components/laudos/obstetrico/sections/SecaoDatacao.jsx
import React from 'react';
import { FaQuestionCircle, FaInfoCircle } from 'react-icons/fa';

const SecaoDatacao = ({ data, handleChange, handleDatacaoChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-purple">DUM / DPP / Idade gestacional</div>
        
        <div className="laudo-section-body">
            
            {/* --- CAIXA 1: DUM --- */}
            <div className="laudo-info-box">
                <div style={{fontWeight: 'bold', marginBottom: '8px', color: '#4A148C'}}>Idade Gestacional pela D.U.M.</div>
                
                {/* Linha 1 */}
                <div className="laudo-row">
                    <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                        <input type="radio" checked={data.usarDum} onChange={() => handleDatacaoChange('USAR_DUM')} />
                        Usar a D.U.M.
                    </label>
                    
                    <input 
                        type="date" 
                        name="dum" 
                        value={data.dum} 
                        onChange={handleChange} 
                        disabled={!data.usarDum} 
                        className="laudo-input laudo-input-date"
                    />

                    {/* CORREÇÃO AQUI: Agora aponta para data.igDum corretamente */}
                    <span style={{fontWeight:'bold', marginLeft:'10px', color: '#2E7D32'}}>
                        I.G. (DUM): {data.usarDum && data.igDum ? data.igDum : '---'}
                    </span>
                </div>

                {/* Linha 2 */}
                <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center', marginTop:'5px'}}>
                    <div className="laudo-col">
                        <label className="laudo-checkbox-label">
                            <input type="radio" checked={data.dumDesconhecida} onChange={() => handleDatacaoChange('DUM_DESCONHECIDA')} />
                            D.U.M. desconhecida
                        </label>
                         <label className="laudo-checkbox-label">
                            <input type="radio" checked={data.naoUsarDum} onChange={() => handleDatacaoChange('NAO_USAR_DUM')} />
                            NÃO usar a D.U.M.
                        </label>
                    </div>

                    <div className="laudo-row" style={{marginRight:'20px'}}>
                        <label className="laudo-checkbox-label">
                            <input type="checkbox" name="exibirDataDum" checked={data.exibirDataDum} onChange={handleChange} disabled={!data.usarDum} /> 
                            exibir a data
                        </label>
                        <label className="laudo-checkbox-label">
                            <input type="checkbox" name="citarDppDum" checked={data.citarDppDum} onChange={handleChange} disabled={!data.usarDum} /> 
                            citar D.P.P. pela D.U.M.
                        </label>
                    </div>
                </div>

                {/* Linha 3 - Checkbox de Base */}
                <div style={{marginTop: '8px', paddingLeft: '22px'}}>
                    <label className="laudo-checkbox-label" style={{color: data.usarDumComoBase ? '#1565C0' : '#333'}}>
                        <input type="checkbox" name="usarDumComoBase" checked={data.usarDumComoBase} onChange={handleChange} />
                        <strong>Usar a D.U.M. como base da idade gestacional deste exame</strong>
                        <FaQuestionCircle style={{color:'#42A5F5', marginLeft:'5px'}} size={12} title="Define a IG do exame pela DUM"/>
                    </label>
                </div>
            </div>

            {/* --- MEIO: DPP PELA BIOMETRIA --- */}
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', paddingLeft:'5px', paddingRight:'50px', background: '#f9f9f9', padding: '5px', borderRadius: '4px', margin: '5px 0'}}>
                <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                    <input type="checkbox" name="citarDppBiometria" checked={data.citarDppBiometria} onChange={handleChange} />
                    citar D.P.P. pela biometria do exame atual
                </label>
                {/* Mostra a DPP calculada se disponível */}
                <span style={{fontWeight:'bold', color: '#555'}}>
                    {data.citarDppBiometria ? (data.dppBiometriaCalculada || 'Calculando...') : ''}
                </span>
            </div>

            {/* --- CAIXA 2: EXAME ANTERIOR --- */}
            <div className="laudo-info-box">
                <div style={{fontWeight: 'bold', marginBottom: '8px', color: '#4A148C'}}>Idade Gestacional Corrigida por exame anterior</div>
                
                <label className="laudo-checkbox-label" style={{fontWeight:'bold', marginBottom:'8px'}}>
                    <input type="checkbox" name="referirIgAnterior" checked={data.referirIgAnterior} onChange={handleChange} />
                    referir Idade Gestacional com base em US anterior
                </label>

                <div style={{paddingLeft: '22px', display:'flex', flexDirection:'column', gap:'5px', opacity: data.referirIgAnterior ? 1 : 0.5}}>
                     <label className="laudo-checkbox-label">
                        <input type="checkbox" name="usarIgAnteriorComoBase" checked={data.usarIgAnteriorComoBase} onChange={handleChange} disabled={!data.referirIgAnterior} />
                        usar o exame anterior como base da idade gestacional deste exame
                    </label>

                    <div className="laudo-row" style={{alignItems: 'flex-end'}}>
                        <div>
                            <span style={{fontSize: '10px', display: 'block', color:'#666'}}>Data do exame anterior:</span>
                            <input type="date" name="dataExameAnterior" value={data.dataExameAnterior} onChange={handleChange} disabled={!data.referirIgAnterior} className="laudo-input laudo-input-date" />
                        </div>
                        
                        <div style={{marginLeft: '15px'}}>
                             <span style={{fontSize: '10px', display: 'block', color:'#666'}}>IG naquele exame (digite):</span>
                             <div className="laudo-row">
                                <input name="igAnteriorSemanas" value={data.igAnteriorSemanas} onChange={handleChange} disabled={!data.referirIgAnterior} className="laudo-input laudo-input-small" placeholder="sem" /> s
                                <input name="igAnteriorDias" value={data.igAnteriorDias} onChange={handleChange} disabled={!data.referirIgAnterior} className="laudo-input laudo-input-small" placeholder="dias" /> d
                             </div>
                        </div>

                        {/* Dica visual */}
                        <div style={{marginLeft: '10px', fontSize: '10px', color: '#D32F2F', maxWidth: '200px', display: (!data.igAnteriorSemanas && data.referirIgAnterior) ? 'block' : 'none'}}>
                            <FaInfoCircle/> Digite a IG que constava no laudo anterior.
                        </div>
                    </div>

                    <div className="laudo-row" style={{marginTop:'5px', borderTop: '1px solid #eee', paddingTop: '5px'}}>
                        <label className="laudo-checkbox-label">
                            <input type="checkbox" name="citarDppIgCorrigida" checked={data.citarDppIgCorrigida} onChange={handleChange} disabled={!data.referirIgAnterior} />
                            citar D.P.P. pela I.G. corrigida
                        </label>
                        <span style={{fontWeight:'bold', marginLeft: 'auto', color: '#2E7D32'}}>
                             {data.dppIgCorrigidaCalculada ? `DPP Corrigida: ${data.dppIgCorrigidaCalculada}` : ''}
                        </span>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};

export default SecaoDatacao;