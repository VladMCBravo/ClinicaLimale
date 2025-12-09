import React from 'react';

const SecaoConclusao = ({ data, handleChange }) => {
  return (
    <div className="laudo-section" style={{marginBottom: '50px'}}> {/* Margem extra p/ fim da página */}
        <div className="header-base header-red">Conclusão e Diagnóstico</div>
        
        <div className="laudo-section-body">
            
            {/* LINHA PESO (Mantenha igual, mas vamos adicionar lógica visual) */}
            <div className="laudo-row" style={{marginBottom: '15px', alignItems: 'center', flexWrap: 'wrap', gap: '10px', opacity: data.semDadosPercentil ? 0.5 : 1}}>
                <div className="laudo-row">
                    <span style={{fontWeight:'bold'}}>Peso Estimado (g):</span>
                    <input type="number" name="pesoEstimado" value={data.pesoEstimado} onChange={handleChange} className="laudo-input" style={{width:'80px', marginLeft:'5px'}} disabled={data.semDadosPercentil} />
                </div>
                
                <div className="laudo-row" style={{background:'#FFF3E0', padding:'2px 8px', borderRadius:'4px', border:'1px solid #FFE0B2'}}>
                    <span className="label-pequeno">P10:</span>
                    <input type="number" name="pesoP10" value={data.pesoP10} onChange={handleChange} className="laudo-input-small" style={{width:'50px'}} disabled={data.semDadosPercentil} />
                    <span className="label-pequeno" style={{marginLeft:'10px'}}>P90:</span>
                    <input type="number" name="pesoP90" value={data.pesoP90} onChange={handleChange} className="laudo-input-small" style={{width:'50px'}} disabled={data.semDadosPercentil} />
                </div>

                <div className="laudo-row">
                    <span style={{marginLeft:'5px'}}>Percentil:</span>
                    <input type="text" name="percentil" value={data.percentil} onChange={handleChange} className="laudo-input" style={{width:'120px'}} placeholder="ex: 32% Hadlock" disabled={data.semDadosPercentil} />
                </div>
            </div>

            {/* SEXO */}
            <div className="laudo-row" style={{marginBottom: '10px'}}>
                <span style={{fontWeight:'bold'}}>Sexo Fetal:</span>
                <select name="sexoFetal" value={data.sexoFetal} onChange={handleChange} className="laudo-select">
                    <option value="NAO_CITAR">Não citar</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMININO">Feminino</option>
                    <option value="NAO_VISUALIZADO">Não visualizado</option>
                </select>
            </div>

            {/* --- NOVAS FRASES PRONTAS (CHECKBOXES) --- */}
            <div style={{background: '#f0f0f0', padding: '10px', borderRadius: '4px', marginBottom: '15px'}}>
                <span style={{fontWeight:'bold', fontSize:'12px', color:'#D32F2F', display:'block', marginBottom:'5px'}}>Frases Automáticas / Sugestões:</span>
                
                <div className="laudo-col" style={{gap: '8px'}}>
                    {/* Frase 2: Sem Dados para Percentil */}
                    <label className="laudo-checkbox-label">
                        <input type="checkbox" name="semDadosPercentil" checked={data.semDadosPercentil} onChange={handleChange} />
                        "Não foi possível informar o percentil (falta exame ant/DUM)"
                    </label>

                    {/* Frase 1: Sugerir Doppler (RCIU) */}
                    <label className="laudo-checkbox-label">
                        <input type="checkbox" name="sugereDopplerRciu" checked={data.sugereDopplerRciu} onChange={handleChange} />
                        "Sugerir Doppler (Percentil &lt; 10 / RCIU)"
                    </label>

                    {/* Frase 3: Morfológico Prejudicado (CCN < 45) */}
                    <label className="laudo-checkbox-label">
                        <input type="checkbox" name="morfoPrejudicado45mm" checked={data.morfoPrejudicado45mm} onChange={handleChange} />
                        "Morfológico prejudicado (CCN &lt; 45mm) - Refazer 11-14 sem"
                    </label>

                    {/* Frase 4: Sugerir NIPT */}
                    <label className="laudo-checkbox-label">
                        <input type="checkbox" name="sugereNipt" checked={data.sugereNipt} onChange={handleChange} />
                        "Sugerir Estudo Genético (NIPT) - Risco alto"
                    </label>
                </div>
            </div>

            {/* OBS ADICIONAIS (Texto Livre) */}
            <div>
                <span style={{fontWeight:'bold', fontSize:'12px'}}>Observações Adicionais:</span>
                <textarea 
                    name="obsAdicionais" 
                    value={data.obsAdicionais} 
                    onChange={handleChange} 
                    className="laudo-textarea"
                    rows="3"
                    style={{width:'100%', marginTop:'5px'}}
                />
            </div>

        </div>
    </div>
  );
};

export default SecaoConclusao;