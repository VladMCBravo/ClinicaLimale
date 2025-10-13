#!/usr/bin/env python
"""
WSGI config for AWS Elastic Beanstalk
"""
import os
import sys

# Adiciona o diretório backend ao Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings_aws')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()