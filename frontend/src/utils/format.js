// src/utils/format.js
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

export const formatMoney = (value) => {
    const number = parseFloat(value);
    if (isNaN(number)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
};

export const formatDate = (date, format = 'DD/MM/YYYY') => {
    if (!date) return '-';
    return dayjs(date).format(format);
};