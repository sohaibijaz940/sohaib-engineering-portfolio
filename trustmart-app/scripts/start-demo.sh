#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
npm ci
npm run build
python -m unittest discover -s backend -p 'test_*.py' -v
python backend/server.py
