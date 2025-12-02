import React from 'react';

const SecaoTecnicaEco = ({ data, handleChange }) => {
  return (
    <>
        {/* DADOS DO PACIENTE */}
        <div className="laudo-section">
            <div className="header-base header-blue">Dados do(a) paciente</div>
            <div className="laudo-section-body">
                <div className="laudo-row" style={{gap:'15px', flexWrap:'wrap'}}>
                    <div className="laudo-row">
                        <input type="checkbox" checked={!!data.peso} readOnly />
                        <span style={{marginLeft:'5px'}}>Peso</span>
                        <input name="peso" type="number" value={data.peso} onChange={handleChange} className="laudo-input" style={{width:'50px', marginLeft:'5px'}} />
                        <span style={{marginLeft:'5px'}}>kg</span>
                    </div>
                    <div className="laudo-row">
                        <input type="checkbox" checked={!!data.altura} readOnly />
                        <span style={{marginLeft:'5px'}}>Altura</span>
                        <input name="altura" type="number" value={data.altura} onChange={handleChange} className="laudo-input" style={{width:'50px', marginLeft:'5px'}} />
                        <span style={{marginLeft:'5px'}}>cm</span>
                    </div>
                    {/* SC CALCULADA */}
                    <div className="laudo-row">
                        <input type="checkbox" checked={!!data.sc} readOnly />
                        <span style={{marginLeft:'5px'}}>SC</span>
                        <input value={data.sc} readOnly className="laudo-input" style={{width:'50px', marginLeft:'5px', background:'#f0f0f0', fontWeight:'bold', color:'#333'}} />
                        <span style={{marginLeft:'5px'}}>m²</span>
                    </div>
                    {/* IMC CALCULADO (NOVO) */}
                    <div className="laudo-row">
                        <input type="checkbox" checked={!!data.imc} readOnly />
                        <span style={{marginLeft:'5px'}}>IMC</span>
                        <input value={data.imc} readOnly className="laudo-input" style={{width:'50px', marginLeft:'5px', background:'#f0f0f0', fontWeight:'bold', color:'#333'}} />
                        <span style={{marginLeft:'5px'}}>kg/m²</span>
                    </div>
                </div>
            </div>
        </div>

        {/* TÉCNICA */}
        <div className="laudo-section">
            <div className="header-base header-blue">Técnica</div>
            <div className="laudo-section-body">
                <div className="laudo-row" style={{marginBottom:'10px'}}>
                    <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                        <input type="radio" name="citarTecnica" checked={data.citarTecnica === true} onChange={() => handleChange({target:{name:'citarTecnica', value:true}})} />
                        citar técnica do exame
                    </label>
                    <label className="laudo-checkbox-label" style={{marginLeft:'20px'}}>
                        <input type="radio" name="citarTecnica" checked={data.citarTecnica === false} onChange={() => handleChange({target:{name:'citarTecnica', value:false}})} />
                        não citar técnica do exame
                    </label>
                </div>

                {data.citarTecnica && (
                    <div style={{background:'#F9F9F9', padding:'5px', border:'1px solid #eee'}}>
                        <div style={{marginBottom:'5px'}}>
                            <span style={{fontSize:'11px', fontWeight:'bold', display:'block', marginBottom:'3px'}}>condições técnicas do exame</span>
                            <label className="laudo-checkbox-label" style={{display:'block'}}>
                                <input type="radio" name="tecnicaQualidade" value="boa" checked={data.tecnicaQualidade === 'boa'} onChange={handleChange} />
                                Exame realizado com boa qualidade técnica (janela acústica adequada).
                            </label>
                            <label className="laudo-checkbox-label" style={{display:'block'}}>
                                <input type="radio" name="tecnicaQualidade" value="limitada" checked={data.tecnicaQualidade === 'limitada'} onChange={handleChange} />
                                Exame realizado com janela acústica limitada.
                            </label>
                        </div>

                        <div style={{marginBottom:'5px'}}>
                            <span style={{fontSize:'11px', fontWeight:'bold', display:'block', marginBottom:'3px'}}>local do exame</span>
                            <div className="laudo-row">
                                <label className="laudo-checkbox-label"><input type="radio" name="localExame" value="nao_citar" checked={data.localExame === 'nao_citar'} onChange={handleChange} /> não citar</label>
                                <label className="laudo-checkbox-label"><input type="radio" name="localExame" value="ambulatorio" checked={data.localExame === 'ambulatorio'} onChange={handleChange} /> ambulatório</label>
                                <label className="laudo-checkbox-label"><input type="radio" name="localExame" value="leito_enfermaria" checked={data.localExame === 'leito_enfermaria'} onChange={handleChange} /> à beira do leito (enfermaria)</label>
                                <label className="laudo-checkbox-label"><input type="radio" name="localExame" value="leito_uti" checked={data.localExame === 'leito_uti'} onChange={handleChange} /> à beira do leito (UTI)</label>
                            </div>
                        </div>

                        <div>
                            <span style={{fontSize:'11px', fontWeight:'bold', display:'block', marginBottom:'3px'}}>posicionamento do paciente</span>
                            <div className="laudo-row">
                                <label className="laudo-checkbox-label"><input type="radio" name="posicaoPaciente" value="nao_citar" checked={data.posicaoPaciente === 'nao_citar'} onChange={handleChange} /> não citar</label>
                                <label className="laudo-checkbox-label"><input type="radio" name="posicaoPaciente" value="decubito_lateral" checked={data.posicaoPaciente === 'decubito_lateral'} onChange={handleChange} /> decúbito lateral</label>
                                <label className="laudo-checkbox-label"><input type="radio" name="posicaoPaciente" value="decubito_dorsal" checked={data.posicaoPaciente === 'decubito_dorsal'} onChange={handleChange} /> decúbito dorsal</label>
                                <label className="laudo-checkbox-label"><input type="radio" name="posicaoPaciente" value="sentado" checked={data.posicaoPaciente === 'sentado'} onChange={handleChange} /> paciente sentado</label>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </>
  );
};

export default SecaoTecnicaEco;