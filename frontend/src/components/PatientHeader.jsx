// src/components/PatientHeader.jsx
// NOVO: Este é um componente totalmente novo.

import React from 'react';
import './PatientHeader.css'; // Criaremos este arquivo para o estilo

const PatientHeader = ({ paciente }) => {
  // Se os dados do paciente ainda não carregaram, não mostra nada
  if (!paciente) {
    return (
        <div className="patient-header">
            <h2 className="patient-name">Carregando...</h2>
        </div>
    );
  }

  // Função para calcular a idade a partir da data de nascimento
  const calcularIdade = (dataNascimento) => {
    // É importante que o backend envie a data de nascimento para isto funcionar
    if (!dataNascimento) return 'N/A';
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  return (
    <div className="patient-header">
      <h2 className="patient-name">{paciente.nome_completo}</h2>
      <div className="patient-vitals">
        {/* Lembre-se de adicionar 'data_nascimento', 'peso' e 'altura' no seu serializer de Paciente no Django */}
        <span><strong>Idade:</strong> {calcularIdade(paciente.data_nascimento)} anos</span>
        <span><strong>Peso:</strong> {paciente.peso || 'N/A'} kg</span>
        <span><strong>Altura:</strong> {paciente.altura || 'N/A'} m</span>
      </div>
    </div>
  );
};

export default PatientHeader;