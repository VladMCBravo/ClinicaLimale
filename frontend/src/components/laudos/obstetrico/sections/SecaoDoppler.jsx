import React, { useEffect, useState } from 'react';
import { FaWaveSquare, FaVenus, FaBaby, FaTable, FaCommentMedical} from 'react-icons/fa';
import ModalTabelaVPS from './ModalTabelaVPS';

// Componente de Input Compacto (Estilo Biometria)
const DopplerInput = ({ label, name, value, onChange, unit = null, width="50px" }) => (
    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px'}}>
        <span style={{fontSize:'11px', color:'#555', fontWeight:'bold'}}>{label}</span>
        <div style={{position:'relative'}}>
            <input 
                type="number" step="0.01" 
                name={name} 
                value={value || ''} 
                onChange={onChange} 
                className="laudo-input" 
                style={{width: width, textAlign:'center', fontWeight:'bold', color:'#2E7D32'}}
                placeholder="-"
            />
            {unit && <span style={{position:'absolute', right:'-15px', top:'3px', fontSize:'9px', color:'#999'}}>{unit}</span>}
        </div>
    </div>
);

const SecaoDoppler = ({ data, handleChange }) => {
  const [showModalVPS, setShowModalVPS] = useState(false);

  // --- CÁLCULOS AUTOMÁTICOS (IP MÉDIO E RELAÇÃO) ---
  useEffect(() => {
      let updates = {};
      let hasUpdates = false;

      // 1. IP Médio das Uterinas
      const utDir = parseFloat(data.utDirIP);
      const utEsq = parseFloat(data.utEsqIP);
      let novoIpMedio = '';
      
      if (!isNaN(utDir) && !isNaN(utEsq)) novoIpMedio = ((utDir + utEsq) / 2).toFixed(2).replace('.', ',');
      else if (!isNaN(utDir)) novoIpMedio = utDir.toFixed(2).replace('.', ',');
      else if (!isNaN(utEsq)) novoIpMedio = utEsq.toFixed(2).replace('.', ',');

      if (novoIpMedio !== data.ipMedioUterinas) {
          updates.ipMedioUterinas = novoIpMedio;
          hasUpdates = true;
      }

      // 2. Relação Cérebro/Umbilical (CPR = ACM IP / Umb IP)
      const acm = parseFloat(data.acmIP);
      const umb = parseFloat(data.umbIP);
      let novaRelacao = '';

      if (!isNaN(acm) && !isNaN(umb) && umb > 0) {
          novaRelacao = (acm / umb).toFixed(2).replace('.', ',');
      }

      if (novaRelacao !== data.relacaoCerebroUmbilical) {
          updates.relacaoCerebroUmbilical = novaRelacao;
          hasUpdates = true;
      }

      // Atualiza estado se necessário
      if (hasUpdates) {
          Object.keys(updates).forEach(key => {
              handleChange({ target: { name: key, value: updates[key] } });
          });
      }
  }, [data.utDirIP, data.utEsqIP, data.acmIP, data.umbIP, data.ipMedioUterinas, data.relacaoCerebroUmbilical, handleChange]);


  return (
    <div>
        {/* CONTROLE DE ATIVAÇÃO (Substitui o Header Antigo) */}
        <div style={{marginBottom:'10px', paddingBottom:'5px', borderBottom:'1px dashed #ccc'}}>
            <label className="laudo-checkbox-label" style={{fontWeight:'bold', color: data.usarDoppler ? '#1565C0' : '#777'}}>
                <input type="checkbox" name="usarDoppler" checked={!!data.usarDoppler} onChange={(e) => handleChange({target: {name: 'usarDoppler', value: e.target.checked}})} />
                Habilitar Texto do Doppler no Laudo
            </label>
        </div>

        {data.usarDoppler && (
            <div className="laudo-section-body">
                
                <div className="laudo-grid-2" style={{alignItems:'start', gap:'20px'}}>
                    
                    {/* COLUNA 1: COMPARTIMENTO MATERNO (UTERINAS) */}
                    <div className="laudo-col">
                        <div style={{background:'#E3F2FD', padding:'8px', borderRadius:'4px', border:'1px solid #90CAF9'}}>
                            <div style={{fontSize:'11px', fontWeight:'bold', color:'#1565C0', marginBottom:'5px', display:'flex', alignItems:'center', gap:'5px'}}>
                                <FaVenus /> ARTÉRIAS UTERINAS
                            </div>
                            
                            <div className="laudo-grid-2" style={{gap:'10px'}}>
                                {/* Uterina Direita */}
                                <div style={{padding:'5px', background:'#fff', borderRadius:'3px'}}>
                                    <div style={{fontSize:'10px', fontWeight:'bold', marginBottom:'3px', borderBottom:'1px solid #eee'}}>DIREITA</div>
                                    <label className="laudo-checkbox-label" style={{fontSize:'9px', marginBottom:'5px'}}>
                                        <input type="checkbox" name="checkUtDir" checked={!!data.checkUtDir} onChange={handleChange} /> Incluir
                                    </label>
                                    <DopplerInput label="IP" name="utDirIP" value={data.utDirIP} onChange={handleChange} />
                                    <DopplerInput label="IR" name="utDirIR" value={data.utDirIR} onChange={handleChange} />
                                    <label className="laudo-checkbox-label" style={{fontSize:'9px', marginTop:'2px', color:'#D32F2F'}}>
                                        <input type="checkbox" name="utDirIncisura" checked={!!data.utDirIncisura} onChange={handleChange} /> Incisura P.
                                    </label>
                                </div>

                                {/* Uterina Esquerda */}
                                <div style={{padding:'5px', background:'#fff', borderRadius:'3px'}}>
                                    <div style={{fontSize:'10px', fontWeight:'bold', marginBottom:'3px', borderBottom:'1px solid #eee'}}>ESQUERDA</div>
                                    <label className="laudo-checkbox-label" style={{fontSize:'9px', marginBottom:'5px'}}>
                                        <input type="checkbox" name="checkUtEsq" checked={!!data.checkUtEsq} onChange={handleChange} /> Incluir
                                    </label>
                                    <DopplerInput label="IP" name="utEsqIP" value={data.utEsqIP} onChange={handleChange} />
                                    <DopplerInput label="IR" name="utEsqIR" value={data.utEsqIR} onChange={handleChange} />
                                    <label className="laudo-checkbox-label" style={{fontSize:'9px', marginTop:'2px', color:'#D32F2F'}}>
                                        <input type="checkbox" name="utEsqIncisura" checked={!!data.utEsqIncisura} onChange={handleChange} /> Incisura P.
                                    </label>
                                </div>
                            </div>

                            {/* Resultado IP Médio */}
                            {data.ipMedioUterinas && (
                                <div style={{marginTop:'8px', textAlign:'center', background:'#FFF', padding:'4px', borderRadius:'3px', border:'1px solid #BBDEFB', color:'#1565C0', fontWeight:'bold', fontSize:'11px'}}>
                                    IP Médio: {data.ipMedioUterinas}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUNA 2: COMPARTIMENTO FETAL (UMBILICAL/CEREBRAL) */}
                    <div className="laudo-col">
                        <div style={{background:'#F1F8E9', padding:'8px', borderRadius:'4px', border:'1px solid #C5E1A5'}}>
                            <div style={{fontSize:'11px', fontWeight:'bold', color:'#33691E', marginBottom:'5px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                                <span style={{display:'flex', gap:'5px', alignItems:'center'}}><FaBaby /> VASOS FETAIS</span>
                                <button onClick={() => setShowModalVPS(true)} style={{fontSize:'9px', background:'#fff', border:'1px solid #aaa', borderRadius:'3px', cursor:'pointer', display:'flex', alignItems:'center', gap:'3px'}}>
                                    <FaTable /> Tabela
                                </button>
                            </div>

                            <div className="laudo-grid-2" style={{gap:'10px'}}>
                                {/* Umbilical */}
                                <div style={{padding:'5px', background:'#fff', borderRadius:'3px'}}>
                                    <div style={{fontSize:'10px', fontWeight:'bold', marginBottom:'3px', borderBottom:'1px solid #eee'}}>UMBILICAL</div>
                                    <label className="laudo-checkbox-label" style={{fontSize:'9px', marginBottom:'5px'}}>
                                        <input type="checkbox" name="checkUmb" checked={!!data.checkUmb} onChange={handleChange} /> Incluir
                                    </label>
                                    <DopplerInput label="IP" name="umbIP" value={data.umbIP} onChange={handleChange} />
                                    <DopplerInput label="IR" name="umbIR" value={data.umbIR} onChange={handleChange} />
                                    <DopplerInput label="S/D" name="umbSD" value={data.umbSD} onChange={handleChange} />
                                    
                                    <div style={{fontSize:'9px', color:'#D32F2F', display:'flex', flexDirection:'column', marginTop:'2px'}}>
                                        <label><input type="checkbox" name="umbDiastoleZero" checked={!!data.umbDiastoleZero} onChange={handleChange} /> Diástole 0</label>
                                        <label><input type="checkbox" name="umbDiastoleReversa" checked={!!data.umbDiastoleReversa} onChange={handleChange} /> Reversa</label>
                                    </div>
                                </div>

                                {/* Cerebral */}
                                <div style={{padding:'5px', background:'#fff', borderRadius:'3px'}}>
                                    <div style={{fontSize:'10px', fontWeight:'bold', marginBottom:'3px', borderBottom:'1px solid #eee'}}>CEREBRAL M.</div>
                                    <label className="laudo-checkbox-label" style={{fontSize:'9px', marginBottom:'5px'}}>
                                        <input type="checkbox" name="checkAcm" checked={!!data.checkAcm} onChange={handleChange} /> Incluir
                                    </label>
                                    <DopplerInput label="IP" name="acmIP" value={data.acmIP} onChange={handleChange} />
                                    <DopplerInput label="PVS" name="acmPVS" value={data.acmPVS} onChange={handleChange} unit="cm/s" width="40px" />
                                    
                                    <label className="laudo-checkbox-label" style={{fontSize:'9px', marginTop:'5px', color:'#D32F2F'}}>
                                        <input type="checkbox" name="acmDiastoleAlta" checked={!!data.acmDiastoleAlta} onChange={handleChange} /> Centralização
                                    </label>
                                </div>
                            </div>

                            {/* Resultado Relação C/U */}
                            {data.relacaoCerebroUmbilical && (
                                <div style={{marginTop:'8px', textAlign:'center', background: parseFloat(data.relacaoCerebroUmbilical.replace(',','.')) < 1 ? '#FFEBEE' : '#FFF', padding:'4px', borderRadius:'3px', border:'1px solid #C5E1A5', color:'#33691E', fontWeight:'bold', fontSize:'11px'}}>
                                    Rel. Cérebro/Umbilical: {data.relacaoCerebroUmbilical}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* DUCTO VENOSO (Barra Inferior) */}
                <div style={{marginTop:'10px', background:'#FAFAFA', padding:'5px 10px', borderRadius:'4px', border:'1px solid #ddd', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <label className="laudo-checkbox-label" style={{fontWeight:'bold', color:'#555'}}>
                            <input type="checkbox" name="checkDv" checked={!!data.checkDv} onChange={handleChange} /> 
                            DUCTO VENOSO
                        </label>
                        <div style={{width:'80px'}}>
                            <DopplerInput label="IP:" name="dvIP" value={data.dvIP} onChange={handleChange} width="50px" />
                        </div>
                    </div>
                    <div style={{display:'flex', gap:'10px', fontSize:'10px', color:'#D32F2F'}}>
                        <label><input type="checkbox" name="dvOndaAZero" checked={!!data.dvOndaAZero} onChange={handleChange} /> Onda A Zero</label>
                        <label><input type="checkbox" name="dvOndaAReversa" checked={!!data.dvOndaAReversa} onChange={handleChange} /> Reversa</label>
                    </div>
                </div>
                {/* CAMPO DE OBSERVAÇÃO PADRONIZADO (Inserir antes de fechar a laudo-section) */}
                     <div style={{
                         borderTop: '1px solid #eee', 
                         padding: '10px 12px', // Espaçamento interno para não colar na borda
                         background: '#FAFAFA', 
                         borderBottomLeftRadius: '4px',
                         borderBottomRightRadius: '4px'
                     }}>
                        <div style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px'}}>
                            <FaCommentMedical color="#555"/>
                            <span style={{fontWeight:'bold', fontSize:'11px', color:'#333'}}>Nota Médica (Morfologia):</span>
                        </div>
                        <textarea 
                            name="obsDoppler" 
                            value={data.obsDoppler || ''} 
                            onChange={handleChange} 
                            className="laudo-textarea"
                            rows="2"
                            style={{
                                width:'100%', 
                                fontSize:'11px', 
                                border:'1px solid #ccc', 
                                borderRadius: '4px', // Bordas arredondadas no campo
                                padding: '8px', // Espaço interno do texto
                                boxSizing: 'border-box' // Garante que não vaze a largura
                            }}
                            placeholder="Digite aqui observações específicas sobre o doppler..."
                        />
                    </div>
            </div>
        )}
        {showModalVPS && <ModalTabelaVPS onClose={() => setShowModalVPS(false)} />}
    </div>
  );
};

export default SecaoDoppler;