"""
Passenger WSGI entry point for Hostinger shared hosting.
Hostinger's "Setup Python App" uses Phusion Passenger and looks for
`passenger_wsgi.py` in the application root directory.
"""
import os
import sys

# Ensure the backend directory is on the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Load the Django WSGI application
from django.core.wsgi import get_wsgi_application  # noqa: E402
application = get_wsgi_application()
