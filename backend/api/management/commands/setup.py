from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Run migrations, collect static files, and optionally seed demo data.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-seed',
            action='store_true',
            help='Skip seeding demo data (users, batch, logs).',
        )

    def handle(self, *args, **options):
        from django.core.management import call_command

        self.stdout.write(self.style.MIGRATE_HEADING('Running migrations...'))
        call_command('migrate', verbosity=1)

        self.stdout.write(self.style.MIGRATE_HEADING('Collecting static files...'))
        call_command('collectstatic', '--noinput', verbosity=0)

        if not options['no_seed']:
            self.stdout.write(self.style.MIGRATE_HEADING('Seeding demo data...'))
            import os
            seed_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                'seed_data.py',
            )
            if os.path.exists(seed_path):
                exec(open(seed_path).read())
                self.stdout.write(self.style.SUCCESS('Demo data seeded: manager/manager123, staff/staff123'))
            else:
                self.stdout.write(self.style.WARNING('seed_data.py not found; skipping.'))

        self.stdout.write(self.style.SUCCESS('\nSetup complete. Restart the Python App in hPanel.'))
