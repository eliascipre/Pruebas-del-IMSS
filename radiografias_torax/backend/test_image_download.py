#!/usr/bin/env python3

import requests
import base64
import json

def download_and_encode_image(url):
    """Download image and convert to base64"""
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        # Convert to base64
        image_base64 = base64.b64encode(response.content).decode('utf-8')
        
        # Get content type
        content_type = response.headers.get('content-type', 'image/png')
        
        return f"data:{content_type};base64,{image_base64}"
    except Exception as e:
        print(f"Error downloading image: {e}")
        return None

def test_vision_model():
    """Test vision model with base64 encoded image"""
    image_url = "https://huggingface.co/spaces/google/rad-learn-companion-samples/resolve/main/images/1.png"
    
    print("Downloading and encoding image...")
    base64_image = download_and_encode_image(image_url)
    
    if not base64_image:
        print("Failed to download image")
        return
    
    print("Image encoded successfully")
    
    # Test with Qwen2.5-VL model
    payload = {
        "model": "qwen2.5-vl-3b-instruct",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": base64_image
                        }
                    },
                    {
                        "type": "text",
                        "text": "¿Qué ves en esta radiografía de tórax? Describe los hallazgos principales."
                    }
                ]
            }
        ],
        "temperature": 0.1,
        "max_tokens": 300
    }
    
    try:
        response = requests.post(
            "http://localhost:1234/v1/chat/completions",
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=60
        )
        
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            print(f"Response: {content}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Error making request: {e}")

if __name__ == "__main__":
    test_vision_model()
