from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel

import app.models.admin  # noqa: F401
import app.models.reading  # noqa: F401
import app.models.story  # noqa: F401

# Import models so SQLModel picks them up for table creation
import app.models.user  # noqa: F401
from app.core.config import settings
from app.core.database import engine
from app.routers import admin, auth, public, reading, stories, taxonomy, users


def create_tables():
    SQLModel.metadata.create_all(engine)


app = FastAPI(
    title="Narrive API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_tables()


app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(stories.router, prefix=settings.API_V1_STR)
app.include_router(public.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(taxonomy.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(reading.router, prefix=settings.API_V1_STR)


@app.get("/health")
def health():
    return {"status": "ok"}
