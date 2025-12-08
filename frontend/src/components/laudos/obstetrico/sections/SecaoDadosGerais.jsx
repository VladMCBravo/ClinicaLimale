import React from 'react';

const SecaoDadosGerais = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Dados Gerais e Vitalidade</div>
        <div className="laudo-section-body">
            
            {/* LINHA 1: Bexiga Materna e Posição */}
            <div className="laudo-row" style={{marginBottom: '10px'}}>
                <span className="label-fixo">Bexiga Materna:</span>
                <select name="bexigaMaterna" value={data.bexigaMaterna} onChange={handleChange} className="laudo-select">
                    <option value="não visualizada">não visualizada</option>
                    <option value="repleta">repleta</option>
                    <option value="vazia">vazia</option>
                    <option value="não citar">não citar</option>
                </select>
            </div>

            <div className="laudo-grid-3" style={{marginBottom: '10px'}}>
                <div>
                    <span className="label-pequeno">Situação</span>
                    <select name="situacao" value={data.situacao} onChange={handleChange} className="laudo-select full-width">
                        <option>longitudinal</option>
                        <option>transversa</option>
                        <option>oblíqua</option>
                    </select>
                </div>
                <div>
                    <span className="label-pequeno">Apresentação</span>
                    <select name="apresentacao" value={data.apresentacao} onChange={handleChange} className="laudo-select full-width">
                        <option>cefálica</option>
                        <option>pélvica</option>
                        <option>córmica</option>
                    </select>
                </div>
                <div>
                    <span className="label-pequeno">Dorso</span>
                    <select name="dorso" value={data.dorso} onChange={handleChange} className="laudo-select full-width">
                        <option>à direita</option>
                        <option>à esquerda</option>
                        <option>posterior</option>
                        <option>anterior</option>
                    </select>
                </div>
            </div>

            {/* LINHA 2: Vitalidade */}
            <div className="laudo-row" style={{background: '#f9f9f9', padding: '5px', borderRadius: '4px'}}>
                <span style={{fontWeight: 'bold', marginRight: '5px'}}>BCF:</span>
                <input type="number" name="bcf" value={data.bcf} onChange={handleChange} className="laudo-input" style={{width: '60px'}} /> 
                <span style={{marginRight: '15px'}}>bpm</span>

                <label className="laudo-checkbox-label">
                    <input type="checkbox" name="movFetal" checked={data.movFetal} onChange={handleChange} />
                    Movimentos Fetais Presentes
                </label>
            </div>

            {/* LINHA 3: Vísceras (Estomago e Bexiga) */}
            <div style={{marginTop: '10px', display: 'flex', gap: '20px'}}>
                <label className="laudo-checkbox-label">
                    <input type="checkbox" name="estomagoVisualizado" checked={data.estomagoVisualizado} onChange={handleChange} />
                    Estômago Visível/Repleto
                </label>
                <label className="laudo-checkbox-label">
                    <input type="checkbox" name="bexigaVisualizada" checked={data.bexigaVisualizada} onChange={handleChange} />
                    Bexiga Visível/Repleta
                </label>
            </div>
        </div>
    </div>
  );
};

export default SecaoDadosGerais;