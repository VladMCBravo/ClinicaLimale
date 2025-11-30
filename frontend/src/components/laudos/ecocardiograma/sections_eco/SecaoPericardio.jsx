import React from 'react';

const SecaoPericardio = ({ data, handleChange }) => {
  const temDerrame = data.pericardioDerra !== 'sem_derrame';

  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Pericárdio</div>
        <div className="laudo-section-body">
            
            <div style={{display:'flex', gap:'15px'}}>
                {/* COLUNA 1: TIPO DE DERRAME */}
                <div style={{flex: 1}}>
                    <label className="laudo-checkbox-label" style={{display:'block', marginBottom:'3px', fontWeight:'bold', color:'#1565C0'}}>
                        <input type="radio" name="pericardioDerra" value="sem_derrame" checked={data.pericardioDerra === 'sem_derrame'} onChange={handleChange} />
                        sem derrame
                    </label>
                    <label className="laudo-checkbox-label" style={{display:'block', marginBottom:'3px'}}>
                        <input type="radio" name="pericardioDerra" value="discreto" checked={data.pericardioDerra === 'discreto'} onChange={handleChange} />
                        com derrame discreto
                    </label>
                    <label className="laudo-checkbox-label" style={{display:'block', marginBottom:'3px'}}>
                        <input type="radio" name="pericardioDerra" value="discreto_moderado" checked={data.pericardioDerra === 'discreto_moderado'} onChange={handleChange} />
                        com derrame discreto/moderado
                    </label>
                    <label className="laudo-checkbox-label" style={{display:'block', marginBottom:'3px'}}>
                        <input type="radio" name="pericardioDerra" value="moderado" checked={data.pericardioDerra === 'moderado'} onChange={handleChange} />
                        com derrame moderado
                    </label>
                    <label className="laudo-checkbox-label" style={{display:'block', marginBottom:'3px'}}>
                        <input type="radio" name="pericardioDerra" value="moderado_importante" checked={data.pericardioDerra === 'moderado_importante'} onChange={handleChange} />
                        com derrame moderado/importante
                    </label>
                    <label className="laudo-checkbox-label" style={{display:'block', marginBottom:'3px'}}>
                        <input type="radio" name="pericardioDerra" value="importante" checked={data.pericardioDerra === 'importante'} onChange={handleChange} />
                        com derrame importante
                    </label>
                </div>

                {/* COLUNA 2: CARACTERÍSTICAS (Checkbox) */}
                <div style={{flex: 1, borderLeft:'1px solid #eee', paddingLeft:'10px', opacity: temDerrame ? 1 : 0.4, pointerEvents: temDerrame ? 'auto' : 'none'}}>
                    <div style={{fontSize:'10px', fontWeight:'bold', color:'#999', marginBottom:'5px'}}>Características do derrame</div>
                    <label className="laudo-checkbox-label" style={{display:'block'}}>
                        <input type="checkbox" name="periLoculado" checked={data.periLoculado} onChange={handleChange} /> loculado
                    </label>
                    <label className="laudo-checkbox-label" style={{display:'block'}}>
                        <input type="checkbox" name="periCircunferencial" checked={data.periCircunferencial} onChange={handleChange} /> circunferencial
                    </label>
                    <label className="laudo-checkbox-label" style={{display:'block'}}>
                        <input type="checkbox" name="periHomogeneo" checked={data.periHomogeneo} onChange={handleChange} /> conteúdo homogêneo
                    </label>
                    <label className="laudo-checkbox-label" style={{display:'block'}}>
                        <input type="checkbox" name="periHeterogeneo" checked={data.periHeterogeneo} onChange={handleChange} /> conteúdo heterogêneo
                    </label>
                </div>
            </div>

            {/* RODAPÉ: REPERCUSSÃO */}
            <div style={{marginTop:'10px', border:'1px solid #f0f0f0', padding:'5px', opacity: temDerrame ? 1 : 0.4, pointerEvents: temDerrame ? 'auto' : 'none'}}>
                <div style={{fontSize:'10px', fontWeight:'bold', color:'#999', marginBottom:'5px'}}>Repercussão hemodinâmica do derrame</div>
                <div className="laudo-row">
                    <label className="laudo-checkbox-label" style={{marginRight:'15px'}}>
                        <input type="radio" name="periRepercussao" value="nao_citar" checked={data.periRepercussao === 'nao_citar'} onChange={handleChange} /> não citar
                    </label>
                    <label className="laudo-checkbox-label" style={{marginRight:'15px'}}>
                        <input type="radio" name="periRepercussao" value="sem_repercussao" checked={data.periRepercussao === 'sem_repercussao'} onChange={handleChange} /> sem repercussão hemodinâmica
                    </label>
                    <label className="laudo-checkbox-label">
                        <input type="radio" name="periRepercussao" value="com_repercussao" checked={data.periRepercussao === 'com_repercussao'} onChange={handleChange} /> com repercussão hemodinâmica
                    </label>
                </div>
            </div>

        </div>
    </div>
  );
};

export default SecaoPericardio;