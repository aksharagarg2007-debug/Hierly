from statistics import mean
from flask import render_template, request, redirect, url_for, Response
from ..models import db, User, AptitudeQuestion, AptitudeAttempt, CodingProblem, CodingSubmission, InterviewSession, ResumeAnalysis, PerformanceReport
from ..seed import FEATURES, INTERVIEW, ROLES
from ..services.scoring_service import summary
from ..utils.validators import login_required, admin_required, uid


def register(app):
    @app.route("/")
    def landing(): return render_template("landing.html", features=FEATURES)

    @app.route("/dashboard")
    @login_required
    def dashboard(): return render_template("dashboard.html", d=summary(uid()))

    @app.route("/resume")
    @login_required
    def resume(): return render_template("resume.html")

    @app.route("/aptitude")
    @login_required
    def aptitude():
        cats = [c for (c,) in db.session.query(AptitudeQuestion.cat).distinct()]
        cat = request.args.get("c", cats[0] if cats else "")
        cat = cat if cat in cats else (cats[0] if cats else "")
        qs = [{"q": x.q, "o": x.options} for x in AptitudeQuestion.query.filter_by(cat=cat).order_by(AptitudeQuestion.id)]
        return render_template("aptitude.html", cats=cats, cat=cat, qs=qs)

    @app.route("/coding")
    @login_required
    def coding():
        probs = CodingProblem.query.order_by(CodingProblem.id).all()
        p = db.session.get(CodingProblem, request.args.get("p", 0, type=int)) or probs[0]
        return render_template("coding.html", probs=probs, p=p)

    @app.route("/interview")
    @login_required
    def interview(): return render_template("interview.html", qs=INTERVIEW, roles=ROLES)

    @app.route("/reports")
    @login_required
    def reports():
        s = summary(uid())
        last = PerformanceReport.query.filter_by(user_id=uid()).order_by(PerformanceReport.id.desc()).first()
        if s["tests"] and (not last or last.overall != s["overall"]):     # save a snapshot when the score changes
            db.session.add(PerformanceReport(user_id=uid(), overall=s["overall"], data=s["SCORES"])); db.session.commit()
        past = PerformanceReport.query.filter_by(user_id=uid()).order_by(PerformanceReport.id.desc()).limit(5).all()[::-1]
        rep = {"overall": s["overall"], "attempts": {"labels": [p.created.strftime("%d %b") for p in past], "data": [p.overall for p in past]},
               "strong": [m for m, v in s["SCORES"].items() if v >= 70] or ["Complete more modules to see strengths"],
               "improve": [m for m, v in s["SCORES"].items() if v < 60] or ["Nothing urgent. Keep practising!"]}
        return render_template("reports.html", d={"SCORES": s["SCORES"], "REPORT": rep})

    @app.route("/reports/download")
    @login_required
    def report_download():
        s = summary(uid())
        txt = "HIERLY PERFORMANCE REPORT\n\nOverall: %d/100\n" % s["overall"] + "".join(f"{m}: {v}/100\n" for m, v in s["SCORES"].items())
        return Response(txt, mimetype="text/plain", headers={"Content-Disposition": "attachment; filename=hierly_report.txt"})

    @app.route("/admin", methods=["GET", "POST"])
    @admin_required
    def admin():
        f = request.form
        if request.method == "POST":
            opts = [o.strip() for o in f.get("options", "").splitlines() if o.strip()]
            ans = f.get("answer", type=int, default=0) - 1
            if f.get("q", "").strip() and len(opts) >= 2 and 0 <= ans < len(opts):
                db.session.add(AptitudeQuestion(cat=f["cat"], q=f["q"].strip(), options=opts, answer=ans, expl=f.get("expl", "")))
                db.session.commit()
            return redirect(url_for("admin"))
        studs = User.query.filter_by(is_admin=False).all()
        st = {"students": len(studs), "resumes analysed": ResumeAnalysis.query.count(), "aptitude tests": AptitudeAttempt.query.count(),
              "coding submissions": CodingSubmission.query.count(), "interviews": InterviewSession.query.count(),
              "avg performance": round(mean([summary(u.id)["overall"] for u in studs] or [0]))}
        cats = ["Quantitative", "Logical", "Verbal"]
        return render_template("admin.html", st=st, cats=cats, qb=AptitudeQuestion.query.order_by(AptitudeQuestion.id).all())

    @app.post("/admin/delete/<int:i>")
    @admin_required
    def admin_delete(i):
        q = db.session.get(AptitudeQuestion, i)
        if q: db.session.delete(q); db.session.commit()
        return redirect(url_for("admin"))
