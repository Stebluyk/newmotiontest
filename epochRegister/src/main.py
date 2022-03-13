from fastapi import FastAPI
from src.routers import router
from src.db import create_db_and_tables

app = FastAPI(title="Epoch Register", version="1.0.0")
app.include_router(router)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
