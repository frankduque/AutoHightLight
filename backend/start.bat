@echo off
echo Iniciando AutoHighlights Backend...
cd /d "%~dp0"

REM Ativa o ambiente virtual
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo Criando ambiente virtual...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo Instalando dependencias...
    pip install -r requirements.txt
)

echo Backend iniciando...
python main.py
