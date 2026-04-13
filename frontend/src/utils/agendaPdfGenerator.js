import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
// REMOVIDO: import logoImagemPath e getBase64FromUrl

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

// MUDANÇA: Adicionamos um parâmetro 'onPdfGerado' que será uma função callback
export const gerarPdfAgendaDia = async (pacientes, dataFiltro, onPdfGerado) => {
    
    const dataFormatada = dataFiltro ? new Date(dataFiltro).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');

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
        const procedimento = ag.procedimento_descricao || ag.especialidade_nome || ag.procedimento || 'Consulta';
        const idPaciente = ag.paciente_id || ag.paciente || '--';

        bodyTable.push([
            { text: horario, fontSize: 10, bold: true, color: '#1C2E4A', border: [false, false, false, true], margin: [0, 5] },
            { text: `ID: ${idPaciente} - ${ag.paciente_nome}`, fontSize: 10, color: '#333', border: [false, false, false, true], margin: [0, 5] },
            { text: tipoVisita, fontSize: 9, color: '#666', border: [false, false, false, true], margin: [0, 5] },
            { text: procedimento, fontSize: 9, color: '#666', border: [false, false, false, true], margin: [0, 5] },
            { text: ag.status, fontSize: 9, bold: true, color: '#555', border: [false, false, false, true], margin: [0, 5] }
        ]);
    });

    // --- MONTAGEM DO DOCUMENTO ---
    const docDefinition = {
        pageSize: 'A4',
        // Margens ajustadas para caber a máscara perfeitamente (Top 170)
        pageMargins: [40, 170, 40, 60],
        // Sem header e footer manuais
        content: [
            { text: 'RELAÇÃO DE PACIENTES DO DIA', style: 'mainHeader', alignment: 'center', margin: [0, 0, 0, 5] },
            { text: `Data: ${dataFormatada}  |  Total: ${pacientes.length} pacientes`, alignment: 'center', fontSize: 10, color: '#666', margin: [0, 0, 0, 20] },
            
            // Tabela
            {
                table: {
                    headerRows: 1,
                    widths: [50, '*', 50, 'auto', 80],
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

    // MUDANÇA PRINCIPAL: Em vez de abrir, gera o Blob e devolve para o componente pai enviar pro Django
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    pdfDocGenerator.getBlob((blob) => {
        if (onPdfGerado) {
            onPdfGerado(blob);
        }
    });
};