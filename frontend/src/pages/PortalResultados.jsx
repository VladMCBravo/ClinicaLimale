import React, { useState } from 'react';
import { 
  Box, Button, Paper, TextField, Typography, Grid, Card, CardContent,
  CardMedia, Alert, AppBar, Toolbar, Container, Divider, Chip, IconButton
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import DescriptionIcon from '@mui/icons-material/Description';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import logoImage from '../assets/logo.png'; 
import { acessarExame } from '../services/exames';

export default function PortalResultados() {
  const [step, setStep] = useState('LOGIN'); // LOGIN -> DASHBOARD -> RESULTADOS
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  
  const [dadosPaciente, setDadosPaciente] = useState(null); // Guarda tudo (Nome + Histórico)
  const [exameSelecionado, setExameSelecionado] = useState(null); // O exame que ele clicou

  // --- HANDLER DE LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const dados = await acessarExame(codigo, senha);
      setDadosPaciente(dados);
      setStep('DASHBOARD'); // Manda para a linha do tempo!
    } catch (err) {
      setError(err.message || 'Erro ao acessar exames.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setDadosPaciente(null);
    setExameSelecionado(null);
    setCodigo('');
    setSenha('');
    setStep('LOGIN');
  };

  // --- TELA 1: LOGIN ---
  if (step === 'LOGIN') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ mb: 2 }}>
            <img src={logoImage} alt="Logo" style={{ height: '80px' }} />
          </Box>
          <Typography component="h1" variant="h5" sx={{ mb: 1, color: '#1976d2', fontWeight: 'bold' }}>
            Portal do Paciente
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Digite suas credenciais para acessar seu histórico
          </Typography>

          <Box component="form" onSubmit={handleLogin} sx={{ width: '100%' }}>
            <TextField
              margin="normal" required fullWidth label="Código do Paciente" placeholder="Ex: PCT-12345"
              autoFocus value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />
            <TextField
              margin="normal" required fullWidth label="Senha" type="password"
              value={senha} onChange={(e) => setSenha(e.target.value)}
            />
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 3, mb: 2 }}>
              {loading ? 'Buscando...' : 'Acessar Histórico'}
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  // --- TELA 2: DASHBOARD (LINHA DO TEMPO) ---
  if (step === 'DASHBOARD') {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <AppBar position="static" color="default" elevation={1} sx={{ backgroundColor: '#fff' }}>
          <Toolbar>
            <img src={logoImage} alt="Logo" style={{ height: '40px', marginRight: '15px' }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                Olá, {dadosPaciente?.paciente.split(' ')[0]}!
              </Typography>
            </Box>
            <Button color="inherit" onClick={handleLogout} endIcon={<LogoutIcon />}>Sair</Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="md" sx={{ mt: 5, pb: 8 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1, color: '#333' }}>Seu Histórico de Exames</Typography>
          <Typography variant="body1" sx={{ mb: 4, color: '#666' }}>Selecione um atendimento abaixo para ver laudos, fotos e vídeos.</Typography>

          <Grid container spacing={3}>
            {dadosPaciente?.historico.map((exame) => (
              <Grid item xs={12} key={exame.id}>
                <Card 
                  elevation={2} 
                  sx={{ 
                    display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', p: 2, 
                    cursor: 'pointer', transition: '0.2s', borderLeft: '5px solid #1976d2',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: 4, bgcolor: '#fafcfd' }
                  }}
                  onClick={() => {
                    setExameSelecionado(exame);
                    setStep('RESULTADOS');
                  }}
                >
                  <Box sx={{ flexGrow: 1, width: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1C2E4A' }}>{exame.titulo}</Typography>
                    <Box sx={{ display: 'flex', gap: 3, mt: 1, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', color: '#555', fontSize: '14px' }}>
                        <CalendarMonthIcon fontSize="small" sx={{ mr: 0.5, color: '#1976d2' }}/>
                        {new Date(exame.data_exame).toLocaleDateString('pt-BR')}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', color: '#555', fontSize: '14px' }}>
                        <PersonIcon fontSize="small" sx={{ mr: 0.5, color: '#1976d2' }}/>
                        Dr(a). {exame.medico}
                      </Box>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mt: { xs: 2, sm: 0 }, display: 'flex', gap: 1 }}>
                    <Chip label={`${exame.arquivos.filter(a => a.tipo === 'IMAGEM').length} fotos`} size="small" sx={{ bgcolor: '#e3f2fd', color: '#1976d2', fontWeight: 'bold' }} />
                    {exame.arquivos.some(a => a.tipo === 'LAUDO') && <Chip label="Laudo PDF" size="small" color="error" sx={{ fontWeight: 'bold' }} />}
                  </Box>
                </Card>
              </Grid>
            ))}
            {dadosPaciente?.historico.length === 0 && (
              <Alert severity="info" sx={{ width: '100%', mt: 2 }}>Você ainda não possui exames liberados.</Alert>
            )}
          </Grid>
        </Container>
      </Box>
    );
  }

  // --- TELA 3: RESULTADOS (FOTOS E LAUDOS DE 1 EXAME) ---
  const videos = exameSelecionado?.arquivos.filter(a => a.tipo === 'VIDEO') || [];
  const imagens = exameSelecionado?.arquivos.filter(a => a.tipo === 'IMAGEM') || [];
  const laudos = exameSelecionado?.arquivos.filter(a => a.tipo === 'LAUDO') || [];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <AppBar position="static" color="default" elevation={1} sx={{ backgroundColor: '#fff' }}>
        <Toolbar>
          <IconButton onClick={() => setStep('DASHBOARD')} sx={{ mr: 2 }} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', fontSize: { xs: '1rem', md: '1.25rem' } }}>
              {exameSelecionado.titulo}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Realizado em {new Date(exameSelecionado.data_exame).toLocaleDateString('pt-BR')}
            </Typography>
          </Box>
          <Button color="inherit" onClick={handleLogout} endIcon={<LogoutIcon />}>Sair</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, pb: 8 }}>
        
        {/* LAUDOS EM PDF */}
        {laudos.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DescriptionIcon color="primary" sx={{ mr: 1, fontSize: 30 }} />
              <Typography variant="h5" color="textPrimary" fontWeight="500">Documento Médico</Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={3}>
              {laudos.map((doc) => (
                <Grid item xs={12} sm={6} md={4} key={doc.id}>
                  <Card 
                    elevation={2} 
                    sx={{ display: 'flex', alignItems: 'center', p: 2, cursor: 'pointer', '&:hover': { bgcolor: '#fff5f5' } }}
                    onClick={() => window.open(doc.url, '_blank')}
                  >
                    <PictureAsPdfIcon sx={{ fontSize: 40, color: '#d32f2f', mr: 2 }} />
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Laudo Assinado</Typography>
                      <Typography variant="caption" color="textSecondary">Clique para baixar (PDF)</Typography>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* FOTOS */}
        {imagens.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PhotoLibraryIcon color="primary" sx={{ mr: 1, fontSize: 30 }} />
              <Typography variant="h5" color="textPrimary" fontWeight="500">Galeria de Imagens</Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={2}>
              {imagens.map((img) => (
                <Grid item xs={6} sm={4} md={3} key={img.id}>
                  <Card 
                    elevation={2}
                    sx={{ cursor: 'pointer', borderRadius: 2, transition: '0.2s', '&:hover': { transform: 'scale(1.03)' } }}
                    onClick={() => window.open(img.url, '_blank')}
                  >
                    <CardMedia component="img" image={img.url} alt="Exame" sx={{ height: 200, objectFit: 'cover' }} onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* VÍDEOS */}
        {videos.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <VideoLibraryIcon color="primary" sx={{ mr: 1, fontSize: 30 }} />
              <Typography variant="h5" color="textPrimary" fontWeight="500">Vídeos</Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={3}>
              {videos.map((vid) => (
                <Grid item xs={12} md={6} key={vid.id}>
                  <Card elevation={3} sx={{ bgcolor: '#000', borderRadius: 2, overflow: 'hidden' }}>
                    <video controls style={{ width: '100%', maxHeight: '400px', display: 'block' }} preload="metadata">
                      <source src={vid.url} type="video/mp4" />
                    </video>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
}