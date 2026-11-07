import re
from functools import wraps
from flask import session, redirect, url_for, request, jsonify, abort


def valid_email(e): return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[A-Za-z]{2,}", e or ""))
def uid(): return session.get("uid")


def login_required(f):
    @wraps(f)
    def w(*a, **k):
        if not uid():
            return (jsonify(error="Please log in first."), 401) if request.path.startswith("/api/") else redirect(url_for("login"))
        return f(*a, **k)
    return w


def admin_required(f):
    @wraps(f)
    @login_required
    def w(*a, **k):
        if not session.get("admin"):
            abort(403)
        return f(*a, **k)
    return w
