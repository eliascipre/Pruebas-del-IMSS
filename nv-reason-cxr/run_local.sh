#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_PORT=5005
SKIP_VENV=false

usage() {
    cat <<'EOF'
Uso: run_local.sh [opciones]

Opciones:
  --skip-venv          No intenta activar el entorno virtual ../venv
  --allow-downloads    Fuerza NV_REASON_ALLOW_DOWNLOADS=1 (permite descargas)
  --no-downloads       Fuerza NV_REASON_ALLOW_DOWNLOADS=0 (modo offline)
  --port <puerto>      Puerto HTTP para Gradio (por defecto 5005)
  -h, --help           Muestra esta ayuda
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-venv)
            SKIP_VENV=true
            shift
            ;;
        --allow-downloads)
            export NV_REASON_ALLOW_DOWNLOADS=1
            shift
            ;;
        --no-downloads)
            export NV_REASON_ALLOW_DOWNLOADS=0
            shift
            ;;
        --port)
            shift
            if [[ $# -eq 0 ]]; then
                echo "[run_local] Error: se esperaba un valor para --port" >&2
                exit 1
            fi
            export PORT="$1"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "[run_local] Argumento no reconocido: $1" >&2
            usage >&2
            exit 1
            ;;
    esac
done

resolve_local_model_path() {
    local explicit_path="${NV_REASON_MODEL_PATH:-}"

    if [[ -n "$explicit_path" ]]; then
        explicit_path="${explicit_path%/}"
        if [[ -d "$explicit_path" && -f "$explicit_path/config.json" ]]; then
            echo "$explicit_path"
            return 0
        fi
        if [[ -f "$explicit_path" ]]; then
            local explicit_dir
            explicit_dir="$(dirname "$explicit_path")"
            if [[ -f "$explicit_dir/config.json" ]]; then
                echo "$explicit_dir"
                return 0
            fi
        fi
    fi

    local cache_dir="${HOME}/.cache/huggingface/hub/models--nvidia--NV-Reason-CXR-3B"
    if [[ -d "$cache_dir" ]]; then
        local snapshot_dir
        snapshot_dir=$(ls -dt "$cache_dir"/snapshots/* 2>/dev/null | head -n 1)
        if [[ -n "$snapshot_dir" && -f "$snapshot_dir/config.json" ]]; then
            echo "$snapshot_dir"
            return 0
        fi
    fi

    return 1
}

: "${PORT:=$DEFAULT_PORT}"

if [[ -z "${NV_REASON_MODEL_PATH:-}" ]]; then
    if model_path="$(resolve_local_model_path 2>/dev/null)" && [[ -n "$model_path" ]]; then
        export NV_REASON_MODEL_PATH="$model_path"
        echo "[run_local] Modelo local detectado: $NV_REASON_MODEL_PATH"
        if [[ -z "${NV_REASON_ALLOW_DOWNLOADS:-}" ]]; then
            export NV_REASON_ALLOW_DOWNLOADS=0
        fi
    else
        echo "[run_local] No se encontro modelo local; se permitiran descargas si es necesario."
        if [[ -z "${NV_REASON_ALLOW_DOWNLOADS:-}" ]]; then
            export NV_REASON_ALLOW_DOWNLOADS=1
        fi
    fi
fi

: "${NV_REASON_ALLOW_DOWNLOADS:=1}"
export NV_REASON_ALLOW_DOWNLOADS

if [[ -z "${MODEL:-}" ]]; then
    if [[ -n "${NV_REASON_MODEL_PATH:-}" ]]; then
        export MODEL="$NV_REASON_MODEL_PATH"
    else
        export MODEL="nvidia/NV-Reason-CXR-3B"
    fi
fi

if ! $SKIP_VENV; then
    VENV_PATH="$SCRIPT_DIR/../venv"
    if [[ -d "$VENV_PATH" && -f "$VENV_PATH/bin/activate" ]]; then
        echo "[run_local] Activando entorno virtual: $VENV_PATH"
        # shellcheck disable=SC1091
        source "$VENV_PATH/bin/activate"
    fi
fi

if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN=python3
elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN=python
else
    echo "[run_local] Error: Python no esta instalado en el PATH." >&2
    exit 1
fi

export PORT

echo "[run_local] Lanzando app.py en $PYTHON_BIN (puerto $PORT)"
exec "$PYTHON_BIN" "$SCRIPT_DIR/app.py"

