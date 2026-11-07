import json
import requests
import time
from flask import current_app


class AIError(Exception):
    pass


def ask_json(prompt):
    """Send a prompt to Gemini and return its JSON response."""

    c = current_app.config
    api_key = c.get("GEMINI_API_KEY", "")
    model = c.get("GEMINI_MODEL", "")

    if not api_key:
        raise AIError("Gemini API key is missing. Check your .env file.")

    if not model:
        raise AIError("Gemini model is missing. Check GEMINI_MODEL in .env.")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )

    headers = {
        "x-goog-api-key": api_key,
        "Content-Type": "application/json"
    }

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    for attempt in range(4):
        try:
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=60
            )

            if response.status_code in (429, 500, 502, 503, 504):
                if attempt < 3:
                    time.sleep(2 ** (attempt + 1))
                    continue

            response.raise_for_status()

            data = response.json()
            answer = data["candidates"][0]["content"]["parts"][0]["text"]

            return json.loads(answer)

        except requests.HTTPError:
            status = response.status_code
            current_app.logger.error(
                "Gemini API error %s: %s",
                status,
                response.text
            )
            raise AIError(
                f"Gemini API error {status}. Please check the VS Code terminal."
            )

        except requests.RequestException:
            current_app.logger.exception("Gemini connection failed")
            raise AIError(
                "Could not connect to Gemini. Check your internet connection and terminal."
            )

        except (KeyError, IndexError, TypeError, ValueError):
            current_app.logger.exception("Gemini returned an invalid response")
            raise AIError(
                "Gemini returned an invalid response. Check the VS Code terminal."
            )


def analyze_resume(text, job_desc=""):
    prompt = (
        "You are an ATS and resume expert for freshers. "
        "Analyse the resume below. Reply ONLY with valid JSON using this format: "
        '{"score": 0, "strengths": [], "weaknesses": [], '
        '"missing": [], "tips": []}. '
        "Score must be an integer between 0 and 100. "
    )

    if job_desc:
        prompt += (
            "Compare the resume with this job description and identify missing keywords: "
            + job_desc + " "
        )

    prompt += "RESUME:\n" + text[:12000]

    return ask_json(prompt)


def evaluate_interview(itype, role, qa):
    body = "\n".join(
        f"Question: {question}\nAnswer: {answer}"
        for question, answer in qa
    )

    prompt = (
        f"You are a strict but kind {itype} interviewer for a {role} fresher role. "
        "Evaluate answers on accuracy, relevance, depth, structure and communication. "
        "Do not score answers based only on length. "
        "Reply ONLY with valid JSON using this format: "
        '{"score": 0, "technical": 0, "communication": 0, '
        '"strengths": [], "weaknesses": [], "tips": []}. '
        "All scores must be integers between 0 and 100.\n"
    )

    return ask_json(prompt + body)