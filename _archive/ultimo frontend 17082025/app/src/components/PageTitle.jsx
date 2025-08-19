// src/components/PageTitle.jsx
import React from 'react';
import { Typography } from '@mui/material';

export default function PageTitle({ children }) {
  return (
    <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
      {children}
    </Typography>
  );
}