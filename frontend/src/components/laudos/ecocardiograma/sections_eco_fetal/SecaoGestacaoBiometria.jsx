import React from 'react';

const SecaoGestacaoBiometria = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Gestação e Biometria</div>
        <div className="laudo-section-body">
            <div className="laudo-row" style={{gap:'15px', flexWrap:'wrap'}}>
                <div className="laudo-row">
                    <span style={{fontSize:'11px'}}>Idade gestacional</span>
                    <input
                        name="idadeGestacional" type="text" value={data.idadeGestacional}
                        onChange={handleChange} placeholder="ex.: 24s3d"
                        className="laudo-input" style={{width:'80px', marginLeft:'5px'}}
                    />
                </div>
                <div className="laudo-row">
                    <span style={{fontSize:'11px'}}>FC fetal</span>
                    <input
                        name="fcFetal" type="number" value={data.fcFetal}
                        onChange={handleChange}
                        className="laudo-input" style={{width:'60px', marginLeft:'5px'}}
                    />
                    <span style={{marginLeft:'4px', fontSize:'11px'}}>bpm</span>
                </div>
                <div className="laudo-row">
                    <span style={{fontSize:'11px'}}>Comprimento do fêmur</span>
                    <input
                        name="comprimentoFemur" type="number" value={data.comprimentoFemur}
                        onChange={handleChange}
                        className="laudo-input" style={{width:'60px', marginLeft:'5px'}}
                    />
                    <span style={{marginLeft:'4px', fontSize:'11px'}}>mm</span>
                </div>
            </div>
            <div style={{fontSize:'9px', color:'#888', marginTop:'6px', fontStyle:'italic'}}>
                O comprimento do fêmur é usado no cálculo do Escore-Z do istmo aórtico (referência Pasquini 2007).
            </div>
        </div>
    </div>
  );
};

export default SecaoGestacaoBiometria;
