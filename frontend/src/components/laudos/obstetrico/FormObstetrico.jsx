import React, { useState, useEffect } from 'react';
import { FaChartLine } from 'react-icons/fa';
import GraficosObstetricos from '../../GraficosObstetricos'; // Ajuste o caminho se necessário

// Importação das Seções Modulares
import SecaoSubtipo from './sections/SecaoSubtipo';
import SecaoDatacao from './sections/SecaoDatacao';
import SecaoColoDados from './sections/SecaoColoDados';
import SecaoBiometria from './sections/SecaoBiometria';
// NOVOS:
import SecaoMorfologia from './sections/SecaoMorfologia';
import SecaoAnexos from './sections/SecaoAnexos';
import SecaoDoppler from './sections/SecaoDoppler';
import SecaoConclusao from './sections/SecaoConclusao';

const FormObstetrico = ({ onUpdate }) => {
  const [mostrarGraficos, setMostrarGraficos] = useState(false);

  // --- O GRANDE ESTADO (CÉREBRO) ---
  const [data, setData] = useState({
    // 1. SUBTIPO
    subtipo: 'OBSTETRICO_MORFOLOGICO',

    // 2. DATAÇÃO
    dum: '', usarDum: true, dumDesconhecida: false, naoUsarDum: false,
    igDum: '', dppDum: '',
    usarIgAnterior: false, dataExameAnterior: '', igAnteriorSemanas: '', igAnteriorDias: '',

    // 3. COLO E DADOS INICIAIS
    citarColoNormal: false, citarComprimentoColo: false, medidaColo: '',
    situacao: 'Longitudinal', apresentacao: 'Cefálica',
    dorso: 'Esquerda', poloCefalico: 'Fúndica',

    // 4. BIOMETRIA (COMPLETA - IGUAL PRINT)
    dbp: '', dof: '', cc: '', ca: '', femur: '', umero: '',
    ulna: '', tibia: '', radio: '', fibula: '', pe: '',
    diametroBinocular: '', diametroInterocular: '',
    cerebelo: '', cisternaMagna: '', ventriculoLat: '',
    toraxTrans: '', toraxAP: '',
    ossoNasal: '', pregaNucal: '',
    
    // Checkboxes de inclusão na IG (Print 3)
    incDbp: true, incDof: true, incCc: true, incCa: true, incFemur: true,

    // 5. PESO E ÍNDICES
    pesoEstimado: '', percentil: '',
    indiceCefalico: '', relacaoCcCa: '', relacaoFlAc: '',

    // 6. MORFOLOGIA
    morfColuna: true, morfCranio: true, morfCerebro: true, morfFace: true,
    morfTorax: true, morfPulmoes: true, morfCoracao: true, morfVasosBase: false,
    morfEstomago: true, morfFigado: true, morfVesicula: false, morfAlcas: false,
    morfRins: true, morfBexiga: true, morfParedeAbd: true,
    morfGenitalia: true, morfMembros: true, morfFalange: false,
    sexoFetal: 'MASCULINO', gemelar: false,

    // ... (Adicionaremos Anexos e Doppler na continuação se precisar)
  });

  // --- HANDLER GENÉRICO ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- CÁLCULOS E EFEITOS (Simulação do Backend Delphi) ---
  useEffect(() => {
    let updates = {};
    
    // Cálculos de Índices
    const dbp = parseFloat(data.dbp);
    const dof = parseFloat(data.dof);
    const cc = parseFloat(data.cc);
    const ca = parseFloat(data.ca);
    const fl = parseFloat(data.femur);

    if (dbp && dof) updates.indiceCefalico = ((dbp / dof) * 100).toFixed(1);
    if (cc && ca) updates.relacaoCcCa = (cc / ca).toFixed(2);
    if (fl && ca) updates.relacaoFlAc = ((fl / ca) * 100).toFixed(1);

    // Geração do Texto (Resumido para o exemplo funcionar)
    let t = `ULTRASSONOGRAFIA ${data.subtipo === 'OBSTETRICO_MORFOLOGICO' ? 'MORFOLÓGICA FETAL' : 'OBSTÉTRICA'}\n\n`;
    
    // Aqui você monta o texto completo concatenando os campos...
    // (Posso fornecer a lógica de texto completa depois, focando na estrutura agora)
    
    onUpdate({ texto: t, dadosEstruturados: { ...data, ...updates }, tituloExame: "US Obstétrico" });
  }, [data, onUpdate]);

  // Helper para gráfico
  const getIgNumerica = () => {
      if(!data.dum) return 20; // Placeholder
      const dias = Math.floor((new Date() - new Date(data.dum+'T12:00:00')) / (86400000));
      return (dias/7).toFixed(1);
  };

  return (
    <div style={{ fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: '11px', color: '#333', maxWidth: '800px', margin: '0 auto' }}>
      
      <SecaoSubtipo data={data} handleChange={handleChange} />
      <SecaoDatacao data={data} handleChange={handleChange} />
      <SecaoColoDados data={data} handleChange={handleChange} />
      
      {/* Botão de Gráficos (Opcional onde colocar, geralmente após biometria) */}
      <div style={{ margin: '5px 0', border: '1px solid #ddd', padding: '5px', background: '#f9f9f9', borderRadius: '4px' }}>
          <button onClick={() => setMostrarGraficos(!mostrarGraficos)} style={{cursor: 'pointer', border: 'none', background: 'transparent', color: '#1565C0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px'}}>
              <FaChartLine /> {mostrarGraficos ? 'Ocultar Curvas de Crescimento' : 'Visualizar Curvas de Crescimento (Hadlock)'}
          </button>
          {mostrarGraficos && <GraficosObstetricos igSemanas={getIgNumerica()} peso={data.pesoEstimado} femur={data.femur} />}
      </div>

      <SecaoBiometria data={data} handleChange={handleChange} />
      <SecaoMorfologia data={data} handleChange={handleChange} />
      <SecaoAnexos data={data} handleChange={handleChange} />
      <SecaoDoppler data={data} handleChange={handleChange} />
      <SecaoConclusao data={data} handleChange={handleChange} />

    </div>
  );
};

export default FormObstetrico;