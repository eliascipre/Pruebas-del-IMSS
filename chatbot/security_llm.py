"""
Módulo de Seguridad OWASP LLM Top 10
Implementa protecciones contra los principales riesgos de seguridad en LLM
"""

import re
import logging
from typing import Optional, Dict, Any, List, Tuple
from functools import wraps
from fastapi import HTTPException, Request
import html

logger = logging.getLogger(__name__)


class PromptInjectionDetector:
    """Detector de inyección de prompts (LLM01)"""
    
    # Patrones de inyección de prompts
    INJECTION_PATTERNS = [
        r'ignora\s+(todas\s+)?las\s+instrucciones',
        r'olvida\s+(todas\s+)?las\s+instrucciones',
        r'nuevas?\s+instrucciones',
        r'ahora\s+eres',
        r'actúa\s+como',
        r'pretende\s+ser',
        r'system\s*:',
        r'user\s*:',
        r'assistant\s*:',
        r'<\|.*?\|>',  # Delimitadores especiales
        r'\[INST\]',  # Delimitadores de instrucción
        r'\[/INST\]',
        r'```system',  # Bloques de código con system
        r'```prompt',
    ]
    
    # Patrones de intento de extracción de system prompt
    EXTRACTION_PATTERNS = [
        r'cuáles?\s+son\s+tus\s+instrucciones',
        r'qué\s+instrucciones\s+tienes',
        r'muéstrame\s+el\s+prompt',
        r'revela\s+el\s+system\s+prompt',
        r'cuál\s+es\s+tu\s+system\s+prompt',
        r'qué\s+dice\s+tu\s+system\s+prompt',
        r'quien\s+te\s+creo',
        r'quien\s+te\s+creó',
        r'cuando\s+fuiste\s+creado',
        r'cómo\s+te\s+llamas',
    ]
    
    def __init__(self):
        self.injection_regex = re.compile(
            '|'.join(self.INJECTION_PATTERNS),
            re.IGNORECASE | re.MULTILINE
        )
        self.extraction_regex = re.compile(
            '|'.join(self.EXTRACTION_PATTERNS),
            re.IGNORECASE | re.MULTILINE
        )
    
    def detect_injection(self, text: str) -> Tuple[bool, Optional[str]]:
        """
        Detectar intento de inyección de prompts
        
        Returns:
            (is_injection, reason)
        """
        if not text:
            return False, None
        
        text_lower = text.lower()
        
        # Detectar inyección
        if self.injection_regex.search(text):
            return True, "Intento de inyección de prompts detectado"
        
        # Detectar intento de extracción
        if self.extraction_regex.search(text):
            return True, "Intento de extracción de system prompt detectado"
        
        return False, None
    
    def sanitize_input(self, text: str) -> str:
        """
        Sanitizar entrada del usuario para prevenir inyección
        
        Returns:
            Texto sanitizado
        """
        if not text:
            return ""
        
        # Escapar caracteres especiales que podrían romper el formato
        # Pero mantener el texto legible
        sanitized = text
        
        # Eliminar delimitadores peligrosos
        sanitized = re.sub(r'<\|.*?\|>', '', sanitized)
        sanitized = re.sub(r'\[INST\].*?\[/INST\]', '', sanitized, flags=re.DOTALL)
        
        # Limitar longitud (prevenir ataques de desbordamiento)
        max_length = 10000  # 10k caracteres máximo
        if len(sanitized) > max_length:
            logger.warning(f"⚠️ Mensaje truncado por exceder límite: {len(sanitized)} caracteres")
            sanitized = sanitized[:max_length]
        
        return sanitized.strip()


class SystemPromptFilter:
    """Filtro para prevenir filtración de system prompt (LLM07)"""
    
    # Patrones que indican filtración de system prompt
    LEAK_PATTERNS = [
        r'fuiste\s+creado\s+por',
        r'te\s+llamas\s+quetzalia',
        r'cipre\s+holding',
        r'system\s+prompt\s+principal',
        r'eres\s+un\s+asistente\s+médico\s+especializado\s+creado\s+para\s+el\s+imss',
        r'no\s+es\s+necesario\s+que\s+digas',
        r'año\s+2025',
    ]
    
    # Respuesta genérica cuando se detecta intento de extracción
    GENERIC_RESPONSE = (
        "Soy un asistente médico especializado del IMSS. "
        "Mi función es proporcionar información médica general, interpretación de síntomas "
        "y guías de salud preventiva. Siempre recomiendo consultar con profesionales de la salud "
        "del IMSS para diagnósticos específicos y tratamientos médicos. "
        "¿En qué puedo ayudarte hoy?"
    )
    
    def __init__(self):
        self.leak_regex = re.compile(
            '|'.join(self.LEAK_PATTERNS),
            re.IGNORECASE | re.MULTILINE
        )
    
    def detect_leak(self, text: str) -> bool:
        """Detectar si la respuesta contiene información del system prompt"""
        if not text:
            return False
        
        return bool(self.leak_regex.search(text.lower()))
    
    def filter_response(self, response: str) -> str:
        """
        Filtrar respuesta para eliminar información del system prompt
        
        Returns:
            Respuesta filtrada o respuesta genérica si se detecta filtración
        """
        if not response:
            return response
        
        # Si se detecta filtración, reemplazar con respuesta genérica
        if self.detect_leak(response):
            logger.warning("⚠️ Filtración de system prompt detectada en respuesta, reemplazando con respuesta genérica")
            return self.GENERIC_RESPONSE
        
        return response


class OutputValidator:
    """Validador de salidas del LLM (LLM05)"""
    
    # Patrones de información sensible
    SENSITIVE_PATTERNS = [
        r'password\s*[:=]\s*\S+',
        r'api[_-]?key\s*[:=]\s*\S+',
        r'token\s*[:=]\s*\S+',
        r'secret\s*[:=]\s*\S+',
        r'credential\s*[:=]\s*\S+',
        r'jwt\s*[:=]\s*\S+',
        r'bearer\s+\S+',
        r'email\s*[:=]\s*[\w\.-]+@[\w\.-]+\.\w+',
    ]
    
    # Tags HTML peligrosos
    DANGEROUS_HTML_TAGS = [
        r'<script[^>]*>.*?</script>',
        r'<iframe[^>]*>.*?</iframe>',
        r'<object[^>]*>.*?</object>',
        r'<embed[^>]*>',
        r'javascript:',
        r'on\w+\s*=',
    ]
    
    MAX_RESPONSE_LENGTH = 50000  # 50k caracteres máximo
    
    def __init__(self):
        self.sensitive_regex = re.compile(
            '|'.join(self.SENSITIVE_PATTERNS),
            re.IGNORECASE | re.MULTILINE
        )
        self.dangerous_html_regex = re.compile(
            '|'.join(self.DANGEROUS_HTML_TAGS),
            re.IGNORECASE | re.MULTILINE | re.DOTALL
        )
    
    def validate_and_sanitize(self, response: str) -> str:
        """
        Validar y sanitizar respuesta del LLM
        
        Returns:
            Respuesta validada y sanitizada
        """
        if not response:
            return response
        
        # Validar longitud
        if len(response) > self.MAX_RESPONSE_LENGTH:
            logger.warning(f"⚠️ Respuesta truncada por exceder límite: {len(response)} caracteres")
            response = response[:self.MAX_RESPONSE_LENGTH]
        
        # Detectar información sensible
        if self.sensitive_regex.search(response):
            logger.warning("⚠️ Información sensible detectada en respuesta, redactando...")
            # Redactar información sensible
            response = self.sensitive_regex.sub('[INFORMACIÓN SENSIBLE REDACTADA]', response)
        
        # Detectar y eliminar HTML peligroso
        if self.dangerous_html_regex.search(response):
            logger.warning("⚠️ HTML peligroso detectado en respuesta, eliminando...")
            response = self.dangerous_html_regex.sub('', response)
        
        # Escapar HTML para prevenir XSS
        response = html.escape(response)
        
        # Pero restaurar caracteres básicos que queremos mantener
        response = response.replace('&lt;br&gt;', '<br>')
        response = response.replace('&lt;br/&gt;', '<br/>')
        response = response.replace('&lt;p&gt;', '<p>')
        response = response.replace('&lt;/p&gt;', '</p>')
        
        return response.strip()


class DataPoisoningDetector:
    """Detector de envenenamiento de datos (LLM04)"""
    
    # Patrones que indican datos envenenados
    POISONING_PATTERNS = [
        r'ignora\s+las\s+instrucciones',
        r'olvida\s+las\s+reglas',
        r'ahora\s+debes',
        r'cambia\s+tu\s+comportamiento',
    ]
    
    def __init__(self):
        self.poisoning_regex = re.compile(
            '|'.join(self.POISONING_PATTERNS),
            re.IGNORECASE | re.MULTILINE
        )
    
    def detect_poisoning(self, text: str) -> Tuple[bool, Optional[str]]:
        """
        Detectar intento de envenenamiento de datos
        
        Returns:
            (is_poisoned, reason)
        """
        if not text:
            return False, None
        
        if self.poisoning_regex.search(text.lower()):
            return True, "Intento de envenenamiento de datos detectado"
        
        return False, None


class LLMSecurityManager:
    """Gestor centralizado de seguridad para LLM"""
    
    def __init__(self):
        self.injection_detector = PromptInjectionDetector()
        self.prompt_filter = SystemPromptFilter()
        self.output_validator = OutputValidator()
        self.poisoning_detector = DataPoisoningDetector()
    
    def validate_input(self, user_message: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Validar entrada del usuario
        
        Returns:
            (is_valid, sanitized_message, error_message)
        """
        if not user_message or not user_message.strip():
            return False, None, "El mensaje no puede estar vacío"
        
        # Detectar inyección de prompts
        is_injection, reason = self.injection_detector.detect_injection(user_message)
        if is_injection:
            logger.warning(f"⚠️ Intento de inyección de prompts bloqueado: {reason}")
            return False, None, "Tu mensaje contiene contenido no permitido. Por favor, reformula tu pregunta."
        
        # Detectar envenenamiento de datos
        is_poisoned, reason = self.poisoning_detector.detect_poisoning(user_message)
        if is_poisoned:
            logger.warning(f"⚠️ Intento de envenenamiento de datos bloqueado: {reason}")
            return False, None, "Tu mensaje contiene contenido no permitido. Por favor, reformula tu pregunta."
        
        # Sanitizar entrada
        sanitized = self.injection_detector.sanitize_input(user_message)
        
        return True, sanitized, None
    
    def validate_output(self, llm_response: str) -> str:
        """
        Validar y sanitizar respuesta del LLM
        
        Returns:
            Respuesta validada y sanitizada
        """
        if not llm_response:
            return llm_response
        
        # Filtrar filtración de system prompt
        filtered = self.prompt_filter.filter_response(llm_response)
        
        # Validar y sanitizar salida
        validated = self.output_validator.validate_and_sanitize(filtered)
        
        return validated
    
    def should_block_extraction_request(self, user_message: str) -> bool:
        """
        Determinar si una solicitud intenta extraer el system prompt
        
        Returns:
            True si debe bloquearse
        """
        is_injection, _ = self.injection_detector.detect_injection(user_message)
        return is_injection


# Instancia global
_security_manager = None


def get_security_manager() -> LLMSecurityManager:
    """Obtener instancia global del gestor de seguridad"""
    global _security_manager
    if _security_manager is None:
        _security_manager = LLMSecurityManager()
    return _security_manager


# Decorador para aplicar seguridad en endpoints
def secure_llm_endpoint(func):
    """Decorador para aplicar validaciones de seguridad en endpoints de LLM"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        security_manager = get_security_manager()
        
        # Obtener mensaje del usuario desde kwargs o args
        user_message = None
        if 'req' in kwargs:
            user_message = getattr(kwargs['req'], 'message', None)
        elif 'message' in kwargs:
            user_message = kwargs['message']
        elif len(args) > 0 and hasattr(args[0], 'message'):
            user_message = args[0].message
        
        # Validar entrada
        if user_message:
            is_valid, sanitized, error = security_manager.validate_input(user_message)
            if not is_valid:
                raise HTTPException(status_code=400, detail=error)
            
            # Reemplazar mensaje original con sanitizado
            if 'req' in kwargs:
                kwargs['req'].message = sanitized
            elif 'message' in kwargs:
                kwargs['message'] = sanitized
        
        # Ejecutar función original
        result = await func(*args, **kwargs)
        
        # Validar salida si es una respuesta de chat
        if hasattr(result, 'response'):
            result.response = security_manager.validate_output(result.response)
        elif isinstance(result, dict) and 'response' in result:
            result['response'] = security_manager.validate_output(result['response'])
        elif isinstance(result, str):
            result = security_manager.validate_output(result)
        
        return result
    
    return wrapper

