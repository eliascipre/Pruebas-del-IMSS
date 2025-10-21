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
import logging
import sys
from flask import Flask

# Import configurations and initializers first
import config # Use relative import assuming app.py is in the rad_explain package
import local_llm_client as llm_client
from routes import main_bp
from cache_store import cache

def create_app():
    """Creates and configures the Flask application."""
    app = Flask(__name__, static_folder=config.STATIC_DIR)

    # --- Configure Logging ---
    # Basic config should be done before creating the app or registering blueprints
    # if those modules rely on logging during import time.
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - [%(name)s] - %(message)s')
    logger = logging.getLogger(__name__)

    # --- Check Configuration and Initialize Services ---
    logger.info("Using local MedGemma LLM client.")

    # Initialize LLM Client
    llm_client.init_llm_client()
    if not llm_client.is_initialized():
         logger.warning("LLM client failed to initialize. API calls will fail.")
         sys.exit("Exiting: LLM client initialization failed.")

    # Register Blueprints
    app.register_blueprint(main_bp)

    return app

# Create the application instance using the factory function
# This makes the 'app' instance available at the module level for WSGI servers
app = create_app()

if __name__ == '__main__':
    # This block now primarily focuses on running the app and pre-run checks/setup
    logger = logging.getLogger(__name__)

    # Run the Flask development server
    app.run(host='0.0.0.0', port=7863, debug=True)
