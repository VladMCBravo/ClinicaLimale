import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import logoImagemPath from '../assets/Logo-pdf.png';
import { getBase64FromUrl } from "./imageHelper";

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

export const gerarPdfAgendaDia = async (pacientes, dataFiltro) => {
    // Busca a logo em base64
    let logoBase64 = null;
    try {
        logoBase64 = await getBase64FromUrl(logoImagemPath);
    } catch (error) {
        console.error("Erro ao carregar o logo:", error);
    }

    const dataFormatada = dataFiltro ? new Date(dataFiltro).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');

    // --- CABEÇALHO ---
    const headerDefinition = {
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
    };

    // --- RODAPÉ ---
    const footerDefinition = (currentPage, pageCount) => {
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
    };

    // --- CORPO DA TABELA ---
    const bodyTable = [
        [
            { text: 'HORÁRIO', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] },
            { text: 'PACIENTE', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] },
            { text: 'TIPO', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] },
            { text: 'PROCEDIMENTO', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] },
            { text: 'STATUS', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] }
        ]
    ];

    pacientes.forEach((ag) => {
        const horario = new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const tipoVisita = ag.primeira_consulta ? '1ª Vez' : (ag.tipo_visita || 'Retorno');
        const procedimento = ag.procedimento || ag.especialidade || 'Consulta';

        bodyTable.push([
            { text: horario, fontSize: 10, bold: true, color: '#1C2E4A', border: [false, false, false, true], margin: [0, 5] },
            { text: ag.paciente_nome, fontSize: 10, color: '#333', border: [false, false, false, true], margin: [0, 5] },
            { text: tipoVisita, fontSize: 9, color: '#666', border: [false, false, false, true], margin: [0, 5] },
            { text: procedimento, fontSize: 9, color: '#666', border: [false, false, false, true], margin: [0, 5] },
            { text: ag.status, fontSize: 9, bold: true, color: '#555', border: [false, false, false, true], margin: [0, 5] }
        ]);
    });

    // --- MONTAGEM DO DOCUMENTO ---
    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 130, 40, 80],
        header: headerDefinition,
        footer: footerDefinition,
        content: [
            { text: 'RELAÇÃO DE PACIENTES DO DIA', style: 'mainHeader', alignment: 'center', margin: [0, 0, 0, 5] },
            { text: `Data: ${dataFormatada}  |  Total: ${pacientes.length} pacientes`, alignment: 'center', fontSize: 10, color: '#666', margin: [0, 0, 0, 20] },
            
            // Tabela
            {
                table: {
                    headerRows: 1,
                    widths: [50, '*', 50, 'auto', 80], // Larguras das colunas
                    body: bodyTable
                },
                layout: 'lightHorizontalLines'
            }
        ],
        styles: {
            mainHeader: { fontSize: 14, bold: true, color: '#1C2E4A' },
            tableHeader: { fontSize: 9, bold: true, color: '#C6A87C' }, // Usando o dourado da clínica no cabeçalho da tabela
            footerText: { fontSize: 9, color: '#555', lineHeight: 1.1 }
        },
        defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 }
    };

    // Gera e abre em uma nova aba para visualização/impressão imediata
    pdfMake.createPdf(docDefinition).open();
};