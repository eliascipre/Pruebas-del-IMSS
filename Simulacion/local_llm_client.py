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

import os
import requests
from cache import cache

# Configuración para MedGemma local con API OpenAI
LOCAL_MEDGEMMA_URL = os.environ.get("LOCAL_MEDGEMMA_URL", "http://localhost:1234/v1")
LOCAL_MEDGEMMA_API_KEY = os.environ.get("LOCAL_MEDGEMMA_API_KEY", "lm-studio")

@cache.memoize()
def local_medgemma_get_text_response(
    messages: list,
    temperature: float = 0.1,
    max_tokens: int = 4096,
    stream: bool = False,
    top_p: float | None = None,
    seed: int | None = None,
    stop: list[str] | str | None = None,
    frequency_penalty: float | None = None,
    presence_penalty: float | None = None,
    model: str = "medgemma"
):
    """
    Hace una petición de chat completion a MedGemma local usando API OpenAI compatible.
    """
    headers = {
        "Authorization": f"Bearer {LOCAL_MEDGEMMA_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": stream
    }

    if top_p is not None: 
        payload["top_p"] = top_p
    if seed is not None: 
        payload["seed"] = seed
    if stop is not None: 
        payload["stop"] = stop
    if frequency_penalty is not None: 
        payload["frequency_penalty"] = frequency_penalty
    if presence_penalty is not None: 
        payload["presence_penalty"] = presence_penalty

    response = requests.post(
        f"{LOCAL_MEDGEMMA_URL}/chat/completions", 
        headers=headers, 
        json=payload, 
        stream=stream, 
        timeout=60
    )
    
    try:
        response.raise_for_status()
        if stream:
            return response
        return response.json()["choices"][0]["message"]["content"]
    except requests.exceptions.JSONDecodeError:
        print(f"Error: Failed to decode JSON from MedGemma local. Status: {response.status_code}, Response: {response.text}")
        raise
    except Exception as e:
        print(f"Error calling MedGemma local: {e}")
        raise

@cache.memoize()
def local_gemini_get_text_response(
    prompt: str,
    stop_sequences: list = None,
    temperature: float = 0.1,
    max_output_tokens: int = 4000,
    top_p: float = 0.8,
    top_k: int = 10
):
    """
    Usa MedGemma local para simular respuestas de Gemini (paciente).
    """
    messages = [
        {
            "role": "system", 
            "content": "Eres un paciente que responde preguntas médicas de manera natural y conversacional. Responde de forma clara y honesta en español."
        },
        {
            "role": "user", 
            "content": prompt
        }
    ]
    
    return local_medgemma_get_text_response(
        messages=messages,
        temperature=temperature,
        max_tokens=max_output_tokens,
        top_p=top_p,
        stop=stop_sequences
    )
