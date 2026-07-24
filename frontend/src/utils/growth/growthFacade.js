/**
 * Fachada única do motor de crescimento — ponto de entrada para a UI.
 * Unifica OMS (0–5a a termo), INTERGROWTH fetal e INTERGROWTH prematuro
 * pós-natal atrás de uma interface só: listar padrões e calcular.
 */

import { calcularOMS, mesesParaDias } from './whoReference';
import { calcularIGFetal, IG_FETAL_MEDIDAS, medianaIGFetal } from './intergrowthFetal';
import { calcularIGPreterm, IG_PRETERM_MEDIDAS, medianaIGPreterm } from './intergrowthPreterm';

/**
 * Descreve os padrões disponíveis para a UI montar os campos dinamicamente.
 * - ageMode: 'meses' (OMS) | 'igSemanas' (fetal) | 'pmaSemanas' (prematuro)
 * - needsSex: se o cálculo depende de sexo
 */
export const PADROES = [
    {
        id: 'oms',
        label: 'OMS — 0 a 5 anos (a termo)',
        needsSex: true,
        ageMode: 'meses',
        ageLabel: 'Idade (meses)',
        medidas: [
            { id: 'weight-for-age', label: 'Peso para idade', unidade: 'kg' },
            { id: 'length-height-for-age', label: 'Comprimento/estatura para idade', unidade: 'cm' },
            { id: 'head-circumference-for-age', label: 'Perímetro cefálico para idade', unidade: 'cm' },
            { id: 'bmi-for-age', label: 'IMC para idade', unidade: 'kg/m²' },
        ],
    },
    {
        id: 'ig_fetal',
        label: 'INTERGROWTH — Fetal (biometria)',
        needsSex: false,
        ageMode: 'igSemanas',
        ageLabel: 'Idade gestacional (semanas)',
        medidas: Object.entries(IG_FETAL_MEDIDAS).map(([id, m]) => ({ id, label: m.rotulo, unidade: m.unidade })),
    },
    {
        id: 'ig_preterm',
        label: 'INTERGROWTH — Prematuro pós-natal',
        needsSex: true,
        ageMode: 'pmaSemanas',
        ageLabel: 'Idade pós-menstrual (semanas)',
        medidas: Object.entries(IG_PRETERM_MEDIDAS).map(([id, m]) => ({ id, label: m.rotulo, unidade: m.unidade })),
    },
];

export const getPadrao = (id) => PADROES.find((p) => p.id === id) || null;

/**
 * Calcula escore-Z + percentil pelo padrão escolhido.
 * @param {string} padraoId  'oms' | 'ig_fetal' | 'ig_preterm'
 * @param {object} params  { sexo?, idade, medida, valor }
 *   idade: meses (oms) | semanas (fetal/preterm)
 * @returns {{ z:number, percentil:number, source:string } | null}
 */
export const calcularCrescimento = (padraoId, { sexo, idade, medida, valor }) => {
    switch (padraoId) {
        case 'oms':
            return calcularOMS(medida, sexo, mesesParaDias(idade), valor);
        case 'ig_fetal':
            // INTERGROWTH fetal recebe IG em dias.
            return calcularIGFetal(medida, Number(String(idade).replace(',', '.')) * 7, valor);
        case 'ig_preterm':
            return calcularIGPreterm(medida, sexo, idade, valor);
        default:
            return null;
    }
};

/**
 * Mediana esperada (para exibir a referência ao lado do valor), quando o padrão
 * suporta. Retorna null para OMS (a mediana varia por indicador/idade e não é
 * essencial na UI inicial).
 */
export const medianaEsperada = (padraoId, { idade, medida, sexo }) => {
    switch (padraoId) {
        case 'ig_fetal':
            return medianaIGFetal(medida, Number(String(idade).replace(',', '.')) * 7);
        case 'ig_preterm':
            return medianaIGPreterm(medida, sexo, idade);
        default:
            return null;
    }
};
