import {
    zScoreFromLMS,
    valueFromZ,
    normalCdf,
    percentileFromZ,
    interpolateLMS,
    calcularLMS,
} from './lmsEngine';

describe('lmsEngine - fórmula LMS', () => {
    test('valor na mediana (valor = M) tem Z = 0 para qualquer L', () => {
        expect(zScoreFromLMS(10, { L: 1, M: 10, S: 0.1 })).toBeCloseTo(0, 10);
        expect(zScoreFromLMS(10, { L: 0, M: 10, S: 0.1 })).toBeCloseTo(0, 10);
        expect(zScoreFromLMS(10, { L: -1.5, M: 10, S: 0.1 })).toBeCloseTo(0, 10);
    });

    test('L = 1 reduz à forma linear Z = (valor − M) / (M·S)', () => {
        const lms = { L: 1, M: 10, S: 0.1 };
        // (12/10)^1 - 1 = 0.2 ; /(1*0.1) = 2
        expect(zScoreFromLMS(12, lms)).toBeCloseTo(2, 10);
    });

    test('L = 0 usa a forma logarítmica Z = ln(valor/M)/S', () => {
        const lms = { L: 0, M: 10, S: 0.2 };
        expect(zScoreFromLMS(10 * Math.exp(0.2), lms)).toBeCloseTo(1, 10);
    });

    test('valores inválidos retornam null', () => {
        expect(zScoreFromLMS(-1, { L: 1, M: 10, S: 0.1 })).toBeNull();
        expect(zScoreFromLMS(10, { L: 1, M: 0, S: 0.1 })).toBeNull();
        expect(zScoreFromLMS('abc', { L: 1, M: 10, S: 0.1 })).toBeNull();
    });
});

describe('lmsEngine - inversa (valueFromZ) é consistente com zScoreFromLMS', () => {
    const casos = [
        { L: 1, M: 10, S: 0.1 },
        { L: 0, M: 3.5, S: 0.15 },
        { L: -1.3, M: 50, S: 0.05 },
        { L: 0.4, M: 120, S: 0.12 },
    ];
    test.each(casos)('round-trip Z→valor→Z (L=$L)', (lms) => {
        [-2, -1, 0, 1, 2].forEach((z) => {
            const valor = valueFromZ(z, lms);
            expect(valor).not.toBeNull();
            expect(zScoreFromLMS(valor, lms)).toBeCloseTo(z, 8);
        });
    });
});

describe('lmsEngine - normal CDF / percentil', () => {
    test('Φ(0) = 50%', () => {
        expect(percentileFromZ(0)).toBeCloseTo(50, 5);
    });
    test('Φ(±1,96) ≈ 2,5% e 97,5%', () => {
        expect(normalCdf(-1.96) * 100).toBeCloseTo(2.5, 1);
        expect(normalCdf(1.96) * 100).toBeCloseTo(97.5, 1);
    });
    test('Φ(1) ≈ 84,13%', () => {
        expect(percentileFromZ(1)).toBeCloseTo(84.13, 1);
    });
});

describe('lmsEngine - interpolação e segurança de domínio', () => {
    const tabela = [
        { x: 24, L: 1, M: 20, S: 0.1 },
        { x: 26, L: 1, M: 24, S: 0.1 },
        { x: 28, L: 1, M: 30, S: 0.1 },
    ];

    test('x exatamente tabelado retorna o próprio ponto', () => {
        expect(interpolateLMS(tabela, 26)).toEqual({ L: 1, M: 24, S: 0.1 });
    });

    test('x intermediário interpola linearmente', () => {
        // x=25 → meio entre M=20 e M=24 → 22
        expect(interpolateLMS(tabela, 25).M).toBeCloseTo(22, 10);
    });

    test('x fora do intervalo NÃO extrapola (retorna null)', () => {
        expect(interpolateLMS(tabela, 20)).toBeNull();
        expect(interpolateLMS(tabela, 40)).toBeNull();
    });

    test('calcularLMS integra tabela por sexo + Z + percentil', () => {
        const ref = { source: 'sintético', tables: { M: tabela } };
        const r = calcularLMS(ref, 'M', 26, 24); // valor = M → Z 0, p50
        expect(r.z).toBeCloseTo(0, 10);
        expect(r.percentil).toBeCloseTo(50, 1);
        expect(r.source).toBe('sintético');
    });

    test('calcularLMS com sexo inexistente retorna null', () => {
        const ref = { source: 's', tables: { M: tabela } };
        expect(calcularLMS(ref, 'F', 26, 24)).toBeNull();
    });
});
