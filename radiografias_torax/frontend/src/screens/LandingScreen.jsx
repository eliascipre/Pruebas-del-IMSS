/*
# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
*/


import React from 'react';
import styles from './LandingScreen.module.css';
import IconAstrophotography from '../icons/IconAstrophotography';
import IconPerson from '../icons/IconPerson';
import IconGemma from '../icons/IconGemma';
import demoImage from '../assets/home_chest_logo.jpg';

const LandingScreen = ({onStartJourney}) => {
	return (
		<div className={styles.pageWrapper}>
			<div className={styles.mainContainer}>
				<div className={styles.bgRectangle}></div>
				<img src={demoImage} alt="Radiology scan" className={styles.droppedImage}/>
				<div className={styles.chatCard}>
					<div className={styles.chatBubbleContainer}>
						<div className={styles.iconCircle} style={{background: '#C2E7FF'}}>
							<IconAstrophotography/>
						</div>
						<div className={styles.textBubble} style={{background: '#C2E7FF'}}>
							<div className={styles.textLine} style={{width: '266px'}}></div>
							<div className={styles.textLine} style={{width: '266px'}}></div>
							<div className={styles.textLine} style={{width: '108px'}}></div>
						</div>
					</div>
					<div className={`${styles.chatBubbleContainer} ${styles.userBubble}`}>
						<div className={styles.textBubbleUser}>
							<div className={styles.textLine} style={{width: '266px'}}></div>
							<div className={styles.textLine} style={{width: '266px'}}></div>
							<div className={styles.textLine} style={{width: '108px'}}></div>
						</div>
						<div className={styles.iconCircle} style={{background: '#0B57D0'}}>
							<IconPerson/>
						</div>
					</div>
				</div>

				<div className={styles.rightContent}>
					<h1 className={styles.title}>Demo del Compañero de Aprendizaje Radiológico</h1>
					<p className={styles.subtext}>
						Dominar la interpretación de radiografías de tórax (CXR) es una habilidad compleja. ¿Qué tal si la IA pudiera facilitar tu proceso de aprendizaje? Esta demo
						muestra que MedGemma puede usarse para construir una herramienta que ayude a los estudiantes de medicina a perfeccionar sus habilidades de interpretación de CXR.
						Selecciona un caso y el sistema te guiará a través de diversas observaciones hasta un
						hallazgo clínico usando preguntas de opción múltiple, concluyendo con un resumen de tu viaje de aprendizaje.
						<br/><br/>
						Capacidades de MedGemma demostradas:
						<ul>
							<li>Entrada multimodal: Imágenes CXR y hallazgos clínicos correspondientes.</li>
							<li>Integración de guías clínicas: Aprovecha el contexto a través de RAG.</li>
							<li>Razonamiento médico: Viaje de aprendizaje personalizado basado en las entradas.</li>
						</ul>
					</p>
					<div className={styles.disclaimerAndButtonContainer}>
						<div className={styles.buttonContainer}>
							<button className={styles.viewDemoButton} onClick={onStartJourney}>
								Ver Demo
							</button>
							<button className={styles.homeButton} onClick={() => window.location.href=`${window.location.protocol}//${window.location.hostname}:3000`}>
								Ir al Inicio
							</button>
						</div>
					</div>
				</div>

			</div>
		</div>
	);
};

export default LandingScreen;