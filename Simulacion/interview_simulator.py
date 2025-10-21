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

import json
import re
import os
import base64

from local_llm_client import local_gemini_get_text_response, local_medgemma_get_text_response
from gemini_tts import synthesize_gemini_tts

INTERVIEWER_VOICE = "Aoede"

def read_symptoms_json():
    # Load the list of symptoms for each condition from a JSON file
    with open("symptoms.json", 'r') as f:
        return json.load(f)

def read_patient_and_conditions_json():
    # Load all patient and condition data from the frontend assets
    with open(os.path.join(os.environ.get("FRONTEND_BUILD", "frontend/build"), "assets", "patients_and_conditions.json"), 'r') as f:
        return json.load(f)

def get_patient(patient_name):
    """Helper function to locate a patient record by name. Raises StopIteration if not found."""
    return next(p for p in PATIENTS if p["name"] == patient_name)

def get_condition_key(condition_name):
    """Map Spanish condition names to English keys in symptoms.json"""
    condition_mapping = {
        "Gripe": "Flu",
        "Malaria": "Malaria", 
        "Migraña": "Migraine",
        "Síndrome de Serotonina": "Serotonin Syndrome"
    }
    return condition_mapping.get(condition_name, condition_name)

def read_fhir_json(patient):
    # Load the FHIR (EHR) JSON file for a given patient
    with open(os.path.join(os.environ.get("FRONTEND_BUILD", "frontend/build"), patient["fhirFile"].lstrip("/")), 'r') as f:
        return json.load(f)

def get_ehr_summary_per_patient(patient_name):
    # Returns a concise EHR summary for the patient, using LLM if not already cached
    patient = get_patient(patient_name)
    if patient.get("ehr_summary"):
        return patient["ehr_summary"]
    # Use MedGemma to summarize the EHR for the patient
    ehr_summary = local_medgemma_get_text_response([
        {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": f"""Eres un asistente médico resumiendo los registros EHR (FHIR) para el paciente {patient_name}.
                    Proporciona un resumen conciso del historial médico del paciente, incluyendo cualquier condición existente, medicamentos y tratamientos pasados relevantes.
                    No incluyas opiniones personales o suposiciones, solo información factual."""
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": json.dumps(read_fhir_json(patient))
                }
            ]
        }
    ])
    patient["ehr_summary"] = ehr_summary
    return ehr_summary

PATIENTS = read_patient_and_conditions_json()["patients"]
SYMPTOMS = read_symptoms_json()
   
def patient_roleplay_instructions(patient_name, condition_name, previous_answers):
    """
    Generates structured instructions for the LLM to roleplay as a patient, including persona, scenario, and symptom logic.
    """
    # This assumes SYMPTOMS is a globally available dictionary as in the user's example
    patient = get_patient(patient_name)
    condition_key = get_condition_key(condition_name)
    symptoms = "\n".join(SYMPTOMS[condition_key])

    return f"""
        INSTRUCCIÓN DEL SISTEMA: Antes de que comience la entrevista, revisa silenciosamente los síntomas opcionales y decide cuáles tienes.

        ### Tu Persona ###
        - **Nombre:** {patient_name}
        - **Edad:** {patient["age"]}
        - **Género:** {patient["gender"]}
        - **Tu Rol:** Debes actuar como este paciente. Compórtate de manera natural y realista.

        ### Escenario ###
        Estás en casa, participando en una entrevista remota pre-visita con un asistente clínico. Recientemente reservaste una cita con tu doctor porque te has estado sintiendo mal. Ahora estás respondiendo las preguntas del asistente sobre tus síntomas.

        ### Tu Historial Médico ###
        Tienes un historial conocido de **{patient["existing_condition"]}**. Debes mencionar esto si te preguntan sobre tu historial médico, pero no sabes si está relacionado con tu problema actual.

        ### Tus Síntomas Actuales ###
        Así es como te has estado sintiendo. Basa todas tus respuestas en estos hechos. No inventes síntomas nuevos.
        ---
        {symptoms}
        ---

        ### Reglas Críticas de Interpretación ###
        - **Maneja Síntomas Opcionales:** Tu lista de síntomas puede contener síntomas opcionales (ej., "Podría tener..."). Antes de que comience la entrevista, DEBES decidir silenciosamente 'sí' o 'no' para cada síntoma opcional. Un 50% de probabilidad para cada uno es un buen enfoque. Recuerda tus elecciones y sé consistente durante toda la entrevista.
        - **Actúa como el Paciente:** Toda tu respuesta debe ser SOLO lo que el paciente diría. No agregues comentarios externos, notas o aclaraciones (ej., no escribas "[Ahora estoy describiendo el dolor de cabeza]").
        - **No Adivines:** NO sabes tu diagnóstico o el nombre de tu condición. No adivines o especules sobre ello.
        - **Responde Solo lo que se Pregunta:** No ofrezcas toda tu lista de síntomas de una vez. Responde naturalmente a la pregunta específica que hace el entrevistador.

        ### Tu historial de salud previo ###
        {patient["ehr_summary"]}

        ### Tus respuestas previas ###
        ---
        {previous_answers}
        ---
    """

def interviewer_roleplay_instructions(patient_name):
    # Returns detailed instructions for the LLM to roleplay as the interviewer/clinical assistant
    return f"""
        INSTRUCCIÓN DEL SISTEMA: Siempre piensa silenciosamente antes de responder.

        ### Persona y Objetivo ###
        Eres un asistente clínico. Tu objetivo es entrevistar a un paciente, {patient_name.split(" ")[0]}, y construir un reporte comprensivo y detallado para su médico de cabecera.

        ### Reglas Críticas ###
        - **Sin Evaluaciones:** NO estás autorizado a proporcionar consejo médico, diagnósticos, o expresar cualquier forma de evaluación al paciente.
        - **Formato de Pregunta:** Haz solo UNA pregunta a la vez. No enumeres tus preguntas.
        - **Longitud de Pregunta:** Cada pregunta debe tener 20 palabras o menos.
        - **Límite de Preguntas:** Tienes un máximo de 20 preguntas.

        ### Estrategia de Entrevista ###
        - **Razonamiento Clínico:** Basándote en las respuestas del paciente y el EHR, considera activamente diagnósticos potenciales.
        - **Diferenciar:** Formula tus preguntas estratégicamente para ayudar a diferenciar entre estas posibilidades.
        - **Investigar Pistas Críticas:** Cuando la respuesta de un paciente revele una pista de alto rendimiento (ej., viaje reciente, un síntoma clave como respiración rápida), haz una o dos preguntas de seguimiento inmediatas para explorar esa pista en detalle antes de pasar a una nueva línea de cuestionamiento.
        - **Indagación Exhaustiva:** Tu objetivo es ser exhaustivo. No termines la entrevista temprano. Usa tu asignación completa de preguntas para explorar la severidad, carácter, tiempo y contexto de todos los síntomas reportados.
        - **Búsqueda de Hechos:** Enfócate exclusivamente en recopilar información específica y objetiva.

        ### Contexto: EHR del Paciente ###
        DEBES usar el siguiente resumen del EHR para informar y adaptar tu cuestionamiento. No preguntes por información ya presente aquí a menos que necesites aclararla.
        INICIO DEL REGISTRO EHR
        {get_ehr_summary_per_patient(patient_name)}
        FIN DEL REGISTRO EHR

        ### Procedimiento ###
        1.  **Iniciar Entrevista:** Comienza la conversación con esta apertura exacta: "Gracias por reservar una cita con tu médico de cabecera. Soy un asistente aquí para hacer algunas preguntas para ayudar a tu doctor a prepararse para tu visita. Para comenzar, ¿cuál es tu principal preocupación hoy?"
        2.  **Realizar Entrevista:** Procede con tu cuestionamiento, siguiendo todas las reglas y estrategias de arriba.
        3.  **Terminar Entrevista:** DEBES continuar la entrevista hasta que hayas hecho 20 preguntas O el paciente no pueda proporcionar más información. Cuando la entrevista esté completa, DEBES concluir imprimiendo esta frase exacta: "Gracias por responder mis preguntas. Tengo todo lo necesario para preparar un reporte para tu visita. Terminar entrevista."
    """

def report_writer_instructions(patient_name: str) -> str:
    """
    Generates the system prompt with clear instructions, role, and constraints for the LLM.
    """
    ehr_summary = get_ehr_summary_per_patient(patient_name)

    return f"""<rol>
Eres un asistente médico altamente calificado con experiencia en documentación clínica.
</rol>

<tarea>
Tu tarea es generar un reporte de admisión médica conciso pero clínicamente comprensivo para un Médico de Atención Primaria (MAP). Este reporte se basará en una entrevista con el paciente y su Registro Electrónico de Salud (EHR).
</tarea>

<principios_guía>
Para asegurar que el reporte sea tanto breve como útil, DEBES adherirte a los siguientes dos principios:

1.  **Principio de Brevedad**:
    * **Usa Lenguaje Profesional**: Reformula el lenguaje conversacional del paciente en terminología médica estándar (ej., "me duele cuando respiro profundo" se convierte en "reporta dolor pleurítico en el pecho").
    * **Omite Relleno**: No incluyas relleno conversacional, cortesías o frases repetidas de la entrevista.

2.  **Principio de Relevancia Clínica (Qué es "Información Crítica")**:
    * **Prioriza el HPI**: La Historia de la Enfermedad Presente es la sección más importante. Incluye detalles clave como inicio, duración, calidad de síntomas, severidad, tiempo y factores modificadores.
    * **Incluye "Negativos Pertinentes"**: Esto es crítico. DEBES incluir síntomas que el paciente **niega** si son relevantes para la queja principal. Por ejemplo, si la queja principal es tos, negar "fiebre" o "dificultad para respirar" es información crítica y debe incluirse en el reporte.
    * **Filtra Historia**: Solo incluye datos históricos del EHR que razonablemente podrían estar relacionados con la queja actual del paciente. Para una tos, un historial de asma o tabaquismo es relevante; una apendicectomía pasada probablemente no.
</principios_guía>

<instrucciones>
1.  **Objetivo Primario**: Sintetiza la entrevista y el EHR en un reporte claro y organizado, siguiendo estrictamente los <principios_guía>.
2.  **Enfoque de Contenido**:
    * **Preocupación Principal**: Establece la queja principal del paciente.
    * **Síntomas**: Detalla la Historia de la Enfermedad Presente, incluyendo negativos pertinentes.
    * **Historia Relevante**: Incluye solo información relevante del EHR.
3.  **Restricciones**:
    * **Solo Información Factual**: Reporta solo los hechos. Sin suposiciones.
    * **Sin Diagnóstico o Evaluación**: No proporciones un diagnóstico.
</instrucciones>

<datos_ehr>
<inicio_registro_ehr>
{ehr_summary}
<fin_registro_ehr>
</datos_ehr>

<formato_salida>
La salida final DEBE ser SOLO el reporte médico Markdown completo y actualizado.
NO incluyas frases introductorias, explicaciones o cualquier texto que no sea el reporte mismo.
</formato_salida>"""

def write_report(patient_name: str, interview_text: str, existing_report: str = None) -> str:
    """
    Constructs the full prompt, sends it to the LLM, and processes the response.
    This function handles both the initial creation and subsequent updates of a report.
    """
    # Generate the detailed system instructions
    instructions = report_writer_instructions(patient_name)

    # If no existing report is provided, load a default template from a string.
    if not existing_report:
        with open("report_template.txt", 'r') as f:
            existing_report = f.read()

    # Construct the user prompt with the specific task and data
    user_prompt = f"""<inicio_entrevista>
{interview_text}
<fin_entrevista>

<reporte_previo>
{existing_report}
</reporte_previo>

<instrucciones_tarea>
Actualiza el reporte en las etiquetas `<reporte_previo>` usando la nueva información de la sección `<inicio_entrevista>`.
1.  **Integrar Nueva Información**: Agrega nuevos síntomas o detalles de la entrevista en las secciones apropiadas.
2.  **Actualizar Información Existente**: Si la entrevista proporciona información más actual, reemplaza detalles obsoletos.
3.  **Mantener Concisión**: Elimina cualquier información que ya no sea relevante.
4.  **Preservar Datos Críticos**: No elimines datos históricos esenciales (como Hipertensión) que podrían ser vitales para el diagnóstico, pero asegúrate de que se presenten de manera concisa bajo "Historia Médica Relevante".
5.  **Adherirse a Títulos de Sección**: No cambies los títulos de sección Markdown existentes.
</instrucciones_tarea>

Ahora, genera el reporte médico completo y actualizado basado en todas las instrucciones del sistema y usuario. Tu respuesta debe ser solo el texto Markdown del reporte."""

    # Assemble the full message payload for the LLM API
    messages = [
        {
            "role": "system",
            "content": [{"type": "text", "text": instructions}]
        },
        {
            "role": "user",
            "content": [{"type": "text", "text": user_prompt}]
        }
    ]

    report = local_medgemma_get_text_response(messages)
    cleaned_report = re.sub(r'<unused94>.*?</unused95>', '', report, flags=re.DOTALL)
    cleaned_report = cleaned_report.strip()

    # The LLM sometimes wraps the markdown report in a markdown code block.
    # This regex checks if the entire string is a code block and extracts the content.
    match = re.match(r'^\s*```(?:markdown)?\s*(.*?)\s*```\s*$', cleaned_report, re.DOTALL | re.IGNORECASE)
    if match:
        cleaned_report = match.group(1)

    return cleaned_report.strip()



def stream_interview(patient_name, condition_name):
    print(f"Starting interview simulation for patient: {patient_name}, condition: {condition_name}")
    # Prepare roleplay instructions and initial dialog (using existing helper functions)
    interviewer_instructions = interviewer_roleplay_instructions(patient_name)
    
    # Determine voices for TTS
    patient = get_patient(patient_name)
    patient_voice = patient["voice"]
    
    dialog = [
        {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": interviewer_instructions
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "start interview"
                }
            ]
        }
    ]
    
    write_report_text = ""
    full_interview_q_a = ""
    number_of_questions_limit = 30
    for i in range(number_of_questions_limit):
        # Get the next interviewer question from MedGemma
        interviewer_question_text = local_medgemma_get_text_response(
            messages=dialog,
            temperature=0.1,
            max_tokens=2048,
            stream=False
        )
        # Process optional "thinking" text (if present in the LLM output)
        thinking_search = re.search('<unused94>(.+?)<unused95>', interviewer_question_text, re.DOTALL)
        if thinking_search:
            thinking_text = thinking_search.group(1)
            interviewer_question_text = interviewer_question_text.replace(f'<unused94>{thinking_text}<unused95>', "")
            if i == 0:
                # Only yield the "thinking" summary for the first question
                thinking_text = local_gemini_get_text_response(
                    f"""Proporciona un resumen de hasta 100 palabras que contenga solo el razonamiento y planificación de este texto,
                    no incluyas instrucciones, usa primera persona: {thinking_text}""")
                yield json.dumps({
                        "speaker": "interviewer thinking",
                    "text": thinking_text
                })

        # Clean up the text for TTS and display
        clean_interviewer_text = interviewer_question_text.replace("Terminar entrevista.", "").strip()

        # Generate audio for the interviewer's question using Gemini TTS
        audio_data, mime_type = synthesize_gemini_tts(f"Habla de manera ligeramente optimista y enérgica, como un clínico amigable: {clean_interviewer_text}", INTERVIEWER_VOICE)
        audio_b64 = None
        if audio_data and mime_type:
            audio_b64 = f"data:{mime_type};base64,{base64.b64encode(audio_data).decode('utf-8')}"

        # Yield interviewer message (text and audio)
        yield json.dumps({
            "speaker": "interviewer",
            "text": clean_interviewer_text,
            "audio": audio_b64
        })
        dialog.append({
            "role": "assistant",
            "content": [{
                "type": "text",
                "text": interviewer_question_text
            }]
        })
        if "Terminar entrevista" in interviewer_question_text:
            # End the interview loop if the LLM signals completion
            break

        # Get the patient's response from MedGemma (roleplay LLM)
        patient_response_text = local_medgemma_get_text_response([
            {
                "role": "system",
                "content": [{"type": "text", "text": patient_roleplay_instructions(patient_name, condition_name, full_interview_q_a)}]
            },
            {
                "role": "user", 
                "content": [{"type": "text", "text": f"Pregunta: {interviewer_question_text}"}]
            }
        ])

        # Generate audio for the patient's response
        audio_data, mime_type = synthesize_gemini_tts(f"Di esto a velocidad más rápida, usando un tono enfermo: {patient_response_text}", patient_voice)
        audio_b64 = None
        if audio_data and mime_type:
            audio_b64 = f"data:{mime_type};base64,{base64.b64encode(audio_data).decode('utf-8')}"

        # Yield patient message (text and audio)
        yield json.dumps({
            "speaker": "patient",
            "text": patient_response_text,
            "audio": audio_b64
        })
        dialog.append({
            "role": "user",
            "content": [{
                "type": "text",
                "text": patient_response_text
            }]
        })
        # Track the full Q&A for context in future LLM calls
        most_recent_q_a = f"P: {interviewer_question_text}\nR: {patient_response_text}\n"
        full_interview_q_a_with_new_q_a = "P&A PREVIOS:\n" + full_interview_q_a + "\nNUEVOS P&A:\n" + most_recent_q_a
        # Update the report after each Q&A
        write_report_text = write_report(patient_name, full_interview_q_a_with_new_q_a, write_report_text)
        full_interview_q_a += most_recent_q_a
        yield json.dumps({
            "speaker": "report",
            "text": write_report_text
        })

    print(f"""Interview simulation completed for patient: {patient_name}, condition: {condition_name}.
          Patient profile used:
          {patient_roleplay_instructions(patient_name, condition_name, full_interview_q_a)}""")
    # Add this at the end to signal end of stream
    yield json.dumps({"event": "end"})