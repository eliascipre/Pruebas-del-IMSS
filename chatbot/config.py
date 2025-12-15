import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # API Keys
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    LANGCHAIN_TRACING_V2 = os.getenv('LANGCHAIN_TRACING_V2', 'false')
    LANGCHAIN_API_KEY = os.getenv('LANGSMITH_API_KEY', os.getenv('LANGCHAIN_API_KEY', ''))
    LANGCHAIN_PROJECT = os.getenv('LANGSMITH_PROJECT', os.getenv('LANGCHAIN_PROJECT', 'chatbot-imss'))
    USE_LOCAL_OBSERVABILITY = os.getenv('USE_LOCAL_OBSERVABILITY', 'false')
    
    # LLM Settings
    DEFAULT_MODEL = 'google/medgemma-27b-it'
    MAX_TOKENS = 2000
    TEMPERATURE = 0.7
    
    # vLLM Endpoint (Ray Serve)
    VLLM_ENDPOINT = os.getenv('VLLM_ENDPOINT', 'http://localhost:8000/v1/')
    
    # Database
    DATABASE_URL = 'sqlite:///chatbot.db'
    
    # Server
    DEBUG = True
    PORT = 5001

