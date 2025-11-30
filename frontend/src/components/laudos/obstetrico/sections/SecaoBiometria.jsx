import React, { useMemo } from 'react';

// --- HELPER: BioRow ---
const BioRow = ({ 
    label, name, value, onChange, 
    include, toggleInclude 
}) => {
    
    // Consideramos ativo se tiver valor preenchido (mesmo string vazia se o usuário estiver digitando)
    const isActive = value !== '' && value !== null && value !== undefined;

    const handleActiveChange = (e) => {
        const isChecked = e.target.checked;
        if (!isChecked) {
            // Se desmarcar, força enviar string vazia para limpar no Pai e desligar automações
            onChange({ target: { name: name, value: '' } });
        }
    };

    const igCalculada = useMemo(() => {
        if (!value || isNaN(value)) return "...";
        const v = parseFloat(value);
        let weeks = 0;
        // Fórmulas fictícias mantidas
        if (label === 'DBP') weeks = Math.sqrt(v) * 3.2; 
        else if (label === 'CC') weeks = v / 10;
        else if (label === 'CA') weeks = v / 9.5;
        else if (label === 'Fêmur') weeks = v / 2.8 + 8;
        else weeks = v / 3 + 5; 
        return isNaN(weeks) ? "..." : weeks.toFixed(1);
    }, [value, label]);

    return (
        <div className="bio-row" style={{ opacity: isActive ? 1 : 0.6 }}>
            {/* Checkbox Ativar (Limpar valor) */}
            <input 
                type="checkbox" 
                className="bio-check-left"
                checked={isActive} 
                onChange={handleActiveChange}
                title="Desmarcar para limpar"
            />

            <span className="bio-label">{label}</span>
            <input 
                name={name} 
                value={value} 
                onChange={onChange} 
                placeholder="mm"
                className="bio-input"
                autoComplete="off"
            />
            <span style={{fontSize:'10px', color:'#777'}}>mm</span>

            <span className="bio-ig-display">
                I.G.: {isActive ? igCalculada : '.......'}
            </span>

            {include !== undefined && (
                <label className="bio-check-include-label">
                    <input 
                        type="checkbox" 
                        checked={!!include} 
                        onChange={(e) => toggleInclude(name, e.target.checked)}
                        disabled={!isActive} 
                    />
                    incluir no cálculo da I.G.
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
        <div className="header-base header-green">Biometria fetal</div>
        <div className="laudo-section-body">
            <div className="laudo-grid-2" style={{gap: '30px'}}>
                {/* COLUNA 1 */}
                <div className="laudo-col">
                    <BioRow label="DBP" name="dbp" value={data.dbp} onChange={handleChange} include={data.incDbp} toggleInclude={handleToggleInclude} />
                    <BioRow label="DOF" name="dof" value={data.dof} onChange={handleChange} include={data.incDof} toggleInclude={handleToggleInclude} />
                    <BioRow label="CC" name="cc" value={data.cc} onChange={handleChange} include={data.incCc} toggleInclude={handleToggleInclude} />
                    <BioRow label="CA" name="ca" value={data.ca} onChange={handleChange} include={data.incCa} toggleInclude={handleToggleInclude} />
                    <BioRow label="Úmero" name="umero" value={data.umero} onChange={handleChange} include={data.incUmero} toggleInclude={handleToggleInclude} />
                    <BioRow label="Fêmur" name="femur" value={data.femur} onChange={handleChange} include={data.incFemur} toggleInclude={handleToggleInclude} />
                </div>

                {/* COLUNA 2 */}
                <div className="laudo-col">
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                        <BioRow label="Ulna" name="ulna" value={data.ulna} onChange={handleChange} />
                        <BioRow label="Tíbia" name="tibia" value={data.tibia} onChange={handleChange} />
                        <BioRow label="Rádio" name="radio" value={data.radio} onChange={handleChange} />
                        <BioRow label="Fíbula" name="fibula" value={data.fibula} onChange={handleChange} />
                    </div>
                </div>
            </div>
            
            {/* RODAPÉ VISUAL - AGORA USA OS DADOS CALCULADOS NO PAI */}
            <div style={{borderTop: '2px solid #2E7D32', marginTop:'10px', paddingTop:'5px', background:'#E8F5E9', padding:'5px'}}>
                <div style={{fontWeight:'bold', fontSize:'11px', color:'#2E7D32', marginBottom:'5px'}}>Índices Calculados:</div>
                <div style={{display:'flex', gap:'20px', fontSize:'11px'}}>
                    <span>I.Cefálico: <strong>{data.resIc || '--'}</strong></span>
                    <span>CC/CA: <strong>{data.resCcCa || '--'}</strong></span>
                    <span>CF/CA: <strong>{data.resCfCa || '--'}</strong></span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SecaoBiometria;