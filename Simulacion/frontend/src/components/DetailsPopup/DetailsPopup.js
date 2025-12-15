/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import './DetailsPopup.css';

const DetailsPopup = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close-button" onClick={onClose}>&times;</button>
        <h2 id="dialog-title" className="dialog-title-text">¿Qué está pasando en esta simulación?</h2>
        
        <div className="simulation-info">
          <div className="agent-section">
            <div className="agent-header">
              <div className="agent-icon">🤖</div>
              <h3>Agente de IA Pre-visita</h3>
              <p className="agent-subtitle">Construido con: MedGemma 27b</p>
            </div>
            <p>En esta demo, MedGemma funciona como un agente de IA diseñado para asistir en la recopilación de información pre-visita. Interactuará con el agente del paciente para recopilar datos relevantes. Para proporcionar contexto adicional, MedGemma también tiene acceso a información del EHR del paciente (en formato FHIR). Sin embargo, a MedGemma no se le proporciona el diagnóstico específico (Migraña). El objetivo de MedGemma es recopilar detalles sobre síntomas, historial relevante y preocupaciones actuales para generar un reporte pre-visita comprensivo.</p>
          </div>

          <div className="patient-section">
            <div className="patient-header">
              <div className="patient-avatar">👤</div>
              <h3>Persona del Paciente: Jordon Dubois</h3>
              <p className="patient-subtitle">Simulado por: Gemini 2.5 Flash</p>
            </div>
            <p>Se le proporciona a Gemini una persona e información para interpretar el rol del paciente, Jordon Dubois. En esta simulación, el agente del paciente no conoce su diagnóstico, pero está experimentando síntomas y preocupaciones relacionadas que pueden compartirse durante la entrevista. Para simular una situación del mundo real con información confusa, también se ha proporcionado información adicional no relacionada con la condición presente.</p>
          </div>

          <div className="process-description">
            <p>A medida que se desarrolla la conversación, MedGemma crea y actualiza continuamente un reporte pre-visita en tiempo real que captura información relevante. Después de la generación del reporte pre-visita, está disponible una evaluación. El propósito de esta evaluación es proporcionar al espectador información sobre la calidad de la salida. Para esta evaluación, a MedGemma se le proporciona el diagnóstico de referencia previamente desconocido, y se le solicita generar una autoevaluación que destaque fortalezas así como oportunidades donde la conversación y el reporte podrían haber sido mejorados.</p>
          </div>
        </div>
        
        <button className="popup-button" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
};

export default DetailsPopup;
