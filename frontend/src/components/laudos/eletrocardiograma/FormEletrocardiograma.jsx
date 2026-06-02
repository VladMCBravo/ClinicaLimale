import React, { useState, useEffect } from 'react';
import { FaNotesMedical, FaEdit } from 'react-icons/fa';

// O texto padrão solicitado pelo médico
const TEXTO_PADRAO_ECG = `ELETROCARDIOGRAMA DE REPOUSO

Ritmo sinusal.
Onda P e intervalo PR normais.
Eixo elétrico preservado e morfologia do QRS normal.
Segmento ST sem anormalidades.
Onda T sem anormalidades.
CONCLUSÃO:
- Eletrocardiograma de repouso dentro dos limites da normalidade.

Diretriz da Sociedade Brasileira de Cardiologia sobre a Análise e Emissão de Laudos Eletrocardiográficos – 2022. Arq Bras Cardiol. 2022;
119(4):638-680
Obs.: Este resultado não confirma a presença ou ausência de doença, devendo ser correlacionado com os demais dados clínico-epidemiológicos do paciente em questão. A correta interpretação do resultado deste exame deverá ser realizada pelo médico solicitante.

Liberado por: CRM-SP:171068- RQE 138568  Dr ALEJANDRO MIRANDA PALOMEQUE`;


const FormEletrocardiograma = ({ onUpdate, initialValues }) => {
    // 1. CARREGAMENTO INTELIGENTE: Puxa direto no useState.
    // Injeta o título e o texto padrão se for um laudo novo
    const [tituloExame, setTituloExame] = useState(initialValues?.tituloExame || 'ELETROCARDIOGRAMA DE REPOUSO');
    const [textoLivre, setTextoLivre] = useState(initialValues?.textoLivre || TEXTO_PADRAO_ECG);
    const [dadosPaciente, setDadosPaciente] = useState({
        dataNascimento: initialValues?.dataNascimento || '',
        sexo: initialValues?.sexo || '',
        medicoSolicitante: initialValues?.medicoSolicitante || ''
    });

    // 2. Envia o texto livre e os dados de volta para o LaudosPage e Prévia
    useEffect(() => {
        onUpdate({
            texto: textoLivre,
            dadosEstruturados: { ...dadosPaciente, textoLivre }, 
            tituloExame: tituloExame
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [textoLivre, tituloExame, dadosPaciente]);

    const selectStyle = {
        width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px', marginTop: '4px'
    };

    return (
        <div className="flex flex-col gap-3 pb-8">
            
            {/* CABEÇALHO DO EXAME */}
            <div className="dashboard-panel" style={{borderLeft: '4px solid #333', marginBottom: '5px', background:'#fff', border: '1px solid #ddd', borderRadius:'6px'}}>
                <div className="dashboard-panel-body" style={{padding:'10px'}}>
                    <h3 style={{margin: 0, fontSize: '14px', color: '#1C2E4A', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px'}}>
                        <FaNotesMedical /> Identificação e Título do Exame
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Título Personalizado</label>
                            <input 
                                type="text" 
                                value={tituloExame} 
                                onChange={(e) => setTituloExame(e.target.value)} 
                                style={selectStyle} 
                                placeholder="Ex: ELETROCARDIOGRAMA DE REPOUSO"
                            />
                        </div>
                        <div>
                            <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Médico Solicitante</label>
                            <input 
                                type="text" 
                                value={dadosPaciente.medicoSolicitante} 
                                onChange={(e) => setDadosPaciente({...dadosPaciente, medicoSolicitante: e.target.value})} 
                                style={selectStyle} 
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Data de Nascimento</label>
                                <input 
                                    type="date" 
                                    value={dadosPaciente.dataNascimento} 
                                    onChange={(e) => setDadosPaciente({...dadosPaciente, dataNascimento: e.target.value})} 
                                    style={selectStyle} 
                                />
                            </div>
                            <div>
                                <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Sexo</label>
                                <select 
                                    value={dadosPaciente.sexo} 
                                    onChange={(e) => setDadosPaciente({...dadosPaciente, sexo: e.target.value})} 
                                    style={selectStyle}
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Feminino">Feminino</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CORPO DO LAUDO (TEXTO LIVRE) */}
            <div className="dashboard-panel" style={{borderLeft: '4px solid #2E7D32', background:'#fff', border: '1px solid #ddd', borderRadius:'6px'}}>
                <div className="dashboard-panel-body" style={{padding:'10px'}}>
                    <h3 style={{margin: 0, fontSize: '14px', color: '#1C2E4A', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px'}}>
                        <FaEdit /> Descrição do Exame
                    </h3>
                    <textarea
                        value={textoLivre}
                        onChange={(e) => setTextoLivre(e.target.value)}
                        style={{
                            width: '100%',
                            minHeight: '400px',
                            padding: '15px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                            lineHeight: '1.5',
                            resize: 'vertical',
                            outline: 'none'
                        }}
                        placeholder="O texto do eletrocardiograma aparecerá aqui..."
                    />
                </div>
            </div>

        </div>
    );
};

export default FormEletrocardiograma;