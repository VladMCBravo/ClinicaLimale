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
    const pageMargins = [40, 170, 40, 100];

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

    // Insere o último parágrafo colado com a assinatura para não separar páginas
    content.push({
        stack: [
            ultimoParagrafo ? ultimoParagrafo : {},
            elementoAssinatura
        ],
        unbreakable: true 
    });


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