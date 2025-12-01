// src/components/laudos/trasnvaginal/FormTransvaginal.jsx
import React, { useState, useEffect } from 'react';
import { FaFemale } from 'react-icons/fa';
import '../Laudos.css';

// Importação das Seções
import SecaoTecnicaBexiga from './sections/SecaoTecnicaBexiga';
import SecaoUtero from './sections/SecaoUtero';
import SecaoOvarios from './sections/SecaoOvarios';
import SecaoRegiaoAnexial from './sections/SecaoRegiaoAnexial';

const FormTransvaginal = ({ onUpdate }) => {
  
  const initialState = {
      // TÉCNICA
      subtipo: 'TRANSVAGINAL_PELVICA', // ou ABDOME_PELVE
      limitacao: 'nenhuma', // meteorismo, obesidade, etc.
      
      // BEXIGA
      bexiga: 'vazia', // vazia, replecao_insuficiente, normal, sonda
      volPre1: '', volPre2: '', volPre3: '', resVolPre: '',
      volPos1: '', volPos2: '', volPos3: '', resVolPos: '',
      calcResiduo: false,

      // ÚTERO
      uteroAusente: false,
      uteroPosicao: 'anteversoflexão',
      ut1: '', ut2: '', ut3: '', resVolUtero: '', // Medidas e Volume
      miometrio: 'homogêneo', // heterogêneo, nodulos
      citarNodulos: false,
      nod1_d1: '', nod1_d2: '', nod1_loc: 'corpórea anterior', nod1_tipo: 'intramural',
      
      // ENDOMÉTRIO
      endometrioEspessura: '',
      endometrioAspecto: 'ecogênico e homogêneo', // trilaminar, heterogêneo
      cavidadeUterina: 'virtual', // conteudo liquido, DIU
      diuPosicao: 'bem posicionado',
      diuDistanciaFundo: '',

      // OVÁRIOS (OD = Ovário Direito, OE = Ovário Esquerdo)
      odVisibilizado: true, od1: '', od2: '', od3: '', resVolOd: '',
      odAspecto: 'normal', // policistico, folicular, cisto_simples
      odCistoMedida: '', odCistoTipo: 'simples',
      
      oeVisibilizado: true, oe1: '', oe2: '', oe3: '', resVolOe: '',
      oeAspecto: 'normal', 
      oeCistoMedida: '', oeCistoTipo: 'simples',

      // REGIÃO ANEXIAL / FUNDO DE SACO
      liquidoLivre: 'ausente', // pequena quantidade, moderada
      hidrossalpinge: false,
      massasAnexiais: false,

      conclusaoNormal: false,
      obsGerais: ''
  };

  const [data, setData] = useState(initialState);

  // --- CÁLCULO AUTOMÁTICO DE VOLUMES ---
  useEffect(() => {
    const calcVolume = (d1, d2, d3) => {
        const v1 = parseFloat(d1); const v2 = parseFloat(d2); const v3 = parseFloat(d3);
        if(!isNaN(v1) && !isNaN(v2) && !isNaN(v3)) {
            return (v1 * v2 * v3 * 0.523).toFixed(1).replace('.', ',');
        }
        return '';
    };

    let updates = {};
    let mudou = false;

    // Volume Útero
    const vUt = calcVolume(data.ut1, data.ut2, data.ut3);
    if(vUt !== data.resVolUtero) { updates.resVolUtero = vUt; mudou = true; }

    // Volume OD
    const vOd = calcVolume(data.od1, data.od2, data.od3);
    if(vOd !== data.resVolOd) { updates.resVolOd = vOd; mudou = true; }

    // Volume OE
    const vOe = calcVolume(data.oe1, data.oe2, data.oe3);
    if(vOe !== data.resVolOe) { updates.resVolOe = vOe; mudou = true; }

    // Volume Bexiga (Pré/Pós)
    if(data.calcResiduo) {
        const vPre = (parseFloat(data.volPre1) * parseFloat(data.volPre2) * parseFloat(data.volPre3) * 0.523).toFixed(0);
        const vPos = (parseFloat(data.volPos1) * parseFloat(data.volPos2) * parseFloat(data.volPos3) * 0.523).toFixed(0);
        if(!isNaN(parseFloat(vPre)) && vPre !== data.resVolPre) { updates.resVolPre = vPre; mudou = true; }
        if(!isNaN(parseFloat(vPos)) && vPos !== data.resVolPos) { updates.resVolPos = vPos; mudou = true; }
    }

    if(mudou) setData(prev => ({ ...prev, ...updates }));

  }, [data.ut1, data.ut2, data.ut3, data.od1, data.od2, data.od3, data.oe1, data.oe2, data.oe3, data.volPre1, data.volPre2, data.volPre3, data.volPos1, data.volPos2, data.volPos3, data.calcResiduo]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- GERAÇÃO DE TEXTO ---
  useEffect(() => {
    let t = `ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL\n\n`;

    // 1. TÉCNICA E BEXIGA
    if (data.limitacao !== 'nenhuma') t += `Exame com limitações técnicas devido a ${data.limitacao}.\n`;
    
    if (data.bexiga === 'vazia') t += `Bexiga vazia.\n`;
    else if (data.bexiga === 'normal') t += `Bexiga com boa repleção, paredes finas e conteúdo anecóico.\n`;
    
    if (data.calcResiduo && data.resVolPre) {
        t += `Volume vesical pré-miccional estimado em ${data.resVolPre} ml. `;
        t += `Volume pós-miccional (resíduo) estimado em ${data.resVolPos || '0'} ml.\n`;
    }

    // 2. ÚTERO
    t += `\nÚtero: `;
    if(data.uteroAusente) {
        t += `Não visibilizado (Histerectomia).\n`;
    } else {
        t += `Em ${data.uteroPosicao}, com contornos regulares e ecotextura ${data.miometrio}. `;
        if (data.ut1 && data.ut2 && data.ut3) {
            t += `Dimensões: ${data.ut1} x ${data.ut2} x ${data.ut3} cm. Volume: ${data.resVolUtero} cm³. `;
        }
        
        // Miomas / Nódulos
        if (data.miometrio === 'heterogêneo' || data.citarNodulos) {
            if (data.citarNodulos && data.nod1_d1) {
                t += `Presença de nódulo miometrial (${data.nod1_tipo}), medindo ${data.nod1_d1}x${data.nod1_d2} mm, localizado na parede ${data.nod1_loc}. `;
            } else {
                t += `Ecotextura miometrial heterogênea sugere miomatose/adenomiose incipiente. `;
            }
        }
        t += `\n`;

        // Endométrio
        t += `Eco endometrial ${data.endometrioAspecto}`;
        if (data.endometrioEspessura) t += `, espessura de ${data.endometrioEspessura} mm`;
        t += `.\n`;

        // DIU
        if (data.cavidadeUterina.includes('DIU')) {
            t += `Dispositivo Intrauterino (DIU) visibilizado na cavidade. ${data.diuPosicao}.`;
            if (data.diuDistanciaFundo) t += ` Distância do fundo: ${data.diuDistanciaFundo} mm.`;
            t += `\n`;
        }
    }

    // 3. OVÁRIOS
    const descOvario = (lado, prefix, vol) => {
        let txt = `Ovário ${lado}: `;
        if (!data[`${prefix}Visibilizado`]) return txt + `Não visibilizado (interposição gasosa/cirurgia prévia).\n`;
        
        txt += `Tópico, forma e ecotextura preservadas. `;
        if (data[`${prefix}1`]) txt += `Dimensões: ${data[`${prefix}1`]} x ${data[`${prefix}2`]} x ${data[`${prefix}3`]} cm (${vol} cm³). `;
        
        // Cistos / Aspecto
        if (data[`${prefix}Aspecto`] === 'policistico') txt += `Presença de múltiplos microfolículos periféricos (sugestivo de SOP). `;
        else if (data[`${prefix}Aspecto`] === 'cisto_simples') {
            txt += `Nota-se imagem anecóica, paredes finas (cisto simples), medindo ${data[`${prefix}CistoMedida`]} mm. `;
        }
        
        return txt + `\n`;
    };

    t += `\n`;
    t += descOvario('Direito', 'od', data.resVolOd);
    t += descOvario('Esquerdo', 'oe', data.resVolOe);

    // 4. REGIÃO ANEXIAL / CONCLUSÃO
    if (data.liquidoLivre !== 'ausente') t += `\nLíquido livre: Presença de ${data.liquidoLivre} quantidade de líquido livre em fundo de saco posterior.\n`;
    if (data.hidrossalpinge) t += `Imagem tubular anecóica em região anexial sugerindo hidrossalpinge.\n`;

    t += `\nCONCLUSÃO:\n`;
    if (data.conclusaoNormal) {
        t += `Exame ecográfico pélvico dentro dos limites da normalidade.\n`;
    }
    if (data.obsGerais) t += `OBS: ${data.obsGerais}`;

    onUpdate({ texto: t, dadosEstruturados: data, tituloExame: 'ULTRASSONOGRAFIA TRANSVAGINAL' });
  }, [data, onUpdate]);

  return (
    <div className="laudo-container">
        <h3 style={{borderBottom: '2px solid #880E4F', color: '#880E4F', paddingBottom: '5px'}}>
           <FaFemale /> PELVE TRANSVAGINAL
        </h3>

        <SecaoTecnicaBexiga data={data} handleChange={handleChange} />
        <SecaoUtero data={data} handleChange={handleChange} />
        <SecaoOvarios data={data} handleChange={handleChange} />
        <SecaoRegiaoAnexial data={data} handleChange={handleChange} />
        
        <div className="laudo-section">
            <label className="laudo-checkbox-label" style={{fontWeight: 'bold', fontSize: '14px'}}>
                <input type="checkbox" name="conclusaoNormal" checked={data.conclusaoNormal} onChange={handleChange} />
                CONCLUSÃO NORMAL
            </label>
            <textarea 
                className="laudo-textarea"
                placeholder="Observações Gerais / Conclusão Específica"
                name="obsGerais"
                value={data.obsGerais}
                onChange={handleChange}
            />
        </div>
    </div>
  );
};

export default FormTransvaginal;