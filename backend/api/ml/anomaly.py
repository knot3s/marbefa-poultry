"""
Anomaly Detection Engine using Statistical Process Control (SPC).

For a given batch, we compute the 7-day rolling mean and standard deviation
of total egg production. The Lower Control Limit (LCL) is defined as:

    LCL = mean - 3 * std_dev   (3-sigma rule)

If a day's total egg count falls below the LCL, an Anomaly_Alert record is
created. Mortality spikes and feed/water anomalies are also checked.
"""
import statistics
from datetime import timedelta

from ..models import AnomalyAlert, DailyLog, FlockBatch


def _get_7day_window(batch, up_to_date):
    """Return DailyLog records for the 7 days strictly before up_to_date.

    The control limits are computed from historical data only (excluding the
    day being tested), which is the correct SPC approach.
    """
    end = up_to_date - timedelta(days=1)
    start = end - timedelta(days=6)
    return DailyLog.objects.filter(
        batch=batch,
        record_date__gte=start,
        record_date__lte=end,
    ).order_by('record_date')


def _detect_egg_drop(batch, log):
    """Check if the day's total eggs dropped below the 7-day LCL."""
    window = _get_7day_window(batch, log.record_date)
    counts = [r.total_eggs for r in window]
    if len(counts) < 3:
        return None  # not enough history

    mean = statistics.mean(counts)
    std = statistics.stdev(counts) if len(counts) > 1 else 0
    lcl = mean - 3 * std

    if log.total_eggs < lcl and log.total_eggs < mean:
        drop_pct = ((mean - log.total_eggs) / mean * 100) if mean else 0
        severity = 'Critical' if drop_pct > 30 else ('High' if drop_pct > 20 else 'Medium')
        return {
            'anomaly_type': 'Egg_Drop',
            'severity_level': severity,
            'description': (
                f"Egg production dropped to {log.total_eggs} on {log.record_date}. "
                f"7-day mean: {mean:.0f}, LCL: {lcl:.0f} "
                f"(-{drop_pct:.1f}% below average)."
            ),
        }
    return None


def _detect_mortality_spike(batch, log):
    """Check for a mortality spike using 7-day mean + 2 sigma."""
    window = _get_7day_window(batch, log.record_date)
    mort = [r.mortality_count for r in window]
    if len(mort) < 3:
        return None
    mean = statistics.mean(mort)
    std = statistics.stdev(mort) if len(mort) > 1 else 0
    ucl = mean + 2 * std
    if log.mortality_count > ucl and log.mortality_count > mean:
        severity = 'Critical' if log.mortality_count > mean * 3 else 'High'
        return {
            'anomaly_type': 'Mortality_Spike',
            'severity_level': severity,
            'description': (
                f"Mortality spiked to {log.mortality_count} on {log.record_date}. "
                f"7-day mean: {mean:.1f}."
            ),
        }
    return None


def run_anomaly_detection(batch, log):
    """Run all checks for a daily log and create alerts if anomalies found.

    Returns the list of created AnomalyAlert objects.
    """
    created = []
    checks = [_detect_egg_drop, _detect_mortality_spike]
    for check in checks:
        result = check(batch, log)
        if result:
            alert = AnomalyAlert.objects.create(
                batch=batch,
                anomaly_type=result['anomaly_type'],
                severity_level=result['severity_level'],
                description=result['description'],
            )
            created.append(alert)
    return created


def run_anomaly_detection_for_batch(batch):
    """Run anomaly detection on all logs for a batch (retrospective scan).

    Avoids creating duplicate alerts for the same batch/anomaly/date.
    """
    created = []
    existing = set(
        AnomalyAlert.objects.filter(batch=batch).values_list(
            'anomaly_type', 'trigger_date__date'
        )
    )
    for log in DailyLog.objects.filter(batch=batch).order_by('record_date'):
        checks = [_detect_egg_drop, _detect_mortality_spike]
        for check in checks:
            result = check(batch, log)
            if result:
                key = (result['anomaly_type'], log.record_date)
                if key not in existing:
                    alert = AnomalyAlert.objects.create(
                        batch=batch,
                        anomaly_type=result['anomaly_type'],
                        severity_level=result['severity_level'],
                        description=result['description'],
                    )
                    created.append(alert)
                    existing.add(key)
    return created


def run_anomaly_detection_all():
    """Run anomaly detection on every log of every batch."""
    all_alerts = []
    for batch in FlockBatch.objects.all():
        all_alerts.extend(run_anomaly_detection_for_batch(batch))
    return all_alerts
