// src/hooks/useAuth.js
//
// A implementação real agora vive em src/contexts/AuthContext.jsx,
// como um Context compartilhado por toda a aplicação (fonte única de
// verdade do usuário logado). Este arquivo existe apenas para que os
// componentes que já importam `useAuth` de 'hooks/useAuth' continuem
// funcionando sem precisar alterar cada import individualmente.
export { useAuth } from '../contexts/AuthContext';
