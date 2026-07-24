import {
    bsaDuBois, bsaHaycock, bsaMosteller, bsaGehanGeorge, bsaBoyd, calcularBSA,
} from './bsa';

describe('BSA - valores de referência publicados (adulto 70 kg / 170 cm)', () => {
    // Valores amplamente citados na literatura para o "homem médio".
    test('Mosteller ≈ 1,82 m²', () => {
        expect(bsaMosteller(70, 170)).toBeCloseTo(1.82, 2);
    });
    test('DuBois ≈ 1,81 m²', () => {
        expect(bsaDuBois(70, 170)).toBeCloseTo(1.81, 2);
    });
    test('Haycock ≈ 1,80 m²', () => {
        expect(bsaHaycock(70, 170)).toBeCloseTo(1.80, 1);
    });
    test('as cinco fórmulas concordam dentro de ~5% para o adulto médio', () => {
        const vals = [
            bsaDuBois(70, 170), bsaHaycock(70, 170), bsaMosteller(70, 170),
            bsaGehanGeorge(70, 170), bsaBoyd(70, 170),
        ];
        const min = Math.min(...vals), max = Math.max(...vals);
        expect((max - min) / min).toBeLessThan(0.05);
    });
});

describe('BSA - faixa pediátrica/neonatal (Haycock)', () => {
    test('recém-nascido 3,5 kg / 50 cm cai em faixa plausível (~0,20-0,24 m²)', () => {
        const bsa = bsaHaycock(3.5, 50);
        expect(bsa).toBeGreaterThan(0.19);
        expect(bsa).toBeLessThan(0.25);
    });
    test('BSA é monotônica crescente com o peso', () => {
        expect(bsaHaycock(10, 75)).toBeGreaterThan(bsaHaycock(8, 75));
    });
});

describe('BSA - robustez de entrada', () => {
    test('entradas inválidas retornam null', () => {
        expect(bsaHaycock(0, 50)).toBeNull();
        expect(bsaHaycock(3.5, 0)).toBeNull();
        expect(bsaHaycock('x', 50)).toBeNull();
        expect(bsaDuBois(-2, 50)).toBeNull();
    });
    test('aceita vírgula decimal (padrão pt-BR)', () => {
        expect(bsaMosteller('3,5', '50')).toBeCloseTo(bsaMosteller(3.5, 50), 6);
    });
    test('calcularBSA usa Haycock por padrão e respeita a fórmula escolhida', () => {
        expect(calcularBSA(70, 170)).toBe(bsaHaycock(70, 170));
        expect(calcularBSA(70, 170, 'mosteller')).toBe(bsaMosteller(70, 170));
        expect(calcularBSA(70, 170, 'inexistente')).toBe(bsaHaycock(70, 170));
    });
});
