// ARQUIVO COMPLETO: src/utils/laudoPdfGenerator.js

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { assinarPdfRemotamente } from "../api/pdfService"; 

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

// --- NOVA FUNÇÃO: Busca o JPEG do backend e converte para Base64 ---
const getMascaraBase64 = async () => {
    // Agora ele vai procurar na raiz do seu site na Vercel
    const TIMBRE_URL = '/Receituario.jpg';
    
    try {
        const response = await fetch(TIMBRE_URL);
        if (!response.ok) throw new Error('Falha ao carregar a máscara');
        
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Aviso: Não foi possível carregar a máscara do receituário.", error);
        return null; // Se falhar, retorna null e o laudo é gerado em fundo branco
    }
};
// -------------------------------------------------------------------

export const gerarPDFLaudo = async ({
    pacienteId, 
    pacienteNome, 
    medicoNome, 
    medicoCrm, 
    tituloExame, 
    textoLaudo, 
    dadosEstruturados, 
    imagensBase64,
    dataExame = null, // <--- NOVO PARÂMETRO
    comTimbre = true,
    usaAssinaturaDigital = false,
    retornarBlob = false 
}) => {

    // Margens exatas para caberem 6 fotos por folha (2 colunas x 3 linhas)
    // Aumentamos o recuo inferior de 60 para 100 para afastar do rodapé
    const pageMargins = [40, 170, 40, 150];

    // --- FUNÇÕES AUXILIARES ---
    const processarTexto = (textoRaw) => {
        if (!textoRaw) return [];
        return textoRaw.split('\n').map(line => {
            if (line.trim() === '') return { text: '', margin: [0, 2] };
            
            const titulosConhecidos = [
                'CONCLUSÃO', 'BIOMETRIA FETAL', 'MORFOLOGIA FETAL', 
                'RASTREAMENTO MORFOLÓGICO', 'ESTUDO DOPPLERFLUXOMÉTRICO',
                'ANÁLISE MORFOLÓGICA', 'ESTUDO TRIDIMENSIONAL', 'AVALIAÇÃO DO COLO UTERINO'
            ];
            
            if (line.includes('---') || titulosConhecidos.some(t => line.toUpperCase().includes(t))) {
                return { text: line, style: 'sectionHeader', margin: [0, 10, 0, 2] };
            }
            // ====================================================================
            // NOVA REGRA: Encolhe a fonte automaticamente para Avisos e Referências
            // ====================================================================
            const identificadoresRodape = ['Diretriz', 'Obs.:', 'Liberado por:', 'Nota:', 'Atenção:'];
            
            if (identificadoresRodape.some(id => line.startsWith(id))) {
                return { 
                    text: line, 
                    fontSize: 8,       // <-- FONTE MENOR (Padrão é 10)
                    color: '#555',     // <-- Cor levemente acinzentada para diferenciar
                    alignment: 'justify', 
                    lineHeight: 1.1,   // <-- Linhas mais espremidas
                    margin: [0, 0, 0, 3] 
                };
            }

            // Texto normal do Laudo
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

    const criarTabelaRiscos = (d) => {
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

    const dataExameFormatada = dataExame 
        ? dataExame.split('-').reverse().join('/') 
        : new Date().toLocaleDateString('pt-BR');

    // --- MONTAGEM DO CONTEÚDO ---
    const content = [];

    // Verifica se existem os dados extras para usar o Novo Cabeçalho
    const hasExtraData = dadosEstruturados?.dataNascimento || dadosEstruturados?.idade || dadosEstruturados?.sexo || dadosEstruturados?.medicoSolicitante;

    if (hasExtraData) {
        // =========================================================
        // NOVO CABEÇALHO LIMALÉ (Geral / Abdome)
        // =========================================================
        
        // Calculadora de idade exclusiva para o PDF
        const calcularIdadePDF = (nascimentoStr) => {
            if (!nascimentoStr) return '';
            if (nascimentoStr.includes('anos') || isNaN(Date.parse(nascimentoStr))) return nascimentoStr; 
            
            const nascimento = new Date(nascimentoStr + 'T12:00:00'); 
            const hoje = new Date();
            let idade = hoje.getFullYear() - nascimento.getFullYear();
            const m = hoje.getMonth() - nascimento.getMonth();
            if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
                idade--;
            }
            return `${idade} anos`;
        };

        const infoIdade = dadosEstruturados.dataNascimento ? calcularIdadePDF(dadosEstruturados.dataNascimento) : (dadosEstruturados.idade || '___');
        const infoSexo = dadosEstruturados.sexo || '___';
        const infoSolicitante = dadosEstruturados.medicoSolicitante || '___';

        content.push({
            layout: 'noBorders',
            margin: [0, 0, 0, 20], // Margem inferior antes do título do exame
            table: {
                widths: ['*', 'auto'],
                body: [
                    // Linha 1: Paciente e Data
                    [
                        { text: [{ text: 'Paciente: ', bold: true, color: '#555' }, pacienteNome ? pacienteNome.toUpperCase() : '___'] },
                        { text: [{ text: 'Data: ', bold: true, color: '#555' }, dataExameFormatada], alignment: 'right' } // <--- MUDOU AQUI
                    ],
                    // Linha 2: Idade e Sexo
                    [
                        { 
                            text: [
                                { text: 'Idade: ', bold: true, color: '#555' }, infoIdade, 
                                { text: '      Sexo: ', bold: true, color: '#555' }, infoSexo
                            ], 
                            colSpan: 2, 
                            margin: [0, 3, 0, 3] // Espaçamento leve entre as linhas
                        },
                        {}
                    ],
                    // Linha 3: Médico Solicitante
                    [
                        { text: [{ text: 'Médico solicitante: ', bold: true, color: '#555' }, infoSolicitante.toUpperCase()], colSpan: 2 },
                        {}
                    ]
                ]
            },
            fontSize: 11
        });

    } else {
        // =========================================================
        // CABEÇALHO ANTIGO (Mantido intocado para Obstétrico)
        // =========================================================
        const patientStack = [
            { text: 'PACIENTE', fontSize: 8, color: '#666', bold: true },
            { text: pacienteNome ? pacienteNome.toUpperCase() : '___', fontSize: 11, bold: true }
        ];

        content.push({
            columns: [
                { stack: patientStack, width: '*' },
                { 
                    stack: [
                        { text: 'DATA DO EXAME', fontSize: 8, color: '#666', bold: true, alignment: 'right' },
                        { text: dataExameFormatada, fontSize: 11, alignment: 'right' } // <--- MUDOU AQUI
                    ], width: 100 
                }
            ],
            margin: [0, 0, 0, 20]
        });
    }

    // O título já usa a propriedade `tituloExame` enviada dinamicamente, preservando a fonte e centralização!
    content.push({ 
        text: tituloExame || 'RELATÓRIO MÉDICO', style: 'mainHeader', alignment: 'center', margin: [0, 0, 0, 20] 
    });

    let textoParaImprimir = textoLaudo || '';
    const temRisco = dadosEstruturados?.riscoT21Basal || dadosEstruturados?.feto1?.riscoT21Basal;
    if (temRisco) {
        const regexRemoveTabela = /CÁLCULO DE RISCO \(1:X\)[\s\S]*?Corrigido 1\/.*?\n/g;
        textoParaImprimir = textoParaImprimir.replace(regexRemoveTabela, '');
    }

    const paragrafosTexto = processarTexto(textoParaImprimir);
    
    // Separa o último parágrafo para grudar ele na assinatura
    let ultimoParagrafo = null;
    if (paragrafosTexto.length > 0) {
        ultimoParagrafo = paragrafosTexto.pop(); 
    }
    content.push(...paragrafosTexto);

    // --- TABELAS ---
    const fetos = [
        { dados: dadosEstruturados?.feto1 || dadosEstruturados, label: 'FETO 1' },
        { dados: dadosEstruturados?.feto2, label: 'FETO 2' },
        { dados: dadosEstruturados?.feto3, label: 'FETO 3' }
    ];

    fetos.forEach(feto => {
        if (feto.dados && feto.dados.riscoT21Basal) {
            if(dadosEstruturados.qtdFetos > 1) {
                content.push({ text: `AVALIAÇÃO DE RISCO - ${feto.label}`, style: 'sectionHeader', margin: [0, 10, 0, 2] });
            }
            content.push(criarTabelaRiscos(feto.dados));
            content.push({ text: ' ', margin: [0, 5] });
        }
    });

    if (dadosEstruturados?.feto1?.riscoT21Basal) {
        content.push({ canvas: [{ type: 'line', x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 0.5, lineColor: '#ccc' }], margin: [0, 5, 0, 15] });
    }
    
    fetos.forEach(feto => {
        if (feto.dados && feto.dados.tabelaBiometria && feto.dados.tabelaBiometria.length > 0) {
            const titulo = dadosEstruturados.qtdFetos > 1 
                ? `BIOMETRIA FETAL - ${feto.label}` 
                : 'TABELA BIOMÉTRICA';
            content.push(criarTabelaBiometria(feto.dados.tabelaBiometria, titulo));
        }
    });

    // ==========================================================
    // 1. ASSINATURA (AGORA VEM ANTES DAS IMAGENS)
    // ==========================================================
    const primeiroNome = medicoNome ? medicoNome.trim().split(' ')[0].toLowerCase() : '';
    const isDra = primeiroNome.endsWith('a'); 
    const prefixoMedico = isDra ? 'Dra.' : 'Dr.';
    const nomeFormatado = medicoNome ? `${prefixoMedico} ${medicoNome}` : 'Médico Examinador';
    const limparCRM = (crm) => crm ? crm.replace(/[^\w\s]/gi, '') : '';

    let elementoAssinatura = null;

    if (usaAssinaturaDigital) {
        const urlValidacaoQR = 'https://validar.iti.gov.br';
        
        // Cole sua string gigante AQUI dentro das aspas simples
        const logoIcpBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAWQAAADzCAIAAAA+bfs4AAAAAXNSR0IArs4c6QAAAIBlWElmTU0AKgAAAAgAAwESAAMAAAABAAEAAAExAAIAAAAkAAAAModpAAQAAAABAAAAVgAAAABBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNSAoTWFjaW50b3NoKQAAA6ABAAMAAAABAAEAAKACAAQAAAABAAABZKADAAQAAAABAAAA8wAAAACmEVQjAAAEgmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIgogICAgICAgICAgICB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iPgogICAgICAgICA8eG1wOkNyZWF0b3JUb29sPkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE1IChNYWNpbnRvc2gpPC94bXA6Q3JlYXRvclRvb2w+CiAgICAgICAgIDx4bXBNTTpEZXJpdmVkRnJvbSByZGY6cGFyc2VUeXBlPSJSZXNvdXJjZSI+CiAgICAgICAgICAgIDxzdFJlZjppbnN0YW5jZUlEPnhtcC5paWQ6Y2VlNTQzMmQtNTc0Mi00ZDk5LThmYWUtMTFkZDUyNGJhNzA4PC9zdFJlZjppbnN0YW5jZUlEPgogICAgICAgICAgICA8c3RSZWY6ZG9jdW1lbnRJRD54bXAuZGlkOkJGNDhCRjQ0NkUz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'; 

        elementoAssinatura = {
            absolutePosition: { x: 40, y: 700 }, // Fixa exatamente no rodapé da folha A4
            table: {
                widths: ['auto', '*', 'auto'], 
                body: [[
                    {
                        qr: urlValidacaoQR, 
                        fit: 55, 
                        alignment: 'left',
                        margin: [0, 5, 0, 0],
                        border: [false, true, false, false], 
                        borderColor: ['#999', '#999', '#999', '#999']
                    },
                    {
                        stack: [
                            { text: `Assinado digitalmente por ${nomeFormatado} - CRM ${limparCRM(medicoCrm) || 'N/A'}`, bold: true, fontSize: 9, color: '#000', margin: [0, 0, 0, 2] },
                            { text: 'Assinatura eletrônica em conformidade com a MP 2.200-2/2001 (ICP-Brasil).', fontSize: 7.5, color: '#555', margin: [0, 0, 0, 2] },  
                            { text: [
                                '*Para validar a assinatura deste documento, acesse ',
                                { text: 'https://validar.iti.gov.br', bold: true },
                                ' ou aponte a câmera para o QR Code ao lado.'
                            ], fontSize: 7.5, color: '#555' }
                        ],
                        alignment: 'left',
                        margin: [10, 8, 0, 0],
                        border: [false, true, false, false], 
                        borderColor: ['#999', '#999', '#999', '#999']
                    },
                    {
                        image: logoIcpBase64,
                        width: 40, // Reduzido drasticamente para virar um pequeno selo quadrado
                        alignment: 'right',
                        margin: [0, 10, 0, 0],
                        border: [false, true, false, false], 
                        borderColor: ['#999', '#999', '#999', '#999']
                    }
                ]]
            },
            layout: { defaultBorder: false }
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

    // Insere o último parágrafo
    if (ultimoParagrafo) {
        content.push(ultimoParagrafo);
    }
    
    // ❌ APAGUE ESTA LINHA ABAIXO COMPLETAMENTE ❌
    // content.push({ text: '', margin: [0, 80] });

    // Insere a assinatura fixada no rodapé da página atual
    content.push(elementoAssinatura);


    // ==========================================================
    // 2. DOCUMENTAÇÃO FOTOGRÁFICA (VAI PARA A ÚLTIMA PÁGINA)
    // ==========================================================
    const imagensValidas = (imagensBase64 || []).filter(img => typeof img === 'string' && img.startsWith('data:image/'));

    if (imagensValidas.length > 0) {
        // pageBreak: 'before' força as imagens a começarem em uma folha nova limpa!
        content.push({ text: 'DOCUMENTAÇÃO FOTOGRÁFICA', style: 'sectionHeader', margin: [0, 20, 0, 10], pageBreak: 'before' });
        
        // Com altura de 160 + margem de 10 = 170. Como nosso espaço livre na página é 612 (842 - 170 topo - 60 base), 
        // 3 linhas de imagens (170 * 3 = 510) cabem com folga e perfeição em uma única folha A4.
        const IMG_WIDTH = 230; 
        const IMG_HEIGHT = 160; 

        for (let i = 0; i < imagensValidas.length; i += 2) {
            const img1 = imagensValidas[i];
            const img2 = imagensValidas[i + 1];
            const columns = [];
            
            columns.push({
                image: img1, width: IMG_WIDTH, height: IMG_HEIGHT, fit: [IMG_WIDTH, IMG_HEIGHT], alignment: 'center', margin: [0, 0, 0, 10]
            });

            if (img2) {
                columns.push({
                    image: img2, width: IMG_WIDTH, height: IMG_HEIGHT, fit: [IMG_WIDTH, IMG_HEIGHT], alignment: 'center', margin: [0, 0, 0, 10]
                });
            } else {
                columns.push({ text: '', width: IMG_WIDTH }); // Espaço vazio para manter o alinhamento
            }

            content.push({ columns: columns, columnGap: 10, unbreakable: false });
        }
    }

    // ==========================================================
    // 3. GERAÇÃO DO ARQUIVO PDF
    // ==========================================================
    
    // 3.1 Busca a imagem JPEG do backend
    let mascaraBase64 = null;
    if (comTimbre) {
        mascaraBase64 = await getMascaraBase64();
    }

    const docDefinition = {
        pageSize: 'A4', 
        pageMargins: pageMargins,
        content: content,
        styles: {
          mainHeader: { fontSize: 14, bold: true, color: '#1C2E4A' },
          sectionHeader: { fontSize: 11, bold: true, color: '#2E7D32', uppercase: true },
          tableHeader: { fontSize: 9, bold: true, color: '#555' },
          footerText: { fontSize: 9, color: '#555', lineHeight: 1.1 } 
        },
        defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 } 
    };

    // 3.2 Se a imagem carregou com sucesso, aplica ela ocupando a folha toda
    if (mascaraBase64) {
        docDefinition.background = function () {
            return {
                image: mascaraBase64,
                width: 595.28,  // Largura exata de um A4 em pontos no pdfmake
                height: 841.89  // Altura exata de um A4 em pontos no pdfmake
            };
        };
    }
    
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);

    if (retornarBlob) {
        return new Promise((resolve) => {
            pdfDocGenerator.getBlob((blob) => resolve(blob));
        });
    }

    // FLUXO DE VISUALIZAÇÃO/DOWNLOAD LOCAL 
    const formatarNome = (texto) => {
        if (!texto) return '';
        return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    };
    
    const idStr = pacienteId || "S-ID";
    const nomeLimpo = formatarNome(pacienteNome) || "Paciente";
    const tipoLimpo = formatarNome(tituloExame) || "Exame";
    const nomeArquivo = `${idStr}_${nomeLimpo}_${tipoLimpo}.pdf`;

    const forcarDownloadEAbrir = (blobUrl) => {
        window.open(blobUrl, '_blank');
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = nomeArquivo; 
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (usaAssinaturaDigital) {
        pdfDocGenerator.getBlob(async (blob) => {
            try {
                const pdfAssinadoBlob = await assinarPdfRemotamente(blob);
                const fileURL = URL.createObjectURL(pdfAssinadoBlob);
                
                forcarDownloadEAbrir(fileURL);
                setTimeout(() => URL.revokeObjectURL(fileURL), 60000);
            } catch (error) {
                console.error("Erro na assinatura:", error);
                alert("Não foi possível assinar digitalmente. Verifique se seu certificado está válido.");
            }
        });
    } else {
        pdfDocGenerator.getBlob((blob) => {
            const fileURL = URL.createObjectURL(blob);
            forcarDownloadEAbrir(fileURL);
            setTimeout(() => URL.revokeObjectURL(fileURL), 60000);
        });
    }
};