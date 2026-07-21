// src/utils/tabelaValoresPdfGenerator.js
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

const formatMoney = (val) => {
    if (!val || Number(val) === 0) return 'Sob consulta';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const defaultStyles = {
    mainHeader: { fontSize: 14, bold: true, color: '#1C2E4A' },
    sectionHeader: { fontSize: 12, bold: true, color: '#1C2E4A' },
    subHeader: { fontSize: 10, bold: true, color: '#555' },
    tableHeader: { fontSize: 9, bold: true, color: '#C6A87C' }
};

// ==========================================
// FUNÇÃO PARA BUSCAR A MÁSCARA NA PASTA PUBLIC
// ==========================================
const getBase64FromUrl = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// ==========================================
// GERADOR: PROCEDIMENTOS (COM MÁSCARA FRONTEND)
// ==========================================
export const gerarPdfProcedimentos = async (procedimentos, options, onPdfGerado) => {
    try {
        // Busca a imagem do public
        const mascaraBase64 = await getBase64FromUrl('/Receituario_v2.jpg');
        const dataFormatada = new Date().toLocaleDateString('pt-BR');
        
        const content = [
            { text: 'RELAÇÃO DE PROCEDIMENTOS', style: 'mainHeader', alignment: 'center', margin: [0, 0, 0, 5] },
            { text: `Atualizado em: ${dataFormatada}`, alignment: 'center', fontSize: 10, color: '#666', margin: [0, 0, 0, 20] }
        ];

        const CAT_LABELS = {
            'US_GERAL': 'Ultrassom Geral',
            'MED_FETAL': 'Medicina Fetal',
            'ECOCARDIOGRAMA': 'Ecocardiograma',
            'MUSCULO': 'Musculoesquelético',
            'DOPPLER': 'Doppler',
            'OUTROS': 'Outros'
        };

        const procsPorCategoria = procedimentos.reduce((acc, proc) => {
            const cat = proc.categoria || 'OUTROS';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(proc);
            return acc;
        }, {});

        const tableWidths = [];
        if (options.showTuss) tableWidths.push(65);
        tableWidths.push('*');
        if (options.showValues) tableWidths.push(100);

        Object.entries(procsPorCategoria).forEach(([categoria, procs]) => {
            const nomeCategoria = CAT_LABELS[categoria] || categoria.replace('_', ' ');

            const headerRow = [];
            if (options.showTuss) headerRow.push({ text: 'CÓD. TUSS', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] });
            headerRow.push({ text: 'DESCRIÇÃO', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] });
            if (options.showValues) headerRow.push({ text: 'VALOR', style: 'tableHeader', alignment: 'right', fillColor: '#F5F5F5', border: [false, false, false, true] });

            const bodyProcs = [headerRow];

            procs.forEach(proc => {
                const row = [];
                if (options.showTuss) row.push({ text: proc.codigo_tuss || '-', fontSize: 9, color: '#666', border: [false, false, false, true], margin: [0, 3] });
                row.push({ text: proc.descricao, fontSize: 10, color: '#333', border: [false, false, false, true], margin: [0, 3] });
                if (options.showValues) row.push({ text: formatMoney(proc.valor_particular), fontSize: 10, bold: true, color: proc.valor_particular ? '#2e7d32' : '#999', alignment: 'right', border: [false, false, false, true], margin: [0, 3] });
                bodyProcs.push(row);
            });

            content.push({
                unbreakable: true, 
                stack: [
                    { text: nomeCategoria.toUpperCase(), style: 'subHeader', margin: [0, 10, 0, 5] },
                    {
                        table: { headerRows: 1, dontBreakRows: true, widths: tableWidths, body: bodyProcs },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 15]
                    }
                ]
            });
        });

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 170, 40, 60],
            // APLICANDO A MÁSCARA EM TODAS AS PÁGINAS
            background: [
                {
                    image: mascaraBase64,
                    width: 595.28, // Largura padrão A4 em pontos
                    height: 841.89 // Altura padrão A4 em pontos
                }
            ],
            content: content,
            styles: defaultStyles,
            defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 }
        };

        pdfMake.createPdf(docDefinition).getBlob((blob) => { if (onPdfGerado) onPdfGerado(blob); });

    } catch (error) {
        console.error("Erro ao carregar a máscara:", error);
        alert("Erro ao carregar a imagem de fundo do PDF.");
    }
};

// ==========================================
// GERADOR: ESPECIALIDADES (COM MÁSCARA FRONTEND)
// ==========================================
export const gerarPdfEspecialidades = async (especialidades, options, onPdfGerado) => {
    try {
        const mascaraBase64 = await getBase64FromUrl('/Receituario_v2.jpg');
        const dataFormatada = new Date().toLocaleDateString('pt-BR');

        const content = [
            { text: 'RELAÇÃO DE ESPECIALIDADES E CONSULTAS', style: 'mainHeader', alignment: 'center', margin: [0, 0, 0, 5] },
            { text: `Atualizado em: ${dataFormatada}`, alignment: 'center', fontSize: 10, color: '#666', margin: [0, 0, 0, 20] }
        ];

        const tableWidths = ['*'];
        if (options.showValues) tableWidths.push(120);

        const headerRow = [{ text: 'ESPECIALIDADE', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] }];
        if (options.showValues) headerRow.push({ text: 'VALOR PARTICULAR', style: 'tableHeader', alignment: 'right', fillColor: '#F5F5F5', border: [false, false, false, true] });

        const bodyConsultas = [headerRow];

        especialidades.forEach(esp => {
            const row = [{ text: esp.nome, fontSize: 10, color: '#333', border: [false, false, false, true], margin: [0, 5] }];
            if (options.showValues) row.push({ text: formatMoney(esp.valor_consulta), fontSize: 10, bold: true, color: '#2e7d32', alignment: 'right', border: [false, false, false, true], margin: [0, 5] });
            bodyConsultas.push(row);
        });

        content.push({
            table: { headerRows: 1, dontBreakRows: true, widths: tableWidths, body: bodyConsultas },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 20]
        });

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 170, 40, 60],
            // APLICANDO A MÁSCARA EM TODAS AS PÁGINAS
            background: [
                {
                    image: mascaraBase64,
                    width: 595.28, 
                    height: 841.89 
                }
            ],
            content: content,
            styles: defaultStyles,
            defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 }
        };

        pdfMake.createPdf(docDefinition).getBlob((blob) => { if (onPdfGerado) onPdfGerado(blob); });

    } catch (error) {
        console.error("Erro ao carregar a máscara:", error);
        alert("Erro ao carregar a imagem de fundo do PDF.");
    }
};