# Plataforma ML — Copa del Mundo FIFA
**Programación Avanzada · 7° Semestre · Ingeniería de Software**

---

## Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      docker-compose                          │
│                                                             │
│  ┌──────────┐    ┌────────────┐    ┌─────┐    ┌──────────┐ │
│  │ training │───▶│    db      │◀───│ api │◀───│frontend  │ │
│  │(Python)  │    │(PostgreSQL)│    │(Flask)│   │(React)   │ │
│  └──────────┘    └────────────┘    └─────┘    └──────────┘ │
│       │               │               │                     │
│   /app/data       postgres_data    /app/models             │
│   (CSV input)     (volume)         (volume .pkl)           │
└─────────────────────────────────────────────────────────────┘
```

### Servicios

| Servicio   | Tecnología      | Puerto | Responsabilidad                            |
|------------|-----------------|--------|--------------------------------------------|
| `db`       | PostgreSQL 15   | 5432   | Persistencia: dataset, modelos, métricas, predicciones |
| `training` | Python 3.11     | —      | Pipeline ML: ingesta → entrenamiento → persistencia |
| `api`      | Flask 3.0       | 5000   | Inferencia y consulta de datos vía REST     |
| `frontend` | React 18 + Nginx| 3000   | Interfaz gráfica de interacción             |

---

## Flujo del pipeline de ML

```
CSV (data/)
    │
    ▼
[1. Ingesta]
    Carga el CSV a PostgreSQL (tabla partidos)
    │
    ▼
[2. Preprocesamiento]
    • Verifica nulos → imputación por mediana/moda si existen
    • Crea variables objetivo: resultado y goleada
    • Excluye columnas con data leakage
    │
    ▼
[3. Selección de features]
    • Estrategia 1: correlación de Pearson (umbral |r| ≥ 0.05)
    • Estrategia 2: importancia en Random Forest (umbral ≥ 0.05)
    • Feature set final: unión de ambas estrategias
    │
    ▼
[4. Entrenamiento (4 modelos)]
    • Logistic Regression  (Pipeline con StandardScaler)
    • KNN k=7              (Pipeline con StandardScaler)
    • SVM kernel=rbf       (Pipeline con StandardScaler)
    • Random Forest        (invariante a escala)
    Evaluación: accuracy, F1, precision, recall, AUC-ROC
    Validación cruzada: StratifiedKFold 5-fold
    │
    ▼
[5. Persistencia]
    • Mejor modelo por F1 → archivo .pkl en /models
    • Métricas de todos los modelos → tabla metricas_entrenamiento
    • Metadatos → tabla modelos
    │
    ▼
[6. Inferencia (API)]
    POST /api/predecir/resultado
    POST /api/predecir/goleada
    → Carga .pkl, predice, guarda en tabla predicciones
```

---

## Endpoints de la API

| Método | Endpoint                      | Descripción                          |
|--------|-------------------------------|--------------------------------------|
| GET    | `/health`                     | Estado del sistema                   |
| GET    | `/api/modelos`                | Lista de modelos entrenados          |
| GET    | `/api/metricas?tipo=resultado`| Métricas comparativas por tipo       |
| GET    | `/api/estadisticas`           | Resumen del dataset en BD            |
| GET    | `/api/predicciones`           | Últimas 50 predicciones              |
| POST   | `/api/predecir/resultado`     | Inferencia: ¿gana el local?          |
| POST   | `/api/predecir/goleada`       | Inferencia: ¿habrá goleada?          |

### Ejemplo de request de predicción

```bash
curl -X POST http://localhost:5000/api/predecir/resultado \
  -H "Content-Type: application/json" \
  -d '{
    "local": 5,
    "visitante": 20,
    "num_continente_local": 2,
    "num_continente_visitante": 1,
    "num_continente_anfitrion": 1
  }'
```

```json
{
  "tipo": "resultado",
  "prediccion": 1,
  "probabilidad": 67.4,
  "etiqueta": "Gana el local",
  "features_usadas": ["local", "visitante", "num_continente_local", ...],
  "input": { ... }
}
```

---

## Ejecución

### Prerrequisitos
- Docker Desktop instalado y corriendo
- Puerto 3000, 5000 y 5432 disponibles

### Pasos

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd ml-mundial

# 2. Asegurarse que el CSV esté en data/
#    (ya viene incluido en el repositorio)

# 3. Levantar toda la plataforma
docker-compose up --build

# El servicio training corre automáticamente y entrena los modelos.
# Cuando termina, la API y el frontend quedan disponibles.

# 4. Abrir el frontend
#    http://localhost:3000

# 5. Probar la API directamente
#    http://localhost:5000/health
```

### Para re-entrenar sin reiniciar todo

```bash
docker-compose run --rm training
```

### Para ver logs de un servicio específico

```bash
docker-compose logs -f training
docker-compose logs -f api
```

---

## Esquema de la base de datos

```sql
partidos              -- Dataset original + variables objetivo
modelos               -- Modelos entrenados con sus métricas
metricas_entrenamiento-- Métricas detalladas de todos los modelos comparados
predicciones          -- Historial de inferencias realizadas
```

---

## Notas de diseño

**¿Por qué Flask y no FastAPI?**
Flask es más simple para un primer proyecto de microservicios. FastAPI sería mejor a largo plazo por el tipado, pero Flask es suficiente para los requisitos de la entrega.

**¿Por qué PostgreSQL y no SQLite?**
SQLite no es recomendado en entornos multi-contenedor (problemas de concurrencia con volúmenes Docker). PostgreSQL es la opción estándar para producción.

**¿Por qué el training es un servicio separado y no parte de la API?**
Principio de responsabilidad única. El entrenamiento es una tarea batch que corre una vez; la API es un servidor que responde en tiempo real. Mezclarlos haría los contenedores más grandes y difíciles de mantener.
