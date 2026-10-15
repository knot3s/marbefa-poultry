"""
Machine Learning Yield Forecasting using Random Forest Regressor.

Features:
  - flock_age_days (age of the flock in days)
  - feed_7d_avg (7-day rolling average of feed_consumed_kg)
  - mortality_7d_avg (7-day rolling average of mortality_count)
  - eggs_lag_1 (previous day's total eggs)
  - eggs_lag_2 (two days ago total eggs)

Target:
  - total_eggs (daily total egg production)

Output: 7-day forecast of total egg production.
"""
import numpy as np
import pandas as pd
from datetime import timedelta

from sklearn.ensemble import RandomForestRegressor

from ..models import DailyLog, FlockBatch


def _build_dataframe(batch):
    """Build a pandas DataFrame of daily logs for a batch with engineered features."""
    logs = DailyLog.objects.filter(batch=batch).order_by('record_date')
    if not logs.exists():
        return pd.DataFrame()

    rows = []
    for log in logs:
        rows.append({
            'record_date': log.record_date,
            'flock_age_days': (log.record_date - batch.arrival_date).days,
            'feed_consumed_kg': log.feed_consumed_kg,
            'mortality_count': log.mortality_count,
            'total_eggs': log.total_eggs,
        })

    df = pd.DataFrame(rows)
    if df.empty:
        return df

    # 7-day rolling averages
    df['feed_7d_avg'] = df['feed_consumed_kg'].rolling(window=7, min_periods=1).mean()
    df['mortality_7d_avg'] = df['mortality_count'].rolling(window=7, min_periods=1).mean()

    # Lag features (previous days' egg production)
    df['eggs_lag_1'] = df['total_eggs'].shift(1)
    df['eggs_lag_2'] = df['total_eggs'].shift(2)

    # Drop rows with NaN from lag features
    df = df.dropna(subset=['eggs_lag_1', 'eggs_lag_2']).reset_index(drop=True)
    return df


FEATURE_COLUMNS = [
    'flock_age_days',
    'feed_7d_avg',
    'mortality_7d_avg',
    'eggs_lag_1',
    'eggs_lag_2',
]


def forecast_batch(batch, horizon=7):
    """Forecast total egg production for the next `horizon` days.

    Returns a dict with:
      - forecast: list of {date, predicted_eggs}
      - model_info: dict with training details
    """
    df = _build_dataframe(batch)
    if len(df) < 5:
        return {
            'forecast': [],
            'model_info': {
                'status': 'insufficient_data',
                'message': f'Need at least 5 days of data; have {len(df)}.',
                'training_samples': len(df),
            },
        }

    X = df[FEATURE_COLUMNS].values
    y = df['total_eggs'].values

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=8,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X, y)

    # In-sample R^2 for reporting
    r2 = model.score(X, y)

    # Recursive multi-step forecasting
    last_row = df.iloc[-1].copy()
    last_date = last_row['record_date']
    forecast = []

    # Keep a small rolling window for feed/mortality averages
    feed_window = df['feed_consumed_kg'].tail(7).tolist()
    mort_window = df['mortality_count'].tail(7).tolist()
    egg_history = df['total_eggs'].tolist()

    for step in range(1, horizon + 1):
        next_date = last_date + timedelta(days=step)
        flock_age = (next_date - batch.arrival_date).days
        feed_avg = float(np.mean(feed_window[-7:]))
        mort_avg = float(np.mean(mort_window[-7:]))
        lag1 = egg_history[-1]
        lag2 = egg_history[-2] if len(egg_history) >= 2 else lag1

        features = np.array([[flock_age, feed_avg, mort_avg, lag1, lag2]])
        pred = float(model.predict(features)[0])
        pred = max(0, round(pred))  # eggs can't be negative

        forecast.append({
            'date': next_date.isoformat(),
            'predicted_eggs': pred,
        })

        # Append predicted value to history for next step
        egg_history.append(pred)
        # For feed/mortality, assume continuation of recent average
        feed_window.append(feed_avg)
        mort_window.append(mort_avg)

    return {
        'forecast': forecast,
        'model_info': {
            'status': 'ok',
            'model': 'RandomForestRegressor',
            'training_samples': len(df),
            'r_squared': round(r2, 4),
            'features': FEATURE_COLUMNS,
            'horizon_days': horizon,
        },
    }


def forecast_all_batches(horizon=7):
    """Run forecast for all batches."""
    results = {}
    for batch in FlockBatch.objects.all():
        results[batch.batch_id] = forecast_batch(batch, horizon)
    return results
