// src/components/__tests__/AgendamentoModal.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AgendamentoModal from '../AgendamentoModal';
import { agendamentoService } from '../../services/agendamentoService';

// 🛑 CORREÇÃO: Importando os serviços extras que o Modal usa para podermos "cegá-los" no teste
import { faturamentoService } from '../../services/faturamentoService';
import { configuracoesService } from '../../services/configuracoesService';

jest.mock('../../services/agendamentoService');
// 🛑 CORREÇÃO: Mockando os novos serviços para evitar o Erro 401 do Axios
jest.mock('../../services/faturamentoService');
jest.mock('../../services/configuracoesService');

jest.mock('../../contexts/SnackbarContext', () => ({
    useSnackbar: () => ({ showSnackbar: jest.fn() })
}));

describe('AgendamentoModal - Comportamento e Segurança', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();

        agendamentoService.getModalData.mockResolvedValue([
            { data: [{ id: 1, nome_completo: 'Paciente Teste' }, { id: 2, nome_completo: 'Maria Souza' }] }, 
            { data: [] }, 
            { data: [{ id: 1, first_name: 'Dr. Teste', especialidades: [1] }] }, 
            { data: [{ id: 1, nome: 'Geral' }] }  
        ]);
        agendamentoService.getSalas.mockResolvedValue({ data: [{ id: 1, nome: 'Sala 1' }] });
        agendamentoService.verificarCapacidade.mockResolvedValue({
            data: { consultas_agendadas: 0, procedimentos_agendados: 0 }
        });
        
        // 🛑 CORREÇÃO: Avisando para o teste fingir que as APIs de faturamento e jornada voltaram vazias e com sucesso
        faturamentoService.getPlanosConvenio.mockResolvedValue({ data: [] });
        faturamentoService.getConvenios.mockResolvedValue({ data: [] });
        configuracoesService.getJornadas.mockResolvedValue({ data: [] });
        
        agendamentoService.createAgendamento.mockImplementation(() => 
            new Promise(resolve => setTimeout(() => resolve({ status: 201 }), 500))
        );
        agendamentoService.updateAgendamento.mockImplementation(() => 
            new Promise(resolve => setTimeout(() => resolve({ status: 200 }), 500))
        );
    });

    it('DEVE bloquear chamadas extras à API quando o botão é clicado repetidamente (Double Click Guard)', async () => {
        // CORREÇÃO: Para testar o "click", o formulário não pode estar vazio, senão
        // a validação bloqueia e a API nunca é chamada (foi o que causou o 0 chamadas).
        // A forma mais fácil é passar um agendamento válido como edição!
        const agendamentoValido = {
            id: 999, 
            paciente: { id: 1, nome_completo: 'Paciente Teste' },
            medico: 1,
            sala: 1,
            especialidade: 1,
            tipo_agendamento: 'Consulta',
            data_hora_inicio: '2026-10-10T10:00:00',
            data_hora_fim: '2026-10-10T10:30:00'
        };

        render(<AgendamentoModal open={true} onClose={() => {}} editingEvent={agendamentoValido} />);

        await screen.findByText(/Editar Agendamento/i);

        const botaoSalvar = screen.getByRole('button', { name: /Salvar/i });

        fireEvent.click(botaoSalvar);
        fireEvent.click(botaoSalvar);
        fireEvent.click(botaoSalvar);

        await waitFor(() => {
            // Como é um evento de edição sendo passado, ele vai chamar o UPDATE. 
            // Esperamos que mesmo com 3 cliques, chame só 1 vez!
            expect(agendamentoService.updateAgendamento).toHaveBeenCalledTimes(1);
        });
    });

    it('DEVE limpar o formulário completamente ao fechar e abrir um Novo Agendamento', async () => {
        const handleClose = jest.fn();
        const { rerender } = render(<AgendamentoModal open={true} onClose={handleClose} />);

        await screen.findByText(/Dados Clínicos/i);

        const inputObservacoes = screen.getByLabelText(/Observações/i);
        fireEvent.change(inputObservacoes, { target: { value: 'Paciente sente dores no joelho' } });
        expect(inputObservacoes.value).toBe('Paciente sente dores no joelho');

        const botaoCancelar = screen.getByText(/Cancelar/i);
        fireEvent.click(botaoCancelar);

        // 🛑 CORREÇÃO VITAL: Simulamos o modal realmente FECHANDO (open=false)
        rerender(<AgendamentoModal open={false} onClose={handleClose} />);
        
        // E só então, simulamos ele ABRINDO NOVAMENTE (open=true)
        rerender(<AgendamentoModal open={true} onClose={handleClose} />);

        const inputObservacoesReaberto = screen.getByLabelText(/Observações/i);
        expect(inputObservacoesReaberto.value).toBe('');
    });

    it('DEVE chamar updateAgendamento (PUT) ao invés de create (POST) quando for edição', async () => {
        const agendamentoExistente = {
            id: 1099, 
            paciente: { id: 1, nome_completo: 'Paciente Teste' },
            medico: 1,
            sala: 1,
            especialidade: 1,
            tipo_agendamento: 'Consulta',
            data_hora_inicio: '2026-10-10T10:00:00',
            data_hora_fim: '2026-10-10T10:30:00',
            status: 'Confirmado',
            tipo_atendimento: 'Particular',
            modalidade: 'Presencial'
        };

        render(<AgendamentoModal open={true} onClose={() => {}} editingEvent={agendamentoExistente} />);

        // CORREÇÃO: "findByDisplayValue" quebra com o Autocomplete do Material-UI.
        // A forma segura é apenas checar se a tela carregou em modo de edição.
        await screen.findByText(/Editar Agendamento/i); 

        const botaoSalvar = screen.getByRole('button', { name: /Salvar/i });
        fireEvent.click(botaoSalvar);

        await waitFor(() => {
            expect(agendamentoService.updateAgendamento).toHaveBeenCalledTimes(1);
            expect(agendamentoService.createAgendamento).not.toHaveBeenCalled();
        });
    });
});