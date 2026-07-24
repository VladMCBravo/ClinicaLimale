import { calcularOMS, mesesParaDias, anosParaDias, OMS_INDICADORES } from './whoReference';

describe('OMS - validação contra valores-âncora oficiais (mediana = Z 0 = p50)', () => {
    test('peso meninos ao nascer (mediana 3,3464 kg) → Z ≈ 0, p ≈ 50', () => {
        const r = calcularOMS('weight-for-age', 'M', 0, 3.3464);
        expect(r).not.toBeNull();
        expect(r.z).toBeCloseTo(0, 2);
        expect(r.percentil).toBeCloseTo(50, 0);
    });

    test('peso meninas ao nascer (mediana 3,2322 kg) → Z ≈ 0', () => {
        expect(calcularOMS('weight-for-age', 'F', 0, 3.2322).z).toBeCloseTo(0, 2);
    });

    test('comprimento meninos ao nascer (mediana 49,8842 cm) → Z ≈ 0', () => {
        expect(calcularOMS('length-height-for-age', 'M', 0, 49.8842).z).toBeCloseTo(0, 2);
    });

    test('perímetro cefálico meninos ao nascer (mediana 34,4618 cm) → Z ≈ 0', () => {
        expect(calcularOMS('head-circumference-for-age', 'M', 0, 34.4618).z).toBeCloseTo(0, 2);
    });
});

describe('OMS - escore-Z dentro da faixa normal', () => {
    test('valor acima da mediana dá Z positivo e percentil > 50', () => {
        const r = calcularOMS('weight-for-age', 'M', 0, 4.0);
        expect(r.z).toBeGreaterThan(0);
        expect(r.percentil).toBeGreaterThan(50);
        expect(r.percentil).toBeLessThan(100);
    });
    test('valor abaixo da mediana dá Z negativo', () => {
        expect(calcularOMS('weight-for-age', 'M', 0, 2.8).z).toBeLessThan(0);
    });
});

describe('OMS - ajuste de valores extremos (|Z| > 3)', () => {
    test('peso muito alto usa o ajuste da cauda e retorna Z finito > 3', () => {
        // recém-nascido de 6 kg está muito acima de +3 DP
        const r = calcularOMS('weight-for-age', 'M', 0, 6.0);
        expect(r.z).toBeGreaterThan(3);
        expect(Number.isFinite(r.z)).toBe(true);
    });
    test('peso muito baixo retorna Z finito < -3', () => {
        const r = calcularOMS('weight-for-age', 'M', 0, 1.8);
        expect(r.z).toBeLessThan(-3);
        expect(Number.isFinite(r.z)).toBe(true);
    });
});

describe('OMS - segurança e utilidades', () => {
    test('idade fora da faixa (0-1826 dias) retorna null (sem extrapolar)', () => {
        expect(calcularOMS('weight-for-age', 'M', 2000, 15)).toBeNull();
    });
    test('indicador inexistente retorna null', () => {
        expect(calcularOMS('inexistente', 'M', 0, 3)).toBeNull();
    });
    test('idade em meses/anos convertida corretamente', () => {
        expect(mesesParaDias(12)).toBe(365); // 12 * 30.4375 = 365.25 → 365
        expect(anosParaDias(2)).toBe(731);   // 2 * 365.25 = 730.5 → 731
    });
    test('a interpolação entre dias mantém a mediana coerente (Z ~ 0 perto da mediana interpolada)', () => {
        // aos 15 dias, um peso próximo da mediana interpolada deve dar |Z| pequeno
        const r = calcularOMS('weight-for-age', 'M', 15, 3.6);
        expect(Math.abs(r.z)).toBeLessThan(1);
    });
    test('todos os 4 indicadores estão expostos', () => {
        expect(Object.keys(OMS_INDICADORES)).toEqual(
            expect.arrayContaining(['weight-for-age', 'length-height-for-age', 'head-circumference-for-age', 'bmi-for-age'])
        );
    });
});
