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
import './WelcomePage.css';

const WelcomePage = ({ onSwitchPage }) => {
  return (
    <div className="welcome page">
      <div className="info-page-container">
        <div className="graphics">
          <img className="graphics-top" src="/assets/welcome_top_graphics.svg" alt="Welcome top graphics" />
          <img className="graphics-bottom" src="/assets/welcome_bottom_graphics.svg" alt="Welcome bottom graphics" />
        </div>
        <div className="info-content">
          <div className="info-header">
            <span className="title-header">Demo de Simulación de Entrevista Pre-visita</span>
          </div>
          <div className="info-text">
            Los proveedores de atención médica a menudo necesitan recopilar información del paciente antes de las citas. 
            Esta demostración ilustra cómo MedGemma podría usarse en una aplicación para optimizar la recopilación y utilización de información pre-visita. 
            <br /><br/>
            Primero, un agente de IA pre-visita construido con MedGemma hace preguntas para recopilar información.
            Después de haber identificado y recopilado información relevante, la aplicación de demostración genera un informe pre-visita. 
            <br /><br/>
            Este tipo de informe pre-visita inteligente puede ayudar a los proveedores a ser más eficientes y efectivos mientras también proporciona una experiencia mejorada 
            para los pacientes en comparación con los formularios de admisión tradicionales.
            <br /><br/>
            Finalmente, puedes ver una evaluación del informe pre-visita que proporciona información sobre la calidad de la salida. 
            Para esta evaluación, a MedGemma se le proporciona el diagnóstico de referencia, permitiendo una "autoevaluación" que destaca tanto las fortalezas como lo que podría haber hecho mejor.
          </div>
          <div className="info-buttons">
            <button className="info-button" onClick={onSwitchPage}>Seleccionar Paciente</button>
            <button className="info-button info-button-secondary" onClick={() => window.location.href=`${window.location.protocol}//${window.location.hostname}:3000`}>Ir al Inicio</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
