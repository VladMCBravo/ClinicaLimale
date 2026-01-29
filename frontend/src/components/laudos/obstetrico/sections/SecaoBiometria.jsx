import React, { useMemo } from 'react';
import { FaBrain, FaBone, FaShoePrints, FaBaby, FaArrowUp, FaCommentMedical, FaPlusCircle } from 'react-icons/fa';

// FRASE DA IMAGEM
const TXT_TN_LIMITADA = "Não foi possível calcular o risco para trissomia do 21 por meio da medida da translucência nucal pois o feto com CCN acima de 84 mm. Para essa fase de gestação, podem ser usados outros marcadores como medida da prega nucal e a presença e osso nasal, que no presente estudo encontram-se normais.";

// Componente de Linha Compacta
const BioItem = ({ label, name, value, onChange, placeholder = "mm", width = "60px" }) => {
    // Lógica visual de IG aproximada ao digitar
    const igAprox = useMemo(() => {
        
    }, [value, name]);

    return (
        <div style={{display:'flex', flexDirection:'column', gap:'2px'}}>
            <span style={{fontSize:'10px', fontWeight:'bold', color:'#555', whiteSpace:'nowrap'}}>
                {label}
            </span>
            <div style={{position:'relative'}}>
                <input 
                    name={name} 
                    value={value || ''} 
                    onChange={onChange} 
                    className="laudo-input"
                    style={{width: width, paddingRight:'20px', textAlign:'center', fontWeight:'bold', color:'#2E7D32'}}
                    placeholder={placeholder}
                    autoComplete="off"
                />
                <span style={{position:'absolute', right:'4px', top:'4px', fontSize:'9px', color:'#999'}}>mm</span>
            </div>
            {igAprox && <span style={{fontSize:'9px', color:'#2E7D32'}}>{igAprox}</span>}
        </div>
    );
};

const SecaoBiometria = ({ data, handleChange }) => {
    
    const isMorfo2Tri = data.subtipo === 'OBSTETRICO_MORFOLOGICO';

    const aplicarIgCcn = () => {
       
    };

    // Helper para adicionar na obsBiometria
    const addNotaBio = (frase) => {
        const textoAtual = data.obsBiometria || '';
        const separador = textoAtual.length > 0 ? ' ' : '';
        handleChange({ target: { name: 'obsBiometria', value: textoAtual + separador + frase } });
    };

  return (
    <div>
            {/* NOVO: CCN (Aparece em destaque se for exame precoce) */}
            <div style={{marginBottom:'15px', padding:'10px', background:'#E1F5FE', borderRadius:'4px', border:'1px solid #81D4FA'}}>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <FaBaby color="#0277BD" />
                    <span style={{fontWeight:'bold', color:'#0277BD', fontSize:'12px'}}>CCN (Comprimento Cabeça-Nádegas):</span>
                    <BioItem label="" name="ccn" value={data.ccn} onChange={handleChange} width="80px" />
                </div>
                <div style={{fontSize:'10px', color:'#666', marginTop:'4px'}}>
                    * Preencha para calcular IG em exames de 1º Trimestre.
                </div>           
            </div>

            <div className="laudo-grid-2" style={{alignItems:'start', gap:'20px'}}>
                
                {/* COLUNA 1: BIOMETRIA PRINCIPAL & NEURO */}
                <div className="laudo-col" style={{gap:'10px'}}>
                    
                    {/* Card Biometria Básica */}
                    <div style={{background:'#E8F5E9', padding:'8px', borderRadius:'4px', border:'1px solid #C8E6C9'}}>
                        <div style={{fontSize:'11px', fontWeight:'bold', color:'#2E7D32', marginBottom:'5px', borderBottom:'1px solid #A5D6A7'}}>
                            MEDIDAS BÁSICAS (HADLOCK)
                        </div>
                        <div style={{display:'flex', justifyContent:'space-between', gap:'5px'}}>
                            <BioItem label="DBP" name="dbp" value={data.dbp} onChange={handleChange} />
                            <BioItem label="DOF" name="dof" value={data.dof} onChange={handleChange} />
                            <BioItem label="CC" name="cc" value={data.cc} onChange={handleChange} />
                            <BioItem label="CA" name="ca" value={data.ca} onChange={handleChange} />
                        </div>
                    </div>

                    {/* Neuro e Face */}
                    <div style={{background:'#F9F9F9', padding:'8px', borderRadius:'4px', border:'1px solid #eee'}}>
                        <div style={{fontSize:'11px', fontWeight:'bold', color:'#555', marginBottom:'5px', display:'flex', alignItems:'center', gap:'5px'}}>
                            <FaBrain size={12}/> NEURO E FACE
                        </div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px'}}>
                            <BioItem label="Cerebelo" name="cerebelo" value={data.cerebelo} onChange={handleChange} />
                            <BioItem label="Cist. Magna" name="cisternaMagna" value={data.cisternaMagna} onChange={handleChange} />
                            <BioItem label="Vent. Post." name="ventriculoPosterior" value={data.ventriculoPosterior} onChange={handleChange} />
                            <BioItem label="Prega Nucal" name="pregaNucal" value={data.pregaNucal} onChange={handleChange} />
                            <BioItem label="Osso Nasal" name="ossoNasal" value={data.ossoNasal} onChange={handleChange} />
                            <BioItem label="TN" name="tnMedida" value={data.tnMedida} onChange={handleChange} />
                        </div>
                        <div style={{display:'flex', gap:'10px', marginTop:'8px', borderTop:'1px dashed #ddd', paddingTop:'5px'}}>
                            <BioItem label="Órbita Ext." name="orbitaExterna" value={data.orbitaExterna} onChange={handleChange} />
                            <BioItem label="Órbita Int." name="orbitaInterna" value={data.orbitaInterna} onChange={handleChange} />
                        </div>
                    {/* NOVO: BOTÃO DE NOTA TN LIMITADA (Apenas Morfo 2 Tri) */}
                        {isMorfo2Tri && (
                            <div style={{marginTop:'8px', borderTop:'1px solid #eee', paddingTop:'5px'}}>
                                <button 
                                    onClick={() => addNotaBio(TXT_TN_LIMITADA)}
                                    style={{
                                        width: '100%',
                                        background: '#FFF3E0', border: '1px solid #FFE0B2', borderRadius: '4px',
                                        padding: '4px', fontSize: '9px', color: '#E65100', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight:'bold'
                                    }}
                                    title="Inserir justificativa de que não se calcula risco pela TN nesta fase"
                                >
                                    <FaPlusCircle size={9}/> Nota: TN não se aplica (CCN &gt; 84mm)
                                </button>
                            </div>
                        )}
                    </div>

                </div>

                {/* COLUNA 2: OSSOS LONGOS & DETALHES */}
                <div className="laudo-col" style={{gap:'10px'}}>
                    
                    {/* Ossos Longos */}
                    <div style={{background:'#FFF3E0', padding:'8px', borderRadius:'4px', border:'1px solid #FFE0B2'}}>
                        <div style={{fontSize:'11px', fontWeight:'bold', color:'#E65100', marginBottom:'5px', display:'flex', alignItems:'center', gap:'5px'}}>
                            <FaBone size={12}/> OSSOS LONGOS
                        </div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                            <BioItem label="Fêmur" name="femur" value={data.femur} onChange={handleChange} />
                            <BioItem label="Úmero" name="umero" value={data.umero} onChange={handleChange} />
                            <BioItem label="Tíbia" name="tibia" value={data.tibia} onChange={handleChange} />
                            <BioItem label="Fíbula" name="fibula" value={data.fibula} onChange={handleChange} />
                            <BioItem label="Ulna" name="ulna" value={data.ulna} onChange={handleChange} />
                            <BioItem label="Rádio" name="radio" value={data.radio} onChange={handleChange} />
                        </div>
                    </div>

                    {/* Extremidades e Bexiga */}
                    <div style={{background:'#F3E5F5', padding:'8px', borderRadius:'4px', border:'1px solid #E1BEE7'}}>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                            <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                <FaShoePrints size={12} color="#4A148C"/>
                                <BioItem label="Pé (Comp.)" name="peMedida" value={data.peMedida} onChange={handleChange} />
                            </div>
                            <BioItem label="Comp. Bexiga" name="compBexiga" value={data.compBexiga} onChange={handleChange} />
                        </div>
                    </div>

                </div>
            </div>

            {/* RODAPÉ: ÍNDICES AUTOMÁTICOS (EXPLICAÇÃO VISUAL) */}
            <div style={{marginTop:'10px', padding:'6px', background:'#E0F2F1', borderRadius:'4px', border:'1px solid #80CBC4', fontSize:'11px'}}>
                 <div style={{fontWeight:'bold', color:'#00695C', marginBottom:'3px'}}>Índices Calculados (Automático):</div>
                 { (data.dbp && data.dof) || (data.cc && data.ca) ? (
                    <div style={{display:'flex', justifyContent:'space-around'}}>
                        <span><strong>I.Cefálico:</strong> {data.resIc || '--'}</span>
                        <span><strong>CC/CA:</strong> {data.resCcCa || '--'}</span>
                        <span><strong>CF/CA:</strong> {data.resCfCa || '--'}</span>
                        <span><strong>CF/CC:</strong> {data.resCfCc || '--'}</span>
                    </div>
                ) : (
                    <div style={{color:'#666', fontStyle:'italic'}}>
                        Preencha DBP, CC, CA e Fêmur para ver os índices aqui.
                    </div>
                )}
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
                            <span style={{fontWeight:'bold', fontSize:'11px', color:'#333'}}>Nota Médica (Biometria e Anatomia):</span>
                        </div>
                        <textarea 
                            name="obsBiometria" 
                            value={data.obsBiometria || ''} 
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
                            placeholder="Digite aqui observações específicas sobre a biometria..."
                        />
                    </div>
    </div>
  );
};

export default SecaoBiometria;