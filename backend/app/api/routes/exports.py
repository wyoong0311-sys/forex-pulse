from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.exports import export_service


router = APIRouter()


def _csv_response(filename: str, content: str) -> Response:
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/exports/rates/{symbol}.csv")
async def export_rate_history(symbol: str, db: Session = Depends(get_db)) -> Response:
    normalized = symbol.replace("/", "").upper()
    return _csv_response(f"{normalized}-rates.csv", export_service.rate_history_csv(db, normalized))


@router.get("/exports/predictions/{symbol}.csv")
async def export_predictions_and_backtests(symbol: str, db: Session = Depends(get_db)) -> Response:
    normalized = symbol.replace("/", "").upper()
    return _csv_response(f"{normalized}-predictions-backtests.csv", export_service.prediction_csv(db, normalized))
