import React from 'react';
import { GiFetus } from 'react-icons/gi';
import { FaHeartbeat, FaLayerGroup } from 'react-icons/fa';

const SecaoDadosGerais = ({ data, handleChange, qtdFetos }) => {
  const isInicial = data.subtipo === 'OBSTETRICO_INICIAL';
  const isMultipla = qtdFetos > 1;

  return (
    <div>    
            {/* BLOCO 1: GEMELAR - Usa classe padrão em vez de cor hardcoded */}
        {isMultipla && (
            <div className="laudo-card-internal">
                <div className="laudo-sub-header">
                    <FaLayerGroup /> CONFIGURAÇÃO GEMELAR
                </div>
                    <div className="laudo-grid-3">
                        <select name="corionicidade" value={data.corionicidade} onChange={handleChange} className="laudo-select full-width">
                            <option value="dicoriônica">Dicoriônica</option>
                            <option value="monocoriônica">Monocoriônica</option>
                        </select>
                        <select name="amnionicidade" value={data.amnionicidade} onChange={handleChange} className="laudo-select full-width">
                            <option value="diamniótica">Diamniótica</option>
                            <option value="monoamniótica">Monoamniótica</option>
                        </select>
                        <select name="localizacaoFeto" value={data.localizacaoFeto} onChange={handleChange} className="laudo-select full-width" style={{fontWeight:'bold', color:'#0D47A1'}}>
                            <option value="">Posição deste feto...</option>
                            <option value="à direita da mãe">à Direita</option>
                            <option value="à esquerda da mãe">à Esquerda</option>
                            <option value="superior / fúndico">Superior</option>
                            <option value="inferior / prévio">Inferior</option>
                        </select>
                    </div>
                </div>
            )}
            {/* BLOCO 2: DADOS ESPECÍFICOS DO FETO */}
            {!isInicial && (
            <div className="laudo-card-internal">
                <div className="laudo-grid-3" style={{marginBottom: '10px'}}>
                    <div>
                <span className="label-pequeno">Situação</span>
                <select name="situacao" value={data.situacao} onChange={handleChange} className="laudo-select full-width">
                    <option value="">Selecione...</option> {/* ADICIONADO */}
                    <option value="longitudinal">Longitudinal</option>
                    <option value="transversa">Transversa</option>
                    <option value="oblíqua">Oblíqua</option>
                    <option value="variável">Variável</option>
                </select>
            </div>
            <div>
                <span className="label-pequeno">Apresentação</span>
                <select name="apresentacao" value={data.apresentacao} onChange={handleChange} className="laudo-select full-width">
                    <option value="">Selecione...</option> {/* ADICIONADO */}
                    <option value="cefálica">Cefálica</option>
                    <option value="pélvica">Pélvica</option>
                    <option value="córmica">Córmica</option>
                    <option value="variável">Variável</option>
                </select>
            </div>
            <div>
                <span className="label-pequeno">Dorso</span>
                <select name="dorso" value={data.dorso} onChange={handleChange} className="laudo-select full-width">
                    <option value="">Selecione...</option> {/* ADICIONADO */}
                    <option value="à direita">à Direita</option>
                    <option value="à esquerda">à Esquerda</option>
                    <option value="anterior">Anterior</option>
                    <option value="posterior">Posterior</option>
                </select>
            </div>
        </div>

                    {/* VITALIDADE - Aqui usamos um estilo inline sutil ou criamos uma classe .bg-success-light se quiser destacar */}
                <div className="laudo-row" style={{justifyContent:'space-between', borderTop:'1px dashed #eee', paddingTop:'8px'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                        <FaHeartbeat color="#00BFA5" /> {/* Verde tema */}
                        <span style={{fontWeight: 'bold', color:'#444'}}>BCF:</span>
                        <input type="number" name="bcf" value={data.bcf} onChange={handleChange} className="laudo-input" style={{width: '60px', fontWeight: 'bold'}} placeholder="bpm"/> 
                    </div>

                        <div style={{display:'flex', gap:'15px'}}>
                            <label className="laudo-checkbox-label" style={{fontWeight: 'bold', color: '#1B5E20', fontSize:'11px'}}>
                                <input type="checkbox" name="movFetal" checked={!!data.movFetal} onChange={handleChange} />
                                Mov. Fetais
                            </label>
                            <label className="laudo-checkbox-label" style={{fontWeight: 'bold', color: '#1B5E20', fontSize:'11px'}}>
                                <input type="checkbox" name="degluticao" checked={!!data.degluticao} onChange={handleChange} />
                                Deglutição
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
  );
};

export default SecaoDadosGerais;