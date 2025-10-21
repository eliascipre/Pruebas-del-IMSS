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
import logging
import uuid
import requests
import base64
from case_util import get_json_from_model_response
from models import ClinicalMCQ
from prompts import mcq_prompt_all_questions_with_rag
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

class LLMClient(ABC):
    _api_key = None
    _endpoint_url = None
    
    def _download_and_encode_image(self, image_url: str) -> str | None:
        """Download image from URL and convert to base64 data URL"""
        try:
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            # Convert to base64
            image_base64 = base64.b64encode(response.content).decode('utf-8')
            
            # Get content type
            content_type = response.headers.get('content-type', 'image/png')
            
            return f"data:{content_type};base64,{image_base64}"
        except Exception as e:
            logger.error(f"Error downloading image from {image_url}: {e}")
            return None

    def generate_all_questions(self, case_data: dict, guideline_context: str) -> list[ClinicalMCQ] | None:
        """
            Orchestrates the prompt creation and live LLM call to generate the list of all MCQs.
            Receives pre-fetched RAG context as a string.
            """
        # 1. Create the prompt messages payload
        messages = self._create_prompt_messages_for_all_questions(
            image_url=case_data.get('download_image_url'),
            ground_truth_labels=case_data.get('ground_truth_labels', {}),
            guideline_context=guideline_context  # Pass the pre-fetched context
        )

        try:
            # 2. Make the API call
            response_dict = self._make_chat_completion_request(
                model="medgemma-4b-it",  # MedGemma model with vision support
                messages=messages,
                temperature=0,
                max_tokens=8192
            )

            # 3. Safely access the list of questions from the parsed dictionary
            list_of_question_dicts = response_dict.get("questions", [])

            if not list_of_question_dicts:
                raise ValueError("LLM response did not contain a 'questions' key or the list was empty.")

            # 4. Loop through the extracted list and create ClinicalMCQ objects
            list_clinical_mcq = []
            for question_dict in list_of_question_dicts:
                if "question" not in question_dict:
                    logger.warning("Skipping malformed question object in response.")
                    continue

                mcq_uuid = str(uuid.uuid4())
                clinical_mcq = ClinicalMCQ(
                    id=mcq_uuid,
                    question=question_dict.get('question', ''),
                    choices=question_dict.get('choices', {}),
                    hint=question_dict.get('hint', ''),
                    answer=question_dict.get('answer', ''),
                    rationale=question_dict.get('rationale', '')
                )
                list_clinical_mcq.append(clinical_mcq)

            return list_clinical_mcq

        except Exception as e:
            logger.error(f"Failed to generate and parse learning module: {e}")
            return None

    @abstractmethod
    def _make_chat_completion_request(
        self,
        model: str,
        messages: list,
        temperature: float,
        max_tokens: int,
        top_p: float | None = None,
        seed: int | None = None,
        stop: list[str] | str | None = None,
        frequency_penalty: float | None = None,
        presence_penalty: float | None = None
    ) -> dict | None:
        pass

    def _create_prompt_messages_for_all_questions(self, image_url: str, ground_truth_labels: dict, guideline_context: str):
        """
        Creates the list of messages for the LLM prompt.
        Dynamically selects the prompt and constructs the payload based on whether RAG context is present.
        """
        # Download and encode the image
        base64_image = self._download_and_encode_image(image_url)
        if not base64_image:
            raise ValueError(f"Failed to download and encode image from {image_url}")
        
        # The system message sets the stage and provides all instructions/examples.
        system_message = {
            "role": "system",
            "content": [
                {"type": "text", "text": mcq_prompt_all_questions_with_rag},
            ]
        }

        user_content_text = (
            f"<significant_clinical_conditions>\n{json.dumps(ground_truth_labels, indent=2)}\n</significant_clinical_conditions>\n\n"
            f"<guideline_context>\n{guideline_context}\n</guideline_context>"
        )

        # The user message provides the specific data for THIS request and the image.
        user_message = {
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": base64_image}},
                {"type": "text", "text": user_content_text}
            ]
        }

        messages = [system_message, user_message]
        logger.info("Messages being sent:-\n{}".format(json.dumps(messages, indent=2)))
        return messages

class LocalMedGemmaLLMClient(LLMClient):

    def __init__(self):
        self._api_key = "lm-studio"
        self._endpoint_url = "http://localhost:1234/v1"

    def _make_chat_completion_request(
        self,
        model: str,
        messages: list,
        temperature: float,
        max_tokens: int,
        top_p: float | None = None,
        seed: int | None = None,
        stop: list[str] | str | None = None,
        frequency_penalty: float | None = None,
        presence_penalty: float | None = None
    ) -> dict | None:

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        if top_p is not None: payload["top_p"] = top_p
        if seed is not None: payload["seed"] = seed
        if stop is not None: payload["stop"] = stop
        if frequency_penalty is not None: payload["frequency_penalty"] = frequency_penalty
        if presence_penalty is not None: payload["presence_penalty"] = presence_penalty

        temp_url = self._endpoint_url.rstrip('/')
        if temp_url.endswith("/v1/chat/completions"):
            full_url = temp_url
        elif temp_url.endswith("/v1"):
            full_url = temp_url + "/chat/completions"
        else:
            full_url = temp_url + "/v1/chat/completions"

        response = requests.post(full_url, headers=headers, json=payload, timeout=120)

        logger.info(f"LLM call status code: {response.status_code}, response: {response.reason}")
        
        if response.status_code != 200:
            logger.error(f"API call failed with status {response.status_code}: {response.text}")
            return None
            
        explanation_parts = []
        try:
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith('data: '):
                        json_data_str = decoded_line[len('data: '):].strip()
                        if json_data_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(json_data_str)
                            if chunk.get("choices") and chunk["choices"][0].get(
                                "delta") and chunk["choices"][0]["delta"].get(
                                "content"):
                                explanation_parts.append(
                                    chunk["choices"][0]["delta"]["content"])
                        except json.JSONDecodeError as e:
                            logger.warning(
                                f"Could not decode JSON from stream chunk: {json_data_str[:100]}... Error: {e}")
                            # Continue processing other chunks
                    elif decoded_line.strip() == "[DONE]":  # Some APIs might send [DONE] without "data: "
                        break
        except Exception as e:
            logger.error(f"Error processing streaming response: {e}")
            return None

        explanation = "".join(explanation_parts).strip()
        if not explanation:
            logger.warning("Empty explanation from API")
            return None
        
        logger.info(f"Received explanation of length: {len(explanation)}")
        logger.debug(f"First 500 chars of explanation: {explanation[:500]}")
        
        # Parse the JSON response from the model
        try:
            parsed_response = get_json_from_model_response(explanation)
            logger.info(f"Successfully parsed JSON with {len(parsed_response.get('questions', []))} questions")
        except Exception as e:
            logger.error(f"Failed to parse JSON from explanation: {e}")
            logger.error(f"Full explanation: {explanation}")
            return None
        
        # Return the response in the expected format
        return {
            "questions": parsed_response.get("questions", [])
        }
