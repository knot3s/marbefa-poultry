"""
Seed data script for Marbefa Poultry Analytics System.
Creates users, a flock batch, and 30 days of daily logs.

Usage: python manage.py shell < seed_data.py
"""
import os
import django
import random
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User, FlockBatch, DailyLog, AnomalyAlert

# Clean existing data
AnomalyAlert.objects.all().delete()
DailyLog.objects.all().delete()
FlockBatch.objects.all().delete()
User.objects.all().delete()

# Create users
manager = User.objects.create_user(
    username='manager',
    password='manager123',
    role='Manager',
)
staff = User.objects.create_user(
    username='staff',
    password='staff123',
    role='Staff',
)
print(f"Created users: manager, staff")

# Create a flock batch
arrival = date.today() - timedelta(days=120)
batch = FlockBatch.objects.create(
    user=manager,
    breed_type='Isa Brown',
    arrival_date=arrival,
    initial_population=3000,
)
print(f"Created batch {batch.batch_id}: {batch.breed_type}, arrived {arrival}")

# Generate 30 days of daily logs
random.seed(42)
base_date = date.today() - timedelta(days=30)
for i in range(30):
    d = base_date + timedelta(days=i)
    flock_age_days = (d - arrival).days

    # Production curve: peaks around day 150, then slowly declines
    if flock_age_days < 120:
        base_rate = 0.05 + (flock_age_days - 60) * 0.005
    elif flock_age_days < 180:
        base_rate = 0.85
    else:
        base_rate = 0.85 - (flock_age_days - 180) * 0.001
    base_rate = max(0.1, min(0.95, base_rate))

    live_birds = batch.initial_population - sum(
        DailyLog.objects.filter(batch=batch).values_list('mortality_count', flat=True)
    )
    total_eggs = int(live_birds * base_rate * random.uniform(0.95, 1.05))

    # Distribute eggs by size
    eggs_small = int(total_eggs * random.uniform(0.05, 0.12))
    eggs_medium = int(total_eggs * random.uniform(0.25, 0.35))
    eggs_large = int(total_eggs * random.uniform(0.40, 0.50))
    eggs_xl = total_eggs - eggs_small - eggs_medium - eggs_large
    eggs_xl = max(0, eggs_xl)
    eggs_reject = int(total_eggs * random.uniform(0.01, 0.03))

    feed_kg = round(live_birds * 0.11 * random.uniform(0.95, 1.05), 1)
    water_l = round(live_birds * 0.2 * random.uniform(0.95, 1.05), 1)
    mortality = random.choices(
        [0, 1, 2, 3, 5],
        weights=[70, 15, 8, 4, 3],
    )[0]

    # Inject an anomaly on day 22 (egg drop)
    if i == 22:
        eggs_medium = int(eggs_medium * 0.4)
        eggs_large = int(eggs_large * 0.4)

    log = DailyLog.objects.create(
        batch=batch,
        record_date=d,
        feed_consumed_kg=feed_kg,
        water_consumed_l=water_l,
        mortality_count=mortality,
        eggs_small=eggs_small,
        eggs_medium=eggs_medium,
        eggs_large=eggs_large,
        eggs_xl=eggs_xl,
        eggs_reject=eggs_reject,
    )

print(f"Created {DailyLog.objects.count()} daily logs")
print("Seed complete. Credentials: manager/manager123, staff/staff123")
