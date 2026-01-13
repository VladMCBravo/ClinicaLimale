// ARQUIVO COMPLETO: src/utils/laudoPdfGenerator.js

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import logoImagemPath from '../assets/Logo-pdf.png';
import { getBase64FromUrl } from "./imageHelper";
import { assinarPdfRemotamente } from "../api/pdfService"; 

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

export const gerarPDFLaudo = async ({
    pacienteNome, 
    medicoNome, 
    medicoCrm, 
    tituloExame, 
    textoLaudo, 
    dadosEstruturados, 
    imagensBase64,
    comTimbre = true,
    usaAssinaturaDigital = false,
    retornarBlob = false // <--- NOVO PARÂMETRO
}) => {

    // --- CONVERSÃO AUTOMÁTICA DO LOGO ---
    let logoBase64 = null;
    if (comTimbre) {
        try {
            logoBase64 = await getBase64FromUrl(logoImagemPath);
        } catch (error) {
            console.error("Erro ao carregar o logo:", error);
        }
    }
    // Margens: [Esq, Top, Dir, Inf]
    const pageMargins = [40, 130, 40, 80]; 

    // --- 1. CABEÇALHO (HEADER) ---
    const headerDefinition = comTimbre ? {
        margin: [40, 20, 40, 0], 
        stack: [
            { 
                image: logoBase64 ? logoBase64 : null, 
                width: 140, 
                alignment: 'center',
                margin: [0, 0, 0, 10] 
            },
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
            
            // Detecta títulos de seção para negrito e cor
            const titulosConhecidos = [
                'CONCLUSÃO', 
                'BIOMETRIA FETAL', 
                'MORFOLOGIA FETAL', 
                'RASTREAMENTO MORFOLÓGICO',
                'ESTUDO DOPPLERFLUXOMÉTRICO',
                'ANÁLISE MORFOLÓGICA',
                'ESTUDO TRIDIMENSIONAL',
                'AVALIAÇÃO DO COLO UTERINO'
            ];
            
            // Se a linha contém um desses títulos ou traços separadores
            if (line.includes('---') || titulosConhecidos.some(t => line.toUpperCase().includes(t))) {
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

    // --- TABELA DE RISCOS (ATUALIZADA) ---
    const criarTabelaRiscos = (d) => {
        // Verifica se tem dados de risco (Basal ou Corrigido)
        if (!d.riscoT21Basal && !d.riscoT21Corrigido) return null;

        return {
            stack: [
                { text: 'CÁLCULO DE RISCO PARA CROMOSSOMOPATIAS', style: 'sectionHeader', margin: [0, 15, 0, 5] },
                {
                    table: {
                        widths: ['*', '*', '*', '*'], 
                        body: [
                            [
                                { text: '', border: [false, false, false, true] },
                                { text: 'T21', style: 'tableHeader', bold: true, fillColor: '#f0f0f0', alignment: 'center' },
                                { text: 'T18', style: 'tableHeader', bold: true, fillColor: '#f0f0f0', alignment: 'center' },
                                { text: 'T13', style: 'tableHeader', bold: true, fillColor: '#f0f0f0', alignment: 'center' }
                            ],
                            [
                                { text: 'Risco Basal', fontSize: 9, bold: true, color: '#333', margin:[0,5] },
                                { text: `1 / ${d.riscoT21Basal || '---'}`, fontSize: 9, alignment: 'center', margin:[0,5] },
                                { text: `1 / ${d.riscoT18Basal || '---'}`, fontSize: 9, alignment: 'center', margin:[0,5] },
                                { text: `1 / ${d.riscoT13Basal || '---'}`, fontSize: 9, alignment: 'center', margin:[0,5] }
                            ],
                            [
                                { text: 'Risco Corrigido', fontSize: 9, bold: true, color: '#333', margin:[0,5] },
                                { text: `1 / ${d.riscoT21Corrigido || '---'}`, fontSize: 9, alignment: 'center', margin:[0,5] },
                                { text: `1 / ${d.riscoT18Corrigido || '---'}`, fontSize: 9, alignment: 'center', margin:[0,5] },
                                { text: `1 / ${d.riscoT13Corrigido || '---'}`, fontSize: 9, alignment: 'center', margin:[0,5] }
                            ]
                        ]
                    },
                    layout: 'lightHorizontalLines'
                }
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

    // C. Processamento do Texto (COM LIMPEZA DA TABELA ANTIGA)
    let textoParaImprimir = textoLaudo || '';

    // Verifica se há dados de risco para decidir se remove o texto duplicado
    const temRisco = dadosEstruturados?.riscoT21Basal || dadosEstruturados?.feto1?.riscoT21Basal;

    if (temRisco) {
        // CORREÇÃO: Regex ajustado para o novo padrão "CÁLCULO DE RISCO (1:X)" gerado pelo relatorioGenerator.js
        // Remove desde o título até o final das linhas de T13
        const regexRemoveTabela = /CÁLCULO DE RISCO \(1:X\)[\s\S]*?Corrigido 1\/.*?\n/g;
        textoParaImprimir = textoParaImprimir.replace(regexRemoveTabela, '');
    }

    const paragrafosTexto = processarTexto(textoParaImprimir);
    
    // Separa o último parágrafo para tentar manter junto da assinatura
    let ultimoParagrafo = null;
    if (paragrafosTexto.length > 0) {
        ultimoParagrafo = paragrafosTexto.pop(); 
    }

    content.push(...paragrafosTexto);

    // D. Tabelas Especiais (Inseridas ANTES da assinatura)
    
    // 1. Tabela de Riscos (PDF Formatado)
    const dadosRisco = dadosEstruturados?.riscoT21Basal ? dadosEstruturados : (dadosEstruturados?.feto1?.riscoT21Basal ? dadosEstruturados.feto1 : null);
    
    if (dadosRisco) {
        content.push(criarTabelaRiscos(dadosRisco));
        content.push({ text: ' ', margin: [0, 10] }); 
    }

    // Linha divisória fina
    content.push({ canvas: [{ type: 'line', x1: 0, y1: 15, x2: 515, y2: 15, lineWidth: 0.5, lineColor: '#ccc' }], margin: [0, 10, 0, 10] });
    
    // 2. Tabelas de Biometria (Se houver array preparado)
    // NOTA: Certifique-se que o frontend cria 'tabelaBiometria' dentro de dadosEstruturados
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

    // --- ASSINATURA ---
    const primeiroNome = medicoNome ? medicoNome.trim().split(' ')[0].toLowerCase() : '';
    const isDra = primeiroNome.endsWith('a'); 
    const prefixoMedico = isDra ? 'Dra.' : 'Dr.';
    const nomeFormatado = medicoNome ? `${prefixoMedico} ${medicoNome}` : 'Médico Examinador';
    const limparCRM = (crm) => crm ? crm.replace(/[^\w\s]/gi, '') : '';

    let elementoAssinatura = null;

    if (usaAssinaturaDigital) {
        elementoAssinatura = {
            stack: [
                { text: '', margin: [0, 20] }, 
                {
                    table: {
                        widths: ['*'],
                        body: [[
                            {
                                stack: [
                                    { text: 'DOCUMENTO ASSINADO DIGITALMENTE', fontSize: 8, color: '#555', margin: [0, 0, 0, 2] },
                                    { text: nomeFormatado, bold: true, fontSize: 10, color: '#000' },
                                    { text: `CRM: ${limparCRM(medicoCrm) || 'N/A'}`, fontSize: 9 },
                                    { text: 'Assinado eletronicamente conforme MP 2.200-2/2001 (ICP-Brasil).', fontSize: 7, color: '#777', margin: [0, 5, 0, 0] },  
                                    { text: 'Valide em: verificador.iti.gov.br', fontSize: 7, color: '#777' }
                                ],
                                alignment: 'center',
                                fillColor: '#f8f9fa',
                                borderColor: ['#ccc', '#ccc', '#ccc', '#ccc']
                            }
                        ]]
                    },
                    layout: { defaultBorder: true },
                    margin: [120, 0, 120, 0] 
                }
            ]
        };
    } else {
        elementoAssinatura = {
            stack: [
                { text: '', margin: [0, 35] }, 
                { text: '_______________________________', alignment: 'center', color: '#999', margin: [0, 0, 0, 5] },
                { text: nomeFormatado, alignment: 'center', bold: true, fontSize: 10, margin: [0, 2] },
                { text: medicoCrm ? `CRM: ${limparCRM(medicoCrm)}` : '', alignment: 'center', fontSize: 9, color: '#555' }
            ]
        };
    }

    content.push({
        stack: [
            ultimoParagrafo ? ultimoParagrafo : {},
            elementoAssinatura
        ],
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
          // AJUSTE AQUI: O padrão é 1.2 ou 1.5. Tente reduzir para 1.15 ou 1.2
          footerText: { fontSize: 9, color: '#555', lineHeight: 1.1 } 
        },
        // Adicione lineHeight aqui para o texto geral do corpo
        defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 } 
    };
    
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);

    // Se pedimos para retornar o Blob (para salvar no banco), não abrimos janela
    if (retornarBlob) {
        return new Promise((resolve, reject) => {
            pdfDocGenerator.getBlob((blob) => {
                resolve(blob);
            });
        });
    }

    if (usaAssinaturaDigital) {
        pdfDocGenerator.getBlob(async (blob) => {
            try {
                const newWindow = window.open('', '_blank');
                if(newWindow) newWindow.document.write('<h2>Aguarde, aplicando assinatura digital...</h2>');

                const pdfAssinadoBlob = await assinarPdfRemotamente(blob);
                
                const fileURL = URL.createObjectURL(pdfAssinadoBlob);
                if(newWindow) newWindow.location.href = fileURL;
                
            } catch (error) {
                console.error("Erro na assinatura:", error);
                alert("Não foi possível assinar digitalmente. Verifique se seu certificado está válido no sistema.");
            }
        });
    } else {
        pdfDocGenerator.open();
    }
};