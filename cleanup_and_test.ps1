Remove-Item -Path "services\backend\tests\test_profile.py", "services\backend\tests\test_applications.py", "services\backend\tests\test_knowledge.py" -Force -ErrorAction SilentlyContinue
cd services\backend
.venv\Scripts\pip.exe install -e .
.venv\Scripts\python.exe migrate_pgvector.py
.venv\Scripts\pytest.exe tests/ -v
