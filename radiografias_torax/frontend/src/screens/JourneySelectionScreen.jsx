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


import React, {useEffect, useState} from 'react';
import JourneyCard from '../components/JourneyCard';
import IconCodeBlocks from '../icons/IconCodeBlocks';
import IconBackArrow from '../icons/IconBackArrow';
import IconInfo from '../icons/IconInfo';
import styles from './JourneySelectionScreen.module.css';
import {CXR_14_CITATION} from "../data/constants.js";
import { fetchWithRetry } from '../utils/fetchWithRetry'; 

const JourneySelectionScreen = ({onLaunchJourney, onNavigate, onShowDetails}) => {
	const [journeys, setJourneys] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchCases = async () => {
			try {
				const response = await fetchWithRetry('/api/case/stub');
				if (!response.ok) {
					throw new Error(`Network response was not ok, couldn't load images: ${response.statusText}`);
				}
				const data = await response.json();
				const formattedData = data.map(caseItem => ({
					id: caseItem.id,
					label: `Case ${caseItem.id.padStart(2, '0')}`,
					imageUrl: caseItem.download_image_url
				}));
				setJourneys(formattedData);
			} catch (err) {
				setError(err.message);
			} finally {
				setIsLoading(false);
			}
		};
		fetchCases();
	}, []);

	return (
		<div className={styles.pageContainer}>
			<div className={styles.topNav}>
				<button className={styles.backButton} onClick={() => onNavigate('landing')}>
					<IconBackArrow/>
					<span>Atrás</span>
				</button>
				<button className={styles.detailsButton} onClick={onShowDetails}>
					<IconCodeBlocks className={styles.detailsIcon}/>
					Detalles sobre esta Demo
				</button>
			</div>

			<div className={styles.contentBox}>
				<div className={styles.contentHeader}>
					<h1 className={styles.title}>Selecciona un Caso</h1>
					<p className={styles.subtext}>
						Esta demo usa 2 radiografías de tórax como conjunto de ejemplo (
						<span className={styles.imageSource}>
              <span
	              className="tooltip-trigger"
	              data-tooltip-content={CXR_14_CITATION}
	              style={{borderBottom: '1px dotted'}}
              >
                Fuente de imagen: CXR-14 Dataset
              </span>
            </span>
						)
					</p>
				</div>

				<div className={styles.journeysContainer}>
					{isLoading ? (
							<div className={styles.statusContainer}>
								<div className={styles.loadingSpinner}></div>
								<p className={styles.statusText}>Cargando casos disponibles...</p>
							</div>
					) : error ? (
							<div className={`${styles.statusContainer} ${styles.errorContainer}`}>
								<p className={styles.statusText}>⚠️</p>
								<p className={styles.statusText}>No se pudieron cargar los casos. Inténtalo de nuevo más tarde.</p>
							</div>
					) : (
						journeys.map(journey => (
							<JourneyCard
								key={journey.id}
								journey={journey}
								onLaunch={() => onLaunchJourney(journey)}
							/>
						))
					)}
				</div>

				<br/>
					<p className={styles.subtext}>
						MedGemma utiliza RAG para incluir dinámicamente contexto adicional de&nbsp;
						<a href="https://www.who.int/publications/i/item/9241546778" target="_blank" rel="noopener noreferrer">
							El manual de la OMS de diagnóstico por imagen
						</a>
						<span
							className="tooltip-trigger"
							data-tooltip-content="Esta demo usa MedGemma para generar un módulo de aprendizaje para analizar radiografías de tórax, aprovechando un sistema RAG para fundamentar la justificación y pista de cada pregunta en la guía autoritativa de la OMS."
						>
            <IconInfo/>
          </span>

					</p>
					<p className={styles.subtext}>
						Esta demo está construida asumiendo que el usuario tiene conocimientos médicos básicos. La experiencia está diseñada
						para guiar al usuario a través de un caso, facilitando el aprendizaje durante el proceso.
					</p>
			</div>
		</div>
	);
};

export default JourneySelectionScreen;