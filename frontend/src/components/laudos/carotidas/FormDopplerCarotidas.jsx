import React, { useState, useEffect, useRef } from 'react';
import { FaHeartbeat } from 'react-icons/fa'; // Pode trocar por icone de vaso se tiver
import '../Laudos.css';

// Importação das Seções
import SecaoCarotidaComum from './sections/SecaoCarotidaComum';
import SecaoBulbo from './sections/SecaoBulbo';
import SecaoCarotidaInterna from './sections/SecaoCarotidaInterna';
import SecaoCarotidaExterna from './sections/SecaoCarotidaExterna';
import SecaoVertebral from './sections/SecaoVertebral';
import SecaoConclusaoCarotidas from './sections/SecaoConclusaoCarotidas';

const FormDopplerCarotidas = ({ onUpdate }) => {
  
  // Função auxiliar para estado inicial de um vaso (Padrão Turing)
  const vasoInitialState = (prefixo) => ({
    [`${prefixo}Vps`]: '', [`${prefixo}Vdf`]: '',
    [`${prefixo}SemPlacas`]: true, [`${prefixo}PlacasMinimas`]: false,
    [`${prefixo}PlacaTipo`]: 'calcificada', // calcificada, mista, mole
    [`${prefixo}PlacaLocal`]: 'parede_posterior',
    [`${prefixo}PlacaExtensao`]: 'nao_citar',
    [`${prefixo}PlacaSuperficie`]: 'nao_citar',
    [`${prefixo}Obs`]: '',
    [`${prefixo}Estenose`]: '0-50%', // Para tabela de estenose
  });

  const initialState = {
      subtipo: 'DOPPLER_CAROTIDAS',
      
      // Carótida Comum (ACC)
      ...vasoInitialState('accDir'), ...vasoInitialState('accEsq'),
      accDirEspessura: '', accEsqEspessura: '', // EIM
      
      // Bulbo
      ...vasoInitialState('bulbDir'), ...vasoInitialState('bulbEsq'),

      // Carótida Interna (ACI) - O mais crítico para estenose
      ...vasoInitialState('aciDir'), ...vasoInitialState('aciEsq'),
      aciDirTortuosidade: false, aciEsqTortuosidade: false,

      // Carótida Externa (ACE)
      ...vasoInitialState('aceDir'), ...vasoInitialState('aceEsq'),

      // Vertebrais
      vertDirVps: '', vertDirVdf: '', vertDirFluxo: 'anterógrado', vertDirCalibre: 'normal',
      vertEsqVps: '', vertEsqVdf: '', vertEsqFluxo: 'anterógrado', vertEsqCalibre: 'normal',

      conclusaoNormal: false,
      obsGerais: ''
  };

  const [data, setData] = useState(initialState);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Lógica para desmarcar "Sem Placas" se selecionar "Placas Mínimas" e vice-versa
    if (name.includes('SemPlacas') && checked) {
        const prefix = name.replace('SemPlacas', '');
        setData(prev => ({ ...prev, [name]: checked, [`${prefix}PlacasMinimas`]: false }));
    } else if (name.includes('PlacasMinimas') && checked) {
        const prefix = name.replace('PlacasMinimas', '');
        setData(prev => ({ ...prev, [name]: checked, [`${prefix}SemPlacas`]: false }));
    } else {
        setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  // --- GERAÇÃO DE TEXTO ---
  useEffect(() => {
    let t = `DOPPLER COLORIDO DE CARÓTIDAS E VERTEBRAIS\n\n`;

    // Função Helper para descrever um vaso
    const descreverVaso = (nomeVaso, lado, prefix) => {
        let texto = `${nomeVaso} ${lado}: `;
        
        // Morfologia / Placas
        if (data[`${prefix}SemPlacas`]) {
            texto += `Calibre e trajeto preservados. Ausência de placas de ateroma ou espessamento médio-intimal significativo. `;
        } else {
            if (data[`${prefix}PlacasMinimas`]) texto += `Espessamento médio-intimal difuso/placas mínimas sem repercussão hemodinâmica. `;
            else {
                texto += `Presença de placa ${data[`${prefix}PlacaTipo`]} na ${data[`${prefix}PlacaLocal`].replace('_', ' ')}. `;
                // Aqui entraria lógica de estenose se selecionada
            }
        }

        // Hemodinâmica (Vps/Vdf)
        const vps = data[`${prefix}Vps`];
        const vdf = data[`${prefix}Vdf`];
        if (vps || vdf) {
            texto += `Fluxo laminar. `;
            if(vps) texto += `VPS: ${vps} cm/s. `;
            if(vdf) texto += `VDF: ${vdf} cm/s. `;
        }
        
        // Específico Interna (Tortuosidade)
        if (nomeVaso.includes('Interna') && data[`${prefix}Tortuosidade`]) {
            texto += `Trajeto tortuoso. `;
        }

        return texto + '\n';
    };

    // 1. Carótidas Comuns
    t += descreverVaso('Carótida Comum', 'Direita', 'accDir');
    if(data.accDirEspessura) t += `(Espessura Médio-Intimal ACC Dir: ${data.accDirEspessura} mm)\n`;
    t += descreverVaso('Carótida Comum', 'Esquerda', 'accEsq');
    if(data.accEsqEspessura) t += `(Espessura Médio-Intimal ACC Esq: ${data.accEsqEspessura} mm)\n`;
    t += '\n';

    // 2. Bulbos e Internas
    t += descreverVaso('Bulbo Carotídeo', 'Direito', 'bulbDir');
    t += descreverVaso('Carótida Interna', 'Direita', 'aciDir');
    t += '\n';
    t += descreverVaso('Bulbo Carotídeo', 'Esquerdo', 'bulbEsq');
    t += descreverVaso('Carótida Interna', 'Esquerda', 'aciEsq');
    t += '\n';

    // 3. Carótidas Externas
    t += descreverVaso('Carótida Externa', 'Direita', 'aceDir');
    t += descreverVaso('Carótida Externa', 'Esquerda', 'aceEsq');
    t += '\n';

    // 4. Vertebrais
    const descVert = (lado, prefix) => {
        let txt = `Artéria Vertebral ${lado}: `;
        txt += `Calibre ${data[`${prefix}Calibre`]}. Fluxo ${data[`${prefix}Fluxo`]}. `;
        if(data[`${prefix}Vps`]) txt += `VPS: ${data[`${prefix}Vps`]} cm/s.`;
        return txt + '\n';
    };
    t += descVert('Direita', 'vertDir');
    t += descVert('Esquerda', 'vertEsq');

    // Conclusão
    t += `\nCONCLUSÃO:\n`;
    if (data.conclusaoNormal) {
        t += `Estudo Dopplerfluxométrico das artérias carótidas e vertebrais sem evidência de estenoses hemodinamicamente significativas.\n`;
        t += `Fluxo anterógrado nas artérias vertebrais.\n`;
    }
    if (data.obsGerais) t += `\nOBS: ${data.obsGerais}`;

    onUpdate({ texto: t, dadosEstruturados: data, tituloExame: 'DOPPLER DE CARÓTIDAS E VERTEBRAIS' });
  }, [data, onUpdate]);

  return (
    <div className="laudo-container">
        <h3 style={{borderBottom: '2px solid #C62828', color: '#C62828', paddingBottom: '5px'}}>DOPPLER DE CARÓTIDAS</h3>
        
        {/* A ideia é passar o prefixo correto para cada componente renderizar Dir e Esq internamente ou duplicar o componente.
            Para ficar igual ao print (lado a lado), o ideal é que cada Seção renderize as duas colunas.
        */}

        <SecaoCarotidaComum data={data} handleChange={handleChange} />
        <SecaoCarotidaInterna data={data} handleChange={handleChange} />
        <SecaoBulbo data={data} handleChange={handleChange} />
        <SecaoCarotidaExterna data={data} handleChange={handleChange} />
        <SecaoVertebral data={data} handleChange={handleChange} />
        
        <SecaoConclusaoCarotidas data={data} handleChange={handleChange} />

    </div>
  );
};

export default FormDopplerCarotidas;