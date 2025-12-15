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
import requests
import config

logger = logging.getLogger(__name__)

_api_key = None
_endpoint_url = None
_initialized = False

def init_llm_client():
    """Initializes LLM client configuration for local MedGemma."""
    global _api_key, _endpoint_url, _initialized
    
    # Usar configuración local en lugar de variables de entorno externas
    _api_key = "lm-studio"  # API key para LM Studio
    _endpoint_url = "http://localhost:1234/v1"  # URL de MedGemma local
    _initialized = True
    logger.info("Local MedGemma LLM client configured successfully.")

def is_initialized():
    return _initialized

def make_chat_completion_request(
    model: str,
    messages: list,
    temperature: float,
    max_tokens: int,
    stream: bool,
    top_p: float | None = None,
    seed: int | None = None,
    stop: list[str] | str | None = None,
    frequency_penalty: float | None = None,
    presence_penalty: float | None = None
):
    """
    Makes a chat completion request to the local MedGemma API.
    """
    if not _initialized:
        logger.error("LLM client not initialized.")
        raise RuntimeError("LLM client not initialized.")

    headers = {
        "Authorization": f"Bearer {_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": stream,
    }
    if top_p is not None: payload["top_p"] = top_p
    if seed is not None: payload["seed"] = seed
    if stop is not None: payload["stop"] = stop
    if frequency_penalty is not None: payload["frequency_penalty"] = frequency_penalty
    if presence_penalty is not None: payload["presence_penalty"] = presence_penalty

    temp_url = _endpoint_url.rstrip('/')
    if temp_url.endswith("/v1/chat/completions"):
        full_url = temp_url
    elif temp_url.endswith("/v1"):
        full_url = temp_url + "/chat/completions"
    else:
        full_url = temp_url + "/v1/chat/completions"

    response = requests.post(full_url, headers=headers, json=payload, stream=stream, timeout=60)
    response.raise_for_status()
    return response
