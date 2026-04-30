import React, { useState, useEffect } from 'react';
import { 
    FaChevronDown, FaChevronUp, FaNotesMedical, 
    FaHeartbeat, FaWaveSquare, FaVial 
} from 'react-icons/fa';
import { GiLiver, GiKidneys, GiStomach } from 'react-icons/gi';

// COMPONENTE WRAPPER (Mantido igual ao seu padrão)
const DashboardPanel = ({ id, title, theme, icon: Icon, children, isOpen, onToggle }) => {
    return (
        <div className={`dashboard-panel theme-${theme}`}>
            <div className={`dashboard-panel-header ${isOpen ? 'open' : ''}`} onClick={() => onToggle(id)}>
                <div className="dashboard-panel-title">
                    {Icon && <Icon size={14} style={{ opacity: 0.8 }} />}
                    <span>{title}</span>
                </div>
                {isOpen ? <FaChevronUp size={12} color="#999"/> : <FaChevronDown size={12} color="#999"/>}
            </div>
            {isOpen && <div className="p-2">{children}</div>}
        </div>
    );
};

const FormAbdome = ({ onUpdate, initialValues }) => {
    // 1. ADICIONANDO NOVOS ESTADOS PARA TÍTULO E DADOS ADICIONAIS
    const [tituloExame, setTituloExame] = useState('ULTRASSONOGRAFIA GERAL');
    const [dadosPaciente, setDadosPaciente] = useState({
        idade: '',
        sexo: '',
        medicoSolicitante: ''
    });
    // ESTADOS DE CADA ÓRGÃO (Padrão: Normal)
    const [formState, setFormState] = useState(initialValues || {
        figado: 'Normal',
        vesicula: 'Normal',
        viasBiliares: 'Normal',
        pancreas: 'Normal',
        baco: 'Normal',
        aorta: 'Normal',
        retroperitonio: 'Normal',
        rins: 'Normal',
        bexiga: 'Normal',
        liquidoLivre: 'Ausente'
    });

    const [secoesFechadas, setSecoesFechadas] = useState({ retro: true });

    const toggleSecao = (id) => { setSecoesFechadas(prev => ({ ...prev, [id]: !prev[id] })); };
    const isAberto = (id) => !secoesFechadas[id];

    const handleChange = (campo, valor) => {
        setFormState(prev => ({ ...prev, [campo]: valor }));
    };

    // GERADOR DE TEXTO DINÂMICO
    useEffect(() => {
        let texto = '';

        // FÍGADO
        if (formState.figado === 'Normal') {
            texto += 'Fígado com dimensões normais, contornos regulares e bordas finas, apresentando aumento difuso da ecogenicidade que determina atenuação posterior do feixe acústico. Pequenas lesões hepáticas e focais têm sua detecção ecográfica prejudicada quando em associação com este padrão ecotextural. Veia porta e veias hepáticas sem alterações.\n\n';
        } else {
            texto += 'Fígado: [Descrever alterações hepáticas aqui...]\n\n';
        }

        // VESÍCULA
        if (formState.vesicula === 'Normal') {
            texto += 'Vesícula biliar com forma e dimensões normais, paredes finas e regulares, apresentando conteúdo anecogênico sem imagens calculosas.\n';
        } else {
            texto += 'Vesícula biliar: [Descrever alterações na vesícula...]\n';
        }

        // VIAS BILIARES
        if (formState.viasBiliares === 'Normal') {
            texto += 'Não há dilatação das vias biliares intra ou extra-hepáticas.\n\n';
        } else {
            texto += 'Vias biliares: [Descrever dilatação ou cálculos...]\n\n';
        }

        // PÂNCREAS
        if (formState.pancreas === 'Normal') {
            texto += 'Pâncreas de dimensões normais, contornos regulares e ecotextura homogênea. Não há dilatação do ducto pancreático.\n\n';
        } else {
            texto += 'Pâncreas: [Descrever alterações pancreáticas...]\n\n';
        }

        // BAÇO
        if (formState.baco === 'Normal') {
            texto += 'Baço com dimensões normais, contornos regulares e ecotextura homogênea.\n\n';
        } else {
            texto += 'Baço: [Descrever esplenomegalia ou lesões...]\n\n';
        }

        // AORTA E RETROPERITÔNIO
        texto += formState.aorta === 'Normal' ? 'Aorta e veia cava inferior com calibre e trajeto preservados.\n' : 'Aorta/VCI: [Descrever ateromatose ou aneurisma...]\n';
        texto += formState.retroperitonio === 'Normal' ? 'Ausência de linfonodomegalias retroperitoneais detectáveis.\n\n' : 'Retroperitônio: [Descrever linfonodomegalias...]\n\n';

        // RINS
        if (formState.rins === 'Normal') {
            texto += 'Rins tópicos com dimensões normais, contornos regulares e ecotextura habitual. Não há evidências de imagens calculosas calicinais. Não há dilatação do sistema coletor.\n\n';
        } else {
            texto += 'Rins: [Descrever cálculos, cistos ou dilatação...]\n\n';
        }

        // BEXIGA E LÍQUIDO
        if (formState.bexiga === 'Normal') {
            texto += 'Bexiga com boa repleção, paredes finas e regulares, conteúdo anecogênico.\n';
        } else {
            texto += 'Bexiga: [Descrever espessamento ou conteúdo...]\n';
        }
        
        texto += formState.liquidoLivre === 'Ausente' ? 'Ausência de líquido livre.' : 'Presença de líquido livre na cavidade abdominal.';

        // 2. ATUALIZANDO O ENVIO DOS DADOS (onUpdate)
        onUpdate({
            texto: texto,
            dadosEstruturados: { ...formState, ...dadosPaciente }, // Injeta idade, sexo e solicitante aqui
            tituloExame: tituloExame // Usa o título dinâmico que mantém as configs de fonte do gerador
        });

    }, [formState, tituloExame, dadosPaciente, onUpdate]); // Adicionados novos states na dependência

    // Estilo simples para os selects internos
    const selectStyle = {
        width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px', marginTop: '4px'
    };

    return (
        <div className="flex flex-col gap-3 pb-8">
            
            {/* 3. NOVO CABEÇALHO DO EXAME COM OS CAMPOS DIGITÁVEIS */}
            <div className="dashboard-panel" style={{borderLeft: '4px solid #333', marginBottom: '5px', background:'#fff', border: '1px solid #ddd', borderRadius:'6px'}}>
                <div className="dashboard-panel-body" style={{padding:'10px'}}>
                    <h3 style={{margin: 0, fontSize: '14px', color: '#1C2E4A', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px'}}>
                        <FaNotesMedical /> Identificação e Título do Exame
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Título Personalizado</label>
                            <input 
                                type="text" 
                                value={tituloExame} 
                                onChange={(e) => setTituloExame(e.target.value)} 
                                style={selectStyle} 
                                placeholder="Ex: ULTRASSONOGRAFIA DE ABDOME TOTAL"
                            />
                        </div>
                        <div>
                            <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Médico Solicitante</label>
                            <input 
                                type="text" 
                                value={dadosPaciente.medicoSolicitante} 
                                onChange={(e) => setDadosPaciente({...dadosPaciente, medicoSolicitante: e.target.value})} 
                                style={selectStyle} 
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Idade</label>
                                <input 
                                    type="text" 
                                    value={dadosPaciente.idade} 
                                    onChange={(e) => setDadosPaciente({...dadosPaciente, idade: e.target.value})} 
                                    style={selectStyle} 
                                />
                            </div>
                            <div>
                                <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Sexo</label>
                                <select 
                                    value={dadosPaciente.sexo} 
                                    onChange={(e) => setDadosPaciente({...dadosPaciente, sexo: e.target.value})} 
                                    style={selectStyle}
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Feminino">Feminino</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                {/* ================= COLUNA ESQUERDA ================= */}
                <div className="col-left">
                    
                    <DashboardPanel id="figado" title="Fígado e Vias Biliares" theme="blue" icon={GiLiver} isOpen={isAberto('figado')} onToggle={toggleSecao}>
                        <div style={{marginBottom: '10px'}}>
                            <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Fígado</label>
                            <select value={formState.figado} onChange={(e) => handleChange('figado', e.target.value)} style={selectStyle}>
                                <option value="Normal">Normal (com esteatose leve citada)</option>
                                <option value="Alterado">Alterado / Descrever Manualmente</option>
                            </select>
                        </div>
                        <div style={{marginBottom: '10px'}}>
                            <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Vesícula Biliar</label>
                            <select value={formState.vesicula} onChange={(e) => handleChange('vesicula', e.target.value)} style={selectStyle}>
                                <option value="Normal">Normal / Alitiasica</option>
                                <option value="Alterado">Com Cálculos / Alterada</option>
                                <option value="Ausente">Colecistectomia (Ausente)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Vias Biliares</label>
                            <select value={formState.viasBiliares} onChange={(e) => handleChange('viasBiliares', e.target.value)} style={selectStyle}>
                                <option value="Normal">Calibre Normal</option>
                                <option value="Alterado">Dilatadas</option>
                            </select>
                        </div>
                    </DashboardPanel>

                    <DashboardPanel id="pancreasBaco" title="Pâncreas e Baço" theme="purple" icon={GiStomach} isOpen={isAberto('pancreasBaco')} onToggle={toggleSecao}>
                        <div style={{marginBottom: '10px'}}>
                            <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Pâncreas</label>
                            <select value={formState.pancreas} onChange={(e) => handleChange('pancreas', e.target.value)} style={selectStyle}>
                                <option value="Normal">Normal</option>
                                <option value="Alterado">Alterado / Obscurecido por gases</option>
                            </select>
                        </div>
                        <div>
                            <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Baço</label>
                            <select value={formState.baco} onChange={(e) => handleChange('baco', e.target.value)} style={selectStyle}>
                                <option value="Normal">Normal</option>
                                <option value="Alterado">Esplenomegalia / Alterado</option>
                            </select>
                        </div>
                    </DashboardPanel>

                </div>

                {/* ================= COLUNA DIREITA ================= */}
                <div className="col-right">
                    
                    <DashboardPanel id="rins" title="Rins e Vias Urinárias" theme="green" icon={GiKidneys} isOpen={isAberto('rins')} onToggle={toggleSecao}>
                        <div style={{marginBottom: '10px'}}>
                            <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Rins</label>
                            <select value={formState.rins} onChange={(e) => handleChange('rins', e.target.value)} style={selectStyle}>
                                <option value="Normal">Tópicos e Normais</option>
                                <option value="Calculos">Com Cálculos (Nefrolitíase)</option>
                                <option value="Cistos">Com Cistos</option>
                                <option value="Alterado">Outras Alterações</option>
                            </select>
                        </div>
                        <div>
                            <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Bexiga</label>
                            <select value={formState.bexiga} onChange={(e) => handleChange('bexiga', e.target.value)} style={selectStyle}>
                                <option value="Normal">Boa repleção e Normal</option>
                                <option value="Vazia">Pouca repleção (Prejudicada)</option>
                                <option value="Alterado">Com espessamento / Conteúdo</option>
                            </select>
                        </div>
                    </DashboardPanel>

                    <DashboardPanel id="retro" title="Vascular e Retroperitônio" theme="red" icon={FaHeartbeat} isOpen={isAberto('retro')} onToggle={toggleSecao}>
                        <div style={{marginBottom: '10px'}}>
                            <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Aorta e VCI</label>
                            <select value={formState.aorta} onChange={(e) => handleChange('aorta', e.target.value)} style={selectStyle}>
                                <option value="Normal">Calibre e Trajeto Preservados</option>
                                <option value="Alterado">Ateromatose / Aneurisma</option>
                            </select>
                        </div>
                        <div style={{marginBottom: '10px'}}>
                            <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Retroperitônio</label>
                            <select value={formState.retroperitonio} onChange={(e) => handleChange('retroperitonio', e.target.value)} style={selectStyle}>
                                <option value="Normal">Sem Linfonodomegalias</option>
                                <option value="Alterado">Linfonodomegalias presentes</option>
                            </select>
                        </div>
                        <div>
                            <label style={{fontSize: '11px', fontWeight: 'bold', color: '#555'}}>Líquido Livre na Cavidade</label>
                            <select value={formState.liquidoLivre} onChange={(e) => handleChange('liquidoLivre', e.target.value)} style={selectStyle}>
                                <option value="Ausente">Ausente</option>
                                <option value="Presente">Presente (Ascite)</option>
                            </select>
                        </div>
                    </DashboardPanel>

                </div>
            </div>
        </div>
    );
};

export default FormAbdome;