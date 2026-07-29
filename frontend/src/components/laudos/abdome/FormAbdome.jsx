import React, { useState, useEffect } from 'react';
import { FaNotesMedical, FaEdit } from 'react-icons/fa';

const FormAbdome = ({ onUpdate, initialValues }) => {
    // 1. CARREGAMENTO INTELIGENTE: Puxa direto no useState.
    // Assim que a tela Pai seleciona o paciente, ela monta o componente 
    // já com a Data de Nascimento e Sexo corretos sem causar Loop!
    const [tituloExame, setTituloExame] = useState(initialValues?.tituloExame || '');
    const [textoLivre, setTextoLivre] = useState(initialValues?.textoLivre || '');
    const [dadosPaciente, setDadosPaciente] = useState({
        dataNascimento: initialValues?.dataNascimento || '',
        sexo: initialValues?.sexo || '',
        medicoSolicitante: initialValues?.medicoSolicitante || ''
    });

    // 2. Removemos o useEffect que escutava o [initialValues]. Era ele que causava o "pisca-pisca"!

    // 3. Envia o texto livre e os dados de volta para o LaudosPage e Prévia
    useEffect(() => {
        onUpdate({
            texto: textoLivre,
            dadosEstruturados: { ...dadosPaciente, textoLivre }, 
            tituloExame: tituloExame
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [textoLivre, tituloExame, dadosPaciente]); // Acionando apenas quando você digita algo

    const selectStyle = {
        width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px', marginTop: '4px'
    };

    return (
        <div className="flex flex-col gap-3 pb-8">
            
            {/* CABEÇALHO DO EXAME COM OS CAMPOS DIGITÁVEIS */}
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
                                placeholder="Ex: ULTRASSONOGRAFIA DE ABDOME TOTAL"
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
                            minHeight: '400px', // Altura generosa para o médico digitar livremente
                            padding: '15px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                            lineHeight: '1.5',
                            resize: 'vertical',
                            outline: 'none'
                        }}
                        placeholder="Digite o laudo completo aqui..."
                    />
                </div>
            </div>

        </div>
    );
};

export default FormAbdome;