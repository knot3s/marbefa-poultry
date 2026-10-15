"""
KPI calculations for the BI Dashboard.

HDEP % (Hen-Day Egg Production):
    (Total Eggs Today / Live Birds Today) * 100

FCR (Feed Conversion Ratio):
    Total Feed Consumed (kg) / Total Mass of Eggs (kg)
"""
from datetime import timedelta

from django.db.models import Sum

from ..models import DailyLog, FlockBatch

# Approximate average egg mass per egg by size (grams)
EGG_MASS_G = {
    'small': 45,
    'medium': 53,
    'large': 60,
    'xl': 66,
}


def _live_birds(batch, up_to_date):
    """Live birds = initial population - cumulative mortality up to date."""
    cumulative_mortality = DailyLog.objects.filter(
        batch=batch,
        record_date__lte=up_to_date,
    ).aggregate(total=Sum('mortality_count'))['total'] or 0
    return max(0, batch.initial_population - cumulative_mortality)


def _egg_mass_kg(log):
    """Total egg mass in kg for a single daily log (excluding rejects)."""
    mass_g = (
        log.eggs_small * EGG_MASS_G['small']
        + log.eggs_medium * EGG_MASS_G['medium']
        + log.eggs_large * EGG_MASS_G['large']
        + log.eggs_xl * EGG_MASS_G['xl']
    )
    return mass_g / 1000.0


def compute_hdep(batch, on_date):
    """HDEP % for a batch on a specific date."""
    log = DailyLog.objects.filter(batch=batch, record_date=on_date).first()
    if not log:
        return None
    live = _live_birds(batch, on_date)
    if live <= 0:
        return 0.0
    return round((log.total_eggs / live) * 100, 2)


def compute_fcr(batch, start_date, end_date):
    """FCR over a date range: total feed (kg) / total egg mass (kg)."""
    logs = DailyLog.objects.filter(
        batch=batch,
        record_date__gte=start_date,
        record_date__lte=end_date,
    )
    total_feed = sum(l.feed_consumed_kg for l in logs)
    total_egg_mass = sum(_egg_mass_kg(l) for l in logs)
    if total_egg_mass <= 0:
        return None
    return round(total_feed / total_egg_mass, 3)


def get_batch_kpis(batch):
    """Return a comprehensive KPI snapshot for a batch."""
    latest = DailyLog.objects.filter(batch=batch).order_by('-record_date').first()
    if not latest:
        return {
            'batch_id': batch.batch_id,
            'breed_type': batch.breed_type,
            'status': 'no_data',
        }

    live = _live_birds(batch, latest.record_date)
    hdep = compute_hdep(batch, latest.record_date)

    # FCR over last 7 days
    week_ago = latest.record_date - timedelta(days=6)
    fcr = compute_fcr(batch, week_ago, latest.record_date)

    # Cumulative totals
    all_logs = DailyLog.objects.filter(batch=batch)
    total_eggs_all = sum(l.total_eggs for l in all_logs)
    total_feed_all = sum(l.feed_consumed_kg for l in all_logs)
    total_mortality = sum(l.mortality_count for l in all_logs)

    return {
        'batch_id': batch.batch_id,
        'breed_type': batch.breed_type,
        'arrival_date': batch.arrival_date.isoformat(),
        'initial_population': batch.initial_population,
        'live_birds': live,
        'latest_date': latest.record_date.isoformat(),
        'hdep_percent': hdep,
        'fcr_7d': fcr,
        'total_eggs': total_eggs_all,
        'total_feed_kg': round(total_feed_all, 1),
        'total_mortality': total_mortality,
        'latest_eggs': latest.total_eggs,
        'latest_feed_kg': latest.feed_consumed_kg,
        'latest_mortality': latest.mortality_count,
    }
