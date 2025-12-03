import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  TextField, 
  Typography, 
  Grid, 
  Card, 
  CardContent,
  CardMedia, 
  Alert,
  AppBar,
  Toolbar,
  Container,
  Divider,
  Chip
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import DescriptionIcon from '@mui/icons-material/Description';
import logoImage from '../assets/logo.png'; 
import { acessarExame } from '../services/exames';

export default function PortalResultados() {
  const [step, setStep] = useState('LOGIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [exame, setExame] = useState(null);

  // Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const dados = await acessarExame(codigo, senha);
      setExame(dados);
      setStep('RESULTADOS');
    } catch (err) {
      setError(err.message || 'Erro ao acessar exame.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setExame(null);
    setCodigo('');
    setSenha('');
    setStep('LOGIN');
  };

  // --- TELA DE LOGIN ---
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
            Digite suas credenciais para acessar os resultados
          </Typography>

          <Box component="form" onSubmit={handleLogin} sx={{ width: '100%' }}>
            <TextField
              margin="normal" required fullWidth label="Código do Exame" placeholder="Ex: EX-A1B2"
              autoFocus value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />
            <TextField
              margin="normal" required fullWidth label="Senha" type="password"
              value={senha} onChange={(e) => setSenha(e.target.value)}
            />
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 3, mb: 2 }}>
              {loading ? 'Buscando...' : 'Acessar Resultados'}
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  // --- ORGANIZAÇÃO DOS ARQUIVOS ---
  const videos = exame?.arquivos.filter(a => a.tipo === 'VIDEO') || [];
  const imagens = exame?.arquivos.filter(a => a.tipo === 'IMAGEM') || [];
  const laudos = exame?.arquivos.filter(a => a.tipo === 'LAUDO') || [];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Navbar */}
      <AppBar position="static" color="default" elevation={1} sx={{ backgroundColor: '#fff' }}>
        <Toolbar>
          <img src={logoImage} alt="Logo" style={{ height: '40px', marginRight: '15px' }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', fontSize: { xs: '1rem', md: '1.25rem' } }}>
              {exame.paciente}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Data do Exame: {new Date(exame.data_exame).toLocaleDateString('pt-BR')}
            </Typography>
          </Box>
          <Button color="inherit" onClick={handleLogout} endIcon={<LogoutIcon />}>
            Sair
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, pb: 8 }}>
        
        {/* SEÇÃO 1: DOCUMENTOS E LAUDOS */}
        {laudos.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DescriptionIcon color="primary" sx={{ mr: 1, fontSize: 30 }} />
              <Typography variant="h5" color="textPrimary" fontWeight="500">
                Documentos e Laudos
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              {laudos.map((doc) => (
                <Grid item xs={12} sm={6} md={4} key={doc.id}>
                  <Card 
                    elevation={2} 
                    sx={{ 
                      display: 'flex', alignItems: 'center', p: 2, 
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#f0f7ff', borderColor: '#1976d2' },
                      border: '1px solid transparent'
                    }}
                    onClick={() => window.open(doc.url, '_blank')}
                  >
                    <PictureAsPdfIcon sx={{ fontSize: 40, color: '#d32f2f', mr: 2 }} />
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Laudo Médico</Typography>
                      <Typography variant="caption" color="textSecondary">Clique para baixar (PDF)</Typography>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* SEÇÃO 2: IMAGENS (ULTRASSOM) */}
        {imagens.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PhotoLibraryIcon color="primary" sx={{ mr: 1, fontSize: 30 }} />
              <Typography variant="h5" color="textPrimary" fontWeight="500">
                Galeria de Imagens
              </Typography>
              <Chip label={`${imagens.length} fotos`} size="small" sx={{ ml: 2, bgcolor: '#e3f2fd', color: '#1976d2' }} />
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2}>
              {imagens.map((img) => (
                <Grid item xs={6} sm={4} md={3} key={img.id}>
                  <Card 
                    elevation={2}
                    sx={{ 
                      cursor: 'pointer', borderRadius: 2, overflow: 'hidden',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'scale(1.02)', boxShadow: 6 } 
                    }}
                    onClick={() => window.open(img.url, '_blank')}
                  >
                    <CardMedia
                      component="img"
                      image={img.url}
                      alt="Exame"
                      sx={{ height: 200, objectFit: 'cover' }}
                      // TRUQUE PARA ESCONDER IMAGENS QUEBRADAS (THUMBS.DB)
                      onError={(e) => {
                        e.target.style.display = 'none'; // Esconde a imagem
                        e.target.parentElement.style.display = 'none'; // Esconde o Card inteiro
                      }}
                    />
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* SEÇÃO 3: VÍDEOS */}
        {videos.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <VideoLibraryIcon color="primary" sx={{ mr: 1, fontSize: 30 }} />
              <Typography variant="h5" color="textPrimary" fontWeight="500">
                Vídeos do Exame
              </Typography>
              <Chip label={`${videos.length} vídeos`} size="small" sx={{ ml: 2, bgcolor: '#e3f2fd', color: '#1976d2' }} />
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              {videos.map((vid) => (
                <Grid item xs={12} md={6} key={vid.id}>
                  <Card elevation={3} sx={{ bgcolor: '#000', borderRadius: 2, overflow: 'hidden' }}>
                    <video controls style={{ width: '100%', maxHeight: '400px', display: 'block' }} preload="metadata">
                      <source src={vid.url} type="video/mp4" />
                      Seu navegador não suporta vídeos.
                    </video>
                    <CardContent sx={{ bgcolor: '#fff', py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                      <Typography variant="body2" fontWeight="bold">Vídeo do Ultrassom</Typography>
                    </CardContent>
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