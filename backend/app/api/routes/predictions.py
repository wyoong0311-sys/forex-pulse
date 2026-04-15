from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.predictions import PredictionHistoryResponse, PredictionResponse
from app.services.prediction_service import prediction_service


router = APIRouter()


def _response(prediction) -> PredictionResponse:
  expected_move_pct = 0.0
  if prediction.actual_close:
    expected_move_pct = ((prediction.predicted_close - prediction.actual_close) / prediction.actual_close) * 100

  return PredictionResponse(
    symbol=prediction.symbol,
    prediction_time=prediction.prediction_time,
    forecast_target_time=prediction.forecast_target_time,
    predicted_close=prediction.predicted_close,
    lower_bound=prediction.lower_bound,
    upper_bound=prediction.upper_bound,
    confidence_score=prediction.confidence_score,
    direction=prediction.direction,
    model_name=prediction.model_name,
    pair=prediction.symbol,
    confidence=prediction.confidence_score,
    projected_high=prediction.upper_bound,
    projected_low=prediction.lower_bound,
    predicted_next_close=prediction.predicted_close,
    expected_move_pct=round(expected_move_pct, 3),
    model_version=prediction.model_name,
  )


@router.get("/predictions/latest/{symbol}", response_model=PredictionResponse)
async def get_latest_prediction(symbol: str, db: Session = Depends(get_db)) -> PredictionResponse:
  prediction = prediction_service.latest(db, symbol)
  if prediction is None:
    try:
      prediction = prediction_service.generate_for_symbol(db, symbol)
    except ValueError as error:
      raise HTTPException(status_code=404, detail=str(error)) from error
  return _response(prediction)


@router.get("/predictions/{symbol}", response_model=PredictionResponse)
async def get_prediction(symbol: str, db: Session = Depends(get_db)) -> PredictionResponse:
  return await get_latest_prediction(symbol, db)


@router.get("/predictions/history/{symbol}", response_model=PredictionHistoryResponse)
async def get_prediction_history(symbol: str, db: Session = Depends(get_db)) -> PredictionHistoryResponse:
  normalized = symbol.replace("/", "").upper()
  predictions = prediction_service.history(db, normalized)
  if not predictions:
    try:
      predictions = [prediction_service.generate_for_symbol(db, normalized)]
    except ValueError as error:
      raise HTTPException(status_code=404, detail=str(error)) from error

  return PredictionHistoryResponse(
    symbol=normalized,
    predictions=[_response(prediction) for prediction in predictions],
  )
