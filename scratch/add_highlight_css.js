const fs = require('fs');
const path = require('path');

const cssToAdd = `

/* ====================================================
   PATIENT SEARCH & DATE HIGHLIGHTING STYLES
   ==================================================== */
@keyframes patientPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.7), 0 4px 20px rgba(13, 148, 136, 0.25);
    border-color: #0d9488;
  }
  50% {
    box-shadow: 0 0 0 8px rgba(13, 148, 136, 0), 0 8px 26px rgba(13, 148, 136, 0.4);
    border-color: #059669;
  }
  100% {
    box-shadow: 0 0 0 0 rgba(13, 148, 136, 0), 0 4px 20px rgba(13, 148, 136, 0.25);
    border-color: #0d9488;
  }
}

@keyframes dateBadgeGlow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.6);
    background: #ffedd5;
  }
  50% {
    box-shadow: 0 0 0 6px rgba(234, 88, 12, 0);
    background: #fed7aa;
  }
}

/* Card highlight when a patient is loaded from search */
.card-patient-highlight {
  animation: patientPulse 2s ease-in-out infinite;
  border: 2px solid #0d9488 !important;
  background: linear-gradient(180deg, #ffffff 0%, #f0fdfa 100%) !important;
  transition: all 0.3s ease;
}

/* Patient Date Field Highlight */
.patient-date-highlight {
  background: linear-gradient(135deg, #fff7ed, #ffedd5) !important;
  border: 2px solid #f97316 !important;
  box-shadow: 0 4px 14px rgba(234, 88, 12, 0.25) !important;
  transform: translateY(-2px);
  position: relative;
}

.patient-date-highlight label {
  color: #c2410c !important;
  font-weight: 800 !important;
}

.patient-date-highlight strong {
  color: #9a3412 !important;
  font-size: 15px !important;
  font-weight: 800 !important;
}

.date-highlight-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #ea580c;
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: 6px;
  animation: dateBadgeGlow 2s ease-in-out infinite;
}

/* Choices list item highlight */
.choice-card-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  margin-bottom: 8px;
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.choice-card-item:hover {
  border-color: #0d9488;
  background: #f0fdfa;
  transform: translateX(4px);
}

.choice-card-item.active-choice {
  border-color: #0d9488;
  background: #ccfbf1;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.2);
}

.choice-date-badge {
  display: inline-block;
  background: #ffedd5;
  color: #c2410c;
  border: 1px solid #fdba74;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 11px;
}
`;

['public/styles.css', 'frontend/styles.css'].forEach(rel => {
  const p = path.join(__dirname, '..', rel);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    if (!content.includes('card-patient-highlight')) {
      content += cssToAdd;
      fs.writeFileSync(p, content, 'utf8');
      console.log('Added highlight CSS to', rel);
    } else {
      console.log('CSS already exists in', rel);
    }
  }
});
