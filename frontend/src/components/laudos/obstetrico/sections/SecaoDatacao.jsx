import React, { useEffect } from 'react';

const SecaoDatacao = ({ data, handleChange }) => {

  // Efeito para garantir que a DUM venha formatada corretamente do estado
  // Se 'data.dum' mudar externamente, o input reflete
  
  // Função auxiliar para lidar com a troca de modo (DUM vs Anterior vs Biometria)
  const handleModeChange = (modo) => {
      // Simula eventos de change para atualizar os booleans no estado
      if (modo === 'USAR_DUM') {
          handleChange({ target: { name: 'usarDum', value: true, type: 'checkbox', checked: true } });
          handleChange({ target: { name: 'dumDesconhecida', value: false, type: 'checkbox', checked: false } });
          handleChange({ target: { name: 'naoUsarDum', value: false, type: 'checkbox', checked: false } });
      } else if (modo === 'DUM_DESCONHECIDA') {
          handleChange({ target: { name: 'usarDum', value: false, type: 'checkbox', checked: false } });
          handleChange({ target: { name: 'dumDesconhecida', value: true, type: 'checkbox', checked: true } });
          handleChange({ target: { name: 'naoUsarDum', value: false, type: 'checkbox', checked: false } });
      } else if (modo === 'NAO_USAR') {
          handleChange({ target: { name: 'usarDum', value: false, type: 'checkbox', checked: false } });
          handleChange({ target: { name: 'dumDesconhecida', value: false, type: 'checkbox', checked: false } });
          handleChange({ target: { name: 'naoUsarDum', value: true, type: 'checkbox', checked: true } });
      }
  };

  return (
    <div className="bg-purple-50 p-2 rounded border border-purple-200 text-xs">
        {/* CABEÇALHO DA SEÇÃO */}
        <div className="font-bold text-purple-800 mb-2 border-b border-purple-200 pb-1">
            DUM / DPP / Idade Gestacional
        </div>

        {/* OPÇÃO 1: USAR A DUM */}
        <div className="space-y-2">
            
            {/* Linha 1: Input da DUM */}
            <div className="flex items-center gap-2">
                <input 
                    type="radio" 
                    name="modoDatacao" // Grupo visual apenas
                    checked={data.usarDum} 
                    onChange={() => handleModeChange('USAR_DUM')}
                />
                <span className="font-bold text-gray-700">Usar a D.U.M.</span>
                
                <input 
                    type="date" 
                    name="dum" 
                    value={data.dum || ''} 
                    onChange={handleChange}
                    disabled={!data.usarDum}
                    className="border border-gray-300 rounded px-1 py-0.5"
                />

                {/* Resultado Calculado (Só exibe se tiver DUM válida) */}
                {data.usarDum && data.igDum && (
                    <span className="text-green-700 font-bold ml-2">
                        I.G. (DUM): {data.igDum}
                    </span>
                )}
            </div>

            {/* Linha 2: DUM Desconhecida */}
            <div className="flex items-center gap-2">
                <input 
                    type="radio" 
                    name="modoDatacao" 
                    checked={data.dumDesconhecida} 
                    onChange={() => handleModeChange('DUM_DESCONHECIDA')}
                />
                <span>D.U.M. desconhecida</span>
            </div>

            {/* Linha 3: Não Usar DUM */}
            <div className="flex items-center gap-2">
                <input 
                    type="radio" 
                    name="modoDatacao" 
                    checked={data.naoUsarDum} 
                    onChange={() => handleModeChange('NAO_USAR')}
                />
                <span>NÃO usar a D.U.M.</span>
            </div>

            {/* OPÇÕES EXTRAS DA DUM */}
            <div className="ml-6 space-y-1 mt-1">
                 <label className="flex items-center gap-2 text-gray-600">
                    <input 
                        type="checkbox" 
                        name="exibirDataDum" // Nome precisa bater com InitialState se existir, senão crie lá
                        checked={data.exibirDataDum || false} 
                        onChange={handleChange}
                        disabled={!data.usarDum}
                    />
                    exibir a data (10/09/2025) no texto
                </label>
            </div>

        </div>

        <hr className="my-3 border-purple-200" />

        {/* OPÇÃO 2: BIOMETRIA ATUAL */}
        <div className="flex justify-between items-center mb-2">
            <label className="flex items-center gap-2 font-bold text-gray-700">
                <input 
                    type="checkbox" 
                    name="citarDppBiometria" 
                    checked={data.citarDppBiometria || false} 
                    onChange={handleChange} 
                />
                citar D.P.P. pela biometria do exame atual
            </label>
            <span className="font-bold text-gray-500">
                {data.dppBiometriaCalculada || '--/--/----'}
            </span>
        </div>

        <hr className="my-3 border-purple-200" />

        {/* OPÇÃO 3: EXAME ANTERIOR */}
        <div>
            <label className="flex items-center gap-2 font-bold text-purple-800 mb-2">
                <input 
                    type="checkbox" 
                    name="usarExameAnterior" 
                    checked={data.usarExameAnterior || false} 
                    onChange={handleChange} 
                />
                Idade Gestacional Corrigida por exame anterior
            </label>

            <div className={`pl-6 p-2 bg-white rounded border ${data.usarExameAnterior ? 'border-purple-300' : 'border-gray-100 opacity-50'}`}>
                <div className="flex gap-4 mb-2">
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase">Data do Anterior</div>
                        <input 
                            type="date" 
                            name="dataExameAnterior" 
                            value={data.dataExameAnterior || ''} 
                            onChange={handleChange}
                            disabled={!data.usarExameAnterior}
                            className="border border-gray-300 rounded w-32"
                        />
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase">IG naquele exame</div>
                        <div className="flex items-center gap-1">
                            <input 
                                type="number" 
                                name="igAnteriorSemanas" 
                                value={data.igAnteriorSemanas || ''} 
                                onChange={handleChange}
                                disabled={!data.usarExameAnterior}
                                className="border border-gray-300 w-12 text-center"
                            />
                            <span>s</span>
                            <input 
                                type="number" 
                                name="igAnteriorDias" 
                                value={data.igAnteriorDias || ''} 
                                onChange={handleChange}
                                disabled={!data.usarExameAnterior}
                                className="border border-gray-300 w-12 text-center"
                            />
                            <span>d</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center mt-2">
                    <label className="flex items-center gap-2 text-xs">
                        <input 
                            type="checkbox" 
                            name="citarDppCorrigida" 
                            checked={data.citarDppCorrigida || false} 
                            onChange={handleChange}
                            disabled={!data.usarExameAnterior}
                        />
                        citar D.P.P. pela I.G. corrigida
                    </label>
                    <span className="font-bold text-green-700">
                        DPP Corrigida: {data.dppIgCorrigidaCalculada || '--/--/----'}
                    </span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SecaoDatacao;