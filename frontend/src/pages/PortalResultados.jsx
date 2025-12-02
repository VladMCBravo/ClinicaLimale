import React, { useState } from 'react';
import { acessarExame } from '../services/exames'; // Importe o arquivo do Passo 2

const PortalResultados = () => {
  // Estados da tela
  const [step, setStep] = useState('LOGIN'); // LOGIN ou RESULTADOS
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Dados do formulário e do exame
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [exame, setExame] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const dados = await acessarExame(codigo, senha);
      setExame(dados);
      setStep('RESULTADOS');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Separa os arquivos por tipo para organizar a tela
  const videos = exame?.arquivos.filter(a => a.tipo === 'VIDEO') || [];
  const imagens = exame?.arquivos.filter(a => a.tipo === 'IMAGEM') || [];
  const laudos = exame?.arquivos.filter(a => a.tipo === 'LAUDO') || [];

  /* --- TELA DE LOGIN --- */
  if (step === 'LOGIN') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-blue-800">Resultados de Exames</h1>
            <p className="text-gray-500">Acesse seus laudos e imagens online</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Código do Exame</label>
              <input
                type="text"
                placeholder="Ex: EX-A1B2"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md uppercase"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                placeholder="******"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            {error && <div className="text-red-500 text-sm text-center">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:bg-blue-300"
            >
              {loading ? 'Buscando...' : 'Acessar Resultados'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* --- TELA DE RESULTADOS --- */
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Cabeçalho */}
        <div className="bg-white rounded-lg shadow p-6 mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{exame.paciente}</h2>
            <p className="text-gray-500">Data do Exame: {new Date(exame.data_exame).toLocaleDateString('pt-BR')}</p>
          </div>
          <button onClick={() => setStep('LOGIN')} className="text-sm text-blue-600 hover:underline">
            Sair
          </button>
        </div>

        {/* Botão de Laudo (Destaque) */}
        {laudos.length > 0 && (
          <div className="mb-8">
            <a 
              href={laudos[0].url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block bg-green-600 text-white text-center py-4 rounded-lg shadow hover:bg-green-700 transition font-bold text-lg"
            >
              📄 Baixar Laudo Completo (PDF)
            </a>
          </div>
        )}

        {/* Galeria de Vídeos */}
        {videos.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Vídeos do Exame</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((vid) => (
                <div key={vid.id} className="bg-black rounded-lg overflow-hidden shadow">
                  <video controls className="w-full h-auto">
                    <source src={vid.url} type="video/mp4" />
                    Seu navegador não suporta vídeos.
                  </video>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Galeria de Imagens */}
        {imagens.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Imagens Capturadas</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {imagens.map((img) => (
                <div key={img.id} className="aspect-square bg-gray-200 rounded-lg overflow-hidden shadow">
                  <img 
                    src={img.url} 
                    alt="Ultrassom" 
                    className="w-full h-full object-cover hover:scale-105 transition duration-300 cursor-pointer"
                    onClick={() => window.open(img.url, '_blank')}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PortalResultados;