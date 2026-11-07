import requests
import time
from flask import current_app

LANG = {"Python": 71, "JavaScript": 63}      # Judge0 language ids


def run_tests(lang, code, tests):
    """Run code in the Judge0 sandbox (never inside Flask itself)."""
    c = current_app.config
    if not c["JUDGE0_URL"]:
        return [{"input": i.replace("\n", " / "), "expected": e, "pass": False,
                 "got": "Code runner not configured. Set JUDGE0_URL in .env"} for i, e in tests]
    head = {"X-Auth-Token": c["JUDGE0_KEY"]} if c["JUDGE0_KEY"] else {}
    out = []
    for i, (test_input, expected) in enumerate(tests):
        try:
            payload = {
                "language_id": LANG[lang],
                "source_code": code,
                "stdin": test_input
            }

            base_url = c["JUDGE0_URL"].rstrip("/")
            response = requests.post(
                f"{base_url}/submissions?base64_encoded=false",
                json=payload,
                headers=head,
                timeout=30
            )
            response.raise_for_status()

            token = response.json().get("token")
            if not token:
                raise ValueError("Judge0 token missing")

            got = {}
            for _ in range(30):
                time.sleep(1)
                res = requests.get(
                    f"{base_url}/submissions/{token}?base64_encoded=false",
                    headers=head,
                    timeout=30
                )
                res.raise_for_status()
                got = res.json()

                if got.get("status", {}).get("id") not in (1, 2):
                    break
            else:
                got = {"stderr": "Execution timed out"}

        except (requests.RequestException, ValueError) as e:
            got = {"stderr": str(e)}

        result_text = (
            got.get("stdout") or
            got.get("stderr") or
            got.get("compile_output") or
            got.get("message") or ""
        ).strip()

        expected = expected.strip()

        out.append({
            "input": test_input,
            "expected": expected,
            "pass": result_text == expected,
            "got": result_text
        })

    return out