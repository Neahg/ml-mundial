"""
app.py — API REST para la plataforma ML Copa del Mundo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Endpoints:
  GET  /health               → estado del servicio
  GET  /api/modelos          → lista modelos entrenados con métricas
  GET  /api/metricas         → métricas de todos los modelos comparadas
  GET  /api/predicciones     → historial de predicciones
  GET  /api/estadisticas     → resumen del dataset en BD
  POST /api/predecir/resultado → inferencia: ¿gana el local?
  POST /api/predecir/goleada   → inferencia: ¿habrá goleada?
"""

import os, json
import numpy as np
import psycopg2
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Permite peticiones desde el frontend React

MODELS_DIR = "/app/models"
DB_CONFIG  = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     os.getenv("DB_PORT", "5432"),
    "dbname":   os.getenv("DB_NAME", "mundial_ml"),
    "user":     os.getenv("DB_USER", "admin"),
    "password": os.getenv("DB_PASS", "admin123"),
}

# Cache de modelos en memoria para no leer disco en cada request
_modelos_cache = {}

def get_conn():
    return psycopg2.connect(**DB_CONFIG)

def cargar_modelo(tipo: str):
    """Carga el modelo activo para el tipo dado, con cache en memoria."""
    if tipo in _modelos_cache:
        return _modelos_cache[tipo]
    meta_path = os.path.join(MODELS_DIR, f"{tipo}_meta.json")
    if not os.path.exists(meta_path):
        return None, None
    with open(meta_path) as f:
        meta = json.load(f)
    model_path = os.path.join(MODELS_DIR, meta["model_file"])
    if not os.path.exists(model_path):
        return None, None
    modelo = joblib.load(model_path)
    _modelos_cache[tipo] = (modelo, meta["features"])
    return modelo, meta["features"]

# ── /health ───────────────────────────────────────────────────────────────────
@app.route("/health")
def health():
    try:
        conn = get_conn(); conn.close()
        db_ok = True
    except Exception:
        db_ok = False
    modelos_ok = os.path.exists(os.path.join(MODELS_DIR, "resultado_meta.json"))
    return jsonify({
        "status":    "ok" if db_ok and modelos_ok else "degraded",
        "db":        db_ok,
        "modelos":   modelos_ok,
        "version":   "1.0.0"
    })

# ── /api/modelos ──────────────────────────────────────────────────────────────
@app.route("/api/modelos")
def get_modelos():
    try:
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("""
            SELECT id, nombre, version, tipo, accuracy, f1_score,
                   precision_score, recall_score, auc_roc, activo,
                   entrenado_en
            FROM modelos ORDER BY entrenado_en DESC
        """)
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]
        for r in rows:
            if r.get("entrenado_en"):
                r["entrenado_en"] = r["entrenado_en"].isoformat()
        cur.close(); conn.close()
        return jsonify({"modelos": rows})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── /api/metricas ─────────────────────────────────────────────────────────────
@app.route("/api/metricas")
def get_metricas():
    tipo = request.args.get("tipo", "resultado")
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("""
            SELECT m.nombre, mt.metrica, mt.valor
            FROM metricas_entrenamiento mt
            JOIN modelos m ON m.id = mt.modelo_id
            WHERE m.tipo = %s
            ORDER BY m.nombre, mt.metrica
        """, (tipo,))
        rows = cur.fetchall()
        cur.close(); conn.close()

        # Agrupar por nombre de modelo
        agrupado = {}
        for nombre, metrica, valor in rows:
            agrupado.setdefault(nombre, {})[metrica] = round(valor, 4)
        return jsonify({"tipo": tipo, "metricas": agrupado})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── /api/estadisticas ─────────────────────────────────────────────────────────
@app.route("/api/estadisticas")
def get_estadisticas():
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM partidos")
        total = cur.fetchone()[0]
        cur.execute("SELECT SUM(resultado), AVG(dif_gol), SUM(goleada) FROM partidos")
        row = cur.fetchone()
        cur.close(); conn.close()
        return jsonify({
            "total_partidos": total,
            "victorias_local": int(row[0]) if row[0] else 0,
            "dif_gol_promedio": round(float(row[1]), 3) if row[1] else 0,
            "total_goleadas": int(row[2]) if row[2] else 0,
            "pct_victorias_local": round(int(row[0])/total*100, 1) if row[0] else 0,
            "pct_goleadas": round(int(row[2])/total*100, 1) if row[2] else 0,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── /api/predicciones ─────────────────────────────────────────────────────────
@app.route("/api/predicciones")
def get_predicciones():
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("""
            SELECT p.id, m.nombre as modelo, p.local, p.visitante,
                   p.prediccion, p.probabilidad, p.tipo, p.creada_en
            FROM predicciones p
            JOIN modelos m ON m.id = p.modelo_id
            ORDER BY p.creada_en DESC
            LIMIT 50
        """)
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]
        for r in rows:
            if r.get("creada_en"):
                r["creada_en"] = r["creada_en"].isoformat()
        cur.close(); conn.close()
        return jsonify({"predicciones": rows})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── POST /api/predecir/resultado ──────────────────────────────────────────────
@app.route("/api/predecir/resultado", methods=["POST"])
def predecir_resultado():
    """
    Body JSON esperado:
    {
      "local": 5,
      "visitante": 12,
      "num_continente_local": 1,
      "num_continente_visitante": 2,
      "num_continente_anfitrion": 1
    }
    """
    return _predecir("resultado")

# ── POST /api/predecir/goleada ────────────────────────────────────────────────
@app.route("/api/predecir/goleada", methods=["POST"])
def predecir_goleada():
    return _predecir("goleada")

def _predecir(tipo: str):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    modelo, features = cargar_modelo(tipo)
    if modelo is None:
        return jsonify({"error": f"Modelo '{tipo}' no encontrado. ¿Ya se ejecutó el entrenamiento?"}), 503

    # Validar que vengan todos los campos requeridos
    faltantes = [f for f in features if f not in data]
    if faltantes:
        return jsonify({"error": f"Faltan campos: {faltantes}", "requeridos": features}), 400

    try:
        import pandas as pd
        X_input = pd.DataFrame([{f: data[f] for f in features}])

        prediccion   = int(modelo.predict(X_input)[0])
        probabilidad = float(modelo.predict_proba(X_input)[0][1])

        # Etiqueta legible
        if tipo == "resultado":
            etiqueta = "Gana el local" if prediccion == 1 else "No gana el local"
        else:
            etiqueta = "Habrá goleada (dif > 3)" if prediccion == 1 else "Partido normal"

        # Persistir en BD
        conn = get_conn(); cur = conn.cursor()
        cur.execute("SELECT id FROM modelos WHERE tipo=%s AND activo=TRUE LIMIT 1", (tipo,))
        row = cur.fetchone()
        if row:
            model_id = row[0]
            cur.execute("""
                INSERT INTO predicciones
                  (modelo_id, local, visitante, num_continente_local,
                   num_continente_visitante, num_continente_anfitrion,
                   prediccion, probabilidad, tipo)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (model_id,
                  data.get("local", 0), data.get("visitante", 0),
                  data.get("num_continente_local", 0),
                  data.get("num_continente_visitante", 0),
                  data.get("num_continente_anfitrion", 0),
                  prediccion, probabilidad, tipo))
            conn.commit()
        cur.close(); conn.close()

        return jsonify({
            "tipo":         tipo,
            "prediccion":   prediccion,
            "probabilidad": round(probabilidad * 100, 2),
            "etiqueta":     etiqueta,
            "features_usadas": features,
            "input":        data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
