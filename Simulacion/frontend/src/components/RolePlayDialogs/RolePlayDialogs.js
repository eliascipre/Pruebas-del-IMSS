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

import React, { useState } from "react";
import "./RolePlayDialogs.css";
import DetailsPopup from "../DetailsPopup/DetailsPopup";

const RolePlayDialogs = ({
  selectedPatient,
  selectedCondition,
  onStart,
  onBack,
}) => {
  const [isDetailsPopupOpen, setIsDetailsPopupOpen] = useState(false);

  return (
    <div className="page">
      <div className="headerButtonsContainer">
        <button className="back-button" onClick={onBack}>
          <i className="material-icons back-button-icon">keyboard_arrow_left</i>
          Atrás
        </button>
        <button className="details-button" onClick={() => setIsDetailsPopupOpen(true)}>
          <i className="material-icons code-block-icon">code</i>&nbsp; Detalles
          sobre esta Demo
        </button>
      </div>
      <div className="frame role-play-container">
        <div className="title-header">¿Qué está pasando en esta simulación?</div>
        <div className="dialogs-container">
          <div className="dialog-box">
            <div className="dialog-title-text">Agente de IA Pre-visita</div>
            <div className="dialog-subtitle">
              Construido con: <img src="assets/medgemma.avif" height="16px" />{" "}
              27b
            </div>
            <img
              src="assets/ai_headshot.svg"
              alt="AI Avatar"
              className="ai-avatar"
            />
            <div className="dialog-body-scrollable">
              En esta demo, MedGemma funciona como un agente de IA diseñado para asistir en la recopilación de información
              pre-visita. Interactuará con el agente del paciente para recopilar datos relevantes.
              Para proporcionar contexto adicional, MedGemma también tiene acceso a información del EHR del paciente (en formato FHIR).
              Sin embargo, a MedGemma no se le proporciona el diagnóstico específico ({selectedCondition}).
              El objetivo de MedGemma es recopilar detalles sobre síntomas, historial relevante,
              y preocupaciones actuales para generar un reporte pre-visita comprensivo. 
            </div>
          </div>
          <div className="dialog-box">
            <div className="dialog-title-text">
              Persona del Paciente: {selectedPatient.name}
            </div>
            <div className="dialog-subtitle">
              Simulado por:{" "}Gemini 2.5 Flash
            </div>
            <img
              src={selectedPatient.headshot}
              alt="Patient Avatar"
              className="patient-avatar"
            />
            <div className="dialog-body-scrollable">
              Se le proporciona a Gemini una persona e información para interpretar el rol del paciente, {selectedPatient.name}.
              En esta simulación, el agente del paciente no conoce su diagnóstico,
              pero está experimentando síntomas y preocupaciones relacionadas que pueden compartirse durante la entrevista. 
              Para simular una situación del mundo real con información confusa, también se ha proporcionado información adicional no relacionada con la condición presente. 
            </div>
          </div>
        </div>
        <div className="report-notice">
          A medida que se desarrolla la conversación, MedGemma <span className="highlight">crea y actualiza continuamente
          un reporte pre-visita en tiempo real</span> que captura información
          relevante. Después de la generación del reporte pre-visita, está disponible una evaluación. El propósito de esta evaluación es proporcionar al espectador información sobre la calidad de la salida.
          Para esta evaluación, a MedGemma se le proporciona el diagnóstico de referencia previamente desconocido, y se le solicita generar una 
          <span className="highlight">autoevaluación que destaque fortalezas así como oportunidades donde la conversación y el reporte podrían haber sido mejorados.</span>
        </div>
        <button className="info-button" onClick={onStart}>
          Iniciar conversación
        </button>
      </div>
      <DetailsPopup
        isOpen={isDetailsPopupOpen}
        onClose={() => setIsDetailsPopupOpen(false)}
      />
    </div>
  );
};

export default RolePlayDialogs;
