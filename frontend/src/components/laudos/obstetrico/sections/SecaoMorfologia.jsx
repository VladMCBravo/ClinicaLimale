import React from 'react';
import { FaHeartbeat, FaCheckSquare, FaExclamationTriangle } from 'react-icons/fa';
import { FaCalculator, FaExternalLinkAlt } from 'react-icons/fa'; // Adicione ao import

// Componente auxiliar para Checkbox simples
const CheckItem = ({ label, name, checked, onChange }) => (
    <label className="laudo-checkbox-label" style={{display:'flex', alignItems:'center', marginBottom:'3px', cursor:'pointer'}}>
        <input 
            type="checkbox" 
            name={name} 
            checked={!!checked} 
            onChange={onChange} 
            style={{cursor:'pointer'}}
        /> 
        <span style={{marginLeft:'6px', fontSize:'13px'}}>{label}</span>
    </label>
);

const SecaoMorfologia = ({ data, handleChange }) => {

  const isMorfo1Tri = data.subtipo === 'OBSTETRICO_1_TRI';

  return (
    <>
        {/* BLOCO 1: ANÁLISE MORFOLÓGICA */}
        <div className="laudo-section">
            <div className="header-base header-green">
                <FaCheckSquare size={12} style={{marginRight:'5px'}}/> 
                Análise Morfológica {isMorfo1Tri ? '(1º Trimestre)' : '(2º Trimestre)'}
            </div>
            
            <div className="laudo-section-body">

                {/* --- EXCLUSIVO: RASTREAMENTO 1º TRIMESTRE --- */}
                {isMorfo1Tri && (
                    <div style={{background:'#FFF8E1', padding:'10px', borderRadius:'4px', marginBottom:'15px', border:'1px solid #FFECB3'}}>
                        <div style={{fontWeight:'bold', color:'#F57F17', marginBottom:'8px', fontSize:'12px', display:'flex', alignItems:'center'}}>
                            <FaExclamationTriangle size={12} style={{marginRight:'5px'}}/>
                            Rastreamento de Cromossomopatias (11 - 14 semanas)
                        </div>
                        
                        {/* Marcadores Principais (REMOVIDO TRICÚSPIDE) */}
                        <div style={{marginBottom:'10px', display:'flex', gap:'15px', flexWrap:'wrap'}}>
                            <CheckItem label="Osso Nasal Presente" name="ossoNasalPresente" checked={data.ossoNasalPresente} onChange={handleChange} />
                            {/* Tricúspide removido daqui conforme solicitado */}
                        </div>

                        {/* Ducto Venoso */}
                        <div style={{background:'rgba(255,255,255,0.5)', padding:'5px', borderRadius:'4px', marginBottom:'10px'}}>
    <span className="label-pequeno">Ducto Venoso (Onda A):</span>
    <div style={{display:'flex', gap:'10px', marginTop:'3px'}}>
        {/* OPÇÃO POSITIVA: Zera os riscos */}
        <label style={{fontSize:'12px', cursor:'pointer'}}>
            <input 
                type="radio" 
                name="dvStatus" 
                checked={!data.dvOndaAZero && !data.dvOndaAReversa} 
                onChange={() => handleChange({
                    target: { 
                        name: 'dvOndaAZero', value: false, 
                        // Truque: Passamos um objeto fake para atualizar 2 estados de uma vez se seu hook permitir, 
                        // mas vamos simplificar: O ideal é atualizar um por um ou usar um handler customizado.
                        // Como seu handleChange é simples, vamos garantir via UX:
                    } 
                }, 
                // Forçamos a limpeza manual dos outros estados chamando handleChange multiplas vezes ou
                // (Melhor solução para React simples):
                handleChange({target: {name: 'dvOndaAZero', value: false, type:'checkbox', checked: false}}),
                handleChange({target: {name: 'dvOndaAReversa', value: false, type:'checkbox', checked: false}})
                )} 
            /> Positiva (Normal)
        </label>

        {/* OPÇÃO ZERO */}
        <label style={{fontSize:'12px', cursor:'pointer'}}>
            <input 
                type="radio" 
                name="dvStatus" 
                checked={!!data.dvOndaAZero} 
                onChange={() => {
                    handleChange({target: {name: 'dvOndaAZero', value: true, type:'checkbox', checked: true}});
                    handleChange({target: {name: 'dvOndaAReversa', value: false, type:'checkbox', checked: false}});
                }} 
            /> Zero
        </label>

        {/* OPÇÃO REVERSA */}
        <label style={{fontSize:'12px', cursor:'pointer'}}>
            <input 
                type="radio" 
                name="dvStatus" 
                checked={!!data.dvOndaAReversa} 
                onChange={() => {
                    handleChange({target: {name: 'dvOndaAZero', value: false, type:'checkbox', checked: false}});
                    handleChange({target: {name: 'dvOndaAReversa', value: true, type:'checkbox', checked: true}});
                }} 
            /> Reversa
        </label>
    </div>
    
    <div style={{marginTop:'5px', display:'flex', alignItems:'center'}}>
        <span className="label-pequeno" style={{marginRight:'5px'}}>IP Ducto:</span>
        <input type="number" step="0.01" name="dvIP" value={data.dvIP} onChange={handleChange} className="laudo-input-small" style={{width:'50px'}} />
    </div>
</div>

                        {/* TABELA DE RISCOS (Fetal Medicine Foundation) */}
<div style={{background:'#fff', border:'1px solid #ddd', padding:'5px', borderRadius:'4px'}}>
    
    {/* CABEÇALHO COM BOTÃO DA CALCULADORA */}
    <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center', 
        borderBottom:'1px solid #eee', paddingBottom:'5px', marginBottom:'5px'
    }}>
        <div style={{fontWeight:'bold', fontSize:'11px', color:'#555'}}>
            CÁLCULO DE RISCO (1:X)
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
                            <table style={{width:'100%', fontSize:'11px', borderCollapse:'collapse'}}>
                                <thead>
                                    <tr style={{background:'#f0f0f0'}}>
                                        <th style={{padding:'2px'}}></th>
                                        <th style={{padding:'2px'}}>T21</th>
                                        <th style={{padding:'2px'}}>T18</th>
                                        <th style={{padding:'2px'}}>T13</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{fontWeight:'bold'}}>Basal</td>
                                        <td><input type="text" name="riscoT21Basal" value={data.riscoT21Basal} onChange={handleChange} className="laudo-input" style={{width:'100%'}} placeholder="Ex: 1500"/></td>
                                        <td><input type="text" name="riscoT18Basal" value={data.riscoT18Basal} onChange={handleChange} className="laudo-input" style={{width:'100%'}}/></td>
                                        <td><input type="text" name="riscoT13Basal" value={data.riscoT13Basal} onChange={handleChange} className="laudo-input" style={{width:'100%'}}/></td>
                                    </tr>
                                    <tr>
                                        <td style={{fontWeight:'bold'}}>Corrigido</td>
                                        <td><input type="text" name="riscoT21Corrigido" value={data.riscoT21Corrigido} onChange={handleChange} className="laudo-input" style={{width:'100%'}} placeholder="Ex: 8500"/></td>
                                        <td><input type="text" name="riscoT18Corrigido" value={data.riscoT18Corrigido} onChange={handleChange} className="laudo-input" style={{width:'100%'}}/></td>
                                        <td><input type="text" name="riscoT13Corrigido" value={data.riscoT13Corrigido} onChange={handleChange} className="laudo-input" style={{width:'100%'}}/></td>
                                    </tr>
                                </tbody>
                            </table>
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
            </div>
        </div>

        {/* BLOCO 2: VITALIDADE FETAL */}
        <div className="laudo-section">
             <div className="header-base header-green">
                <FaHeartbeat size={12} style={{marginRight:'5px'}}/> 
                Vitalidade Fetal
            </div>
             <div className="laudo-section-body">
                 <div className="laudo-row" style={{alignItems:'center', background:'#f9f9f9', padding:'8px', borderRadius:'4px'}}>
                     <span style={{fontWeight:'bold'}}>BCF:</span>
                     <input 
                        name="bcf" 
                        value={data.bcf} 
                        onChange={handleChange} 
                        className="laudo-input" 
                        style={{width:'60px', marginLeft:'5px', marginRight:'5px', fontWeight:'bold', color:'#2E7D32'}}
                        placeholder="bpm"
                    /> 
                     <span style={{marginRight:'20px'}}>bpm</span>

                     <div style={{borderLeft:'1px solid #ccc', height:'20px', marginRight:'15px'}}></div>

                     <CheckItem label="Movimentação Ativa" name="movFetal" checked={data.movFetal} onChange={handleChange} />
                     <span style={{margin: '0 10px', color:'#ccc'}}>|</span>
                     <CheckItem label="Deglutição" name="degluticao" checked={data.degluticao} onChange={handleChange} />
                 </div>
             </div>
             {/* CAMPO DE OBSERVAÇÃO LIVRE DA SEÇÃO */}
    <div style={{marginTop:'10px'}}>
        <span className="label-pequeno" style={{fontWeight:'bold', color:'#555'}}>Nota Médica (Adicional):</span>
        <textarea 
            name="obsMorfologia" 
            value={data.obsMorfologia} 
            onChange={handleChange} 
            className="laudo-textarea"
            rows="2"
            style={{width:'100%', fontSize:'11px', border:'1px solid #ccc', marginTop:'2px'}}
            placeholder="Digite aqui observações específicas sobre a morfologia..."
        />
    </div>
        </div>
    </>
  );
};

export default SecaoMorfologia;