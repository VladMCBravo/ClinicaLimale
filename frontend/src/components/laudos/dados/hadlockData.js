// src/components/laudos/dados/hadlockData.js

// Dados Simplificados de Hadlock (Peso em gramas)
// Estrutura: semana, p10 (limite inferior), p50 (média), p90 (limite superior)
export const curvaPeso = [
  { sem: 14, p10: 35, p50: 45, p90: 55 },
  { sem: 16, p10: 85, p50: 100, p90: 120 },
  { sem: 18, p10: 180, p50: 220, p90: 260 },
  { sem: 20, p10: 300, p50: 350, p90: 400 }, // Ponto chave morfológico
  { sem: 22, p10: 450, p50: 530, p90: 600 },
  { sem: 24, p10: 630, p50: 730, p90: 830 },
  { sem: 26, p10: 850, p50: 960, p90: 1100 },
  { sem: 28, p10: 1100, p50: 1250, p90: 1400 },
  { sem: 30, p10: 1400, p50: 1600, p90: 1800 },
  { sem: 32, p10: 1800, p50: 2000, p90: 2250 },
  { sem: 34, p10: 2250, p50: 2500, p90: 2750 },
  { sem: 36, p10: 2600, p50: 2900, p90: 3200 },
  { sem: 38, p10: 2900, p50: 3300, p90: 3600 },
  { sem: 40, p10: 3100, p50: 3600, p90: 4000 },
];

// Dados Simplificados de Fêmur (em mm)
export const curvaFemur = [
  { sem: 14, p10: 12, p50: 15, p90: 18 },
  { sem: 16, p10: 18, p50: 21, p90: 24 },
  { sem: 20, p10: 30, p50: 33, p90: 36 },
  { sem: 24, p10: 40, p50: 44, p90: 48 },
  { sem: 28, p10: 50, p50: 54, p90: 58 },
  { sem: 32, p10: 59, p50: 63, p90: 67 },
  { sem: 36, p10: 66, p50: 70, p90: 74 },
  { sem: 40, p10: 72, p50: 76, p90: 80 },
];