import React, { useMemo } from 'react';

// --- HELPER: BioRow (Linha de Biometria com Fórmulas de Hadlock/Jeanty) ---
const BioRow = ({ 
    label, name, value, onChange, 
    include, toggleInclude 
}) => {
    
    const isActive = value !== '' && value !== null && value !== undefined;

    const handleActiveChange = (e) => {
        if (!e.target.checked) {
            onChange({ target: { name: name, value: '' } });
        }
    };

    // FÓRMULAS REAIS DE HADLOCK (1984) E JEANTY
    const igCalculada = useMemo(() => {
        if (!value || isNaN(value) || parseFloat(value) <= 0) return "...";
        
        // As fórmulas usam CM, mas o input é MM.
        const vCm = parseFloat(value) / 10; 
        let weeks = 0;

        // Regressão polinomial padrão (Hadlock et al. / Jeanty)
        switch (name) {
            case 'dbp': // Hadlock (BPD)
                weeks = 9.54 + (1.482 * vCm) + (0.1676 * (vCm * vCm));
                break;
            case 'cc': // Hadlock (HC)
                weeks = 8.96 + (0.540 * vCm) + (0.0003 * (Math.pow(vCm, 3)));
                break;
            case 'ca': // Hadlock (AC)
                weeks = 8.14 + (0.753 * vCm) + (0.0036 * (vCm * vCm));
                break;
            case 'femur': // Hadlock (FL)
                weeks = 10.35 + (2.460 * vCm) + (0.170 * (vCm * vCm));
                break;
            case 'umero': // Jeanty (Humerus)
                weeks = 9.65 + (3.16 * vCm) + (0.07 * (vCm * vCm));
                break;
            case 'tibia': // Jeanty
                weeks = 10.15 + (3.06 * vCm) + (0.11 * (vCm * vCm));
                break;
            case 'ulna': // Jeanty
                weeks = 10.60 + (3.07 * vCm) + (0.15 * (vCm * vCm));
                break;
            case 'fibula': // Jeanty
                weeks = 10.74 + (3.06 * vCm) + (0.13 * (vCm * vCm));
                break;
            case 'cerebelo': // Hill (Aprox linear para cerebelo em mm ~= semanas entre 14-22 sem)
                // O diâmetro transverso do cerebelo em mm é aprox igual a IG em semanas no 2º tri.
                weeks = parseFloat(value); 
                break;
            default:
                return "...";
        }

        if (!weeks || weeks < 4 || weeks > 44) return "...";

        // Converte semanas decimais (ex: 32.5) para "32s 3d"
        const w = Math.floor(weeks);
        const d = Math.round((weeks - w) * 7);
        
        // Ajuste se dias arredondar para 7
        if (d === 7) return `${w + 1}s 0d`;
        return `${w}s ${d}d`;

    }, [value, name]);

    return (
        <div className="bio-row" style={{ opacity: isActive ? 1 : 0.6 }}>
            <input 
                type="checkbox" 
                className="bio-check-left"
                checked={isActive} 
                onChange={handleActiveChange}
                title="Desmarcar para limpar"
            />

            <span className="bio-label" style={{minWidth:'90px'}}>{label}</span>
            <input 
                name={name} 
                value={value || ''} 
                onChange={onChange} 
                placeholder="mm"
                className="bio-input"
                autoComplete="off"
            />
            <span style={{fontSize:'10px', color:'#777'}}>mm</span>

            {/* Exibe o cálculo real */}
            <span className="bio-ig-display" style={{color: '#2E7D32', fontWeight: 'bold'}}>
                {isActive ? igCalculada : '...'}
            </span>

            {include !== undefined && (
                <label className="bio-check-include-label">
                    <input 
                        type="checkbox" 
                        checked={!!include} 
                        onChange={(e) => toggleInclude(name, e.target.checked)}
                        disabled={!isActive} 
                    />
                    datar
                </label>
            )}
        </div>
    );
};

const SecaoBiometria = ({ data, handleChange }) => {

  const handleToggleInclude = (name, checked) => {
      const mapInclude = {
          'dbp': 'incDbp', 'dof': 'incDof', 'cc': 'incCc', 
          'ca': 'incCa', 'umero': 'incUmero', 'femur': 'incFemur'
      };
      if (mapInclude[name]) {
          handleChange({ target: { name: mapInclude[name], value: checked, type: 'checkbox', checked: checked } });
      }
  };

  return (
    <div className="laudo-section">
        <div className="header-base header-green">Biometria Fetal e Morfologia</div>
        <div className="laudo-section-body">
            
            <div className="laudo-grid-2" style={{gap: '30px', alignItems: 'start'}}>
                
                {/* COLUNA 1: BIOMETRIA BÁSICA E NEURO */}
                <div className="laudo-col">
                    <h4 style={{fontSize:'12px', color:'#2E7D32', borderBottom:'1px solid #ccc', marginBottom:'5px', fontWeight:'bold'}}>
                        Biometria Básica
                    </h4>
                    <BioRow label="DBP" name="dbp" value={data.dbp} onChange={handleChange} include={data.incDbp} toggleInclude={handleToggleInclude} />
                    <BioRow label="DOF" name="dof" value={data.dof} onChange={handleChange} include={data.incDof} toggleInclude={handleToggleInclude} />
                    <BioRow label="CC" name="cc" value={data.cc} onChange={handleChange} include={data.incCc} toggleInclude={handleToggleInclude} />
                    <BioRow label="CA" name="ca" value={data.ca} onChange={handleChange} include={data.incCa} toggleInclude={handleToggleInclude} />
                    <BioRow label="Comp. Bexiga" name="compBexiga" value={data.compBexiga} onChange={handleChange} />

                    <h4 style={{fontSize:'12px', color:'#2E7D32', borderBottom:'1px solid #ccc', marginBottom:'5px', marginTop:'15px', fontWeight:'bold'}}>
                        Neuro e Face (Morfológico)
                    </h4>
                    <BioRow label="Cerebelo" name="cerebelo" value={data.cerebelo} onChange={handleChange} />
                    <BioRow label="Cist. Magna" name="cisternaMagna" value={data.cisternaMagna} onChange={handleChange} />
                    <BioRow label="Ventrículo Post." name="ventriculoPosterior" value={data.ventriculoPosterior} onChange={handleChange} />
                    <BioRow label="Prega Nucal" name="pregaNucal" value={data.pregaNucal} onChange={handleChange} />
                    <BioRow label="Transl. Nucal" name="tnMedida" value={data.tnMedida} onChange={handleChange} />
                    <BioRow label="Osso Nasal" name="ossoNasal" value={data.ossoNasal} onChange={handleChange} />
                    
                    <div style={{display:'flex', gap:'5px', marginTop:'5px'}}>
                        <div style={{flex:1}}>
                             <span style={{fontSize:'11px', fontWeight:'bold', display:'block', marginBottom:'2px'}}>Órbita Ext.</span>
                             <input className="form-input-compact" name="orbitaExterna" value={data.orbitaExterna || ''} onChange={handleChange} placeholder="mm" />
                        </div>
                        <div style={{flex:1}}>
                             <span style={{fontSize:'11px', fontWeight:'bold', display:'block', marginBottom:'2px'}}>Órbita Int.</span>
                             <input className="form-input-compact" name="orbitaInterna" value={data.orbitaInterna || ''} onChange={handleChange} placeholder="mm" />
                        </div>
                    </div>
                </div>

                {/* COLUNA 2: OSSOS LONGOS */}
                <div className="laudo-col">
                    <h4 style={{fontSize:'12px', color:'#2E7D32', borderBottom:'1px solid #ccc', marginBottom:'5px', fontWeight:'bold'}}>
                        Ossos Longos
                    </h4>
                    <BioRow label="Fêmur" name="femur" value={data.femur} onChange={handleChange} include={data.incFemur} toggleInclude={handleToggleInclude} />
                    <BioRow label="Úmero" name="umero" value={data.umero} onChange={handleChange} include={data.incUmero} toggleInclude={handleToggleInclude} />

                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'10px'}}>
                        <BioRow label="Ulna" name="ulna" value={data.ulna} onChange={handleChange} />
                        <BioRow label="Rádio" name="radio" value={data.radio} onChange={handleChange} />
                        <BioRow label="Tíbia" name="tibia" value={data.tibia} onChange={handleChange} />
                        <BioRow label="Fíbula" name="fibula" value={data.fibula} onChange={handleChange} />
                    </div>

                    <h4 style={{fontSize:'12px', color:'#2E7D32', borderBottom:'1px solid #ccc', marginBottom:'5px', marginTop:'15px', fontWeight:'bold'}}>
                        Extremidades
                    </h4>
                    <BioRow label="Pé (Comp.)" name="peMedida" value={data.peMedida} onChange={handleChange} />
                </div>
            </div>
            
            {/* RODAPÉ: ÍNDICES CALCULADOS */}
            <div style={{borderTop: '2px solid #2E7D32', marginTop:'15px', paddingTop:'8px', background:'#E8F5E9', padding:'8px', borderRadius:'4px'}}>
                <div style={{fontWeight:'bold', fontSize:'11px', color:'#2E7D32', marginBottom:'5px'}}>Índices Calculados Automaticamente:</div>
                <div style={{display:'flex', gap:'20px', fontSize:'12px', flexWrap:'wrap'}}>
                    <span title="Índice Cefálico (DBP/DOF)">I.Cefálico: <strong>{data.resIc || '--'}</strong></span>
                    <span title="Circunferência Cefálica / Abdominal">CC/CA: <strong>{data.resCcCa || '--'}</strong></span>
                    <span title="Fêmur / Circunferência Abdominal">CF/CA: <strong>{data.resCfCa || '--'}</strong></span>
                    <span title="Fêmur / Circunferência Cefálica">CF/CC: <strong>{data.resCfCc || '--'}</strong></span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SecaoBiometria;