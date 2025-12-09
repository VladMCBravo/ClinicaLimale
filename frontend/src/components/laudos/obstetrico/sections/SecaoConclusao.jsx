import React from 'react';

const SecaoConclusao = ({ data, handleChange }) => {
    // Lógica Visual: Percentil < 10 fica vermelho
  const valorPercentil = parseInt(data.percentil);
  const isRciu = !isNaN(valorPercentil) && valorPercentil < 10;
  const estiloPercentil = isRciu 
      ? { width:'120px', background: '#FFEBEE', color: '#D32F2F', borderColor: '#D32F2F', fontWeight: 'bold' }
      : { width:'120px' };

  return (
    <div className="laudo-section" style={{marginBottom: '50px'}}> 
        <div className="header-base header-red">Conclusão e Diagnóstico</div>
        
        <div className="laudo-section-body">
            
            {/* LINHA PESO E PERCENTIL */}
            <div className="laudo-row" style={{marginBottom: '15px', alignItems: 'center', flexWrap: 'wrap', gap: '10px', opacity: data.semDadosPercentil ? 0.5 : 1}}>
                <div className="laudo-row">
                    <span style={{fontWeight:'bold'}}>Peso Estimado (g):</span>
                    <input type="number" name="pesoEstimado" value={data.pesoEstimado} onChange={handleChange} className="laudo-input" style={{width:'80px', marginLeft:'5px'}} disabled={data.semDadosPercentil} placeholder="g" />
                </div>
                
                {/* REMOVI O INPUT DUPLICADO QUE EXISTIA AQUI ANTES */}
                
                <div className="laudo-row">
                    <span style={{marginLeft:'5px'}}>Percentil:</span>
                    <input 
                        type="text" 
                        name="percentil" 
                        value={data.percentil} 
                        onChange={handleChange} 
                        className="laudo-input" 
                        style={estiloPercentil} 
                        placeholder={data.qtdFetos > 1 ? "Alexander" : "Hadlock"} 
                        disabled={data.semDadosPercentil} 
                    />
                    {isRciu && <span style={{color: '#D32F2F', fontSize:'10px', fontWeight:'bold'}}>&lt; 10 (RCIU)</span>}
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

            {/* --- BLOCO DE FRASES AUTOMÁTICAS --- */}
            <div style={{background: '#f9f9f9', padding: '10px', borderRadius: '4px', marginBottom: '15px', border:'1px solid #eee'}}>
                <span style={{fontWeight:'bold', fontSize:'12px', color:'#D32F2F', display:'block', marginBottom:'8px'}}>
                    Frases Automáticas / Sugestões Clínicas:
                </span>
                
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                    
                    {/* COLUNA 1: Limitações Técnicas */}
                    <div className="laudo-col" style={{gap: '5px'}}>
                        <label className="laudo-checkbox-label" title="Marca que não há dados para cálculo de percentil">
                            <input type="checkbox" name="semDadosPercentil" checked={data.semDadosPercentil} onChange={handleChange} />
                            Sem dados p/ Percentil (DUM/Ant desconhecidos)
                        </label>
                        
                        <label className="laudo-checkbox-label" title="CCN < 45mm no Morfológico 1º Tri">
                            <input type="checkbox" name="morfoPrejudicado45mm" checked={data.morfoPrejudicado45mm} onChange={handleChange} />
                            Morfológico prejudicado (CCN &lt; 45mm)
                        </label>

                        <label className="laudo-checkbox-label">
                            <input type="checkbox" name="sugereNipt" checked={data.sugereNipt} onChange={handleChange} />
                            Sugerir NIPT (Risco Alto)
                        </label>
                    </div>

                    {/* COLUNA 2: Achados Específicos (NOVOS) */}
                    <div className="laudo-col" style={{gap: '5px'}}>
                        <label className="laudo-checkbox-label" title="Insere frase sobre Golf Ball">
                            <input type="checkbox" name="sugereGolfBall" checked={data.sugereGolfBall} onChange={handleChange} />
                            Golf Ball / Foco Ecogênico
                        </label>

                        <label className="laudo-checkbox-label" title="Insere frase sobre Pieloectasia">
                            <input type="checkbox" name="sugerePieloectasia" checked={data.sugerePieloectasia} onChange={handleChange} />
                            Pieloectasia (Dilatação Pielo-calicial)
                        </label>

                        <label className="laudo-checkbox-label" title="Sugerir acompanhamento com Doppler para RCIU">
                            <input type="checkbox" name="sugereRciu" checked={data.sugereRciu} onChange={handleChange} />
                            Sugerir Doppler (RCIU / Oligoâmnio)
                        </label>
                    </div>
                </div>
            </div>

            {/* OBS ADICIONAIS */}
            <div>
                <span style={{fontWeight:'bold', fontSize:'12px'}}>Observações Adicionais:</span>
                <textarea 
                    name="obsAdicionais" 
                    value={data.obsAdicionais} 
                    onChange={handleChange} 
                    className="laudo-textarea"
                    rows="3"
                    style={{width:'100%', marginTop:'5px'}}
                    placeholder="Digite aqui observações livres..."
                />
            </div>

        </div>
    </div>
  );
};

export default SecaoConclusao;