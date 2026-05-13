import os
os.environ['ENV'] = 'development'
os.environ['COOKIE_SECURE'] = 'false'
os.environ.pop('COOKIE_DOMAIN', None)
os.environ['APP_SECRET'] = 'test-secret'

from app.config import settings
print(f'cookie_domain: {settings.cookie_domain!r}')
print(f'cookie_secure: {settings.cookie_secure!r}')
print(f'environment: {settings.environment!r}')
