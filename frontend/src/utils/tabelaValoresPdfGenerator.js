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
// GERADOR: PROCEDIMENTOS
// ==========================================
export const gerarPdfProcedimentos = (procedimentos, options, onPdfGerado) => {
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

    // Definição dinâmica de colunas
    const tableWidths = [];
    if (options.showTuss) tableWidths.push(60);
    tableWidths.push('*');
    if (options.showValues) tableWidths.push(100);

    Object.entries(procsPorCategoria).forEach(([categoria, procs]) => {
        const nomeCategoria = CAT_LABELS[categoria] || categoria.replace('_', ' ');
        content.push({ text: nomeCategoria.toUpperCase(), style: 'subHeader', margin: [0, 10, 0, 5] });

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
            table: { headerRows: 1, widths: tableWidths, body: bodyProcs },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 15]
        });
    });

    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 170, 40, 60], // Margens exatas do Django
        content: content,
        styles: defaultStyles,
        defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 }
    };

    pdfMake.createPdf(docDefinition).getBlob((blob) => { if (onPdfGerado) onPdfGerado(blob); });
};

// ==========================================
// GERADOR: ESPECIALIDADES
// ==========================================
export const gerarPdfEspecialidades = (especialidades, options, onPdfGerado) => {
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
        table: { headerRows: 1, widths: tableWidths, body: bodyConsultas },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 20]
    });

    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 170, 40, 60], // Margens exatas do Django
        content: content,
        styles: defaultStyles,
        defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 }
    };

    pdfMake.createPdf(docDefinition).getBlob((blob) => { if (onPdfGerado) onPdfGerado(blob); });
};

    // ==========================================
    // GERADOR: ANTIGO (UNIFICADO) 
    // Mantido para não quebrar outras telas
    // ==========================================
    export const gerarPdfTabelaValores = (especialidades, procedimentos, onPdfGerado) => {
        const dataFormatada = new Date().toLocaleDateString('pt-BR');

        const formatMoney = (val) => {
            if (!val || Number(val) === 0) return 'Sob consulta';
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
        };

        const content = [
            { text: 'TABELA DE VALORES - CLÍNICA', style: 'mainHeader', alignment: 'center', margin: [0, 0, 0, 5] },
            { text: `Atualizado em: ${dataFormatada}`, alignment: 'center', fontSize: 10, color: '#666', margin: [0, 0, 0, 20] }
        ];

        content.push({ text: 'CONSULTAS MÉDICAS', style: 'sectionHeader', margin: [0, 10, 0, 5] });
        
        const bodyConsultas = [
            [
                { text: 'ESPECIALIDADE', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] },
                { text: 'VALOR PARTICULAR', style: 'tableHeader', alignment: 'right', fillColor: '#F5F5F5', border: [false, false, false, true] }
            ]
        ];
        
        especialidades.forEach(esp => {
            bodyConsultas.push([
                { text: esp.nome, fontSize: 10, color: '#333', border: [false, false, false, true], margin: [0, 5] },
                { text: formatMoney(esp.valor_consulta), fontSize: 10, bold: true, color: '#2e7d32', alignment: 'right', border: [false, false, false, true], margin: [0, 5] }
            ]);
        });

        content.push({
            table: { headerRows: 1, widths: ['*', 120], body: bodyConsultas },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 20]
        });

        content.push({ text: 'PROCEDIMENTOS E EXAMES', style: 'sectionHeader', margin: [0, 10, 0, 5] });

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

        Object.entries(procsPorCategoria).forEach(([categoria, procs]) => {
            const nomeCategoria = CAT_LABELS[categoria] || categoria.replace('_', ' ');
            content.push({ text: nomeCategoria.toUpperCase(), style: 'subHeader', margin: [0, 10, 0, 5] });

            const bodyProcs = [];
            procs.forEach(proc => {
                bodyProcs.push([
                    { text: proc.descricao, fontSize: 10, color: '#333', border: [false, false, false, true], margin: [0, 3] },
                    { text: formatMoney(proc.valor_particular), fontSize: 10, bold: true, color: proc.valor_particular ? '#2e7d32' : '#999', alignment: 'right', border: [false, false, false, true], margin: [0, 3] }
                ]);
            });

            content.push({
                table: { widths: ['*', 120], body: bodyProcs },
                layout: 'lightHorizontalLines',
                margin: [0, 0, 0, 15]
            });
        });

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 170, 40, 60],
            content: content,
            styles: {
                mainHeader: { fontSize: 14, bold: true, color: '#1C2E4A' },
                sectionHeader: { fontSize: 12, bold: true, color: '#1C2E4A' },
                subHeader: { fontSize: 10, bold: true, color: '#555' },
                tableHeader: { fontSize: 9, bold: true, color: '#C6A87C' } 
            },
            defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 }
        };

        const pdfMake = require('pdfmake/build/pdfmake');
        pdfMake.createPdf(docDefinition).getBlob((blob) => {
            if (onPdfGerado) onPdfGerado(blob);
        });
    };