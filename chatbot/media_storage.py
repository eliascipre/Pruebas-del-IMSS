"""
Sistema de almacenamiento de archivos multimedia para Chatbot IMSS
Organiza archivos por tipo y proporciona funciones para guardar y procesar
"""

import os
import uuid
import base64
import mimetypes
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class MediaStorage:
    def __init__(self, base_path: str = "media"):
        self.base_path = Path(base_path)
        self.media_types = {
            'image': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/heic'],
            'video': ['video/mp4', 'video/mov', 'video/mkv', 'video/avi', 'video/3gp', 'video/mpeg-4'],
            'audio': ['audio/opus', 'audio/aac', 'audio/amr', 'audio/mp3', 'audio/m4a', 'audio/wac', 'audio/flac'],
            'document': ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/plain', 'text/rtf', 'text/csv', 'image/vnd.adobe.photoshop', 'image/tiff', 'image/x-canon-cr2', 'image/svg+xml'],
            'compressed': ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-sqlite3']
        }
        
        # Crear directorios base
        self._create_directories()
    
    def _create_directories(self):
        """Crear directorios para cada tipo de media"""
        for media_type in self.media_types.keys():
            dir_path = self.base_path / media_type
            dir_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"📁 Directorio creado: {dir_path}")
    
    def _detect_file_type_by_signature(self, binary_data: bytes) -> tuple[str, str]:
        """Detectar tipo de archivo por firmas binarias"""
        if len(binary_data) < 4:
            return 'application/octet-stream', '.bin'
        
        # Verificar firmas de archivo comunes
        signature = binary_data[:16]
        
        # PDF
        if binary_data.startswith(b'%PDF'):
            return 'application/pdf', '.pdf'
        
        # JPEG
        if binary_data.startswith(b'\xff\xd8\xff'):
            return 'image/jpeg', '.jpg'
        
        # PNG
        if binary_data.startswith(b'\x89PNG\r\n\x1a\n'):
            return 'image/png', '.png'
        
        # GIF
        if binary_data.startswith(b'GIF87a') or binary_data.startswith(b'GIF89a'):
            return 'image/gif', '.gif'
        
        # WebP
        if binary_data.startswith(b'RIFF') and b'WEBP' in binary_data[:12]:
            return 'image/webp', '.webp'
        
        # MP4
        if binary_data.startswith(b'\x00\x00\x00\x18ftypmp41') or binary_data.startswith(b'\x00\x00\x00\x20ftypmp42'):
            return 'video/mp4', '.mp4'
        
        # ZIP (Office documents)
        if binary_data.startswith(b'PK\x03\x04'):
            return 'application/zip', '.zip'
        
        # AVI
        if binary_data.startswith(b'RIFF') and b'AVI ' in binary_data[:12]:
            return 'video/avi', '.avi'
        
        # MP3
        if binary_data.startswith(b'ID3') or binary_data.startswith(b'\xff\xfb'):
            return 'audio/mpeg', '.mp3'
        
        # WAV
        if binary_data.startswith(b'RIFF') and b'WAVE' in binary_data[:12]:
            return 'audio/wav', '.wav'
        
        # Por defecto
        return 'application/octet-stream', '.bin'
    
    def _get_extension_from_mimetype(self, mimetype: str) -> str:
        """Obtener extensión basada en mimetype"""
        mime_to_ext = {
            'application/pdf': '.pdf',
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/bmp': '.bmp',
            'image/heic': '.heic',
            'video/mp4': '.mp4',
            'video/avi': '.avi',
            'video/mov': '.mov',
            'video/webm': '.webm',
            'audio/mpeg': '.mp3',
            'audio/wav': '.wav',
            'audio/ogg': '.ogg',
            'audio/m4a': '.m4a',
            'application/zip': '.zip',
            'text/plain': '.txt',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        }
        return mime_to_ext.get(mimetype, '.bin')
    
    def _get_media_type(self, mimetype: str) -> str:
        """Determinar el tipo de media basado en mimetype"""
        for media_type, mimes in self.media_types.items():
            if mimetype in mimes:
                return media_type
        return 'other'
    
    def _generate_filename(self, media_type: str, original_name: Optional[str] = None) -> str:
        """Generar nombre único para el archivo"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        
        if original_name:
            name, ext = os.path.splitext(original_name)
            return f"{timestamp}_{unique_id}_{name}{ext}"
        else:
            return f"{timestamp}_{unique_id}"
    
    def save_media(self, media_data: bytes, mimetype: str, original_name: Optional[str] = None, session_id: Optional[str] = None, detected_extension: Optional[str] = None) -> Dict[str, Any]:
        """
        Guardar archivo multimedia
        """
        try:
            media_type = self._get_media_type(mimetype)
            filename = self._generate_filename(media_type, original_name)
            
            # Usar la extensión detectada si está disponible
            if detected_extension:
                extension = detected_extension
            else:
                extension = mimetypes.guess_extension(mimetype) or '.bin'
            
            if not filename.endswith(extension):
                filename += extension
            
            file_path = self.base_path / media_type / filename
            
            with open(file_path, 'wb') as f:
                f.write(media_data)
            
            file_info = {
                'success': True,
                'file_path': str(file_path),
                'filename': filename,
                'media_type': media_type,
                'mimetype': mimetype,
                'size': len(media_data),
                'session_id': session_id,
                'created_at': datetime.now().isoformat()
            }
            
            logger.info(f"💾 Archivo guardado: {file_path} ({len(media_data)} bytes)")
            return file_info
            
        except Exception as e:
            logger.error(f"❌ Error guardando archivo: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def save_from_base64(self, base64_data: str, mimetype: str, original_name: Optional[str] = None, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Guardar archivo desde datos base64"""
        try:
            media_data = base64.b64decode(base64_data)
            detected_mimetype, detected_extension = self._detect_file_type_by_signature(media_data)
            
            logger.info(f"🔍 Tipo detectado: {detected_mimetype} (extensión: {detected_extension})")
            logger.info(f"🔍 Tipo original: {mimetype}")
            
            return self.save_media(media_data, detected_mimetype, original_name, session_id, detected_extension)
        except Exception as e:
            logger.error(f"❌ Error decodificando base64: {str(e)}")
            return {
                'success': False,
                'error': f"Error decodificando base64: {str(e)}"
            }
    
    def get_file_info(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Obtener información de un archivo guardado"""
        try:
            path = Path(file_path)
            if not path.exists():
                return None
            
            stat = path.stat()
            return {
                'file_path': str(path),
                'filename': path.name,
                'size': stat.st_size,
                'created_at': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                'modified_at': datetime.fromtimestamp(stat.st_mtime).isoformat()
            }
        except Exception as e:
            logger.error(f"❌ Error obteniendo info del archivo: {str(e)}")
            return None


# Instancia global del almacenamiento
media_storage = MediaStorage()

