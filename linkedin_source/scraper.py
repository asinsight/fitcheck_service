import json
import os
import time
import logging
import boto3
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

class BrightDataCollector:
    API_BASE_URL = "https://api.brightdata.com/datasets/v3"

    def __init__(self, api_token: str):
        self.api_token = api_token
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        }

    def collect(self, dataset_id: str, input_data: List[Dict[str, Any]], params: Dict[str, str] = None) -> Optional[List[Dict[str, Any]]]:
        """
        Generic collection method for BrightData datasets.
        """
        try:
            # Trigger collection
            trigger_params = {"dataset_id": dataset_id}
            if params:
                trigger_params.update(params)
            
            logger.info(f"Triggering collection for dataset {dataset_id} with params {trigger_params}")
            trigger_response = requests.post(
                f"{self.API_BASE_URL}/trigger",
                headers=self.headers,
                params=trigger_params,
                json=input_data,
                timeout=30
            )
            trigger_response.raise_for_status()
            trigger_data = trigger_response.json()
            
            if "snapshot_id" not in trigger_data:
                logger.error(f"Failed to initiate data collection: {trigger_data}")
                return None
                
            snapshot_id = trigger_data["snapshot_id"]
            logger.info(f"Collection initiated. Snapshot ID: {snapshot_id}")

            # Poll for completion
            start_time = time.time()
            while True:
                if time.time() - start_time > 300: # 5 minute timeout safety
                    logger.error("Collection timed out")
                    return None

                status_response = requests.get(
                    f"{self.API_BASE_URL}/progress/{snapshot_id}",
                    headers=self.headers,
                    timeout=30
                )
                status_response.raise_for_status()
                status = status_response.json().get("status")
                
                logger.info(f"Snapshot {snapshot_id} status: {status}")
                
                if status == "ready":
                    break
                elif status in ["failed", "error"]:
                    logger.error(f"Collection failed with status: {status}")
                    return None
                
                time.sleep(5)

            # Fetch data
            logger.info(f"Fetching data for snapshot {snapshot_id}")
            data_response = requests.get(
                f"{self.API_BASE_URL}/snapshot/{snapshot_id}",
                headers=self.headers,
                params={"format": "json"},
                timeout=30
            )
            data_response.raise_for_status()
            return data_response.json()

        except Exception as e:
            logger.error(f"Error during collection: {str(e)}")
            raise e

def get_secret(secret_name: str) -> str:
    """
    Retrieve secret from AWS Secrets Manager.
    """
    session = boto3.session.Session()
    client = session.client(service_name='secretsmanager')

    try:
        get_secret_value_response = client.get_secret_value(SecretId=secret_name)
    except Exception as e:
        logger.error(f"Failed to retrieve secret {secret_name}: {str(e)}")
        raise e

    if 'SecretString' in get_secret_value_response:
        secret = get_secret_value_response['SecretString']
        return json.loads(secret)['api_key']
    else:
        raise Exception("Secret binary not supported")

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for Scraper.
    Expected Input (via API Gateway):
    {
        "headers": {"x-api-key": "api-key-value"},
        "queryStringParameters": {
            "type": "jobs_by_url" | "profile_by_url" | "company_by_url" | ...
        },
        "body": JSON string of input list, e.g. '[{"url": "..."}]'
    }
    """
    logger.info(f"Received event: {json.dumps(event)}")

    try:
        # Note: API Gateway API Key is handled by AWS, so no need for manual validation here
        # The x-api-key header is automatically validated by API Gateway before reaching this code
        
        # Parse Input
        query_params = event.get('queryStringParameters', {})
        if not query_params:
             # Handle direct invocation where payload is just the event
            if 'type' in event:
                action_type = event['type']
                input_data = event.get('input', [])
            else:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Missing type parameter'})
                }
        else:
            action_type = query_params.get('type')
            if not event.get('body'):
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Missing request body'})
                }
            input_data = json.loads(event['body'])

        # Configuration Map
        # Maps action_type to (dataset_id, additional_params)
        CONFIG = {
            "jobs_by_url": ("gd_lpfll7v5hcqtkxl6l", {}),
            "profile_by_url": ("gd_l1viktl72bvl7bjuj0", {}),
            "company_by_url": ("gd_l1vikfnt1wgvvqz95w", {}),
            "posts_discover_by_url": ("gd_lyy3tktm25m4avu764", {"type": "discover_new", "discover_by": "url"}),
            "profile_by_name": ("gd_l1viktl72bvl7bjuj0", {"type": "discover_new", "discover_by": "name"}),
            # Add other mappings as needed based on the files in api_codes
        }

        if action_type not in CONFIG:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': f'Invalid type: {action_type}'})
            }

        dataset_id, params = CONFIG[action_type]

        # Get Secret
        secret_name = os.environ.get('BRIGHTDATA_SECRET_NAME')
        if not secret_name:
            raise Exception("BRIGHTDATA_SECRET_NAME environment variable not set")
        
        api_key = get_secret(secret_name)

        # Execute Collection
        collector = BrightDataCollector(api_key)
        result = collector.collect(dataset_id, input_data, params)

        if result is None:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Collection failed'})
            }

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(result, ensure_ascii=False)
        }

    except Exception as e:
        logger.error(f"Unhandled exception: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }
