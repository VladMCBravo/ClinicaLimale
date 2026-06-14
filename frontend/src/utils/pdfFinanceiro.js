import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import dayjs from "dayjs";

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const gerarPdfContasReceber = (lista, totais, filtroData) => {
    // Formata o mês ou período do filtro para exibir no título
    const dataFormatada = filtroData 
        ? dayjs(filtroData).format('MMMM [de] YYYY').toUpperCase() 
        : 'PERÍODO ATUAL';

    // --- CORPO DA TABELA ---
    const bodyTable = [
        [
            { text: 'VENCIMENTO', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] },
            { text: 'PACIENTE / DESCRIÇÃO', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] },
            { text: 'STATUS', style: 'tableHeader', alignment: 'center', fillColor: '#F5F5F5', border: [false, false, false, true] },
            { text: 'VALOR', style: 'tableHeader', alignment: 'right', fillColor: '#F5F5F5', border: [false, false, false, true] }
        ]
    ];

    // Preenche com os dados (já ordenados como na tela)
    lista.forEach((item) => {
        const vencimento = dayjs(item.data_vencimento).format('DD/MM/YY');
        const paciente = item.paciente_nome || item.descricao || '--';
        const status = item.status;
        const valor = formatMoney(item.valor);

        bodyTable.push([
            { text: vencimento, fontSize: 10, color: '#333', border: [false, false, false, true], margin: [0, 5] },
            { text: paciente, fontSize: 10, bold: true, color: '#1C2E4A', border: [false, false, false, true], margin: [0, 5] },
            { text: status, fontSize: 9, alignment: 'center', bold: true, color: '#666', border: [false, false, false, true], margin: [0, 5] },
            { text: valor, fontSize: 10, color: '#2e7d32', alignment: 'right', border: [false, false, false, true], margin: [0, 5] }
        ]);
    });

    // Linha final com os totais
    bodyTable.push([
        { text: 'RESUMO', style: 'tableHeader', border: [false, false, false, false], margin: [0, 10, 0, 0] },
        { text: `${totais.qtdServicos} Serviços | ${totais.qtdPacientes} Pacientes`, style: 'tableHeader', border: [false, false, false, false], margin: [0, 10, 0, 0] },
        { text: 'TOTAL:', style: 'tableHeader', alignment: 'right', border: [false, false, false, false], margin: [0, 10, 0, 0] },
        { text: formatMoney(totais.valor), style: 'tableHeader', alignment: 'right', color: '#2e7d32', border: [false, false, false, false], margin: [0, 10, 0, 0] }
    ]);

    // --- MONTAGEM DO DOCUMENTO ---
    const docDefinition = {
        pageSize: 'A4',
        // Margens ajustadas para a máscara (Top 170) conforme seu modelo
        pageMargins: [40, 170, 40, 60],
        content: [
            { text: 'RELATÓRIO DE CONTAS A RECEBER', style: 'mainHeader', alignment: 'center', margin: [0, 0, 0, 5] },
            { text: `Período: ${dataFormatada}`, alignment: 'center', fontSize: 10, color: '#666', margin: [0, 0, 0, 20] },
            
            {
                table: {
                    headerRows: 1,
                    widths: [60, '*', 70, 80],
                    body: bodyTable
                },
                layout: 'lightHorizontalLines'
            }
        ],
        styles: {
            mainHeader: { fontSize: 14, bold: true, color: '#1C2E4A' },
            tableHeader: { fontSize: 9, bold: true, color: '#C6A87C' },
        },
        defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 }
    };

    // Abre o PDF em uma nova aba para visualização/impressão
    pdfMake.createPdf(docDefinition).open();
};