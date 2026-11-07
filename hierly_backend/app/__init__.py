from flask import Flask, session, request
from config import Config
from .models import db


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    @app.after_request
    def after_request(response):
        origin = request.headers.get("Origin")
        allowed = {
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        }
        if origin in allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        if request.method == "OPTIONS":
            response.status_code = 204
        return response

    app.context_processor(lambda: {"user": session.get("name")})
    from .routes import auth, pages, api
    for m in (auth, pages, api):
        m.register(app)
    with app.app_context():
        db.create_all()
        from .seed import seed
        seed()
    return app
