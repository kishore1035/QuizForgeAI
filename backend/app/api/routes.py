from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.sources import router as sources_router
from app.api.quiz import router as quiz_router
from app.api.attempts import router as attempts_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(sources_router)
api_router.include_router(quiz_router, prefix="/quiz")
api_router.include_router(quiz_router, prefix="/quizzes")
api_router.include_router(attempts_router, prefix="/quiz")
api_router.include_router(attempts_router, prefix="/quizzes")

