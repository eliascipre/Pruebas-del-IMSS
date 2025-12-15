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

import logging
from flask import Blueprint, render_template, request, jsonify, send_from_directory
from pathlib import Path
import shutil # For zipping the cache directory
import json # For parsing streamed JSON data

import os
import config
import utils
from local_llm_client import make_chat_completion_request, is_initialized as llm_is_initialized
from cache_store import cache
from cache_store import cache_directory
import requests

logger = logging.getLogger(__name__)

main_bp = Blueprint('main', __name__)

@main_bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'servicio-educacion',
        'port': 5002
    })

# LLM client is initialized in app.py create_app()

# --- Serve the cache directory as a zip file ---
@main_bp.route('/download_cache')
def download_cache_zip():
    """Zips the cache directory and serves it for download."""
    zip_filename = "radexplain-cache.zip"
    # Create the zip file in a temporary directory
    # Using /tmp is common in containerized environments
    temp_dir = "/tmp"
    zip_base_path = os.path.join(temp_dir, "radexplain-cache") # shutil adds .zip
    zip_filepath = zip_base_path + ".zip"

    # Ensure the cache directory exists before trying to zip it
    if not os.path.isdir(cache_directory):
        logger.error(f"Cache directory not found at {cache_directory}")
        return jsonify({"error": f"Cache directory not found on server: {cache_directory}"}), 500

    try:
        logger.info(f"Creating zip archive of cache directory: {cache_directory} to {zip_filepath}")
        shutil.make_archive(
            zip_base_path, # This is the base name, shutil adds the .zip extension
            "zip",
            cache_directory, # This is the root directory to archive
        )
        logger.info("Zip archive created successfully.")
        # Send the file and then clean it up
        return send_from_directory(temp_dir, zip_filename, as_attachment=True)
    except Exception as e:
        logger.error(f"Error creating or sending zip archive of cache directory: {e}", exc_info=True)
        return jsonify({"error": f"Error creating or sending zip archive: {e}"}), 500
@main_bp.route('/')
def index():
    """Serves the main HTML page."""
    # The backend now only provides the list of available reports.
    # The frontend will be responsible for selecting a report,
    # fetching its details (text, image path), and managing the current state.
    if not config.AVAILABLE_REPORTS:
        logger.warning("No reports found in config. AVAILABLE_REPORTS is empty.")

    return render_template(
        'index.html',
        available_reports=config.AVAILABLE_REPORTS
    )

@main_bp.route('/get_report_details/<report_name>')
def get_report_details(report_name):
    """Fetches the text content and image path for a given report name."""
    selected_report_info = next((item for item in config.AVAILABLE_REPORTS if item['name'] == report_name), None)

    if not selected_report_info:
        logger.error(f"Report '{report_name}' not found when fetching details.")
        return jsonify({"error": f"Reporte '{report_name}' no encontrado."}), 404

    report_file = selected_report_info.get('report_file')
    image_file = selected_report_info.get('image_file') 

    report_text_content = "" # Default to empty if no report file is configured.

    if report_file:
        actual_server_report_path = config.BASE_DIR / report_file

        try:
            report_text_content = actual_server_report_path.read_text(encoding='utf-8').strip()
        except Exception as e:
            logger.error(f"Error reading report file {actual_server_report_path} for report '{report_name}': {e}", exc_info=True)
            return jsonify({"error": "Error al leer el archivo del reporte."}), 500
    # If report_file was empty, report_text_content remains "".

    image_type_from_config = selected_report_info.get('image_type')
    display_image_type = 'Chest X-Ray' if image_type_from_config == 'CXR' else ('CT' if image_type_from_config == 'CT' else 'Medical Image')

    return jsonify({"text": report_text_content, "image_file": image_file, "image_type": display_image_type})



@main_bp.route('/explain', methods=['POST'])
def explain_sentence():
    """Handles the explanation request using LLM API with base64 encoded image."""
    if not llm_is_initialized():
         logger.error("LLM client (REST API) not initialized. Cannot process request.")
         return jsonify({"error": "LLM client (REST API) not initialized. Check API key and base URL."}), 500

    data = request.get_json()
    if not data or 'sentence' not in data or 'report_name' not in data:
        logger.warning("Missing 'sentence' or 'report_name' in request payload.")
        return jsonify({"error": "Faltan 'sentence' o 'report_name' en la solicitud"}), 400

    selected_sentence = data['sentence']
    report_name = data['report_name']
    logger.info(f"Received request to explain: '{selected_sentence}' for report: '{report_name}'")

    # --- Find the selected report info ---
    selected_report_info = next((item for item in config.AVAILABLE_REPORTS if item['name'] == report_name), None)

    if not selected_report_info:
        logger.error(f"Report '{report_name}' not found in available reports.")
        return jsonify({"error": f"Reporte '{report_name}' no encontrado."}), 404

    image_file = selected_report_info.get('image_file')
    report_file = selected_report_info.get('report_file')
    image_type = selected_report_info.get('image_type')

    if not image_file:
        logger.error(f"Image or report file path (relative to static) missing in config for report '{report_name}'.")
        return jsonify({"error": f"Configuración de archivo faltante para el reporte '{report_name}'."}), 500

    # Construct absolute server paths using BASE_DIR as image_file and report_file include "static/"
    server_image_path = config.BASE_DIR / image_file

    
    # --- Prepare Base64 Image for API ---
    if not server_image_path.is_file():
        logger.error(f"Image file not found at {server_image_path}")
        return jsonify({"error": f"Archivo de imagen para el reporte '{report_name}' no encontrado en el servidor."}), 500

    base64_image_data_url = utils.image_to_base64_data_url(str(server_image_path))
    if not base64_image_data_url:
        logger.error("Failed to encode image to base64.")
        return jsonify({"error": "No se pudo codificar la imagen para la solicitud de API"}), 500

    logger.info("Image successfully encoded to base64 data URL for API.")

    full_report_text = ""
    if report_file: # Only attempt to read if a report file is configured
        server_report_path = config.BASE_DIR / report_file
        try:
            full_report_text = server_report_path.read_text(encoding='utf-8')
        except FileNotFoundError:
            logger.error(f"Report file not found at {server_report_path}")
            return jsonify({"error": f"Archivo de reporte para '{report_name}' no encontrado en el servidor."}), 500
        except Exception as e:
            logger.error(f"Error reading report file {server_report_path}: {e}", exc_info=True)
            return jsonify({"error": "Error al leer el archivo del reporte."}), 500
    else: # If report_file is not configured (e.g. empty string from selected_report_info)
        logger.info(f"No report file configured for report '{report_name}'. Proceeding without full report text for system prompt.")

    system_prompt = (
        "Eres un clínico que se dirige al público. "
        f"Un usuario en aprendizaje ha proporcionado una oración de un reporte radiológico y está viendo la imagen {image_type} acompañante. "
        "Tu tarea es explicar el significado de SOLO la oración proporcionada en términos simples y claros. Explica terminología y abreviaciones. Mantén la explicación concisa. "
        "Dirígete directamente al significado de la oración. No uses frases introductorias como 'Bien' o refieras a la oración misma o al reporte mismo (ej., 'Esta oración significa...'). " # noqa: E501
        f"{f'Crucialmente, ya que el usuario está viendo su imagen {image_type}, proporciona orientación sobre dónde mirar en la imagen para entender tu explicación, si es aplicable. ' if image_type != 'CT' else ''}"
        "No discutas ninguna otra parte del reporte o oraciones no proporcionadas explícitamente por el usuario. Mantente a los hechos en el texto. No infieras nada. \n"
        "===\n"
        f"Para contexto, el REPORTE completo es:\n{full_report_text}"
    )
    user_prompt_text = f"Explica esta oración del reporte radiológico: '{selected_sentence}'"

    messages_for_api = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": user_prompt_text}
            ]
        }
    ]

    cache_key = f"explain::{report_name}::{selected_sentence}"
    cached_result = cache.get(cache_key)
    if cached_result:
        logger.info("Returning cached explanation.")
        return jsonify({"explanation": cached_result})

    try:
        logger.info("Sending request to LLM API (REST) with base64 image...")
        response = make_chat_completion_request(
            model="medgemma-4b-it",
            messages=messages_for_api,
            top_p=None,
            temperature=0,
            max_tokens=250,
            stream=False,
            seed=None,
            stop=None,
            frequency_penalty=None,
            presence_penalty=None
        )
        logger.info("Received response from LLM API (REST).")

        # Handle non-streaming response
        response_data = response.json()
        explanation = ""
        
        if response_data.get("choices") and len(response_data["choices"]) > 0:
            choice = response_data["choices"][0]
            if choice.get("message") and choice["message"].get("content"):
                explanation = choice["message"]["content"].strip()
        if explanation:
            cache.set(cache_key, explanation, expire=None)

        logger.info("Explanation generated successfully." if explanation else "Empty explanation from API.")
        return jsonify({"explanation": explanation or "No se recibió contenido de explicación de la API."})
    except requests.exceptions.RequestException as e:
        logger.error(f"Error during LLM API (REST) call: {e}", exc_info=True)
        user_error_message = ("Error al generar la explicación. El servicio podría estar temporalmente no disponible "
                              "y probablemente se está iniciando. Por favor, intenta de nuevo en unos momentos.")
        return jsonify({"error": user_error_message}), 500
