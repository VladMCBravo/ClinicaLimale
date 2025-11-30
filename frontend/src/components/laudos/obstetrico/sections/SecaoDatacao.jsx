import React, { useMemo } from 'react';
import { FaCalendarAlt, FaQuestionCircle } from 'react-icons/fa';

const styles = {
    section: { border: '1px solid #ccc', borderRadius: '4px', marginBottom: '5px', background: '#fff', overflow: 'hidden' },
    // Cabeçalho Roxo/Azul escuro do Print
    header: { background: '#4A3B80', color: 'white', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold' },
    body: { padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px', color: '#333' },
    
    // Caixas internas (Cinza claro)
    innerBox: { background: '#F5F5F5', padding: '8px', border: '1px solid #ddd', borderRadius: '3px' },
    innerTitle: { fontWeight: 'bold', marginBottom: '8px', color: '#000' },
    
    row: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' },
    inputDate: { border: '1px solid #aaa', borderRadius: '2px', padding: '2px', fontSize: '11px', width: '120px' },
    inputSmall: { border: '1px solid #aaa', borderRadius: '2px', padding: '2px', fontSize: '11px', width: '30px', textAlign: 'center' },
    
    // Estilo para o ícone de ajuda azul
    helpIcon: { color: '#42A5F5', marginLeft: '5px', cursor: 'help' }
};

const SecaoDatacao = ({ data, handleChange, handleDatacaoChange }) => {

  // Cálculos rápidos para exibição visual (Display Only)
  const calculos = useMemo(() => {
      let igTxt = "0 sem";
      let dppBiometria = "--/--/----";

      // Cálculo IG DUM
      if (data.dum && data.usarDum) {
          const d = new Date(data.dum + 'T12:00:00');
          const hoje = new Date();
          if (!isNaN(d)) {
              const diff = Math.floor((hoje - d) / (1000 * 60 * 60 * 24));
              const sem = Math.floor(diff/7);
              const dias = diff%7;
              igTxt = `${sem} sem ${dias > 0 ? `e ${dias}d` : ''}`;
              
              // DPP Biometria (Estimativa baseada na DUM por enquanto)
              const dpp = new Date(d);
              dpp.setDate(d.getDate() + 280);
              dppBiometria = dpp.toLocaleDateString('pt-BR');
          }
      }
      return { igTxt, dppBiometria };
  }, [data.dum, data.usarDum]);

  return (
    <div style={styles.section}>
        <div style={styles.header}>DUM / DPP / Idade gestacional</div>
        
        <div style={styles.body}>
            
            {/* --- CAIXA 1: DUM --- */}
            <div style={styles.innerBox}>
                <div style={styles.innerTitle}>Idade Gestacional pela D.U.M.</div>
                
                {/* Linha 1: Radio + Data + IG Calculada */}
                <div style={styles.row}>
                    <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer', fontWeight:'bold'}}>
                        <input type="radio" checked={data.usarDum} onChange={() => handleDatacaoChange('USAR_DUM')} />
                        Usar a D.U.M.
                    </label>
                    
                    <div style={{position:'relative'}}>
                         <input 
                            type="date" 
                            name="dum" 
                            value={data.dum} 
                            onChange={handleChange} 
                            disabled={!data.usarDum} 
                            style={styles.inputDate} 
                        />
                         {/* Ícone de calendário decorativo se quiser simular o print */}
                    </div>

                    <span style={{fontWeight:'bold', marginLeft:'10px'}}>I.G. pela D.U.M.: {calculos.igTxt}</span>
                </div>

                {/* Linha 2: DUM Desconhecida + Checkboxes Direita */}
                <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                        <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer'}}>
                            <input type="radio" checked={data.dumDesconhecida} onChange={() => handleDatacaoChange('DUM_DESCONHECIDA')} />
                            D.U.M. desconhecida
                        </label>
                         <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer'}}>
                            <input type="radio" checked={data.naoUsarDum} onChange={() => handleDatacaoChange('NAO_USAR_DUM')} />
                            NÃO usar a D.U.M.
                        </label>
                    </div>

                    {/* Checkboxes alinhados à direita (Exibir data / Citar DPP) */}
                    <div style={{display:'flex', gap:'15px', marginRight:'20px'}}>
                        <label style={{display:'flex', alignItems:'center', gap:'4px', cursor:'pointer'}}>
                            <input type="checkbox" name="exibirDataDum" checked={data.exibirDataDum} onChange={handleChange} disabled={!data.usarDum} /> 
                            exibir a data
                        </label>
                        <label style={{display:'flex', alignItems:'center', gap:'4px', cursor:'pointer'}}>
                            <input type="checkbox" name="citarDppDum" checked={data.citarDppDum} onChange={handleChange} disabled={!data.usarDum} /> 
                            citar D.P.P. pela D.U.M.
                        </label>
                    </div>
                </div>

                {/* Linha 3: Checkbox "Usar DUM como base" */}
                <div style={{marginTop: '8px', paddingLeft: '22px'}}>
                    <label style={{display:'flex', alignItems:'center', gap:'4px', cursor:'pointer'}}>
                        <input type="checkbox" name="usarDumComoBase" checked={data.usarDumComoBase} onChange={handleChange} />
                        Usar a D.U.M. como base da idade gestacional deste exame
                        <FaQuestionCircle style={styles.helpIcon} size={12} title="Define a IG do exame pela DUM e não pela biometria"/>
                    </label>
                </div>
            </div>

            {/* --- MEIO: DPP PELA BIOMETRIA --- */}
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', paddingLeft:'5px', paddingRight:'50px'}}>
                <label style={{display:'flex', alignItems:'center', gap:'4px', cursor:'pointer', fontWeight:'bold'}}>
                    <input type="checkbox" name="citarDppBiometria" checked={data.citarDppBiometria} onChange={handleChange} />
                    citar D.P.P. pela biometria do exame atual
                </label>
                <span style={{fontWeight:'bold'}}>{calculos.dppBiometria}</span>
            </div>

            {/* --- CAIXA 2: EXAME ANTERIOR --- */}
            <div style={styles.innerBox}>
                <div style={styles.innerTitle}>Idade Gestacional Corrigida por exame anterior</div>
                
                <label style={{display:'flex', alignItems:'center', gap:'4px', cursor:'pointer', fontWeight:'bold', marginBottom:'8px'}}>
                    <input type="checkbox" name="referirIgAnterior" checked={data.referirIgAnterior} onChange={handleChange} />
                    referir Idade Gestacional com base em US anterior
                </label>

                <div style={{paddingLeft: '22px', display:'flex', flexDirection:'column', gap:'5px'}}>
                     <label style={{display:'flex', alignItems:'center', gap:'4px', cursor:'pointer'}}>
                        <input type="checkbox" name="usarIgAnteriorComoBase" checked={data.usarIgAnteriorComoBase} onChange={handleChange} />
                        usar o exame anterior como base da idade gestacional deste exame
                        <FaQuestionCircle style={styles.helpIcon} size={12} />
                    </label>

                    {/* Inputs de Data e IG */}
                    <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'5px'}}>
                        <span>Data do exame:</span>
                        <input type="date" name="dataExameAnterior" value={data.dataExameAnterior} onChange={handleChange} style={styles.inputDate} />
                        
                        <span style={{marginLeft:'10px'}}>IG no exame:</span>
                        <input name="igAnteriorSemanas" value={data.igAnteriorSemanas} onChange={handleChange} style={styles.inputSmall} /> s
                        <input name="igAnteriorDias" value={data.igAnteriorDias} onChange={handleChange} style={styles.inputSmall} /> d
                    </div>

                    {/* Checkbox final */}
                    <div style={{display:'flex', alignItems:'center', gap:'20px', marginTop:'5px'}}>
                        <label style={{display:'flex', alignItems:'center', gap:'4px', cursor:'pointer'}}>
                            <input type="checkbox" name="citarDppIgCorrigida" checked={data.citarDppIgCorrigida} onChange={handleChange} />
                            citar D.P.P. pela I.G. corrigida
                        </label>
                        <span style={{fontWeight:'bold'}}>I.G. corrigida:</span>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};

export default SecaoDatacao;