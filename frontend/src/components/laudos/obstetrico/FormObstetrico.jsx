import React, { useState, useEffect } from 'react';
import { FaChartLine } from 'react-icons/fa';
import GraficosObstetricos from '../GraficosObstetricos'; 

// Importação das Seções
import SecaoSubtipo from './sections/SecaoSubtipo';
import SecaoDatacao from './sections/SecaoDatacao';
import SecaoColoDados from './sections/SecaoColoDados';
import SecaoBiometria from './sections/SecaoBiometria';
import SecaoMorfologia from './sections/SecaoMorfologia';
import SecaoAnexos from './sections/SecaoAnexos';
import SecaoDoppler from './sections/SecaoDoppler';
import SecaoConclusao from './sections/SecaoConclusao';

const FormObstetrico = ({ onUpdate }) => {
  const [mostrarGraficos, setMostrarGraficos] = useState(false);

  // --- ESTADO GLOBAL ---
  const [data, setData] = useState({
    subtipo: 'OBSTETRICO_MORFOLOGICO',
    // 2. DATAÇÃO (ATUALIZADO COM CAMPOS DO PRINT)
    dum: '', 
    usarDum: true, dumDesconhecida: false, naoUsarDum: false,
    igDum: '', dppDum: '',
    
    exibirDataDum: true,           // Checkbox: "exibir a data"
    citarDppDum: false,            // Checkbox: "citar D.P.P. pela D.U.M."
    usarDumComoBase: false,        // Checkbox: "Usar a D.U.M. como base..."
    
    citarDppBiometria: true,       // Checkbox: "citar D.P.P. pela biometria..."
    
    referirIgAnterior: true,       // Checkbox: "referir Idade Gestacional..."
    usarIgAnteriorComoBase: false, // Checkbox: "usar o exame anterior como base..."
    dataExameAnterior: '', 
    igAnteriorSemanas: '', igAnteriorDias: '',
    citarDppIgCorrigida: false,    // Checkbox: "citar D.P.P. pela I.G. corrigida"

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
    pesoEstimado: '', percentil: '',
    indiceCefalico: '', relacaoCcCa: '', relacaoFlAc: '',
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
    utDirSD: '', utDirIR: '', utDirIP: '', utDirInc: false,
    utEsqSD: '', utEsqIR: '', utEsqIP: '', utEsqInc: false,
    umbSD: '', umbIR: '', umbIP: '',
    acmPVS: '', acmSD: '', acmIR: '', acmIP: '',
    ductoVenosoIP: '', ductoVenosoOndaA: 'Positiva',
    // Conclusão
    obsAdicionais: ''
  });

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Handler Especial para Datação (Corrige o problema dos checkboxes conflitantes)
  const handleDatacaoChange = (tipo) => {
      if (tipo === 'USAR_DUM') {
          setData(prev => ({ ...prev, usarDum: true, dumDesconhecida: false, naoUsarDum: false }));
      } else if (tipo === 'DUM_DESCONHECIDA') {
          setData(prev => ({ ...prev, usarDum: false, dumDesconhecida: true, naoUsarDum: false }));
      } else if (tipo === 'NAO_USAR_DUM') {
          setData(prev => ({ ...prev, usarDum: false, dumDesconhecida: false, naoUsarDum: true }));
      }
  };

  // --- LÓGICA DE GERAÇÃO DE TEXTO ---
  useEffect(() => {
    // 1. Cálculos de Índices
    let updates = {};
    const dbp = parseFloat(data.dbp); const dof = parseFloat(data.dof);
    const cc = parseFloat(data.cc); const ca = parseFloat(data.ca); const fl = parseFloat(data.femur);

    if (dbp && dof) updates.indiceCefalico = ((dbp / dof) * 100).toFixed(1);
    if (cc && ca) updates.relacaoCcCa = (cc / ca).toFixed(2);
    if (fl && ca) updates.relacaoFlAc = ((fl / ca) * 100).toFixed(1);

    // 2. Construção do Texto
    let t = '';
    
    // Título
    const mapTitulo = {
        'OBSTETRICO_MORFOLOGICO': 'ULTRASSONOGRAFIA MORFOLÓGICA FETAL',
        'OBSTETRICO_1_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA DE 1º TRIMESTRE',
        'OBSTETRICO_2_3_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA'
    };
    t += `${mapTitulo[data.subtipo] || 'ULTRASSONOGRAFIA OBSTÉTRICA'}\n\n`;

    // Datação
    if (data.usarDum && data.dum) {
        const d = new Date(data.dum + 'T12:00:00');
        const hoje = new Date();
        const diff = Math.floor((hoje - d) / (1000 * 60 * 60 * 24));
        const sem = Math.floor(diff/7);
        const dias = diff%7;
        const dpp = new Date(d); dpp.setDate(d.getDate() + 280);
        
        t += `DUM: ${d.toLocaleDateString('pt-BR')} (Referida).\n`;
        t += `Idade Gestacional (DUM): ${sem} semanas e ${dias} dias.\n`;
        t += `DPP Estimada: ${dpp.toLocaleDateString('pt-BR')}.\n`;
    } else {
        t += `Idade Gestacional: Compatível com a biometria fetal atual.\n`;
    }
    t += `\n`;

    // Dados Iniciais
    t += `Feto único, em situação ${data.situacao.toLowerCase()}, apresentação ${data.apresentacao.toLowerCase()}, dorso ${data.dorso.toLowerCase()}.\n`;
    t += `Batimentos cardiofetais presentes e rítmicos (${data.bcf} bpm). Movimentação fetal ativa.\n\n`;

    // Biometria
    t += `BIOMETRIA FETAL:\n`;
    const bios = [];
    if(data.dbp) bios.push(`DBP: ${data.dbp} mm`);
    if(data.cc) bios.push(`CC: ${data.cc} mm`);
    if(data.ca) bios.push(`CA: ${data.ca} mm`);
    if(data.femur) bios.push(`Fêmur: ${data.femur} mm`);
    if(data.umero) bios.push(`Úmero: ${data.umero} mm`);
    t += bios.join(' | ') + '.\n';
    
    if (data.pesoEstimado) t += `Peso Fetal Estimado: ${data.pesoEstimado} g.\n`;
    
    // Morfologia (Checklist Inteligente)
    t += `\nANATOMIA FETAL:\n`;
    const morf = [];
    if (data.morfCranio) morf.push("Crânio e encéfalo");
    if (data.morfFace) morf.push("Face e perfil");
    if (data.morfColuna) morf.push("Coluna vertebral");
    if (data.morfCoracao) morf.push("Coração (4 câmaras/vias)");
    if (data.morfEstomago) morf.push("Estômago");
    if (data.morfRins) morf.push("Rins");
    if (data.morfBexiga) morf.push("Bexiga");
    if (data.morfParedeAbd) morf.push("Parede abdominal");
    if (data.morfMembros) morf.push("Membros");
    
    if (morf.length > 0) t += `Visualizados com aspecto habitual: ${morf.join(', ')}.\n`;
    t += `Genitália externa compatível com sexo ${data.sexoFetal.toLowerCase()}.\n`;

    // Placenta e Liquido
    t += `\nANEXOS:\n`;
    t += `Placenta com inserção ${data.placentaInsercao.toLowerCase()}, aspecto ${data.placentaAspecto.toLowerCase()}. ${data.placentaEspessura ? `Espessura: ${data.placentaEspessura} mm.` : ''}\n`;
    t += `Líquido amniótico com ${data.liquidoVolume.toLowerCase()}.\n`;
    if (data.cordaoNormal) t += `Cordão umbilical com 3 vasos visibilizados.\n`;

    // Doppler
    if (data.usarDoppler) {
        t += `\nDOPPLERFLUXOMETRIA:\n`;
        t += `Art. Uterinas: Direita (IP ${data.utDirIP || '--'}) | Esquerda (IP ${data.utEsqIP || '--'}).\n`;
        t += `Art. Umbilical: IP ${data.umbIP || '--'}. Art. Cerebral Média: PVS ${data.acmPVS || '--'} cm/s.\n`;
    }

    t += `\nCONCLUSÃO:\n`;
    t += `Gestação tópica, compatível com a idade gestacional.\n`;
    if(data.obsAdicionais) t += `\nOBS: ${data.obsAdicionais}`;

    // Atualiza o Pai (LaudosPage)
    onUpdate({ texto: t, dadosEstruturados: { ...data, ...updates }, tituloExame: mapTitulo[data.subtipo] });

  }, [data, onUpdate]);

  const getIgNumerica = () => {
      if(!data.dum) return 20;
      const dias = Math.floor((new Date() - new Date(data.dum+'T12:00:00')) / (86400000));
      return (dias/7).toFixed(1);
  };

  return (
    // FIX: Removido maxWidth e margin auto para ocupar toda a largura
    <div style={{ fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: '11px', color: '#333', width: '100%' }}>
      
      <SecaoSubtipo data={data} handleChange={handleChange} />
      
      {/* Passamos o handler especial para datação */}
      <SecaoDatacao data={data} handleChange={handleChange} handleDatacaoChange={handleDatacaoChange} />
      
      <SecaoColoDados data={data} handleChange={handleChange} />

      <div style={{ margin: '5px 0', border: '1px solid #ddd', padding: '5px', background: '#f9f9f9', borderRadius: '4px' }}>
          <button onClick={() => setMostrarGraficos(!mostrarGraficos)} style={{cursor: 'pointer', border: 'none', background: 'transparent', color: '#1565C0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px'}}>
              <FaChartLine /> {mostrarGraficos ? 'Ocultar Curvas' : 'Visualizar Curvas de Crescimento'}
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