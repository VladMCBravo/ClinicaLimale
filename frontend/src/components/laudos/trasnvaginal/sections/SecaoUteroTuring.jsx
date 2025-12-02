import React from 'react';
import { FaImage } from 'react-icons/fa';

const SecaoUteroTuring = ({ data, handleChange, setShowModalFigo }) => {
  
  const opcoesLocalizacao = [
      "fúndica", "corporal anterior", "corporal posterior",
      "corporal à direita", "corporal à esquerda",
      "istmica anterior", "istmica posterior",
      "istmica à direita", "istmica à esquerda"
  ];

  return (
    <div className="laudo-section">
      <div className="header-base header-blue">Útero</div>
      
      <div className="laudo-section-body">
          {/* DUM */}
          <div className="laudo-info-box">
              <div className="laudo-row">
                  <label className="laudo-checkbox-label">
                      <input type="checkbox" name="incluirDum" checked={data.incluirDum} onChange={handleChange} />
                      incluir D.U.M:
                  </label>
                  {data.incluirDum && <input type="date" name="dum" value={data.dum} onChange={handleChange} className="laudo-input laudo-input-date" />}
              </div>
          </div>

          {/* BIOMETRIA */}
          <div className="laudo-row">
              <select name="posicaoUtero" value={data.posicaoUtero} onChange={handleChange} className="laudo-select" style={{width: '130px', fontWeight:'bold'}}>
                  <option value="anteversoflexão">anteversoflexão</option>
                  <option value="retroversoflexão">retroversoflexão</option>
                  <option value="mediano">mediano</option>
              </select>
              <div className="laudo-row" style={{marginLeft:'auto'}}>
                  <input type="number" name="ut1" value={data.ut1} onChange={handleChange} className="laudo-input laudo-input-small" style={{color:'red', fontWeight:'bold'}} /> x
                  <input type="number" name="ut2" value={data.ut2} onChange={handleChange} className="laudo-input laudo-input-small" style={{color:'red', fontWeight:'bold'}} /> x
                  <input type="number" name="ut3" value={data.ut3} onChange={handleChange} className="laudo-input laudo-input-small" style={{color:'red', fontWeight:'bold'}} /> mm
              </div>
          </div>

          {/* DOPPLER */}
          <div className="laudo-info-box">
              <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                  <input type="checkbox" name="incluirDopplerUt" checked={data.incluirDopplerUt} onChange={handleChange} />
                  Incluir Doppler das artérias uterinas
              </label>
              {data.incluirDopplerUt && (
                  <div className="laudo-grid-2" style={{marginTop:'5px'}}>
                      <div className="laudo-row" style={{fontSize:'10px'}}>
                          Dir: IR <input name="utDirIR" value={data.utDirIR} onChange={handleChange} className="laudo-input laudo-input-small"/> 
                          IP <input name="utDirIP" value={data.utDirIP} onChange={handleChange} className="laudo-input laudo-input-small"/>
                      </div>
                      <div className="laudo-row" style={{fontSize:'10px'}}>
                          Esq: IR <input name="utEsqIR" value={data.utEsqIR} onChange={handleChange} className="laudo-input laudo-input-small"/> 
                          IP <input name="utEsqIP" value={data.utEsqIP} onChange={handleChange} className="laudo-input laudo-input-small"/>
                      </div>
                  </div>
              )}
          </div>

          <div className="laudo-row">
              <label className="laudo-checkbox-label" style={{background:'#e3f2fd', width:'100%', padding:'2px', borderRadius:'2px'}}>
                  <input type="checkbox" name="uteroHomogeneo" checked={data.uteroHomogeneo} onChange={handleChange} />
                  <b>útero homogêneo</b>
              </label>
          </div>
          
          <div className="laudo-row">
              <label className="laudo-checkbox-label" style={{fontSize:'11px'}}>
                  <input type="checkbox" name="citarRelacaoCorpoColo" checked={data.citarRelacaoCorpoColo} onChange={handleChange} /> rel corpo/colo
              </label>
              {data.citarRelacaoCorpoColo && <input name="relacaoCorpoColo" value={data.relacaoCorpoColo} onChange={handleChange} className="laudo-input laudo-input-small"/>}
          </div>

          {/* ENDOMÉTRIO */}
          <div className="header-base header-gray" style={{fontSize:'10px', marginTop:'5px'}}>Endométrio, cavidade uterina e endocérvice</div>
          
          <div className="laudo-row">
              <label className="laudo-checkbox-label">
                  <input type="checkbox" name="citarEspessuraEndometrio" checked={data.citarEspessuraEndometrio} onChange={handleChange} /> 
                  <b>citar espessura:</b>
              </label>
              <input type="number" name="espessuraEndometrio" value={data.espessuraEndometrio} onChange={handleChange} className="laudo-input laudo-input-small" style={{color:'red'}} /> mm
              <select name="aspectoEndometrio" value={data.aspectoEndometrio} onChange={handleChange} className="laudo-select" style={{flex:1}}>
                  <option>não citar o aspecto</option>
                  <option>ecogênico e homogêneo</option>
                  <option>trilaminar</option>
                  <option>heterogêneo</option>
              </select>
          </div>

          <div className="laudo-row" style={{flexWrap:'wrap', gap:'10px'}}>
              <label className="laudo-checkbox-label"><input type="checkbox" name="endometrioNaoIdentificado" checked={data.endometrioNaoIdentificado} onChange={handleChange} /> endométrio não identificado</label>
              <label className="laudo-checkbox-label"><input type="checkbox" name="endometrioHeterogeneo" checked={data.endometrioHeterogeneo} onChange={handleChange} /> endométrio heterogêneo</label>
              <label className="laudo-checkbox-label"><input type="checkbox" name="areasCisticas" checked={data.areasCisticas} onChange={handleChange} /> c/ áreas císticas</label>
          </div>
          
          <div className="laudo-row">
              <label className="laudo-checkbox-label"><input type="checkbox" name="laminaLiquida" checked={data.laminaLiquida} onChange={handleChange} /> lâmina líquida na cavidade uterina</label>
          </div>

          <div className="laudo-row">
              <label className="laudo-checkbox-label"><input type="checkbox" name="polipoEndometrial" checked={data.polipoEndometrial} onChange={handleChange} /> pólipo endometrial</label>
              {data.polipoEndometrial && (
                 <>
                   <select name="polipoEndoLocal" value={data.polipoEndoLocal} onChange={handleChange} className="laudo-select"><option>fúndico</option><option>corpóreo</option></select>
                   <input name="polipoEndoD1" value={data.polipoEndoD1} onChange={handleChange} className="laudo-input laudo-input-small"/> x <input name="polipoEndoD2" value={data.polipoEndoD2} onChange={handleChange} className="laudo-input laudo-input-small"/> mm
                 </>
              )}
          </div>

          <div className="laudo-row">
              <label className="laudo-checkbox-label"><input type="checkbox" name="diuBemPosicionado" checked={data.diuBemPosicionado} onChange={handleChange} /> D.I.U. bem posicionado</label>
          </div>
          <div className="laudo-row">
              <label className="laudo-checkbox-label"><input type="checkbox" name="diuDeslocado" checked={data.diuDeslocado} onChange={handleChange} /> D.I.U.</label>
              {data.diuDeslocado && (
                 <span style={{fontSize:'11px'}}> a <input name="diuDistFundo" value={data.diuDistFundo} onChange={handleChange} className="laudo-input laudo-input-small"/> mm do fundo</span>
              )}
          </div>

          {/* MIOMÉTRIO / NÓDULOS */}
          <div className="header-base header-gray" style={{fontSize:'10px', marginTop:'5px'}}>Miométrio</div>
          <div className="laudo-row"><label className="laudo-checkbox-label"><input type="checkbox" name="miometrioHeterogeneo" checked={data.miometrioHeterogeneo} onChange={handleChange} /> miométrio heterogêneo</label></div>
          <div className="laudo-row"><label className="laudo-checkbox-label"><input type="checkbox" name="adenomiose" checked={data.adenomiose} onChange={handleChange} /> sinais de adenomiose</label></div>

          <div className="laudo-info-box" style={{background:'#fff', border:'1px solid #eee'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px'}}>
                 <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}><input type="checkbox" name="citarNodulos" checked={data.citarNodulos} onChange={handleChange} /> nódulo(s) miometrial(is):</label>
                 <button onClick={() => setShowModalFigo(true)} style={{border:'none', background:'transparent', cursor:'pointer'}} title="Ver Classificação FIGO"><FaImage color="#e91e63" size={16} /></button>
              </div>
              
              {[1, 2, 3, 4].map(num => (
                  <div key={num} className="laudo-row" style={{opacity: data.citarNodulos ? 1 : 0.5, marginBottom:'4px'}}>
                      <input type="checkbox" name={`nod${num}`} checked={data[`nod${num}`]} onChange={handleChange} disabled={!data.citarNodulos} />
                      <span style={{fontWeight:'bold', color:'#999'}}>{num}:</span>
                      <input type="number" name={`nod${num}d1`} value={data[`nod${num}d1`]} onChange={handleChange} className="laudo-input laudo-input-small"/> x
                      <input type="number" name={`nod${num}d2`} value={data[`nod${num}d2`]} onChange={handleChange} className="laudo-input laudo-input-small"/> mm,
                      <select name={`nod${num}Tipo`} value={data[`nod${num}Tipo`]} onChange={handleChange} className="laudo-select" style={{width:'80px'}}>
                          <option value="subseroso">subseroso</option><option value="intramural">intramural</option><option value="submucoso">submucoso</option>
                      </select>
                      <div style={{marginLeft:'auto', fontSize:'10px', color:'#666'}}>
                          loc: 
                          <select name={`nod${num}Loc`} value={data[`nod${num}Loc`]} onChange={handleChange} className="laudo-select">
                              {opcoesLocalizacao.map(op => <option key={op} value={op}>{op}</option>)}
                          </select>
                      </div>
                  </div>
              ))}
          </div>

          <div className="header-base header-gray" style={{fontSize:'10px', marginTop:'5px'}}>Cirurgias</div>
          <div className="laudo-info-box">
              <div className="laudo-row">
                  <label className="laudo-checkbox-label"><input type="checkbox" name="histerectomiaParcial" checked={data.histerectomiaParcial} onChange={handleChange} /> histerectomia parcial</label>
                  {data.histerectomiaParcial && (
                      <span style={{marginLeft:'5px'}}>
                          <input type="number" name="cotoD1" value={data.cotoD1} onChange={handleChange} className="laudo-input laudo-input-small"/> x 
                          <input type="number" name="cotoD2" value={data.cotoD2} onChange={handleChange} className="laudo-input laudo-input-small"/> x 
                          <input type="number" name="cotoD3" value={data.cotoD3} onChange={handleChange} className="laudo-input laudo-input-small"/> mm
                      </span>
                  )}
              </div>
              <div className="laudo-row">
                  <label className="laudo-checkbox-label"><input type="checkbox" name="histerectomiaTotal" checked={data.histerectomiaTotal} onChange={handleChange} /> histerectomia total</label>
              </div>
          </div>
      </div>
    </div>
  );
};

export default SecaoUteroTuring;