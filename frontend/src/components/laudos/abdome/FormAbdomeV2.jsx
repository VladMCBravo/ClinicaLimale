// src/components/laudos/abdome/FormAbdome.jsx
import React, { useState, useEffect } from 'react';
import { FaNotesMedical, FaEdit, FaFileAlt, FaMagic } from 'react-icons/fa';
import { Button } from '@mui/material';

const FormAbdome = ({ onUpdate, initialValues }) => {
    const [tituloExame, setTituloExame] = useState(initialValues?.tituloExame || '');
    const [textoLivre, setTextoLivre] = useState(initialValues?.textoLivre || '');
    const [dadosPaciente, setDadosPaciente] = useState({
        dataNascimento: initialValues?.dataNascimento || '',
        sexo: initialValues?.sexo || '',
        medicoSolicitante: initialValues?.medicoSolicitante || ''
    });

    useEffect(() => {
        onUpdate({
            texto: textoLivre,
            dadosEstruturados: { ...dadosPaciente, textoLivre }, 
            tituloExame: tituloExame
        });
    }, [textoLivre, tituloExame, dadosPaciente, onUpdate]);

    const selectStyle = {
        width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px', marginTop: '4px'
    };

    // --- MACROS INTELIGENTES ---
    const carregarAbdomeNormal = () => {
        setTituloExame("ULTRASSONOGRAFIA DE ABDOME TOTAL");
        setTextoLivre("FÍGADO:\nDimensões normais, contornos regulares e ecotextura homogênea.\n\nVESÍCULA BILIAR:\nParedes finas, conteúdo anecoico, ausência de cálculos.\n\nPÂNCREAS:\nDimensões normais e ecotextura homogênea.\n\nBAÇO:\nDimensões normais e ecotextura homogênea.\n\nRINS:\nDimensões e ecotextura preservadas. Ausência de cálculos ou hidronefrose.\n\nCONCLUSÃO\nExame ultrassonográfico do abdome total dentro dos limites da normalidade.");
    };

    const carregarViasUrinarias = () => {
        setTituloExame("ULTRASSONOGRAFIA DE APARELHO URINÁRIO");
        setTextoLivre("RINS:\nTópicos, com dimensões, contornos e ecotextura normais. Relação córtico-medular preservada. Não há sinais de cálculos, cistos ou dilatação pielocalicinal.\n\nBEXIGA:\nRepleta, de paredes finas e lisas, conteúdo anecoico.\n\nCONCLUSÃO\nExame ultrassonográfico do aparelho urinário sem alterações significativas.");
    };

    // Se o texto voltar do Editor Visual com HTML, escondemos o textarea para não assustar o médico com tags <table> ou <b>.
    const isHtmlRico = textoLivre && (textoLivre.includes('<p>') || textoLivre.includes('<h4'));

    return (
        <div className="flex flex-col gap-3 pb-8">
            
            {/* CABEÇALHO */}
            <div className="dashboard-panel" style={{borderLeft: '4px solid #333', marginBottom: '5px', background:'#fff', border: '1px solid #ddd', borderRadius:'6px'}}>
                <div className="dashboard-panel-body" style={{padding:'10px'}}>
                    <h3 style={{margin: 0, fontSize: '14px', color: '#1C2E4A', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px'}}>
                        <FaNotesMedical /> Identificação e Título
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Título Personalizado</label>
                            <input 
                                type="text" value={tituloExame} onChange={(e) => setTituloExame(e.target.value)} 
                                style={selectStyle} placeholder="Ex: ULTRASSONOGRAFIA DE ABDOME TOTAL"
                            />
                        </div>
                        <div>
                            <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Médico Solicitante</label>
                            <input 
                                type="text" value={dadosPaciente.medicoSolicitante} onChange={(e) => setDadosPaciente({...dadosPaciente, medicoSolicitante: e.target.value})} 
                                style={selectStyle} 
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Data Nasc.</label>
                                <input type="date" value={dadosPaciente.dataNascimento} onChange={(e) => setDadosPaciente({...dadosPaciente, dataNascimento: e.target.value})} style={selectStyle} />
                            </div>
                            <div>
                                <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Sexo</label>
                                <select value={dadosPaciente.sexo} onChange={(e) => setDadosPaciente({...dadosPaciente, sexo: e.target.value})} style={selectStyle}>
                                    <option value="">Selecione...</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Feminino">Feminino</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CORPO DO LAUDO */}
            <div className="dashboard-panel" style={{borderLeft: '4px solid #2E7D32', background:'#fff', border: '1px solid #ddd', borderRadius:'6px'}}>
                <div className="dashboard-panel-body" style={{padding:'10px'}}>
                    
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <h3 style={{margin: 0, fontSize: '14px', color: '#1C2E4A', display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <FaEdit /> Descrição do Exame
                        </h3>
                        {/* Botões de Macro Rapidas */}
                        {!isHtmlRico && (
                            <div style={{display: 'flex', gap: '5px'}}>
                                <Button size="small" variant="outlined" onClick={carregarAbdomeNormal} sx={{fontSize: '10px', p: 0.5, borderColor: '#1864ab', color: '#1864ab'}}>+ Abdome Normal</Button>
                                <Button size="small" variant="outlined" onClick={carregarViasUrinarias} sx={{fontSize: '10px', p: 0.5, borderColor: '#e67700', color: '#e67700'}}>+ Ap. Urinário</Button>
                            </div>
                        )}
                    </div>

                    {isHtmlRico ? (
                        // Interface "Bloqueada" para quando o texto já virou um HTML avançado
                        <div style={{ padding: '30px 20px', background: '#f8f9fa', border: '1px dashed #adb5bd', borderRadius: '4px', textAlign: 'center', color: '#495057' }}>
                            <FaMagic size={30} style={{marginBottom: '10px', color: '#1864ab'}}/>
                            <p style={{fontSize: '13px', margin: '0 0 5px 0'}}>Este laudo já possui <strong>Formatação Avançada</strong> (Word).</p>
                            <p style={{fontSize: '12px', margin: '0 0 15px 0', color: '#868e96'}}>Para continuar a edição sem perder o formato, utilize o <strong>Editor Visual</strong> na coluna ao lado.</p>
                            <Button variant="outlined" size="small" onClick={() => { if(window.confirm('Tem certeza? Isso removerá as tabelas e negritos, voltando para texto puro.')) setTextoLivre('') }} sx={{fontSize: '10px', color: '#d32f2f', borderColor: '#d32f2f'}}>
                                Limpar e Voltar para Texto Simples
                            </Button>
                        </div>
                    ) : (
                        <textarea
                            value={textoLivre}
                            onChange={(e) => setTextoLivre(e.target.value)}
                            style={{ width: '100%', minHeight: '350px', padding: '15px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.5', resize: 'vertical', outline: 'none' }}
                            placeholder="Digite o laudo livremente ou use os botões acima..."
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default FormAbdome;