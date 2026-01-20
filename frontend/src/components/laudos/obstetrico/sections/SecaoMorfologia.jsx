import React from 'react';
import { FaExclamationTriangle, FaCommentMedical, FaExternalLinkAlt } from 'react-icons/fa';

// Componente auxiliar para Checkbox (Garante que o clique funcione)
const CheckItem = ({ label, name, checked, onChange }) => (
    <label className="laudo-checkbox-label" style={{display:'flex', alignItems:'center', marginBottom:'4px', cursor:'pointer', padding:'2px 0'}}>
        <input 
            type="checkbox" 
            name={name} 
            checked={!!checked} 
            onChange={onChange} 
            style={{cursor:'pointer', width:'14px', height:'14px', accentColor:'#EF6C00'}}
        /> 
        <span style={{marginLeft:'6px', fontSize:'11px', color:'#333'}}>{label}</span>
    </label>
);

const FRASES_MORFO = [
    "Visualização prejudicada por sombra acústica.",
    "Membros fletidos dificultando avaliação detalhada.",
    "Colo uterino impérvio.",
    "Feto em posição posterior."
];

// NOVAS FRASES DA IMAGEM (TEXTO COMPLETO)
const TXT_GOLFBALL = "Sugere-se a critério clínico, ampliação da propedêutica morfológica fetal com ecocardiograma doppler fetal, devido à presença de foco ecogênico com ventrículo esquerdo (GOLF BALL). O GOLF BALL não é considerado malformação cardíaca e quando encontrado isoladamente não eleva o risco fetal para aneuploidias.";
const TXT_PIELO = "PIELOECTASIA - A dilatação pielo-calicial quando isolada não eleva o risco fetal para aneuploidias. Quando se mantém estável durante a gestação tem caráter benigno, geralmente sempre é juízo da função renal.";


const SecaoMorfologia = ({ data, handleChange }) => {

  const isMorfo1Tri = data.subtipo === 'OBSTETRICO_1_TRI';
  // VERIFICAÇÃO PARA MOSTRAR APENAS NO MORFOLÓGICO DE 2º TRI
  const isMorfo2Tri = data.subtipo === 'OBSTETRICO_MORFOLOGICO';

  const addFraseMorfo = (frase) => {
      const textoAtual = data.obsMorfologia || '';
      const separador = textoAtual.length > 0 && !textoAtual.endsWith(' ') ? ' ' : '';
      handleChange({ target: { name: 'obsMorfologia', value: textoAtual + separador + frase } });
  };

  return (
            <div>

                {/* --- EXCLUSIVO: RASTREAMENTO 1º TRIMESTRE --- */}
                {isMorfo1Tri && (
                    <div style={{background:'#FFF8E1', padding:'10px', borderRadius:'4px', marginBottom:'15px', border:'1px solid #FFECB3'}}>
                        <div style={{fontWeight:'bold', color:'#F57F17', marginBottom:'8px', fontSize:'12px', display:'flex', alignItems:'center'}}>
                            <FaExclamationTriangle size={12} style={{marginRight:'5px'}}/>
                            Rastreamento de Cromossomopatias (11 - 14 semanas)
                        </div>
                        
                <div style={{marginBottom:'10px'}}>
                    <CheckItem label="Osso Nasal Presente" name="ossoNasalPresente" checked={data.ossoNasalPresente} onChange={handleChange} />
                </div>

                        {/* Ducto Venoso (Independente) */}
<div style={{background:'rgba(255,255,255,0.6)', padding:'6px', borderRadius:'4px', border:'1px solid #FFE0B2'}}>
    <span className="label-pequeno" style={{color:'#E65100'}}>Ducto Venoso (Onda A):</span>
    <div style={{display:'flex', gap:'15px', marginTop:'4px', fontSize:'11px'}}>
        
        {/* OPÇÃO 1: POSITIVA */}
        <label style={{cursor:'pointer', display:'flex', alignItems:'center', gap:'4px'}}>
            <input 
                type="radio" 
                name="dvStatus" 
                checked={!!data.dvOndaAPositiva} 
                onChange={() => {
                    handleChange({target: {name: 'dvOndaAPositiva', value: true}});
                    handleChange({target: {name: 'dvOndaAZero', value: false}});
                    handleChange({target: {name: 'dvOndaAReversa', value: false}});
                }} 
            /> Positiva (Normal)
        </label>

        {/* OPÇÃO 2: ZERO */}
        <label style={{cursor:'pointer', display:'flex', alignItems:'center', gap:'4px'}}>
            <input 
                type="radio" 
                name="dvStatus" 
                checked={!!data.dvOndaAZero} 
                onChange={() => {
                    handleChange({target: {name: 'dvOndaAPositiva', value: false}});
                    handleChange({target: {name: 'dvOndaAZero', value: true}});
                    handleChange({target: {name: 'dvOndaAReversa', value: false}});
                }} 
            /> Zero
        </label>

        {/* OPÇÃO 3: REVERSA */}
        <label style={{cursor:'pointer', display:'flex', alignItems:'center', gap:'4px'}}>
            <input 
                type="radio" 
                name="dvStatus" 
                checked={!!data.dvOndaAReversa} 
                onChange={() => {
                    handleChange({target: {name: 'dvOndaAPositiva', value: false}});
                    handleChange({target: {name: 'dvOndaAZero', value: false}});
                    handleChange({target: {name: 'dvOndaAReversa', value: true}});
                }} 
            /> Reversa
        </label>
    </div>
    
    <div style={{marginTop:'5px', display:'flex', alignItems:'center'}}>
        <span style={{fontSize:'10px', marginRight:'5px'}}>IP Ducto:</span>
        <input 
            type="number" 
            step="0.01" 
            name="dvIP" 
            value={data.dvIP} 
            onChange={handleChange} 
            className="laudo-input" 
            style={{width:'60px', height:'22px'}} 
            placeholder="-"
        />
    </div>
</div>

                        {/* CÁLCULO DE RISCO (Fetal Medicine Foundation - COPY/PASTE) */}
                        <div style={{background:'#fff', border:'1px solid #ddd', padding:'8px', borderRadius:'4px', marginTop:'10px'}}>
                            
                            {/* CABEÇALHO COM BOTÃO DA CALCULADORA */}
                            <div style={{
                                display:'flex', justifyContent:'space-between', alignItems:'center', 
                                borderBottom:'1px solid #eee', paddingBottom:'5px', marginBottom:'5px'
                            }}>
                                <div style={{fontWeight:'bold', fontSize:'11px', color:'#555'}}>
                                    CÁLCULO DE RISCO (Colar do site FMF)
                                </div>
                                <button 
                                    onClick={() => window.open('https://www.fetalmedicine.org/research/assess/trisomies', 'CalculadoraFMF', 'width=1000,height=800,scrollbars=yes')}
                                    style={{
                                        background: '#1565C0', color: 'white', border: 'none', borderRadius: '4px',
                                        padding: '4px 8px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                                    }}
                                    title="Abrir Calculadora Oficial da FMF"
                                >
                                    <FaExternalLinkAlt /> Abrir FMF
                                </button>
                            </div>

                            {/* TEXTAREA PARA COLAR O RESULTADO */}
                            <textarea 
                                name="textoRiscosFMF" 
                                value={data.textoRiscosFMF || ''} 
                                onChange={handleChange} 
                                className="laudo-textarea"
                                rows="6" // Altura suficiente para o bloco de texto da FMF
                                style={{
                                    width:'100%', 
                                    fontSize:'11px', 
                                    fontFamily: 'monospace', // Ajuda a alinhar números se vierem formatados
                                    border:'1px solid #ccc', 
                                    borderRadius:'4px', 
                                    padding:'8px',
                                    background: '#FAFAFA'
                                }}
                                placeholder={"Cole aqui o resultado (Ex:\nRisks from History\nTrisomy 21: 1 in 780...)"}
                            />
                        </div>
                    </div>
                )}
                {/* --- NOVO: ACHADOS ESPECÍFICOS (APENAS 2º TRIMESTRE) --- */}
        {isMorfo2Tri && (
            <div style={{background:'#E3F2FD', padding:'10px', borderRadius:'4px', marginBottom:'15px', border:'1px solid #90CAF9'}}>
                <div style={{fontWeight:'bold', color:'#1565C0', marginBottom:'8px', fontSize:'12px', display:'flex', alignItems:'center'}}>
                    <FaExclamationTriangle size={12} style={{marginRight:'5px'}}/>
                    Achados / Marcadores (2º Trimestre)
                </div>

                <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                    
                    {/* BOTÃO GOLF BALL */}
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff', padding:'6px', borderRadius:'4px'}}>
                        <span style={{fontSize:'11px', fontWeight:'bold', color:'#555'}}>Foco Ecogênico (Golf Ball)</span>
                        <button 
                            onClick={() => addFraseMorfo(TXT_GOLFBALL)}
                            style={{
                                background: '#E8EAF6', border: '1px solid #C5CAE9', borderRadius: '4px',
                                padding: '4px 8px', fontSize: '10px', color: '#3F51B5', cursor: 'pointer', fontWeight:'bold'
                            }}
                            title="Inserir texto explicativo sobre Golf Ball"
                        >
                            + Inserir Nota
                        </button>
                    </div>

                    {/* BOTÃO PIELOECTASIA */}
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff', padding:'6px', borderRadius:'4px'}}>
                        <span style={{fontSize:'11px', fontWeight:'bold', color:'#555'}}>Pieloectasia Renal</span>
                        <button 
                            onClick={() => addFraseMorfo(TXT_PIELO)}
                            style={{
                                background: '#E8EAF6', border: '1px solid #C5CAE9', borderRadius: '4px',
                                padding: '4px 8px', fontSize: '10px', color: '#3F51B5', cursor: 'pointer', fontWeight:'bold'
                            }}
                            title="Inserir texto explicativo sobre Pieloectasia"
                        >
                            + Inserir Nota
                        </button>
                    </div>

                </div>
            </div>
        )}

                {/* --- CHECKLIST ANATÔMICO (Comum) --- */}
                <div style={{marginBottom:'5px', fontStyle:'italic', fontSize:'11px', color:'#666'}}>
                    * Marque os itens visualizados e normais. Desmarque para omitir ou citar não visualização.
                </div>
                <div className="laudo-grid-2" style={{gap: '15px'}}>
                    
                    {/* Coluna Esquerda */}
                    <div className="laudo-col" style={{gap: '2px'}}>
                        <div className="sub-header-mini">Cabeça e Tórax</div>
                        <CheckItem label="Crânio / Calota" name="morfCranio" checked={data.morfCranio} onChange={handleChange} />
                        <CheckItem label="Encéfalo / Ventrículos" name="morfCerebro" checked={data.morfCerebro} onChange={handleChange} />
                        <CheckItem label="Face / Perfil" name="morfFace" checked={data.morfFace} onChange={handleChange} />
                        <CheckItem label="Coluna Vertebral" name="morfColuna" checked={data.morfColuna} onChange={handleChange} />
                        <CheckItem label="Tórax / Pulmões" name="morfTorax" checked={data.morfTorax} onChange={handleChange} />
                        <CheckItem label="Coração (4 Câmaras)" name="morfCoracao" checked={data.morfCoracao} onChange={handleChange} />
                        <CheckItem label="Vasos da base" name="morfVasosBase" checked={data.morfVasosBase} onChange={handleChange} />
                    </div>

                    {/* Coluna Direita */}
                    <div className="laudo-col" style={{gap: '2px'}}>
                        <div className="sub-header-mini">Abdome e Membros</div>
                        <CheckItem label="Estômago" name="morfEstomago" checked={data.morfEstomago} onChange={handleChange} />
                        <CheckItem label="Fígado / Vesícula" name="morfFigado" checked={data.morfFigado} onChange={handleChange} />
                        <CheckItem label="Rins" name="morfRins" checked={data.morfRins} onChange={handleChange} />
                        <CheckItem label="Bexiga" name="morfBexiga" checked={data.morfBexiga} onChange={handleChange} />
                        <CheckItem label="Parede Abdominal" name="morfParedeAbd" checked={data.morfParedeAbd} onChange={handleChange} />
                        <CheckItem label="Genitália Externa" name="morfGenitalia" checked={data.morfGenitalia} onChange={handleChange} />
                        <CheckItem label="Membros (sup/inf)" name="morfMembros" checked={data.morfMembros} onChange={handleChange} />
                    </div>
                </div>
             {/* CAMPO DE OBSERVAÇÃO PADRONIZADO (No final do return) */}
             <div style={{
                 borderTop: '1px solid #eee', 
                 padding: '10px 12px', 
                 background: '#FAFAFA', 
                 borderBottomLeftRadius: '4px',
                 borderBottomRightRadius: '4px'
             }}>
                <div style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px'}}>
                    <FaCommentMedical color="#555"/>
                    <span style={{fontWeight:'bold', fontSize:'11px', color:'#333'}}>Nota Médica (Morfologia):</span>
                </div>

                {/* BOTÕES DE FRASES */}
                <div style={{display:'flex', flexWrap:'wrap', gap:'5px', marginBottom:'8px'}}>
                    {FRASES_MORFO.map((frase, idx) => (
                        <button
                            key={idx}
                            onClick={() => addFraseMorfo(frase)}
                            style={{
                                background: '#FFF', border: '1px solid #CCC', borderRadius: '12px',
                                padding: '2px 8px', fontSize: '9px', color: '#666', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '3px'
                            }}
                        >
                            + {frase}
                        </button>
                    ))}
                </div>

                <textarea 
                    name="obsMorfologia" 
                    value={data.obsMorfologia || ''} 
                    onChange={handleChange} 
                    className="laudo-textarea"
                    rows="2"
                    style={{width:'100%', fontSize:'11px', border:'1px solid #ccc', borderRadius:'4px', padding:'8px'}}
                    placeholder="Digite observações..."
                />
            </div>
    </div>
  );
};

export default SecaoMorfologia;