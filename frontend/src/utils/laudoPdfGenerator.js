// ARQUIVO COMPLETO: src/utils/laudoPdfGenerator.js

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { assinarPdfRemotamente } from "../api/pdfService"; 

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

const getMascaraBase64 = async () => {
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
        return null; 
    }
};

export const gerarPDFLaudo = async ({
    pacienteId, pacienteNome, medicoNome, medicoCrm, medicoEspecialidades = [], 
    tituloExame, textoLaudo, dadosEstruturados, imagensBase64, dataExame = null, 
    comTimbre = true, usaAssinaturaDigital = false, retornarBlob = false 
}) => {

    const formatarLinhaNormal = (line, isRodape = false) => {
        if (isRodape) {
            return { text: line, fontSize: 8, color: '#555', alignment: 'justify', lineHeight: 1.1, margin: [0, 0, 0, 2] };
        }
        return { text: line, fontSize: 10, alignment: 'justify', lineHeight: 1.15, margin: [0, 0, 0, 4] };
    };

    // =========================================================
    // SUPER PROCESSADOR DE TEXTO (COM TABELAS ALINHADAS E LINHAS)
    // =========================================================
    const processarTexto = (textoRaw) => {
        if (!textoRaw) return [];
        const content = [];
        const linhas = textoRaw.split('\n');
        
        const titulosConhecidos = [
            'CONCLUSÃO', 'RASTREAMENTO MORFOLÓGICO', 'ESTUDO DOPPLERFLUXOMÉTRICO',
            'ANÁLISE MORFOLÓGICA', 'ANÁLISE FETAL', 'ESTUDO TRIDIMENSIONAL', 
            'AVALIAÇÃO DO COLO UTERINO', 'IMPRESSÃO DIAGNÓSTICA', 'OPINIÃO', 
            'AVALIAÇÃO COMPLEMENTAR', 'RASTREAMENTO DE ANEUPLOIDIAS', 'ANEXOS'
        ];
        const titulosFinais = ['CONCLUSÃO', 'IMPRESSÃO DIAGNÓSTICA', 'OPINIÃO'];
        const identificadoresRodape = ['Diretriz', 'Obs', 'Liberado por:', 'Nota:', 'Atenção:', 'A ultrassonografia obstétrica', 'Favor trazer este', 'A imagem diagnóstica'];

        let currentSection = null;
        let isRodapeSection = false; 
        let inFinalSection = false; 

        let mode = 'NORMAL'; 
        let biometriaRows = [];
        let indicesRows = [];

        // Estilo das Tabelas com Linhas (Bordas Horizontais)
        const customTableLayout = {
            hLineWidth: function (i, node) { return 0.5; }, // Espessura da linha horizontal
            vLineWidth: function (i, node) { return 0; },   // Sem linhas verticais
            hLineColor: function (i, node) { return '#E0E0E0'; }, // Cor cinza clara
            paddingLeft: function (i, node) { return 0; },
            paddingRight: function (i, node) { return 0; },
            paddingTop: function (i, node) { return 4; },
            paddingBottom: function (i, node) { return 4; }
        };

        const flushSideBySide = () => {
            if (biometriaRows.length > 0 || indicesRows.length > 0) {
                const bioBody = biometriaRows.map(row => {
                    if (row.isNote || row.colSpan) return [{ text: row.label, fontSize: 9, color: '#555', colSpan: 2, border: [false, true, false, true] }, {}];
                    return [
                        { text: row.label, fontSize: 9, color: '#333' },
                        { text: row.value, fontSize: 9, bold: true, alignment: 'right' }
                    ];
                });

                const indBody = indicesRows.map(row => {
                    if (row.isNote || row.colSpan) return [{ text: row.label, fontSize: 9, color: '#555', colSpan: 2, border: [false, true, false, true] }, {}];
                    return [
                        { text: row.label, fontSize: 9, color: '#333' },
                        { text: row.value, fontSize: 9, bold: true, alignment: 'right' }
                    ];
                });

                const leftCol = biometriaRows.length > 0 ? [
                    { text: 'BIOMETRIA FETAL', style: 'sectionHeader', margin: [0, 0, 0, 6] },
                    { table: { widths: ['*', 'auto'], body: bioBody }, layout: customTableLayout }
                ] : [];

                const rightCol = indicesRows.length > 0 ? [
                    { text: 'ÍNDICES E ESTIMATIVAS', style: 'sectionHeader', margin: [0, 0, 0, 6] },
                    { table: { widths: ['*', 'auto'], body: indBody }, layout: customTableLayout }
                ] : [];

                if (leftCol.length > 0 && rightCol.length > 0) {
                    content.push({
                        columns: [ { width: '48%', stack: leftCol }, { width: '48%', stack: rightCol } ],
                        columnGap: 20, // Espaçamento claro entre as duas tabelas
                        margin: [0, 5, 0, 10], unbreakable: true
                    });
                } else if (leftCol.length > 0) {
                    content.push({ stack: leftCol, margin: [0, 5, 0, 10], unbreakable: true, width: '60%' });
                } else if (rightCol.length > 0) {
                    content.push({ stack: rightCol, margin: [0, 5, 0, 10], unbreakable: true, width: '60%' });
                }

                biometriaRows = []; indicesRows = []; mode = 'NORMAL';
            }
        };

        for (let i = 0; i < linhas.length; i++) {
            let line = linhas[i].trim();
            if (line === '') {
                if (mode === 'NORMAL') {
                    if (currentSection) currentSection.stack.push({ text: '', margin: [0, 2] });
                    else content.push({ text: '', margin: [0, 2] });
                }
                continue;
            }

            const cleanLine = line.toUpperCase().replace(/^[-*\s]+/, '').replace(/:/g, '').trim();
            
            if (cleanLine === 'BIOMETRIA FETAL') {
                flushSideBySide();
                if (currentSection) { content.push(currentSection); currentSection = null; }
                mode = 'BIOMETRIA'; continue;
            }
            if (cleanLine === 'ÍNDICES E ESTIMATIVAS') {
                mode = 'INDICES'; continue; 
            }

            const isHeader = line.includes('---') || titulosConhecidos.some(t => cleanLine.startsWith(t));
            const isFinalHeader = titulosFinais.some(t => cleanLine.startsWith(t));
            
            if (!isRodapeSection && identificadoresRodape.some(id => line.startsWith(id))) isRodapeSection = true;

            if (mode !== 'NORMAL' && (isHeader || isFinalHeader || isRodapeSection)) {
                flushSideBySide();
            }

            if (mode === 'BIOMETRIA') {
                if (line.toUpperCase().startsWith('NOTA:')) {
                    biometriaRows.push({ label: line, value: '', isNote: true });
                } else if (line.includes('...')) {
                    const parts = line.split(/\.{2,}/); 
                    biometriaRows.push({ label: parts[0].trim(), value: parts[1] ? parts[1].trim() : '' });
                } else {
                    const match = line.match(/^(.*?)\s+([\d,]+\s*[a-zA-Z%]+.*)$/);
                    if (match) biometriaRows.push({ label: match[1].trim(), value: match[2].trim() });
                    else biometriaRows.push({ label: line, value: '', colSpan: true });
                }
                continue;
            }

            if (mode === 'INDICES') {
                if (line.toUpperCase().startsWith('NOTA:')) {
                    indicesRows.push({ label: line, value: '', isNote: true });
                } else {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex > -1) {
                        const label = line.substring(0, colonIndex).replace(/^[-*\s]+/, '').trim();
                        const value = line.substring(colonIndex + 1).trim();
                        indicesRows.push({ label: label, value: value });
                    } else {
                        const cleanVal = line.replace(/^[-*\s]+/, '').trim();
                        indicesRows.push({ label: cleanVal, value: '', colSpan: true });
                    }
                }
                continue;
            }

            if (isHeader) {
                if (currentSection) content.push(currentSection);
                if (isFinalHeader) inFinalSection = true;

                currentSection = {
                    stack: [ { text: line, style: 'sectionHeader', margin: [0, 8, 0, 2] } ],
                    unbreakable: true 
                };
            } else if (isRodapeSection || inFinalSection) {
                if (!currentSection) currentSection = { stack: [], unbreakable: true };
                currentSection.stack.push(formatarLinhaNormal(line, isRodapeSection));
            } else {
                if (currentSection) {
                    currentSection.stack.push(formatarLinhaNormal(line, false));
                    if (currentSection.stack.length > 25) currentSection.unbreakable = false;
                } else {
                    content.push(formatarLinhaNormal(line, false));
                }
            }
        }
        flushSideBySide(); 
        if (currentSection) content.push(currentSection);
        return content;
    };

    // ==========================================================
    // MONTAGEM DO CONTEÚDO DO PDF
    // ==========================================================
    const dataExameFormatada = dataExame ? dataExame.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');
    const content = [];
    
    // CABEÇALHO DINÂMICO
    const cabecalhoTexto = [];

    // 1. Paciente
    if (pacienteNome) {
        cabecalhoTexto.push({ text: 'Paciente: ', bold: true, color: '#555' }, pacienteNome.toUpperCase());
    }

    // 2. Idade
    const calcularIdadePDF = (nascimentoStr) => {
        if (!nascimentoStr) return '';
        if (nascimentoStr.includes('anos') || isNaN(Date.parse(nascimentoStr))) return nascimentoStr; 
        const nascimento = new Date(nascimentoStr + 'T12:00:00'); 
        const hoje = new Date();
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
        return `${idade} anos`;
    };

    const infoIdade = dadosEstruturados?.dataNascimento ? calcularIdadePDF(dadosEstruturados.dataNascimento) : dadosEstruturados?.idade;
    if (infoIdade && infoIdade.trim() !== '') {
        // Se já tem paciente na linha, dá um espaçamento, senão fica no começo
        cabecalhoTexto.push({ text: cabecalhoTexto.length > 0 ? '    Idade: ' : 'Idade: ', bold: true, color: '#555' }, infoIdade);
    }

    // 3. Sexo
    if (dadosEstruturados?.sexo && dadosEstruturados.sexo.trim() !== '') {
        cabecalhoTexto.push({ text: cabecalhoTexto.length > 0 ? '    Sexo: ' : 'Sexo: ', bold: true, color: '#555' }, dadosEstruturados.sexo);
    }

    // Quebra de linha para separar o paciente do exame
    if (cabecalhoTexto.length > 0) {
        cabecalhoTexto.push('\n');
    }

    // 4. Médico Solicitante
    let temSolicitante = false;
    if (dadosEstruturados?.medicoSolicitante && dadosEstruturados.medicoSolicitante.trim() !== '') {
        cabecalhoTexto.push({ text: 'Médico solicitante: ', bold: true, color: '#555' }, dadosEstruturados.medicoSolicitante.toUpperCase());
        temSolicitante = true;
    }

    // 5. Data (Sempre exibida)
    cabecalhoTexto.push({ text: temSolicitante ? '    Data: ' : 'Data: ', bold: true, color: '#555' }, dataExameFormatada);

    // Insere o cabeçalho dinâmico no documento
    content.push({
        text: cabecalhoTexto,
        fontSize: 10, 
        lineHeight: 1.3, 
        margin: [0, 0, 0, 15] 
    });

    let textoParaImprimir = textoLaudo || '';
    let linhasTexto = textoParaImprimir.split('\n');
    let tituloEspecificoExtraido = null;
    
    for (let i = 0; i < Math.min(3, linhasTexto.length); i++) {
        const linha = linhasTexto[i].trim();
        if (linha !== '') {
            const palavrasChave = ['ULTRASSONOGRAFIA', 'USG', 'ECOCARDIOGRAMA', 'ELETROCARDIOGRAMA', 'DOPPLER', 'RELATÓRIO', 'EXAME'];
            if (linha === linha.toUpperCase() && linha.length > 5 && palavrasChave.some(p => linha.includes(p))) {
                tituloEspecificoExtraido = linha;
                linhasTexto.splice(i, 1); 
                textoParaImprimir = linhasTexto.join('\n');
            }
            break; 
        }
    }

    const tituloFinal = tituloEspecificoExtraido || tituloExame || 'RELATÓRIO MÉDICO';
    content.push({ text: tituloFinal, style: 'mainHeader', alignment: 'center', margin: [0, 0, 0, 5] });

    if (dadosEstruturados?.riscoT21Basal || dadosEstruturados?.feto1?.riscoT21Basal) {
        textoParaImprimir = textoParaImprimir.replace(/CÁLCULO DE RISCO \(1:X\)[\s\S]*?Corrigido 1\/.*?\n/g, '');
    }

    const paragrafosTexto = processarTexto(textoParaImprimir);
    
    // Captura o Bloco Final (Impressão Diagnóstica)
    let blocoFinal = null;
    if (paragrafosTexto.length > 0) {
        blocoFinal = paragrafosTexto.pop(); 
    }
    content.push(...paragrafosTexto);

    // ==========================================================
    // 1. PREPARAÇÃO DA ASSINATURA 
    // ==========================================================
    const primeiroNome = medicoNome ? medicoNome.trim().split(' ')[0].toLowerCase() : '';
    const prefixoMedico = primeiroNome.endsWith('a') ? 'Dra.' : 'Dr.';
    const nomeFormatado = medicoNome ? `${prefixoMedico} ${medicoNome}` : 'Médico Examinador';
    const limparCRM = (crm) => crm ? crm.replace(/[^\w\s]/gi, '') : '';

    let elementoAssinatura = null;

    if (usaAssinaturaDigital) {
        const logoIcpBase64 = 'data:image/png;base64,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'; 
        const agora = new Date();
        const textoEspecialidades = medicoEspecialidades && medicoEspecialidades.length > 0 
            ? medicoEspecialidades.map(esp => `${esp.especialidade_nome}${esp.rqe ? ` - RQE ${esp.rqe}` : ''}`).join(' | ') 
            : '';

        // Tabela com as Larguras Fixas [55, *, 55] para evitar esmagamento do QR Code
        elementoAssinatura = {
            table: {
                widths: [55, '*', 55], 
                body: [[
                    { image: logoIcpBase64, width: 55, margin: [0, 5, 0, 0], border: [false, true, false, false], borderColor: ['#999', '#999', '#999', '#999'] },
                    {
                        stack: [
                            { text: `Assinado digitalmente por ${nomeFormatado} - CRM ${limparCRM(medicoCrm) || 'N/A'}`, bold: true, fontSize: 9, margin: [0, 0, 0, 2] },
                            ...(textoEspecialidades ? [{ text: textoEspecialidades, fontSize: 8, color: '#1C2E4A', bold: true, margin: [0, 0, 0, 2] }] : []),
                            { text: `Data e hora: ${agora.toLocaleDateString('pt-BR')} - ${agora.toLocaleTimeString('pt-BR')} (GMT-3)`, fontSize: 8, color: '#333', margin: [0, 0, 0, 2] },
                            { text: 'Assinatura eletrônica em conformidade com a MP 2.200-2/2001 (ICP-Brasil).', fontSize: 7.5, color: '#555', margin: [0, 0, 0, 2] },  
                            { text: ['*Para validar a assinatura deste documento, acesse ', { text: 'https://validar.iti.gov.br', bold: true, link: 'https://validar.iti.gov.br', decoration: 'underline', color: '#0056b3' }, ' ou aponte a câmera.'], fontSize: 7.5, color: '#555' }
                        ],
                        alignment: 'left', margin: [10, 8, 10, 0], border: [false, true, false, false], borderColor: ['#999', '#999', '#999', '#999']
                    },
                    { qr: 'https://validar.iti.gov.br', fit: 55, alignment: 'right', margin: [0, 5, 0, 0], border: [false, true, false, false], borderColor: ['#999', '#999', '#999', '#999'] }
                ]]
            },
            layout: { defaultBorder: false }
        };
    } else {
        elementoAssinatura = {
            stack: [
                { text: '_______________________________', alignment: 'center', color: '#999', margin: [0, 15, 0, 5] },
                { text: nomeFormatado, alignment: 'center', bold: true, fontSize: 10, margin: [0, 2] },
                { text: medicoCrm ? `CRM: ${limparCRM(medicoCrm)}` : '', alignment: 'center', fontSize: 9, color: '#555' }
            ]
        };
    }

    // ==========================================================
    // A MÁGICA FINAL: ASSINATURA MAGNETIZADA AO TEXTO FINAL
    // ==========================================================
    if (blocoFinal && blocoFinal.stack) {
        blocoFinal.stack.push({
            stack: [ elementoAssinatura ],
            margin: [0, 15, 0, 0] // Espaço entre o fim da impressão diagnóstica e a assinatura
        });
        content.push(blocoFinal); // Como o bloco final é "unbreakable", se a assinatura não couber, ele puxa a Impressão inteira pra folha 2!
    } else {
        if (blocoFinal) content.push(blocoFinal);
        content.push({
            stack: [ elementoAssinatura ],
            margin: [0, 15, 0, 0], 
            unbreakable: true
        });
    }
        
    // ==========================================================
    // 2. DOCUMENTAÇÃO FOTOGRÁFICA (VAI PARA A ÚLTIMA PÁGINA)
    // ==========================================================
    const imagensValidas = (imagensBase64 || []).filter(img => typeof img === 'string' && img.startsWith('data:image/'));

    if (imagensValidas.length > 0) {
        content.push({ text: 'DOCUMENTAÇÃO FOTOGRÁFICA', style: 'sectionHeader', margin: [0, 20, 0, 10], pageBreak: 'before' });
        const IMG_WIDTH = 230; const IMG_HEIGHT = 160; 

        for (let i = 0; i < imagensValidas.length; i += 2) {
            const columns = [];
            columns.push({ image: imagensValidas[i], width: IMG_WIDTH, height: IMG_HEIGHT, fit: [IMG_WIDTH, IMG_HEIGHT], alignment: 'center', margin: [0, 0, 0, 10] });
            if (imagensValidas[i + 1]) {
                columns.push({ image: imagensValidas[i + 1], width: IMG_WIDTH, height: IMG_HEIGHT, fit: [IMG_WIDTH, IMG_HEIGHT], alignment: 'center', margin: [0, 0, 0, 10] });
            } else {
                columns.push({ text: '', width: IMG_WIDTH }); 
            }
            content.push({ columns: columns, columnGap: 10, unbreakable: false });
        }
    }

    // ==========================================================
    // 3. GERAÇÃO DO ARQUIVO PDF E CONFIGURAÇÃO DA PÁGINA
    // ==========================================================
    let mascaraBase64 = null;
    if (comTimbre) mascaraBase64 = await getMascaraBase64();

    const docDefinition = {
        pageSize: 'A4', 
        
        // MARGEM CORRIGIDA: 75 no fundo. Usa 100% da folha útil antes do rodapé da Limalé
        pageMargins: [40, 130, 40, 75], 
        
        defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.1 },
        content: content,
        styles: {
          mainHeader: { fontSize: 14, bold: true, color: '#1C2E4A' },
          sectionHeader: { fontSize: 11, bold: true, color: '#2E7D32', uppercase: true },
          tableHeader: { fontSize: 9, bold: true, color: '#555' },
          footerText: { fontSize: 9, color: '#555', lineHeight: 1.1 } 
        }
    };

    if (mascaraBase64) {
        docDefinition.background = function () {
            return { image: mascaraBase64, width: 595.28, height: 841.89 };
        };
    }
    
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);

    if (retornarBlob) {
        return new Promise((resolve) => {
            pdfDocGenerator.getBlob((blob) => resolve(blob));
        });
    }

    const formatarNome = (texto) => texto ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') : '';
    const nomeArquivo = `${pacienteId || "S-ID"}_${formatarNome(pacienteNome) || "Paciente"}_${formatarNome(tituloExame) || "Exame"}.pdf`;

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