"""
train.py — Servicio de entrenamiento
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Implementa el pipeline completo de ML basado en el notebook de la entrega anterior:
  1. Ingesta del CSV y carga a la BD
  2. Preprocesamiento (escalado, features)
  3. Selección de características (correlación + RF importances)
  4. Entrenamiento: Logistic Regression, KNN, SVM, Random Forest
  5. Evaluación y selección del mejor modelo por F1-score
  6. Persistencia del modelo (.pkl) y métricas en la BD
"""

import os, json, time
import pandas as pd
import numpy as np
import psycopg2
import joblib
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score,
    recall_score, roc_auc_score
)

# ── Constantes ────────────────────────────────────────────────────────────────
RANDOM_STATE = 42
DATA_PATH    = "/app/data/df_attack_processedCleaned.csv"
MODELS_DIR   = "/app/models"
os.makedirs(MODELS_DIR, exist_ok=True)

DB_CONFIG = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     os.getenv("DB_PORT", "5432"),
    "dbname":   os.getenv("DB_NAME", "mundial_ml"),
    "user":     os.getenv("DB_USER", "admin"),
    "password": os.getenv("DB_PASS", "admin123"),
}

# ── Helpers BD ────────────────────────────────────────────────────────────────
def get_conn():
    return psycopg2.connect(**DB_CONFIG)

def wait_for_db(max_retries=15):
    for i in range(max_retries):
        try:
            conn = get_conn()
            conn.close()
            print("✅ Conexión a BD establecida")
            return
        except Exception:
            print(f"   BD no disponible aún, reintento {i+1}/{max_retries}...")
            time.sleep(3)
    raise RuntimeError("No se pudo conectar a la BD")

# ── 1. Ingesta y carga a BD ───────────────────────────────────────────────────
def ingestar_datos(conn):
    print("\n── 1. Ingesta de datos ─────────────────────────────────────────")
    df = pd.read_csv(DATA_PATH)
    print(f"   CSV cargado: {df.shape[0]} partidos, {df.shape[1]} columnas")

    # Crear variables objetivo (del notebook)
    df["resultado"] = (df["home_score"] > df["away_score"]).astype(int)
    df["goleada"]   = (df["dif_gol"].abs() > 3).astype(int)
    df["empate_int"] = df["empate"].astype(int)

    # Insertar en la BD (upsert seguro: limpiar primero en dev)
    cur = conn.cursor()
    cur.execute("DELETE FROM partidos;")  # idempotente para re-ejecuciones
    insert_q = """
        INSERT INTO partidos
          (home_score, away_score, dif_gol, local, visitante,
           num_continente_local, num_continente_visitante,
           num_continente_anfitrion, resultado, goleada)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """
    registros = [
        (int(r.home_score), int(r.away_score), int(r.dif_gol),
         int(r.local), int(r.visitante),
         int(r.num_continente_local), int(r.num_continente_visitante),
         int(r.num_continente_anfitrion), int(r.resultado), int(r.goleada))
        for _, r in df.iterrows()
    ]
    cur.executemany(insert_q, registros)
    conn.commit()
    cur.close()
    print(f"   {len(registros)} partidos insertados en la BD ✅")
    return df

# ── 2. Preprocesamiento y selección de features ───────────────────────────────
def preparar_features(df):
    print("\n── 2. Preprocesamiento y selección de características ──────────")
    LEAK_COLS   = ["home_score", "away_score", "dif_gol", "empate",
                   "resultado", "goleada", "empate_int"]
    FEATURE_COLS = [c for c in df.columns if c not in LEAK_COLS]

    X = df[FEATURE_COLS].copy()

    # Estrategia 1: correlación de Pearson
    y_res = df["resultado"]
    corr  = X.corrwith(y_res).abs()
    features_corr = corr[corr >= 0.05].index.tolist()

    # Estrategia 2: importancia Random Forest
    rf_sel = RandomForestClassifier(n_estimators=200, random_state=RANDOM_STATE)
    rf_sel.fit(X, y_res)
    imp = pd.Series(rf_sel.feature_importances_, index=X.columns)
    features_rf = imp[imp >= 0.05].index.tolist()

    # Unión de ambas estrategias (más inclusivo)
    features_final = sorted(set(features_corr) | set(features_rf))
    print(f"   Features seleccionadas ({len(features_final)}): {features_final}")
    print(f"     • Correlación: {features_corr}")
    print(f"     • RF importances: {features_rf}")

    X_sel = X[features_final]
    return X_sel, features_final

# ── 3. Entrenamiento ──────────────────────────────────────────────────────────
def entrenar_modelos(X_sel, y, tipo, conn):
    print(f"\n── 3. Entrenamiento — {tipo} ────────────────────────────────────")

    X_train, X_test, y_train, y_test = train_test_split(
        X_sel, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    # Peso de clases para manejar desbalance (crítico en goleada ~7.5%)
    class_w = "balanced" if tipo == "goleada" else None

    pipelines = {
        "LogisticRegression": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(
                max_iter=1000, C=1.0, class_weight=class_w, random_state=RANDOM_STATE))
        ]),
        "KNN": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", KNeighborsClassifier(n_neighbors=7, metric="euclidean"))
        ]),
        "SVM": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", SVC(kernel="rbf", C=10, gamma="scale",
                        probability=True, class_weight=class_w, random_state=RANDOM_STATE))
        ]),
        "RandomForest": Pipeline([
            ("clf", RandomForestClassifier(
                n_estimators=200, max_depth=10, random_state=RANDOM_STATE,
                class_weight=class_w))
        ]),
    }

    resultados = {}
    for nombre, pipe in pipelines.items():
        pipe.fit(X_train, y_train)
        y_pred = pipe.predict(X_test)
        y_prob = pipe.predict_proba(X_test)[:, 1]

        acc  = accuracy_score(y_test, y_pred)
        f1   = f1_score(y_test, y_pred, zero_division=0)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec  = recall_score(y_test, y_pred, zero_division=0)
        auc  = roc_auc_score(y_test, y_prob)
        cv_f1 = cross_val_score(pipe, X_sel, y, cv=cv, scoring="f1").mean()

        resultados[nombre] = {
            "pipe": pipe, "acc": acc, "f1": f1,
            "prec": prec, "rec": rec, "auc": auc, "cv_f1": cv_f1
        }
        print(f"   {nombre:<20} acc={acc:.3f}  f1={f1:.3f}  auc={auc:.3f}  cv_f1={cv_f1:.3f}")

    # Seleccionar el mejor por F1
    mejor_nombre = max(resultados, key=lambda k: resultados[k]["f1"])
    mejor = resultados[mejor_nombre]
    print(f"\n   🏆 Mejor modelo ({tipo}): {mejor_nombre}  (F1={mejor['f1']:.4f})")

    # Persistir modelo
    version  = "v1.0"
    filename = f"{tipo}_{mejor_nombre}_{version}.pkl"
    filepath = os.path.join(MODELS_DIR, filename)
    joblib.dump(mejor["pipe"], filepath)
    print(f"   Modelo guardado en: {filepath}")

    # Guardar en BD
    cur = conn.cursor()
    params_json = json.dumps({"modelo": mejor_nombre, "features": X_sel.columns.tolist()})
    cur.execute("""
        INSERT INTO modelos
          (nombre, version, tipo, accuracy, f1_score, precision_score,
           recall_score, auc_roc, parametros, archivo, activo)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,TRUE)
        RETURNING id
    """, (mejor_nombre, version, tipo,
          mejor["acc"], mejor["f1"], mejor["prec"],
          mejor["rec"], mejor["auc"], params_json, filename))
    model_id = cur.fetchone()[0]

    # Métricas de todos los modelos
    for nom, res in resultados.items():
        for metrica, val in [("accuracy", res["acc"]), ("f1", res["f1"]),
                              ("precision", res["prec"]), ("recall", res["rec"]),
                              ("auc_roc", res["auc"]), ("cv_f1", res["cv_f1"])]:
            cur.execute("""
                INSERT INTO metricas_entrenamiento (modelo_id, metrica, valor, split)
                VALUES (%s, %s, %s, %s)
            """, (model_id, f"{nom}_{metrica}", val, "test"))

    conn.commit()
    cur.close()

    # Guardar features para la API
    meta_path = os.path.join(MODELS_DIR, f"{tipo}_meta.json")
    with open(meta_path, "w") as f:
        json.dump({"features": X_sel.columns.tolist(), "model_file": filename}, f)

    return mejor_nombre, mejor["f1"]

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  PIPELINE DE ENTRENAMIENTO — Copa del Mundo FIFA")
    print("=" * 60)

    wait_for_db()
    conn = get_conn()

    df        = ingestar_datos(conn)
    X_sel, _  = preparar_features(df)

    entrenar_modelos(X_sel, df["resultado"], "resultado", conn)
    entrenar_modelos(X_sel, df["goleada"],   "goleada",   conn)

    conn.close()
    print("\n✅ Pipeline completado. Modelos listos para inferencia.")
