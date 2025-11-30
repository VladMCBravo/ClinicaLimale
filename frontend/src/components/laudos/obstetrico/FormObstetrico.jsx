import React, { useState, useEffect, useRef } from 'react';
import { FaChartLine, FaUserFriends } from 'react-icons/fa';
import '../Laudos.css'; 
import GraficosObstetricos from '../GraficosObstetricos'; 

// Importação das Seções (Mantenha suas importações)
import SecaoSubtipo from './sections/SecaoSubtipo';
import SecaoDatacao from './sections/SecaoDatacao';
import SecaoColoDados from './sections/SecaoColoDados';
import SecaoBiometria from './sections/SecaoBiometria';
import SecaoMorfologia from './sections/SecaoMorfologia';
import SecaoAnexos from './sections/SecaoAnexos';
import SecaoDoppler from './sections/SecaoDoppler';
import SecaoIndicesGraficos from './sections/SecaoIndicesGraficos';
import SecaoConclusao from './sections/SecaoConclusao';

const FormObstetrico = ({ onUpdate }) => {
  const [isGemelar, setIsGemelar] = useState(false);
  const [fetoAtivo, setFetoAtivo] = useState(1); 
  const dadosFeto1 = useRef(null);
  const dadosFeto2 = useRef(null);
  const [mostrarGraficos, setMostrarGraficos] = useState(false);

  const initialState = {
      subtipo: 'OBSTETRICO_MORFOLOGICO',
      // ... (Mantenha os campos de Datação e Colo originais aqui)
      dum: '', usarDum: true, dumDesconhecida: false, naoUsarDum: false,
      igDum: '', dppDum: '', exibirDataDum: true, citarDppDum: false, usarDumComoBase: false,
      citarDppBiometria: true, referirIgAnterior: true, usarIgAnteriorComoBase: false,
      dataExameAnterior: '', igAnteriorSemanas: '', igAnteriorDias: '', citarDppIgCorrigida: false,
      citarColoNormal: false, citarComprimentoColo: false, medidaColo: '',
      situacao: 'Longitudinal', apresentacao: 'Cefálica', dorso: 'Esquerda',

      // Biometria
      dbp: '', dof: '', cc: '', ca: '', femur: '', umero: '',
      ulna: '', tibia: '', radio: '', fibula: '', pe: '',
      incDbp: true, incDof: true, incCc: true, incCa: true, incFemur: true,
      
      // Peso e Índices (ADICIONADOS OS CAMPOS 'res...')
      pesoEstimado: '', percentil: '', checkPeso: true,
      resIc: '', resCcCa: '', resCfCa: '', resCfDbp: '', resCfCc: '', // <--- NOVOS CAMPOS PARA VALORES CALCULADOS
      citarValoresNormais: true, 
      checkIndiceCefalico: false, checkRelacaoCcCa: false, checkRelacaoCfCa: false, 
      checkRelacaoCfDbp: false, checkRelacaoCfCc: false,

      // Gráficos
      checkGraficoPeso: true, checkGraficoDbp: true, checkGraficoFemur: true, 
      checkGraficoUmero: true, checkGraficoCa: true, checkGraficoCc: true,

      // ... (Mantenha Morfologia, Anexos, Doppler, Conclusao originais)
      morfColuna: true, morfCranio: true, morfCerebro: true, morfFace: true,
      morfTorax: true, morfPulmoes: true, morfCoracao: true, morfVasosBase: false,
      morfEstomago: true, morfFigado: true, morfVesicula: false, morfAlcas: false,
      morfRins: true, morfBexiga: true, morfParedeAbd: true,
      morfGenitalia: true, morfMembros: true, sexoFetal: 'MASCULINO',
      bcf: '140', movFetal: true, degluticao: false,
      cordaoNormal: true, cordaoCircular: 'não citar',
      placentaInsercao: 'Corporal Posterior', placentaAspecto: 'Normal', placentaEspessura: '',
      liquidoVolume: 'Normal', ila: '', maiorBolso: '',
      usarDoppler: false,
      // ... (Campos de Doppler omitidos para brevidade, mantenha os seus)
      conclusaoNormal: false, obsAdicionais: ''
  };

  const [data, setData] = useState(initialState);

  // --- AUTOMAÇÃO TURING (CÁLCULOS + CHECKBOXES) ---
  useEffect(() => {
    const dbp = parseFloat(data.dbp);
    const dof = parseFloat(data.dof);
    const cc = parseFloat(data.cc);
    const ca = parseFloat(data.ca);
    const femur = parseFloat(data.femur);
    const umero = parseFloat(data.umero);
    const peso = parseFloat(data.pesoEstimado);

    const safeCalc = (val) => (isFinite(val) && !isNaN(val)) ? val.toFixed(2).replace('.', ',') : ''; // Formata para PT-BR

    setData(prev => {
      const newState = { ...prev };
      let houveMudanca = false;

      // 1. Cálculos Matemáticos (Centralizados no Pai)
      const novoIc = (dbp && dof) ? safeCalc((dbp/dof)*100) : '';
      const novoCcCa = (cc && ca) ? safeCalc(cc/ca) : '';
      const novoCfCa = (femur && ca) ? safeCalc((femur/ca)*100) : '';
      const novoCfDbp = (femur && dbp) ? safeCalc((femur/dbp)*100) : '';
      const novoCfCc = (femur && cc) ? safeCalc((femur/cc)*100) : '';

      // Atualiza valores se mudaram
      if(prev.resIc !== novoIc) { newState.resIc = novoIc; houveMudanca = true; }
      if(prev.resCcCa !== novoCcCa) { newState.resCcCa = novoCcCa; houveMudanca = true; }
      if(prev.resCfCa !== novoCfCa) { newState.resCfCa = novoCfCa; houveMudanca = true; }
      if(prev.resCfDbp !== novoCfDbp) { newState.resCfDbp = novoCfDbp; houveMudanca = true; }
      if(prev.resCfCc !== novoCfCc) { newState.resCfCc = novoCfCc; houveMudanca = true; }

      // 2. Lógica dos Checkboxes (Ativa se tiver dados)
      // Só ativa automaticamente se estava false. Se o usuário desmarcou manualmente, respeitamos (opcional, aqui forcei true se tiver dados igual ao Turing)
      if (prev.checkIndiceCefalico !== (!!novoIc)) { newState.checkIndiceCefalico = !!novoIc; houveMudanca = true; }
      if (prev.checkRelacaoCcCa !== (!!novoCcCa)) { newState.checkRelacaoCcCa = !!novoCcCa; houveMudanca = true; }
      if (prev.checkRelacaoCfCa !== (!!novoCfCa)) { newState.checkRelacaoCfCa = !!novoCfCa; houveMudanca = true; }
      if (prev.checkRelacaoCfDbp !== (!!novoCfDbp)) { newState.checkRelacaoCfDbp = !!novoCfDbp; houveMudanca = true; }
      if (prev.checkRelacaoCfCc !== (!!novoCfCc)) { newState.checkRelacaoCfCc = !!novoCfCc; houveMudanca = true; }

      // 3. Gráficos
      if (prev.checkGraficoDbp !== !!dbp) { newState.checkGraficoDbp = !!dbp; houveMudanca = true; }
      if (prev.checkGraficoCc !== !!cc) { newState.checkGraficoCc = !!cc; houveMudanca = true; }
      if (prev.checkGraficoCa !== !!ca) { newState.checkGraficoCa = !!ca; houveMudanca = true; }
      if (prev.checkGraficoFemur !== !!femur) { newState.checkGraficoFemur = !!femur; houveMudanca = true; }
      if (prev.checkGraficoUmero !== !!umero) { newState.checkGraficoUmero = !!umero; houveMudanca = true; }
      if (prev.checkGraficoPeso !== !!peso) { newState.checkGraficoPeso = !!peso; houveMudanca = true; }

      return houveMudanca ? newState : prev;
    });

  }, [data.dbp, data.dof, data.cc, data.ca, data.femur, data.umero, data.pesoEstimado]);

  // --- HANDLERS E EFEITOS DE TEXTO ---
  // (Mantenha initialState, handleChange, handleDatacaoChange, toggleGemelar, handleTabChange iguais)
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleDatacaoChange = (tipo) => { /* ...seu código... */ };
  const toggleGemelar = (e) => { /* ...seu código... */ };
  const handleTabChange = (novoFeto) => { /* ...seu código... */ };

  useEffect(() => {
     if (!dadosFeto1.current) dadosFeto1.current = { ...initialState };
     if (!dadosFeto2.current) dadosFeto2.current = { ...initialState };
     // eslint-disable-next-line
  }, []);

  // --- GERAÇÃO DE TEXTO ---
  useEffect(() => {
    if (fetoAtivo === 1) dadosFeto1.current = data;
    else dadosFeto2.current = data;

    const gerarTextoFeto = (d, indice) => {
        let t = '';
        if (isGemelar) t += `\n--- FETO ${indice} ---\n`;

        // ... (Dados iniciais, Colo e Biometria iguais ao seu código) ...
        t += `Feto em situação ${d.situacao ? d.situacao.toLowerCase() : 'longitudinal'}, apresentação ${d.apresentacao ? d.apresentacao.toLowerCase() : 'cefálica'}, dorso ${d.dorso ? d.dorso.toLowerCase() : 'lateral'}.\n`;
        if (d.citarColoNormal) t += `Colo uterino de aspecto ecográfico normal (fechado).\n`;
        if (d.citarComprimentoColo && d.medidaColo) t += `Comprimento do colo aferido em ${d.medidaColo} mm.\n`;
        t += `Batimentos cardiofetais presentes e rítmicos (${d.bcf} bpm). Movimentação fetal ativa.\n\n`;

        t += `BIOMETRIA FETAL:\n`;
        const bios = [];
        if(d.dbp) bios.push(`DBP: ${d.dbp} mm`);
        if(d.dof) bios.push(`DOF: ${d.dof} mm`);
        if(d.cc) bios.push(`CC: ${d.cc} mm`);
        if(d.ca) bios.push(`CA: ${d.ca} mm`);
        if(d.femur) bios.push(`Fêmur: ${d.femur} mm`);
        t += bios.join(' | ') + '.\n';
        if (d.pesoEstimado && d.checkPeso) t += `Peso Fetal Estimado: ${d.pesoEstimado} g.\n`;

        // --- NOVA PARTE: ÍNDICES CALCULADOS NO TEXTO ---
        const indicesTxt = [];
        const vn = d.citarValoresNormais ? " (VN: 70-86%)" : ""; // Exemplo de VN
        if (d.checkIndiceCefalico && d.resIc) indicesTxt.push(`Índice Cefálico: ${d.resIc}%${d.citarValoresNormais ? '(VN: 70-86%)' : ''}`);
        if (d.checkRelacaoCcCa && d.resCcCa) indicesTxt.push(`Rel. CC/CA: ${d.resCcCa}`);
        if (d.checkRelacaoCfCa && d.resCfCa) indicesTxt.push(`Rel. Fêmur/CA: ${d.resCfCa}%`);
        if (d.checkRelacaoCfDbp && d.resCfDbp) indicesTxt.push(`Rel. Fêmur/DBP: ${d.resCfDbp}%`);
        
        if (indicesTxt.length > 0) {
            t += `Relações biométricas: ${indicesTxt.join(' | ')}.\n`;
        }
        // -----------------------------------------------

        // ... (Resto do texto: Morfologia, Anexos, Conclusão) ...
        t += `\nANATOMIA FETAL:\n`; // (Seu código original de morfologia...)
        // (Simplificado aqui para caber na resposta, use o seu bloco original de morfologia e anexos)
        const morf = [];
        if (d.morfCranio) morf.push("Crânio e encéfalo");
        if (d.morfCoracao) morf.push("Coração");
        // ...etc
        if (morf.length > 0) t += `Visualizados com aspecto habitual: ${morf.join(', ')}.\n`;
        
        t += `\nANEXOS:\n`;
        t += `Placenta ${d.placentaInsercao.toLowerCase()}, aspecto ${d.placentaAspecto.toLowerCase()}. \n`;
        t += `Líquido amniótico: ${d.liquidoVolume.toLowerCase()}. ${d.ila ? `ILA: ${d.ila} cm.` : ''}\n`;

        return t;
    };

    // ... (Montagem Final igual ao seu código)
    let textoFinal = '';
    const mapTitulo = {
        'OBSTETRICO_MORFOLOGICO': 'ULTRASSONOGRAFIA MORFOLÓGICA FETAL',
        'OBSTETRICO_1_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA DE 1º TRIMESTRE',
        'OBSTETRICO_2_3_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA'
    };
    textoFinal += `${mapTitulo[data.subtipo] || 'ULTRASSONOGRAFIA OBSTÉTRICA'}`;
    if (isGemelar) textoFinal += ` - GESTAÇÃO GEMELAR`;
    textoFinal += `\n\n`;

    if (data.dum && data.usarDum) {
        const d = new Date(data.dum + 'T12:00:00');
        textoFinal += `DUM: ${d.toLocaleDateString('pt-BR')} (Referida).\n\n`;
    }

    textoFinal += gerarTextoFeto(dadosFeto1.current || data, 1);
    if (isGemelar && dadosFeto2.current) {
        textoFinal += gerarTextoFeto(dadosFeto2.current, 2);
    }
    
    // Conclusão
    textoFinal += `\nCONCLUSÃO:\n`;
    textoFinal += `Gestação tópica, ${isGemelar ? 'gemelar' : 'feto único'}, vivo(s).\n`;
    // Automação da Conclusão
    if (data.conclusaoNormal) textoFinal += `Desenvolvimento fetal compatível com a idade gestacional.\n`;
    if (data.obsAdicionais) textoFinal += `\nOBS: ${data.obsAdicionais}`;

    onUpdate({ 
        texto: textoFinal, 
        dadosEstruturados: { feto1: dadosFeto1.current, feto2: dadosFeto2.current, isGemelar }, 
        tituloExame: mapTitulo[data.subtipo] 
    });

  }, [data, isGemelar, fetoAtivo, onUpdate]);

  // (Return igual ao seu código)
  return (
    <div className="laudo-container">
       {/* ... Estrutura visual igual ao original ... */}
       <div style={{ opacity: isGemelar && fetoAtivo === 2 ? 0.95 : 1 }}>
          <SecaoSubtipo data={data} handleChange={handleChange} />
          <SecaoDatacao data={data} handleChange={handleChange} handleDatacaoChange={handleDatacaoChange} />
          <SecaoColoDados data={data} handleChange={handleChange} />
          <SecaoBiometria data={data} handleChange={handleChange} />
          <div style={{ margin: '5px 0' }}>
              <SecaoIndicesGraficos data={data} handleChange={handleChange} />
          </div>
          {/* ... botões gráficos ... */}
          <SecaoMorfologia data={data} handleChange={handleChange} />
          <SecaoAnexos data={data} handleChange={handleChange} />
          <SecaoDoppler data={data} handleChange={handleChange} />
          <SecaoConclusao data={data} handleChange={handleChange} />
      </div>
    </div>
  );
};

export default FormObstetrico;