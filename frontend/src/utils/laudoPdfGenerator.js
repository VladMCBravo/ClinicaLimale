// ARQUIVO COMPLETO: src/utils/laudoPdfGenerator.js

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import logoImagemPath from '../assets/Logo-pdf.png';
import { getBase64FromUrl } from "./imageHelper";
import { assinarPdfRemotamente } from "../api/pdfService"; 

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

export const gerarPDFLaudo = async ({
    pacienteId, // <--- 1. NOVO PARÂMETRO ADICIONADO
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

    // D. Tabelas Especiais
    
    // 1. Tabelas de Risco (1º Tri) - Itera por todos os fetos possíveis
    const fetos = [
        { dados: dadosEstruturados.feto1 || dadosEstruturados, label: 'FETO 1' },
        { dados: dadosEstruturados.feto2, label: 'FETO 2' },
        { dados: dadosEstruturados.feto3, label: 'FETO 3' }
    ];

    fetos.forEach(feto => {
        if (feto.dados && feto.dados.riscoT21Basal) {
            // Se for gemelar, adiciona título indicando qual feto é
            if(dadosEstruturados.qtdFetos > 1) {
                content.push({ text: `AVALIAÇÃO DE RISCO - ${feto.label}`, style: 'sectionHeader', margin: [0, 10, 0, 2] });
            }
            content.push(criarTabelaRiscos(feto.dados));
            content.push({ text: ' ', margin: [0, 5] });
        }
    });

    // Linha divisória se houve tabelas de risco
    if (dadosEstruturados?.feto1?.riscoT21Basal) {
        content.push({ canvas: [{ type: 'line', x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 0.5, lineColor: '#ccc' }], margin: [0, 5, 0, 15] });
    }
    
    // 2. Tabelas de Biometria
    fetos.forEach(feto => {
        if (feto.dados && feto.dados.tabelaBiometria && feto.dados.tabelaBiometria.length > 0) {
            const titulo = dadosEstruturados.qtdFetos > 1 
                ? `BIOMETRIA FETAL - ${feto.label}` 
                : 'TABELA BIOMÉTRICA';
            content.push(criarTabelaBiometria(feto.dados.tabelaBiometria, titulo));
        }
    });

    // E. Imagens (Layout 6 por página -> Grade 2x3)
    if (imagensBase64 && imagensBase64.length > 0) {
        // Quebra de página antes das fotos
        content.push({ text: 'DOCUMENTAÇÃO FOTOGRÁFICA', style: 'sectionHeader', margin: [0, 20, 0, 10], pageBreak: 'before' });
        
        // Define tamanho fixo para caber 3 linhas numa A4
        // A4 altura útil ~700px. 3 linhas x 200px = 600px. Margens ok.
        const IMG_WIDTH = 230; 
        const IMG_HEIGHT = 170; 

        for (let i = 0; i < imagensBase64.length; i += 2) {
            const img1 = imagensBase64[i];
            const img2 = imagensBase64[i + 1];

            const columns = [];
            
            // Coluna 1
            columns.push({
                image: img1,
                width: IMG_WIDTH,
                height: IMG_HEIGHT,
                fit: [IMG_WIDTH, IMG_HEIGHT],
                alignment: 'center',
                margin: [0, 0, 0, 10] // Margem inferior entre linhas
            });

            // Coluna 2 (se existir)
            if (img2) {
                columns.push({
                    image: img2,
                    width: IMG_WIDTH,
                    height: IMG_HEIGHT,
                    fit: [IMG_WIDTH, IMG_HEIGHT],
                    alignment: 'center',
                    margin: [0, 0, 0, 10]
                });
            } else {
                // Coluna vazia para manter alinhamento se for impar
                columns.push({ text: '', width: IMG_WIDTH });
            }

            // Adiciona a linha (row) ao content
            content.push({
                columns: columns,
                columnGap: 10,
                unbreakable: false // Permite quebrar página se passar de 3 linhas (6 fotos)
            });
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

    // Se pedimos para retornar o Blob (para salvar no banco internamente)
    if (retornarBlob) {
        return new Promise((resolve) => {
            pdfDocGenerator.getBlob((blob) => resolve(blob));
        });
    }

    // --- 2. INTELIGÊNCIA DE NOMEAÇÃO DO ARQUIVO ---
    const formatarNome = (texto) => {
        if (!texto) return '';
        return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    };
    
    const idStr = pacienteId || "S-ID";
    const nomeLimpo = formatarNome(pacienteNome) || "Paciente";
    const tipoLimpo = formatarNome(tituloExame) || "Exame";
    const nomeArquivo = `${idStr}_${nomeLimpo}_${tipoLimpo}.pdf`;

    // --- 3. FUNÇÃO QUE ABRE E BAIXA AO MESMO TEMPO ---
    const forcarDownloadEAbrir = (blobUrl) => {
        // 1. Abre na nova aba para visualização e impressão
        window.open(blobUrl, '_blank');
        
        // 2. Cria um link fantasma e força o Download
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = nomeArquivo; // O nome padronizado entra aqui!
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (usaAssinaturaDigital) {
        pdfDocGenerator.getBlob(async (blob) => {
            try {
                // Removemos o "window.open" daqui para não dar bloqueio de pop-up duplo
                const pdfAssinadoBlob = await assinarPdfRemotamente(blob);
                const fileURL = URL.createObjectURL(pdfAssinadoBlob);
                
                forcarDownloadEAbrir(fileURL);
                setTimeout(() => URL.revokeObjectURL(fileURL), 2000);
            } catch (error) {
                console.error("Erro na assinatura:", error);
                alert("Não foi possível assinar digitalmente. Verifique se seu certificado está válido.");
            }
        });
    } else {
        pdfDocGenerator.getBlob((blob) => {
            const fileURL = URL.createObjectURL(blob);
            forcarDownloadEAbrir(fileURL);
            setTimeout(() => URL.revokeObjectURL(fileURL), 2000);
        });
    }
};