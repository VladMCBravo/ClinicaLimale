import React from 'react';

const RadioItem = ({ label, name, value, checkedValue, onChange }) => (
    <label className="laudo-checkbox-label" style={{display:'block', marginBottom:'2px'}}>
        <input type="radio" name={name} value={value} checked={checkedValue === value} onChange={onChange} />
        {label}
    </label>
);

const SecaoAortaVenaCava = ({ data, handleChange }) => {
  return (
    <>
        {/* AORTA */}
        <div className="laudo-section">
            <div className="header-base header-blue">Aorta</div>
            <div className="laudo-section-body">
                <RadioItem label="Diâmetro normal" name="aortaEstrutura" value="normal" checkedValue={data.aortaEstrutura} onChange={handleChange} style={{fontWeight:'bold', color:'#1565C0'}} />
                
                <div className="laudo-row" style={{alignItems:'flex-start'}}>
                    <input type="radio" name="aortaEstrutura" value="ectasia" checked={data.aortaEstrutura === 'ectasia'} onChange={handleChange} style={{marginTop:'3px'}} />
                    <div style={{marginLeft:'5px'}}>
                        <span style={{fontSize:'11px', fontWeight:'bold'}}>Ectasia</span>
                        <label className="laudo-checkbox-label" style={{display:'block'}}>
                            <input type="checkbox" name="aortaEctasiaRaiz" checked={data.aortaEctasiaRaiz} onChange={handleChange} disabled={data.aortaEstrutura !== 'ectasia'} /> raiz da aorta
                        </label>
                        <label className="laudo-checkbox-label" style={{display:'block'}}>
                            <input type="checkbox" name="aortaEctasiaAsc" checked={data.aortaEctasiaAsc} onChange={handleChange} disabled={data.aortaEstrutura !== 'ectasia'} /> aorta ascendente
                        </label>
                         <label className="laudo-checkbox-label" style={{display:'block'}}>
                            <input type="checkbox" name="aortaEctasiaArco" checked={data.aortaEctasiaArco} onChange={handleChange} disabled={data.aortaEstrutura !== 'ectasia'} /> arco aórtico
                        </label>
                    </div>
                </div>

                <div style={{marginTop:'5px', borderTop:'1px solid #eee', paddingTop:'5px'}}>
                    <label className="laudo-checkbox-label" style={{display:'block'}}><input type="checkbox" name="aortaObsNaoVis" checked={data.aortaObsNaoVis} onChange={handleChange} /> Arco aórtico não visualizado de forma satisfatória para análise.</label>
                    <label className="laudo-checkbox-label" style={{display:'block'}}><input type="checkbox" name="aortaPlacas" checked={data.aortaPlacas} onChange={handleChange} /> Sinais de placas de ateroma na curvatura interna do arco aórtico.</label>
                    <label className="laudo-checkbox-label" style={{display:'block'}}><input type="checkbox" name="aortaAteromatose" checked={data.aortaAteromatose} onChange={handleChange} /> Ateromatose discreta no arco aórtico</label>
                    <label className="laudo-checkbox-label" style={{display:'block'}}><input type="checkbox" name="aortaDisseccao" checked={data.aortaDisseccao} onChange={handleChange} /> Dissecção da aorta</label>
                </div>
            </div>
        </div>

        {/* VEIA CAVA INFERIOR */}
        <div className="laudo-section">
            <div className="header-base header-blue">Veia Cava Inferior</div>
            <div className="laudo-section-body">
                <RadioItem label="não citar" name="veiaCava" value="nao_citar" checkedValue={data.veiaCava} onChange={handleChange} />
                <RadioItem label="Veia cava inferior com calibre normal e variação respiratória > 50%" name="veiaCava" value="normal_maior" checkedValue={data.veiaCava} onChange={handleChange} />
                <RadioItem label="Veia cava inferior com calibre normal e variação respiratória < 50%" name="veiaCava" value="normal_menor" checkedValue={data.veiaCava} onChange={handleChange} />
                <RadioItem label="Veia cava inferior com calibre aumentado e variação respiratória > 50%" name="veiaCava" value="aum_maior" checkedValue={data.veiaCava} onChange={handleChange} />
                <RadioItem label="Veia cava inferior com calibre aumentado e variação respiratória < 50%" name="veiaCava" value="aum_menor" checkedValue={data.veiaCava} onChange={handleChange} />
            </div>
        </div>
    </>
  );
};

export default SecaoAortaVenaCava;