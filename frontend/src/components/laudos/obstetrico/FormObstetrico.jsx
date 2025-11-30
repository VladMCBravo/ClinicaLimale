import React, { useState, useEffect, useRef } from 'react';
import { FaChartLine, FaUserFriends } from 'react-icons/fa';
import '../Laudos.css'; 
import GraficosObstetricos from '../GraficosObstetricos'; 

// Importação das Seções Originais (2º e 3º Trimestre)
import SecaoSubtipo from './sections/SecaoSubtipo';
import SecaoDatacao from './sections/SecaoDatacao';
import SecaoColoDados from './sections/SecaoColoDados';
import SecaoBiometria from './sections/SecaoBiometria';
import SecaoMorfologia from './sections/SecaoMorfologia';
import SecaoAnexos from './sections/SecaoAnexos';
import SecaoDoppler from './sections/SecaoDoppler';
import SecaoIndicesGraficos from './sections/SecaoIndicesGraficos';
import SecaoConclusao from './sections/SecaoConclusao';

// Importação das Novas Seções (1º Trimestre)
import SecaoDadosMaternos1Tri from './sections/SecaoDadosMaternos1Tri';
import SecaoSacoGestacional from './sections/SecaoSacoGestacional';
import SecaoEmbriao from './sections/SecaoEmbriao';

const FormObstetrico = ({ onUpdate }) => {
  // --- ESTADO GEMELAR ---
  const [isGemelar, setIsGemelar] = useState(false);
  const [fetoAtivo, setFetoAtivo] = useState(1); // 1 ou 2
  
  // Refs para guardar os dados "em background"
  const dadosFeto1 = useRef(null);
  const dadosFeto2 = useRef(null);

  const [mostrarGraficos, setMostrarGraficos] = useState(false);

  // --- ESTADO INICIAL COMPLETO (União de todos os campos) ---
  const initialState = {
      subtipo: 'OBSTETRICO_MORFOLOGICO',

      // Datação (Comum a todos)
      dum: '', usarDum: true, dumDesconhecida: false, naoUsarDum: false,
      igDum: '', dppDum: '',
      exibirDataDum: true, citarDppDum: false, usarDumComoBase: false,
      citarDppBiometria: true,
      referirIgAnterior: true, usarIgAnteriorComoBase: false,
      dataExameAnterior: '', igAnteriorSemanas: '', igAnteriorDias: '',
      citarDppIgCorrigida: false,

      // --- DADOS ESPECÍFICOS 1º TRIMESTRE ---
      // Maternos / Via / Útero / Anexos 1º Tri
      viaExame: 'transvaginal',
      citarUteroMedidas: true, ut1:'', ut2:'', ut3:'',
      citarNodulo: false, nod1:'', nod2:'', nodTipo: 'subseroso', nodLocal: 'fúndica',
      citarColo1Tri: true, citarCompColo1Tri: false, medidaColo1Tri: '',
      corpoLuteo: 'não citar', citarMedidasAnexo: false, calcVolAnexo: true,
      anx1:'', anx2:'', anx3:'', resVolAnexo: '', 

      // Saco Gestacional
      citarSg: true, sgLocalizacao: 'fúndica', trofoblasto: 'não citar',
      sg1: '', sg2: '', sg3: '', resDmsg: '', resIgSg: '',
      sgSemDescolamento: true, sgComDescolamento: false, desc1:'', desc2:'', desc3:'',
      sgAbortoIncompleto: false,
      
      // Embrião
      embriaoNaoVisualizado: false,
      ccn: '', resIgCcn: '',
      citarVv: false, vvDiametro: '',
      bcfIndetectavel: false,
      
      // Morfologia 1º Tri
      morf1Cerebro: true, morf1Estomago: true, morf1Cordao: true, 
      morf1Membros: true, morf1Globos: true, morf1OssoNasal: 'não citar',

      // TN
      citarTn: false, tnMedida: '', tnObs: true, tnRisco: false, riscoBasal: '1000', riscoCorrigido: '1000',

      // --- DADOS ESPECÍFICOS 2º e 3º TRIMESTRE ---
      // Colo e Dados Iniciais
      citarColoNormal: false, citarComprimentoColo: false, medidaColo: '',
      situacao: 'Longitudinal', apresentacao: 'Cefálica', dorso: 'Esquerda',
      
      // Biometria
      dbp: '', dof: '', cc: '', ca: '', femur: '', umero: '',
      ulna: '', tibia: '', radio: '', fibula: '', pe: '',
      diametroBinocular: '', diametroInterocular: '',
      cerebelo: '', cisternaMagna: '', ventriculoLat: '', toraxTrans: '', toraxAP: '',
      ossoNasal: '', pregaNucal: '',
      incDbp: true, incDof: true, incCc: true, incCa: true, incFemur: true,
      
      // Peso e Índices (Com Resultados Calculados)
      pesoEstimado: '', percentil: '', checkPeso: true,
      resIc: '', resCcCa: '', resCfCa: '', resCfDbp: '', resCfCc: '',
      citarValoresNormais: true, checkIndiceCefalico: false, checkRelacaoCcCa: false, 
      checkRelacaoCfCa: false, checkRelacaoCfDbp: false, checkRelacaoCfCc: false,

      // Gráficos Checkboxes
      checkGraficoPeso: true, checkGraficoDbp: true, checkGraficoFemur: true, 
      checkGraficoUmero: true, checkGraficoCa: true, checkGraficoCc: true,

      // Morfologia 2º/3º Tri
      morfColuna: true, morfCranio: true, morfCerebro: true, morfFace: true,
      morfTorax: true, morfPulmoes: true, morfCoracao: true, morfVasosBase: false,
      morfEstomago: true, morfFigado: true, morfVesicula: false, morfAlcas: false,
      morfRins: true, morfBexiga: true, morfParedeAbd: true,
      morfGenitalia: true, morfMembros: true, morfFalange: false,
      sexoFetal: 'MASCULINO',
      
      // Vitalidade (Comum, mas estruturada diferente no 1º tri visualmente)
      bcf: '140', movFetal: true, degluticao: false,
      
      // Anexos (2º/3º Tri)
      cordaoNormal: true, cordaoCircular: 'não citar',
      placentaInsercao: 'Corporal Posterior', placentaAspecto: 'Normal', placentaEspessura: '',
      liquidoVolume: 'Normal', ila: '', maiorBolso: '',
      
      // Doppler (Comum)
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

  // --- AUTOMAÇÃO TURING (CÁLCULOS CENTRAIS) ---
  useEffect(() => {
    // 1. DADOS 1º TRIMESTRE
    const sg1 = parseFloat(data.sg1); const sg2 = parseFloat(data.sg2); const sg3 = parseFloat(data.sg3);
    let novoDmsg = ''; let novoIgSg = '';
    
    if (!isNaN(sg1) && !isNaN(sg2) && !isNaN(sg3)) {
        const media = (sg1 + sg2 + sg3) / 3;
        novoDmsg = media.toFixed(1).replace('.', ',');
        // Exemplo simplificado de IG: (DMSG + 30) / 7
        const dias = media + 30; 
        const sem = Math.floor(dias/7);
        const d = Math.floor(dias%7);
        novoIgSg = `${sem}s ${d}d`;
    }

    const ccnVal = parseFloat(data.ccn);
    let novoIgCcn = '';
    if (!isNaN(ccnVal)) {
        // Exemplo simplificado de IG: (CCN + 42) / 7
        const dias = ccnVal + 42; 
        const sem = Math.floor(dias/7);
        const d = Math.floor(dias%7);
        novoIgCcn = `${sem}s ${d}d`;
    }

    let novoVolAnexo = '';
    const a1 = parseFloat(data.anx1); const a2 = parseFloat(data.anx2); const a3 = parseFloat(data.anx3);
    if (data.calcVolAnexo && !isNaN(a1) && !isNaN(a2) && !isNaN(a3)) {
        // Volume Elipsoide
        const vol = (a1 * a2 * a3 * 0.523) / 1000;
        novoVolAnexo = vol.toFixed(1).replace('.', ',');
    }

    // 2. DADOS 2º e 3º TRIMESTRE
    const dbp = parseFloat(data.dbp);
    const dof = parseFloat(data.dof);
    const cc = parseFloat(data.cc);
    const ca = parseFloat(data.ca);
    const femur = parseFloat(data.femur);
    const umero = parseFloat(data.umero);
    const peso = parseFloat(data.pesoEstimado);

    const safeCalc = (val) => isFinite(val) && !isNaN(val) ? val.toFixed(2).replace('.', ',') : '';

    setData(prev => {
      const newState = { ...prev };
      let houveMudanca = false;

      // Atualiza 1º Tri
      if (prev.resDmsg !== novoDmsg) { newState.resDmsg = novoDmsg; houveMudanca = true; }
      if (prev.resIgSg !== novoIgSg) { newState.resIgSg = novoIgSg; houveMudanca = true; }
      if (prev.resIgCcn !== novoIgCcn) { newState.resIgCcn = novoIgCcn; houveMudanca = true; }
      if (prev.resVolAnexo !== novoVolAnexo) { newState.resVolAnexo = novoVolAnexo; houveMudanca = true; }

      // Atualiza 2º Tri (Índices)
      const novoIc = (dbp && dof) ? safeCalc((dbp/dof)*100) : '';
      if(prev.resIc !== novoIc) { newState.resIc = novoIc; houveMudanca = true; }
      
      const novoCcCa = (cc && ca) ? safeCalc(cc/ca) : '';
      if(prev.resCcCa !== novoCcCa) { newState.resCcCa = novoCcCa; houveMudanca = true; }
      
      const novoCfCa = (femur && ca) ? safeCalc((femur/ca)*100) : '';
      if(prev.resCfCa !== novoCfCa) { newState.resCfCa = novoCfCa; houveMudanca = true; }
      
      const novoCfDbp = (femur && dbp) ? safeCalc((femur/dbp)*100) : '';
      if(prev.resCfDbp !== novoCfDbp) { newState.resCfDbp = novoCfDbp; houveMudanca = true; }
      
      const novoCfCc = (femur && cc) ? safeCalc((femur/cc)*100) : '';
      if(prev.resCfCc !== novoCfCc) { newState.resCfCc = novoCfCc; houveMudanca = true; }

      // Atualiza Checkboxes de Índices (se calculado, ativa)
      if (prev.checkIndiceCefalico !== (!!novoIc)) { newState.checkIndiceCefalico = !!novoIc; houveMudanca = true; }
      if (prev.checkRelacaoCcCa !== (!!novoCcCa)) { newState.checkRelacaoCcCa = !!novoCcCa; houveMudanca = true; }
      if (prev.checkRelacaoCfCa !== (!!novoCfCa)) { newState.checkRelacaoCfCa = !!novoCfCa; houveMudanca = true; }
      
      // Atualiza Checkboxes de Gráficos (se medida existe, ativa)
      if (prev.checkGraficoDbp !== !!dbp) { newState.checkGraficoDbp = !!dbp; houveMudanca = true; }
      if (prev.checkGraficoCc !== !!cc) { newState.checkGraficoCc = !!cc; houveMudanca = true; }
      if (prev.checkGraficoCa !== !!ca) { newState.checkGraficoCa = !!ca; houveMudanca = true; }
      if (prev.checkGraficoFemur !== !!femur) { newState.checkGraficoFemur = !!femur; houveMudanca = true; }
      if (prev.checkGraficoUmero !== !!umero) { newState.checkGraficoUmero = !!umero; houveMudanca = true; }
      if (prev.checkGraficoPeso !== !!peso) { newState.checkGraficoPeso = !!peso; houveMudanca = true; }

      return houveMudanca ? newState : prev;
    });

  }, [
    data.sg1, data.sg2, data.sg3, data.ccn, 
    data.anx1, data.anx2, data.anx3, data.calcVolAnexo,
    data.dbp, data.dof, data.cc, data.ca, data.femur, data.umero, data.pesoEstimado
  ]);

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

  const toggleGemelar = (e) => {
    const checked = e.target.checked;
    setIsGemelar(checked);
    if (!checked) {
        setFetoAtivo(1);
        if(dadosFeto1.current) setData({ ...dadosFeto1.current });
    } else {
        dadosFeto1.current = { ...data };
        if (!dadosFeto2.current || !dadosFeto2.current.dum) {
            dadosFeto2.current = { ...initialState, dum: data.dum, usarDum: data.usarDum, subtipo: data.subtipo };
        }
    }
  };

  const handleTabChange = (novoFeto) => {
      if (novoFeto === fetoAtivo) return;
      if (fetoAtivo === 1) dadosFeto1.current = { ...data };
      else dadosFeto2.current = { ...data };

      const dadosNovo = novoFeto === 1 ? dadosFeto1.current : dadosFeto2.current;
      setData({ ...dadosNovo });
      setFetoAtivo(novoFeto);
  };

  const getIgNumerica = () => {
      if(!data.dum) return 20;
      const dias = Math.floor((new Date() - new Date(data.dum+'T12:00:00')) / (86400000));
      return (dias/7).toFixed(1);
  };

  // --- GERAÇÃO DE TEXTO ---
  useEffect(() => {
    if (fetoAtivo === 1) dadosFeto1.current = data;
    else dadosFeto2.current = data;

    const gerarTextoFeto = (d, indice) => {
        let t = '';
        if (isGemelar) t += `\n--- FETO/CONCEPTO ${indice} ---\n`;

        // ------------------------------------
        // LÓGICA 1º TRIMESTRE
        // ------------------------------------
        if (d.subtipo === 'OBSTETRICO_1_TRI') {
            
            // Via e Útero
            if (d.viaExame && d.viaExame !== 'não citar') t += `Exame realizado por via ${d.viaExame}.\n`;
            
            t += `Útero em AVF, contornos regulares e ecotextura homogênea. `;
            if (d.citarUteroMedidas && d.ut1) t += `Dimensões: ${d.ut1} x ${d.ut2} x ${d.ut3} mm. \n`;
            else t += `\n`;

            if (d.citarNodulo) {
                t += `Presença de nódulo miometrial ${d.nodTipo}, localizado na parede ${d.nodLocal}, medindo ${d.nod1} x ${d.nod2} mm.\n`;
            }

            // Colo 1º Tri
            if (d.citarColo1Tri) t += `Colo uterino de aspecto normal (fechado). `;
            if (d.citarCompColo1Tri && d.medidaColo1Tri) t += `Comprimento: ${d.medidaColo1Tri} mm.\n`;
            else t += `\n`;

            // Anexos (Ovários)
            t += `Anexos visibilizados sem particularidades. `;
            if (d.corpoLuteo !== 'não citar') {
                t += `Corpo lúteo gestacional no ovário ${d.corpoLuteo}`;
                if (d.citarMedidasAnexo && d.anx1) {
                    t += ` medindo ${d.anx1}x${d.anx2}x${d.anx3} mm`;
                    if (d.calcVolAnexo && d.resVolAnexo) t += ` (Vol: ${d.resVolAnexo} cm³)`;
                }
                t += `.\n`;
            } else {
                t += `\n`;
            }

            // Saco Gestacional
            if (d.citarSg) {
                t += `\nSaco gestacional tópico, normoimplantado na região ${d.sgLocalizacao}. `;
                if (d.sg1 && d.sg2 && d.sg3) {
                    t += `Mede: ${d.sg1} x ${d.sg2} x ${d.sg3} mm. DMSG: ${d.resDmsg} mm.\n`;
                } else { t += '\n'; }
                
                if (d.trofoblasto !== 'não citar') t += `Trofoblasto com inserção ${d.trofoblasto}.\n`;
                
                if (d.sgSemDescolamento) t += `Não se observam sinais de descolamento ovular.\n`;
                else if (d.sgComDescolamento) t += `Nota-se área de descolamento ovular medindo ${d.desc1}x${d.desc2}x${d.desc3}mm.\n`;
                
                if (d.sgAbortoIncompleto) t += `QUADRO COMPATÍVEL COM ABORTAMENTO INCOMPLETO (restos ovulares na cavidade).\n`;
            }

            // Embrião
            t += `\n`;
            if (d.embriaoNaoVisualizado) {
                t += `Embrião não visualizado no presente exame.\n`;
            } else {
                t += `Embrião único, vivo.\n`;
                if (d.ccn) t += `Comprimento cabeça-nádegas (CCN): ${d.ccn} mm.\n`;
                if (d.bcfIndetectavel) t += `Batimentos cardiofetais indetectáveis.\n`;
                else if (d.bcf) t += `BCF rítmicos: ${d.bcf} bpm.\n`;
                
                if (d.movFetal) t += `Movimentação embrionária presente.\n`;
                if (d.citarVv) t += `Vesícula vitelina tópica e de aspecto normal${d.vvDiametro ? ` (${d.vvDiametro} mm)` : ''}.\n`;

                // Morfologia 1 Tri
                const morf1 = [];
                if(d.morf1Cerebro) morf1.push("contorno encefálico");
                if(d.morf1Estomago) morf1.push("estômago");
                if(d.morf1Membros) morf1.push("brotos dos membros");
                if(d.morf1Globos) morf1.push("globos oculares");
                if(morf1.length > 0) t += `Visualizados: ${morf1.join(', ')}.\n`;
                if(d.morf1OssoNasal !== 'não citar') t += `Osso nasal ${d.morf1OssoNasal}.\n`;
                if(d.morf1Cordao) t += `Inserção do cordão umbilical com aspecto normal.\n`;

                // TN
                if (d.citarTn && d.tnMedida) {
                    t += `Translucência Nucal (TN): ${d.tnMedida} mm.\n`;
                    if (d.tnRisco) {
                        t += `Risco para Trissomia do 21 - Basal: 1/${d.riscoBasal} | Corrigido: 1/${d.riscoCorrigido}.\n`;
                    }
                }
            }

            // Doppler 1 Tri (Ducto Venoso)
            if (d.usarDoppler && d.checkDv) {
                t += `\nDOPPLER:\nDucto venoso com IP de ${d.dvIP || '--'}. Onda A ${d.dvOndaAZero ? 'zero' : (d.dvOndaAReversa ? 'reversa' : 'positiva')}.\n`;
            }

        } else {
            // ------------------------------------
            // LÓGICA 2º e 3º TRIMESTRE
            // ------------------------------------
            
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

            // Índices (Texto gerado pelos cálculos do Pai)
            const indicesTxt = [];
            if (d.checkIndiceCefalico && d.resIc) indicesTxt.push(`Índice Cefálico: ${d.resIc}%${d.citarValoresNormais ? '(VN: 70-86%)' : ''}`);
            if (d.checkRelacaoCcCa && d.resCcCa) indicesTxt.push(`Rel. CC/CA: ${d.resCcCa}`);
            if (d.checkRelacaoCfCa && d.resCfCa) indicesTxt.push(`Rel. Fêmur/CA: ${d.resCfCa}%`);
            if (d.checkRelacaoCfDbp && d.resCfDbp) indicesTxt.push(`Rel. Fêmur/DBP: ${d.resCfDbp}%`);
            
            if (indicesTxt.length > 0) {
                t += `Relações biométricas: ${indicesTxt.join(' | ')}.\n`;
            }

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

            // Doppler
            if (d.usarDoppler) {
                 t += `\nDOPPLERFLUXOMETRIA:\n`;
                 if (d.checkUtDir) t += `Art. Uterina Dir: IP ${d.utDirIP || '--'}.\n`;
                 if (d.checkUtEsq) t += `Art. Uterina Esq: IP ${d.utEsqIP || '--'}.\n`;
                 if (d.checkUmb) t += `Art. Umbilical: IP ${d.umbIP || '--'}.\n`;
                 if (d.checkAcm) t += `ACM: PVS ${d.acmPVS || '--'} cm/s.\n`;
                 if (d.checkDv) t += `Ducto Venoso: IP ${d.dvIP || '--'}.\n`;
            }
        }

        // Observação de TN no final (Se habilitado e 1º tri)
        if (d.subtipo === 'OBSTETRICO_1_TRI' && d.citarTn && d.tnObs) {
            t += `\nNota: A medida da TN deve ser interpretada conforme o risco base da paciente.\n`;
        }
        
        return t;
    };

    // --- MONTAGEM FINAL DO TEXTO ---
    let textoFinal = '';
    const mapTitulo = {
        'OBSTETRICO_MORFOLOGICO': 'ULTRASSONOGRAFIA MORFOLÓGICA FETAL',
        'OBSTETRICO_1_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA DE 1º TRIMESTRE',
        'OBSTETRICO_2_3_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA'
    };
    textoFinal += `${mapTitulo[data.subtipo] || 'ULTRASSONOGRAFIA OBSTÉTRICA'}`;
    if (isGemelar) textoFinal += ` - GESTAÇÃO GEMELAR`;
    textoFinal += `\n\n`;

    // DUM
    if (data.dum && data.usarDum) {
        const d = new Date(data.dum + 'T12:00:00');
        textoFinal += `DUM: ${d.toLocaleDateString('pt-BR')} (Referida).\n\n`;
    }

    // Geração por Feto
    textoFinal += gerarTextoFeto(dadosFeto1.current || data, 1);
    if (isGemelar && dadosFeto2.current) {
        textoFinal += gerarTextoFeto(dadosFeto2.current, 2);
    }

    // Conclusão
    textoFinal += `\nCONCLUSÃO:\n`;
    if (isGemelar) textoFinal += `Gestação tópica, gemelar, vivos.\n`;
    else textoFinal += `Gestação tópica, feto único, vivo.\n`;
    
    if (data.conclusaoNormal) textoFinal += `Desenvolvimento fetal compatível com a idade gestacional.\n`;
    if (data.obsAdicionais) textoFinal += `\nOBS: ${data.obsAdicionais}`;

    onUpdate({ 
        texto: textoFinal, 
        dadosEstruturados: { feto1: dadosFeto1.current, feto2: dadosFeto2.current, isGemelar }, 
        tituloExame: mapTitulo[data.subtipo] 
    });

  }, [data, isGemelar, fetoAtivo, onUpdate]);


  const isPrimeiroTri = data.subtipo === 'OBSTETRICO_1_TRI';

  return (
    <div className="laudo-container">
      
      {/* CHECKBOX GEMELAR */}
      <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label className="laudo-checkbox-label" style={{fontWeight: 'bold', color: '#4A3B80', fontSize: '13px'}}>
              <input type="checkbox" checked={isGemelar} onChange={toggleGemelar} />
              <FaUserFriends size={16} /> GESTAÇÃO GEMELAR
          </label>
      </div>

      {/* ABAS GEMELAR */}
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
          
          {/* RENDERIZAÇÃO CONDICIONAL POR TRIMESTRE */}
          {isPrimeiroTri ? (
              <>
                {/* LÓGICA 1º TRIMESTRE */}
                <SecaoDadosMaternos1Tri data={data} handleChange={handleChange} />
                <SecaoSacoGestacional data={data} handleChange={handleChange} />
                <SecaoEmbriao data={data} handleChange={handleChange} />
                
                {/* 1º Tri também pode usar Doppler (ex: Ducto Venoso) */}
                <SecaoDoppler data={data} handleChange={handleChange} />
                <SecaoConclusao data={data} handleChange={handleChange} />
              </>
          ) : (
              <>
                {/* LÓGICA 2º e 3º TRIMESTRE */}
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
              </>
          )}

      </div>
    </div>
  );
};

export default FormObstetrico;