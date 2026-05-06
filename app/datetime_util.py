from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.config import settings


def today_in_app_timezone() -> date:
    return datetime.now(ZoneInfo(settings.timezone)).date()
