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

document.addEventListener('DOMContentLoaded', () => {
    const infoDiv = document.querySelector('.info');
    const mainDiv = document.querySelector('.main');
    const reportSectionDiv = document.querySelector('.report-section');
    const viewDemoButton = document.getElementById('view-demo-button');
    const backToInfoButton = document.getElementById('back-to-info-button');
    const caseSelectorTabsContainer = document.getElementById('case-selector-tabs-container');
    const reportTextDisplay = document.getElementById('report-text-display');
    const explanationOutput = document.getElementById('explanation-output');
    const explanationContent = document.getElementById('explanation-content');
    const explanationError = document.getElementById('explanation-error');
    const imageContainer = document.getElementById('image-container');
    const reportImage = document.getElementById('report-image');
    const imageLoading = document.getElementById('image-loading');
    const imageError = document.getElementById('image-error');
    const imageModalityHeader = document.getElementById('image-modality-header'); // Get reference to the header
    const ctImageNote = document.getElementById('ct-image-note');
    const appLoading = document.getElementById('app-loading');
    const appError = document.getElementById('app-error');

    let availableReports = [];
    let currentReportName = null;
    let currentReportDetails = null;

    let explainAbortController = null;
    let reportLoadAbortController = null;
    let appLoadingTimeout = null;
    let explanationLoadingTimer = null;

    function initialize() {
        try {
            const reportsDataElement = document.getElementById('reports-data');
            if (reportsDataElement) {
                availableReports = JSON.parse(reportsDataElement.textContent);
            } else {
                displayAppError("Error al cargar la lista de reportes.");
                return;
            }
        } catch (e) {
            displayAppError("Error al procesar la lista de reportes.");
            return;
        }

        if (availableReports.length === 0) {
            displayAppError("No hay reportes disponibles.");
            return;
        }

        if (viewDemoButton && infoDiv && mainDiv) {
            viewDemoButton.addEventListener('click', () => {
                infoDiv.style.display = 'none';
                mainDiv.style.display = 'grid';
                if (currentReportName) {
                    loadReportDetails(currentReportName);
                }
            });
        }

        if (backToInfoButton && infoDiv && mainDiv) {
            backToInfoButton.addEventListener('click', () => {
                abortOngoingRequests();
                mainDiv.style.display = 'none';
                infoDiv.style.display = 'flex';
                clearAllOutputs();
                currentReportDetails = null;
                reportImage.src = '';
                document.title = "Explicador de Reportes Radiológicos";
            });
        }

        if (caseSelectorTabsContainer) {
            caseSelectorTabsContainer.addEventListener('click', handleCaseSelectionClick);
        }

        reportTextDisplay.addEventListener('click', handleSentenceClick);

        const firstCaseButton = caseSelectorTabsContainer?.querySelector('.nav-button-case');
        if (firstCaseButton) {
            currentReportName = firstCaseButton.dataset.reportName;
            setActiveCaseButton(firstCaseButton);
            loadReportDetails(currentReportName);
        } else {
            displayAppError("No se encontraron casos para cargar inicialmente.");
        }
    }

    function handleCaseSelectionClick(event) {
        const clickedButton = event.target.closest('.nav-button-case');
        if (!clickedButton) return;

        const selectedName = clickedButton.dataset.reportName;
        if (selectedName && selectedName !== currentReportName) {
            abortOngoingRequests();
            currentReportName = selectedName;
            setActiveCaseButton(clickedButton);
            loadReportDetails(currentReportName);
        }
    }

    async function handleSentenceClick(event) {
        const clickedElement = event.target;
        if (!clickedElement.classList.contains('report-sentence') || clickedElement.tagName !== 'SPAN') return;

        const sentenceText = clickedElement.dataset.sentence;
        if (!sentenceText || !currentReportName) return;

        abortOngoingRequests(['report']);
        explainAbortController = new AbortController();
        
        document.querySelectorAll('#report-text-display .selected-sentence').forEach(el => el.classList.remove('selected-sentence'));
        clickedElement.classList.add('selected-sentence');

        adjustExplanationPosition(clickedElement);

        try {
            await Promise.all([
                fetchExplanation(sentenceText, explainAbortController.signal),
            ]);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Error during sentence processing:", error);
            }
        }
    }

    async function loadReportDetails(reportName) {
        abortOngoingRequests();
        reportLoadAbortController = new AbortController();
        const signal = reportLoadAbortController.signal;

        setLoadingState(true, 'report');
        clearAllOutputs(true);

        try {
            const response = await fetch(`/get_report_details/${encodeURIComponent(reportName)}`, { signal });
            if (signal.aborted) return;

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }

            currentReportDetails = await response.json();
            if (signal.aborted) return;

            document.title = `${reportName} - Explicador Radiológico`;

            // Update the image modality header
            if (imageModalityHeader && currentReportDetails.image_type) {
                imageModalityHeader.textContent = currentReportDetails.image_type;
            }

            // Show/hide CT note based on image_type and image_file presence
            if (ctImageNote) {
                if (currentReportDetails.image_type === 'CT' && currentReportDetails.image_file) {
                    ctImageNote.style.display = 'block';
                } else {
                    ctImageNote.style.display = 'none';
                }
            }


            if (currentReportDetails.image_file) {
                const imageUrl = `${currentReportDetails.image_file}`;

                reportImage.onload = null;
                reportImage.onerror = null;

                reportImage.onload = () => {
                    imageLoading.style.display = 'none';
                    reportImage.style.display = 'block';
                    imageError.style.display = 'none';
                };
                reportImage.onerror = () => {
                    imageLoading.style.display = 'none';
                    reportImage.style.display = 'none';
                    displayImageError("Error al cargar el archivo de imagen.");
                };

                reportImage.src = imageUrl;
                reportImage.alt = `Imagen Radiológica para ${reportName}`;
            } else {
                displayImageError("Ruta de imagen no configurada para este reporte.");
                if (ctImageNote) ctImageNote.style.display = 'none'; // Ensure note is hidden if no image path
            }

            renderReportTextWithLineBreaks(currentReportDetails.text || '');
        } catch (error) {
            if (error.name !== 'AbortError') {
                displayReportTextError(`Error al cargar el reporte: ${error.message}`);
                // Clean up UI elements on report load error.
                if (reportImage) {
                    reportImage.style.display = 'none';
                    reportImage.src = '';
                    reportImage.onload = null;
                    reportImage.onerror = null;
                }
                if (imageLoading) imageLoading.style.display = 'none';
                if (imageError) imageError.style.display = 'none';
                if (ctImageNote) ctImageNote.style.display = 'none';
                clearExplanationAndLocationUI();
            }
        } finally {
            if (reportLoadAbortController?.signal === signal) {
                reportLoadAbortController = null;
            }
            if (!signal.aborted) {
                setLoadingState(false, 'report');
            }
        }
    }

    function renderReportTextWithLineBreaks(text) {
        reportTextDisplay.innerHTML = '';
        reportTextDisplay.classList.remove('loading', 'error');

        const lines = text.split('\n');
        if (lines.length === 0 || (lines.length === 1 && !lines[0].trim())) {
            reportTextDisplay.textContent = 'El texto del reporte está vacío o no se pudo procesar.';
            return;
        }

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (trimmedLine !== '') {
                const sentences = splitSentences(trimmedLine);
                sentences.forEach(sentence => {
                    if (sentence) {
                        const span = document.createElement('span');
                        span.textContent = sentence + ' ';
                        if (!sentence.includes('Image source: ') && sentence.includes(' ') || !sentence.includes(':')) {
                            span.classList.add('report-sentence');
                        }
                        span.dataset.sentence = sentence;
                        reportTextDisplay.appendChild(span);
                    }
                });
            }
            if (index < lines.length - 1) {
                reportTextDisplay.appendChild(document.createElement('br'));
            }
        });
    }

    async function fetchExplanation(sentence, signal) {
        explanationError.style.display = 'none';
        if (!currentReportName) {
            displayExplanationError("No hay reporte seleccionado.");
            return;
        }

    if (explanationLoadingTimer) {
        clearTimeout(explanationLoadingTimer);
    }

    explanationLoadingTimer = setTimeout(() => {
        if (!signal.aborted) { // Only add if not already aborted
            explanationOutput.classList.add('loading');
            explanationContent.textContent = '';
        }
        explanationLoadingTimer = null; // Timer has done its job or been cleared
    }, 150); // 150ms delay, adjust as needed

        try {
            const response = await fetch('/explain', {
                method: 'POST',
            headers: { 'Content-Type': 'application/json' }, // prettier-ignore
                body: JSON.stringify({ sentence, report_name: currentReportName }),
                signal
            });

            if (signal.aborted) return;

            if (!response.ok) {
            if (explanationLoadingTimer) clearTimeout(explanationLoadingTimer);
            explanationLoadingTimer = null;
            explanationOutput.classList.remove('loading');
                const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }

            const data = await response.json();
            if (signal.aborted) return;

        if (explanationLoadingTimer) clearTimeout(explanationLoadingTimer);
        explanationLoadingTimer = null;
            explanationOutput.classList.remove('loading');
            requestAnimationFrame(() => {
                explanationContent.textContent = data.explanation || "No explanation content received.";
                adjustExplanationPosition();
            });
        } catch (error) {
        if (explanationLoadingTimer) clearTimeout(explanationLoadingTimer);
        explanationLoadingTimer = null;
            explanationOutput.classList.remove('loading');
            if (error.name !== 'AbortError') {
                displayExplanationError(`Error de Explicación: ${error.message}`);
            }
        }
    }

    function setLoadingState(isLoading, type = 'all') {
        if (type === 'all' || type === 'report') {
            if (isLoading) {
                if (appLoadingTimeout) {
                    clearTimeout(appLoadingTimeout);
                    appLoadingTimeout = null;
                }
                // Cleanup immediate error/content states
                if (appError) appError.style.display = 'none';
                if (reportImage) reportImage.style.display = 'none';
                if (imageError) imageError.style.display = 'none';
                if (ctImageNote) ctImageNote.style.display = 'none';
                clearExplanationAndLocationUI();

                appLoadingTimeout = setTimeout(() => {
                    if (appLoading) appLoading.style.display = 'block';

                    // Show content-specific loaders only if timeout fires
                    if (reportTextDisplay) {
                        reportTextDisplay.innerHTML = 'Cargando...';
                        reportTextDisplay.classList.add('loading');
                        reportTextDisplay.classList.remove('error');
                    }
                    if (imageLoading) imageLoading.style.display = 'block';
                }, 200); // Delay for app and content loading indicators (e.g., 200ms)

            } else {
                if (appLoadingTimeout) {
                    clearTimeout(appLoadingTimeout);
                    appLoadingTimeout = null;
                }
                if (appLoading) appLoading.style.display = 'none';
            }
        }
    }
    function clearAllOutputs(keepReportTextLoading = false) {
        if (!keepReportTextLoading && reportTextDisplay) {
            reportTextDisplay.innerHTML = 'Selecciona un reporte para ver su texto.';
            reportTextDisplay.classList.remove('loading', 'error');
        }
        if (reportImage) {
            reportImage.style.display = 'none';
            reportImage.onload = null;
            reportImage.onerror = null;
            reportImage.src = '';
        }
        if (imageError) imageError.style.display = 'none';
        if (ctImageNote) ctImageNote.style.display = 'none';
        clearExplanationAndLocationUI();
        if (appError) appError.style.display = 'none';
        // Reset image modality header on clear
        if (imageModalityHeader) {
             imageModalityHeader.textContent = 'Imagen Médica'; // Reset to default
        }
    }

    function clearExplanationAndLocationUI() {
        if (explanationContent) {
            explanationContent.textContent = 'Haz clic en una oración para ver la explicación aquí.';
        }
        if (explanationLoadingTimer) { // Clear any pending explanation loading timer
            clearTimeout(explanationLoadingTimer);
            explanationLoadingTimer = null;
        }
        explanationOutput.classList.remove('loading');
        explanationError.style.display = 'none';
        document.querySelectorAll('#report-text-display .selected-sentence').forEach(el => el.classList.remove('selected-sentence'));
    }

    function displayReportTextError(message) {
        reportTextDisplay.innerHTML = `<span class="error-message">${message}</span>`;
        reportTextDisplay.classList.add('error');
        reportTextDisplay.classList.remove('loading');
    }

    function displayAppError(message) {
        appError.textContent = `Error: ${message}`;
        appError.style.display = 'block';
        appLoading.style.display = 'none';
    }

    function displayImageError(message) {
        imageError.textContent = message;
        imageError.style.display = 'block';
        imageLoading.style.display = 'none';
        reportImage.style.display = 'none';
        if (ctImageNote) ctImageNote.style.display = 'none';
    }

    function displayExplanationError(message) {
        explanationError.textContent = message;
        explanationError.style.display = 'block';
        explanationOutput.classList.remove('loading');
        if (explanationContent) explanationContent.textContent = '';
    }

    function setActiveCaseButton(activeButton) {
        if (!caseSelectorTabsContainer) return;
        caseSelectorTabsContainer.querySelectorAll('.nav-button-case').forEach(btn => btn.classList.remove('active'));
        if (activeButton) activeButton.classList.add('active');
    }

    function splitSentences(text) {
        if (!text) return [];
        try {
            if (typeof nlp !== 'function') {
                const basicSentences = text.match(/[^.?!]+[.?!]['"]?(\s+|$)/g);
                return basicSentences ? basicSentences.map(s => s.trim()).filter(s => s.length > 0) : [];
            }
            const doc = nlp(text);
            return doc.sentences().out('array').map(s => s.trim()).filter(s => s.length > 0);
        } catch (e) {
            const basicSentences = text.match(/[^.?!]+[.?!]['"]?(\s+|$)/g);
            return basicSentences ? basicSentences.map(s => s.trim()).filter(s => s.length > 0) : [];
        }
    }

    function adjustExplanationPosition(clickedSentenceElement) {
        const targetSentenceElement = clickedSentenceElement || document.querySelector('#report-text-display .selected-sentence');
        if (!targetSentenceElement) return;

        const explanationSection = explanationOutput.closest('.explanation-section');

        if (explanationOutput && explanationSection && reportSectionDiv) {
            const sentenceRect = targetSentenceElement.getBoundingClientRect();
            const explanationSectionRect = explanationSection.getBoundingClientRect();
            
            // Use actual offsetHeight, fallback if not rendered. Accurate after rAF.
            const explanationHeight = explanationOutput.offsetHeight || 200; 
            
            // Initial top: align with sentence, relative to explanationSection.
            let newTop = sentenceRect.top - explanationSectionRect.top;
            
            // Absolute bottom of explanation box if placed at newTop.
            const explanationBoxAbsoluteBottom = explanationSectionRect.top + newTop + explanationHeight + 15; // 15px margin
            
            const viewportHeight = window.innerHeight;
            const pageBottomOverflow = explanationBoxAbsoluteBottom - viewportHeight;
            
            if (pageBottomOverflow > 0) {
                // Adjust newTop upwards if overflowing viewport bottom.
                newTop -= pageBottomOverflow;
            }
            
            // Prevent top from being negative (relative to its container).
            newTop = Math.max(0, newTop);
            
            explanationOutput.style.top = `${newTop}px`;
        }
    }

    function abortOngoingRequests(excludeTypes = []) {
        if (!excludeTypes.includes('report') && reportLoadAbortController) {
            reportLoadAbortController.abort();
            reportLoadAbortController = null;
        }
        if (!excludeTypes.includes('explain') && explainAbortController) {
            explainAbortController.abort();
            explainAbortController = null;
        }
    }

    initialize();
});


// Make sure this is within your existing DOMContentLoaded listener,
// or wrap it in one if demo.js doesn't have a global one.
document.addEventListener('DOMContentLoaded', () => {

    // ... (any existing JavaScript code in demo.js)

    // --- BEGIN: Immersive Info Dialog Logic ---
    const infoButton = document.getElementById('info-button');
    const immersiveDialogOverlay = document.getElementById('immersive-info-dialog');
    const dialogCloseButton = document.getElementById('dialog-close-button');

    if (infoButton && immersiveDialogOverlay && dialogCloseButton) {
        const openDialog = () => {
            immersiveDialogOverlay.style.display = 'flex'; // Use flex as per CSS
            // Timeout to allow display:flex to apply before triggering transition
            setTimeout(() => {
                immersiveDialogOverlay.classList.add('active');
            }, 10); // Small delay
            document.body.style.overflow = 'hidden'; // Prevent background scroll
        };

        const closeDialog = () => {
            immersiveDialogOverlay.classList.remove('active');
            // Wait for opacity transition to finish before setting display to none
            setTimeout(() => {
                immersiveDialogOverlay.style.display = 'none';
            }, 300); // Must match CSS transition duration
            document.body.style.overflow = ''; // Restore background scroll
        };

        infoButton.addEventListener('click', openDialog);
        dialogCloseButton.addEventListener('click', closeDialog);

        // Dismissible: Close when clicking on the overlay (backdrop)
        immersiveDialogOverlay.addEventListener('click', (event) => {
            if (event.target === immersiveDialogOverlay) {
                closeDialog();
            }
        });

        // Dismissible: Close with Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && immersiveDialogOverlay.classList.contains('active')) {
                closeDialog();
            }
        });
    } else {
        // Log errors if elements are not found, helps in debugging
        if (!infoButton) console.error('Dialog trigger button (#info-button) not found.');
        if (!immersiveDialogOverlay) console.error('Immersive dialog (#immersive-info-dialog) not found.');
        if (!dialogCloseButton) console.error('Dialog close button (#dialog-close-button) not found.');
    }
    // --- END: Immersive Info Dialog Logic ---

});
