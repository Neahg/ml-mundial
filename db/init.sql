-- ══════════════════════════════════════════════════════════════════
-- Esquema inicial para la plataforma ML - Copa del Mundo
-- ══════════════════════════════════════════════════════════════════

-- Tabla de partidos (dataset raw)
CREATE TABLE IF NOT EXISTS partidos (
    id                      SERIAL PRIMARY KEY,
    home_score              INTEGER,
    away_score              INTEGER,
    dif_gol                 INTEGER,
    local                   INTEGER,
    visitante               INTEGER,
    num_continente_local    INTEGER,
    num_continente_visitante INTEGER,
    num_continente_anfitrion INTEGER,
    resultado               INTEGER,   -- 1 = gana local, 0 = no gana local
    goleada                 INTEGER,   -- 1 = goleada (|dif|>3), 0 = normal
    created_at              TIMESTAMP DEFAULT NOW()
);

-- Tabla de modelos entrenados
CREATE TABLE IF NOT EXISTS modelos (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    version         VARCHAR(20)  NOT NULL,
    tipo            VARCHAR(50),          -- 'clasificacion_resultado' | 'clasificacion_goleada'
    accuracy        FLOAT,
    f1_score        FLOAT,
    precision_score FLOAT,
    recall_score    FLOAT,
    auc_roc         FLOAT,
    parametros      TEXT,                 -- JSON con hiperparámetros
    archivo         VARCHAR(200),         -- ruta al .pkl
    activo          BOOLEAN DEFAULT TRUE,
    entrenado_en    TIMESTAMP DEFAULT NOW()
);

-- Tabla de predicciones
CREATE TABLE IF NOT EXISTS predicciones (
    id                      SERIAL PRIMARY KEY,
    modelo_id               INTEGER REFERENCES modelos(id),
    local                   INTEGER,
    visitante               INTEGER,
    num_continente_local    INTEGER,
    num_continente_visitante INTEGER,
    num_continente_anfitrion INTEGER,
    prediccion              INTEGER,
    probabilidad            FLOAT,
    tipo                    VARCHAR(50),  -- 'resultado' | 'goleada'
    creada_en               TIMESTAMP DEFAULT NOW()
);

-- Tabla de métricas de entrenamiento (historial)
CREATE TABLE IF NOT EXISTS metricas_entrenamiento (
    id          SERIAL PRIMARY KEY,
    modelo_id   INTEGER REFERENCES modelos(id),
    metrica     VARCHAR(50),
    valor       FLOAT,
    split       VARCHAR(20),   -- 'train' | 'test' | 'cv'
    registrado  TIMESTAMP DEFAULT NOW()
);
