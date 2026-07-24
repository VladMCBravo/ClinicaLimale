/**
 * Gerador de tabelas LMS da OMS (WHO Child Growth Standards 2006, 0–5 anos).
 *
 * NÃO é código de runtime — é um utilitário de build/proveniência. Baixa os
 * arquivos oficiais do repositório da própria OMS e emite JSON compacto.
 * Rode manualmente quando quiser regenerar:
 *
 *     node src/utils/growth/data/_generateWhoData.js
 *
 * Fonte: WorldHealthOrganization/anthro, data-raw/growthstandards/*.txt
 * (colunas: sex[1=M,2=F], age[dias 0–1826], l, m, s)
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://raw.githubusercontent.com/WorldHealthOrganization/anthro/master/data-raw/growthstandards';

const INDICADORES = [
    { arquivo: 'weianthro', indicador: 'weight-for-age', rotulo: 'Peso para idade' },
    { arquivo: 'lenanthro', indicador: 'length-height-for-age', rotulo: 'Comprimento/estatura para idade' },
    { arquivo: 'hcanthro', indicador: 'head-circumference-for-age', rotulo: 'Perímetro cefálico para idade' },
    { arquivo: 'bmianthro', indicador: 'bmi-for-age', rotulo: 'IMC para idade' },
];

const baixar = (url) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} em ${url}`)); return; }
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => resolve(data));
    }).on('error', reject);
});

const parse = (txt) => {
    const linhas = txt.trim().split('\n');
    // header: sex age l m s
    const out = { M: { L: [], M: [], S: [] }, F: { L: [], M: [], S: [] } };
    for (let i = 1; i < linhas.length; i++) {
        const cols = linhas[i].split('\t').map((c) => c.trim());
        if (cols.length < 5) continue;
        const sexo = cols[0] === '1' ? 'M' : 'F';
        const age = parseInt(cols[1], 10);
        out[sexo].L[age] = parseFloat(cols[2]);
        out[sexo].M[age] = parseFloat(cols[3]);
        out[sexo].S[age] = parseFloat(cols[4]);
    }
    return out;
};

(async () => {
    for (const ind of INDICADORES) {
        const url = `${BASE}/${ind.arquivo}.txt`;
        process.stdout.write(`Baixando ${ind.arquivo}.txt ... `);
        const txt = await baixar(url);
        const parsed = parse(txt);
        const json = {
            indicador: ind.indicador,
            rotulo: ind.rotulo,
            source: `WHO Child Growth Standards 2006 — WorldHealthOrganization/anthro (data-raw/growthstandards/${ind.arquivo}.txt)`,
            ageUnit: 'days',
            range: [0, parsed.M.L.length - 1],
            M: parsed.M,
            F: parsed.F,
        };
        const destino = path.join(__dirname, `who_${ind.indicador}.json`);
        fs.writeFileSync(destino, JSON.stringify(json));
        console.log(`ok (${parsed.M.M.length} idades/sexo) -> ${path.basename(destino)}`);
    }
    console.log('Concluído.');
})().catch((e) => { console.error('FALHA:', e.message); process.exit(1); });
