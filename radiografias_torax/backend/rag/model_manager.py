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
import os
import sys

import config
import nltk
import stanza
import torch
from langchain_community.embeddings import HuggingFaceEmbeddings

from .siglip_embedder import CustomSigLipEmbeddings

logger = logging.getLogger(__name__)


class ModelManager:
    """Handles the expensive, one-time setup of downloading and loading all AI models required for RAG."""

    def __init__(self):
        # Configuration for model identifiers
        self.embedding_model_id = config.EMBEDDING_MODEL_ID
        self.stanza_ner_package = "mimic"
        self.stanza_ner_processor = "i2b2"

    def load_models(self) -> dict:
        """
        Initializes and returns a dictionary of model components.
        Note: The main LLM is accessed via API and is NOT loaded here.
        """
        logger.info("--- Initializing RAG-specific Models (Embedder, NER) ---")
        
        # Verificar si se fuerza CPU mediante variable de entorno
        force_cpu = os.environ.get("FORCE_CPU", "").strip().lower() in ("1", "true", "t", "yes", "y", "si", "s")
        
        if force_cpu:
            device = "cpu"
            logger.info("FORCE_CPU=1 detectado, forzando uso de CPU para modelos RAG")
        else:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device} for RAG models")

        models = {}

        # 1. Load Embedder
        try:
            logger.info(f"Loading embedding model: {self.embedding_model_id}")
            
            # Verificar que embedding_model_id no sea None
            if self.embedding_model_id is None:
                raise ValueError("EMBEDDING_MODEL_ID no está configurado")
            
            if "siglip" in self.embedding_model_id:
                models["embedder"] = CustomSigLipEmbeddings(
                    siglip_model_name=self.embedding_model_id,
                    device=device,
                    normalize_embeddings=True,
                )
            else:
                models['embedder'] = HuggingFaceEmbeddings(
                    model_name=self.embedding_model_id,
                    model_kwargs={"device": device},
                    encode_kwargs={"normalize_embeddings": True},
                )
            logger.info("✅ Embedding model loaded successfully.")
        except Exception as e:
            logger.error(f"⚠️ Failed to load embedding model: {e}", exc_info=True)
            models['embedder'] = None

        # 2. Load Stanza for NER
        try:
            logger.info("Downloading NLTK and Stanza models...")
            # Descargar recursos NLTK necesarios para NLTKTextSplitter
            try:
                nltk.download('punkt_tab', quiet=True)
                logger.info("✅ NLTK punkt_tab downloaded.")
            except Exception as nltk_err:
                logger.warning(f"⚠️ Failed to download NLTK punkt_tab: {nltk_err}")
            # Descargar modelos necesarios sin lemma para evitar el error de charlm_forward_file
            # Usar tokenize + ner en lugar del package mimic que requiere lemma
            stanza.download(
                "en",
                processors={"tokenize": "default", "ner": "i2b2"},
                verbose=False,
            )
            logger.info("✅ Stanza models downloaded.")

            logger.info("Loading Stanza NER Pipeline...")
            # Usar tokenize + ner para evitar el procesador lemma que causa el error
            # El procesador tokenize es necesario antes de ner pero no requiere lemma
            # Verificar si se fuerza CPU
            force_cpu = os.environ.get("FORCE_CPU", "").strip().lower() in ("1", "true", "t", "yes", "y", "si", "s")
            use_gpu = not force_cpu and torch.cuda.is_available()
            models['ner_pipeline'] = stanza.Pipeline(
                lang="en",
                processors={"tokenize": "default", "ner": "i2b2"},
                use_gpu=use_gpu,
                verbose=False,
                tokenize_no_ssplit=True,
            )
            logger.info("✅ Stanza NER Pipeline loaded successfully.")
        except Exception as e:
            logger.error(f"⚠️ Failed to set up Stanza NER pipeline: {e}", exc_info=True)
            # Si falla, intentar sin procesadores adicionales que requieren lemma
            try:
                logger.info("Intentando cargar Stanza NER con configuración mínima...")
                models['ner_pipeline'] = stanza.Pipeline(
                    lang="en",
                    processors={"tokenize": "default", "ner": "i2b2"},
                    use_gpu=False,  # Forzar CPU si hay problemas
                    verbose=False,
                )
                logger.info("✅ Stanza NER Pipeline cargado con configuración mínima.")
            except Exception as e2:
                logger.error(f"⚠️ Fallo definitivo al cargar Stanza NER: {e2}", exc_info=True)
                models['ner_pipeline'] = None

        if all(models.values()):
            logger.info("\n✅ All RAG-specific models initialized successfully.")
        else:
            logger.error("\n⚠️ One or more RAG models failed to initialize. Check errors above.")

        return models
