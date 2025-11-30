import React from 'react';
import { FaTimes } from 'react-icons/fa';

// Dados transcritos da tabela Mari G. et al (2005)
const dadosMari = [
  { sem: 14, med: 19.3, mom: 28.9 }, { sem: 15, med: 20.2, mom: 30.3 },
  { sem: 16, med: 21.1, mom: 31.7 }, { sem: 17, med: 22.1, mom: 33.2 },
  { sem: 18, med: 23.2, mom: 34.8 }, { sem: 19, med: 24.3, mom: 36.5 },
  { sem: 20, med: 25.5, mom: 38.2 }, { sem: 21, med: 26.7, mom: 40.0 },
  { sem: 22, med: 27.9, mom: 41.9 }, { sem: 23, med: 29.3, mom: 43.9 },
  { sem: 24, med: 30.7, mom: 46.0 }, { sem: 25, med: 32.1, mom: 48.2 },
  { sem: 26, med: 33.6, mom: 50.4 }, { sem: 27, med: 35.2, mom: 52.8 },
  { sem: 28, med: 36.9, mom: 55.4 }, { sem: 29, med: 38.7, mom: 58.0 },
  { sem: 30, med: 40.5, mom: 60.7 }, { sem: 31, med: 42.4, mom: 63.6 },
  { sem: 32, med: 44.4, mom: 66.6 }, { sem: 33, med: 46.5, mom: 69.8 },
  { sem: 34, med: 48.7, mom: 73.1 }, { sem: 35, med: 51.1, mom: 76.6 },
  { sem: 36, med: 53.5, mom: 80.2 }, { sem: 37, med: 56.0, mom: 84.0 },
  { sem: 38, med: 58.7, mom: 88.0 }, { sem: 39, med: 61.5, mom: 92.2 },
  { sem: 40, med: 64.4, mom: 96.6 },
];

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000,
    display: 'flex', justifyContent: 'center', alignItems: 'center'
  },
  modal: {
    background: 'white', padding: '0', borderRadius: '4px',
    width: '400px', maxHeight: '90vh', overflow: 'hidden',
    display: 'flex', flexDirection: 'column', boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
  },
  header: {
    padding: '10px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#f1f1f1'
  },
  title: { fontWeight: 'bold', fontSize: '14px' },
  content: { overflowY: 'auto', padding: '10px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'Arial, sans-serif' },
  th: { background: '#2C5484', color: 'white', padding: '5px', textAlign: 'left', border: '1px solid #aaa' }, // Azul escuro do print
  td: { padding: '4px', border: '1px solid #ccc', textAlign: 'left' },
  rowOdd: { background: '#fff' },
  rowEven: { background: '#E9EEF5' }, // Azul bem clarinho das linhas pares
  footer: { fontSize: '9px', padding: '10px', color: '#555', fontStyle: 'italic', background: '#f9f9f9', borderTop: '1px solid #ddd' }
};

const ModalTabelaVPS = ({ onClose }) => {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
            <span style={styles.title}>Turing - Tabela VPS da ACM</span>
            <button onClick={onClose} style={{border:'none', background:'transparent', cursor:'pointer'}}><FaTimes /></button>
        </div>
        
        <div style={{textAlign: 'center', fontWeight: 'bold', fontSize: '16px', padding: '10px 0'}}>
            VPS da ACM
        </div>

        <div style={styles.content}>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>IG (semanas)</th>
                        <th style={styles.th}>Mediana (cm/s)</th>
                        <th style={styles.th}>1.5 MdM (cm/s)</th>
                    </tr>
                </thead>
                <tbody>
                    {dadosMari.map((d, i) => (
                        <tr key={d.sem} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                            <td style={{...styles.td, fontWeight: 'bold'}}>{d.sem}</td>
                            <td style={styles.td}>{d.med.toFixed(1)}</td>
                            <td style={styles.td}>{d.mom.toFixed(1)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <div style={styles.footer}>
            Fonte: Mari G. Middle cerebral artery peak systolic velocity for the diagnosis of fetal anemia: the untold story. Ultrasound Obstet Gynecol. 2005 Apr;25(4):323-30.
        </div>
      </div>
    </div>
  );
};

export default ModalTabelaVPS;