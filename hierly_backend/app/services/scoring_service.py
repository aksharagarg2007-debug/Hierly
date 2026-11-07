from collections import defaultdict
from statistics import mean
from ..models import ResumeAnalysis, Resume, AptitudeAttempt, CodingSubmission, InterviewSession

pct = lambda a, b: round(100 * a / b) if b else 0


def collect(uid):
    """All scored events of a student: (date, module, percent, label)."""
    ev = [(r.created, "Resume", r.score, "Resume analysed") for r in
          ResumeAnalysis.query.join(Resume, ResumeAnalysis.resume_id == Resume.id).filter(Resume.user_id == uid)]
    ev += [(a.created, "Aptitude", pct(a.score, a.total), f"Aptitude: {a.cat} test") for a in AptitudeAttempt.query.filter_by(user_id=uid)]
    ev += [(s.created, "Coding", pct(s.passed, s.total), "Coding submission") for s in CodingSubmission.query.filter_by(user_id=uid)]
    ev += [(i.created, "Interview", i.score, f"Mock interview ({i.itype})") for i in InterviewSession.query.filter_by(user_id=uid)]
    return sorted(ev, key=lambda e: e[0])


def summary(uid):
    ev = collect(uid)
    scores = {m: round(mean([e[2] for e in ev if e[1] == m] or [0])) for m in ("Resume", "Aptitude", "Coding", "Interview")}
    weeks = defaultdict(list)
    for d, _m, p, _l in ev:
        weeks[d.strftime("%G-W%V")].append(p)
    keys = sorted(weeks)[-5:]
    done = [v for v in scores.values() if v]
    return {"SCORES": scores, "overall": round(mean(done)) if done else 0, "tests": len(ev),
            "ACTIVITY": [(l, d.strftime("%d %b, %H:%M")) for d, _m, _p, l in reversed(ev)][:5],
            "TREND": {"labels": keys, "data": [round(mean(weeks[k])) for k in keys]}}
