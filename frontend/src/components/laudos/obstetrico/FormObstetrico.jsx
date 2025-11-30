import React, { useState, useEffect, useRef } from 'react';
import { FaChartLine, FaUserFriends } from 'react-icons/fa';
import '../Laudos.css'; // O CSS Global
import GraficosObstetricos from '../GraficosObstetricos'; 

// Importação das Seções
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
  // --- ESTADO GEMELAR ---
  const [isGemelar, setIsGemelar] = useState(false);
  const [fetoAtivo, setFetoAtivo] = useState(1); // 1 ou 2
  
  // Refs para guardar os dados "em background" sem re-renderizar tudo agora
  const dadosFeto1 = useRef(null);
  const dadosFeto2 = useRef(null);

  const [mostrarGraficos, setMostrarGraficos] = useState(false);

  // Estado Inicial (vazio/padrão)
  const initialState = {
      subtipo: 'OBSTETRICO_MORFOLOGICO',
      // Datação
      dum: '', usarDum: true, dumDesconhecida: false, naoUsarDum: false,
      igDum: '', dppDum: '',
      exibirDataDum: true, citarDppDum: false, usarDumComoBase: false,
      citarDppBiometria: true,
      referirIgAnterior: true, usarIgAnteriorComoBase: false,
      dataExameAnterior: '', igAnteriorSemanas: '', igAnteriorDias: '',
      citarDppIgCorrigida: false,

      // Colo e Dados
      citarColoNormal: false, citarComprimentoColo: false, medidaColo: '',
      situacao: 'Longitudinal', apresentacao: 'Cefálica', dorso: 'Esquerda',
      
      // Biometria
      dbp: '', dof: '', cc: '', ca: '', femur: '', umero: '',
      ulna: '', tibia: '', radio: '', fibula: '', pe: '',
      diametroBinocular: '', diametroInterocular: '',
      cerebelo: '', cisternaMagna: '', ventriculoLat: '', toraxTrans: '', toraxAP: '',
      ossoNasal: '', pregaNucal: '',
      incDbp: true, incDof: true, incCc: true, incCa: true, incFemur: true,
      
      // Peso e Índices
      pesoEstimado: '', percentil: '', checkPeso: true,
      indiceCefalico: '', relacaoCcCa: '', relacaoFlAc: '',
      citarValoresNormais: true, checkIndiceCefalico: true, checkRelacaoCcCa: true, 
      checkRelacaoCfCa: true, checkRelacaoCfDbp: false, checkRelacaoCfCc: false,

      // Gráficos
      checkGraficoPeso: true, checkGraficoDbp: true, checkGraficoFemur: true, 
      checkGraficoUmero: true, checkGraficoCa: true, checkGraficoCc: true,

      // Morfologia
      morfColuna: true, morfCranio: true, morfCerebro: true, morfFace: true,
      morfTorax: true, morfPulmoes: true, morfCoracao: true, morfVasosBase: false,
      morfEstomago: true, morfFigado: true, morfVesicula: false, morfAlcas: false,
      morfRins: true, morfBexiga: true, morfParedeAbd: true,
      morfGenitalia: true, morfMembros: true, morfFalange: false,
      sexoFetal: 'MASCULINO',
      bcf: '140', movFetal: true, degluticao: false,
      
      // Anexos
      cordaoNormal: true, cordaoCircular: 'não citar',
      placentaInsercao: 'Corporal Posterior', placentaAspecto: 'Normal', placentaEspessura: '',
      liquidoVolume: 'Normal', ila: '', maiorBolso: '',
      
      // Doppler
      usarDoppler: false,
      checkUtDir: true, checkUtDirSD: false, utDirSD: '', checkUtDirIR: true, utDirIR: '', checkUtDirIP: true, utDirIP: '', utDirIncisura: false,
      checkUtEsq: true, checkUtEsqSD: false, utEsqSD: '', checkUtEsqIR: true, utEsqIR: '', checkUtEsqIP: true, utEsqIP: '', utEsqIncisura: false,
      utIpMedio: '', 
      checkUmb: true, checkUmbSD: false, umbSD: '', checkUmbIR: true, umbIR: '', checkUmbIP: true, umbIP: '', umbTraçadoNormal: true, umbDiastoleBaixa: false, umbDiastoleZero: false, umbDiastoleReversa: false,
      checkAcm: true, checkAcmPVS: true, acmPVS: '', checkAcmSD: false, acmSD: '', checkAcmIR: true, acmIR: '', checkAcmIP: true, acmIP: '', acmTraçadoNormal: true, acmDiastoleAlta: false,
      checkDv: true, checkDvIP: false, dvIP: '', dvTraçadoNormal: true, dvOndaAZero: false, dvOndaAReversa: false,

      // Conclusão
      conclusaoNormal: false,
      obsAdicionais: ''
  };

  const [data, setData] = useState(initialState);

  // --- INICIALIZAÇÃO DE REFS ---
  useEffect(() => {
    if (!dadosFeto1.current) dadosFeto1.current = { ...initialState };
    if (!dadosFeto2.current) dadosFeto2.current = { ...initialState };
    // eslint-disable-next-line
  }, []);

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleDatacaoChange = (tipo) => {
      if (tipo === 'USAR_DUM') {
          setData(prev => ({ ...prev, usarDum: true, dumDesconhecida: false, naoUsarDum: false }));
      } else if (tipo === 'DUM_DESCONHECIDA') {
          setData(prev => ({ ...prev, usarDum: false, dumDesconhecida: true, naoUsarDum: false }));
      } else if (tipo === 'NAO_USAR_DUM') {
          setData(prev => ({ ...prev, usarDum: false, dumDesconhecida: false, naoUsarDum: true }));
      }
  };

  // --- LÓGICA GEMELAR ---
  const toggleGemelar = (e) => {
    const checked = e.target.checked;
    setIsGemelar(checked);
    if (!checked) {
        setFetoAtivo(1);
        if(dadosFeto1.current) setData({ ...dadosFeto1.current });
    } else {
        // Salva estado atual no feto 1 antes de ativar
        dadosFeto1.current = { ...data };
        // Inicializa feto 2 com dados básicos do 1 se estiver vazio
        if (!dadosFeto2.current || !dadosFeto2.current.dum) {
            dadosFeto2.current = { ...initialState, dum: data.dum, usarDum: data.usarDum, subtipo: data.subtipo };
        }
    }
  };

  const handleTabChange = (novoFeto) => {
      if (novoFeto === fetoAtivo) return;
      // 1. Salva o feto atual
      if (fetoAtivo === 1) dadosFeto1.current = { ...data };
      else dadosFeto2.current = { ...data };

      // 2. Carrega o novo feto
      const dadosNovo = novoFeto === 1 ? dadosFeto1.current : dadosFeto2.current;
      setData({ ...dadosNovo });
      setFetoAtivo(novoFeto);
  };

  // --- GERAÇÃO DE TEXTO ---
  useEffect(() => {
    // Mantém o ref atualizado com o que está na tela
    if (fetoAtivo === 1) dadosFeto1.current = data;
    else dadosFeto2.current = data;

    // Função para gerar texto de um único feto
    const gerarTextoFeto = (d, indice) => {
        let t = '';
        if (isGemelar) t += `\n--- FETO ${indice} ---\n`;

        // Dados Iniciais e Colo
        t += `Feto em situação ${d.situacao ? d.situacao.toLowerCase() : 'longitudinal'}, apresentação ${d.apresentacao ? d.apresentacao.toLowerCase() : 'cefálica'}, dorso ${d.dorso ? d.dorso.toLowerCase() : 'lateral'}.\n`;
        if (d.citarColoNormal) t += `Colo uterino de aspecto ecográfico normal (fechado).\n`;
        if (d.citarComprimentoColo && d.medidaColo) t += `Comprimento do colo aferido em ${d.medidaColo} mm.\n`;
        t += `Batimentos cardiofetais presentes e rítmicos (${d.bcf} bpm). Movimentação fetal ativa.\n\n`;

        // Biometria
        t += `BIOMETRIA FETAL:\n`;
        const bios = [];
        if(d.dbp) bios.push(`DBP: ${d.dbp} mm`);
        if(d.dof) bios.push(`DOF: ${d.dof} mm`);
        if(d.cc) bios.push(`CC: ${d.cc} mm`);
        if(d.ca) bios.push(`CA: ${d.ca} mm`);
        if(d.femur) bios.push(`Fêmur: ${d.femur} mm`);
        t += bios.join(' | ') + '.\n';
        if (d.pesoEstimado && d.checkPeso) t += `Peso Fetal Estimado: ${d.pesoEstimado} g.\n`;

        // Morfologia
        t += `\nANATOMIA FETAL:\n`;
        const morf = [];
        if (d.morfCranio) morf.push("Crânio e encéfalo");
        if (d.morfCoracao) morf.push("Coração");
        if (d.morfEstomago) morf.push("Estômago");
        if (d.morfRins) morf.push("Rins");
        if (d.morfBexiga) morf.push("Bexiga");
        if (d.morfParedeAbd) morf.push("Parede abdominal");
        if (d.morfMembros) morf.push("Membros");
        if (morf.length > 0) t += `Visualizados com aspecto habitual: ${morf.join(', ')}.\n`;
        t += `Genitália externa compatível com sexo ${d.sexoFetal ? d.sexoFetal.toLowerCase() : ''}.\n`;

        // Anexos
        t += `\nANEXOS:\n`;
        t += `Placenta ${d.placentaInsercao.toLowerCase()}, aspecto ${d.placentaAspecto.toLowerCase()}. \n`;
        t += `Líquido amniótico: ${d.liquidoVolume.toLowerCase()}. ${d.ila ? `ILA: ${d.ila} cm.` : ''}\n`;

        // Doppler (Simplificado para o exemplo, mas segue a lógica do anterior)
        if (d.usarDoppler) {
             t += `\nDOPPLERFLUXOMETRIA:\n`;
             if (d.checkUmb) t += `Art. Umbilical: IP ${d.umbIP || '--'}.\n`;
             if (d.checkAcm) t += `ACM: PVS ${d.acmPVS || '--'} cm/s.\n`;
        }

        return t;
    };

    // Montagem Final
    let textoFinal = '';
    const mapTitulo = {
        'OBSTETRICO_MORFOLOGICO': 'ULTRASSONOGRAFIA MORFOLÓGICA FETAL',
        'OBSTETRICO_1_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA DE 1º TRIMESTRE',
        'OBSTETRICO_2_3_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA'
    };
    textoFinal += `${mapTitulo[data.subtipo] || 'ULTRASSONOGRAFIA OBSTÉTRICA'}`;
    if (isGemelar) textoFinal += ` - GESTAÇÃO GEMELAR`;
    textoFinal += `\n\n`;

    // DUM (Geralmente única)
    if (data.dum && data.usarDum) {
        const d = new Date(data.dum + 'T12:00:00');
        textoFinal += `DUM: ${d.toLocaleDateString('pt-BR')} (Referida).\n\n`;
    }

    // Gera texto Feto 1 (ou único)
    textoFinal += gerarTextoFeto(dadosFeto1.current || data, 1);

    // Gera texto Feto 2
    if (isGemelar && dadosFeto2.current) {
        textoFinal += gerarTextoFeto(dadosFeto2.current, 2);
    }

    // Conclusão
    textoFinal += `\nCONCLUSÃO:\n`;
    textoFinal += `Gestação tópica, ${isGemelar ? 'gemelar' : 'feto único'}, vivo(s).\n`;
    if(data.obsAdicionais) textoFinal += `\nOBS: ${data.obsAdicionais}`;

    onUpdate({ 
        texto: textoFinal, 
        dadosEstruturados: { feto1: dadosFeto1.current, feto2: dadosFeto2.current, isGemelar }, 
        tituloExame: mapTitulo[data.subtipo] 
    });

  }, [data, isGemelar, fetoAtivo, onUpdate]);

  const getIgNumerica = () => {
      if(!data.dum) return 20;
      const dias = Math.floor((new Date() - new Date(data.dum+'T12:00:00')) / (86400000));
      return (dias/7).toFixed(1);
  };

  return (
    <div className="laudo-container">
      
      {/* CHECKBOX GEMELAR */}
      <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label className="laudo-checkbox-label" style={{fontWeight: 'bold', color: '#4A3B80', fontSize: '13px'}}>
              <input type="checkbox" checked={isGemelar} onChange={toggleGemelar} />
              <FaUserFriends size={16} /> GESTAÇÃO GEMELAR
          </label>
      </div>

      {/* ABAS */}
      {isGemelar && (
          <div className="gemelar-tabs">
              <div 
                  className={`gemelar-tab ${fetoAtivo === 1 ? 'active' : ''}`}
                  onClick={() => handleTabChange(1)}
              >
                  CONCEPTO 1
              </div>
              <div 
                  className={`gemelar-tab ${fetoAtivo === 2 ? 'active' : ''}`}
                  onClick={() => handleTabChange(2)}
              >
                  CONCEPTO 2
              </div>
          </div>
      )}

      {/* CONTEÚDO DO FORMULÁRIO */}
      <div style={{ opacity: isGemelar && fetoAtivo === 2 ? 0.95 : 1 }}>
          <SecaoSubtipo data={data} handleChange={handleChange} />
          
          <SecaoDatacao data={data} handleChange={handleChange} handleDatacaoChange={handleDatacaoChange} />
          
          <SecaoColoDados data={data} handleChange={handleChange} />

          <SecaoBiometria data={data} handleChange={handleChange} />

          <div style={{ margin: '5px 0' }}>
              <SecaoIndicesGraficos data={data} handleChange={handleChange} />
          </div>

          <div style={{ margin: '5px 0', border: '1px solid #ddd', padding: '5px', background: '#f9f9f9', borderRadius: '4px' }}>
              <button onClick={() => setMostrarGraficos(!mostrarGraficos)} style={{cursor: 'pointer', border: 'none', background: 'transparent', color: '#1565C0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px'}}>
                  <FaChartLine /> {mostrarGraficos ? 'Ocultar Curvas' : 'Visualizar Curvas de Crescimento'}
              </button>
              {mostrarGraficos && <GraficosObstetricos igSemanas={getIgNumerica()} peso={data.pesoEstimado} femur={data.femur} />}
          </div>

          <SecaoMorfologia data={data} handleChange={handleChange} />
          <SecaoAnexos data={data} handleChange={handleChange} />
          <SecaoDoppler data={data} handleChange={handleChange} />
          <SecaoConclusao data={data} handleChange={handleChange} />
      </div>

    </div>
  );
};

export default FormObstetrico;