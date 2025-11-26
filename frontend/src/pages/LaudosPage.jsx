// src/pages/LaudosPage.jsx
import React, { useState } from 'react';
import { FaPrint, FaFileAlt } from 'react-icons/fa';

// --- DADOS DOS TEMPLATES (Mantidos aqui para evitar erros) ---
const templates = [
    {
      id: 1,
      nome: "USG Pélvica Transvaginal",
      texto: `ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL (COLO UTERINO)
  
  Exame realizado com bexiga vazia.
  Colo uterino com morfologia e ecotextura habitual.
  O orifício interno permanece fechado.
  Canal endocervical virtual.
  
  Comprimento do colo, medindo: ____ mm.
  
  Favor trazer este exame quando vier realizar o próximo.
  A imagem diagnóstica não é absoluta, devendo ser interpretada pelo médico assistente em conjunto com o exame físico e demais exames complementares.`
    },
    {
      id: 2,
      nome: "USG Obstétrica Básica",
      texto: `ULTRASSONOGRAFIA OBSTÉTRICA
  
  DPP: --/--/----, compatível com __ semanas e __ dias.
  
  Gestação tópica, feto único.
  Situação longitudinal, apresentação cefálica e com dorso à direita.
  
  Batimentos cardíacos e movimentos fetais presentes (____ bpm).
  Estômago fetal repleto e de conteúdo anecóide.
  Bexiga fetal repleta e de conteúdo anecóide.
  
  Placenta de inserção corporal, homogênea, grau 0, na escala de Grannum e de espessura normal, medindo ____ mm.
  Líquido amniótico em quantidade normal (ILA= ____ mm).
  
  MEDIDAS:
  Diâmetro Biparietal:          ____ mm.
  Diâmetro Occipto Frontal:     ____ mm.
  Circunferência Cefálica:      ____ mm.
  Circunferência Abdominal:     ____ mm.
  Comprimento do Fêmur:         ____ mm.
  Comprimento do Úmero:         ____ mm.
  
  IMPRESSÃO DIAGNÓSTICA:
  - Biometria fetal compatível com aproximadamente __ semanas e __ dias +/- 14 dias.
  - Peso Fetal: ____ gr (+/- 10%).
  - Percentil: ____
  - Sexo: Genitália compatível com ____.
  
  Favor trazer este exame quando vier realizar o próximo.`
    },
    {
        id: 3,
        nome: "USG Obstétrica com Doppler",
        texto: `ULTRASSONOGRAFIA OBSTÉTRICA COM COLOR DOPPLER

DPP: --/--/---- (calculada pelo primeiro ultrassom), compatível com __ semanas e __ dias.

Bexiga materna não visualizada.
Gestação tópica, feto único.
Situação longitudinal, apresentação cefálica e com dorso à esquerda.

Batimentos cardíacos e movimentos fetais presentes (____ bpm).
Estômago fetal repleto e de conteúdo anecóide.
Bexiga fetal repleta e de conteúdo anecóide.

Placenta de inserção corporal, homogênea, grau 0, na escala de Grannum e de espessura normal, medindo ____ mm.
Líquido amniótico em quantidade normal para idade gestacional (ILA = ____ mm) (Ref: - ).

MEDIDAS:
Diâmetro Biparietal:          ____ mm.
Diâmetro Occipto Frontal:     ____ mm.
Circunferência Cefálica:      ____ mm.
Circunferência Abdominal:     ____ mm.
Comprimento do Fêmur:         ____ mm.
Comprimento do Úmero:         ____ mm.

ESTUDO DOPPLER (ÍNDICES DE PULSATILIDADE):
Artéria cerebral: ____________
Artéria umbilical: ____________
Relação cerebro/umbilical: ____ (n/l maior / igual à 1,0)

Artéria uterina direita: ____________
Artéria uterina esquerda: ____________
IP médio: ____________

IMPRESSÃO DIAGNÓSTICA:
- Feto único vivo.
- Biometria fetal compatível com aproximadamente __ semanas e __ dias +/- 14 dias.
- Líquido amniótico em quantidade normal para idade gestacional (ILA = ____ mm) (Ref: - ).
- Peso Fetal: ____ gr (+/- 10%) (P10= ____ P90= ____).
- Percentil: ____
- Sexo: Genitália aparentemente compatível com ____.
- Dopplerfluxometria sem anormalidades no presente estudo.

Favor trazer este exame quando vier realizar o próximo.`
    },
    {
        id: 4,
        nome: "USG Morfológico 1º Trimestre",
        texto: `ULTRASSOM MORFOLÓGICO FETAL DE PRIMEIRO TRIMESTRE

DPP: --/--/---- (calculada pelo primeiro ultrassom), compatível com __ semanas e __ dias.

Gestação tópica de feto único, em situação variável.

ANÁLISE FETAL:

Segmento cefálico:
Crânio de contornos regulares e dimensões normais.
Estruturas da linha média presentes e plexo coróide visualizado.
Osso nasal presente.

Tórax:
Forma e características ecográficas habituais.
Área cardíaca de dimensões e relação com o diâmetro torácico preservados.
Batimentos cardíacos presentes e rítmicos (F.C.F = ____ bpm).

Abdomem:
Forma preservada.
Estômago repleto e visualizado em sua topografia habitual.
Bexiga repleta, de dimensões e aspectos preservados.

Membros:
Membros inferiores e superiores visibilizados, sem anormalidades grosseiras.
Movimentação fetal ativa e tônus adequado.

BIOMETRIA FETAL:
Comprimento Cabeça-Nádega (CCN): ____ mm
Diâmetro Biparietal:             ____ mm
Diâmetro Occipto Frontal:        ____ mm
Circunferência Cefálica:         ____ mm
Circunferência Abdominal:        ____ mm
Comprimento da Bexiga:           ____ mm (Ref. até 7 mm)
Comprimento do Fêmur:            ____ mm
Comprimento do Úmero:            ____ mm
Osso próprio do nariz:           ____ mm
Translucência Nucal:             ____ mm

Placenta de inserção corporal, homogênea, grau 0, espessura normal, medindo ____ mm.
Líquido amniótico em quantidade normal para idade gestacional.
Ducto Venoso com Onda A positiva.

IMPRESSÃO DIAGNÓSTICA:
- Biometria fetal compatível com __ semanas e __ dias (+/- 7 dias).
- Peso: ____ gramas.

CÁLCULO DE RISCO PARA AS TRISSOMIAS:
- SEGUNDO A IDADE MATERNA: ____
- SEGUNDO O EXAME: ____

OBSERVAÇÕES:
- A medida da translucência nucal consiste apenas em teste de rastreio e não um teste diagnóstico (realizar entre 11 e 14 semanas).
- Este exame não substitui a ecocardiografia fetal.
- Nem todas as alterações que um feto possa vir apresentar após o nascimento podem ser identificadas pelo exame ultrassonográfico.

Favor trazer este exame quando vier realizar o próximo.`
    },
    {
        id: 5,
        nome: "USG Morfológico 2º Trimestre",
        texto: `ULTRASSOM MORFOLÓGICO FETAL SEGUNDO TRIMESTRE

DPP: --/--/----, compatível com __ semanas e __ dias.

Gestação tópica de feto único, situação longitudinal, apresentação cefálica e dorso à direita.

ANÁLISE FETAL:
SNC: Crânio normal, tábua óssea íntegra, corpo caloso e tálamos preservados. Ventrículos não dilatados. Cerebelo normal.
Face: Órbitas, perfil, nariz e lábios normais.
Coluna: Corpos vertebrais íntegros.
Tórax: Área cardíaca normal, FCF= ____ bpm, 4 câmaras simétricas.
Abdome: Diafragma, parede abdominal, fígado e rins normais. Estômago e bexiga repletos.
Membros: Íntegros, mãos e pés visíveis. Movimentação ativa.

BIOMETRIA FETAL:
Diâmetro Biparietal:        ____ mm.
Diâmetro Occipto Frontal:   ____ mm.
Circunferência Cefálica:    ____ mm.
Cerebelo:                   ____ mm.
Cisterna Magna:             ____ mm.
Prega Nucal:                ____ mm.
Ventrículo posterior:       ____ mm.
Órbita externa/interna:     ____ / ____ mm.
Osso nasal:                 ____ mm.
Úmero / Ulna / Rádio:       ____ / ____ / ____ mm.
Fêmur / Tíbia / Fíbula:     ____ / ____ / ____ mm.
Pé:                         ____ mm.
Circunferência Abdominal:   ____ mm.

Placenta corporal, grau 0, medindo ____ mm.
Líquido amniótico normal (ILA = ____ mm).
Cordão umbilical: 2 artérias e 1 veia.

IMPRESSÃO DIAGNÓSTICA:
- Feto único vivo.
- Biometria compatível com __ semanas e __ dias +/- 14 dias.
- Líquido amniótico normal.
- Peso Fetal: ____ gr (+/- 10%). Percentil: ____.
- Sexo: Genitália compatível com ____.

OBSERVAÇÕES:
- A eficácia do exame entre 20 e 24 semanas é de 83%.
- Este exame não substitui a ecocardiografia fetal.

Favor trazer este exame quando vier realizar o próximo.`
    }
  ];

// --- COMPONENTE DA PÁGINA ---
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
      
      {/* ESTILO DE IMPRESSÃO */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          /* Esconde classes comuns de layout */
          .main-header, .sidebar, nav, header, .user-actions, .MuiDrawer-root, .MuiSnackbar-root {
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
            /* AQUI ESTÁ A MARGEM PARA O PAPEL TIMBRADO (4.5cm) */
            padding-top: 4.5cm !important; 
            padding-left: 2cm !important;
            padding-right: 2cm !important;
            padding-bottom: 2cm !important;
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
            <FaFileAlt /> Emissor Rápido de Laudos (Papel Timbrado)
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

      {/* ÁREA DE PAPEL (A4) */}
      <div id="printable-area" style={{
        background: 'white',
        width: '210mm',
        minHeight: '297mm',
        // Na tela, deixamos um padding visual normal, na impressão o CSS @media print assume 4.5cm
        padding: '20mm',
        margin: '0 auto',
        boxShadow: '0 0 15px rgba(0,0,0,0.1)',
        fontFamily: 'Arial, sans-serif',
        color: '#000',
        position: 'relative'
      }}>
        
        {/* Bloco de Dados do Paciente (Sem logo, apenas dados) */}
        <div style={{ marginBottom: '30px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
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

        {/* SEM RODAPÉ (Papel Timbrado já tem) */}

      </div>
    </div>
  );
};

export default LaudosPage;