// src/utils/format.js
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

// Define o fuso horário fixo da clínica
const FUSO_CLINICA = 'America/Sao_Paulo';

export const formatMoney = (value) => {
    const number = parseFloat(value);
    if (isNaN(number)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
};

export const formatDate = (date, format = 'DD/MM/YYYY') => {
    if (!date) return '-';
    return dayjs(date).format(format);
};

// --- NOVAS FUNÇÕES COM FUSO HORÁRIO FIXO ---

export const formatarHoraTZ = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: FUSO_CLINICA
    });
};

export const formatarDataTZ = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('pt-BR', { 
        timeZone: FUSO_CLINICA 
    });
};