import React from 'react';
import { FaWeight, FaChartLine, FaVenusMars, FaNotesMedical, FaExclamationTriangle, FaCommentMedical } from 'react-icons/fa';

const SecaoConclusao = ({ data, handleChange }) => {
    
  // Lógica Visual: Percentil < 10 fica vermelho (Alerta de RCIU)
  const valorPercentil = parseInt(data.percentil);
  const isRciu = !isNaN(valorPercentil) && valorPercentil < 10;
  
  const estiloPercentil = isRciu 
      ? { width:'60px', background: '#FFEBEE', color: '#D32F2F', borderColor: '#D32F2F', fontWeight: 'bold', textAlign: 'center' }
      : { width:'60px', textAlign: 'center' };

  return (
    <div className="laudo-section" style={{marginBottom: '50px', borderLeft: '4px solid #D32F2F'}}> 
        <div className="header-base header-red">
            <FaNotesMedical size={14} style={{marginRight:'5px'}}/> Conclusão e Diagnóstico
        </div>
        
        <div className="laudo-section-body">
            
            <div className="laudo-grid-2" style={{alignItems:'start', gap:'15px'}}>
                
                {/* BLOCO 1: DADOS BIOMÉTRICOS FINAIS */}
                <div className="laudo-col" style={{background:'#FFEBEE', padding:'10px', borderRadius:'4px', border:'1px solid #FFCDD2'}}>
                    <div style={{fontSize:'11px', fontWeight:'bold', color:'#C62828', marginBottom:'8px', display:'flex', alignItems:'center', gap:'5px'}}>
                        <FaWeight /> DADOS DO FETO
                    </div>

                    {/* Peso */}
                    <div className="laudo-row" style={{marginBottom:'8px', justifyContent:'space-between'}}>
                        <span style={{fontWeight:'bold', fontSize:'11px'}}>Peso Estimado:</span>
                        <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                            <input 
                                type="number" 
                                name="pesoEstimado" 
                                value={data.pesoEstimado} 
                                onChange={handleChange} 
                                className="laudo-input" 
                                style={{width:'70px', fontWeight:'bold', textAlign:'right'}} 
                                disabled={data.semDadosPercentil} 
                                placeholder="0" 
                            />
                            <span style={{fontSize:'10px'}}>g (+/- 10%)</span>
                        </div>
                    </div>

                    {/* Percentil */}
                    <div className="laudo-row" style={{marginBottom:'8px', justifyContent:'space-between'}}>
                        <span style={{fontWeight:'bold', fontSize:'11px', display:'flex', alignItems:'center', gap:'4px'}}>
                            <FaChartLine size={10}/> Percentil:
                        </span>
                        <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                            <input 
                                type="text" 
                                name="percentil" 
                                value={data.percentil} 
                                onChange={handleChange} 
                                className="laudo-input" 
                                style={estiloPercentil} 
                                placeholder="%" 
                                disabled={data.semDadosPercentil} 
                            />
                            {isRciu && <span style={{color: '#D32F2F', fontSize:'9px', fontWeight:'bold'}}>&lt; 10 (RCIU)</span>}
                        </div>
                    </div>

                    {/* Sexo */}
                    <div className="laudo-row" style={{justifyContent:'space-between'}}>
                        <span style={{fontWeight:'bold', fontSize:'11px', display:'flex', alignItems:'center', gap:'4px'}}>
                            <FaVenusMars size={10}/> Sexo:
                        </span>
                        <select name="sexoFetal" value={data.sexoFetal} onChange={handleChange} className="laudo-select" style={{width:'120px', fontWeight:'bold'}}>
                            <option value="NAO_CITAR">Não citar</option>
                            <option value="MASCULINO">Masculino</option>
                            <option value="FEMININO">Feminino</option>
                            <option value="NAO_VISUALIZADO">Não visualizado</option>
                        </select>
                    </div>
                </div>

                {/* BLOCO 2: SUGESTÕES E ALERTAS (Checkboxes) */}
                <div className="laudo-col" style={{background:'#F5F5F5', padding:'10px', borderRadius:'4px', border:'1px solid #E0E0E0'}}>
                    <div style={{fontSize:'11px', fontWeight:'bold', color:'#555', marginBottom:'8px', display:'flex', alignItems:'center', gap:'5px'}}>
                        <FaExclamationTriangle /> NOTAS E SUGESTÕES
                    </div>
                    
                    <div className="laudo-grid-2" style={{gap:'8px'}}>
                        <div className="laudo-col" style={{gap:'4px'}}>
                            <label className="laudo-checkbox-label" title="Sem dados para calcular percentil">
                                <input type="checkbox" name="semDadosPercentil" checked={data.semDadosPercentil} onChange={handleChange} />
                                Sem dados p/ Percentil
                            </label>
                            <label className="laudo-checkbox-label" style={{color:'#D32F2F'}}>
                                <input type="checkbox" name="morfoPrejudicado45mm" checked={data.morfoPrejudicado45mm} onChange={handleChange} />
                                Morfo Prejudicado (CCN&lt;45)
                            </label>
                            <label className="laudo-checkbox-label" style={{color:'#C2185B'}}>
                                <input type="checkbox" name="sugereNipt" checked={data.sugereNipt} onChange={handleChange} />
                                Sugerir NIPT (Risco Alto)
                            </label>
                        </div>

                        <div className="laudo-col" style={{gap:'4px'}}>
                            <label className="laudo-checkbox-label">
                                <input type="checkbox" name="sugereGolfBall" checked={data.sugereGolfBall} onChange={handleChange} />
                                Golf Ball (Foco Ecogênico)
                            </label>
                            <label className="laudo-checkbox-label">
                                <input type="checkbox" name="sugerePieloectasia" checked={data.sugerePieloectasia} onChange={handleChange} />
                                Pieloectasia
                            </label>
                            <label className="laudo-checkbox-label" style={{color:'#E65100', fontWeight:'bold'}}>
                                <input type="checkbox" name="sugereDopplerRciu" checked={data.sugereDopplerRciu} onChange={handleChange} />
                                Sugerir Doppler (RCIU)
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* CAMPO DE OBSERVAÇÃO PADRONIZADO (Inserir antes de fechar a laudo-section) */}
                     <div style={{
                         borderTop: '1px solid #eee', 
                         padding: '10px 12px', // Espaçamento interno para não colar na borda
                         background: '#FAFAFA', 
                         borderBottomLeftRadius: '4px',
                         borderBottomRightRadius: '4px'
                     }}>
                        <div style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px'}}>
                            <FaCommentMedical color="#555"/>
                            <span style={{fontWeight:'bold', fontSize:'11px', color:'#333'}}>Nota Médica (Morfologia):</span>
                        </div>
                <textarea 
                    name="obsAdicionais" 
                    value={data.obsAdicionais} 
                    onChange={handleChange} 
                    className="laudo-textarea"
                    rows="3"
                    style={{
                                width:'100%', 
                                fontSize:'11px', 
                                border:'1px solid #ccc', 
                                borderRadius: '4px', // Bordas arredondadas no campo
                                padding: '8px', // Espaço interno do texto
                                boxSizing: 'border-box' // Garante que não vaze a largura
                            }}
                    placeholder="Digite aqui observações livres para sair no final do laudo..."
                />
            </div>

        </div>
    </div>
  );
};

export default SecaoConclusao;