from flask import render_template, request, redirect, url_for, session, jsonify
from ..models import db, User
from ..utils.validators import valid_email, login_required, uid


def check(form, need_name):
    errs, em = {}, form.get("email", "").strip().lower()
    if need_name and len(form.get("name", "").strip()) < 2: errs["name"] = "Please enter your full name."
    if not valid_email(em): errs["email"] = "Enter a valid email address."
    if len(form.get("password", "")) < 6: errs["password"] = "Password must be at least 6 characters."
    return errs, em


def start(u):
    session.clear(); session.update(uid=u.id, name=u.name, admin=u.is_admin)


def register(app):
    @app.route("/login", methods=["GET", "POST"])
    def login():
        errs, msg = {}, None
        if request.method == "POST":
            errs, em = check(request.form, False)
            if not errs:
                u = User.query.filter_by(email=em).first()
                if u and u.check(request.form["password"]):
                    start(u); return redirect(url_for("dashboard"))
                msg = "Wrong email or password."
        return render_template("auth.html", mode="login", errs=errs, msg=msg)

    @app.route("/register", methods=["GET", "POST"])
    def register():
        errs, msg = {}, None
        if request.method == "POST":
            errs, em = check(request.form, True)
            if not errs and User.query.filter_by(email=em).first():
                msg = "This email is already registered. Please log in."
            elif not errs:
                u = User(name=request.form["name"].strip(), email=em); u.set_pw(request.form["password"])
                db.session.add(u); db.session.commit(); start(u)
                return redirect(url_for("dashboard"))
        return render_template("auth.html", mode="register", errs=errs, msg=msg)

    @app.route("/logout")
    def logout():
        session.clear(); return redirect(url_for("landing"))

    @app.route("/api/auth/profile", methods=["GET", "PUT"])
    @login_required
    def profile():
        u = db.session.get(User, uid())
        if request.method == "PUT":
            j = request.get_json(silent=True) or {}
            if j.get("name"): u.name = j["name"].strip()[:100]; session["name"] = u.name
            if j.get("password"):
                if len(j["password"]) < 6: return jsonify(error="Password must be at least 6 characters."), 400
                u.set_pw(j["password"])
            db.session.commit()
        return jsonify(name=u.name, email=u.email, is_admin=u.is_admin)
