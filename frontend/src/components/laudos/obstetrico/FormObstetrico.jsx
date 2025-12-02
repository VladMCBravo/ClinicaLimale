
import React, { useState, useEffect, useRef } from 'react';
import { FaChartLine, FaUserFriends } from 'react-icons/fa';
import '../Laudos.css'; 
import GraficosObstetricos from '../GraficosObstetricos'; 

// Importação das Seções
import SecaoSubtipo from './sections/SecaoSubtipo'; // (Assumindo que existe, mantive a importação)
import SecaoDatacao from './sections/SecaoDatacao';
import SecaoColoDados from './sections/SecaoColoDados';
import SecaoBiometria from './sections/SecaoBiometria';
import SecaoMorfologia from './sections/SecaoMorfologia';
import SecaoAnexos from './sections/SecaoAnexos';
import SecaoDoppler from './sections/SecaoDoppler';
import SecaoIndicesGraficos from './sections/SecaoIndicesGraficos';
import SecaoConclusao from './sections/SecaoConclusao';

// Importação das Seções de 1º Tri (Assumindo existência baseada no código anterior)
import SecaoDadosMaternos1Tri from './sections/SecaoDadosMaternos1Tri';
import SecaoSacoGestacional from './sections/SecaoSacoGestacional';
import SecaoEmbriao from './sections/SecaoEmbriao';

const FormObstetrico = ({ onUpdate }) => {
  // --- ESTADO GEMELAR ---
  const [isGemelar, setIsGemelar] = useState(false);
  const [fetoAtivo, setFetoAtivo] = useState(1); 
  
  // Refs para guardar os dados independentes
  const dadosFeto1 = useRef(null);
  const dadosFeto2 = useRef(null);

  const [mostrarGraficos, setMostrarGraficos] = useState(false);

  // --- ESTADO INICIAL COMPLETO ---
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

      // 1º TRIMESTRE
      viaExame: 'transvaginal',
      citarUteroMedidas: true, ut1:'', ut2:'', ut3:'',
      citarNodulo: false, nod1:'', nod2:'', nodTipo: 'subseroso', nodLocal: 'fúndica',
      citarColo1Tri: true, citarCompColo1Tri: false, medidaColo1Tri: '',
      corpoLuteo: 'não citar', citarMedidasAnexo: false, calcVolAnexo: true, anx1:'', anx2:'', anx3:'', resVolAnexo: '', 
      citarSg: true, sgLocalizacao: 'fúndica', trofoblasto: 'não citar',
      sg1: '', sg2: '', sg3: '', resDmsg: '', resIgSg: '',
      sgSemDescolamento: true, sgComDescolamento: false, desc1:'', desc2:'', desc3:'', sgAbortoIncompleto: false,
      embriaoNaoVisualizado: false, ccn: '', resIgCcn: '', citarVv: false, vvDiametro: '', bcfIndetectavel: false,
      morf1Cerebro: true, morf1Estomago: true, morf1Cordao: true, morf1Membros: true, morf1Globos: true, morf1OssoNasal: 'não citar',
      citarTn: false, tnMedida: '', tnObs: true, tnRisco: false, riscoBasal: '1000', riscoCorrigido: '1000',

      // 2º/3º TRIMESTRE - DADOS GERAIS
      citarColoNormal: false, citarComprimentoColo: false, medidaColo: '',
      situacao: 'Longitudinal', apresentacao: 'Cefálica', dorso: 'Esquerda',
      
      // BIOMETRIA
      dbp: '', dof: '', cc: '', ca: '', femur: '', umero: '',
      ulna: '', tibia: '', radio: '', fibula: '', pe: '',
      diametroBinocular: '', diametroInterocular: '',
      cerebelo: '', cisternaMagna: '', ventriculoLat: '', toraxTrans: '', toraxAP: '',
      ossoNasal: '', pregaNucal: '',
      incDbp: true, incDof: true, incCc: true, incCa: true, incFemur: true,
      
      // PESO E ÍNDICES
      pesoEstimado: '', percentil: '', checkPeso: true,
      resIc: '', resCcCa: '', resCfCa: '', resCfDbp: '', resCfCc: '',
      citarValoresNormais: true, checkIndiceCefalico: false, checkRelacaoCcCa: false, 
      checkRelacaoCfCa: false, checkRelacaoCfDbp: false, checkRelacaoCfCc: false,

      // GRÁFICOS
      checkGraficoPeso: true, checkGraficoDbp: true, checkGraficoFemur: true, 
      checkGraficoUmero: true, checkGraficoCa: true, checkGraficoCc: true,

      // MORFOLOGIA (AUDITADO COM SecaoMorfologia.jsx)
      morfColuna: true, morfCranio: true, morfCerebro: true, morfFace: true,
      morfTorax: true, morfPulmoes: true, morfCoracao: true, morfVasosBase: true,
      morfEstomago: true, morfFigado: true, morfVesicula: false, morfAlcas: false,
      morfRins: true, morfBexiga: true, morfParedeAbd: true,
      morfGenitalia: true, morfMembros: true, morfFalange: false,
      sexoFetal: 'MASCULINO',
      
      // VITALIDADE
      bcf: '140', movFetal: true, degluticao: false,
      
      // ANEXOS
      cordaoNormal: true, cordaoCircular: 'não citar',
      placentaInsercao: 'Corporal Posterior', placentaAspecto: 'Normal', placentaEspessura: '',
      liquidoVolume: 'Normal', ila: '', maiorBolso: '',
      
      // DOPPLER (AUDITADO COM SecaoDoppler.jsx)
      usarDoppler: false,
      checkUtDir: true, checkUtDirSD: false, utDirSD: '', checkUtDirIR: true, utDirIR: '', checkUtDirIP: true, utDirIP: '', utDirIncisura: false,
      checkUtEsq: true, checkUtEsqSD: false, utEsqSD: '', checkUtEsqIR: true, utEsqIR: '', checkUtEsqIP: true, utEsqIP: '', utEsqIncisura: false,
      utIpMedio: '', 
      checkUmb: true, checkUmbSD: false, umbSD: '', checkUmbIR: true, umbIR: '', checkUmbIP: true, umbIP: '', umbTraçadoNormal: true, umbDiastoleBaixa: false, umbDiastoleZero: false, umbDiastoleReversa: false,
      checkAcm: true, checkAcmPVS: true, acmPVS: '', checkAcmSD: false, acmSD: '', checkAcmIR: true, acmIR: '', checkAcmIP: true, acmIP: '', acmTraçadoNormal: true, acmDiastoleAlta: false,
      checkDv: true, checkDvIP: false, dvIP: '', dvTraçadoNormal: true, dvOndaAZero: false, dvOndaAReversa: false,

      // CONCLUSÃO
      conclusaoNormal: false,
      obsAdicionais: ''
  };

  const [data, setData] = useState(initialState);

  // --- CÁLCULOS MATEMÁTICOS ---
  useEffect(() => {
    // 1º Tri
    const sg1 = parseFloat(data.sg1); const sg2 = parseFloat(data.sg2); const sg3 = parseFloat(data.sg3);
    let novoDmsg = '';
    if (!isNaN(sg1) && !isNaN(sg2) && !isNaN(sg3)) {
        novoDmsg = ((sg1 + sg2 + sg3) / 3).toFixed(1).replace('.', ',');
    }

    // 2º Tri (Índices)
    const dbp = parseFloat(data.dbp); const dof = parseFloat(data.dof);
    const cc = parseFloat(data.cc); const ca = parseFloat(data.ca);
    const femur = parseFloat(data.femur);
    const safeCalc = (val) => isFinite(val) && !isNaN(val) ? val.toFixed(0) : ''; // Sem decimais nos indices %

    setData(prev => {
      const newState = { ...prev };
      let houveMudanca = false;

      if (prev.resDmsg !== novoDmsg) { newState.resDmsg = novoDmsg; houveMudanca = true; }

      const novoIc = (dbp && dof) ? safeCalc((dbp/dof)*100) : '';
      if(prev.resIc !== novoIc) { newState.resIc = novoIc; houveMudanca = true; }
      
      const novoCcCa = (cc && ca) ? (cc/ca).toFixed(2).replace('.', ',') : '';
      if(prev.resCcCa !== novoCcCa) { newState.resCcCa = novoCcCa; houveMudanca = true; }
      
      const novoCfCa = (femur && ca) ? safeCalc((femur/ca)*100) : '';
      if(prev.resCfCa !== novoCfCa) { newState.resCfCa = novoCfCa; houveMudanca = true; }
      
      const novoCfDbp = (femur && dbp) ? safeCalc((femur/dbp)*100) : '';
      if(prev.resCfDbp !== novoCfDbp) { newState.resCfDbp = novoCfDbp; houveMudanca = true; }
      
      const novoCfCc = (femur && cc) ? safeCalc((femur/cc)*100) : '';
      if(prev.resCfCc !== novoCfCc) { newState.resCfCc = novoCfCc; houveMudanca = true; }

      // Ativa Checkboxes automaticamente se houver valor calculado
      if (prev.checkIndiceCefalico !== (!!novoIc)) { newState.checkIndiceCefalico = !!novoIc; houveMudanca = true; }
      if (prev.checkRelacaoCcCa !== (!!novoCcCa)) { newState.checkRelacaoCcCa = !!novoCcCa; houveMudanca = true; }
      if (prev.checkRelacaoCfCa !== (!!novoCfCa)) { newState.checkRelacaoCfCa = !!novoCfCa; houveMudanca = true; }
      
      // Ativa Gráficos se medida existir
      if (prev.checkGraficoDbp !== !!dbp) { newState.checkGraficoDbp = !!dbp; houveMudanca = true; }
      if (prev.checkGraficoCc !== !!cc) { newState.checkGraficoCc = !!cc; houveMudanca = true; }
      if (prev.checkGraficoCa !== !!ca) { newState.checkGraficoCa = !!ca; houveMudanca = true; }
      if (prev.checkGraficoFemur !== !!femur) { newState.checkGraficoFemur = !!femur; houveMudanca = true; }

      return houveMudanca ? newState : prev;
    });

  }, [data.sg1, data.sg2, data.sg3, data.dbp, data.dof, data.cc, data.ca, data.femur]);

  // --- GERENCIAMENTO DE FETOS ---
  useEffect(() => {
    if (!dadosFeto1.current) dadosFeto1.current = { ...initialState };
    if (!dadosFeto2.current) dadosFeto2.current = { ...initialState };
    // eslint-disable-next-line
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleDatacaoChange = (tipo) => {
      if (tipo === 'USAR_DUM') setData(prev => ({ ...prev, usarDum: true, dumDesconhecida: false, naoUsarDum: false }));
      else if (tipo === 'DUM_DESCONHECIDA') setData(prev => ({ ...prev, usarDum: false, dumDesconhecida: true, naoUsarDum: false }));
      else if (tipo === 'NAO_USAR_DUM') setData(prev => ({ ...prev, usarDum: false, dumDesconhecida: false, naoUsarDum: true }));
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

  // --- GERAÇÃO DE TEXTO AUDITADA (Lógica Turing) ---
  useEffect(() => {
    // Salva estado atual na ref correta antes de gerar
    if (fetoAtivo === 1) dadosFeto1.current = data;
    else dadosFeto2.current = data;

    // Função que gera os dados estruturados para um feto específico
    const processarFeto = (d) => {
        const tabelaBiometria = [];
        const comentarios = [];
        const conclusao = [];

        // 1. DATAÇÃO E APRESENTAÇÃO (Comentários Iniciais)
        let apresentacao = '';
        if (d.subtipo !== 'OBSTETRICO_1_TRI') {
            apresentacao = `Feto em situação ${d.situacao ? d.situacao.toLowerCase() : 'longitudinal'}, apresentação ${d.apresentacao ? d.apresentacao.toLowerCase() : 'cefálica'}, dorso ${d.dorso ? d.dorso.toLowerCase() : 'lateral'}.`;
            comentarios.push(apresentacao);
        }

        if (d.citarColoNormal) comentarios.push(`Colo uterino de aspecto ecográfico normal (fechado).`);
        if (d.citarComprimentoColo && d.medidaColo) comentarios.push(`Comprimento do colo uterino: ${d.medidaColo} mm.`);

        // 2. VITALIDADE
        let vitalidade = '';
        if(d.subtipo === 'OBSTETRICO_1_TRI') {
             if (d.bcfIndetectavel) vitalidade = "Batimentos cardiofetais indetectáveis.";
             else vitalidade = `Embrião vivo, BCF ${d.bcf} bpm.`;
             if(d.ccn) vitalidade += ` CCN: ${d.ccn} mm.`;
        } else {
             vitalidade = `Batimentos cardiofetais presentes e rítmicos (${d.bcf} bpm). Movimentação fetal ativa.`;
        }
        comentarios.push(vitalidade);

        // 3. TABELA DE BIOMETRIA (Preenchida se houver valores)
        const addBio = (label, val) => { if(val) tabelaBiometria.push({ estrutura: label, medida: val + ' mm' }); };
        addBio('Diâmetro Biparietal (DBP)', d.dbp);
        addBio('Diâmetro Occipitofrontal (DOF)', d.dof);
        addBio('Circunferência Craniana (CC)', d.cc);
        addBio('Circunferência Abdominal (CA)', d.ca);
        addBio('Fêmur', d.femur);
        addBio('Úmero', d.umero);
        addBio('Cerebelo', d.cerebelo);
        addBio('Cisterna Magna', d.cisternaMagna);
        addBio('Ventrículo Lateral', d.ventriculoLat);
        addBio('Osso Nasal', d.ossoNasal);
        addBio('Prega Nucal', d.pregaNucal);
        if(d.pesoEstimado && d.checkPeso) tabelaBiometria.push({ estrutura: 'Peso Fetal Estimado', medida: d.pesoEstimado + ' g' });
        
        // Adicionar índices na tabela ou comentários? No Turing geralmente índices vão abaixo da tabela ou em linha.
        // Vamos por em comentários para não poluir a tabela de medidas brutas.
        if (d.subtipo !== 'OBSTETRICO_1_TRI') {
            const indices = [];
            if(d.checkIndiceCefalico && d.resIc) indices.push(`IC: ${d.resIc}%`);
            if(d.checkRelacaoCcCa && d.resCcCa) indices.push(`CC/CA: ${d.resCcCa}`);
            if(d.checkRelacaoCfCa && d.resCfCa) indices.push(`Fêmur/CA: ${d.resCfCa}%`);
            if(indices.length > 0) comentarios.push(`Relações biométricas: ${indices.join(' | ')}.`);
        }

        // 4. MORFOLOGIA (Agrupamento Inteligente)
        const morfologiaNormal = [];
        // Mapeamento auditado com SecaoMorfologia.jsx
        if (d.morfCranio) morfologiaNormal.push("crânio");
        if (d.morfCerebro) morfologiaNormal.push("encéfalo");
        if (d.morfFace) morfologiaNormal.push("face");
        if (d.morfColuna) morfologiaNormal.push("coluna vertebral");
        if (d.morfTorax) morfologiaNormal.push("tórax");
        if (d.morfCoracao) morfologiaNormal.push("coração (4 câmaras)");
        if (d.morfEstomago) morfologiaNormal.push("estômago");
        if (d.morfFigado) morfologiaNormal.push("fígado");
        if (d.morfRins) morfologiaNormal.push("rins");
        if (d.morfBexiga) morfologiaNormal.push("bexiga");
        if (d.morfParedeAbd) morfologiaNormal.push("parede abdominal");
        if (d.morfMembros) morfologiaNormal.push("membros");

        if (morfologiaNormal.length > 0) {
            comentarios.push(`Anatomia Fetal: Visualizados com aspecto ecográfico habitual: ${morfologiaNormal.join(', ')}.`);
        }
        if (d.sexoFetal && d.sexoFetal !== 'NÃO VISUALIZADO') {
            comentarios.push(`Genitália externa compatível com sexo ${d.sexoFetal.toLowerCase()}.`);
        }

        // 5. ANEXOS
        let placentaTxt = `Placenta: Inserção ${d.placentaInsercao.toLowerCase()}, aspecto ${d.placentaAspecto.toLowerCase()}.`;
        if(d.placentaEspessura) placentaTxt += ` Espessura: ${d.placentaEspessura} mm.`;
        comentarios.push(placentaTxt);

        let liquidoTxt = `Líquido Amniótico: Volume ${d.liquidoVolume.toLowerCase()}.`;
        if(d.ila) liquidoTxt += ` ILA: ${d.ila} cm.`;
        if(d.maiorBolso) liquidoTxt += ` Maior bolso: ${d.maiorBolso} cm.`;
        comentarios.push(liquidoTxt);

        if(d.cordaoCircular !== 'não citar' && d.cordaoCircular !== 'ausente') {
            comentarios.push(`Cordão Umbilical: Presença de circular ${d.cordaoCircular}.`);
        }

        // 6. DOPPLER (Lógica Detalhada)
        if (d.usarDoppler) {
            const dopComments = [];
            // Uterinas
            if(d.checkUtDir) {
                let txt = `Art. Uterina Dir: IP ${d.utDirIP || '--'}`;
                if(d.utDirIncisura) txt += ' (com incisura protodiastólica)';
                dopComments.push(txt);
            }
            if(d.checkUtEsq) {
                let txt = `Art. Uterina Esq: IP ${d.utEsqIP || '--'}`;
                if(d.utEsqIncisura) txt += ' (com incisura protodiastólica)';
                dopComments.push(txt);
            }
            // Umbilical
            if(d.checkUmb) {
                let txt = `Art. Umbilical: IP ${d.umbIP || '--'}`;
                const umbAlts = [];
                if(d.umbDiastoleBaixa) umbAlts.push("diástole baixa");
                if(d.umbDiastoleZero) umbAlts.push("diástole zero");
                if(d.umbDiastoleReversa) umbAlts.push("diástole reversa");
                if(umbAlts.length > 0) txt += ` (${umbAlts.join(', ')})`;
                dopComments.push(txt);
            }
            // ACM
            if(d.checkAcm) {
                let txt = `ACM: PVS ${d.acmPVS || '--'} cm/s`;
                if(d.checkAcmIP) txt += `, IP ${d.acmIP}`;
                if(d.acmDiastoleAlta) txt += ` (vasodilatação/diástole alta)`;
                dopComments.push(txt);
            }
            // Ducto
            if(d.checkDv) {
                let txt = `Ducto Venoso: IP ${d.dvIP || '--'}`;
                if(d.dvOndaAZero) txt += ` (Onda A Zero)`;
                if(d.dvOndaAReversa) txt += ` (Onda A Reversa)`;
                dopComments.push(txt);
            }
            
            if(dopComments.length > 0) {
                comentarios.push('Estudo Dopplerfluxométrico:');
                dopComments.forEach(c => comentarios.push(c));
            }
        }

        // 7. CONCLUSÃO
        if(d.conclusaoNormal) conclusao.push("Desenvolvimento fetal compatível com a idade gestacional.");
        if(d.obsAdicionais) conclusao.push(d.obsAdicionais);
        // Adicione lógicas automáticas de conclusão aqui se desejar (ex: se Diástole Zero -> Centralização)

        return { tabelaBiometria, listaComentarios: comentarios, listaConclusao: conclusao };
    };

    // --- MONTAGEM DE DADOS FINAIS ---
    const dadosF1 = processarFeto(dadosFeto1.current || data);
    const dadosF2 = isGemelar ? processarFeto(dadosFeto2.current) : null;

    // Gera o preview de texto para a tela
    let textoPreview = `--- FETO 1 ---\n`;
    textoPreview += "MEDIDAS:\n" + dadosF1.tabelaBiometria.map(x=>`${x.estrutura}: ${x.medida}`).join('\n') + "\n\n";
    textoPreview += "RELATÓRIO:\n" + dadosF1.listaComentarios.join('\n') + "\n\n";
    textoPreview += "CONCLUSÃO:\n" + dadosF1.listaConclusao.join('\n');

    if(isGemelar && dadosF2) {
        textoPreview += `\n\n--- FETO 2 ---\n`;
        textoPreview += "MEDIDAS:\n" + dadosF2.tabelaBiometria.map(x=>`${x.estrutura}: ${x.medida}`).join('\n') + "\n\n";
        textoPreview += "RELATÓRIO:\n" + dadosF2.listaComentarios.join('\n') + "\n\n";
        textoPreview += "CONCLUSÃO:\n" + dadosF2.listaConclusao.join('\n');
    }

    const mapTitulo = {
        'OBSTETRICO_MORFOLOGICO': 'ULTRASSONOGRAFIA MORFOLÓGICA FETAL',
        'OBSTETRICO_1_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA DE 1º TRIMESTRE',
        'OBSTETRICO_2_3_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA'
    };

    onUpdate({ 
        texto: textoPreview, 
        dadosEstruturados: { 
            feto1: { ...dadosFeto1.current, ...dadosF1 }, 
            feto2: isGemelar ? { ...dadosFeto2.current, ...dadosF2 } : null,
            isGemelar,
            paciente: data.paciente // Se houver
        }, 
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
              <div className={`gemelar-tab ${fetoAtivo === 1 ? 'active' : ''}`} onClick={() => handleTabChange(1)}>
                  FETO 1
              </div>
              <div className={`gemelar-tab ${fetoAtivo === 2 ? 'active' : ''}`} onClick={() => handleTabChange(2)}>
                  FETO 2
              </div>
          </div>
      )}

      {/* CONTEÚDO */}
      <div style={{ opacity: isGemelar && fetoAtivo === 2 ? 0.95 : 1 }}>
          <SecaoSubtipo data={data} handleChange={handleChange} />
          <SecaoDatacao data={data} handleChange={handleChange} handleDatacaoChange={handleDatacaoChange} />
          
          {isPrimeiroTri ? (
              <>
                <SecaoDadosMaternos1Tri data={data} handleChange={handleChange} />
                <SecaoSacoGestacional data={data} handleChange={handleChange} />
                <SecaoEmbriao data={data} handleChange={handleChange} />
                <SecaoDoppler data={data} handleChange={handleChange} />
                <SecaoConclusao data={data} handleChange={handleChange} />
              </>
          ) : (
              <>
                <SecaoColoDados data={data} handleChange={handleChange} />
                <SecaoBiometria data={data} handleChange={handleChange} />
                <div style={{ margin: '5px 0' }}>
                    <SecaoIndicesGraficos data={data} handleChange={handleChange} />
                </div>
                <div style={{ margin: '5px 0', border: '1px solid #ddd', padding: '5px', background: '#f9f9f9', borderRadius: '4px' }}>
                    <button onClick={() => setMostrarGraficos(!mostrarGraficos)} style={{cursor: 'pointer', border: 'none', background: 'transparent', color: '#1565C0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <FaChartLine /> {mostrarGraficos ? 'Ocultar Curvas' : 'Visualizar Curvas de Crescimento'}
                    </button>
                    {mostrarGraficos && <GraficosObstetricos igSemanas={(new Date() - new Date(data.dum+'T12:00:00'))/(86400000*7)} peso={data.pesoEstimado} femur={data.femur} />}
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