import apiClient from './axiosConfig'; // Sua configuração do Axios

export const assinarPdfRemotamente = async (pdfBlob) => {
    const formData = new FormData();
    // 'file' é o nome que a View do Django espera (request.FILES['file'])
    formData.append('file', pdfBlob, 'laudo_temp.pdf');

    const response = await apiClient.post('/pdf/assinar-upload/', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob', // Importante: esperamos um arquivo de volta, não JSON
    });

    return response.data; // Retorna o Blob do PDF assinado
};