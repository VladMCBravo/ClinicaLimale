import React from 'react';

const RadioGroup = ({ title, name, options, currentValue, onChange }) => (
    <div style={{marginBottom:'8px', border:'1px solid #eee', padding:'4px', borderRadius:'3px'}}>
        <div style={{fontSize:'10px', fontWeight:'bold', color:'#333', marginBottom:'3px', borderBottom:'1px solid #f0f0f0'}}>{title}</div>
        <div style={{display:'flex', flexDirection:'column', gap:'1px'}}>
            {options.map((opt) => (
                <label key={opt.val} className="laudo-checkbox-label" style={{fontSize:'10px'}}>
                    <input type="radio" name={name} value={opt.val} checked={currentValue === opt.val} onChange={onChange} />
                    {opt.label}
                </label>
            ))}
        </div>
    </div>
);

const SecaoValvaPulmonar = ({ data, handleChange }) => {
  return (
    <>
        {/* ARTÉRIA PULMONAR */}
        <div className="laudo-section">
            <div className="header-base header-blue">Artéria pulmonar</div>
            <div className="laudo-section-body">
                <label className="laudo-checkbox-label" style={{display:'block'}}>
                    <input type="radio" name="artPulmonar" value="normal" checked={data.artPulmonar === 'normal'} onChange={handleChange} />
                    Artéria pulmonar com calibre dentro dos limites da normalidade.
                </label>
                <label className="laudo-checkbox-label" style={{display:'block'}}>
                    <input type="radio" name="artPulmonar" value="ectasia" checked={data.artPulmonar === 'ectasia'} onChange={handleChange} />
                    Ectasia da artéria pulmonar.
                </label>
                <label className="laudo-checkbox-label" style={{display:'block', marginBottom:'8px'}}>
                    <input type="radio" name="artPulmonar" value="dificil" checked={data.artPulmonar === 'dificil'} onChange={handleChange} />
                    Artéria pulmonar de difícil acesso, impedindo análise satisfatória
                </label>

                <div style={{borderTop:'1px solid #eee', paddingTop:'5px'}}>
                    <label className="laudo-checkbox-label" style={{display:'block'}}>
                        <input type="checkbox" name="sinaisHipertensao" checked={data.sinaisHipertensao} onChange={handleChange} />
                        Presença de sinais indiretos de hipertensão pulmonar.
                    </label>
                    <label className="laudo-checkbox-label" style={{display:'block', marginBottom:'5px'}}>
                        <input type="checkbox" name="ausenciaSinaisHipertensao" checked={data.ausenciaSinaisHipertensao} onChange={handleChange} />
                        Ausência de sinais indiretos de hipertensão pulmonar.
                    </label>

                    <div className="laudo-row">
                        <input type="checkbox" name="checkPsap" checked={data.checkPsap} onChange={handleChange} />
                        <span style={{fontSize:'11px', marginLeft:'5px', width:'180px'}}>Pressão sistólica da artéria pulmonar</span>
                        <input type="number" name="psap" value={data.psap} onChange={handleChange} disabled={!data.checkPsap} className="laudo-input" style={{width:'40px'}} />
                        <span style={{fontSize:'10px', marginLeft:'5px'}}>mmHg</span>
                    </div>
                    <div className="laudo-row" style={{marginTop:'3px'}}>
                        <input type="checkbox" name="checkPmap" checked={data.checkPmap} onChange={handleChange} />
                        <span style={{fontSize:'11px', marginLeft:'5px', width:'180px'}}>Pressão média da artéria pulmonar</span>
                        <input type="number" name="pmap" value={data.pmap} onChange={handleChange} disabled={!data.checkPmap} className="laudo-input" style={{width:'40px'}} />
                        <span style={{fontSize:'10px', marginLeft:'5px'}}>mmHg</span>
                    </div>
                </div>
            </div>
        </div>

        {/* VALVA PULMONAR */}
        <div className="laudo-section">
            <div className="header-base header-purple">VALVA PULMONAR</div>
            <div className="laudo-section-body">
                 <div style={{marginBottom:'10px', borderBottom:'1px dashed #ccc', paddingBottom:'5px'}}>
                    <label className="laudo-checkbox-label" style={{display:'block'}}><input type="radio" name="pulEstenose" value="ausente" checked={data.pulEstenose==='ausente'} onChange={handleChange}/> estenose ausente</label>
                    
                    <div className="laudo-row">
                        <input type="radio" name="pulEstenose" value="discreta" checked={data.pulEstenose==='discreta'} onChange={handleChange}/> 
                        <span style={{fontSize:'10px'}}>discreta (pico &gt;4 m/s e grad &gt;64)</span>
                    </div>
                     <div className="laudo-row">
                        <input type="radio" name="pulEstenose" value="moderada" checked={data.pulEstenose==='moderada'} onChange={handleChange}/> 
                        <span style={{fontSize:'10px'}}>moderada (pico 3-4 m/s e grad 36-64)</span>
                    </div>
                     <div className="laudo-row">
                        <input type="radio" name="pulEstenose" value="severa" checked={data.pulEstenose==='severa'} onChange={handleChange}/> 
                        <span style={{fontSize:'10px'}}>severa (pico &lt;3 m/s e grad &lt;36)</span>
                    </div>

                    <div className="laudo-row" style={{marginTop:'3px', marginLeft:'15px'}}>
                        <span style={{fontSize:'10px', color:'#777'}}>pico de velocidade</span>
                        <input name="pulPicoVel" value={data.pulPicoVel} onChange={handleChange} className="laudo-input" style={{width:'30px', margin:'0 5px'}} disabled={data.pulEstenose==='ausente'}/>
                        <span style={{fontSize:'10px', color:'#777'}}>m/s</span>
                    </div>
                    <div className="laudo-row" style={{marginTop:'2px', marginLeft:'15px'}}>
                        <span style={{fontSize:'10px', color:'#777'}}>pico de gradiente</span>
                        <input name="pulPicoGrad" value={data.pulPicoGrad} onChange={handleChange} className="laudo-input" style={{width:'30px', margin:'0 5px'}} disabled={data.pulEstenose==='ausente'}/>
                        <span style={{fontSize:'10px', color:'#777'}}>mmHg</span>
                    </div>
                 </div>

                 <div className="laudo-grid-2">
                     <RadioGroup 
                        title="espessura" name="pulAspecto" currentValue={data.pulAspecto} onChange={handleChange}
                        options={[
                            {val: 'normal', label: 'normal'},
                            {val: 'espessamento', label: 'espessamento'},
                            {val: 'espessamento_discreto', label: 'espessamento discreto'},
                            {val: 'fibrocalcificacao', label: 'fibrocalcificação'},
                            {val: 'calcificacao', label: 'calcificação'},
                        ]}
                     />
                     <RadioGroup 
                        title="refluxo" name="pulRefluxo" currentValue={data.pulRefluxo} onChange={handleChange}
                        options={[
                            {val: 'ausente', label: 'ausente'},
                            {val: 'discreto', label: 'discreto'},
                            {val: 'discreto_moderado', label: 'discreto/moderado'},
                            {val: 'moderado', label: 'moderado'},
                            {val: 'importante', label: 'importante'},
                        ]}
                     />
                 </div>
            </div>
        </div>
    </>
  );
};

export default SecaoValvaPulmonar;