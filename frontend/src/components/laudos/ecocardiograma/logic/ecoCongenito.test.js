import { ecoCongenitoInitialState } from './ecoCongenitoInitialState';
import { montarTextoCongenito, aplicarDiagnosticoCongenito } from './ecoCongenitoTextBuilder';

describe('Eco Congênito - text builder', () => {
    test('exame normal gera descrição e conclusão normal', () => {
        const { textoPreview, tituloExame } = montarTextoCongenito(ecoCongenitoInitialState);
        expect(tituloExame).toBe('ECOCARDIOGRAMA');
        expect(textoPreview).toContain('=== DESCRIÇÃO ===');
        expect(textoPreview).toContain('Situs atrial solitus');
        expect(textoPreview).toContain('=== CONCLUSÃO ===');
        expect(textoPreview).toContain('dentro dos limites da normalidade');
    });

    test('preset de Tetralogia de Fallot injeta CIV e conclusão', () => {
        const data = aplicarDiagnosticoCongenito(ecoCongenitoInitialState, 'tetralogia_fallot');
        const { textoPreview } = montarTextoCongenito(data);
        expect(textoPreview).toContain('mal alinhamento do septo');
        expect(textoPreview).toContain('Tetralogia de Fallot');
        expect(textoPreview).toContain('Estenose valvar pulmonar');
    });

    test('preset SHCE marca atresia mitral/aórtica e arco hipoplásico', () => {
        const data = aplicarDiagnosticoCongenito(ecoCongenitoInitialState, 'shce');
        const { textoPreview } = montarTextoCongenito(data);
        expect(textoPreview).toContain('Valva mitral atrésica');
        expect(textoPreview).toContain('Atresia da valva aórtica');
        expect(textoPreview).toContain('Arco aórtico hipoplásico');
    });

    test('trocar de diagnóstico complexo para normal limpa texto residual', () => {
        const fallot = aplicarDiagnosticoCongenito(ecoCongenitoInitialState, 'tetralogia_fallot');
        const voltou = aplicarDiagnosticoCongenito(fallot, 'normal');
        expect(voltou.septoInterventricular).toBe(ecoCongenitoInitialState.septoInterventricular);
        expect(voltou.valvasSemilunares).toBe(ecoCongenitoInitialState.valvasSemilunares);
    });

    test('pós-op Fontan monta cabeçalho de contexto e achados cirúrgicos', () => {
        const base = aplicarDiagnosticoCongenito(ecoCongenitoInitialState, 'pos_op_fontan');
        const data = { ...base, diaPO: '14', dataCirurgia: '01/07/2025', diagnosticoBase: 'DVE única' };
        const { textoPreview } = montarTextoCongenito(data);
        expect(data.momento).toBe('pos_op');
        expect(textoPreview).toContain('14º pós-operatório');
        expect(textoPreview).toContain('cirurgia em 01/07/2025');
        expect(textoPreview).toContain('Base: DVE única');
        expect(textoPreview).toContain('Fontan');
    });

    test('condições do exame viram seção OBSERVAÇÕES', () => {
        const data = { ...ecoCongenitoInitialState, condicoesExame: 'Em uso de milrinona.' };
        const { textoPreview } = montarTextoCongenito(data);
        expect(textoPreview).toContain('=== OBSERVAÇÕES ===');
        expect(textoPreview).toContain('milrinona');
    });

    test('SC (BSA) aparece no contexto quando informada', () => {
        const data = { ...ecoCongenitoInitialState, sc: '0.24' };
        const { textoPreview } = montarTextoCongenito(data);
        expect(textoPreview).toContain('Superfície corpórea: 0.24 m²');
    });
});
