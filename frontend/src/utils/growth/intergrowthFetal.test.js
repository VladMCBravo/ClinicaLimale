import { calcularIGFetal, medianaIGFetal, IG_FETAL_MEDIDAS } from './intergrowthFetal';

// Estratégia de validação: a mediana (μ) de cada padrão deve produzir Z ≈ 0.
// Como a mediana vem da MESMA equação oficial, isto valida o pipeline μ/σ→z
// de ponta a ponta contra a fonte de referência (gigs / Papageorghiou 2014).
describe('INTERGROWTH fetal - mediana da biometria dá Z ≈ 0 (20 semanas = 140 dias)', () => {
    ['HC', 'BPD', 'OFD', 'AC', 'FL'].forEach((m) => {
        test(`${m}: valor = mediana → Z ≈ 0, p ≈ 50`, () => {
            const mediana = medianaIGFetal(m, 140);
            expect(mediana).toBeGreaterThan(0);
            const r = calcularIGFetal(m, 140, mediana);
            expect(r).not.toBeNull();
            expect(r.z).toBeCloseTo(0, 1);
            expect(r.percentil).toBeCloseTo(50, 0);
        });
    });
});

describe('INTERGROWTH fetal - valores plausíveis conhecidos', () => {
    test('CF (fêmur) mediano a 20 sem ≈ 31 mm', () => {
        expect(medianaIGFetal('FL', 140)).toBeGreaterThan(29);
        expect(medianaIGFetal('FL', 140)).toBeLessThan(34);
    });
    test('PC mediano a 20 sem ≈ 172-178 mm', () => {
        const hc = medianaIGFetal('HC', 140);
        expect(hc).toBeGreaterThan(168);
        expect(hc).toBeLessThan(182);
    });
    test('medida acima da mediana → Z positivo; abaixo → Z negativo', () => {
        const med = medianaIGFetal('FL', 154); // 22 sem
        expect(calcularIGFetal('FL', 154, med + 3).z).toBeGreaterThan(0);
        expect(calcularIGFetal('FL', 154, med - 3).z).toBeLessThan(0);
    });
});

describe('INTERGROWTH fetal - peso fetal estimado (EFW)', () => {
    test('EFW mediano (exp(m)) a 30 sem → Z ≈ 0', () => {
        const efwMediano = medianaIGFetal('EFW', 210); // 30 sem
        expect(efwMediano).toBeGreaterThan(1200);
        expect(efwMediano).toBeLessThan(1600);
        const r = calcularIGFetal('EFW', 210, efwMediano);
        expect(r.z).toBeCloseTo(0, 1);
    });
    test('EFW maior → Z positivo', () => {
        const med = medianaIGFetal('EFW', 210);
        expect(calcularIGFetal('EFW', 210, med + 300).z).toBeGreaterThan(0);
    });
});

describe('INTERGROWTH fetal - segurança de domínio', () => {
    test('idade gestacional fora de 14-40 sem retorna null', () => {
        expect(calcularIGFetal('FL', 90, 30)).toBeNull();   // < 14 sem
        expect(calcularIGFetal('FL', 300, 70)).toBeNull();  // > 40 sem
    });
    test('EFW antes de 22 sem retorna null', () => {
        expect(calcularIGFetal('EFW', 140, 300)).toBeNull(); // 20 sem
    });
    test('medida inexistente retorna null', () => {
        expect(calcularIGFetal('XYZ', 140, 30)).toBeNull();
    });
    test('todas as 6 medidas estão expostas', () => {
        expect(Object.keys(IG_FETAL_MEDIDAS)).toEqual(
            expect.arrayContaining(['HC', 'BPD', 'OFD', 'AC', 'FL', 'EFW'])
        );
    });
});
