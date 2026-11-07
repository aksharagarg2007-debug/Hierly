from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()
FK = lambda t: db.Column(db.Integer, db.ForeignKey(t + ".id"), nullable=False)


class Stamp:
    created = db.Column(db.DateTime, default=datetime.utcnow)


class User(db.Model, Stamp):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    pw = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)

    def set_pw(self, p): self.pw = generate_password_hash(p)
    def check(self, p): return check_password_hash(self.pw, p)


class Resume(db.Model, Stamp):
    id = db.Column(db.Integer, primary_key=True)
    user_id = FK("user")
    filename = db.Column(db.String(200))


class ResumeAnalysis(db.Model, Stamp):
    id = db.Column(db.Integer, primary_key=True)
    resume_id = FK("resume")
    score = db.Column(db.Integer)
    result = db.Column(db.JSON)
    job_desc = db.Column(db.Text)


class AptitudeQuestion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cat = db.Column(db.String(50), nullable=False)
    q = db.Column(db.Text, nullable=False)
    options = db.Column(db.JSON, nullable=False)
    answer = db.Column(db.Integer, nullable=False)     # index of the correct option (0-based)
    expl = db.Column(db.Text, default="")


class AptitudeAttempt(db.Model, Stamp):
    id = db.Column(db.Integer, primary_key=True)
    user_id = FK("user")
    cat = db.Column(db.String(50))
    score = db.Column(db.Integer)
    total = db.Column(db.Integer)


class CodingProblem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    diff = db.Column(db.String(20), nullable=False)
    desc = db.Column(db.Text)
    ex = db.Column(db.Text)
    tests = db.Column(db.JSON)                         # [[stdin, expected_output], ...]


class CodingSubmission(db.Model, Stamp):
    id = db.Column(db.Integer, primary_key=True)
    user_id = FK("user")
    problem_id = FK("coding_problem")
    lang = db.Column(db.String(30))
    code = db.Column(db.Text)
    passed = db.Column(db.Integer)
    total = db.Column(db.Integer)


class InterviewSession(db.Model, Stamp):
    id = db.Column(db.Integer, primary_key=True)
    user_id = FK("user")
    itype = db.Column(db.String(30))
    role = db.Column(db.String(60))
    score = db.Column(db.Integer)
    feedback = db.Column(db.JSON)
    answers = db.relationship("InterviewAnswer", backref="session")


class InterviewAnswer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = FK("interview_session")
    question = db.Column(db.Text)
    answer = db.Column(db.Text)


class PerformanceReport(db.Model, Stamp):
    id = db.Column(db.Integer, primary_key=True)
    user_id = FK("user")
    overall = db.Column(db.Integer)
    data = db.Column(db.JSON)
