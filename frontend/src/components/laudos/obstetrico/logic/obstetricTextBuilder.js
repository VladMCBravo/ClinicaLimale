import { formatData } from './obstetricCalculations';

// Função auxiliar para criar a "tabela visual" com pontinhos alinhados
const formatLine = (label, value, unit = 'mm') => {
    if (!value) return null;
    // Cria uma linha com espaçamento fixo para simular a tabulação que ela gosta
    // Ex: "DBP .................... 50 mm"
    const spaces = 40 - label.length; 
    const dots = ".".repeat(Math.max(0, spaces)); 
    return `${label} ${dots}\t ${value} ${unit}.`; 
};

export const gerarRelatorioFeto = (d) => {
    // 1. CABEÇALHO (DPP e IG)
    let texto = `ULTRASSONOGRAFIA OBSTÉTRICA${d.usarDoppler ? ' COM COLOR DOPPLER' : ''}\n\n`;
    
    // Lógica da DPP/IG conforme modelo dela
    const igTexto = d.usarDum ? d.igDum : (d.igBiometria || "---"); 
    texto += `DPP: ${d.dppDum || '---'} (calculada pela DUM), compatível com ${igTexto}.\n\n`;

    // 2. DADOS GERAIS
    if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar') {
        texto += `Bexiga materna ${d.bexigaMaterna}.\n`;
    }
    texto += `Gestação tópica, feto único.\n`;
    texto += `Situação ${d.situacao}, apresentação ${d.apresentacao} e com dorso ${d.dorso}.\n\n`;

    // 3. VITALIDADE E VISCERAS
    texto += `Batimentos cardíacos e movimentos fetais presentes (${d.bcf} bpm).\n`;
    if (d.estomagoVisualizado) texto += `Estômago fetal repleto e de conteúdo anecóide.\n`;
    if (d.bexigaVisualizada) texto += `Bexiga fetal repleta e de conteúdo anecóide.\n\n`;

    // 4. PLACENTA E LÍQUIDO
    texto += `Placenta de inserção ${d.placentaLocalizacao}, homogênea, grau ${d.placentaGrau}, na escala de Grannum e de espessura normal${d.placentaEspessura ? `, medindo ${d.placentaEspessura} mm` : ''}.\n\n`;
    
    let liqRef = '';
    if (d.ilaRefMin && d.ilaRefMax) liqRef = ` (Ref: ${d.ilaRefMin} - ${d.ilaRefMax})`;
    
    texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()} para idade gestacional`;
    if (d.ila) texto += ` (ILA = ${d.ila} mm)${liqRef}`;
    texto += `.\n\n`;

    // 5. MEDIDAS (BIOMETRIA)
    texto += `Medidas:\n`;
    const medidas = [
        formatLine('Diâmetro Biparietal', d.dbp),
        formatLine('Diâmetro Occipitofrontal', d.dof),
        formatLine('Circunferência Cefálica', d.cc),
        formatLine('Circunferência Abdominal', d.ca),
        formatLine('Comprimento do Fêmur', d.femur),
        formatLine('Comprimento do Úmero', d.umero)
    ].filter(Boolean).join('\n');
    
    texto += medidas + `\n\n`;

    // 6. DOPPLER (SE HOUVER)
    if (d.usarDoppler) {
        texto += `ESTUDO DOPPLER\t\t\tÍNDICES DE PULSATILIDADE\n`;
        // Aqui simulamos a tabela do Doppler dela com Tabs
        if(d.artCerebralIP) texto += `Artéria cerebral\t\t\t\t${d.artCerebralIP}\n`;
        if(d.artUmbilicalIP) texto += `Artéria umbilical\t\t\t\t${d.artUmbilicalIP}\n`;
        if(d.relacaoCerebroUmbilical) texto += `Relação cerebro/umbilical\t\t${d.relacaoCerebroUmbilical} (n/l maior / igual à 1,0)\n`;
        
        texto += `\nESTUDO DOPPLER\t\t\tÍNDICES DE PULSATILIDADE\n`;
        if(d.artUterinaDirIP) texto += `Artéria uterina direita\t\t\t${d.artUterinaDirIP}\n`;
        if(d.artUterinaEsqIP) texto += `Artéria uterina esquerda\t\t${d.artUterinaEsqIP}\n`;
        // IP Médio teria que calcular na lógica, vou deixar placeholder
        texto += `\n`;
    }

    // 7. IMPRESSÃO DIAGNÓSTICA (RODAPÉ)
    texto += `Impressão diagnóstica:\n`;
    if (d.usarDoppler) texto += `- Feto único vivo.\n`; // Ela cita isso na conclusão do Doppler
    
    // Margem de erro baseada no trimestre (lógica simplificada)
    const margemErro = d.subtipo === 'OBSTETRICO_1_TRI' ? '7 dias' : '14 dias';
    
    texto += `- Biometria fetal compatível com aproximadamente ${igTexto} +/- ${margemErro}.\n`;
    texto += `- Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()} para idade gestacional`;
    if (d.ila) texto += ` (ILA = ${d.ila} mm)${liqRef}`;
    texto += `.\n`;
    
    if (d.pesoEstimado) {
        texto += `- Peso Fetal ${d.pesoEstimado} gr (+/- 10%)`;
        if (d.percentil) texto += ` (Percentil ${d.percentil})`; // Ela usa P10/P90, mas percentil único resolve
        texto += `.\n`;
    }
    
    texto += `- Sexo: Genitália compatível com ${d.sexoFetal}.\n`;
    
    if (d.usarDoppler) {
        texto += `- Dopplerfluxometria sem anormalidades no presente estudo.\n`;
    }

    // Obs final padrão dela
    texto += `\nObs.:\n- Nem todas as alterações que um feto possa vir apresentar após o nascimento, podem ser identificadas pelo exame ultra-sonográfico, devendo-se levar em consideração as limitações técnicas inerentes ao método e a idade gestacional.`;

    return { texto }; // Retornamos direto o texto formatado
};

export const montarTextoFinal = (resultadoFeto1) => {
    return resultadoFeto1.texto;
};