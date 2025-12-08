import React from 'react';

const SecaoDadosGerais = ({ data, handleChange }) => {
  return (
    <div className="bg-blue-50 p-2 rounded border border-blue-200 text-xs mb-2">
        <div className="font-bold text-blue-800 mb-2 border-b border-blue-200 pb-1">
            Dados Gerais e Vitalidade
        </div>

        <div className="space-y-3">
            
            {/* LINHA 1: Bexiga */}
            <div className="flex items-center gap-2">
                <span className="font-bold w-24">Bexiga Materna:</span>
                <select 
                    name="bexigaMaterna" 
                    value={data.bexigaMaterna} 
                    onChange={handleChange} 
                    className="border border-gray-300 rounded p-1 flex-1"
                >
                    <option value="não visualizada">não visualizada</option>
                    <option value="repleta">repleta</option>
                    <option value="vazia">vazia</option>
                    <option value="não citar">não citar</option>
                </select>
            </div>

            {/* LINHA 2: Situação e Posição */}
            <div className="grid grid-cols-3 gap-2">
                <div>
                    <span className="block text-[10px] text-gray-500 font-bold uppercase">Situação</span>
                    <select name="situacao" value={data.situacao} onChange={handleChange} className="w-full border p-1 rounded">
                        <option value="longitudinal">longitudinal</option>
                        <option value="transversa">transversa</option>
                        <option value="oblíqua">oblíqua</option>
                    </select>
                </div>
                <div>
                    <span className="block text-[10px] text-gray-500 font-bold uppercase">Apresentação</span>
                    <select name="apresentacao" value={data.apresentacao} onChange={handleChange} className="w-full border p-1 rounded">
                        <option value="cefálica">cefálica</option>
                        <option value="pélvica">pélvica</option>
                        <option value="córmica">córmica</option>
                    </select>
                </div>
                <div>
                    <span className="block text-[10px] text-gray-500 font-bold uppercase">Dorso</span>
                    <select name="dorso" value={data.dorso} onChange={handleChange} className="w-full border p-1 rounded">
                        <option value="à direita">à direita</option>
                        <option value="à esquerda">à esquerda</option>
                        <option value="anterior">anterior</option>
                        <option value="posterior">posterior</option>
                    </select>
                </div>
            </div>

            {/* LINHA 3: Vitalidade */}
            <div className="flex items-center gap-4 bg-white p-2 rounded border border-gray-200">
                <div className="flex items-center gap-2">
                    <span className="font-bold">BCF:</span>
                    <input 
                        type="number" 
                        name="bcf" 
                        value={data.bcf} 
                        onChange={handleChange} 
                        className="w-16 border p-1 rounded text-center font-bold text-blue-900" 
                    />
                    <span>bpm</span>
                </div>
                
                <label className="flex items-center gap-2 font-bold text-gray-700">
                    <input type="checkbox" name="movFetal" checked={data.movFetal} onChange={handleChange} />
                    Movimentos Fetais Presentes
                </label>
            </div>

            {/* LINHA 4: Estomago e Bexiga do Feto */}
            <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2">
                    <input type="checkbox" name="estomagoVisualizado" checked={data.estomagoVisualizado} onChange={handleChange} />
                    Estômago Visível/Repleto
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" name="bexigaVisualizada" checked={data.bexigaVisualizada} onChange={handleChange} />
                    Bexiga Visível/Repleta
                </label>
            </div>

        </div>
    </div>
  );
};

export default SecaoDadosGerais;