// src/components/agendamento/agendamentoHelpers.js
// Funções puras e o input mascarado usados pelo AgendamentoModal — extraídos sem
// nenhuma mudança de comportamento, só pra tirar peso do arquivo principal.
import React from 'react';
import { IMaskInput } from 'react-imask';

export const getInitialFormData = () => ({
    paciente: null,
    data_hora_inicio: null,
    data_hora_fim: null,
    status: 'Agendado',
    tipo_atendimento: 'Particular',
    plano_utilizado: null,
    observacoes: '',
    tipo_visita: 'Primeira Consulta',
    modalidade: 'Presencial',
    especialidade: null,
    medico: null,
    procedimento: null,
    procedimentos: [],
    sala: null,
    isento_cobranca: false,
    motivo_isencao: ''
});

export const TextMaskDateTime = React.forwardRef(function TextMaskDateTime(props, ref) {
  const { onChange, ...other } = props;
  return (
    <IMaskInput
      {...other}
      mask="00/00/0000 00:00"
      definitions={{ '0': /[0-9]/ }}
      inputRef={ref}
      onAccept={(value) => onChange({ target: { name: props.name, value } })}
      overwrite
    />
  );
});

// Faixa de "combining diacritical marks" do Unicode montada via código de caractere (em
// vez de um literal ̀-ͯ direto no regex) — escape sequences de Unicode digitados
// diretamente nesse arquivo têm corrompido silenciosamente em edições anteriores.
const MARCA_COMBINANTE_INICIO = String.fromCharCode(768); // U+0300
const MARCA_COMBINANTE_FIM = String.fromCharCode(879); // U+036F
const REGEX_MARCAS_COMBINANTES = new RegExp('[' + MARCA_COMBINANTE_INICIO + '-' + MARCA_COMBINANTE_FIM + ']', 'g');

export const removerAcentos = (str) => {
    if (!str) return '';
    return str.normalize("NFD").replace(REGEX_MARCAS_COMBINANTES, "");
};

// 🛠️ TRADUTOR DE UX: Converte erros do Django em mensagens amigáveis
export const traduzirErroBackend = (errorData) => {
    if (!errorData) return "Erro inesperado ao conectar com o servidor.";
    if (typeof errorData === 'string') return errorData; // Se já for um texto, retorna ele mesmo

    // Dicionário para traduzir o nome das variáveis do banco para humanos
    const dicionarioCampos = {
        paciente: "Paciente",
        medico: "Médico",
        especialidade: "Especialidade",
        procedimento: "Procedimentos",
        sala: "Sala/Consultório",
        data_hora_inicio: "Horário de Início",
        data_hora_fim: "Horário de Fim",
        plano_utilizado: "Plano do Convênio",
        non_field_errors: "Aviso",
        detail: "Erro de Permissão"
    };

    const mensagens = [];

    // Percorre cada campo que o Django apontou erro
    for (const [campo, detalhes] of Object.entries(errorData)) {
        const nomeCampo = dicionarioCampos[campo] || campo;
        const msgOriginal = Array.isArray(detalhes) ? detalhes[0] : detalhes;
        const msgString = String(msgOriginal).toLowerCase();

        // 1. Mensagens Inteligentes (Como a sua trava de 48h ou conflito de sala)
        if (String(msgOriginal).includes('⚠️')) {
            mensagens.push(msgOriginal);
        }
        // 2. Erros de campos vazios ou nulos
        else if (msgString.includes('obrigatório') || msgString.includes('required') || msgString.includes('null') || msgString.includes('em branco')) {
            mensagens.push(`⚠️ O campo "${nomeCampo}" é obrigatório. Por favor, preencha-o antes de salvar.`);
        }
        // 3. Erros de ID ou Tipo Inválido (O famoso erro da PK ou texto incorreto)
        else if (msgString.includes('pk') || msgString.includes('incorrect_type') || msgString.includes('inválida') || msgString.includes('does not exist')) {
            mensagens.push(`⚠️ Por favor, apague e selecione uma opção válida na lista de "${nomeCampo}".`);
        }
        // 4. Erro de Data
        else if (msgString.includes('date') || msgString.includes('time') || msgString.includes('formato')) {
            mensagens.push(`⚠️ Verifique o formato preenchido no campo "${nomeCampo}".`);
        }
        // Fallback genérico
        else {
            mensagens.push(`⚠️ ${nomeCampo}: ${msgOriginal}`);
        }
    }

    // Retorna a primeira mensagem de erro encontrada para não poluir a tela inteira
    return mensagens.length > 0 ? mensagens[0] : "Erro ao processar a requisição no servidor.";
};
