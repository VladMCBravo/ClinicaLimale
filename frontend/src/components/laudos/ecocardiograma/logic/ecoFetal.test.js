import { ecoFetalInitialState } from './ecoFetalInitialState';
import { montarTextoFetal, aplicarDiagnostico } from './ecoFetalTextBuilder';
import { calcularScoreHuhta, resolverZScoreFetal } from './ecoFetalCalculations';
import { computeZScore, isAutoZScoreAvailable } from './zScoreReferenceTables';

describe('Eco Fetal - text builder', () => {
  test('exame normal gera título, seção de descrição e conclusão normal', () => {
    const { textoPreview, tituloExame } = montarTextoFetal(ecoFetalInitialState);
    expect(tituloExame).toBe('ECOCARDIOGRAMA FETAL');
    expect(textoPreview).toContain('=== DESCRIÇÃO ===');
    expect(textoPreview).toContain('Situs solitus em levocardia');
    expect(textoPreview).toContain('=== CONCLUSÃO ===');
    expect(textoPreview).toContain('ECOCARDIOGRAMA FETAL NORMAL PARA A IDADE GESTACIONAL');
  });

  test('preset de coarctação injeta istmo e conclusão de risco', () => {
    const data = aplicarDiagnostico(ecoFetalInitialState, 'coarctacao');
    const { textoPreview } = montarTextoFetal(data);
    expect(textoPreview).toContain('Istmo aórtico estreito');
    expect(textoPreview).toContain('RISCO AUMENTADO PARA COARCTAÇÃO DA AORTA');
    expect(textoPreview).toContain('=== COMENTÁRIOS ===');
  });

  test('voltar de um diagnóstico complexo para "normal" limpa o texto residual', () => {
    const complexo = aplicarDiagnostico(ecoFetalInitialState, 'coarctacao');
    expect(complexo.septoIV).toBe('Septo interventricular íntegro.');
    const voltou = aplicarDiagnostico(complexo, 'normal');
    // septoIV deve voltar ao default de exame normal
    expect(voltou.septoIV).toBe(ecoFetalInitialState.septoIV);
    expect(voltou.arcos).toBe(ecoFetalInitialState.arcos);
    expect(voltou.conclusao).toContain('NORMAL PARA A IDADE GESTACIONAL');
  });

  test('óbito fetal usa descrição custom e omite análise segmentar', () => {
    const data = aplicarDiagnostico(ecoFetalInitialState, 'obito_fetal');
    const { textoPreview } = montarTextoFetal(data);
    expect(textoPreview).toContain('Ausência de batimentos cardíacos');
    expect(textoPreview).not.toContain('Situs solitus em levocardia');
    expect(textoPreview).toContain('ÓBITO FETAL');
  });

  test('gemelar gera blocos FETO I e FETO II', () => {
    const base = aplicarDiagnostico(ecoFetalInitialState, 'normal');
    const data = { ...base, qtdFetos: 2, feto2Diagnostico: 'civ_perimembranosa' };
    const { textoPreview } = montarTextoFetal(data);
    expect(textoPreview).toContain('FETO I:');
    expect(textoPreview).toContain('FETO II:');
    expect(textoPreview).toContain('COMUNICAÇÃO INTERVENTRICULAR SEM REPERCUSSÃO');
  });

  test('conduta aparece como seção própria quando preenchida', () => {
    const data = aplicarDiagnostico(ecoFetalInitialState, 'truncus');
    const { textoPreview } = montarTextoFetal(data);
    expect(textoPreview).toContain('=== CONDUTA ===');
  });
});

describe('Eco Fetal - Score de Huhta', () => {
  test('todas as categorias normais somam 10', () => {
    const { total } = calcularScoreHuhta(ecoFetalInitialState);
    expect(total).toBe(10);
  });

  test('uma categoria com 1 ponto reduz o total para 9', () => {
    const { total } = calcularScoreHuhta({ ...ecoFetalInitialState, huhtaFuncao: 1 });
    expect(total).toBe(9);
  });

  test('valores fora do intervalo são normalizados (clamp 0..2)', () => {
    const { total } = calcularScoreHuhta({ ...ecoFetalInitialState, huhtaHidropsia: 9, huhtaVenoso: -3 });
    // 2 (clamp de 9) + 0 (clamp de -3) + 2 + 2 + 2 = 8
    expect(total).toBe(8);
  });

  test('bloco de Huhta só entra no texto quando incluirHuhta = true', () => {
    const semHuhta = montarTextoFetal(ecoFetalInitialState).textoPreview;
    expect(semHuhta).not.toContain('SCORE DE HIDROPSIA');
    const comHuhta = montarTextoFetal({ ...ecoFetalInitialState, incluirHuhta: true }).textoPreview;
    expect(comHuhta).toContain('=== SCORE DE HIDROPSIA (HUHTA) ===');
    expect(comHuhta).toContain('Total: 10/10');
  });
});

describe('Eco Fetal - Escore-Z (segurança)', () => {
  test('nenhuma estrutura fetal está com cálculo automático habilitado (coeficientes pendentes)', () => {
    expect(isAutoZScoreAvailable('fetal_isthmus_3vv')).toBe(false);
    expect(computeZScore('fetal_isthmus_3vv', 3.5, { femurLength: 45 })).toBeNull();
  });

  test('fallback: valor manual é formatado com sinal e vírgula', () => {
    const r = resolverZScoreFetal('fetal_isthmus_3vv', 3.5, { femurLength: 45, valorManual: '0.8' });
    expect(r.auto).toBe(false);
    expect(r.valor).toBe('+0,80');
  });

  test('fallback: valor manual negativo mantém o sinal', () => {
    const r = resolverZScoreFetal('fetal_isthmus_3vv', 2, { valorManual: '-2,8' });
    expect(r.valor).toBe('-2,80');
  });

  test('sem valor manual e sem cálculo automático retorna string vazia', () => {
    const r = resolverZScoreFetal('fetal_isthmus_3vv', 2, {});
    expect(r.valor).toBe('');
  });
});
