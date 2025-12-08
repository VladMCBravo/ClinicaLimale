import React from 'react';

const SecaoDadosGerais = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        {/* TÍTULO VISUAL AZUL */}
        <div className="header-base header-blue">Dados Gerais e Vitalidade</div>
        
        <div className="laudo-section-body">
            
            {/* LINHA 1: Bexiga */}
            <div className="laudo-row" style={{marginBottom: '15px'}}>
                <span style={{width: '100px'}}>Bexiga Materna:</span>
                <select 
                    name="bexigaMaterna" 
                    value={data.bexigaMaterna} 
                    onChange={handleChange} 
                    className="laudo-select"
                >
                    <option value="não visualizada">não visualizada</option>
                    <option value="repleta">repleta</option>
                    <option value="vazia">vazia</option>
                    <option value="não citar">não citar</option>
                </select>
            </div>

            {/* LINHA 2: Situação, Apresentação, Dorso */}
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
                        <option value="posterior">posterior</option>
                    </select>
                </div>
            </div>

            {/* LINHA 3: Vitalidade (BCF) - Fundo cinza suave */}
            <div className="laudo-row" style={{background: '#f8f9fa', padding: '8px', borderRadius: '4px', marginBottom: '10px'}}>
                <span style={{fontWeight: 'bold', marginRight: '5px'}}>BCF:</span>
                <input 
                    type="number" 
                    name="bcf" 
                    value={data.bcf} 
                    onChange={handleChange} 
                    className="laudo-input" 
                    style={{width: '60px', fontWeight: 'bold'}} 
                /> 
                <span style={{marginRight: '20px'}}>bpm</span>

                <label className="laudo-checkbox-label" style={{fontWeight: 'bold', color: '#1565C0'}}>
                    <input 
                        type="checkbox" 
                        name="movFetal" 
                        checked={data.movFetal} 
                        onChange={handleChange} 
                    />
                    Movimentos Fetais Presentes
                </label>
            </div>

            {/* LINHA 4: Vísceras Fetais */}
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

        </div>
    </div>
  );
};

export default SecaoDadosGerais;