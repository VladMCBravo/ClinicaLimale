// src/components/laudos/trasnvaginal/sections/SecaoUteroTuring.jsx
import React from 'react';
import { FaImage } from 'react-icons/fa';

const SecaoUteroTuring = ({ data, handleChange, setShowModalFigo }) => {
  return (
    <div className="laudo-section" style={{borderTop: '3px solid #5c6bc0'}}>
      <div className="laudo-header-dark" style={{background: '#5c6bc0', color:'white', padding:'4px 8px'}}>Útero</div>
      
      {/* STATUS */}
      <div className="laudo-group-box">
          <div className="laudo-row">
              <label style={{fontWeight:'bold'}}>Status hormonal</label>
              <div style={{marginLeft:'10px'}}>
                  <label style={{marginRight:'10px'}}><input type="radio" name="statusHormonal" value="menopausada" checked={data.statusHormonal === 'menopausada'} onChange={handleChange} /> menopausada</label>
                  <label><input type="radio" name="statusHormonal" value="idade_fertil" checked={data.statusHormonal === 'idade_fertil'} onChange={handleChange} /> idade fértil</label>
              </div>
              
              {data.statusHormonal === 'idade_fertil' && (
                  <div style={{marginLeft:'auto', display:'flex', alignItems:'center'}}>
                      <label style={{fontSize:'11px', marginRight:'5px'}}>gesta</label>
                      <input type="number" name="gesta" value={data.gesta} onChange={handleChange} className="laudo-input-small" style={{width:'40px'}}/>
                  </div>
              )}
          </div>
          <div className="laudo-row">
               <label><input type="checkbox" name="incluirDum" checked={data.incluirDum} onChange={handleChange} /> incluir D.U.M:</label>
               {data.incluirDum && <input type="date" name="dum" value={data.dum} onChange={handleChange} className="laudo-input" style={{marginLeft:'5px'}} />}
          </div>
      </div>

      {/* BIOMETRIA */}
      <div className="laudo-row" style={{marginTop:'5px'}}>
          <select name="posicaoUtero" value={data.posicaoUtero} onChange={handleChange} className="laudo-select" style={{width: '130px', fontWeight:'bold'}}>
              <option value="anteversoflexão">anteversoflexão</option>
              <option value="retroversoflexão">retroversoflexão</option>
              <option value="mediano">mediano</option>
          </select>
          <div style={{display:'flex', alignItems:'center', gap:'2px', marginLeft:'auto'}}>
              <input type="number" name="ut1" value={data.ut1} onChange={handleChange} className="laudo-input-small" style={{color:'red', fontWeight:'bold'}} /> x
              <input type="number" name="ut2" value={data.ut2} onChange={handleChange} className="laudo-input-small" style={{color:'red', fontWeight:'bold'}} /> x
              <input type="number" name="ut3" value={data.ut3} onChange={handleChange} className="laudo-input-small" style={{color:'red', fontWeight:'bold'}} /> mm
          </div>
      </div>

      {/* DOPPLER UTERINAS */}
      <div className="laudo-row" style={{background: '#eceff1', padding: '4px', borderRadius: '4px'}}>
          <label style={{fontSize:'11px'}}><input type="checkbox" name="incluirDopplerUt" checked={data.incluirDopplerUt} onChange={handleChange} /> Incluir Doppler das artérias uterinas</label>
          {data.incluirDopplerUt && (
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px', marginTop:'2px'}}>
                  <div style={{fontSize:'10px'}}>Dir: IR <input name="utDirIR" value={data.utDirIR} onChange={handleChange} className="laudo-input-tiny"/> IP <input name="utDirIP" value={data.utDirIP} onChange={handleChange} className="laudo-input-tiny"/></div>
                  <div style={{fontSize:'10px'}}>Esq: IR <input name="utEsqIR" value={data.utEsqIR} onChange={handleChange} className="laudo-input-tiny"/> IP <input name="utEsqIP" value={data.utEsqIP} onChange={handleChange} className="laudo-input-tiny"/></div>
              </div>
          )}
      </div>

      <div className="laudo-row" style={{marginTop:'8px'}}>
          <label className="laudo-checkbox-label" style={{background:'#e3f2fd', width:'100%', padding:'2px'}}>
              <input type="checkbox" name="uteroHomogeneo" checked={data.uteroHomogeneo} onChange={handleChange} />
              <b>útero homogêneo</b>
          </label>
          <div style={{marginLeft:'10px', fontSize:'11px'}}>
              <input type="checkbox" name="citarRelacaoCorpoColo" checked={data.citarRelacaoCorpoColo} onChange={handleChange} /> rel corpo/colo
              {data.citarRelacaoCorpoColo && <input name="relacaoCorpoColo" value={data.relacaoCorpoColo} onChange={handleChange} className="laudo-input-small" style={{width:'40px', marginLeft:'2px'}}/>}
          </div>
      </div>

      {/* ENDOMÉTRIO */}
      <div className="laudo-header-sub">Endométrio, cavidade uterina e endocérvice</div>
      
      <div className="laudo-row">
           <input type="checkbox" name="citarEspessuraEndometrio" checked={data.citarEspessuraEndometrio} onChange={handleChange} /> 
           <span style={{fontSize:'11px', fontWeight:'bold'}}>citar espessura:</span>
           <input type="number" name="espessuraEndometrio" value={data.espessuraEndometrio} onChange={handleChange} className="laudo-input-small" style={{color:'red'}} /> mm
           <select name="aspectoEndometrio" value={data.aspectoEndometrio} onChange={handleChange} className="laudo-select" style={{flex:1, marginLeft:'5px'}}>
               <option>não citar o aspecto</option>
               <option>ecogênico e homogêneo</option>
               <option>trilaminar</option>
               <option>heterogêneo</option>
           </select>
      </div>

      <div className="laudo-row-wrap" style={{gap:'8px'}}>
          <label><input type="checkbox" name="endometrioNaoIdentificado" checked={data.endometrioNaoIdentificado} onChange={handleChange} /> endométrio não identificado</label>
          <label><input type="checkbox" name="endometrioHeterogeneo" checked={data.endometrioHeterogeneo} onChange={handleChange} /> endométrio heterogêneo</label>
          <label style={{marginLeft:'15px', fontSize:'10px', color:'#666'}}><input type="checkbox" name="areasCisticas" checked={data.areasCisticas} onChange={handleChange} /> c/ áreas císticas</label>
      </div>
      
      <div className="laudo-row">
          <label><input type="checkbox" name="laminaLiquida" checked={data.laminaLiquida} onChange={handleChange} /> lâmina líquida na cavidade uterina</label>
      </div>

      {/* PÓLIPOS E CERVICITE */}
      <div className="laudo-row">
          <input type="checkbox" name="polipoEndometrial" checked={data.polipoEndometrial} onChange={handleChange} /> pólipo endometrial
          {data.polipoEndometrial && (
             <>
               <select name="polipoEndoLocal" value={data.polipoEndoLocal} onChange={handleChange} className="laudo-select-small"><option>fúndico</option><option>corpóreo</option></select>
               <input name="polipoEndoD1" value={data.polipoEndoD1} onChange={handleChange} className="laudo-input-tiny"/> x <input name="polipoEndoD2" value={data.polipoEndoD2} onChange={handleChange} className="laudo-input-tiny"/> mm
             </>
          )}
      </div>
      <div className="laudo-row">
          <input type="checkbox" name="polipoEndocervical" checked={data.polipoEndocervical} onChange={handleChange} /> pólipo endocervical
          {data.polipoEndocervical && (
             <>medindo <input name="polipoCervixD1" value={data.polipoCervixD1} onChange={handleChange} className="laudo-input-tiny"/> x <input name="polipoCervixD2" value={data.polipoCervixD2} onChange={handleChange} className="laudo-input-tiny"/> mm</>
          )}
      </div>
      <div className="laudo-row">
          <label><input type="checkbox" name="cervicite" checked={data.cervicite} onChange={handleChange} /> espessamento da endocérvice (cervicite)</label>
      </div>

      {/* DIU */}
      <div className="laudo-row">
          <label><input type="checkbox" name="diuBemPosicionado" checked={data.diuBemPosicionado} onChange={handleChange} /> D.I.U. bem posicionado (não citar medidas)</label>
      </div>
      <div className="laudo-row">
          <label><input type="checkbox" name="diuDeslocado" checked={data.diuDeslocado} onChange={handleChange} /> D.I.U.</label>
          {data.diuDeslocado && (
             <span style={{fontSize:'11px'}}> a <input name="diuDistFundo" value={data.diuDistFundo} onChange={handleChange} className="laudo-input-tiny"/> mm do fundo e a <input name="diuDistSerosa" value={data.diuDistSerosa} onChange={handleChange} className="laudo-input-tiny"/> mm da serosa</span>
          )}
      </div>
      <div className="laudo-row">
          <label><input type="checkbox" name="cistoRetencao" checked={data.cistoRetencao} onChange={handleChange} /> cistos de retenção no colo, o maior</label>
          {data.cistoRetencao && (
              <><select name="cistoRetencaoTipo" value={data.cistoRetencaoTipo} onChange={handleChange} className="laudo-select-small"><option>anecogênico</option></select> com <input name="cistoRetencaoD1" value={data.cistoRetencaoD1} onChange={handleChange} className="laudo-input-tiny"/> mm</>
          )}
      </div>

      {/* MIOMÉTRIO / NÓDULOS */}
      <div className="laudo-header-sub">Miométrio</div>
      <div className="laudo-row"><label><input type="checkbox" name="miometrioHeterogeneo" checked={data.miometrioHeterogeneo} onChange={handleChange} /> miométrio heterogêneo, sem nódulos ou cistos</label></div>
      <div className="laudo-row"><label><input type="checkbox" name="adenomiose" checked={data.adenomiose} onChange={handleChange} /> miométrio heterogêneo com sinais de adenomiose</label></div>

      <div style={{marginTop:'10px', background:'#fafafa', padding:'5px', border:'1px solid #eee'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
             <label style={{fontWeight:'bold'}}><input type="checkbox" name="citarNodulos" checked={data.citarNodulos} onChange={handleChange} /> nódulo(s) miometrial(is):</label>
             <button onClick={() => setShowModalFigo(true)} style={{border:'none', background:'transparent', cursor:'pointer'}} title="Ver Classificação FIGO"><FaImage color="#e91e63" size={16} /></button>
          </div>
          
          {/* SLOTS 1 a 4 */}
          {[1, 2, 3, 4].map(num => (
              <div key={num} className="laudo-row" style={{opacity: data.citarNodulos ? 1 : 0.5}}>
                  <input type="checkbox" name={`nod${num}`} checked={data[`nod${num}`]} onChange={handleChange} disabled={!data.citarNodulos} />
                  <span style={{fontWeight:'bold', color:'#999'}}>{num}:</span>
                  <input type="number" name={`nod${num}d1`} value={data[`nod${num}d1`]} onChange={handleChange} className="laudo-input-tiny"/> x
                  <input type="number" name={`nod${num}d2`} value={data[`nod${num}d2`]} onChange={handleChange} className="laudo-input-tiny"/> mm,
                  <select name={`nod${num}Tipo`} value={data[`nod${num}Tipo`]} onChange={handleChange} className="laudo-select-small" style={{width:'80px'}}>
                      <option value="subseroso">subseroso</option><option value="intramural">intramural</option><option value="submucoso">submucoso</option>
                  </select>
                  <div style={{marginLeft:'20px', width:'100%', fontSize:'10px', color:'#666'}}>
                      em localização <select name={`nod${num}Loc`} value={data[`nod${num}Loc`]} onChange={handleChange} className="laudo-select-small"><option value="fúndica">fúndica</option><option value="anterior">anterior</option><option value="posterior">posterior</option></select>
                  </div>
              </div>
          ))}
          
          <div className="laudo-row" style={{marginTop:'5px', borderTop:'1px dashed #ccc', paddingTop:'5px'}}>
               <input type="checkbox" name="nodMultiplos" checked={data.nodMultiplos} onChange={handleChange} />
               <span style={{fontSize:'10px'}}>múltiplos, maior:</span>
               <input name="nodMultD1" value={data.nodMultD1} onChange={handleChange} className="laudo-input-tiny"/> x <input name="nodMultD2" value={data.nodMultD2} onChange={handleChange} className="laudo-input-tiny"/> mm
               <select name="nodMultTipo" value={data.nodMultTipo} onChange={handleChange} className="laudo-select-small"><option>subseroso</option><option>intramural</option></select>
          </div>
      </div>

      {/* CIRURGIAS */}
      <div className="laudo-header-sub">Cirurgias</div>
      <div className="laudo-row"><label><input type="checkbox" name="histerectomiaParcial" checked={data.histerectomiaParcial} onChange={handleChange} /> histerectomia parcial</label></div>
      <div className="laudo-row"><label><input type="checkbox" name="histerectomiaTotal" checked={data.histerectomiaTotal} onChange={handleChange} /> histerectomia total</label></div>

    </div>
  );
};

export default SecaoUteroTuring;