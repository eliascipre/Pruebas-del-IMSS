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

import re
from local_llm_client import local_medgemma_get_text_response


def evaluation_prompt(defacto_condition):
    # Returns a detailed prompt for the LLM to evaluate a pre-visit report for a specific condition
    return f"""
Tu rol es evaluar la utilidad de un reporte pre-visita, que se basa en una entrevista pre-visita con el paciente y registros de salud existentes.
El paciente fue diagnosticado de facto con la condición: "{defacto_condition}" que no se conocía en el momento de la entrevista.

Lista los elementos específicos en el texto del reporte pre-visita que son útiles o necesarios para que el MAP diagnostique la condición diagnosticada de facto: "{defacto_condition}". 

Esto incluye positivos o negativos pertinentes. 
Lista elementos críticos que FALTAN del texto del reporte pre-visita que habrían sido útiles para que el MAP diagnostique la condición diagnosticada de facto. 
Esto incluye positivos o negativos pertinentes que faltaron del reporte. 
(tener en cuenta que la condición "{defacto_condition}" no se conocía en ese momento)

La salida de evaluación debe estar en formato HTML.

PLANTILLA DE REPORTE INICIO

<h3 class="helpful">Hechos Útiles:</h3>

<h3 class="missing">Lo que no se cubrió pero sería útil:</h3>

PLANTILLA DE REPORTE FIN
"""

def evaluate_report(report, condition):
    """Evaluate the pre-visit report based on the condition using MedGemma LLM."""
    evaluation_text = local_medgemma_get_text_response([
        {
            "role": "system",
            "content": f"{evaluation_prompt(condition)}"
        },
        {
            "role": "user",
            "content": f"Aquí está el texto del reporte:\n{report}"
        },        
    ])

    # Remove any LLM "thinking" blocks (special tokens sometimes present in output)
    evaluation_text = re.sub(r'<unused94>.*?<unused95>', '', evaluation_text, flags=re.DOTALL)

    return evaluation_text
