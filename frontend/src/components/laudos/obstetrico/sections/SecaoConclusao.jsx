import React from 'react';

const SecaoConclusao = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-green">Conclusão</div>
        <div className="laudo-section-body">
            
            {/* Desenvolvimento / Geral */}
            <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                <input type="checkbox" name="conclusaoNormal" checked={data.conclusaoNormal} onChange={handleChange} /> 
                Concluir GESTAÇÃO EM CURSO / DESENVOLVIMENTO ADEQUADO
            </label>

            {/* Morfologia */}
            <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                <input type="checkbox" name="conclusaoMorfologiaNormal" checked={data.conclusaoMorfologiaNormal} onChange={handleChange} /> 
                Concluir MORFOLOGIA FETAL como NORMAL
            </label>

            {/* Doppler (Só aparece se Doppler estiver ativo) */}
            {data.usarDoppler && (
                <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                    <input type="checkbox" name="conclusaoDopplerNormal" checked={data.conclusaoDopplerNormal} onChange={handleChange} /> 
                    Concluir ESTUDO DOPPLERFLUXOMÉTRICO como NORMAL
                </label>
            )}

            {/* TN (Só aparece se TN foi citada) */}
            {data.citarTn && (
                <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                    <input type="checkbox" name="conclusaoTnNormal" checked={data.conclusaoTnNormal} onChange={handleChange} /> 
                    Concluir TRANSLUCÊNCIA NUCAL como NORMAL
                </label>
            )}
            
            <div style={{marginTop: '10px'}}>
                <span style={{fontWeight:'bold'}}>Observações adicionais / Texto Livre:</span>
                <textarea 
                    name="obsAdicionais" 
                    value={data.obsAdicionais} 
                    onChange={handleChange}
                    className="laudo-input"
                    placeholder="Digite aqui observações extras ou uma conclusão personalizada..."
                    style={{width:'100%', height:'60px', marginTop:'5px', fontFamily:'Arial'}} 
                />
            </div>
            
            <div style={{fontSize: '10px', color: '#666', marginTop: '5px', fontStyle: 'italic'}}>
                * Se nenhum item for marcado, o sistema tentará gerar uma conclusão baseada nos achados do exame.
            </div>
        </div>
    </div>
  );
};

export default SecaoConclusao;