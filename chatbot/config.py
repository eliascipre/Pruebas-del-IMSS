import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # API Keys
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    
    # LLM Settings
    DEFAULT_MODEL = 'gemini'
    MAX_TOKENS = 2000
    TEMPERATURE = 0.7
    
    # Database
    DATABASE_URL = 'sqlite:///chatbot.db'
    
    # Server
    DEBUG = True
    PORT = 5001

