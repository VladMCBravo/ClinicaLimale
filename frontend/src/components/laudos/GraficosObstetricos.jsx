import React from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter } from 'recharts';
import { curvaPeso, curvaFemur } from './dados/hadlockData';

const styles = {
  container: { background: '#fff', border: '1px solid #ccc', borderRadius: '4px', padding: '10px', marginTop: '10px' },
  title: { fontSize: '12px', fontWeight: 'bold', color: '#2E7D32', marginBottom: '10px', textAlign: 'center' },
  chartWrapper: { height: '200px', width: '100%', fontSize: '10px' }
};

const GraficoBase = ({ titulo, dadosReferencia, pontoPaciente, unidade }) => {
  // Mescla os dados de referência com o ponto do paciente se a semana bater
  // Truque: O Scatter do Recharts precisa de um array separado ou ser injetado nos dados
  const dadosComPaciente = dadosReferencia.map(d => {
    // Se a semana do dado de referência for próxima da semana do paciente (+- 1 semana), plotamos
    if (pontoPaciente && Math.abs(d.sem - pontoPaciente.x) < 1) {
        return { ...d, paciente: pontoPaciente.y };
    }
    return d;
  });

  // Se o paciente tem uma semana quebrada (ex: 21), adicionamos ele artificialmente para o gráfico
  if (pontoPaciente && !dadosComPaciente.find(d => d.sem === Math.floor(pontoPaciente.x))) {
     dadosComPaciente.push({ sem: pontoPaciente.x, paciente: pontoPaciente.y });
     dadosComPaciente.sort((a,b) => a.sem - b.sem);
  }

  return (
    <div style={{ flex: 1, minWidth: '300px' }}>
      <div style={styles.title}>{titulo}</div>
      <div style={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dadosComPaciente} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid stroke="#f5f5f5" />
            <XAxis dataKey="sem" type="number" domain={['dataMin', 'dataMax']} unit=" sem" tick={{fontSize: 10}} />
            <YAxis unit={` ${unidade}`} tick={{fontSize: 10}} domain={['auto', 'auto']}/>
            <Tooltip contentStyle={{fontSize:'12px'}} />
            
            {/* Faixa de Normalidade (Area entre P10 e P90) */}
            {/* Truque visual: desenhamos a área do P90 e cobrimos a parte de baixo com branco se fosse complexo, 
                mas aqui usaremos Area stackId ou range se a lib permitir. 
                Simplificação para Recharts: Desenhamos 3 linhas (P10, P50, P90) */}
            
            <Line type="monotone" dataKey="p90" stroke="#81C784" strokeDasharray="3 3" dot={false} strokeWidth={1} name="P90" />
            <Line type="monotone" dataKey="p50" stroke="#388E3C" dot={false} strokeWidth={2} name="Média (P50)" />
            <Line type="monotone" dataKey="p10" stroke="#81C784" strokeDasharray="3 3" dot={false} strokeWidth={1} name="P10" />

            {/* O Ponto do Paciente */}
            <Scatter name="Paciente" dataKey="paciente" fill="#D32F2F" shape="circle" r={6} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const GraficosObstetricos = ({ igSemanas, peso, femur }) => {
  // Prepara os dados do paciente atual
  const pontoPeso = (igSemanas && peso) ? { x: parseFloat(igSemanas), y: parseFloat(peso) } : null;
  const pontoFemur = (igSemanas && femur) ? { x: parseFloat(igSemanas), y: parseFloat(femur) } : null;

  if (!igSemanas) return null;

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        <GraficoBase 
            titulo="Curva de Crescimento Fetal (Hadlock) - PESO" 
            dadosReferencia={curvaPeso} 
            pontoPaciente={pontoPeso}
            unidade="g"
        />
        <GraficoBase 
            titulo="Curva de Comprimento do Fêmur" 
            dadosReferencia={curvaFemur} 
            pontoPaciente={pontoFemur}
            unidade="mm"
        />
      </div>
    </div>
  );
};

export default GraficosObstetricos;