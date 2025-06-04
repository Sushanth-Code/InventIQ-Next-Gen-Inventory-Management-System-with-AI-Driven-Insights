import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'h7G@p$!wR*zK#uJyX^mN&sVbF+cEqA2d'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'mysql://root:Sql%402025@localhost/inventiq_next_gen'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # AI/LLM Configuration
    # Ollama Configuration
    USE_OLLAMA = os.environ.get('USE_OLLAMA', 'True').lower() in ('true', '1', 't')
    OLLAMA_BASE_URL = os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434')
    OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'llama3')

