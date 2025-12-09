import React from 'react';

const SecaoDadosGerais = ({ data, handleChange }) => {
  
  // Verifica se é exame inicial (Transvaginal ou Morfológico 1º Tri)
  // Nesses casos, a anatomia básica é descrita em outras seções ou não se aplica 'Situação/Apresentação' clássica
  const isInicial = data.subtipo && (data.subtipo.includes('INICIAL') || data.subtipo.includes('1_TRI'));

  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Dados Gerais</div>
        
        <div className="laudo-section-body">
            
            {/* 1. Bexiga Materna (Sempre aparece, em qualquer IG) */}
            <div className="laudo-row" style={{marginBottom: '15px'}}>
                <span style={{width: '100px'}}>Bexiga Materna:</span>
                <select name="bexigaMaterna" value={data.bexigaMaterna} onChange={handleChange} className="laudo-select">
                    <option value="não visualizada">não visualizada</option>
                    <option value="repleta">repleta</option>
                    <option value="vazia">vazia</option>
                </select>
            </div>

            {/* 2. DADOS GERAIS DO FETO (Só exibe se NÃO for inicial) */}
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
                            </select>
                        </div>
                        <div>
                            <span className="label-pequeno">Apresentação</span>
                            <select name="apresentacao" value={data.apresentacao} onChange={handleChange} className="laudo-select full-width">
                                <option value="cefálica">cefálica</option>
                                <option value="pélvica">pélvica</option>
                                <option value="córmica">córmica</option>
                            </select>
                        </div>
                        <div>
                            <span className="label-pequeno">Dorso</span>
                            <select name="dorso" value={data.dorso} onChange={handleChange} className="laudo-select full-width">
                                <option value="à direita">à direita</option>
                                <option value="à esquerda">à esquerda</option>
                                <option value="anterior">anterior</option>
                            </select>
                        </div>
                    </div>

                    {/* Vitalidade (BCF + Movimentos) */}
                    <div className="laudo-row" style={{background: '#f8f9fa', padding: '8px', borderRadius: '4px', marginBottom: '10px'}}>
                        <span style={{fontWeight: 'bold', marginRight: '5px'}}>BCF:</span>
                        <input type="number" name="bcf" value={data.bcf} onChange={handleChange} className="laudo-input" style={{width: '60px', fontWeight: 'bold'}} /> 
                        <span style={{marginRight: '20px'}}>bpm</span>

                        <label className="laudo-checkbox-label" style={{fontWeight: 'bold', color: '#1565C0', marginRight: '15px'}}>
                            <input type="checkbox" name="movFetal" checked={data.movFetal} onChange={handleChange} />
                            Mov. Fetais
                        </label>
                        <label className="laudo-checkbox-label" style={{fontWeight: 'bold', color: '#1565C0'}}>
                            <input type="checkbox" name="degluticao" checked={data.degluticao} onChange={handleChange} />
                            Deglutição
                        </label>
                    </div>

                    {/* Vísceras Fetais (Estômago e Bexiga) - Elas estão AQUI */}
                    <div style={{display: 'flex', gap: '20px'}}>
                        <label className="laudo-checkbox-label">
                            <input 
                                type="checkbox" 
                                name="estomagoVisualizado" 
                                checked={data.estomagoVisualizado} 
                                onChange={handleChange} 
                            /> 
                            Estômago Visível/Repleto
                        </label>
                        <label className="laudo-checkbox-label">
                            <input 
                                type="checkbox" 
                                name="bexigaVisualizada" 
                                checked={data.bexigaVisualizada} 
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