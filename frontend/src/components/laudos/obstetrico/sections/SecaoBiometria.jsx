import React, { useMemo } from 'react';
// CSS já importado no Pai

// --- HELPER: Componente de Linha de Biometria Inteligente ---
const BioRow = ({ 
    label, 
    name, 
    value, 
    onChange, 
    active, // Novo: Estado do checkbox esquerdo
    toggleActive, // Novo: Função para alternar ativo
    include, // Estado do checkbox direito
    toggleInclude // Função para alternar inclusão
}) => {
    
    // Simulação de cálculo de IG reverso (mm -> semanas)
    // No sistema real, você usaria as tabelas de Hadlock aqui
    const igCalculada = useMemo(() => {
        if (!value || isNaN(value)) return "...";
        // Fórmulas Aproximadas (Apenas para demonstração visual)
        const v = parseFloat(value);
        let weeks = 0; // CORRIGIDO: Nome da variável alterado de 'semanas' para 'weeks'
        
        if (label === 'DBP') weeks = Math.sqrt(v) * 3.2; 
        else if (label === 'CC') weeks = v / 10;
        else if (label === 'CA') weeks = v / 9.5;
        else if (label === 'Fêmur') weeks = v / 2.8 + 8;
        else weeks = v / 3 + 5; // Genérico

        if(isNaN(weeks)) return "...";
        return `${weeks.toFixed(1)}`;
    }, [value, label]);

    return (
        <div className="bio-row" style={{ opacity: active ? 1 : 0.6 }}>
            {/* 1. Checkbox Ativar (Esquerda - Azul) */}
            <input 
                type="checkbox" 
                className="bio-check-left"
                checked={active}
                onChange={(e) => toggleActive(name, e.target.checked)}
                title={active ? "Desativar medida" : "Ativar medida"}
            />

            {/* 2. Label e Input */}
            <span className="bio-label">{label}</span>
            <input 
                name={name} 
                value={value} 
                onChange={onChange} 
                disabled={!active}
                className="bio-input"
                autoComplete="off"
            />
            <span style={{fontSize:'10px', color:'#777'}}>mm</span>

            {/* 3. IG Calculada Automaticamente */}
            <span className="bio-ig-display">
                I.G.: {active && value ? igCalculada : '.......'}
            </span>

            {/* 4. Checkbox Incluir (Direita) */}
            {include !== undefined && (
                <label className="bio-check-include-label">
                    <input 
                        type="checkbox" 
                        checked={include} 
                        onChange={(e) => toggleInclude(name, e.target.checked)}
                        disabled={!active}
                    />
                    incluir no cálculo da I.G.
                </label>
            )}
        </div>
    );
};

const SecaoBiometria = ({ data, handleChange }) => {

  // Função auxiliar para manipular os checkboxes específicos desta seção
  const handleToggleActive = (name, checked) => {
      // Se desmarcar, limpamos o valor para simular "desativado" 
      // ou idealmente atualizamos um estado 'activeX'
      if (!checked) {
          handleChange({ target: { name: name, value: '' } });
      }
  };

  const handleToggleInclude = (name, checked) => {
      // Mapeia o nome do input para o nome do checkbox de inclusão
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
                
                {/* COLUNA 1: Principais (Com cálculo de IG) */}
                <div className="laudo-col">
                    <BioRow 
                        label="DBP" name="dbp" value={data.dbp} onChange={handleChange}
                        active={true} toggleActive={()=>{}} // Placeholder até atualizar estado
                        include={data.incDbp} toggleInclude={handleToggleInclude}
                    />
                    <BioRow 
                        label="DOF" name="dof" value={data.dof} onChange={handleChange}
                        active={true} toggleActive={()=>{}}
                        include={data.incDof} toggleInclude={handleToggleInclude}
                    />
                    <BioRow 
                        label="CC" name="cc" value={data.cc} onChange={handleChange}
                        active={true} toggleActive={()=>{}}
                        include={data.incCc} toggleInclude={handleToggleInclude}
                    />
                    <BioRow 
                        label="CA" name="ca" value={data.ca} onChange={handleChange}
                        active={true} toggleActive={()=>{}}
                        include={data.incCa} toggleInclude={handleToggleInclude}
                    />
                    <BioRow 
                        label="Úmero" name="umero" value={data.umero} onChange={handleChange}
                        active={true} toggleActive={()=>{}}
                        include={data.incUmero} toggleInclude={handleToggleInclude} // Adicionei incUmero no estado
                    />
                    <BioRow 
                        label="Fêmur" name="femur" value={data.femur} onChange={handleChange}
                        active={true} toggleActive={()=>{}}
                        include={data.incFemur} toggleInclude={handleToggleInclude}
                    />
                </div>

                {/* COLUNA 2: Ossos Longos e Detalhes (Sem IG checkbox no vídeo) */}
                <div className="laudo-col">
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                        <BioRow label="Ulna" name="ulna" value={data.ulna} onChange={handleChange} active={!!data.ulna} toggleActive={()=>{}} />
                        <BioRow label="Tíbia" name="tibia" value={data.tibia} onChange={handleChange} active={!!data.tibia} toggleActive={()=>{}} />
                        <BioRow label="Rádio" name="radio" value={data.radio} onChange={handleChange} active={!!data.radio} toggleActive={()=>{}} />
                        <BioRow label="Fíbula" name="fibula" value={data.fibula} onChange={handleChange} active={!!data.fibula} toggleActive={()=>{}} />
                    </div>
                    
                    <div style={{marginTop: '10px', borderTop:'1px solid #eee', paddingTop:'5px'}}>
                        <BioRow label="Comp. pé" name="pe" value={data.pe} onChange={handleChange} active={true} toggleActive={()=>{}} />
                        <BioRow label="D. Binoc." name="diametroBinocular" value={data.diametroBinocular} onChange={handleChange} active={true} toggleActive={()=>{}} />
                        <BioRow label="D. Inter." name="diametroInterocular" value={data.diametroInterocular} onChange={handleChange} active={true} toggleActive={()=>{}} />
                        <BioRow label="Cerebelo" name="cerebelo" value={data.cerebelo} onChange={handleChange} active={true} toggleActive={()=>{}} />
                        <BioRow label="C. Magna" name="cisternaMagna" value={data.cisternaMagna} onChange={handleChange} active={true} toggleActive={()=>{}} />
                        <BioRow label="Ventrículo" name="ventriculoLat" value={data.ventriculoLat} onChange={handleChange} active={true} toggleActive={()=>{}} />
                        <BioRow label="Osso Nasal" name="ossoNasal" value={data.ossoNasal} onChange={handleChange} active={true} toggleActive={()=>{}} />
                        <BioRow label="P. Nucal" name="pregaNucal" value={data.pregaNucal} onChange={handleChange} active={true} toggleActive={()=>{}} />
                    </div>
                </div>

            </div>
            
            {/* RODAPÉ: ÍNDICES (CÁLCULO AUTOMÁTICO VISUAL) */}
            <div style={{borderTop: '2px solid #2E7D32', marginTop:'10px', paddingTop:'5px', background:'#E8F5E9', padding:'5px'}}>
                <div style={{fontWeight:'bold', fontSize:'11px', color:'#2E7D32', marginBottom:'5px'}}>Índices Calculados:</div>
                <div style={{display:'flex', gap:'20px', fontSize:'11px'}}>
                    <span>I.Cefálico: <strong>{((data.dbp/data.dof)*100 || 0).toFixed(1)}</strong></span>
                    <span>CC/CA: <strong>{(data.cc/data.ca || 0).toFixed(2)}</strong></span>
                    <span>CF/CA: <strong>{((data.femur/data.ca)*100 || 0).toFixed(1)}</strong></span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SecaoBiometria;