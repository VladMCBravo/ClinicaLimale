import React from 'react';

// Recebe data e onChange do Pai
const SecaoConclusao = ({ data, onChange }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Peso Fetal */}
      <div>
        <label className="block text-xs font-bold">Peso Estimado (g)</label>
        <input 
          type="number" 
          name="pesoEstimado" 
          value={data.pesoEstimado || ''} // Conexão vital
          onChange={onChange}             // Conexão vital
          className="border p-1 w-full text-sm"
        />
      </div>

      {/* Sexo Fetal */}
      <div>
        <label className="block text-xs font-bold">Sexo Fetal</label>
        <select 
          name="sexoFetal" 
          value={data.sexoFetal || 'MASCULINO'} 
          onChange={onChange}
          className="border p-1 w-full text-sm"
        >
          <option value="MASCULINO">Masculino</option>
          <option value="FEMININO">Feminino</option>
          <option value="NAO_VISUALIZADO">Não Visualizado</option>
        </select>
      </div>

      {/* Se tiver algum <div className="texto-preview">...</div> AQUI, DELETE! */}
    </div>
  );
};

export default SecaoConclusao;