import React from 'react';
import { Paper, Typography, List, ListItem, Avatar, ListItemText, Divider } from '@mui/material';
import CakeIcon from '@mui/icons-material/Cake';

export default function Aniversariantes({ aniversariantes }) {
    if (!aniversariantes) return null;

    return (
        <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6">Aniversariantes do Mês</Typography>
            <List>
                {aniversariantes.length > 0 ? aniversariantes.map((p, index) => (
                    <React.Fragment key={p.id}>
                        <ListItem>
                            <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}><CakeIcon /></Avatar>
                            <ListItemText 
                                primary={p.nome_completo}
                                secondary={`Dia ${new Date(p.data_nascimento).toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'UTC' })}`}
                            />
                        </ListItem>
                        {index < aniversariantes.length - 1 && <Divider />}
                    </React.Fragment>
                )) : (
                    <ListItem><ListItemText primary="Nenhum aniversariante no mês." /></ListItem>
                )}
            </List>
        </Paper>
    );
}