import { calcularIGPreterm, medianaIGPreterm, IG_PRETERM_MEDIDAS } from './intergrowthPreterm';

describe('INTERGROWTH prematuro - mediana dá Z ≈ 0', () => {
    ['weight', 'length', 'hc'].forEach((m) => {
        ['M', 'F'].forEach((sexo) => {
            test(`${m}/${sexo}: valor = mediana → Z ≈ 0, p ≈ 50 (40 sem)`, () => {
                const med = medianaIGPreterm(m, sexo, 40);
                expect(med).toBeGreaterThan(0);
                const r = calcularIGPreterm(m, sexo, 40, med);
                expect(r.z).toBeCloseTo(0, 1);
                expect(r.percentil).toBeCloseTo(50, 0);
            });
        });
    });
});

describe('INTERGROWTH prematuro - valores plausíveis a termo (40 sem)', () => {
    test('peso mediano meninos a 40 sem ≈ 3,3-3,6 kg', () => {
        const w = medianaIGPreterm('weight', 'M', 40);
        expect(w).toBeGreaterThan(3.2);
        expect(w).toBeLessThan(3.7);
    });
    test('comprimento mediano a 40 sem ≈ 49-52 cm', () => {
        const l = medianaIGPreterm('length', 'M', 40);
        expect(l).toBeGreaterThan(48);
        expect(l).toBeLessThan(53);
    });
    test('PC mediano a 40 sem ≈ 34-36 cm', () => {
        const hc = medianaIGPreterm('hc', 'M', 40);
        expect(hc).toBeGreaterThan(33);
        expect(hc).toBeLessThan(37);
    });
    test('meninos têm mediana de peso maior que meninas na mesma idade', () => {
        expect(medianaIGPreterm('weight', 'M', 34)).toBeGreaterThan(medianaIGPreterm('weight', 'F', 34));
    });
});

describe('INTERGROWTH prematuro - direção do escore e segurança', () => {
    test('peso acima da mediana → Z positivo; abaixo → negativo', () => {
        const med = medianaIGPreterm('weight', 'M', 32);
        expect(calcularIGPreterm('weight', 'M', 32, med + 0.3).z).toBeGreaterThan(0);
        expect(calcularIGPreterm('weight', 'M', 32, med - 0.3).z).toBeLessThan(0);
    });
    test('idade pós-menstrual fora de 27-64 sem retorna null', () => {
        expect(calcularIGPreterm('weight', 'M', 20, 1.0)).toBeNull();
        expect(calcularIGPreterm('weight', 'M', 70, 6.0)).toBeNull();
    });
    test('sexo inválido retorna null', () => {
        expect(calcularIGPreterm('weight', 'X', 40, 3.4)).toBeNull();
    });
    test('as 3 medidas estão expostas', () => {
        expect(Object.keys(IG_PRETERM_MEDIDAS)).toEqual(
            expect.arrayContaining(['weight', 'length', 'hc'])
        );
    });
});
