import React from 'react';
import { GiFetus, GiWaterDrop } from 'react-icons/gi';
import { FaHeartbeat, FaChild, FaLayerGroup } from 'react-icons/fa';

const SecaoDadosGerais = ({ data, handleChange, qtdFetos }) => {
  // CORREÇÃO: Removi '1_TRI' da verificação. 
  // Agora ele só esconde os dados se for "OBSTETRICO_INICIAL" (aquele de 6-9 semanas)
  const isInicial = data.subtipo === 'OBSTETRICO_INICIAL';
  
  const isMultipla = qtdFetos > 1;

  return (
    <div className="laudo-section">
        <div className="header-base header-blue">
            <GiFetus size={16} style={{marginRight:'5px'}}/> Dados Gerais e Estática Fetal
        </div>
        
        <div className="laudo-section-body">
            
            {/* BLOCO 1: GESTAÇÃO MÚLTIPLA (SÓ APARECE SE GEMELAR) */}
            {isMultipla && (
                <div style={{background: '#E3F2FD', padding: '8px', borderRadius: '4px', marginBottom: '10px', border: '1px solid #90CAF9'}}>
                    <div style={{fontWeight:'bold', color:'#0D47A1', fontSize:'11px', display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px'}}>
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

            {/* BLOCO 2: BEXIGA E ESTÁTICA (Lado a Lado) */}
            <div className="laudo-grid-2" style={{alignItems:'start', gap:'15px'}}>
                
                {/* Coluna Esquerda: Bexiga Materna */}
                <div className="laudo-row" style={{background:'#F5F5F5', padding:'5px', borderRadius:'4px'}}>
                    <span style={{fontWeight:'bold', fontSize:'11px', minWidth:'80px'}}>Bexiga Materna:</span>
                    <select name="bexigaMaterna" value={data.bexigaMaterna} onChange={handleChange} className="laudo-select full-width">
                        <option value="não visualizada">não visualizada</option>
                        <option value="repleta">repleta</option>
                        <option value="vazia">vazia</option>
                        <option value="parcialmente repleta">parcialmente repleta</option>
                    </select>
                </div>

                {/* Coluna Direita: Vísceras (Se não inicial) */}
                {!isInicial && (
                    <div className="laudo-row" style={{justifyContent:'flex-end', fontSize:'11px'}}>
                        <label className="laudo-checkbox-label" style={{marginRight:'10px'}}>
                            <input type="checkbox" name="estomagoVisualizado" checked={!!data.estomagoVisualizado} onChange={handleChange} /> 
                            Estômago
                        </label>
                        <label className="laudo-checkbox-label">
                            <input type="checkbox" name="bexigaVisualizada" checked={!!data.bexigaVisualizada} onChange={handleChange} /> 
                            Bexiga
                        </label>
                    </div>
                )}
            </div>

            {/* BLOCO 3: DADOS ESPECÍFICOS DO FETO */}
{!isInicial && (
    <div style={{marginTop:'10px', background:'#FAFAFA', padding:'8px', borderRadius:'4px', border:'1px solid #EEE'}}>
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

                    {/* VITALIDADE (Verde) */}
                    <div className="laudo-row" style={{background: '#E8F5E9', padding: '6px 10px', borderRadius: '4px', border:'1px solid #C8E6C9', justifyContent:'space-between'}}>
                        <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                            <FaHeartbeat color="#2E7D32" />
                            <span style={{fontWeight: 'bold', color:'#2E7D32'}}>BCF:</span>
                            <input type="number" name="bcf" value={data.bcf} onChange={handleChange} className="laudo-input" style={{width: '60px', fontWeight: 'bold', color:'#2E7D32'}} placeholder="bpm"/> 
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
    </div>
  );
};

export default SecaoDadosGerais;