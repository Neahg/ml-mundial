# ⚽ ML Mundial — Plataforma de Predicción FIFA World Cup

Plataforma de Machine Learning basada en microservicios para predecir resultados 
de la Copa del Mundo FIFA. Desarrollada como proyecto final de Programación Avanzada 
— 7° Semestre · Ingeniería de Software.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Machine Learning | Python · scikit-learn (LR · KNN · SVM · Random Forest) |
| API | Flask 3.0 |
| Frontend | React 18 · Recharts |
| Base de datos | PostgreSQL 15 |
| Infraestructura | Docker · Docker Compose |

## Levantar el proyecto

```bash
git clone https://github.com/Neahg/ml-mundial.git
cd ml-mundial
docker-compose up --build
```

Abrir **http://localhost:3000**

El servicio `training` corre automáticamente, entrena los modelos y los deja 
listos para inferencia. La API queda disponible en **http://localhost:5000**.

## Estructura
SQLite no es recomendado en entornos multi-contenedor (problemas de concurrencia con volúmenes Docker). PostgreSQL es la opción estándar para producción.

**¿Por qué el training es un servicio separado y no parte de la API?**
Principio de responsabilidad única. El entrenamiento es una tarea batch que corre una vez; la API es un servidor que responde en tiempo real. Mezclarlos haría los contenedores más grandes y difíciles de mantener.


<img width="1255" height="848" alt="image" src="https://github.com/user-attachments/assets/317a5123-e958-46a8-a778-b704ca295a5e" />
