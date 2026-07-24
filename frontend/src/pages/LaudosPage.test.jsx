import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'; 
import { BrowserRouter } from 'react-router-dom';
import LaudosPage from './LaudosPage';

jest.mock('../api/axiosConfig', () => ({
  get: jest.fn((url) => {
    if (url.includes('/usuarios/me/')) {
      return Promise.resolve({ data: { tem_certificado_valido: false } });
    }
    return Promise.resolve({ data: [] });
  }),
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));

describe('Testes de Segurança de Estado - LaudosPage', () => {
  
  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('Deve limpar os dados do paciente ao clicar na borracha (Limpar)', async () => {
    
    sessionStorage.setItem('laudos_rascunho_auto_save', JSON.stringify({ 
        paciente: { id: 1, nome_completo: 'João da Silva' }
    }));

    window.confirm = jest.fn(() => true); 

    render(
        <BrowserRouter>
            <LaudosPage />
        </BrowserRouter>
    );

    expect(screen.getByDisplayValue('1_João da Silva')).toBeInTheDocument();

    const botaoLimpar = screen.getByLabelText('Limpar');
    fireEvent.click(botaoLimpar);

    await waitFor(() => {
        // 👉 A CORREÇÃO É AQUI: Verificamos o resultado real (se retornou nulo)
        expect(sessionStorage.getItem('laudos_rascunho_auto_save')).toBeNull();
        
        expect(screen.queryByDisplayValue('1_João da Silva')).not.toBeInTheDocument();
        expect(screen.getByPlaceholderText('Buscar Paciente...')).toBeInTheDocument();
    });
  });
});