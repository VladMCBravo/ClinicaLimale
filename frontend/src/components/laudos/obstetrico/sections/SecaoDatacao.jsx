import React, { useMemo } from 'react';
import { FaQuestionCircle } from 'react-icons/fa';
// CSS vem do Pai

const SecaoDatacao = ({ data, handleChange, handleDatacaoChange }) => {

  // Cálculos rápidos para exibição visual
  const calculos = useMemo(() => {
      let igTxt = "0 sem";
      let dppBiometria = "--/--/----";

      if (data.dum && data.usarDum) {
          const d = new Date(data.dum + 'T12:00:00');
          const hoje = new Date();
          if (!isNaN(d)) {
              const diff = Math.floor((hoje - d) / (1000 * 60 * 60 * 24));
              const sem = Math.floor(diff/7);
              const dias = diff%7;
              igTxt = `${sem} sem ${dias > 0 ? `e ${dias}d` : ''}`;
              
              const dpp = new Date(d);
              dpp.setDate(d.getDate() + 280);
              dppBiometria = dpp.toLocaleDateString('pt-BR');
          }
      }
      return { igTxt, dppBiometria };
  }, [data.dum, data.usarDum]);

  return (
    <div className="laudo-section">
        <div className="header-base header-purple">DUM / DPP / Idade gestacional</div>
        
        <div className="laudo-section-body">
            
            {/* --- CAIXA 1: DUM --- */}
            <div className="laudo-info-box">
                <div style={{fontWeight: 'bold', marginBottom: '8px'}}>Idade Gestacional pela D.U.M.</div>
                
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

                    <span style={{fontWeight:'bold', marginLeft:'10px'}}>I.G. pela D.U.M.: {calculos.igTxt}</span>
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

                {/* Linha 3 */}
                <div style={{marginTop: '8px', paddingLeft: '22px'}}>
                    <label className="laudo-checkbox-label">
                        <input type="checkbox" name="usarDumComoBase" checked={data.usarDumComoBase} onChange={handleChange} />
                        Usar a D.U.M. como base da idade gestacional deste exame
                        <FaQuestionCircle style={{color:'#42A5F5', marginLeft:'5px'}} size={12} title="Define a IG do exame pela DUM"/>
                    </label>
                </div>
            </div>

            {/* --- MEIO: DPP PELA BIOMETRIA --- */}
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', paddingLeft:'5px', paddingRight:'50px'}}>
                <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                    <input type="checkbox" name="citarDppBiometria" checked={data.citarDppBiometria} onChange={handleChange} />
                    citar D.P.P. pela biometria do exame atual
                </label>
                <span style={{fontWeight:'bold'}}>{calculos.dppBiometria}</span>
            </div>

            {/* --- CAIXA 2: EXAME ANTERIOR --- */}
            <div className="laudo-info-box">
                <div style={{fontWeight: 'bold', marginBottom: '8px'}}>Idade Gestacional Corrigida por exame anterior</div>
                
                <label className="laudo-checkbox-label" style={{fontWeight:'bold', marginBottom:'8px'}}>
                    <input type="checkbox" name="referirIgAnterior" checked={data.referirIgAnterior} onChange={handleChange} />
                    referir Idade Gestacional com base em US anterior
                </label>

                <div style={{paddingLeft: '22px', display:'flex', flexDirection:'column', gap:'5px'}}>
                     <label className="laudo-checkbox-label">
                        <input type="checkbox" name="usarIgAnteriorComoBase" checked={data.usarIgAnteriorComoBase} onChange={handleChange} />
                        usar o exame anterior como base da idade gestacional deste exame
                        <FaQuestionCircle style={{color:'#42A5F5', marginLeft:'5px'}} size={12} />
                    </label>

                    <div className="laudo-row">
                        <span>Data do exame:</span>
                        <input type="date" name="dataExameAnterior" value={data.dataExameAnterior} onChange={handleChange} className="laudo-input laudo-input-date" />
                        
                        <span style={{marginLeft:'10px'}}>IG no exame:</span>
                        <input name="igAnteriorSemanas" value={data.igAnteriorSemanas} onChange={handleChange} className="laudo-input laudo-input-small" /> s
                        <input name="igAnteriorDias" value={data.igAnteriorDias} onChange={handleChange} className="laudo-input laudo-input-small" /> d
                    </div>

                    <div className="laudo-row" style={{marginTop:'5px'}}>
                        <label className="laudo-checkbox-label">
                            <input type="checkbox" name="citarDppIgCorrigida" checked={data.citarDppIgCorrigida} onChange={handleChange} />
                            citar D.P.P. pela I.G. corrigida
                        </label>
                        <span style={{fontWeight:'bold'}}>I.G. corrigida:</span>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};

export default SecaoDatacao;