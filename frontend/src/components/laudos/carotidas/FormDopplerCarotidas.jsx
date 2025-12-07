import React from 'react';
import useDopplerCarotidasForm from './hooks/useDopplerCarotidasForm';
import '../Laudos.css'; // Mantenha seus estilos globais

// Importação das Seções Modulares (Reutilizando as existentes)
import SecaoCarotidaComum from './sections/SecaoCarotidaComum';
import SecaoBulbo from './sections/SecaoBulbo';
import SecaoCarotidaInterna from './sections/SecaoCarotidaInterna';
import SecaoCarotidaExterna from './sections/SecaoCarotidaExterna';
import SecaoVertebral from './sections/SecaoVertebral';
import SecaoConclusaoCarotidas from './sections/SecaoConclusaoCarotidas';

const FormDopplerCarotidas = ({ onUpdate }) => {
  // Hook que gerencia toda a lógica e estado
  const { data, handleChange } = useDopplerCarotidasForm(onUpdate);

  return (
    <div className="laudo-container">
        {/* Cabeçalho Visual do Formulário */}
        <h3 style={{
            borderBottom: '2px solid #C62828', 
            color: '#C62828', 
            paddingBottom: '5px',
            marginBottom: '15px'
        }}>
            DOPPLER DE CARÓTIDAS
        </h3>
        
        {/* Renderização das Seções */}
        <SecaoCarotidaComum data={data} handleChange={handleChange} />
        <SecaoCarotidaInterna data={data} handleChange={handleChange} />
        <SecaoBulbo data={data} handleChange={handleChange} />
        <SecaoCarotidaExterna data={data} handleChange={handleChange} />
        <SecaoVertebral data={data} handleChange={handleChange} />
        
        {/* Seção de Conclusão */}
        <SecaoConclusaoCarotidas data={data} handleChange={handleChange} />
    </div>
  );
};

export default FormDopplerCarotidas;