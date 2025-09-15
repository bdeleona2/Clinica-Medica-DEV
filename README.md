
# Clínica Fullstack

Este paquete contiene:
- `backend/`: API Node.js con Express y MySQL
- `frontend/`: Tu interfaz Next.js original + librería `lib/api.ts` para consumir la API


## Instalación

### 1) Base de Datos (MySQL)
```sql
SOURCE sql/clinica_db.sql;
```

### 2) Backend
```bash
cd backend
cp .env.example .env
# edita credenciales si es necesario
npm install --legacy-peer-deps
npm run start  # (o npm run dev)


### 3) Frontend
```bash
cd ../frontend
cp .env.local.example .env.local
npm install --legacy-peer-deps

pnpm dev      # o npm run dev
```

La app quedará disponible en http://localhost:3000 y la API en http://localhost:4000/api



# Clinica-Medica
