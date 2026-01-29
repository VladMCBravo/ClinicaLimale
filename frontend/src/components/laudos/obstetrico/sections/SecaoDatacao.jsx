import React, { useMemo } from 'react';
import { MdDateRange, MdWarning } from 'react-icons/md';
import { FaCalendarAlt, FaCalculator, FaHistory, FaMicroscope} from 'react-icons/fa';

const SecaoDatacao = ({ data, handleChange }) => {

  // --- LÓGICA DO ALERTA (MANTIDA) ---
  const alertaDivergencia = useMemo(() => {
      // ... (Mantenha seu código de alerta existente aqui) ...
      if (!data.dppDum || !data.dppBiometriaCalculada || !data.usarDum) return null;
      try {
          const parseBR = (str) => {
              if(!str) return null;
              const [d, m, y] = str.split('/');
              return new Date(y, m - 1, d);
          };
          const d1 = parseBR(data.dppDum);
          const d2 = parseBR(data.dppBiometriaCalculada);
          if (!d1 || !d2) return null;
          const diffTime = Math.abs(d2 - d1);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays > 7) {
              return (
                  <div style={{marginTop: '5px', padding: '6px', background: '#FFF8E1', border: '1px solid #FFECB3', color: '#F57F17', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                      <MdWarning size={14} />
                      <strong>Atenção:</strong> Diferença de {diffDays} dias entre DUM e Biometria.
                  </div>
              );
          }
      } catch (e) { return null; }
      return null;
  }, [data.dppDum, data.dppBiometriaCalculada, data.usarDum]);

  // Função para garantir que os Radios limpem os estados conflitantes
  const handleModeChange = (modo) => {
      // Se selecionou um modo de DUM, atualiza os flags
      const updates = {
          usarDum: modo === 'USAR_DUM',
          dumDesconhecida: modo === 'DUM_DESCONHECIDA',
          naoUsarDum: modo === 'NAO_USAR'
      };
      
      // Itera e dispara o handleChange para cada um
      Object.keys(updates).forEach(key => {
          handleChange({ target: { name: key, value: updates[key], type: 'checkbox', checked: updates[key] } });
      });
  };

  // Função para o Checkbox Prioritário da Biometria
  const handleBiometriaPrioridade = (e) => {
      handleChange(e);
      // Se marcou para usar biometria, não precisamos desmarcar os outros (o textBuilder já resolve a prioridade),
      // mas podemos dar um feedback visual se quiser. Por enquanto, a lógica do textBuilder é suficiente.
  };

  // Helper para o Banner de Inteligência
  const renderBannerVeredito = () => {
    if (!data.igVeredito || !data.metodoDatacao) return null;
    
    const isRedatado = data.metodoDatacao === 'CCN_REDATADO';
    const isDum = data.metodoDatacao === 'DUM';
    const isCcnApenas = data.metodoDatacao === 'CCN';

    // Cores e ícones baseados na decisão
    const config = isRedatado 
        ? { bg: '#FFF3E0', border: '#FFE0B2', color: '#E65100', icon: '💡', title: 'DATAÇÃO REDATADA PELO CCN' }
        : isDum 
            ? { bg: '#E8F5E9', border: '#C8E6C9', color: '#2E7D32', icon: '✅', title: 'DATAÇÃO MANTIDA PELA DUM' }
            : { bg: '#E3F2FD', border: '#BBDEFB', color: '#0D47A1', icon: '📏', title: 'DATAÇÃO PELO CCN' };

    return (
        <div style={{
            marginBottom: '12px', padding: '10px', borderRadius: '6px',
            background: config.bg, border: `1px solid ${config.border}`,
            display: 'flex', alignItems: 'center', gap: '10px', transition: '0.3s'
        }}>
            <div style={{fontSize: '20px'}}>{config.icon}</div>
            <div style={{flex: 1}}>
                <div style={{fontSize: '11px', fontWeight: 'bold', color: config.color}}>
                    {config.title}
                </div>
                <div style={{fontSize: '10px', color: '#444', lineHeight: '1.2'}}>
                    {isRedatado && "A diferença ultrapassou a margem de segurança (>5d ou >7d). O sistema assumiu a idade do feto."}
                    {isDum && "A diferença entre DUM e CCN é pequena. A data da menstruação foi confirmada tecnicamente."}
                    {isCcnApenas && "Sem DUM informada. Datação baseada exclusivamente na biometria do CCN."}
                </div>
            </div>
            <div style={{fontWeight: 'bold', fontSize: '12px', color: config.color}}>
                {data.igVeredito}
            </div>
        </div>
    );
};
      
  return (
    <div>
        {renderBannerVeredito()}  
          {/* --- NOVO: VIA DE AVALIAÇÃO (Movido para cá) --- */}
            <div style={{marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px dashed #ddd'}}>
                <div className="laudo-row">
                    <span style={{fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', color:'#555'}}>
                        <FaMicroscope /> Via de Avaliação:
                    </span>
                    <select 
                        name="viaExame" 
                        value={data.viaExame} 
                        onChange={handleChange} 
                        className="laudo-select full-width" 
                        style={{marginLeft:'5px', fontWeight:'bold', color:'#4A148C'}}
                    >
                        <option value="não citar">Não citar</option>
                        <option value="abdominal">Abdominal</option>
                        <option value="transvaginal">Transvaginal</option>
                        <option value="transvaginal e abdominal">Transvaginal e Abdominal</option>
                    </select>
                </div>
            </div>
            
            {/* BLOCO 1: DUM (OPÇÃO PADRÃO) */}
            <div style={{
                background: data.usarDum ? '#E3F2FD' : '#F5F5F5', // Fica azul se ativo
                padding:'8px', borderRadius:'4px', border:'1px solid #BBDEFB',
                opacity: (data.citarDppBiometria || data.usarExameAnterior) ? 0.6 : 1 // Fica meio apagado se Biometria ou Anterior estiverem dominando
            }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px'}}>
                    <div style={{display:'flex', gap:'15px'}}>
                        <label className="laudo-checkbox-label" style={{fontWeight:'bold', color: data.usarDum ? '#0D47A1' : '#555', cursor:'pointer'}}>
                            <input type="radio" name="modoDatacao" checked={!!data.usarDum} onChange={() => handleModeChange('USAR_DUM')} />
                            Usar DUM
                        </label>
                        <label className="laudo-checkbox-label" style={{cursor:'pointer'}}>
                            <input type="radio" name="modoDatacao" checked={!!data.dumDesconhecida} onChange={() => handleModeChange('DUM_DESCONHECIDA')} />
                            Desconhecida
                        </label>
                        <label className="laudo-checkbox-label" style={{cursor:'pointer'}}>
                            <input type="radio" name="modoDatacao" checked={!!data.naoUsarDum} onChange={() => handleModeChange('NAO_USAR')} />
                            Não usar
                        </label>
                    </div>
                    
                    {/* Checkboxes auxiliares da DUM */}
                    <div style={{display:'flex', gap:'10px', fontSize:'10px'}}>
                        <label className="laudo-checkbox-label" title="Mostra a data (ex: 10/10/2024) no texto">
                            <input type="checkbox" name="exibirDataDum" checked={!!data.exibirDataDum} onChange={handleChange} disabled={!data.usarDum} /> 
                            exibir data
                        </label>
                        <label className="laudo-checkbox-label" title="Mostra 'DPP: 20/07/2025' no texto">
                            <input type="checkbox" name="citarDppDum" checked={!!data.citarDppDum} onChange={handleChange} disabled={!data.usarDum} /> 
                            citar DPP
                        </label>
                    </div>
                </div>

                {/* Input da Data */}
                <div className="laudo-row">
                    <div style={{display:'flex', alignItems:'center', gap:'5px', background:'#fff', padding:'2px 5px', borderRadius:'3px', border:'1px solid #ccc'}}>
                        <FaCalendarAlt color="#1565C0" />
                        <input 
                            type="date" 
                            name="dum" 
                            value={data.dum || ''} 
                            onChange={handleChange} 
                            disabled={!data.usarDum} 
                            className="laudo-input" 
                            style={{border:'none', height:'20px', color: data.usarDum ? '#333' : '#aaa'}}
                        />
                    </div>

                    {data.usarDum && data.igDum && (
                        <div style={{display:'flex', gap:'15px', marginLeft:'10px', fontWeight:'bold', color:'#0D47A1', fontSize:'11px'}}>
                            <span>IG: {data.igDum}</span>
                            <span>DPP: {data.dppDum}</span>
                        </div>
                    )}
                </div>
                {alertaDivergencia}
            </div>

            {/* BLOCO 2: AS PRIORIDADES (Lado a Lado) */}
            <div className="laudo-grid-2" style={{marginTop:'10px', alignItems:'start'}}>
                
                {/* 1. BIOMETRIA ATUAL (Se marcado, domina o laudo) */}
                <div style={{
                    background: data.citarDppBiometria ? '#E8F5E9' : '#F5F5F5', // Fica verde se ativo
                    padding:'6px', borderRadius:'4px', border: data.citarDppBiometria ? '1px solid #4CAF50' : '1px solid #ddd'
                }}>
                    <div style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'4px', color: data.citarDppBiometria ? '#2E7D32' : '#555', fontWeight:'bold', fontSize:'10px'}}>
                        <FaCalculator /> BIOMETRIA ATUAL
                    </div>
                    <div className="laudo-row" style={{justifyContent:'space-between', fontSize:'11px'}}>
                        <span>IG: <strong>{data.igBiometria || '--'}</strong></span>
                        <span>DPP: <strong>{data.dppBiometriaCalculada || '--'}</strong></span>
                    </div>
                    <div style={{marginTop:'4px', borderTop:'1px solid #e0e0e0', paddingTop:'4px'}}>
                        <label className="laudo-checkbox-label" style={{fontWeight:'bold', color: data.citarDppBiometria ? '#1B5E20' : '#555', fontSize:'10px', cursor:'pointer'}}>
                            <input 
                                type="checkbox" 
                                name="citarDppBiometria" 
                                checked={!!data.citarDppBiometria} 
                                onChange={handleBiometriaPrioridade} 
                            />
                            Usar esta data no laudo (Prioridade)
                        </label>
                    </div>
                </div>

                {/* 2. USG ANTERIOR (Prioridade 2) */}
                <div style={{
                    background: data.usarExameAnterior ? '#F3E5F5' : '#F5F5F5', // Fica roxo se ativo
                    padding:'6px', borderRadius:'4px', border: data.usarExameAnterior ? '1px solid #AB47BC' : '1px solid #ddd'
                }}>
                    <label className="laudo-checkbox-label" style={{fontWeight:'bold', color: data.usarExameAnterior ? '#4A148C' : '#555', fontSize:'10px', marginBottom:'4px', cursor:'pointer'}}>
                        <input type="checkbox" name="usarExameAnterior" checked={!!data.usarExameAnterior} onChange={handleChange} />
                        <FaHistory style={{marginRight:'4px'}}/> USG ANTERIOR
                    </label>
                    
                    <div className="laudo-row" style={{gap:'5px', opacity: data.usarExameAnterior ? 1 : 0.6}}>
                        <input type="date" name="dataExameAnterior" value={data.dataExameAnterior || ''} onChange={handleChange} disabled={!data.usarExameAnterior} className="laudo-input" style={{width:'85px', fontSize:'10px'}}/>
                        
                        <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                            <input 
                                type="number" name="igAnteriorSemanas" value={data.igAnteriorSemanas || ''} onChange={handleChange} 
                                disabled={!data.usarExameAnterior} className="laudo-input laudo-input-small" style={{width:'40px', textAlign:'center'}} placeholder="sem"
                            />
                            <span style={{fontSize:'10px'}}>s</span>
                            <input 
                                type="number" name="igAnteriorDias" value={data.igAnteriorDias || ''} onChange={handleChange} 
                                disabled={!data.usarExameAnterior} className="laudo-input laudo-input-small" style={{width:'40px', textAlign:'center'}} placeholder="d"
                            />
                            <span style={{fontSize:'10px'}}>d</span>
                        </div>
                    </div>
                    {data.usarExameAnterior && data.igIgCorrigidaCalculada && (
                        <div style={{marginTop:'4px', textAlign:'right', fontSize:'10px', color:'#4A148C', fontWeight:'bold'}}>
                            IG Corrigida: {data.igIgCorrigidaCalculada}
                        </div>
                    )}
                </div>
            </div>
        {/* Obs Datacao */}
        <div style={{
             borderTop: '1px solid #eee', padding: '8px', 
             background: '#FAFAFA', borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px'
         }}>
            <textarea 
                name="obsDatacao" value={data.obsDatacao || ''} onChange={handleChange} 
                className="laudo-textarea" rows="2"
                style={{width:'100%', fontSize:'11px', border:'1px solid #ccc', borderRadius: '4px', padding: '5px'}}
                placeholder="Observações sobre a datação..."
            />
        </div>
    </div>
);
};

export default SecaoDatacao;