// src/components/laudos/trasnvaginal/sections/SecaoUteroTuring.jsx
import React from 'react';

const SecaoUteroTuring = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
      <div className="laudo-header-dark">Útero</div>
      
      {/* STATUS HORMONAL E DUM */}
      <div className="laudo-group-box">
          <div className="laudo-row">
              <label>Status hormonal:</label>
              <div style={{display:'flex', gap:'10px'}}>
                  <label><input type="radio" name="statusHormonal" value="menopausada" checked={data.statusHormonal === 'menopausada'} onChange={handleChange} /> menopausada</label>
                  <label><input type="radio" name="statusHormonal" value="idade_fertil" checked={data.statusHormonal === 'idade_fertil'} onChange={handleChange} /> idade fértil</label>
              </div>
          </div>
          <div className="laudo-row">
              <label><input type="checkbox" checked={!!data.dum} readOnly /> incluir D.U.M:</label>
              <input type="date" name="dum" value={data.dum} onChange={handleChange} className="laudo-input" />
          </div>
      </div>

      {/* BIOMETRIA E POSIÇÃO */}
      <div className="laudo-row">
          <select name="posicaoUtero" value={data.posicaoUtero} onChange={handleChange} className="laudo-select" style={{width: '120px'}}>
              <option value="anteversoflexão">anteversoflexão</option>
              <option value="retroversoflexão">retroversoflexão</option>
              <option value="mediano">mediano</option>
          </select>
          <div style={{display:'flex', alignItems:'center', gap:'2px'}}>
              <input type="number" name="ut1" value={data.ut1} onChange={handleChange} className="laudo-input-small" /> x
              <input type="number" name="ut2" value={data.ut2} onChange={handleChange} className="laudo-input-small" /> x
              <input type="number" name="ut3" value={data.ut3} onChange={handleChange} className="laudo-input-small" /> mm
          </div>
      </div>

      {/* DOPPLER UTERINAS */}
      <div className="laudo-group-box" style={{background: '#f0f4f8'}}>
          <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
              <input type="checkbox" name="incluirDopplerUt" checked={data.incluirDopplerUt} onChange={handleChange} />
              Incluir Doppler das artérias uterinas
          </label>
          {data.incluirDopplerUt && (
              <div style={{fontSize:'11px', marginTop:'5px'}}>
                  <div className="laudo-row">
                      <span>Dir:</span> IR <input type="text" name="utDirIR" value={data.utDirIR} onChange={handleChange} className="laudo-input-small" />
                      IP <input type="text" name="utDirIP" value={data.utDirIP} onChange={handleChange} className="laudo-input-small" />
                  </div>
                  <div className="laudo-row">
                      <span>Esq:</span> IR <input type="text" name="utEsqIR" value={data.utEsqIR} onChange={handleChange} className="laudo-input-small" />
                      IP <input type="text" name="utEsqIP" value={data.utEsqIP} onChange={handleChange} className="laudo-input-small" />
                  </div>
              </div>
          )}
      </div>

      <div className="laudo-row">
          <label className="laudo-checkbox-label">
              <input type="checkbox" name="uteroHomogeneo" checked={data.uteroHomogeneo} onChange={handleChange} />
              <b>útero homogêneo</b>
          </label>
      </div>

      {/* ENDOMÉTRIO / CAVIDADE */}
      <div className="laudo-header-sub">Endométrio, cavidade uterina e endocérvice</div>
      <div className="laudo-row">
           <label><input type="checkbox" name="citarEspessuraEndometrio" checked={data.citarEspessuraEndometrio} onChange={handleChange} /> citar espessura:</label>
           <input type="number" name="espessuraEndometrio" value={data.espessuraEndometrio} onChange={handleChange} className="laudo-input-small" /> mm
           <select name="aspectoEndometrio" value={data.aspectoEndometrio} onChange={handleChange} className="laudo-select" style={{flex:1}}>
               <option>não citar o aspecto</option>
               <option>ecogênico e homogêneo</option>
               <option>trilaminar</option>
               <option>heterogêneo</option>
           </select>
      </div>
      
      <div className="laudo-row-wrap">
          <label className="laudo-checkbox-label"><input type="checkbox" name="endometrioNaoIdentificado" checked={data.endometrioNaoIdentificado} onChange={handleChange} /> endométrio não identificado</label>
          <label className="laudo-checkbox-label"><input type="checkbox" name="laminaLiquida" checked={data.laminaLiquida} onChange={handleChange} /> lâmina líquida na cavidade</label>
          <label className="laudo-checkbox-label"><input type="checkbox" name="cervicite" checked={data.cervicite} onChange={handleChange} /> espessamento da endocérvice (cervicite)</label>
      </div>

      {/* PÓLIPOS */}
      <div className="laudo-row">
          <label className="laudo-checkbox-label"><input type="checkbox" name="polipoEndometrial" checked={data.polipoEndometrial} onChange={handleChange} /> pólipo endometrial</label>
          {data.polipoEndometrial && (
              <>
                <select name="polipoEndoLocal" value={data.polipoEndoLocal} onChange={handleChange} className="laudo-select"><option value="fúndico">fúndico</option><option value="corpóreo">corpóreo</option></select>
                <input type="number" name="polipoEndoD1" value={data.polipoEndoD1} onChange={handleChange} className="laudo-input-small"/> x <input type="number" name="polipoEndoD2" value={data.polipoEndoD2} onChange={handleChange} className="laudo-input-small"/> mm
              </>
          )}
      </div>

      {/* DIU */}
      <div className="laudo-group-box">
          <label className="laudo-checkbox-label">
              <input type="checkbox" name="diuBemPosicionado" checked={data.diuBemPosicionado} onChange={handleChange} />
              D.I.U. bem posicionado (não citar medidas)
          </label>
          <label className="laudo-checkbox-label">
              <input type="checkbox" name="diuDeslocado" checked={data.diuDeslocado} onChange={handleChange} />
              D.I.U. deslocado
          </label>
          {data.diuDeslocado && (
              <div className="laudo-row">
                  a <input type="number" name="diuDistFundo" value={data.diuDistFundo} onChange={handleChange} className="laudo-input-small"/> mm do fundo
                  e a <input type="number" name="diuDistSerosa" value={data.diuDistSerosa} onChange={handleChange} className="laudo-input-small"/> mm da serosa
              </div>
          )}
      </div>

      {/* MIOMÉTRIO / NÓDULOS */}
      <div className="laudo-header-sub">Miométrio</div>
      <label className="laudo-checkbox-label">
          <input type="checkbox" name="miometrioHeterogeneo" checked={data.miometrioHeterogeneo} onChange={handleChange} />
          miométrio heterogêneo, sem nódulos ou cistos
      </label>
      <label className="laudo-checkbox-label">
          <input type="checkbox" name="adenomiose" checked={data.adenomiose} onChange={handleChange} />
          sinais de adenomiose (indefinição zona juncional...)
      </label>

      <label className="laudo-checkbox-label" style={{marginTop:'10px', fontWeight:'bold'}}>
          <input type="checkbox" checked={data.nod1 || data.nod2} readOnly />
          nódulo(s) miometrial(is) com as seguintes características:
      </label>
      
      {/* LISTA DE NÓDULOS (SLOTS) */}
      {[1, 2].map(num => (
          <div key={num} className="laudo-group-box" style={{marginBottom:'5px'}}>
              <div className="laudo-row">
                  <input type="checkbox" name={`nod${num}`} checked={data[`nod${num}`]} onChange={handleChange} />
                  <b>{num}: </b>
                  <input type="number" name={`nod${num}d1`} value={data[`nod${num}d1`]} onChange={handleChange} className="laudo-input-small"/> x
                  <input type="number" name={`nod${num}d2`} value={data[`nod${num}d2`]} onChange={handleChange} className="laudo-input-small"/> mm,
                  <select name={`nod${num}Tipo`} value={data[`nod${num}Tipo`]} onChange={handleChange} className="laudo-select">
                      <option value="subseroso">subseroso</option><option value="intramural">intramural</option><option value="submucoso">submucoso</option>
                  </select>
              </div>
              <div className="laudo-row" style={{paddingLeft: '20px'}}>
                  em localização <select name={`nod${num}Loc`} value={data[`nod${num}Loc`]} onChange={handleChange} className="laudo-select" style={{width:'100px'}}><option value="fúndica">fúndica</option><option value="anterior">anterior</option><option value="posterior">posterior</option></select>
              </div>
          </div>
      ))}
       
      <div className="laudo-row">
           <input type="checkbox" name="nodMultiplos" checked={data.nodMultiplos} onChange={handleChange} />
           <span style={{fontSize:'11px'}}>múltiplos nódulos, maior deles:</span>
           <input type="number" name="nodMultD1" value={data.nodMultD1} onChange={handleChange} className="laudo-input-small"/> x
           <input type="number" name="nodMultD2" value={data.nodMultD2} onChange={handleChange} className="laudo-input-small"/>
      </div>

      {/* CIRURGIAS */}
      <div className="laudo-header-sub">Cirurgias</div>
      <div className="laudo-row">
          <input type="checkbox" name="histerectomiaParcial" checked={data.histerectomiaParcial} onChange={handleChange} />
          histerectomia parcial
          {data.histerectomiaParcial && (
              <><input type="number" name="cotoD1" value={data.cotoD1} className="laudo-input-small"/> x <input type="number" name="cotoD2" value={data.cotoD2} className="laudo-input-small"/></>
          )}
      </div>
      <div className="laudo-row">
          <input type="checkbox" name="histerectomiaTotal" checked={data.histerectomiaTotal} onChange={handleChange} />
          histerectomia total
      </div>
    </div>
  );
};

export default SecaoUteroTuring;