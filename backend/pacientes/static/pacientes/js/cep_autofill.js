// Espera o documento HTML ser completamente carregado para executar o código
window.addEventListener('DOMContentLoaded', (event) => {
    // Encontra os campos do formulário pelo ID que o Django cria
    const cepInput = document.querySelector('#id_cep');
    const enderecoInput = document.querySelector('#id_endereco');
    const bairroInput = document.querySelector('#id_bairro');
    const cidadeInput = document.querySelector('#id_cidade');
    const estadoInput = document.querySelector('#id_estado');

    // Adiciona um "ouvinte" que dispara a função quando o usuário
    // termina de digitar o CEP e clica fora do campo (evento 'blur')
    cepInput.addEventListener('blur', (e) => {
        let cep = e.target.value.replace(/\D/g, ''); // Remove tudo que não for número

        // Verifica se o CEP tem 8 dígitos
        if (cep.length === 8) {
            // Monta a URL da API ViaCEP
            const url = `https://viacep.com.br/ws/${cep}/json/`;

            // Faz a requisição para a API
            fetch(url)
                .then(response => response.json()) // Converte a resposta para JSON
                .then(data => {
                    if (!data.erro) {
                        // Se não houver erro, preenche os campos com os dados recebidos
                        enderecoInput.value = data.logradouro;
                        bairroInput.value = data.bairro;
                        cidadeInput.value = data.localidade;
                        estadoInput.value = data.uf;
                    } else {
                        // Se o CEP não for encontrado, limpa os campos e avisa o usuário
                        alert('CEP não encontrado.');
                        enderecoInput.value = '';
                        bairroInput.value = '';
                        cidadeInput.value = '';
                        estadoInput.value = '';
                    }
                })
                .catch(error => console.error('Houve um erro na busca do CEP:', error)); // Loga o erro no console do navegador
        }
    });
});