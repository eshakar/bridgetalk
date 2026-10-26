"""BridgeTalk API entry point. Run with: uvicorn app.main:app --reload --port 8000"""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from app.config import get_settings
from app.database import MongoState
from app.errors import DatabaseUnavailableError, InvalidIdError, NotFoundError
from app.routes.meetings import router as meetings_router
from app.schemas import HealthResponse
from app.services.meeting_ai import ai_configured, ai_model

VERSION = "0.2.0"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bridgetalk")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Connect eagerly when the server runs lifespan events; startup succeeds even if MongoDB is down.
    await app.state.mongo.connect(force=True)
    yield
    await app.state.mongo.close()


app = FastAPI(title="BridgeTalk API", version=VERSION, lifespan=lifespan)
# One shared client per process. Created here rather than in lifespan so serverless
# runtimes that skip lifespan events still connect lazily on the first request.
app.state.mongo = MongoState(settings)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin.strip()],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)


def _error(status: int, error: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": error, "message": message})


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    # Return field locations and messages only, never the submitted input.
    details = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"error": "invalid_request", "details": details})


@app.exception_handler(InvalidIdError)
async def invalid_id_handler(_: Request, exc: InvalidIdError) -> JSONResponse:
    return _error(422, "invalid_id", f"'{exc.field}' is not a valid ID.")


@app.exception_handler(NotFoundError)
async def not_found_handler(_: Request, exc: NotFoundError) -> JSONResponse:
    return _error(404, "not_found", exc.message)


@app.exception_handler(DatabaseUnavailableError)
async def database_unavailable_handler(_: Request, __: DatabaseUnavailableError) -> JSONResponse:
    return _error(503, "database_unavailable", "The database is unavailable. Nothing was saved.")


@app.exception_handler(PyMongoError)
async def database_error_handler(_: Request, exc: PyMongoError) -> JSONResponse:
    logger.warning("Database operation failed (%s).", type(exc).__name__)
    return _error(503, "database_unavailable", "The database is unavailable. Nothing was saved.")


@app.exception_handler(Exception)
async def unexpected_error_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error: %s", type(exc).__name__)
    return _error(500, "internal_error", "Something went wrong.")


@app.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    connected = await request.app.state.mongo.ping()
    configured = ai_configured()
    return HealthResponse(
        status="ok" if connected else "degraded",
        version=VERSION,
        ai_configured=configured,
        ai_model=ai_model() if configured else None,
        database="connected" if connected else "unavailable",
    )


app.include_router(meetings_router)
