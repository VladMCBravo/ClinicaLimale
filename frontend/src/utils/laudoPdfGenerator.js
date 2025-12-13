// ARQUIVO COMPLETO: src/utils/laudoPdfGenerator.js

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Importe a constante do outro arquivo
import { LOGO_CLINICA_BASE64 } from "./assets"; 

// O resto do seu código continua igual...
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

export const gerarPDFLaudo = ({ 
    pacienteNome, 
    medicoNome, 
    medicoCrm, 
    tituloExame, 
    textoLaudo, 
    dadosEstruturados, 
    imagensBase64,
    comTimbre = true 
}) => {
    
    // Margens: [Esq, Top, Dir, Inf]
    const pageMargins = [40, 130, 40, 80]; 

    // --- 1. CABEÇALHO (HEADER) ---
    const headerDefinition = comTimbre ? {
        margin: [40, 20, 40, 0], 
        stack: [
            { 
                // Enquanto não temos o Base64 válido, usamos texto para não travar:
                text: 'AQUI VIRIA O LOGO', 
                image: LOGO_CLINICA_BASE64, // <-- Descomente aqui quando corrigir o Base64
                width: 140, 
                alignment: 'center',
                margin: [0, 0, 0, 10] 
            },
            // Linha Dourada
            { canvas: [{ type: 'line', x1: 40, y1: 0, x2: 475, y2: 0, lineWidth: 1.5, lineColor: '#C6A87C' }], alignment: 'center', margin: [0, 5] },
        ]
    } : null;

    // --- 2. RODAPÉ (FOOTER) ---
    const footerDefinition = comTimbre ? (currentPage, pageCount) => {
        return {
            margin: [40, 10, 40, 0],
            stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#C6A87C' }], alignment: 'center', margin: [0, 5] },
                { 
                    text: [
                        { text: 'Clínica Limalé', bold: true }, '  |  ', 'www.limale.com.br', '  |  ', '(11) 91951-1842'
                    ], 
                    style: 'footerText', alignment: 'center'
                },
                { 
                    text: [
                        'contato@limale.com.br', '  |  ', { text: '@clinicalimale', bold: true }
                    ], 
                    style: 'footerText', alignment: 'center', margin: [0, 2]
                },
                { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', fontSize: 7, color: '#999', margin: [0, 5, 0, 0] }
            ]
        };
    } : null;

    // --- FUNÇÕES AUXILIARES ---
    const processarTexto = (textoRaw) => {
        if (!textoRaw) return [];
        return textoRaw.split('\n').map(line => {
            if (line.trim() === '') return { text: '', margin: [0, 2] };
            if (line.includes('---') || line.toUpperCase().includes('CONCLUSÃO:')) {
                return { text: line, style: 'sectionHeader', margin: [0, 10, 0, 2] };
            }
            return { text: line, fontSize: 10, alignment: 'justify', lineHeight: 1.3, margin: [0, 0, 0, 6] };
        });
    };

    const criarTabelaBiometria = (dadosTabela, titulo) => {
        if (!dadosTabela || dadosTabela.length === 0) return null;
        const bodyTable = [[
            { text: 'ESTRUTURA', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] }, 
            { text: 'MEDIDA', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] }
        ]];
        dadosTabela.forEach((item) => {
            bodyTable.push([
                { text: item.estrutura, fontSize: 9, color: '#333', border: [false, false, false, true], margin: [0, 2] },
                { text: item.medida, fontSize: 9, bold: true, alignment: 'right', border: [false, false, false, true], margin: [0, 2] }
            ]);
        });
        return {
            stack: [
                { text: titulo, style: 'sectionHeader', margin: [0, 10, 0, 5] },
                { table: { widths: ['*', 100], body: bodyTable }, layout: 'noBorders' }
            ],
            unbreakable: true 
        };
    };

    // --- MONTAGEM DO CONTEÚDO ---
    const content = [];

    // A. Dados do Paciente
    content.push({
        columns: [
            { 
                stack: [
                    { text: 'PACIENTE', fontSize: 8, color: '#666', bold: true },
                    { text: pacienteNome ? pacienteNome.toUpperCase() : '___', fontSize: 11, bold: true }
                ], width: '*' 
            },
            { 
                stack: [
                    { text: 'DATA DO EXAME', fontSize: 8, color: '#666', bold: true, alignment: 'right' },
                    { text: new Date().toLocaleDateString('pt-BR'), fontSize: 11, alignment: 'right' }
                ], width: 100 
            }
        ],
        margin: [0, 0, 0, 20]
    });

    // B. Título
    content.push({ 
        text: tituloExame || 'RELATÓRIO MÉDICO', style: 'mainHeader', alignment: 'center', margin: [0, 0, 0, 20] 
    });

    // C. Processamento Inteligente do Texto (Para a Assinatura)
    const paragrafosTexto = processarTexto(textoLaudo);
    let ultimoParagrafo = null;
    
    // Remove o último parágrafo da lista principal para colar ele na assinatura depois
    if (paragrafosTexto.length > 0) {
        ultimoParagrafo = paragrafosTexto.pop(); 
    }

    // Adiciona todo o texto (exceto o último parágrafo)
    content.push(...paragrafosTexto);

    // Linha divisória fina após texto
    content.push({ canvas: [{ type: 'line', x1: 0, y1: 15, x2: 515, y2: 15, lineWidth: 0.5, lineColor: '#ccc' }], margin: [0, 10, 0, 10] });
    
    // D. Tabelas (se houver)
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
                columnGap: 10, margin: [0, 5]
            };
            content.push(row);
        }
    }

    // --- LÓGICA DO PREFIXO MÉDICO (Dr. ou Dra.) ---
    const primeiroNome = medicoNome ? medicoNome.trim().split(' ')[0].toLowerCase() : '';
    // Se terminar em 'a' (ex: Camila, Ana) usa Dra., senão Dr.
    const isDra = primeiroNome.endsWith('a'); 
    const prefixoMedico = isDra ? 'Dra.' : 'Dr.';
    const nomeFormatado = medicoNome ? `${prefixoMedico} ${medicoNome}` : 'Médico Examinador';

    // --- BLOCO FINAL INQUEBRÁVEL (Último Texto + Assinatura) ---
    content.push({
        stack: [
            // Aqui entra o último parágrafo que salvamos antes
            ultimoParagrafo ? ultimoParagrafo : {},
            
            // Espaço maior para assinatura
            { text: '', margin: [0, 35] }, 

            // Linha da Assinatura
            { text: '_______________________________', alignment: 'center', color: '#999', margin: [0, 0, 0, 5] },
            
            // Nome com Dr./Dra.
            { text: nomeFormatado, alignment: 'center', bold: true, fontSize: 10, margin: [0, 2] },
            
            // CRM
            { text: medicoCrm ? `CRM: ${medicoCrm}` : '', alignment: 'center', fontSize: 9, color: '#555' }
        ],
        // O SEGREDO: 'unbreakable: true' impede que esse bloco seja cortado no meio.
        // Se não couber na página, ele leva o último parágrafo E a assinatura para a próxima.
        unbreakable: true 
    });

    // --- GERAÇÃO DO PDF ---
    const docDefinition = {
        pageSize: 'A4', 
        pageMargins: pageMargins,
        header: headerDefinition,
        footer: footerDefinition,
        content: content,
        styles: {
          mainHeader: { fontSize: 14, bold: true, color: '#1C2E4A' },
          sectionHeader: { fontSize: 11, bold: true, color: '#2E7D32', uppercase: true },
          tableHeader: { fontSize: 9, bold: true, color: '#555' },
          footerText: { fontSize: 9, color: '#555', lineHeight: 1.3 }
        },
        defaultStyle: { font: 'Roboto' }
    };
    
    pdfMake.createPdf(docDefinition).open();
};