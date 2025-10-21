#!/usr/bin/env python3
"""
Script rápido para verificar la configuración de LM Studio
"""

import requests
import json

def check_lm_studio():
    """Verifica que LM Studio esté corriendo y configurado correctamente"""
    print("🔍 Verificando configuración de LM Studio...")
    
    try:
        # Verificar que el servidor esté corriendo
        response = requests.get("http://localhost:1234/v1/models", timeout=5)
        
        if response.status_code == 200:
            print("✅ LM Studio está corriendo en localhost:1234")
            
            # Mostrar modelos disponibles
            data = response.json()
            models = data.get('data', [])
            
            if models:
                print(f"📋 Modelos disponibles ({len(models)}):")
                for model in models:
                    model_id = model.get('id', 'unknown')
                    print(f"   - {model_id}")
            else:
                print("⚠️ No hay modelos cargados")
                
            return True
        else:
            print(f"❌ LM Studio respondió con código {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ No se puede conectar a LM Studio")
        print("   Asegúrate de que esté corriendo en localhost:1234")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def check_medgemma():
    """Verifica si MedGemma está disponible"""
    print("\n🔍 Verificando MedGemma...")
    
    try:
        response = requests.get("http://localhost:1234/v1/models", timeout=5)
        data = response.json()
        models = data.get('data', [])
        
        medgemma_models = [m for m in models if 'medgemma' in m.get('id', '').lower()]
        
        if medgemma_models:
            print("✅ MedGemma está disponible:")
            for model in medgemma_models:
                print(f"   - {model.get('id')}")
            return True
        else:
            print("⚠️ MedGemma no está cargado")
            print("   Descarga MedGemma-4B desde Hugging Face y cárgalo en LM Studio")
            return False
            
    except Exception as e:
        print(f"❌ Error verificando MedGemma: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Verificador de configuración LM Studio\n")
    
    lm_ok = check_lm_studio()
    medgemma_ok = check_medgemma()
    
    print("\n📊 Resumen:")
    print(f"   LM Studio: {'✅ OK' if lm_ok else '❌ FALLO'}")
    print(f"   MedGemma: {'✅ OK' if medgemma_ok else '❌ FALLO'}")
    
    if lm_ok and medgemma_ok:
        print("\n🎉 ¡Configuración correcta! Puedes ejecutar el backend.")
    else:
        print("\n⚠️ Revisa la configuración antes de continuar.")
