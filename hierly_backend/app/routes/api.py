from flask import request, jsonify
from werkzeug.utils import secure_filename
from ..models import db, Resume, ResumeAnalysis, AptitudeQuestion, AptitudeAttempt, CodingProblem, CodingSubmission, InterviewSession, InterviewAnswer
from ..seed import INTERVIEW
from ..services.ai_service import AIError, analyze_resume, evaluate_interview
from ..services.resume_service import extract_text
from ..services.code_service import run_tests, LANG
from ..services.scoring_service import collect, summary
from ..utils.validators import login_required, uid

clamp = lambda v: max(0, min(100, int(v or 0)))


def register(app):
    @app.post("/api/resume")
    @login_required
    def api_resume():
        f = request.files.get("resume")
        if not f or not f.filename.lower().endswith(".pdf"):
            return jsonify(error="Please upload a PDF file."), 400
        raw = f.read()
        if raw[:4] != b"%PDF":
            return jsonify(error="This is not a valid PDF file."), 400
        try:
            text = extract_text(raw)
        except ValueError as e:
            return jsonify(error=str(e)), 422
        jd = request.form.get("jd", "").strip()[:3000]
        try:
            r = analyze_resume(text, jd)
        except AIError as e:
            return jsonify(error=str(e)), 503
        for k in ("strengths", "weaknesses", "missing", "tips"):
            r[k] = r.get(k) or []
        r["score"] = clamp(r.get("score"))
        res = Resume(user_id=uid(), filename=secure_filename(f.filename)); db.session.add(res); db.session.flush()
        db.session.add(ResumeAnalysis(resume_id=res.id, score=r["score"], result=r, job_desc=jd)); db.session.commit()
        return jsonify({**r, "filename": res.filename})

    @app.post("/api/aptitude")
    @login_required
    def api_aptitude():
        j = request.get_json(silent=True) or {}
        qs = AptitudeQuestion.query.filter_by(cat=j.get("cat")).order_by(AptitudeQuestion.id).all()
        ans = j.get("answers")
        if not qs or not isinstance(ans, list) or len(ans) != len(qs):
            return jsonify(error="Invalid test submission."), 400
        res = [{"ok": ans[i] == q.answer, "correct": q.options[q.answer], "e": q.expl} for i, q in enumerate(qs)]
        score = sum(r["ok"] for r in res)
        db.session.add(AptitudeAttempt(user_id=uid(), cat=qs[0].cat, score=score, total=len(qs))); db.session.commit()
        return jsonify(score=score, total=len(qs), results=res)

    @app.post("/api/code")
    @login_required
    def api_code():
        j = request.get_json(silent=True) or {}
        p = db.session.get(CodingProblem, j.get("id") or 0)
        code, lang = str(j.get("code", ""))[:20000], j.get("lang", "Python")
        if not p or lang not in LANG or not code.strip():
            return jsonify(error="Invalid code submission."), 400
        res = run_tests(lang, code, p.tests)
        if res and res[0]["got"].startswith("Code runner not configured"):
            return jsonify(res)                          # nothing was run, so nothing is saved
        db.session.add(CodingSubmission(user_id=uid(), problem_id=p.id, lang=lang, code=code,
                                        passed=sum(r["pass"] for r in res), total=len(res))); db.session.commit()
        return jsonify(res)

    @app.post("/api/interview")
    @login_required
    def api_interview():
        j = request.get_json(silent=True) or {}
        qs, ans = j.get("questions"), j.get("answers")
        if not (isinstance(qs, list) and isinstance(ans, list)) or not 0 < len(qs) <= 10:
            return jsonify(error="Invalid interview data."), 400
        qa = [(str(q)[:500], str(a)[:3000]) for q, a in zip(qs, ans) if a]
        if not qa:
            return jsonify(score=0, answered=0, strengths=[], tips=[])
        itype, role = str(j.get("type", "HR"))[:30], str(j.get("role", "Software Developer"))[:60]
        try:
            r = evaluate_interview(itype, role, qa)
        except AIError as e:
            return jsonify(error=str(e)), 503
        s = InterviewSession(user_id=uid(), itype=itype, role=role, score=clamp(r.get("score")), feedback=r)
        s.answers = [InterviewAnswer(question=q, answer=a) for q, a in qa]
        db.session.add(s); db.session.commit()
        return jsonify(score=s.score, answered=len(qa), strengths=r.get("strengths") or [], weaknesses=r.get("weaknesses") or [], tips=r.get("tips") or [])

    @app.get("/api/aptitude/questions")
    @login_required
    def api_aptitude_questions():
        questions = {}
        for q in AptitudeQuestion.query.order_by(AptitudeQuestion.id).all():
            questions.setdefault(q.cat, []).append({"id": q.id, "q": q.q, "o": q.options, "expl": q.expl})
        return jsonify({"categories": list(questions.keys()), "questions": questions})

    @app.get("/api/coding/problems")
    @login_required
    def api_coding_problems():
        return jsonify([{"id": p.id, "title": p.title, "diff": p.diff, "desc": p.desc, "ex": p.ex, "tests": p.tests} for p in CodingProblem.query.order_by(CodingProblem.id).all()])

    @app.get("/api/interview/questions")
    @login_required
    def api_interview_questions():
        return jsonify({"categories": list(INTERVIEW.keys()), "questions": INTERVIEW})

    @app.get("/api/history/<kind>")
    @login_required
    def api_history(kind):
        return jsonify([{"label": l, "score": p, "date": d.isoformat()} for d, m, p, l in collect(uid()) if m.lower() == kind])

    @app.get("/api/dashboard")
    @login_required
    def api_dashboard(): return jsonify(summary(uid()))
