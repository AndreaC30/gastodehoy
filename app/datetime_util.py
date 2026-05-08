"""Date helpers tied to the configured application timezone."""

from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.config import settings


def today_in_app_timezone() -> date:
    """Return today's date in the timezone configured via ``TIMEZONE``."""
    return datetime.now(ZoneInfo(settings.timezone)).date()
