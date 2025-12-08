// src/utils/laudoPdfGenerator.js
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Configuração do vfs (necessário para o pdfMake funcionar)
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

export const gerarPDFLaudo = ({ 
    pacienteNome, 
    medicoNome, 
    medicoCrm, 
    tituloExame, 
    textoLaudo, 
    dadosEstruturados, 
    imagensBase64 // Array de strings Base64
}) => {
    const pageMargins = [40, 128, 40, 60]; 
    const content = [];

    // --- 1. Tabelas de Biometria ---
    const criarTabelaBiometria = (dadosTabela, titulo) => {
        if (!dadosTabela || dadosTabela.length === 0) return null;
        
        const bodyTable = [
            [
                { text: 'ESTRUTURA', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] }, 
                { text: 'MEDIDA', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] }
            ]
        ];
        
        dadosTabela.forEach((item) => {
            bodyTable.push([
                { text: item.estrutura, fontSize: 9, color: '#333', border: [false, false, false, true], margin: [0, 2] },
                { text: item.medida, fontSize: 9, bold: true, alignment: 'right', border: [false, false, false, true], margin: [0, 2] }
            ]);
        });

        return {
            stack: [
                { text: titulo, style: 'sectionHeader', margin: [0, 10, 0, 5] },
                {
                    table: {
                        widths: ['*', 100], 
                        body: bodyTable
                    },
                    layout: {
                        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0 : 0.5,
                        vLineWidth: () => 0,
                        hLineColor: () => '#E0E0E0'
                    }
                }
            ],
            unbreakable: true 
        };
    };

    // --- 2. Tabela de Medidas Carótidas/Gerais (Adicionado para suportar tabelas genéricas) ---
    // Caso você tenha salvo a tabelaMedidas no JSON das carótidas
    const criarTabelaMedidasGenerica = (tabela, titulo) => {
        if (!tabela || tabela.length === 0) return null;
        // Lógica similar à de cima, adaptável se necessário
        return null; 
    };

    // --- Processamento de Texto ---
    const processarTexto = (textoRaw) => {
        if (!textoRaw) return [];
        return textoRaw.split('\n').map(line => {
            if (line.trim() === '') return { text: '', margin: [0, 2] };
            
            if (line.includes('---') || line.toUpperCase().includes('CONCLUSÃO:')) {
                return { text: line, style: 'sectionHeader', margin: [0, 10, 0, 2] };
            }
            
            return { 
                text: line, 
                fontSize: 10, 
                alignment: 'justify', 
                lineHeight: 1.3,
                margin: [0, 0, 0, 6] 
            };
        });
    };

    // --- MONTAGEM DO CONTEÚDO ---
    
    // A. Título
    content.push({ 
        text: tituloExame || 'RELATÓRIO MÉDICO', 
        style: 'mainHeader', 
        alignment: 'center',
        margin: [0, 0, 0, 20] 
    });

    // B. Texto
    content.push(...processarTexto(textoLaudo));

    // C. Linha Separadora
    content.push({ canvas: [{ type: 'line', x1: 0, y1: 15, x2: 515, y2: 15, lineWidth: 0.5, lineColor: '#ccc' }], margin: [0, 10, 0, 10] });
    
    // D. Tabelas (Obstétricas e Outras)
    if (dadosEstruturados?.feto1?.tabelaBiometria?.length > 0) {
        const titulo = dadosEstruturados.isGemelar ? 'BIOMETRIA FETAL - FETO 1' : 'TABELA BIOMÉTRICA';
        content.push(criarTabelaBiometria(dadosEstruturados.feto1.tabelaBiometria, titulo));
    }
    
    if (dadosEstruturados?.isGemelar && dadosEstruturados?.feto2?.tabelaBiometria?.length > 0) {
        content.push(criarTabelaBiometria(dadosEstruturados.feto2.tabelaBiometria, 'BIOMETRIA FETAL - FETO 2'));
    }

    // E. Imagens
    if (imagensBase64 && imagensBase64.length > 0) {
        content.push({ text: 'DOCUMENTAÇÃO FOTOGRÁFICA', style: 'sectionHeader', margin: [0, 20, 0, 10], pageBreak: 'before' });
        for (let i = 0; i < imagensBase64.length; i += 2) {
            const row = {
                columns: [
                    { image: imagensBase64[i], width: 230, height: 160, fit: [230, 160], margin: [0, 5], alignment: 'center' }, 
                    imagensBase64[i + 1] ? { image: imagensBase64[i + 1], width: 230, height: 160, fit: [230, 160], margin: [0, 5], alignment: 'center' } : null 
                ],
                columnGap: 10,
                margin: [0, 5]
            };
            content.push(row);
        }
    }

    // --- DEFINIÇÃO DO DOCUMENTO ---
    const docDefinition = {
        pageSize: 'A4', 
        pageMargins: pageMargins,
        content: [
            // Cabeçalho Fixo (Paciente / Data)
            {
              columns: [
                  { 
                      stack: [
                          { text: 'PACIENTE', fontSize: 8, color: '#666', bold: true },
                          { text: pacienteNome ? pacienteNome.toUpperCase() : '___', fontSize: 11, bold: true }
                      ],
                      width: '*' 
                  },
                  { 
                      stack: [
                          { text: 'DATA DO EXAME', fontSize: 8, color: '#666', bold: true, alignment: 'right' },
                          { text: new Date().toLocaleDateString('pt-BR'), fontSize: 11, alignment: 'right' }
                      ],
                      width: 100 
                  }
              ],
              margin: [0, 0, 0, 25]
            },
            
            ...content,

            // Rodapé (Assinatura)
            {
              stack: [
                  { text: '_______________________________', alignment: 'center', color: '#999' },
                  { text: medicoNome || 'Médico Examinador', alignment: 'center', bold: true, fontSize: 10, margin: [0, 2] },
                  { text: medicoCrm ? `CRM: ${medicoCrm}` : '', alignment: 'center', fontSize: 9, color: '#555' }
              ],
              unbreakable: true, 
              margin: [0, 40, 0, 10], 
              alignment: 'center'
            },
        ],
        styles: {
          mainHeader: { fontSize: 14, bold: true, color: '#1C2E4A' },
          sectionHeader: { fontSize: 11, bold: true, color: '#2E7D32', uppercase: true },
          tableHeader: { fontSize: 9, bold: true, color: '#555' }
        },
        defaultStyle: {
            font: 'Roboto' 
        }
    };
    
    // Abre o PDF
    pdfMake.createPdf(docDefinition).open();
};