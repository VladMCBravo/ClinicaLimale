// src/utils/semaforoAgendamento.js

export const PALETA_SEMAFORO = {
    cinza: { bg: '#F8FAFC', border: '#cbd5e1', text: '#475569', indicator: '#94a3b8' },
    laranja: { bg: '#FFEDD5', border: '#fdba74', text: '#c2410c', indicator: '#f97316' },
    vermelho: { bg: '#FEE2E2', border: '#fca5a5', text: '#b91c1c', indicator: '#ef4444' },
    amarelo: { bg: '#FEF9C3', border: '#fde047', text: '#a16207', indicator: '#eab308' },
    azul: { bg: '#E0F2FE', border: '#7dd3fc', text: '#0369a1', indicator: '#0ea5e9' },
    verde: { bg: '#DCFCE7', border: '#86efac', text: '#15803d', indicator: '#22c55e' },
    preto: { bg: '#334155', border: '#0f172a', text: '#f8fafc', indicator: '#1e293b' },
    inativo: { bg: '#f1f5f9', border: '#e2e8f0', text: '#94a3b8', indicator: '#cbd5e1' }
};

export function calcularStatusSemaforo(ag, now = new Date()) {
    const isCancelado = ag.status === 'Cancelado' || ag.status === 'Não Compareceu';
    if (isCancelado) return { cor: PALETA_SEMAFORO.inativo, label: ag.status, isAtivo: false };

    // 1. REGRA DO REALIZADO (Verde ou Preto)
    if (ag.status === 'Realizado') {
        const devendoDinheiro = ag.pagamento_status === 'Pendente';
        
        // LÓGICA INVERTIDA (CHECKLIST OBRIGATÓRIO):
        // Os campos do banco nascem como 'False'. 
        // Aqui, interpretamos False como "Falta dar o check".
        const faltaCheckLaudo = !ag.pendencia_laudo; 
        const faltaCheckDeclaracao = !ag.pendencia_declaracao;
        
        // Se estiver devendo OU se faltar algum dos dois checks manuais da recepção, fica PRETO.
        if (devendoDinheiro || faltaCheckLaudo || faltaCheckDeclaracao) {
            return { cor: PALETA_SEMAFORO.preto, label: 'Liberação Pendente', isAtivo: true };
        }
        
        // Só fica VERDE se o financeiro estiver OK e os dois checks estiverem marcados.
        return { cor: PALETA_SEMAFORO.verde, label: 'Liberado / Sem Pendências', isAtivo: true };
    }

    // 2. REGRA DO ATENDIMENTO (Azul com Cronômetro)
    if (ag.status === 'Em Atendimento') {
        const inicio = new Date(ag.hora_inicio_atendimento || ag.data_hora_inicio);
        const minutos = Math.max(0, Math.floor((now - inicio) / 60000));
        return { cor: PALETA_SEMAFORO.azul, label: 'Em atendimento', timer: `${minutos} min`, isAtivo: true };
    }

    // 3. REGRA DO CHECK-IN (Amarelo com Cronômetro)
    if (ag.status === 'Aguardando' || ag.status === 'Aguardando Pagamento') {
        const inicio = new Date(ag.hora_checkin || ag.data_hora_inicio);
        const minutos = Math.max(0, Math.floor((now - inicio) / 60000));
        return { cor: PALETA_SEMAFORO.amarelo, label: 'Aguardando', timer: `${minutos} min`, isAtivo: true };
    }

    // 4. REGRA DO AGENDADO (Cinza, Laranja ou Vermelho)
    if (ag.status === 'Agendado' || ag.status === 'Confirmado') {
        const inicioConsulta = new Date(ag.data_hora_inicio);
        const diffMinutos = (inicioConsulta - now) / 60000;

        if (diffMinutos <= 0) return { cor: PALETA_SEMAFORO.vermelho, label: 'Atrasado (Sem Check-in)', isAtivo: true };
        if (diffMinutos <= 5) return { cor: PALETA_SEMAFORO.laranja, label: 'Check-in Próximo', isAtivo: true };
        
        return { cor: PALETA_SEMAFORO.cinza, label: ag.status, isAtivo: true };
    }

    return { cor: PALETA_SEMAFORO.cinza, label: ag.status, isAtivo: true };
}