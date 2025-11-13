// src/components/common/MaskedInput.jsx
import React from 'react';
import { IMaskInput } from 'react-imask';
import { Input } from '@mui/material';

// Adaptador para o CPF
export const TextMaskCPF = React.forwardRef((props, ref) => {
    const { onChange, ...other } = props;
    return (
        <IMaskInput
            {...other}
            mask="000.000.000-00"
            definitions={{
                '#': /[1-9]/,
            }}
            inputRef={ref}
            onAccept={(value) => onChange({ target: { name: props.name, value } })}
            overwrite
        />
    );
});

// Adaptador para o Telefone
export const TextMaskTelefone = React.forwardRef((props, ref) => {
    const { onChange, ...other } = props;
    return (
        <IMaskInput
            {...other}
            mask="(00) 00000-0000"
            inputRef={ref}
            onAccept={(value) => onChange({ target: { name: props.name, value } })}
            overwrite
        />
    );
});

// Adaptador para o CEP
export const TextMaskCEP = React.forwardRef((props, ref) => {
    const { onChange, ...other } = props;
    return (
        <IMaskInput
            {...other}
            mask="00000-000"
            inputRef={ref}
            onAccept={(value) => onChange({ target: { name: props.name, value } })}
            overwrite
        />
    );
});