# UPI Gateway Backend (Django + FastAPI)

Django owns the models, migrations and admin. FastAPI (under `api/`) serves the REST API using the Django ORM.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
python manage.py makemigrations gateway
python manage.py migrate
python manage.py createsuperuser
```

## Run

```bash
# Django admin (http://localhost:8001/admin/)
python manage.py runserver 8001

# FastAPI (http://localhost:8000/docs)
uvicorn api.main:app --reload --port 8000
```

Set `DJANGO_SECRET_KEY` in the environment for production.
