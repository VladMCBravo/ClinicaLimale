// src/sections/SecaoColoDados.jsx
import React from 'react';
// Ícones para padronização visual
import { FaRulerVertical, FaFilter, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { MdWarning, MdLinearScale } from 'react-icons/md';
import { GiResize } from 'react-icons/gi';

const SecaoColoDados = ({ data, handleChange }) => {
  return (
    <>
        {/* =========================================================
            BLOCO 1: AVALIAÇÃO DO COLO UTERINO (Via Transvaginal)
           ========================================================= */}
        <div className="laudo-section">
            <div className="header-base header-green">
                <MdLinearScale size={16} style={{marginRight:'5px'}}/> Avaliação do Colo Uterino (TV)
            </div>
            
            <div className="laudo-section-body">
                
                {/* GRUPO 1: BIOMETRIA E ANATOMIA (Card Verde Claro) */}
                <div style={{background:'#E8F5E9', padding:'10px', borderRadius:'4px', border:'1px solid #C8E6C9'}}>
                    <div style={{fontSize:'11px', fontWeight:'bold', color:'#2E7D32', marginBottom:'8px', display:'flex', alignItems:'center', gap:'5px'}}>
                        <FaRulerVertical /> BIOMETRIA E ANATOMIA
                    </div>

                    <div className="laudo-grid-2">
                        {/* Comprimento */}
                        <div className="laudo-col">
                            <label className="label-pequeno" style={{fontWeight:'bold', color:'#1B5E20'}}>Comprimento do Colo:</label>
                            <div className="input-icon-group">
                                <input 
                                    type="number" 
                                    name="comprimentoColo" 
                                    value={data.comprimentoColo || ''} 
                                    onChange={handleChange} 
                                    className="laudo-input full-width" 
                                    style={{fontWeight:'bold', color:'#2E7D32'}}
                                    placeholder="00"
                                />
                                <span className="input-unit">mm</span>
                            </div>
                        </div>

                        {/* Eco Glandular (EGE) */}
                        <div className="laudo-col">
                            <label className="label-pequeno" style={{fontWeight:'bold', color:'#1B5E20'}}>Eco Glandular (EGE):</label>
                            <div style={{position:'relative'}}>
                                <select 
                                    name="coloEge" 
                                    value={data.coloEge} 
                                    onChange={handleChange} 
                                    className="laudo-select full-width"
                                >
                                    <option value="presente">Presente</option>
                                    <option value="ausente">Ausente</option>
                                    <option value="nao_visualizado">Não visualizado</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* GRUPO 2: MARCADORES DE RISCO (Card Amarelo/Laranja) */}
                <div style={{marginTop:'10px', background:'#FFF8E1', padding:'10px', borderRadius:'4px', border:'1px solid #FFE0B2'}}>
                    <div style={{fontSize:'11px', fontWeight:'bold', color:'#F57F17', marginBottom:'8px', display:'flex', alignItems:'center', gap:'5px'}}>
                        <FaExclamationTriangle /> AVALIAÇÃO DE RISCO
                    </div>

                    <div className="laudo-grid-2" style={{alignItems:'start'}}>
                        {/* Sludge */}
                        <div className="laudo-col">
                            <label className="label-pequeno" style={{fontWeight:'bold', color:'#E65100'}}>Sinal do Sludge:</label>
                            <div className="input-icon-group">
                                <FaFilter style={{position:'absolute', left:'8px', color:'#F57F17', zIndex:1, fontSize:'10px'}}/>
                                <select 
                                    name="coloSludge" 
                                    value={data.coloSludge} 
                                    onChange={handleChange} 
                                    className="laudo-select full-width"
                                    style={{paddingLeft:'25px', fontWeight: data.coloSludge === 'presente' ? 'bold' : 'normal'}}
                                >
                                    <option value="ausente">Ausente</option>
                                    <option value="presente">Presente</option>
                                </select>
                            </div>
                        </div>
                        
                        {/* Checkbox Afunilamento (Estilizado) */}
                        <div className="laudo-col" style={{display:'flex', alignItems:'center', height:'100%'}}>
                             <label 
                                className="laudo-checkbox-label" 
                                style={{
                                    alignItems:'flex-start', 
                                    padding:'6px', 
                                    background:'#fff', 
                                    border: data.coloAfunilamento ? '1px solid #4CAF50' : '1px solid #FFCC80', 
                                    borderRadius:'4px',
                                    width:'100%'
                                }}
                            >
                                <input 
                                    type="checkbox" 
                                    name="coloAfunilamento" 
                                    checked={data.coloAfunilamento} 
                                    onChange={handleChange} 
                                    style={{marginTop:'3px'}}
                                /> 
                                <span style={{fontSize:'10px', lineHeight:'1.2', color: '#555'}}>
                                    Sem sinais de afunilamento à manobra de compressão fúndica.
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* GRUPO 3: CONCLUSÃO (Card Cinza/Neutro) */}
                <div style={{marginTop:'10px', borderTop:'2px solid #eee', paddingTop:'10px'}}>
                    <label className="label-pequeno" style={{fontWeight:'bold', color:'#2C3E50', display:'flex', alignItems:'center', gap:'5px'}}>
                        <FaCheckCircle /> CONCLUSÃO DO COLO:
                    </label>
                    <select 
                        name="coloConclusao" 
                        value={data.coloConclusao} 
                        onChange={handleChange} 
                        className="laudo-select full-width"
                        style={{
                            fontWeight:'bold', 
                            marginTop:'5px', 
                            color: data.coloConclusao === 'Colo uterino encurtado' ? '#C62828' : '#2C3E50',
                            border: '1px solid #ccc',
                            height: '30px'
                        }}
                    >
                        <option value="">Selecione...</option>
                        <option value="Colo uterino ecograficamente preservado">Colo uterino ecograficamente preservado</option>
                        <option value="Colo uterino encurtado">Colo uterino encurtado</option>
                        <option value="Incompetência istmo-cervical">Sugestivo de Incompetência istmo-cervical</option>
                    </select>
                </div>

            </div>
        </div>

        {/* =========================================================
            BLOCO 2: DADOS INICIAIS (Mantendo o padrão do SecaoDadosGerais)
            Este bloco pode ser redundante se você já usa o SecaoDadosGerais,
            mas mantive conforme seu arquivo original, porém padronizado.
           ========================================================= */}
        <div className="laudo-section">
            <div className="header-base header-blue">
                <GiResize size={16} style={{marginRight:'5px'}}/> Estática Fetal (Dados Iniciais)
            </div>
            <div className="laudo-section-body">
                <div style={{background:'#F5F5F5', padding:'10px', borderRadius:'4px', border:'1px solid #E0E0E0'}}>
                    <div className="laudo-grid-3">
                        <div className="laudo-col">
                            <span className="label-pequeno">Situação</span>
                            <select name="situacao" value={data.situacao} onChange={handleChange} className="laudo-select full-width">
                                <option>longitudinal</option><option>transversa</option><option>oblíqua</option>
                            </select>
                        </div>
                        <div className="laudo-col">
                            <span className="label-pequeno">Apresentação</span>
                            <select name="apresentacao" value={data.apresentacao} onChange={handleChange} className="laudo-select full-width">
                                <option>cefálica</option><option>pélvica</option><option>córmica</option>
                            </select>
                        </div>
                        <div className="laudo-col">
                            <span className="label-pequeno">Dorso</span>
                            <select name="dorso" value={data.dorso} onChange={handleChange} className="laudo-select full-width">
                                <option>à esquerda</option><option>à direita</option><option>anterior</option><option>posterior</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </>
  );
};

export default SecaoColoDados;