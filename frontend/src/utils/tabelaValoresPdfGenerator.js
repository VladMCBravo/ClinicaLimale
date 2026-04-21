// src/utils/tabelaValoresPdfGenerator.js
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

export const gerarPdfTabelaValores = (especialidades, procedimentos, onPdfGerado) => {
    const dataFormatada = new Date().toLocaleDateString('pt-BR');

    // Função auxiliar para formatar os valores
    const formatMoney = (val) => {
        if (!val || Number(val) === 0) return 'Sob consulta';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    // --- MONTAGEM DO CONTEÚDO ---
    const content = [
        { text: 'TABELA DE VALORES - CLÍNICA', style: 'mainHeader', alignment: 'center', margin: [0, 0, 0, 5] },
        { text: `Atualizado em: ${dataFormatada}`, alignment: 'center', fontSize: 10, color: '#666', margin: [0, 0, 0, 20] }
    ];

    // ================= SEÇÃO 1: CONSULTAS =================
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

    // ================= SEÇÃO 2: PROCEDIMENTOS =================
    content.push({ text: 'PROCEDIMENTOS E EXAMES', style: 'sectionHeader', margin: [0, 10, 0, 5] });

    const CAT_LABELS = {
        'US_GERAL': 'Ultrassom Geral',
        'MED_FETAL': 'Medicina Fetal',
        'ECOCARDIOGRAMA': 'Ecocardiograma',
        'MUSCULO': 'Musculoesquelético',
        'DOPPLER': 'Doppler',
        'OUTROS': 'Outros'
    };

    // Agrupa os procedimentos por categoria
    const procsPorCategoria = procedimentos.reduce((acc, proc) => {
        const cat = proc.categoria || 'OUTROS';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(proc);
        return acc;
    }, {});

    Object.entries(procsPorCategoria).forEach(([categoria, procs]) => {
        const nomeCategoria = CAT_LABELS[categoria] || categoria.replace('_', ' ');
        
        // Título da Categoria
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
        // MARGENS DEFINIDAS PARA CABER A MÁSCARA DO DJANGO (Topo 170, Base 60)
        pageMargins: [40, 170, 40, 60],
        content: content,
        styles: {
            mainHeader: { fontSize: 14, bold: true, color: '#1C2E4A' },
            sectionHeader: { fontSize: 12, bold: true, color: '#1C2E4A' },
            subHeader: { fontSize: 10, bold: true, color: '#555' },
            tableHeader: { fontSize: 9, bold: true, color: '#C6A87C' } // Cor dourada igual ao seu agendaPdfGenerator
        },
        defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 }
    };

    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    
    // Devolve o Blob para ser enviado ao Django
    pdfDocGenerator.getBlob((blob) => {
        if (onPdfGerado) {
            onPdfGerado(blob);
        }
    });
};