// src/components/laudos/EditorLaudo.jsx
import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Box, Button, Select, MenuItem, FormControl, InputLabel, Toolbar, Divider, ToggleButton, ToggleButtonGroup } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import apiClient from '../../api/axiosConfig'; // Ajuste o caminho conforme sua estrutura

const EditorLaudo = ({ conteudoInicial, onChange, procedimentoCodigo }) => {
  const [modelos, setModelos] = useState([]);
  const [modeloSelecionado, setModeloSelecionado] = useState('');

  // 1. Configuração do TipTap
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Digite o laudo aqui...' }),
    ],
    content: conteudoInicial || '',
    onUpdate: ({ editor }) => {
      // Avisa o componente pai que o texto mudou (para salvar)
      const html = editor.getHTML();
      const json = editor.getJSON();
      if (onChange) onChange(html, json);
    },
  });

  // 2. Buscar Modelos no Backend ao carregar
  useEffect(() => {
    const fetchModelos = async () => {
      try {
        // Busca todos os modelos ativos
        const res = await apiClient.get('/laudos/modelos/'); 
        setModelos(res.data);

        // Se tiver um código de procedimento (vindo do agendamento), tenta selecionar automático
        if (procedimentoCodigo) {
            const modeloAuto = res.data.find(m => m.codigo_procedimento === procedimentoCodigo);
            if (modeloAuto) carregarModelo(modeloAuto);
        }
      } catch (error) {
        console.error("Erro ao buscar modelos de laudo:", error);
      }
    };
    fetchModelos();
  }, [procedimentoCodigo]);

  // 3. Função para Aplicar o Modelo no Editor
  const carregarModelo = (modelo) => {
    setModeloSelecionado(modelo.id);
    if (editor) {
        // Aqui tratamos se o backend salvou como JSON ou String pura
        const conteudo = typeof modelo.conteudo_padrao === 'string' 
            ? modelo.conteudo_padrao 
            : modelo.conteudo_padrao; // Se for JSON o TipTap entende, mas vamos simplificar
        
        editor.commands.setContent(conteudo);
    }
  };

  if (!editor) return null;

  return (
    <Box sx={{ border: '1px solid #ccc', borderRadius: 1, display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'white' }}>
      
      {/* Barra de Ferramentas e Seleção de Modelo */}
      <Toolbar variant="dense" sx={{ borderBottom: '1px solid #eee', gap: 2, bgcolor: '#f8f9fa' }}>
        
        {/* Seletor de Modelos */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Carregar Modelo</InputLabel>
            <Select
                value={modeloSelecionado}
                label="Carregar Modelo"
                onChange={(e) => {
                    const mod = modelos.find(m => m.id === e.target.value);
                    carregarModelo(mod);
                }}
            >
                {modelos.map((m) => (
                    <MenuItem key={m.id} value={m.id}>{m.titulo}</MenuItem>
                ))}
            </Select>
        </FormControl>

        <Divider orientation="vertical" flexItem />

        {/* Botões de Formatação */}
        <ToggleButtonGroup size="small">
            <ToggleButton 
                value="bold" 
                selected={editor.isActive('bold')}
                onClick={() => editor.chain().focus().toggleBold().run()}
            >
                <FormatBoldIcon />
            </ToggleButton>
            <ToggleButton 
                value="italic" 
                selected={editor.isActive('italic')}
                onClick={() => editor.chain().focus().toggleItalic().run()}
            >
                <FormatItalicIcon />
            </ToggleButton>
            <ToggleButton 
                value="bulletList" 
                selected={editor.isActive('bulletList')}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
                <FormatListBulletedIcon />
            </ToggleButton>
        </ToggleButtonGroup>
      </Toolbar>

      {/* Área de Edição (Papel A4 Virtual) */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 4, bgcolor: '#eee', display: 'flex', justifyContent: 'center' }}>
        <Box 
            sx={{ 
                width: '210mm', // Largura A4
                minHeight: '297mm', // Altura A4
                bgcolor: 'white', 
                boxShadow: 3, 
                p: '20mm', // Margens de impressão
                cursor: 'text'
            }}
            onClick={() => editor.chain().focus().run()}
        >
            <EditorContent editor={editor} style={{ minHeight: '100%' }} />
        </Box>
      </Box>
    </Box>
  );
};

export default EditorLaudo;