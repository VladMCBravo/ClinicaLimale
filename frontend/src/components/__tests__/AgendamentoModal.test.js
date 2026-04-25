import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AgendamentoModal from '../AgendamentoModal';
import { agendamentoService } from '../../services/agendamentoService';

jest.mock('../../services/agendamentoService');
jest.mock('../../contexts/SnackbarContext', () => ({
    useSnackbar: () => ({ showSnackbar: jest.fn() })
}));

describe('AgendamentoModal - Proteção contra Cliques Duplos', () => {
    
    beforeEach(() => {
        agendamentoService.getModalData.mockResolvedValue([
            { data: [{ id: 1, nome_completo: 'Paciente Teste' }] }, 
            { data: [] }, 
            { data: [{ id: 1, first_name: 'Dr. Teste', especialidades: [1] }] }, 
            { data: [{ id: 1, nome: 'Geral' }] }  
        ]);
        agendamentoService.getSalas.mockResolvedValue({ data: [{ id: 1, nome: 'Sala 1' }] });
        
        agendamentoService.createAgendamento.mockImplementation(() => 
            new Promise(resolve => setTimeout(() => resolve({ status: 201 }), 500))
        );
        agendamentoService.verificarCapacidade.mockResolvedValue({
            data: { consultas_agendadas: 0, procedimentos_agendados: 0 }
        });
    });

    it('deve bloquear chamadas extras à API quando o botão é clicado repetidamente', async () => {
        
        // Adicionamos os campos que faltavam para o Material UI não reclamar
        const mockEventSemId = {
            paciente: 1,
            medico: 1,
            sala: 1,
            especialidade: 1,
            tipo_agendamento: 'Consulta',
            data_hora_inicio: '2026-10-10T10:00:00',
            data_hora_fim: '2026-10-10T10:30:00',
            status: 'Agendado',
            tipo_atendimento: 'Particular',
            modalidade: 'Presencial'
        };

        render(<AgendamentoModal open={true} onClose={() => {}} editingEvent={mockEventSemId} />);

        // O SEGREDO: Em vez de clicar logo, mandamos o Jest ESPERAR até o React 
        // colocar o nome do paciente no input (prova de que o useEffect terminou)
        await screen.findByDisplayValue('Paciente Teste');

        const botaoSalvar = screen.getByText(/Salvar Agendamento/i);

        // O ATAQUE
        fireEvent.click(botaoSalvar);
        fireEvent.click(botaoSalvar);
        fireEvent.click(botaoSalvar);

        // A EXPECTATIVA FINAL
        await waitFor(() => {
            expect(agendamentoService.createAgendamento).toHaveBeenCalledTimes(1);
        });
    });
});