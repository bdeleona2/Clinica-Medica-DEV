

## PROYECTO DE SEMINARIO PRESENTADO POR:

| Nombre                          | Carné        |
|---------------------------------|--------------|
| Edwin Valdemar Cobon Monzón     | 0900-11-8241 |
| Samuel Rodas Aroche             | 0900-19-6150 |
| Marvin Roel Ovalle Cuc          | 0900-21-15330|
| Breyner Josué De León Alvisurez | 0900-13-761  |


# 🏥 Proyecto Clínica Médica – Instrucciones de Instalación

Este instructivo explica cómo levantar el proyecto, importando directamente la base de datos `clinica_db.sql` y configurando backend + frontend.

---

## ⚙️ Requisitos

- **Node.js**: versión 20 o 22 LTS (incluye npm 10).
- **MySQL**: versión 8.x instalada (con Workbench o cliente CLI).
- **Puertos libres**:
  - **4000** → backend
  - **3000** → frontend

---

## 1. Clonar el proyecto

```bash
# Ubícate en el escritorio o carpeta de trabajo
cd ~/Desktop

# Clona el repositorio
git clone https://github.com/EdwinCobon/Clinica-Medica-DEV.git

cd Clinica-Medica-DEV
```

Estructura esperada:
```
Clinica-Medica-DEV/
  backend/
  frontend/
  clinica_db.sql
```

---

## 2. Crear la base de datos e importar el SQL

### 2.1 Eliminar y crear base de datos vacía
Abre MySQL desde consola o Workbench y ejecuta:

```sql
DROP DATABASE IF EXISTS clinica_db;
CREATE DATABASE clinica_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2.2 Importar el archivo `clinica_db.sql`
En consola (ajusta la ruta si es necesario):

```bash
"/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" -u root -p clinica_db < clinica_db.sql
```

En MySQL Workbench:  
- Selecciona la base `clinica_db`.  
- Usa la opción **Server → Data Import**.  
- Importa el archivo `clinica_db.sql`.

---

## 3. Configuración del Backend

### 3.1 Entrar al backend
```bash
cd backend
```

⚠️ **Sustituye `TU_CONTRASEÑA` por la contraseña de tu usuario root en MySQL Workbench en tu archivo .env para tu base de datos .**

### 3.2 Instalar dependencias
```bash
npm install --legacy-peer-deps
```

### 3.3 Ejecutar seed (opcional, para cargar datos de prueba)
```bash
node -r dotenv/config seed.js
```

### 3.4 Levantar el servidor
```bash
npm run dev
# o en producción
npm start
```

Backend activo en: [http://localhost:4000](http://localhost:4000)

---

## 4. Configuración del Frontend

### 4.1 Entrar al frontend
```bash
cd ../frontend
```

### 4.2 Instalar dependencias
```bash
npm install --legacy-peer-deps
npm i html2canvas jspdf xlsx
```

### 4.3 Levantar el frontend
```bash
npm run dev
```

Abrir en: [http://localhost:3000](http://localhost:3000)

---

## 🚀 Resumen rápido

1. Instalar Node y MySQL.  
2. Borrar y crear base `clinica_db`.  
3. Importar `clinica_db.sql`.  
4. Backend: usar usuario root (sustituir contraseña en la config).  
5. Instalar dependencias (`npm install`) en backend y frontend.  
6. Cargar datos de prueba (`node seed.js`).  
7. Levantar backend y frontend.  

---
