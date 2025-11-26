// src/pages/LaudosPage.jsx
import React, { useState } from 'react';
import { templates } from '../components/laudos/templatesLaudos';
import { FaPrint, FaFileAlt } from 'react-icons/fa';

const LaudosPage = () => {
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [laudoContent, setLaudoContent] = useState('');
  
  // Dados do Cabeçalho Manual
  const [paciente, setPaciente] = useState('');
  const [medico, setMedico] = useState('Dr. Antonio José Orsi Falleiros - CRM 37460 - SP');
  const [data, setData] = useState(new Date().toLocaleDateString('pt-BR'));

  const handleSelectTemplate = (e) => {
    const id = e.target.value;
    setSelectedTemplateId(id);
    const template = templates.find(t => t.id == id);
    if (template) {
      setLaudoContent(template.texto);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="laudos-page-container" style={{ padding: '20px' }}>
      
      {/* ESTILO DE IMPRESSÃO (Esconde Menu e Navbar) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          /* Esconde classes comuns de layout */
          .main-header, .sidebar, nav, header, .user-actions, .MuiDrawer-root {
            display: none !important;
          }
          /* Mostra apenas a área de impressão */
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20mm !important;
            background: white;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>

      {/* ÁREA DE CONTROLES (Não imprime) */}
      <div className="no-print" style={{ 
          marginBottom: '20px', 
          padding: '20px', 
          background: '#fff', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#2E7D32' }}>
            <FaFileAlt /> Emissor Rápido de Laudos
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '20px' }}>
             {/* Seleção de Modelo */}
             <div style={{ gridColumn: '1 / -1' }}>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>1. Escolha o Modelo:</label>
                <select 
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} 
                    onChange={handleSelectTemplate} 
                    value={selectedTemplateId}
                >
                    <option value="">Selecione um Modelo...</option>
                    {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                </select>
            </div>

            {/* Campos Manuais */}
            <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9em'}}>Nome da Paciente:</label>
                <input 
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
                    value={paciente} 
                    onChange={e => setPaciente(e.target.value)} 
                    placeholder="Ex: Maria da Silva"
                />
            </div>
            <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9em'}}>Médico Responsável:</label>
                <input 
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
                    value={medico} 
                    onChange={e => setMedico(e.target.value)} 
                />
            </div>
            <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9em'}}>Data do Exame:</label>
                <input 
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
                    value={data} 
                    onChange={e => setData(e.target.value)} 
                />
            </div>
        </div>

        <button 
            onClick={handlePrint}
            style={{ 
                marginTop: '20px', 
                padding: '12px 25px', 
                background: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px', 
                cursor: 'pointer', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '16px'
            }}
        >
            <FaPrint /> IMPRIMIR LAUDO
        </button>
      </div>

      {/* ÁREA DE PAPEL (Preview e Edição) */}
      <div id="printable-area" style={{
        background: 'white',
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm',
        margin: '0 auto',
        boxShadow: '0 0 15px rgba(0,0,0,0.1)',
        fontFamily: 'Arial, sans-serif',
        color: '#000',
        position: 'relative'
      }}>
        
        {/* Cabeçalho Visual */}
        <div style={{ borderBottom: '2px solid #2E7D32', paddingBottom: '15px', marginBottom: '30px' }}>
          <h1 style={{color: '#2E7D32', margin: 0, fontSize: '24px', textAlign: 'center'}}>CLÍNICA DE IMAGEM SÃO VICENTE</h1>
          <p style={{margin: '5px 0', fontSize: '14px', fontWeight: 'bold', textAlign: 'center', color: '#555'}}>ULTRASSONOGRAFIA</p>
          
          <div style={{ marginTop: '25px', fontSize: '14px', lineHeight: '1.6' }}>
            <p style={{margin: 0}}><strong>NOME:</strong> {paciente}</p>
            <p style={{margin: 0}}><strong>CONVÊNIO:</strong> PARTICULAR</p>
            <p style={{margin: 0}}><strong>DATA:</strong> {data}</p>
          </div>
        </div>

        {/* Editor de Texto "Invisível" */}
        <textarea
          value={laudoContent}
          onChange={(e) => setLaudoContent(e.target.value)}
          placeholder="Selecione um modelo acima para começar..."
          style={{
            width: '100%',
            minHeight: '600px', // Altura do corpo do laudo
            border: 'none',
            resize: 'none',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            lineHeight: '1.5',
            outline: 'none',
            whiteSpace: 'pre-wrap', // Mantém parágrafos
            background: 'transparent'
          }}
        />

        {/* Assinatura */}
        <div style={{ marginTop: '50px', textAlign: 'center', pageBreakInside: 'avoid' }}>
           <div style={{ width: '60%', margin: '0 auto', borderTop: '1px solid #000', paddingTop: '5px' }}>
                <p style={{fontWeight: 'bold', margin: 0}}>{medico}</p>
           </div>
        </div>

        {/* Rodapé Fixo */}
        <div style={{
            position: 'absolute',
            bottom: '20mm',
            left: '0',
            width: '100%',
            textAlign: 'center', 
            fontSize: '11px', 
            color: '#666'
        }}>
          RUA IPIRANGA, Nº 333 - CENTRO - CEP 11310-421 - SÃO VICENTE/SP<br/>
          (13) 3469-2226 / WHATSAPP (13) 99628-1691
        </div>

      </div>
    </div>
  );
};

export default LaudosPage;