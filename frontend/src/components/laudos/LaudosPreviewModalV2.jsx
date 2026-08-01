import React, { useState, useEffect, useRef } from 'react';
import { 
    Dialog, AppBar, Toolbar, Typography, Button, IconButton, 
    Box, Tooltip, Divider, Stack
} from '@mui/material';
import { 
    FaSave, FaTimes, FaCamera, FaTrash, FaCloudDownloadAlt, 
    FaLaptop, FaPrint, FaShareSquare, FaImage, FaExclamationTriangle
} from 'react-icons/fa';
import { Editor } from '@tinymce/tinymce-react';

// === PAGINAÇÃO AUTOMÁTICA (Opção B) ===
// Constantes derivadas das mesmas margens usadas no editor E no backend (xhtml2pdf).
// Se mudar o padding do body no content_style, atualize aqui também.
const MM_TO_PX = 96 / 25.4; // conversão padrão do browser (96dpi)
const PAGE_HEIGHT_MM = 297;
const HEADER_MM = 60;   // 6.0cm reservados no topo de cada página
const FOOTER_MM = 55;   // 5.5cm reservados no rodapé de cada página
const USABLE_MM = PAGE_HEIGHT_MM - HEADER_MM - FOOTER_MM; // 182mm úteis por página

function pxToMm(px) {
    return px / MM_TO_PX;
}

/**
 * Varre os blocos de nível superior do corpo do editor e insere
 * <div class="mce-pagebreak" data-auto="1"> automaticamente sempre
 * que um bloco ultrapassa o limite da página atual.
 * 
 * Estratégia: mede com getBoundingClientRect (valores reais pós-reflow),
 * insere UMA quebra por vez, e reavalia do zero — simples e robusto
 * para documentos de tamanho típico de um laudo (dezenas de blocos).
 */
function autoPaginarConteudo(editor) {
    if (!editor || editor.removed) return;

    const body = editor.getBody();
    if (!body) return;

    // Preserva a posição do cursor antes de mexer no DOM
    const bookmark = editor.selection.getBookmark(2, true);

    // Remove quebras inseridas automaticamente antes (recalcula do zero).
    // Quebras manuais (inseridas pelo botão do toolbar, sem data-auto) são preservadas.
    Array.from(body.querySelectorAll('.mce-pagebreak[data-auto="1"]')).forEach(el => el.remove());

    const MAX_PASSES = 60; // trava de segurança contra loop infinito
    let passes = 0;
    let inseriuAlgo = false;

    while (passes < MAX_PASSES) {
        passes++;

        const bodyTop = body.getBoundingClientRect().top;

        // Blocos de nível superior a considerar (ignora o header da paciente,
        // que já reserva seu próprio espaço fixo no topo do documento).
        const candidatos = Array.from(body.children).filter(el => {
            if (el.classList.contains('laudo-header-area')) return false;
            if (el.classList.contains('mce-pagebreak')) return false;
            return el.offsetHeight > 0;
        });

        // Reconstroi a lista "achatada" incluindo filhos diretos do wrapper do corpo,
        // já que o HTML gerado por gerarConteudoParaEditor envolve tudo em .corpo-laudo-wrapper
        let blocos = [];
        candidatos.forEach(el => {
            if (el.classList.contains('corpo-laudo-wrapper')) {
                blocos.push(...Array.from(el.children));
            } else {
                blocos.push(el);
            }
        });

        // Zonas de página: cada "ciclo" de 297mm tem uma janela útil de 182mm,
        // já contando o próprio cabeçalho embutido no fluxo (primeiro bloco).
        let zonaFimMm = HEADER_MM + USABLE_MM; // fim da 1ª janela útil (242mm)
        let quebrouNestaPassada = false;

        for (const bloco of blocos) {
            // Se topo do bloco em relação ao body cair depois de uma quebra manual/auto
            // já existente, avança a zona (não deveríamos reinserir).
            const rect = bloco.getBoundingClientRect();
            const topMm = pxToMm(rect.top - bodyTop);
            const bottomMm = pxToMm(rect.bottom - bodyTop);

            // Se o bloco já começa depois do fim da zona atual, apenas avança a
            // zona para o próximo ciclo até "alcançar" o bloco (pode haver mais
            // de uma quebra manual antes dele).
            while (topMm > zonaFimMm) {
                zonaFimMm += PAGE_HEIGHT_MM;
            }

            if (bottomMm > zonaFimMm) {
                // Este bloco estoura a página atual: insere quebra automática ANTES dele.
                const pagebreak = editor.getDoc().createElement('div');
                pagebreak.className = 'mce-pagebreak';
                pagebreak.setAttribute('data-auto', '1');
                pagebreak.setAttribute('contenteditable', 'false');
                bloco.parentNode.insertBefore(pagebreak, bloco);

                inseriuAlgo = true;
                quebrouNestaPassada = true;
                break; // reinicia a varredura do zero (DOM mudou, offsets mudaram)
            }
        }

        if (!quebrouNestaPassada) break; // nenhuma quebra necessária nesta passada -> convergiu
    }

    if (inseriuAlgo) {
        editor.selection.moveToBookmark(bookmark);
    }
}

const LaudosPreviewModalV2 = ({ 
    open, onClose, htmlInicial, imagensIniciais, 
    onFinalizar, onAbrirNuvem, onSalvarRascunho,
    nomePaciente
}) => {
    const editorRef = useRef(null);
    const paginacaoTimeoutRef = useRef(null); // <-- NOVO
    const [imagens, setImagens] = useState([]);
    const [dataExameModal, setDataExameModal] = useState(new Date().toISOString().split('T')[0]);
    const [mostrarFotos, setMostrarFotos] = useState(true);

    useEffect(() => {
        if (open) {
            setImagens(imagensIniciais || []);
            setDataExameModal(new Date().toISOString().split('T')[0]); 
        }
    }, [open, imagensIniciais]);

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        const promises = files.map(file => new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
        }));
        Promise.all(promises).then(base64List => setImagens(prev => [...prev, ...base64List]));
    };

    const removeImage = (index) => setImagens(prev => prev.filter((_, i) => i !== index));
    const extrairHTML = () => editorRef.current ? editorRef.current.getContent() : htmlInicial;

    const acaoSalvarRascunho = () => { onSalvarRascunho(extrairHTML()); onClose(); };
    const acaoImprimirApenas = () => {
        if (editorRef.current) {
            const iframe = editorRef.current.getWin();
            iframe.focus();
            iframe.print();
        }
    };
    const acaoFinalizar = () => onFinalizar(extrairHTML(), imagens, dataExameModal);

    return (
        <Dialog open={open} onClose={acaoSalvarRascunho} fullScreen>
            <style>{`
                .tox-notifications-container, .tox-statusbar__branding, .tox-promotion { display: none !important; }
                .tox-editor-header { 
                    box-shadow: 0 2px 6px rgba(0,0,0,0.08) !important; 
                    border-bottom: 1px solid #ced4da !important; 
                    z-index: 20 !important; 
                    background: #f8f9fa !important;
                }
                .tox .tox-toolbar__primary { flex-wrap: nowrap !important; overflow-x: auto !important; background-color: #f8f9fa !important; padding: 4px 8px !important; }
                
                /* CRÍTICO: o skin padrão trava a altura/overflow do container,
                impedindo que o autoresize repasse a altura real pro Box pai
                e a barra de rolagem do navegador nunca aparece */
                .tox-tinymce { 
                    border: none !important; 
                    width: 100% !important; 
                    height: auto !important;
                    overflow: visible !important;
                }
                .tox-editor-container {
                    height: auto !important;
                    overflow: visible !important;
                }
                .tox-edit-area {
                    height: auto !important;
                    overflow: visible !important;
                }

                .tox-edit-area, .tox-edit-area__iframe, .tox-editor-container { 
                    background: transparent !important; 
                }
            `}</style>

            <AppBar sx={{ position: 'relative', background: '#b71c1c', boxShadow: 'none' }}>
                <Toolbar variant="dense" sx={{ minHeight: '48px', px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton edge="start" color="inherit" onClick={acaoSalvarRascunho} title="Voltar e Salvar Rascunho" sx={{ p: 0.5 }}>
                            <FaTimes size={18} />
                        </IconButton>
                        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FaExclamationTriangle /> REVISÃO E FINALIZAÇÃO
                            </Typography>
                            <Typography sx={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                {nomePaciente ? `PACIENTE: ${nomePaciente.toUpperCase()}` : 'PACIENTE: DESCONHECIDO'}
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, background: 'rgba(0,0,0,0.2)', px: 1.5, py: 0.3, borderRadius: '4px' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#fff', fontSize: '11px' }}>Data:</Typography>
                        <input 
                            type="date" value={dataExameModal} onChange={(e) => setDataExameModal(e.target.value)}
                            style={{ padding: '2px', border: 'none', fontSize: '11px', outline: 'none', cursor: 'pointer', background: 'transparent', color: '#fff', fontWeight: 'bold' }}
                        />
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button size="small" onClick={acaoSalvarRascunho} sx={{ color: '#fff', textTransform: 'none', fontWeight: 600, fontSize: '11px' }}>
                            <FaSave size={13} style={{ marginRight: 4 }} /> Salvar Rascunho
                        </Button>
                        <Divider orientation="vertical" flexItem sx={{ background: 'rgba(255,255,255,0.3)', my: 1 }} />
                        <Tooltip title="Imprimir Teste">
                            <IconButton onClick={acaoImprimirApenas} sx={{ color: '#fff', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                                <FaPrint size={15} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={mostrarFotos ? 'Ocultar Fotos' : 'Mostrar Fotos'}>
                            <IconButton onClick={() => setMostrarFotos(!mostrarFotos)} sx={{ color: mostrarFotos ? '#ffb74d' : '#fff', opacity: mostrarFotos ? 1 : 0.8 }}>
                                <FaImage size={15} />
                            </IconButton>
                        </Tooltip>
                        <Divider orientation="vertical" flexItem sx={{ background: 'rgba(255,255,255,0.3)', my: 1, mx: 0.5 }} />
                        <Button 
                            onClick={acaoFinalizar} variant="contained" 
                            sx={{ background: '#2E7D32', textTransform: 'none', fontWeight: 'bold', px: 2.5, py: 0.6, borderRadius: '30px', fontSize: '11px', whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(46, 125, 50, 0.4)', '&:hover': { background: '#1b5e20' } }}
                        >
                            <FaShareSquare size={13} style={{ marginRight: 6 }} /> FINALIZAR
                        </Button>
                    </Stack>
                </Toolbar>
            </AppBar>

            {/* ÁREA DE TRABALHO GERAL — agora o editor ocupa 100% da largura, como o Word */}
            <Box sx={{ display: 'flex', height: 'calc(100vh - 48px)', background: '#e9ecef', overflowY: 'auto' }}>
                
                {/* CONTAINER DO EDITOR — full width, sem centralizar aqui; a "folha" é centralizada dentro do iframe */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Editor
                        apiKey="qs3k6opqccy0770vysfyha4xffrsjf4tgxy11clmml5o8wq6"
                        onInit={(evt, editor) => editorRef.current = editor}
                        initialValue={htmlInicial}
                        init={{
                            autoresize_min_height: 1123,
                            autoresize_bottom_margin: 0,
                            width: '100%',
                            resize: false,
                            branding: false,
                            promotion: false,
                            elementpath: false,
                            menubar: false,
                            browser_spellcheck: true,
                            toolbar_mode: 'sliding',
                            toolbar_sticky: true,
                            toolbar_sticky_offset: 0,
                            plugins: 'advlist autolink lists charmap preview searchreplace visualblocks pagebreak table wordcount autoresize',
                            toolbar: 'undo redo | fontfamily fontsize | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | table pagebreak | bullist numlist | removeformat',
                            
                            // === NOVO: dispara a paginação automática ===
                            setup: (editor) => {
                                const dispararPaginacaoDebounced = () => {
                                    if (paginacaoTimeoutRef.current) clearTimeout(paginacaoTimeoutRef.current);
                                    paginacaoTimeoutRef.current = setTimeout(() => {
                                        autoPaginarConteudo(editor);
                                    }, 600); // espera o usuário parar de digitar
                                };

                                editor.on('input', dispararPaginacaoDebounced);
                                editor.on('SetContent', dispararPaginacaoDebounced);
                                editor.on('init', () => {
                                    // primeira paginação ao carregar o conteúdo inicial
                                    setTimeout(() => autoPaginarConteudo(editor), 300);
                                });
                            },
                            
                            content_style: `
                                html { 
                                    background: #e9ecef !important; 
                                    margin: 0;
                                    padding: 24px 0 40px 0;
                                }
                                body { 
                                    font-family: Arial, Helvetica, sans-serif; 
                                    font-size: 13px; color: #222; line-height: 1.5;
                                    width: 210mm;
                                    min-height: 297mm;
                                    margin: 0 auto !important;
                                    box-sizing: border-box;
                                    background-color: #ffffff;
                                    background-image: url('${process.env.PUBLIC_URL}/Receituario_v2.jpg');
                                    background-size: 210mm 297mm;
                                    background-repeat: repeat-y;
                                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
                                    border: 1px solid #d1d5db;
                                    padding: 0 1.5cm 5.5cm 1.5cm !important;
                                }
                                table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
                                td, th { padding: 4px; text-align: left; font-size: 13px; border: 1px dotted #bbb; }
                                .mce-pagebreak {
                                    display: block !important; 
                                    height: 11.5cm !important; 
                                    margin: 0 !important; padding: 0 !important; border: none !important;
                                    border-top: 2px dashed rgba(24, 100, 171, 0.4) !important; 
                                    page-break-after: always !important; break-after: page !important;
                                }
                            `
                        }}
                    />
                </Box>
                

                {/* PAINEL LATERAL DE FOTOS */}
                {mostrarFotos && (
                    <Box sx={{ width: '310px', background: '#fff', borderLeft: '1px solid #ced4da', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: 'calc(100vh - 48px)' }}>
                        <Box sx={{ p: 2, background: '#f0f4f8', borderBottom: '1px solid #e0e6ed' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1C2E4A', mb: 1.5 }}>
                                Anexos ({imagens.length})
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={1}>
                                <label htmlFor="modal-img-upload-v2" style={{ width: '100%' }}>
                                    <input type="file" id="modal-img-upload-v2" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                    <Button component="span" variant="outlined" fullWidth sx={{ background: 'white', color: '#555', borderColor: '#bbb', textTransform: 'none', justifyContent: 'flex-start', padding: '6px 12px' }}>
                                        <FaLaptop style={{ marginRight: 8, color: '#FF9800' }} /> Do Computador
                                    </Button>
                                </label>
                                <Button onClick={onAbrirNuvem} variant="contained" fullWidth sx={{ background: '#007FFF', textTransform: 'none', justifyContent: 'flex-start', padding: '6px 12px' }}>
                                    <FaCloudDownloadAlt style={{ marginRight: 8, fontSize: '1.1em' }} /> Buscar da Nuvem
                                </Button>
                            </Box>
                        </Box>
                        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2, background: '#fafafa' }}>
                            {imagens.length === 0 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#aaa', height: '100%', opacity: 0.6 }}>
                                    <FaCamera size={40} style={{ mb: 1 }} />
                                    <Typography variant="body2">Nenhuma foto selecionada.</Typography>
                                </Box>
                            )}
                            {imagens.map((img, idx) => (
                                <Box key={idx} sx={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd', height: '150px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <img src={img} alt={`foto-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <Tooltip title="Remover">
                                        <IconButton size="small" onClick={() => removeImage(idx)} sx={{ position: 'absolute', top: 5, right: 5, background: 'white', '&:hover': { background: '#ffebee' } }}>
                                            <FaTrash size={12} color="#d32f2f" />
                                        </IconButton>
                                    </Tooltip>
                                    <Box sx={{ position: 'absolute', bottom: 5, left: 5, background: 'rgba(0,0,0,0.6)', color: 'white', px: 1, py: 0.2, borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>
                                        #{idx + 1}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}
            </Box>
        </Dialog>
    );
};

export default LaudosPreviewModalV2;