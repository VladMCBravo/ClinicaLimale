import React from 'react';

const SecaoDadosGerais = ({ data, handleChange, qtdFetos }) => { // <--- Recebendo qtdFetos
  
  // Verifica se é exame inicial (Transvaginal ou Morfológico 1º Tri)
  const isInicial = data.subtipo && (data.subtipo.includes('INICIAL') || data.subtipo.includes('1_TRI'));
  
  // Verifica se é múltipla (Se qtdFetos não for passado, assume 1)
  const isMultipla = qtdFetos > 1;

  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Dados Gerais da Gestação</div>
        
        <div className="laudo-section-body">
            
            {/* 1. SEÇÃO EXCLUSIVA PARA GÊMEOS (Aparece se qtdFetos > 1) */}
            {isMultipla && (
                <div style={{background: '#E3F2FD', padding: '10px', borderRadius: '4px', marginBottom: '15px', border: '1px solid #BBDEFB'}}>
                    <span style={{fontWeight:'bold', color:'#0D47A1', fontSize:'12px', display:'block', marginBottom:'5px'}}>
                        Configuração da Gestação Múltipla:
                    </span>
                    <div className="laudo-grid-3">
                        <div>
                            <span className="label-pequeno">Corionicidade</span>
                            <select name="corionicidade" value={data.corionicidade} onChange={handleChange} className="laudo-select full-width">
                                <option value="dicoriônica">Dicoriônica</option>
                                <option value="monocoriônica">Monocoriônica</option>
                            </select>
                        </div>
                        <div>
                            <span className="label-pequeno">Amnionicidade</span>
                            <select name="amnionicidade" value={data.amnionicidade} onChange={handleChange} className="laudo-select full-width">
                                <option value="diamniótica">Diamniótica</option>
                                <option value="monoamniótica">Monoamniótica</option>
                            </select>
                        </div>
                        <div>
                            <span className="label-pequeno">Localização deste Feto</span>
                            <select name="localizacaoFeto" value={data.localizacaoFeto} onChange={handleChange} className="laudo-select full-width">
                                <option value="">Selecione...</option>
                                <option value="à direita da mãe">à direita da mãe</option>
                                <option value="à esquerda da mãe">à esquerda da mãe</option>
                                <option value="superior / fúndico">superior / fúndico</option>
                                <option value="inferior / prévio">inferior / prévio</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. BEXIGA MATERNA (Sempre aparece) */}
            <div className="laudo-row" style={{marginBottom: '15px'}}>
                <span style={{width: '100px', fontWeight:'bold'}}>Bexiga Materna:</span>
                <select name="bexigaMaterna" value={data.bexigaMaterna} onChange={handleChange} className="laudo-select">
                    <option value="não visualizada">não visualizada</option>
                    <option value="repleta">repleta</option>
                    <option value="vazia">vazia</option>
                    <option value="parcialmente repleta">parcialmente repleta</option>
                </select>
            </div>

            {/* 3. DADOS ESPECÍFICOS DO FETO (Só exibe se NÃO for inicial) */}
            {!isInicial && (
                <>
                    {/* Situação, Apresentação, Dorso */}
                    <div className="laudo-grid-3" style={{marginBottom: '15px'}}>
                        <div>
                            <span className="label-pequeno">Situação</span>
                            <select name="situacao" value={data.situacao} onChange={handleChange} className="laudo-select full-width">
                                <option value="longitudinal">longitudinal</option>
                                <option value="transversa">transversa</option>
                                <option value="oblíqua">oblíqua</option>
                                <option value="variável">variável</option>
                            </select>
                        </div>
                        <div>
                            <span className="label-pequeno">Apresentação</span>
                            <select name="apresentacao" value={data.apresentacao} onChange={handleChange} className="laudo-select full-width">
                                <option value="cefálica">cefálica</option>
                                <option value="pélvica">pélvica</option>
                                <option value="córmica">córmica</option>
                                <option value="variável">variável</option>
                            </select>
                        </div>
                        <div>
                            <span className="label-pequeno">Dorso</span>
                            <select name="dorso" value={data.dorso} onChange={handleChange} className="laudo-select full-width">
                                <option value="à direita">à direita</option>
                                <option value="à esquerda">à esquerda</option>
                                <option value="anterior">anterior</option>
                                <option value="posterior">posterior</option>
                                <option value="variável">variável</option>
                            </select>
                        </div>
                    </div>

                    {/* Vitalidade (BCF + Movimentos) */}
                    <div className="laudo-row" style={{background: '#f8f9fa', padding: '10px', borderRadius: '4px', marginBottom: '10px', border:'1px solid #e0e0e0'}}>
                        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                            <span style={{fontWeight: 'bold'}}>BCF:</span>
                            <input 
                                type="number" 
                                name="bcf" 
                                value={data.bcf} 
                                onChange={handleChange} 
                                className="laudo-input" 
                                style={{width: '70px', fontWeight: 'bold', color:'#2E7D32'}} 
                                placeholder="bpm"
                            /> 
                            <span style={{fontSize:'12px'}}>bpm</span>
                        </div>

                        <div style={{height:'20px', width:'1px', background:'#ccc', margin:'0 15px'}}></div>

                        <label className="laudo-checkbox-label" style={{fontWeight: 'bold', color: '#1565C0', marginRight: '15px'}}>
                            <input type="checkbox" name="movFetal" checked={!!data.movFetal} onChange={handleChange} />
                            Mov. Fetais
                        </label>
                        <label className="laudo-checkbox-label" style={{fontWeight: 'bold', color: '#1565C0'}}>
                            <input type="checkbox" name="degluticao" checked={!!data.degluticao} onChange={handleChange} />
                            Deglutição
                        </label>
                    </div>

                    {/* Vísceras Fetais */}
                    <div style={{display: 'flex', gap: '20px', marginTop:'5px'}}>
                        <label className="laudo-checkbox-label">
                            <input 
                                type="checkbox" 
                                name="estomagoVisualizado" 
                                checked={!!data.estomagoVisualizado} 
                                onChange={handleChange} 
                            /> 
                            Estômago Visível/Repleto
                        </label>
                        <label className="laudo-checkbox-label">
                            <input 
                                type="checkbox" 
                                name="bexigaVisualizada" 
                                checked={!!data.bexigaVisualizada} 
                                onChange={handleChange} 
                            /> 
                            Bexiga Visível/Repleta
                        </label>
                    </div>
                </>
            )}
        </div>
    </div>
  );
};

export default SecaoDadosGerais;