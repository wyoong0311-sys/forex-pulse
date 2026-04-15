from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from statistics import mean, pstdev


@dataclass(frozen=True)
class FeatureRow:
    timestamp: datetime
    close: float
    features: list[float]
    target: float | None


def _rsi(values: list[float], period: int = 14) -> float:
    if len(values) < period + 1:
        return 50.0

    gains: list[float] = []
    losses: list[float] = []
    sample = values[-(period + 1):]
    for previous, current in zip(sample, sample[1:]):
        delta = current - previous
        gains.append(max(delta, 0.0))
        losses.append(abs(min(delta, 0.0)))

    average_gain = mean(gains) if gains else 0.0
    average_loss = mean(losses) if losses else 0.0
    if average_loss == 0:
        return 100.0
    relative_strength = average_gain / average_loss
    return 100 - (100 / (1 + relative_strength))


def build_feature_rows(points: list[tuple[datetime, float]]) -> list[FeatureRow]:
    rows: list[FeatureRow] = []
    closes = [close for _timestamp, close in points]

    for index, (timestamp, close) in enumerate(points):
        prior = closes[: index + 1]
        last_3 = prior[-3:]
        last_5 = prior[-5:]
        last_10 = prior[-10:]
        last_14 = prior[-14:]
        previous_close = prior[-2] if len(prior) >= 2 else close
        rolling_mean_5 = mean(last_5)
        rolling_mean_10 = mean(last_10)
        volatility_5 = pstdev(last_5) if len(last_5) >= 2 else 0.0
        momentum_3 = close - last_3[0] if len(last_3) >= 3 else 0.0
        ma_crossover = rolling_mean_5 - rolling_mean_10
        target = closes[index + 1] if index + 1 < len(closes) else None

        rows.append(
            FeatureRow(
                timestamp=timestamp,
                close=close,
                target=target,
                features=[
                    close,
                    previous_close,
                    rolling_mean_5,
                    rolling_mean_10,
                    volatility_5,
                    momentum_3,
                    _rsi(last_14),
                    ma_crossover,
                    float(timestamp.weekday()),
                ],
            )
        )

    return rows
