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
    medicoEspecialidades = [], 
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
    const formatarLinhaNormal = (line) => {
        // Atualizado com as frases exatas da sua imagem para diminuir a fonte dos avisos
        const identificadoresRodape = [
            'Diretriz', 'Obs', 'Liberado por:', 'Nota:', 'Atenção:', 
            'A ultrassonografia obstétrica', 'Favor trazer este', 'A imagem diagnóstica'
        ];
        
        if (identificadoresRodape.some(id => line.startsWith(id))) {
            return { 
                text: line, 
                fontSize: 8,       
                color: '#555',     
                alignment: 'justify', 
                lineHeight: 1.1,   
                margin: [0, 0, 0, 3] 
            };
        }
        return { text: line, fontSize: 10, alignment: 'justify', lineHeight: 1.3, margin: [0, 0, 0, 6] };
    };

    const processarTexto = (textoRaw) => {
        if (!textoRaw) return [];
        const content = [];
        const linhas = textoRaw.split('\n');
        
        // Adicionei os títulos da sua imagem aqui também
        const titulosConhecidos = [
            'CONCLUSÃO', 'BIOMETRIA FETAL', 'MORFOLOGIA FETAL', 
            'RASTREAMENTO MORFOLÓGICO', 'ESTUDO DOPPLERFLUXOMÉTRICO',
            'ANÁLISE MORFOLÓGICA', 'ESTUDO TRIDIMENSIONAL', 'AVALIAÇÃO DO COLO UTERINO',
            'IMPRESSÃO DIAGNÓSTICA', 'ÍNDICES E ESTIMATIVAS', 'OPINIÃO'
        ];

        for (let i = 0; i < linhas.length; i++) {
            const line = linhas[i];
            
            if (line.trim() === '') {
                content.push({ text: '', margin: [0, 2] });
                continue;
            }
            
            const isHeader = line.includes('---') || titulosConhecidos.some(t => line.toUpperCase().includes(t));
            
            if (isHeader) {
                // Se for título, procura a próxima linha preenchida para "amarrar" junto
                let nextLine = null;
                let skipIndex = i;
                
                for (let j = i + 1; j < linhas.length; j++) {
                    if (linhas[j].trim() !== '') {
                        nextLine = linhas[j];
                        skipIndex = j;
                        break;
                    }
                }
                
                const headerElement = { text: line, style: 'sectionHeader', margin: [0, 10, 0, 2] };
                
                if (nextLine) {
                    // Agrupa o título e a primeira linha para NUNCA quebrarem de página
                    content.push({
                        stack: [
                            headerElement,
                            formatarLinhaNormal(nextLine)
                        ],
                        unbreakable: true // <-- A mágica acontece aqui!
                    });
                    i = skipIndex; // Pula o laço para a linha que já inserimos
                } else {
                    content.push(headerElement);
                }
            } else {
                content.push(formatarLinhaNormal(line));
            }
        }
        return content;
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
        const logoIcpBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMwAAAD3CAMAAABmQUuuAAAAk1BMVEX///8QlUcAjzgAkDsAkkEAkT4Aiy/g8ecAjTUFk0SSx6R/vZQ5oF/1+/jZ7OAsnVau173p9u6gz7Gy179os4HF4c5vt4darXa528WLxaAAiizO59dfr3rv9/Kn07fU6txDpmh2u46Yy6p8vZIunVcbmU4/omJOqW9Qr3YAgxcomE/E5tKGw5sAhiJFrHBsvY0AgQ2RT90wAAAThUlEQVR4nO1d6bqqOBaFDJioqCAoKioOSNUpb3e//9M1oEISEgaBI35frV/3ehiySLKzs6doWmcwR95hcp9SXdfpdDKZeMuR1d3TG8L2HSkuNe7d78YR2BKAUMIlZoMQIsQgaH12KxlZxwpYPPZmdYMucVMkwNeqG2ebEBoQ6TIgQEB4P5bev/ljlAPwwMi3RxVtmmBpc+i09C7rHAFIpXdmT4BkfdirHzGGpbfLP9F6vOuajHWnQN4lwttJuOyQzINP4HZJxhrrtdtBia/6lG+RSfmslXQak3HnoHx88cDQ65ZM0uEq6dSUjEOaUElATh2T0XUYyoVlMzJ7JL+8nM25azI6vkkFdSMyO6Npt6QwZH3TioyOoIxNEzJH/BYXed+0I6ND2QdqQGZXsbKUYFsUQC3J6NtDGzJH/W0uOg0Ly2dbMjQsDrTaZKxrnXVSBRx1TUYHxbFbm8yq3csNcaC1JiPpmrpkDkbLV4sPbE1G0jU1yVjb1q/edE0GFYZuTTL3qlcne5lSAUF1Xga0J6NTUQ+oR2Zf2jEUA/wTraMfHZRo04CXpR2QKYyzemT8Mi0G/kzcWTIZTeu4iBT7tfiRP1zXKMnQJ6rJUFGpqUXGIuonInDhGnkMVKoo4bpGRYZegwdwAgggUWvpWNh61iJzVg8JfBN3x6ar+KooqEMGvPZz6c5/NJu5i6mKDhG2F7XI/Ci/DYwkCt8xlF8P2Q9ZSYbBMpSPXWA3J+MCFZfiwp5iJh+WkJXOTchoe7n6gQVtsw4ZRzX9qS7lopLkdP4uGW0kHbrIaUzGVI6yrdJWcpXewuo0zchonqyz6Q8/yGuQmak6Bt5VXLSldKCx46whGU02D+m8MZmDaspgtZFxJF1lkf8+GUcya94g4yuWQVhmwg1k44ze3icj+6TNyZhTxZQBZfZXr6BlC0bfpmR2ErW9OZmR4q1oXcIlHuOi+Try/fXkfTJuJ2Q8xZQBi1IymilA+HNTMjItpDmZs4KMqBg1RFMysknYnMxGpZi1cyo1JLOXSaHmZBT7Mjov8Vd0T2YtI9NcA1jJr6iY/x2TWUuvFlftajKy1UovKnl9ktk78nnbXGtWkIGCgaIzMqILxLTOPwqFigj2q0oyplxnLFPMWpHBd9eLYSc4bHzfn+pKszBqutM0579LRsepPxY+UGrzwcL8b0FGGK+dkakPcZS9TwaUOEp/h0zRhDy8YVYbxRZ8LxlaVEGqySg2zR8nU5DhdchIt1mfJ1M0m9dSZ3530awLKNFz39YA+tLNauKPzDBUTeakUDTl9r8c+yd6IbOV7gzf3wJU7GfMrUFIEn0WpphGUbQ6bfLFqRUZQx7D8v5OU1SMBGSWs6eHIo1ig6gLMggqduwtbACzUjLyBxvtyVAwVb25hnVGoX9DaUhMBrnhLH/su2RguFHaHqvJ7BUqQLkEmEm90zRoRwYBfCrZrbexaJaNM/lmG+eL0xthjYSsz6UTtQYZlQQoM8/u5WEDJJ+5tcnEggMSwwDUP3QQcKr0AiC14VzhODTyMaIkI4wD5K+czcEd1bEF1fHPKCaN4HFlYSnWphq25jabvjqeM4WxSa4fldHHq2oyKotmV2SUPk2VQFM21K5xTc9kNJVTQwdS45mtChuAzMD/GJmDUvIAvyBhzLEqRoOzpnyMjFkS1ICEl4/WynAOzpryMTLKpSa5El4v7ktGW4eIKkOB6JUV5Z8jo5WtcBRDPTiNx5tojspyBFhZ9lEyi4pAQJpE7ZQHnAl7hg+S0YI24aYpBC37k2T2dQLAykBpvUjA3yCjLUpizupANHN9lIx2aWWBKKjYnyVjRm9kaGTPKwQhf5aMZilC2OqAFDZyHyajWRWyV40GiQ2/RUY74vf6hkga+HEymhm+MW+oIWvf58lopt9YQiNd6mMbAJm4EbVSNJnGzeWRXIMgo+2iBrmNCKtMdsMgE28IrqRe7yASKENSh0JGM91IlaPNPAIafolHug8ypy2RwZhX3HfcrI2S/qHYuE5KnetjIk13R1LRVxO7gxw1HmktHbwlAMb7mKdKnbgukmQEsg0n5Qn0mrZ0VlI4LeMLWsBa2uNJFM5DAgAg4Xw+n0zOB+9zxRo6QZnH71/8CzFiVxm7+wlIGlTWxuXPVIW0ysn94B0/Rsu6cQ1KxMqMbe814Ju2MKgKz6QvAK73D01tS2fbk5qqjmx7kRAKXMdOQSEef6R3LK4ZKRkuaUqMa65pdCHTT3ROT2R0pChb8ZVkdCzL+/tWMoq6Hl9KRsfl8SW9k6GdklnJX9kjGcpuDmBjMs8QaVlsNK2srNU19j4Lx2xIBl8Oadi6s7qBYsL1ADScJmQYW73pFcqZfC8ZSZzJN5MpxDOpyJiu7a9srnSeOdrZ9uZRkm9sH46W8t6Zl1+3q9Qz3iez5JzMT7fEMlrniBIJ400NgBAwsOOljbHce4CJkcqRVAwBYMBw5RVF+8x2sEHy6wwQcLXyLmsWVpdkHtLMNhhxuT1q2iorR4WNKNZrHUgkGS8UExLxVjRvSgrmUQoIEycRYdZu47Yis+EmDX44v2yWoXHUVsz/iWtOsNq2jgATpr73FZZRrGemoYjlCtqR4YOTngnwPJkRm9tOQ+2mDn9Ir8+8gbMfpVuRZuUkuEDPdmT4jnmVwODIgH9YLzS+VLoKybNvzFI3HHmMR16deZuMaVnLgP/IxkxChv7Fth7XcOI+HYJC6SfBMf9MNWxJRsePXC+wNXgFgBovpZkjwwUhor9CsenFQkGP0CaPrRdAAQjnkJMFW68LMgowk9JWzorwL37oUIBuQRCEfCekOdFsggEKFrHQ3S/ZxNJ49vVFhpIoXxCVZOj0h/s/vC7Su8wzN5HSokRMEYm8RWwW9XbWExl6Zc3oMjLx4EQUbriRz4RTc8F3yThjo9hxViTAnBqZG2J76ovM/MzY9ItkgH6aTNa6MwpCDCCJV/R4ScdMGIPJVvNIAjtnDDsmEcfycri9DTOIb1nYb4EMsdMuSGoQ7/ezmeueN+NY0WFdEzeGDJ2a2ox9BoqWCsWtJwEQL96vAEuRDLuqK+Cxwy8ho3G7CwTC1XIkIdQXmXg+T0cyMlUZTqbn84V3UzKCPk7j4Unn0VnwgLYlk5k+i2zQYxYIZCQZhnlj/jkEkAgLTUpGWhEDQQNEB0a3bkmGTp/VxeY6LpSXho6sZxTZBtbyFG4NiS6ZkrGUcd9ge81mW1t1JnuQOXIPV0HTSlO9bNm+gMPe3aymhCiKuz4q0ElrLz0vyDYBHelmT6x5NmnNCp5M0f60m+gEllapTZfSVclkxU9bcLdkNMGmgYtkJtz15jmQ7Mz4Hx4tNSclJYZx0AcZYaImG0ueDH/D7FqcJJjgK6eAvkzwh7k6kOBRLLtjMv/w8cxJ+cgSMm4hHg0RuFru+aSVzJ9guj4wFANya32CDLPQ74UaZJRg/xFZz6UUs84R0zvd0FYSKJVGQXdM5sJLgCIZtmihkDEAwizDjCsqUvD0zA4rSgjk1qN0D9AtGbHkbCkZvnIARXnmD99lUrfVaGmvdXbCgVFrMpBLI9tHQv+Xkjlyj4LM+ONMo5JC1K+vsfjJ35dsr9uSGWdELO+ui+aJpKKhkgxXG47LsPc4mYhG1n2T484oZFbeueTYXp35iZ6Yy0x5QCshw00ZxCym5o17EDlaWV2ZGCRgmpNXUgBWB1pziab5KFBYjwxTFXI/5QcrOPL2MJzvY/M0wrTmZn9bAD3ZhtUmo8OXarC7CYM1JsOvxfkJFXntgVSz6JMMSpXKmgJAh/4sWReDwiISkxGSUuF69qCd/5zoGr2SedjvlGTE9HQE59K8raTKo1CYAyVxd4ix1PVoanrAeOyP1YtmoUCFPIEoWcsKlSmFSfpIHuiNDH1lMqvJKBMfKBdqCxLxfyk1sD/tCn2RwdmCriajKuyKdY8tXvNwjUxLzNJwavZHBkHgZI0uIaMdJHsURByLo/moQ7/3VeXDEZk829gpGZr65giNLoyVoYyMtvgROgeRKBmeI3aOPEscxPs4yX4GkyiT1BIyxzIyh7/5A7kgGxMR+r6/Eb2mZ+6OP4Kjcn/XDfh03sWrO1k/W+YwJ4H9eak6iwgk5s/n5RhCYOgOq90Q7lUpGe7tlCezF49KqwzTFE5bK1xjeuP7w3t8Hy8yBZl7T/4B9p69ua8el582Y3vHP45/VfGnX4/m+Rf/QoF9RQms74A1c+37OsIPAYNxFF1sd/aFeQrm7h7F0hGwlgVKMSAQVVTiGRpmZ+cKlNlK8ZIRjb+Fj+vDcvNwwgc7XyDWzXvNhDhUev7jEGCeq475ZJUhIxhy79hGeeROoXe20VDnzmzavP4CAosBhDcWMamZPCqAzIfXOaNIPsJokpz4gELEIdyyWHP3kJ3fg4EBpqvNwX1gM4mw1DlJ/KENNfH4AkrA6SAeH23uFpe5URiO8Fp66PAHwJp3KCDThUqxdNeG2I2oUJT7w3C3OZUfu3TgmAsqLkfS01g/iDF4jq9rjeSY8VUQGB/IqClFeuQW1EtCRljYwuHA25YFqDvGKBbEqH7m4szhZQYZV9/zi/D+rKuS3TkseEu40bKedsdoqjgKSy0YVt80hclHvbQ97ODTOHMmUjS01bMhuKJ64nmsXweOjeLoxu/BgR1pAxPQzcGxAV9oWOPAOnbQr2dwdg3WHSueMP198Bk2xTJ5XwaTCSNBpbWdvgEWo0OLpw5/HxiRRqejPvEb6zIT0k+NHrGFj2ImzqWRit8M8nMZegNF2BDPNusQk2bG3Q5AerQ8qM4M6A818nXeRdtiwW+g7dl3apiFCgj9w1BahXbnbKu4sN9Yx93f7xpK5YuaezX+ZKHMq63xhvOlTeXjdyE7S2v2ny1mjvc4YR3Q/za1iM/o28WC3wbVZeuN6SCWDHxnm+VmGSWwBUAlWPMwpbJvfscsmfcqcprWE7MWOCyqcGBljbBXP58S3Gh+Ws8Koyj5bTVQpZGTNYDND1saaWU5qtPAScKKD74TJj6xpNqcMdBtMBcDypz/MtIzfxhFiXDY5A4l9Ar4HBzGnB0lmx8HZ7XOhqCx49xozidrppbjxPYNZgT0DsjJkCEb9dhjMChTpCw/vcg4fg0Zk13UnnnVo93uaOP8R9/PjzKC3m63G6gISI6jZ9jAIP7FTQJz2ZIVXNmOJACXDrZ7PNatnBhT11nZIEETeZV6o4bilMcBwGWz+shF22TFo/iDstA0qyg1XDLamFVtCfOH2Za1G+gfa2AjcNEY7B/2rII00LVSxAgoyHwMihrKkqpuhSvZEjyU+f3I1U0vOVSyY8wCAsBKFJn7EzDIjV8WjpEBdK6Q74YxcFGovYo5hpTLykAQX53n3/oNwjps02gKIZpol1ZCQtzOK72Sgp98sT8y0ozSkXbFUsHMyOZevWHm65Q6umW/2SuViOZHvJjBsxfywldcMliS0rvZQliydY83ftse9zRHpsQUcbIBxMio1ybxyOR4kuepHFdGOwNJNqd5vt/ZNDBA2ABHdL/fexxlMy4CB96eNpQLl/yUfkuXqzhGUsss6xXCfvZ9cvlGDrsjYwMnvUrohWBpQ2kYkrnmi6YkGfQHISgMOhZnD2YO9c53AKnWzIi7XsmcC1HUlJy1kZgcSNFoXLDKw+DE1eN6CYoDayQWNmc0jHrbnElPFoK34lmPVFb1kbssl1E2S1sgo1PpgfUl2Nc9R8BXBOxKfy0HZJwbEbPl/ztu+32b93/ZicwS2Hpq10JCKX50c3isxvNWp9hx4LyoR5AcTAKojleHJDxzZCcjjya/kUb6jrlSVcPhSkena3J3pk/KV+LYLZbLxWLOnHJ9ozRYJj82MjiX1SkqA5Jn60j4Ykl/ivmhKaY0t9jE07C5k81703cGop1kAlE9KMx7eFoikbfk/CDTXbCG8yml4a7h1DfD94aOcTIlnYrBsZDBnVR4Pf7wFIkkIsTc/IEMmTWihCqP/JbjTc/Z9vFlhcRumFQxNh2usMuj4q0VcQvMWtqW/UX/XzZnLn+H56br5fSdPA+aRasf2QEEg3RLYDJKDApfV67ztQRdla20pP+sCfsd3znSmTJCeYVb8jKF7zNdEjPFu+1Xyj3F/WS87N/xmr0qJT5xepTeosyBu6N5+lzKqNQxFo9Cwr0FhbLVWWq4ix5rq7giH6/xikfmXBMdI1nuBNV9lFwIYMNZXRdsoVLdrvQWxfBctzhGTG+xcIVpsFssloVRH0vfhddXVhVjxYbfHj63ZPdJgzVO18OMUT3AwLJPmsJkipGVH/I4fJhsjc3tl4fQs1pij4FGvwHO/vDt0aac9v7lwaYBu1qCnpbk38GI20B9d5KGxxl8UDBY72c1zBNXK5d+89Lv8tYFCr83CWDm8JsxCnsMmu4X5srA+nf0S9U8Pvpi9VYUDrVfRjCy1fuekbculKiA18HO/TFAAE7HO4mz92gHknqYZDVcR3tqSKcQ/KzPyyQSKIXnHcbRHMpsxPAyXC7uS0xRxEWyQigN9MXGkPWxoJGV1VgPdrpoQmnIKjDRw4PEuL4XCMHL8GrosDBrDzIM+/N3doRxPVs+xcAf6jqZY3Mtlskpji9jeho+lRjm0idEcfBg2ifAAL7qaKUBwvLOAZAdUYKAAYOzWPZo+DC9czRnjyQJw3kwWQx6cP0fie6KLMLGuLkAAAAASUVORK5CYII='; 
        // --- NOVA LINHA: Captura a data e hora atual do computador do médico ---
        const agora = new Date();
        const dataHoraFormatada = `${agora.toLocaleDateString('pt-BR')} - ${agora.toLocaleTimeString('pt-BR')} (GMT-3)`;

        let textoEspecialidades = '';
        if (medicoEspecialidades && medicoEspecialidades.length > 0) {
            textoEspecialidades = medicoEspecialidades
                .map(esp => `${esp.especialidade_nome}${esp.rqe ? ` - RQE ${esp.rqe}` : ''}`)
                .join(' | ');
        }

        elementoAssinatura = {
            
            table: {
                widths: ['auto', '*', 'auto'], 
                body: [[
                    // Coluna 1: Logo ICP-Brasil (Esquerda)
                    {
                        image: logoIcpBase64,
                        width: 55, // Aumentado para igualar ao texto e ao QR Code
                        alignment: 'left',
                        margin: [0, 5, 0, 0],
                        border: [false, true, false, false], 
                        borderColor: ['#999', '#999', '#999', '#999']
                    },
                    // Coluna 2: Textos (Centro)
                    {
                        stack: [
                            // Adicionado Dr(a).
                            { text: `Assinado digitalmente por Dr(a). ${nomeFormatado} - CRM ${limparCRM(medicoCrm) || 'N/A'}`, bold: true, fontSize: 9, color: '#000', margin: [0, 0, 0, 2] },

                            ...(textoEspecialidades ? [{ text: textoEspecialidades, fontSize: 8, color: '#1C2E4A', bold: true, margin: [0, 0, 0, 2] }] : []),
                            
                            // Adicionado Data e Hora
                            { text: `Data e hora: ${dataHoraFormatada}`, fontSize: 8, color: '#333', margin: [0, 0, 0, 2] },
                            
                            { text: 'Assinatura eletrônica em conformidade com a MP 2.200-2/2001 (ICP-Brasil).', fontSize: 7.5, color: '#555', margin: [0, 0, 0, 2] },  
                            { text: [
                                '*Para validar a assinatura deste documento, acesse ',
                                { text: 'https://validar.iti.gov.br', bold: true, link: 'https://validar.iti.gov.br', decoration: 'underline', color: '#0056b3' },
                                ' ou aponte a câmera para o QR Code ao lado.'
                            ], fontSize: 7.5, color: '#555' }
                        ],
                        alignment: 'left',
                        margin: [10, 8, 10, 0],
                        border: [false, true, false, false], 
                        borderColor: ['#999', '#999', '#999', '#999']
                    },
                    // Coluna 3: QR Code (Direita)
                    {
                        qr: urlValidacaoQR, 
                        fit: 55, 
                        alignment: 'right',
                        margin: [0, 5, 0, 0],
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
        
    // === ASSINATURA FLUÍDA ===
    content.push({
        stack: [ elementoAssinatura ],
        margin: [0, 40, 0, 0], // Dá um salto de espaço após o fim do texto do laudo
        unbreakable: true      // Garante que a assinatura não quebre pela metade mudando de folha
    });
    // =========================
        
    
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
        
        // MARGENS CORRIGIDAS: [Esquerda, Topo, Direita, Base]
        // 130 no topo afasta o texto da logo da Limalé
        // 80 na base é espaço suficiente para não encostar no site/email da Limalé no fundo
        pageMargins: [40, 130, 40, 80],
        
        //footer: function(currentPage, pageCount) {
        //    return {
        //        // 2. Aumente o último valor de 50 para 90 para empurrar a assinatura para cima
        //        margin: [40, 0, 40, 90], 
        //        ...elementoAssinatura
        //    };
      //},
        
        // --- ADICIONE ESTE BLOCO PARA COMPRIMIR O TEXTO ---
        defaultStyle: {
            lineHeight: 1.1, // O padrão costuma ser 1.2 ou mais. Isso deixa as linhas sutilmente mais juntas.
            // fontSize: 11, // (Opcional) Se mesmo assim não couber, você pode descomentar esta linha e reduzir a fonte base ligeiramente
        },
        // ---------------------------------------------------

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