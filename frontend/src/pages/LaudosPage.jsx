// src/pages/LaudosPage.jsx
import React, { useState } from 'react';
import { FaPrint, FaFileAlt } from 'react-icons/fa';

// Importação do PDFMake
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Configuração necessária para o PDFMake funcionar no React
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

// --- SEUS TEMPLATES (Mesmos de antes) ---
const templates = [
    {
      id: 1,
      nome: "1. USG Pélvica Transvaginal",
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
      nome: "2. USG Obstétrica Transvaginal (Inicial)",
      texto: `ULTRASSONOGRAFIA OBSTÉTRICA TRANSVAGINAL

IG: compatível com __ semanas e __ dias.

Bexiga vazia.
Útero globoso, aumentado de volume, de contornos regulares e miométrio homogêneo.

Observa-se na cavidade uterina, saco gestacional de contornos regulares medindo ____, contendo no seu interior embrião, com batimentos cardíacos presentes (____ BPM), medindo ____ cm de CCN.

As vilosidades placentárias tem inserção normal.
Não se observa coágulo intra uterino.
O orifício interno do colo permanece fechado, medindo ____.
Anexos parauterinos normais.

IMPRESSÃO DIAGNÓSTICA:
- Gestação tópica de aproximadamente __ semanas e __ dias (+/- 5 dias).

Favor trazer este exame quando vier realizar o próximo.
A imagem diagnóstica não é absoluta, devendo ser interpretada pelo médico assistente em conjunto com o exame físico e demais exames complementares.`
    },
    {
      id: 3,
      nome: "3. USG Obstétrica Básica",
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
        id: 4,
        nome: "4. USG Obstétrica com Doppler",
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
        id: 5,
        nome: "5. USG Obstétrica Gemelar com Doppler",
        texto: `ULTRASSONOGRAFIA OBSTÉTRICA COM COLOR DOPPLER GEMELAR

DPP: --/--/---- (calculada pelo primeiro ultrassom), compatível com __ semanas e __ dias.

Gestação gemelar, dicoriônica e diamniótica com feto I à direita da mãe e feto II à esquerda da mãe.

FETO I:
Situação longitudinal, apresentação pélvica e com dorso à direita.
Batimentos cardíacos e movimentos fetais presentes (____ bpm).
Estômago fetal repleto e de conteúdo anecóide.
Bexiga fetal repleta e de conteúdo anecóide.
Placenta de inserção corporal posterior, homogênea, grau __, medindo ____ mm.
Líquido amniótico em quantidade normal (MBV= ____ mm).

FETO II:
Situação longitudinal, apresentação pélvica e com dorso à direita.
Batimentos cardíacos e movimentos fetais presentes (____ bpm).
Estômago fetal repleto e de conteúdo anecóide.
Bexiga fetal repleta e de conteúdo anecóide.
Placenta de inserção corporal ____, homogênea, grau 0, medindo ____ mm.
Líquido amniótico em quantidade normal (MBV= ____ mm).

MEDIDAS (FETO I | FETO II):
Diâmetro Biparietal:          ____ mm | ____ mm
Diâmetro Occipto Frontal:     ____ mm | ____ mm
Circunferência Cefálica:      ____ mm | ____ mm
Circunferência Abdominal:     ____ mm | ____ mm
Comprimento do Fêmur:         ____ mm | ____ mm
Comprimento do Úmero:         ____ mm | ____ mm

ESTUDO DOPPLER FETO I:
Artéria cerebral: ____
Artéria umbilical: ____
Relação cerebro/umbilical: ____

ESTUDO DOPPLER FETO II:
Artéria cerebral: ____
Artéria umbilical: ____
Relação cerebro/umbilical: ____

ESTUDO UTERINAS:
Artéria uterina direita: ____
Artéria uterina esquerda: ____
IP médio: ____

IMPRESSÃO DIAGNÓSTICA FETO I:
- Gestação gemelar, dicoriônica e diamniótica.
- Biometria fetal compatível com aprox. __ semanas e __ dias +/- 14 dias.
- Líquido amniótico normal (MBV= ____ mm).
- Peso Fetal: ____ gr (+/- 10%).
- Percentil: ____ % (Tabela Alexander).
- Sexo: ____.
- Dopplerfluxometria sem anormalidades.

IMPRESSÃO DIAGNÓSTICA FETO II:
- Gestação gemelar, dicoriônica e diamniótica.
- Biometria fetal compatível com aprox. __ semanas e __ dias +/- 7 dias.
- Líquido amniótico normal (MBV= ____ mm).
- Peso Fetal: ____ gr (+/- 10%).
- Percentil: ____ % (Tabela Alexander).
- Sexo: ____.
- Dopplerfluxometria sem anormalidades.

Favor trazer este exame quando vier realizar o próximo.`
    },
    {
        id: 6,
        nome: "6. USG Morfológico 1º Trimestre",
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
        id: 7,
        nome: "7. USG Morfológico 1º Trimestre Gemelar",
        texto: `ULTRASSOM MORFOLÓGICO FETAL GEMELAR DE PRIMEIRO TRIMESTRE

DPP: --/--/----, compatível com __ semanas e __ dias.

Gestação tópica, gemelar dicoriônica e diamniótica.
Feto I localizado à direita da mãe mais acima.
Feto II localizado à direita da mãe mais embaixo.

ANÁLISE FETAL (Ambos os fetos):
Segmento cefálico: Crânio normal, linha média presente, osso nasal presente.
Tórax: Normal.
Batimentos cardíacos: (F.C.F = FETO I - ____ bpm | FETO II - ____ bpm).
Abdomem: Estômago e bexiga repletos e normais.
Membros: Visualizados, sem anormalidades grosseiras.

BIOMETRIA FETAL (FETO I | FETO II):
CCN:                        ____ mm | ____ mm
Diâmetro Biparietal:        ____ mm | ____ mm
Diâmetro Occipto Frontal:   ____ mm | ____ mm
Circunferência Cefálica:    ____ mm | ____ mm
Circunferência Abdominal:   ____ mm | ____ mm
Comprimento do Fêmur:       ____ mm | ____ mm
Comprimento do Úmero:       ____ mm | ____ mm
Osso próprio do nariz:      ____ mm | ____ mm
Translucência Nucal:        ____ mm | ____ mm

PLACENTA:
Feto I: Inserção corporal anterior, homogênea, grau 0, medindo ____ mm.
Feto II: Inserção corporal ____, homogênea, grau 0, medindo ____ mm.
Líquido amniótico normal.
Ducto Venoso com Onda A positiva.

IMPRESSÃO DIAGNÓSTICA FETO I:
- Biometria compatível com __ semanas e __ dias. Peso: ____ gr.
- RISCO TRISSOMIAS (Idade Materna): ____ / (Exame): ____

IMPRESSÃO DIAGNÓSTICA FETO II:
- Biometria compatível com __ semanas e __ dias. Peso: ____ gr.
- RISCO TRISSOMIAS (Idade Materna): ____ / (Exame): ____

Favor trazer este exame quando vier realizar o próximo.`
    },
    {
        id: 8,
        nome: "8. USG Morfológico 2º Trimestre",
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
    },
    {
        id: 9,
        nome: "9. USG Morfológico 2º Trimestre Gemelar",
        texto: `ULTRASSOM MORFOLÓGICO FETAL SEGUNDO TRIMESTRE GEMELAR COM DOPPLER

DPP: --/--/----, compatível com __ semanas e __ dias.

Gestação tópica, gemelar dicoriônica e diamniótica.
Feto I: Longitudinal, cefálica, dorso à direita.
Feto II: Longitudinal, cefálica, dorso à esquerda.

ANÁLISE FETAL (Ambos):
SNC, Face, Coluna, Tórax, Abdome e Membros com características ecográficas habituais e preservadas.
Batimentos cardíacos rítmicos.

BIOMETRIA (FETO I | FETO II):
DBP: ____ | ____ mm
DOF: ____ | ____ mm
CC:  ____ | ____ mm
CA:  ____ | ____ mm
Fêmur: ____ | ____ mm
Úmero: ____ | ____ mm
Cerebelo: ____ | ____ mm
(Demais medidas conforme padrão...)

ESTUDO DOPPLER (FETO I | FETO II):
Artéria Cerebral: ____ | ____
Artéria Umbilical: ____ | ____
Relação C/U: ____ | ____

Artérias Uterinas (D/E): ____ / ____ (IP Médio: ____)

PLACENTA:
Feto I: Anterior, grau 0, ____ mm. Líquido normal.
Feto II: Posterior, grau 0, ____ mm. Líquido normal.

IMPRESSÃO DIAGNÓSTICA:
FETO I: Gemelar, Biometria __ sem, Peso ____ gr, Percentil ____, Sexo ____, Doppler normal.
FETO II: Gemelar, Biometria __ sem, Peso ____ gr, Percentil ____, Sexo ____, Doppler normal.

Favor trazer este exame quando vier realizar o próximo.`
    },
    {
        id: 10,
        nome: "10. USG Trigemelar Morfológico",
        texto: `ULTRASSOM MORFOLÓGICO FETAL SEGUNDO TRIMESTRE TRIGEMELAR COM DOPPLER

DPP: --/--/----, compatível com __ semanas e __ dias.
Gestação tópica, trigemelar monocoriônica e diamniótica.

Feto I: Longitudinal, cefálica, dorso à direita.
Feto II: Longitudinal, cefálica, dorso à esquerda.
Feto III: Longitudinal, cefálica, dorso à esquerda.

ANÁLISE FETAL (I, II e III):
SNC, Face, Coluna, Tórax (4 câmaras), Abdome e Membros normais.
FCF: I: __ bpm | II: __ bpm | III: __ bpm.

BIOMETRIA (FETO I | FETO II | FETO III):
DBP: ____ | ____ | ____ mm
CC:  ____ | ____ | ____ mm
CA:  ____ | ____ | ____ mm
Fêmur: ____ | ____ | ____ mm
(Demais medidas conforme padrão...)

DOPPLER (I | II | III):
Cerebral / Umbilical / Rel C/U (>1): Normais.

PLACENTA:
Feto I, II e III: Inserção corporal, homogênea, grau 0. Líquido normal.

IMPRESSÃO DIAGNÓSTICA (Repetir para FETO I, II e III):
- Gestação trigemelar monocoriônica e diamniótica.
- Biometria compatível com __ semanas.
- Líquido amniótico normal.
- Peso: ____ gr. Percentil: ____.
- Doppler normal.
- Sexo: ____.

Favor trazer este exame quando vier realizar o próximo.`
    }
  ];

// --- COMPONENTE ---
const LaudosPage = () => {
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [laudoContent, setLaudoContent] = useState('');
  
  // Dados
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

  // --- AQUI ESTÁ A MÁGICA DO PDF ---
  const handleGeneratePDF = () => {
    if (!laudoContent) {
        alert("Selecione um modelo primeiro.");
        return;
    }

    // Definição do documento para o PDFMake
    // Usamos pontos (pts). 1cm ≈ 28.35pts.
    // 4.5cm de topo = ~128 pts (vamos usar 135 para segurança)
    // 2.0cm de lateral = ~57 pts
    
    const docDefinition = {
        pageSize: 'A4',
        // [margemEsquerda, margemTopo, margemDireita, margemFundo]
        pageMargins: [60, 135, 60, 60], 
        
        content: [
            // Bloco de Identificação (Negrito nos títulos)
            {
                text: [
                    { text: 'NOME: ', bold: true, fontSize: 11 },
                    { text: paciente || '__________________________', fontSize: 11 }
                ],
                margin: [0, 0, 0, 2] // margem inferior pequena
            },
            {
                text: [
                    { text: 'CONVÊNIO: ', bold: true, fontSize: 11 },
                    { text: 'PARTICULAR', fontSize: 11 }
                ],
                margin: [0, 0, 0, 2]
            },
            {
                text: [
                    { text: 'DATA: ', bold: true, fontSize: 11 },
                    { text: data, fontSize: 11 }
                ],
                margin: [0, 0, 0, 25] // Espaço maior antes do texto do laudo
            },

            // O Texto do Laudo (Editável)
            {
                text: laudoContent,
                fontSize: 12,
                alignment: 'justify',
                lineHeight: 1.2
            },

            // Assinatura
            {
                text: '__________________________________________',
                alignment: 'center',
                margin: [0, 50, 0, 5] // Espaço grande antes da linha
            },
            {
                text: medico,
                alignment: 'center',
                bold: true,
                fontSize: 11
            }
        ],
        defaultStyle: {
            font: 'Roboto' // Fonte padrão do PDFMake
        }
    };

    // Abre o PDF em nova aba pronto para imprimir
    pdfMake.createPdf(docDefinition).open(); 
  };

  return (
    <div className="laudos-page-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Container Principal */}
      <div style={{ 
          background: '#fff', 
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '25px'
      }}>
        
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#2E7D32', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
            <FaFileAlt /> Emissor de Laudos (PDF A4)
        </h2>
        
        {/* Formulário de Configuração */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
             
             {/* Seleção de Modelo */}
             <div style={{ gridColumn: '1 / -1' }}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555'}}>1. Escolha o Modelo:</label>
                <select 
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }} 
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
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9em', fontWeight: 'bold'}}>Nome da Paciente:</label>
                <input 
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} 
                    value={paciente} 
                    onChange={e => setPaciente(e.target.value)} 
                    placeholder="Ex: Maria da Silva"
                />
            </div>
            <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9em', fontWeight: 'bold'}}>Médico Responsável:</label>
                <input 
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} 
                    value={medico} 
                    onChange={e => setMedico(e.target.value)} 
                />
            </div>
            <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9em', fontWeight: 'bold'}}>Data do Exame:</label>
                <input 
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} 
                    value={data} 
                    onChange={e => setData(e.target.value)} 
                />
            </div>
        </div>

        {/* Área de Edição (Visual apenas, não é o que imprime) */}
        <div style={{ marginTop: '30px' }}>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555'}}>2. Edite o Texto do Laudo:</label>
            <textarea
            value={laudoContent}
            onChange={(e) => setLaudoContent(e.target.value)}
            placeholder="O texto do laudo aparecerá aqui..."
            style={{
                width: '100%',
                minHeight: '400px', 
                padding: '15px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                lineHeight: '1.5',
                resize: 'vertical'
            }}
            />
        </div>

        {/* Botão de Ação */}
        <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <button 
                onClick={handleGeneratePDF}
                style={{ 
                    padding: '15px 30px', 
                    background: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    fontSize: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}
            >
                <FaPrint /> GERAR PDF PARA IMPRESSÃO
            </button>
        </div>
        
        <p style={{marginTop: '10px', fontSize: '12px', color: '#777', textAlign: 'right'}}>
            * O PDF será gerado com margem superior de 4.5cm para respeitar o papel timbrado.
        </p>

      </div>
    </div>
  );
};

export default LaudosPage;