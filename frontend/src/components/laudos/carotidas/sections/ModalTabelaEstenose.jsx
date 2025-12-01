import React from 'react';
import { FaTimes } from 'react-icons/fa';

const ModalTabelaEstenose = ({ onClose }) => {
  const styles = {
    overlay: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    },
    modal: {
      backgroundColor: 'white', padding: '20px', borderRadius: '8px',
      maxWidth: '800px', width: '95%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      position: 'relative'
    },
    header: {
      textAlign: 'center', marginBottom: '15px', color: '#1565C0',
      fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase'
    },
    closeBtn: {
      position: 'absolute', top: '10px', right: '10px',
      background: 'transparent', border: 'none', cursor: 'pointer',
      fontSize: '18px', color: '#d32f2f'
    },
    table: {
      width: '100%', borderCollapse: 'collapse', fontSize: '12px',
      border: '1px solid #333'
    },
    th: {
      backgroundColor: '#FFF59D', // Amarelo claro igual ao print
      border: '1px solid #333', padding: '8px', textAlign: 'left', fontWeight: 'bold'
    },
    td: {
      border: '1px solid #333', padding: '6px', textAlign: 'left'
    },
    citation: {
      fontSize: '10px', fontStyle: 'italic', marginTop: '10px', color: '#555'
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}><FaTimes /></button>
        
        <div style={styles.header}>CONSENSO DE ESTENOSE CAROTÍDEA DA SRU – 2003</div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Grau de estenose (%)</th>
              <th style={styles.th}>VPS da a. carótida interna (cm/s)</th>
              <th style={styles.th}>Relação da VPS ACI/ACC</th>
              <th style={styles.th}>VDF da a. carótida interna (cm/s)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.td}><strong>Normal (0%)</strong></td>
              <td style={styles.td}>&lt; 125</td>
              <td style={styles.td}>&lt; 2,0</td>
              <td style={styles.td}>&lt; 40</td>
            </tr>
            <tr>
              <td style={styles.td}><strong>&lt; 50%</strong></td>
              <td style={styles.td}>&lt; 125</td>
              <td style={styles.td}>&lt; 2,0</td>
              <td style={styles.td}>&lt; 40</td>
            </tr>
            <tr>
              <td style={styles.td}><strong>50-69%</strong></td>
              <td style={styles.td}>125 - 230</td>
              <td style={styles.td}>2,0 - 4,0</td>
              <td style={styles.td}>40 - 100</td>
            </tr>
            <tr>
              <td style={styles.td}><strong>&gt;= 70%</strong></td>
              <td style={styles.td}>&gt; 230</td>
              <td style={styles.td}>&gt; 4,0</td>
              <td style={styles.td}>&gt; 100</td>
            </tr>
            <tr>
              <td style={styles.td}><strong>Suboclusão</strong></td>
              <td style={styles.td}>variável</td>
              <td style={styles.td}>variável</td>
              <td style={styles.td}>variável</td>
            </tr>
            <tr>
              <td style={styles.td}><strong>Oclusão</strong></td>
              <td style={styles.td}>indetectável</td>
              <td style={styles.td}>não aplicável</td>
              <td style={styles.td}>indetectável</td>
            </tr>
          </tbody>
        </table>

        <div style={styles.citation}>
          Baseado em Grant EG, Benson CB, Moneta GL, Alexandrov AV, Baker JD, Bluth EI, et al. Carotid artery stenosis: Gray-scale and Doppler US diagnosis – Society of radiologists in ultrasound consensus conference. Radiology. 2003;229:340–6
        </div>
      </div>
    </div>
  );
};

export default ModalTabelaEstenose;