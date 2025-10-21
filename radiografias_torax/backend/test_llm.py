#!/usr/bin/env python3

import json
import requests
from local_llm_client import LocalMedGemmaLLMClient
from case_util import get_available_reports
import config

def test_llm_client():
    """Test the LLM client with a simple request"""
    print("Testing LLM client...")
    
    # Initialize client
    client = LocalMedGemmaLLMClient()
    
    # Get test case data
    available_reports = get_available_reports(config.MANIFEST_CSV_PATH)
    case_1 = available_reports.get("1")
    
    if not case_1:
        print("No test case found!")
        return
    
    print(f"Testing with case: {case_1.condition_name}")
    print(f"Ground truth labels: {case_1.ground_truth_labels}")
    
    # Test with empty context first
    try:
        result = client.generate_all_questions(
            case_data={
                "download_image_url": case_1.download_image_url,
                "ground_truth_labels": case_1.ground_truth_labels
            },
            guideline_context="Test context for pleural effusion"
        )
        
        if result:
            print(f"Success! Generated {len(result)} questions")
            for i, q in enumerate(result):
                print(f"Question {i+1}: {q.question}")
        else:
            print("Failed to generate questions")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_llm_client()
