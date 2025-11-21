import json
import os
import logging
import boto3
import base64
import io
import re
from typing import Dict, Any, List, Tuple
import google.generativeai as genai
from pypdf import PdfReader

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

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

def extract_text_from_pdf(pdf_base64: str) -> str:
    try:
        pdf_bytes = base64.b64decode(pdf_base64)
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        logger.error(f"Error extracting PDF text: {str(e)}")
        raise ValueError("Invalid PDF content")

def calculate_similarity(cv_text: str, job_description: str, api_key: str) -> Tuple[float, float, float, float, float]:
    """
    Calculate similarity using Gemini with a weighted scoring rubric.
    Returns: (weighted_average_score, hard_skills, experience, soft_skills, education)
    """
    genai.configure(api_key=api_key)
    model_name = os.environ.get('MODEL_NAME', 'gemini-2.5-flash')
    model = genai.GenerativeModel(model_name)

    prompt = f"""
    Role: 20년 경력의 엄격한 IT 채용 담당자.
    Task: JD와 CV를 비교하여 채점표(Rubric)에 따라 점수를 매기고 가중 평균을 구함.
    
    채점 기준 (Rubric):
    1. Hard Skills (40%): JD에 명시된 필수 기술 스택 및 도구 사용 능력 (보유 시 점수 부여, 미보유 시 감점).
    2. Experience & Depth (30%): 연차, 직무 적합성, 프로젝트 규모 및 깊이.
    3. Soft Skills & Culture (20%): 커뮤니케이션, 리더십, 문제 해결 능력, 문화적 적합성.
    4. Education & Bonus (10%): 학위, 자격증, 우대 사항(Nice-to-haves).

    Job Description:
    {job_description}

    User CV:
    {cv_text}

    출력 형식: 반드시 JSON 포맷만 출력. Markdown 코드 블록(```json) 사용 금지, 반드시 영어나 숫자로.
    
    JSON Output Format:
    {{
        "breakdown": {{
            "hard_skills": <score>,
            "experience": <score>,
            "soft_skills": <score>,
            "education": <score>
        }},
        "weighted_average_score": <score>
    }}
    """

    try:
        response = model.generate_content(prompt)
        response_text = response.text
        
        # Clean up markdown code blocks if present (just in case)
        response_text = re.sub(r'```json\n?', '', response_text)
        response_text = re.sub(r'```', '', response_text)
        
        data = json.loads(response_text)
        
        breakdown = data.get("breakdown", {})
        hard_skills = float(breakdown.get("hard_skills", 0))
        experience = float(breakdown.get("experience", 0))
        soft_skills = float(breakdown.get("soft_skills", 0))
        education = float(breakdown.get("education", 0))
        weighted_average_score = float(data.get("weighted_average_score", 0))
        
        return weighted_average_score, hard_skills, experience, soft_skills, education
        
    except Exception as e:
        logger.error(f"Error in calculate_similarity: {str(e)}")
        return 0.0, 0.0, 0.0, 0.0, 0.0

def invoke_scraper(job_url: str) -> Dict[str, Any]:
    """
    Invoke the Scraper Lambda to get job details.
    """
    lambda_client = boto3.client('lambda')
    
    # Assuming the scraper function name is 'fitcheck-scraper' as defined in Terraform
    # In a real scenario, this should be passed as an env var
    scraper_function_name = "fitcheck-scraper" 
    
    payload = {
        "type": "jobs_by_url",
        "input": [{"url": job_url}]
    }
    
    try:
        logger.info(f"Invoking scraper for URL: {job_url}")
        response = lambda_client.invoke(
            FunctionName=scraper_function_name,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )
        
        response_payload = json.loads(response['Payload'].read())
        
        if response.get('FunctionError'):
            logger.error(f"Scraper failed: {response_payload}")
            raise Exception(f"Scraper failed: {response_payload}")
            
        # The scraper returns a body string in the response if it went through API Gateway handler structure
        # But since we are invoking the handler directly, we need to check how scraper returns.
        # Scraper returns {'statusCode': ..., 'body': ...}
        
        if 'body' in response_payload:
            body = json.loads(response_payload['body'])
            if isinstance(body, list) and len(body) > 0:
                return body[0] # Return the first job
            elif isinstance(body, dict) and 'error' in body:
                 raise Exception(f"Scraper error: {body['error']}")
            return body
        else:
             # Fallback if scraper structure is different
             return response_payload

    except Exception as e:
        logger.error(f"Error invoking scraper: {str(e)}")
        raise e

def html_escape(text: str) -> str:
    """Escape HTML special characters."""
    return (text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&#x27;"))

def generate_html_report(similarity_score: float, strengths: List[str], weaknesses: List[str], consulting_advice: str, 
                         hard_skills: float, experience: float, soft_skills: float, education: float) -> str:
    """Generate HTML report based on analysis results."""
    
    # Parse consulting advice if it's structured
    advice_items = []
    if consulting_advice:
        # Try to split by numbered list or paragraphs
        lines = consulting_advice.split('\n')
        current_item = {"title": "", "content": ""}
        for line in lines:
            line = line.strip()
            if line:
                # Check if it's a numbered item or has ** for title
                if line[0].isdigit() or '**' in line or line.endswith(':'):
                    if current_item["content"]:
                        advice_items.append(current_item)
                    # Extract title
                    title = re.sub(r'^\d+\.\s*|\*\*|:', '', line).strip()
                    current_item = {"title": title, "content": ""}
                else:
                    current_item["content"] += " " + line
        if current_item["content"]:
            advice_items.append(current_item)
    
    if not advice_items:
        advice_items = [{"title": "Recommendations", "content": consulting_advice}]
    
    # Build advice HTML
    advice_html = ""
    for item in advice_items:
        title = html_escape(item["title"])
        content = html_escape(item["content"].strip())
        advice_html += f"""
                        <li>
                            <strong>{title}</strong>
                            {content}
                        </li>"""
    
    # Build strengths HTML
    strengths_html = ""
    for strength in strengths:
        strengths_html += f'<li class="card-item">{html_escape(strength)}</li>\n'
    
    # Build weaknesses HTML
    weaknesses_html = ""
    for weakness in weaknesses:
        weaknesses_html += f'<li class="card-item">{html_escape(weakness)}</li>\n'
    
    # Calculate stroke dasharray for circular progress (out of 100)
    stroke_value = similarity_score
    
    # Read template from file
    template_path = os.path.join(os.path.dirname(__file__), 'template.html')
    with open(template_path, 'r', encoding='utf-8') as f:
        html_template = f.read()
    
    # Substitute variables
    # Substitute variables using replace to avoid issues with CSS curly braces
    html_report = html_template.replace('{similarity_score:.1f}', f"{similarity_score:.1f}")
    html_report = html_report.replace('{stroke_value}', str(stroke_value))
    html_report = html_report.replace('{strengths_html}', strengths_html)
    html_report = html_report.replace('{weaknesses_html}', weaknesses_html)
    html_report = html_report.replace('{advice_html}', advice_html)
    
    # Substitute breakdown scores
    html_report = html_report.replace('{hard_skills}', str(hard_skills))
    html_report = html_report.replace('{experience}', str(experience))
    html_report = html_report.replace('{soft_skills}', str(soft_skills))
    html_report = html_report.replace('{education}', str(education))
    
    return html_report

def analyze_with_gemini(api_key: str, cv_text: str, job_description: str, similarity_score: float,
                        hard_skills: float, experience: float, soft_skills: float, education: float) -> str:
    """
    Use Gemini to analyze the CV against the Job Description and return HTML report.
    """
    genai.configure(api_key=api_key)
    model_name = os.environ.get('MODEL_NAME', 'gemini-2.5-flash')
    model = genai.GenerativeModel(model_name)

    prompt = f"""
    You are an expert career consultant.
    
    Job Description:
    {job_description}
    
    User CV:
    {cv_text}
    
    The calculated similarity score between the CV and Job Description is {similarity_score:.2f}/100.

    Task:
    1. Create a hypothetical "Ideal CV" text based on the Job Description that would have a high chance of acceptance.
    2. Compare the User CV with this Ideal CV.
    3. Provide a consulting report in JSON format with the following structure:
    {{
        "similarity_score": {similarity_score},
        "strengths": ["strength 1", "strength 2", "strength 3", ...],
        "weaknesses": ["weakness 1", "weakness 2", "weakness 3", ...],
        "consulting_advice": "Detailed advice on how to improve the CV to match the job description better."
    }}
    
    Return ONLY the JSON.
    """

    try:
        response = model.generate_content(prompt)
        response_text = response.text
        
        # Clean up markdown code blocks if present
        response_text = re.sub(r'```json\n?', '', response_text)
        response_text = re.sub(r'```', '', response_text)
        
        analysis_result = json.loads(response_text)
        
        # Generate HTML report
        html_report = generate_html_report(
            similarity_score=similarity_score,
            strengths=analysis_result.get('strengths', []),
            weaknesses=analysis_result.get('weaknesses', []),
            consulting_advice=analysis_result.get('consulting_advice', ''),
            hard_skills=hard_skills,
            experience=experience,
            soft_skills=soft_skills,
            education=education
        )
        
        return html_report
    except Exception as e:
        logger.error(f"Gemini analysis failed: {str(e)}")
        raise e

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for Analyzer.
    Expected Input (via Function URL or API Gateway POST):
    {
        "headers": {"x-fitcheck-auth": "secret"},
        "body": "{\"cv_pdf\": \"base64...\", \"job_url\": \"...\"}"
    }
    """
    logger.info("Received analysis request")
    
    try:
        # Security check: Validate x-fitcheck-auth header
        app_secret = os.environ.get('APP_CLIENT_SECRET')
        if app_secret:
            # Get headers (case-insensitive)
            headers = event.get('headers', {})
            # Normalize headers to lowercase keys for case-insensitive lookup
            normalized_headers = {k.lower(): v for k, v in headers.items()}
            auth_header = normalized_headers.get('x-fitcheck-auth', '')
            
            if auth_header != app_secret:
                logger.warning("Unauthorized access attempt")
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Unauthorized'})
                }
        
        # Parse Input
        body = event.get('body')
        if not body:
             # Handle direct invocation
             if 'cv_pdf' in event:
                 body_json = event
             else:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Missing body'})
                }
        else:
            body_json = json.loads(body)

        cv_pdf_base64 = body_json.get('cv_pdf')
        job_url = body_json.get('job_url')

        if not cv_pdf_base64 or not job_url:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Missing cv_pdf or job_url'})
            }

        # 1. Get Secrets
        gemini_secret_name = os.environ.get('GEMINI_SECRET_NAME')
        if not gemini_secret_name:
            raise Exception("GEMINI_SECRET_NAME not set")
        gemini_key = get_secret(gemini_secret_name)

        # 2. Extract Text from CV
        cv_text = extract_text_from_pdf(cv_pdf_base64)
        logger.info(f"Extracted {len(cv_text)} chars from CV")

        # 3. Get Job Description from Scraper
        job_data = invoke_scraper(job_url)
        job_description = job_data.get('description') or job_data.get('job_description') or json.dumps(job_data)
        logger.info(f"Retrieved job description ({len(job_description)} chars)")

        # 4. Calculate Similarity
        similarity_score, hard_skills, experience, soft_skills, education = calculate_similarity(cv_text, job_description, gemini_key)
        logger.info(f"Calculated similarity: {similarity_score}")
        logger.info(f"Breakdown: Hard Skills={hard_skills}, Experience={experience}, Soft Skills={soft_skills}, Education={education}")

        # 5. Analyze with Gemini and get HTML report
        html_report = analyze_with_gemini(gemini_key, cv_text, job_description, similarity_score, hard_skills, experience, soft_skills, education)

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'text/html; charset=utf-8'},
            'body': html_report
        }

    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }
