 Entrega: API de Rastro con Express y MongoDB

## Objetivo

En la entrega de MongoDB diseñaste la base de datos de **Rastro**, la app de segunda mano, y la consultabas a mano con `mongosh`. Ahora vas a construir la **API** que usaría la app: un servidor Express que lee y escribe en esa base de datos.

Al terminar deberías poder:

- Conectar una API de Express a una base de datos MongoDB.
- Convertir las consultas de `mongosh` (`find`, `$inc`, `$set`…) en rutas de una API.
- Comprobar desde la API lo que MongoDB **no** comprueba: que una referencia existe y que un precio es un número.
- Devolver el código de estado correcto: `200`, `201`, `204`, `400`, `404`, `409`.
- Trabajar como en una empresa: rama `main` protegida, una **rama `feature/` y una pull request** por cada funcionalidad, y un **CI** que revisa tu código.

**Tiempo orientativo:** 4–6 horas.

**Qué vas a entregar:** un repositorio `api-rastro` en GitHub con el código, una PR por cada parte y un archivo `respuestas.md` (detalles en el apartado [Entrega](#entrega)).

**Cómo trabajarla:**

- Haz las partes **en orden**. Cada parte termina con una PR que tienes que fusionar antes de empezar la siguiente.
- Ten a mano los apuntes [02. Express con TypeScript](../sesiones/backend/02_express_typescript.md) y [02b. Express + MongoDB](../sesiones/backend/02b_express_mongodb.md). Esta entrega usa lo mismo, aplicado a Rastro.
- Una ruta no está terminada hasta que pruebas también **lo que falla**. Cada parte tiene su tabla de pruebas.
- Las preguntas son pocas y cortas: respóndelas en `respuestas.md` con una o dos frases.

### Todo en inglés

En las empresas, el código se escribe en **inglés**: nombres de colecciones, campos, rutas, variables y tipos. En esta entrega lo haremos así. Los datos de Rastro son los mismos que en la entrega de MongoDB, pero con los nombres traducidos:

| Entrega de MongoDB | Esta entrega |
|---|---|
| `usuarios` | `users` |
| `anuncios` | `listings` |
| `ofertas` | `offers` |
| `valoraciones` | `reviews` |
| `titulo`, `precio`, `categoria`, `ciudad`, `visitas`… | `title`, `price`, `category`, `city`, `views`… |
| `vendedor`, `comprador` | `seller`, `buyer` |
| `DISPONIBLE`, `RESERVADO`, `VENDIDO` | `AVAILABLE`, `RESERVED`, `SOLD` |
| `PENDIENTE`, `ACEPTADA`, `RECHAZADA` | `PENDING`, `ACCEPTED`, `REJECTED` |
| Coches, Móviles, Ropa, Muebles | `Cars`, `Phones`, `Clothes`, `Furniture` |

Lo que lee una persona (los títulos de los anuncios, los mensajes de error, los comentarios del código) puede seguir en español.

---

## Las reglas de la API

Toda la API sigue estas reglas. Vuelve aquí cada vez que dudes qué código devolver.

| Código | Cuándo |
|---|---|
| `200` | Todo bien. Devuelve los datos. |
| `201` | Se ha creado algo. Devuelve lo creado, con su `_id`. |
| `204` | Se ha borrado algo. No devuelve nada. |
| `400` | El cliente ha enviado algo mal: un id con mal formato, un campo que falta, un precio que no es un número… |
| `404` | El id que viene **en la ruta** (`/api/listings/:id`) no existe. |
| `409` | La petición es correcta, pero choca con el estado actual. Ejemplo: ofertar por un anuncio `SOLD`. |
| `500` | Error nuestro (por ejemplo, MongoDB caído). El cliente solo ve un mensaje genérico. |

Dos reglas más:

- Si un id llega **en el body** (por ejemplo `sellerId`) y no existe, es `400`: la petición está mal hecha.
- Todos los errores se responden en JSON: `{ "error": "mensaje que explica qué pasa" }`.

---

# PARTE 0 — Prepara el repositorio con CI

Antes de escribir la API vas a dejar el repositorio listo para trabajar con PR:

1. Un fichero `ci.yml` que revisa tu código con **ESLint** cada vez que subes algo.
2. La rama `main` protegida: solo se puede cambiar con una PR, y solo si los checks salen en verde ✅.

Aquí tienes la versión corta. La guía completa, con capturas de cada pantalla, está en [Instrucciones del CI mínimo](https://github.com/TheBridge-FullStackDeveloper/temario_fullstack_FT_LABORA_sept26/tree/master/sesiones/devops/instrucciones_ci). Si te pierdes en algún paso, ve allí.

## 0.1 Crea el proyecto

```bash
mkdir api-rastro
cd api-rastro
git init
npm init -y
npm install express mongodb
npm install -D typescript@~6.0 tsx @types/node @types/express eslint @eslint/js globals typescript-eslint
```

> Instalamos **TypeScript 6** (`typescript@~6.0`) a propósito: ESLint todavía no funciona con TypeScript 7.

Crea en la raíz el archivo `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

En `package.json`, sustituye el bloque `scripts` por:

```json
"scripts": {
  "dev": "tsx watch --env-file=.env src/index.ts",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit"
}
```

Crea el archivo `.gitignore`:

```gitignore
node_modules
dist
.env
```

Crea el archivo `eslint.config.mjs` (es el mismo de la guía del CI):

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  // Carpetas que no se revisan
  { ignores: ["dist/", "coverage/", "node_modules/"] },

  // Reglas recomendadas de ESLint y de TypeScript
  js.configs.recommended,
  tseslint.configs.recommended,

  // El código se ejecuta en Node.js
  {
    languageOptions: {
      globals: globals.node,
    },
  },

  // Nuestras reglas
  {
    rules: {
      eqeqeq: "error", // === en vez de ==
      "no-var": "error", // let o const en vez de var
      "prefer-const": "error", // const si la variable no cambia
      "no-empty": "error", // nada de bloques vacíos
      "@typescript-eslint/no-explicit-any": "error", // nada de any
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" }, // _req, _next: parámetros que no usamos a propósito
      ],
    },
  },
);
```

Y un primer `src/index.ts`, solo para comprobar que todo arranca:

```ts
import express from "express";

const app = express();
const PORT = 3000;

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
```

Comprueba:

```bash
npm run lint        # no debe mostrar ningún error
npm run typecheck   # tampoco
```

> `npm run dev` todavía no arranca: busca un archivo `.env` que crearás en la Parte 1.

## 0.2 Añade el `ci.yml`

Crea la carpeta `.github` (con punto), dentro la carpeta `workflows` (con **s**), y dentro el fichero `ci.yml`:

```text
api-rastro/
├── .github/
│   └── workflows/
│       └── ci.yml
├── src/
│   └── index.ts
├── .gitignore
├── eslint.config.mjs
├── package.json
├── package-lock.json
└── tsconfig.json
```

```yaml
# CI mínimo: revisa el código en cada push a main y en cada PR hacia main.
# Cada job es un "check" que sale con ✅ o ❌ en GitHub.
name: ci

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  # Check 1: revisa los .html. Esta API no tiene: dirá "Scanned 0 files" y pasará.
  htmlhint:
    runs-on: ubuntu-latest
    steps:
      - name: Descargar el código
        uses: actions/checkout@v7
      - name: Preparar Node.js
        uses: actions/setup-node@v7
        with:
          node-version: 24
      - name: Revisar el HTML con HTMLHint
        run: npx --yes htmlhint@1 "**/*.html" --ignore "dist/**,build/**,coverage/**"

  # Check 2: revisa el código TypeScript con ESLint (tu script "lint")
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Descargar el código
        uses: actions/checkout@v7
      - name: Preparar Node.js
        uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - name: Instalar dependencias
        run: npm ci
      - name: Lint
        run: npm run lint
```

> En YAML los espacios importan. Copia el fichero entero y no muevas nada.

## 0.3 Súbelo a GitHub

1. En GitHub crea un repositorio **público** llamado `api-rastro`, **vacío** (sin README ni `.gitignore`).
2. En tu terminal:

```bash
git add .
git commit -m "Proyecto inicial con CI mínimo"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/api-rastro.git
git push -u origin main
```

3. En la pestaña **Actions** espera a que `htmlhint` y `lint` salgan en verde ✅.

**No sigas hasta verlos en verde.** Si nunca se han ejecutado, no podrás elegirlos en el paso siguiente.

## 0.4 Protege la rama `main`

En tu repositorio:

1. **Settings** → en el menú de la izquierda, **Rulesets** → **New ruleset** → **New branch ruleset**.
2. **Ruleset Name**: `proteger-main`. **Enforcement status**: `Active`.
3. **Target branches**: **Add target** → **Include default branch**.
4. En **Branch rules**, marca solo estas cuatro casillas:
    - ☑ **Restrict deletions**
    - ☑ **Require a pull request before merging** (no toques sus opciones: la PR te la apruebas tú)
    - ☑ **Require status checks to pass**
    - ☑ **Block force pushes**
5. Debajo de **Require status checks to pass**, pulsa **Show additional settings** → **+ Add checks**. Añade `htmlhint` y después `lint`. Los dos tienen que aparecer con **GitHub Actions** al lado.
6. Baja del todo y pulsa **Create**.

¿No encuentras algún botón? Mira las capturas de la [guía completa](https://github.com/TheBridge-FullStackDeveloper/temario_fullstack_FT_LABORA_sept26/tree/master/sesiones/devops/instrucciones_ci).

### Ejercicio 0

1. Cambia cualquier cosa, haz commit e intenta `git push` directamente a `main`. ¿Qué pasa? Copia en `respuestas.md` la línea importante del error.
2. Deshaz el commit local con `git reset --hard origin/main`.

## 0.5 Cómo trabajarás a partir de ahora

Cada parte de la entrega es **una funcionalidad**, y cada funcionalidad va en su propia rama y su propia PR. La rama se llama `feature/` seguido del nombre de la funcionalidad, en inglés y con guiones: `feature/database-connection`, `feature/read-listings`… Cada parte te dice el nombre que tiene que tener.

```bash
git switch main
git pull
git switch -c feature/database-connection    # la rama de la funcionalidad
# ...programas y pruebas...
git add .
git commit -m "Conectar con la base de datos"
git push -u origin feature/database-connection
```

En GitHub: **Compare & pull request** → **Create pull request**. Espera a los dos checks ✅ y pulsa **Merge pull request** → **Confirm merge**.

En la **descripción de cada PR** escribe:

- Qué rutas has hecho.
- La tabla de pruebas de esa parte con el código que te ha salido a ti.

Si un check sale en rojo ❌: pulsa **Details**, lee el error, arréglalo y haz `git push` en la **misma rama**. La PR se actualiza sola.

> Antes de hacer `push`, pasa `npm run lint` y `npm run typecheck` en tu ordenador. Es más rápido que esperar al CI.

---

# PARTE 1 — Conecta con la base de datos de Rastro

**Rama:** `feature/database-connection`

## 1.1 Carga los datos

Usamos el mismo contenedor de la clase de MongoDB, `mongodb-practica`. Arráncalo:

```bash
docker start mongodb-practica
```

> ¿No lo tienes? Crea el `compose.yaml` del apartado 1 del apunte [02b. Express + MongoDB](../sesiones/backend/02b_express_mongodb.md) y ejecuta `docker compose up -d`.

Entra en `mongosh`:

```bash
docker exec -it mongodb-practica mongosh -u admin -p admin_dev_123 --authenticationDatabase admin
```

Primero, borra la base de datos `rastro` de la entrega anterior para empezar de cero:

```javascript
use rastro
db.dropDatabase()
```

Ahora copia y ejecuta **todo** este bloque. Son los datos de la entrega de MongoDB, con los nombres en inglés:

```javascript
db.users.insertMany([
  { _id: ObjectId("660000000000000000000001"), name: "Ana García",  email: "ana@rastro.es",   city: "Valencia",  joinedAt: new Date("2025-03-10"), favorites: [ObjectId("670000000000000000000008")], ratingAverage: 0, ratingCount: 0 },
  { _id: ObjectId("660000000000000000000002"), name: "Luis Martín", email: "luis@rastro.es",  city: "Valencia",  joinedAt: new Date("2024-11-02"), favorites: [], ratingAverage: 0, ratingCount: 0 },
  { _id: ObjectId("660000000000000000000003"), name: "Marta Ruiz",  email: "marta@rastro.es", city: "Alicante",  joinedAt: new Date("2025-06-21"), favorites: [], ratingAverage: 5, ratingCount: 1 },
  { _id: ObjectId("660000000000000000000004"), name: "Hugo Sanz",   email: "hugo@rastro.es",  city: "Castellón", joinedAt: new Date("2026-01-15"), favorites: [], ratingAverage: 0, ratingCount: 0 },
  { _id: ObjectId("660000000000000000000005"), name: "Sara López",  email: "sara@rastro.es",  city: "Valencia",  joinedAt: new Date("2026-09-30"), favorites: [ObjectId("670000000000000000000001"), ObjectId("670000000000000000000003"), ObjectId("670000000000000000000008")], ratingAverage: 0, ratingCount: 0 }
])

db.listings.insertMany([
  { _id: ObjectId("670000000000000000000001"), title: "Seat Ibiza 2015", description: "Siempre en garaje, ITV pasada.", price: 6500, category: "Cars", status: "AVAILABLE", city: "Valencia", publishedAt: new Date("2026-10-01"), views: 340,
    seller: { id: ObjectId("660000000000000000000002"), name: "Luis Martín" },
    photos: [ { url: "https://img.rastro.es/a1-1.jpg", order: 1 }, { url: "https://img.rastro.es/a1-2.jpg", order: 2 } ],
    attributes: { brand: "Seat", model: "Ibiza", year: 2015, km: 98000, fuel: "petrol" } },
  { _id: ObjectId("670000000000000000000002"), title: "Ford Focus 2012", description: "Correa cambiada hace un año.", price: 4200, category: "Cars", status: "AVAILABLE", city: "Castellón", publishedAt: new Date("2026-10-12"), views: 95,
    seller: { id: ObjectId("660000000000000000000004"), name: "Hugo Sanz" },
    photos: [ { url: "https://img.rastro.es/a2-1.jpg", order: 1 } ],
    attributes: { brand: "Ford", model: "Focus", year: 2012, km: 165000, fuel: "diesel" } },
  { _id: ObjectId("670000000000000000000003"), title: "iPhone 13 128 GB", description: "Con funda y cargador.", price: 380, category: "Phones", status: "AVAILABLE", city: "Valencia", publishedAt: new Date("2026-10-20"), views: 512,
    seller: { id: ObjectId("660000000000000000000001"), name: "Ana García" },
    photos: [ { url: "https://img.rastro.es/a3-1.jpg", order: 1 }, { url: "https://img.rastro.es/a3-2.jpg", order: 2 }, { url: "https://img.rastro.es/a3-3.jpg", order: 3 } ],
    attributes: { brand: "Apple", model: "iPhone 13", storageGB: 128, batteryPct: 87 } },
  { _id: ObjectId("670000000000000000000004"), title: "Samsung Galaxy A52", description: "Pantalla sin rayas.", price: 150, category: "Phones", status: "SOLD", city: "Alicante", publishedAt: new Date("2026-09-05"), views: 210,
    seller: { id: ObjectId("660000000000000000000003"), name: "Marta Ruiz" },
    photos: [ { url: "https://img.rastro.es/a4-1.jpg", order: 1 } ],
    attributes: { brand: "Samsung", model: "Galaxy A52", storageGB: 128, batteryPct: 80 } },
  { _id: ObjectId("670000000000000000000005"), title: "Xiaomi Redmi Note 10", description: "Funciona perfecto.", price: 90, category: "Phones", status: "AVAILABLE", city: "Valencia", publishedAt: new Date("2026-10-22"), views: 48,
    seller: { id: ObjectId("660000000000000000000002"), name: "Luis Martín" },
    photos: [ { url: "https://img.rastro.es/a5-1.jpg", order: 1 } ],
    attributes: { brand: "Xiaomi", model: "Redmi Note 10", storageGB: 64, batteryPct: 91 } },
  { _id: ObjectId("670000000000000000000006"), title: "Chaqueta vaquera Levi's", description: "Poco uso.", price: 25, category: "Clothes", status: "AVAILABLE", city: "Alicante", publishedAt: new Date("2026-10-25"), views: 12,
    seller: { id: ObjectId("660000000000000000000003"), name: "Marta Ruiz" },
    photos: [],
    attributes: { size: "M", brand: "Levi's", gender: "unisex" } },
  { _id: ObjectId("670000000000000000000007"), title: "Zapatillas Nike Air", description: "Talla 42, como nuevas.", price: 40, category: "Clothes", status: "RESERVED", city: "Valencia", publishedAt: new Date("2026-10-18"), views: 77,
    seller: { id: ObjectId("660000000000000000000001"), name: "Ana García" },
    photos: [ { url: "https://img.rastro.es/a7-1.jpg", order: 1 } ],
    attributes: { size: "42", brand: "Nike", gender: "men" } },
  { _id: ObjectId("670000000000000000000008"), title: "Mesa de comedor de roble", description: "Para 6 personas.", price: 120, category: "Furniture", status: "AVAILABLE", city: "Castellón", publishedAt: new Date("2026-10-26"), views: 160,
    seller: { id: ObjectId("660000000000000000000004"), name: "Hugo Sanz" },
    photos: [ { url: "https://img.rastro.es/a8-1.jpg", order: 1 } ],
    attributes: { material: "oak", width: 160, depth: 90, height: 75 } }
])

db.offers.insertMany([
  { _id: ObjectId("680000000000000000000001"), amount: 340, status: "PENDING", createdAt: new Date("2026-10-27"),
    listing: { id: ObjectId("670000000000000000000003"), title: "iPhone 13 128 GB", price: 380 },
    buyer: { id: ObjectId("660000000000000000000005"), name: "Sara López" } },
  { _id: ObjectId("680000000000000000000002"), amount: 6000, status: "REJECTED", createdAt: new Date("2026-10-05"),
    listing: { id: ObjectId("670000000000000000000001"), title: "Seat Ibiza 2015", price: 6500 },
    buyer: { id: ObjectId("660000000000000000000001"), name: "Ana García" } },
  { _id: ObjectId("680000000000000000000003"), amount: 6200, status: "PENDING", createdAt: new Date("2026-10-26"),
    listing: { id: ObjectId("670000000000000000000001"), title: "Seat Ibiza 2015", price: 6500 },
    buyer: { id: ObjectId("660000000000000000000005"), name: "Sara López" } },
  { _id: ObjectId("680000000000000000000004"), amount: 150, status: "ACCEPTED", createdAt: new Date("2026-09-10"),
    listing: { id: ObjectId("670000000000000000000004"), title: "Samsung Galaxy A52", price: 150 },
    buyer: { id: ObjectId("660000000000000000000004"), name: "Hugo Sanz" } },
  { _id: ObjectId("680000000000000000000005"), amount: 35, status: "ACCEPTED", createdAt: new Date("2026-10-27"),
    listing: { id: ObjectId("670000000000000000000007"), title: "Zapatillas Nike Air", price: 40 },
    buyer: { id: ObjectId("660000000000000000000002"), name: "Luis Martín" } }
])

db.reviews.insertOne({
  listingId: ObjectId("670000000000000000000004"),
  author: { id: ObjectId("660000000000000000000004"), name: "Hugo Sanz" },
  reviewedUserId: ObjectId("660000000000000000000003"),
  stars: 5, comment: "Todo perfecto", createdAt: new Date("2026-09-15")
})
```

Y crea los índices:

```javascript
db.users.createIndex({ email: 1 }, { unique: true })
db.reviews.createIndex({ "author.id": 1, listingId: 1 }, { unique: true })
db.listings.createIndex({ category: 1, price: 1 })
```

Comprueba que hay 5 usuarios, 8 anuncios, 5 ofertas y 1 valoración:

```javascript
db.users.countDocuments()
db.listings.countDocuments()
db.offers.countDocuments()
db.reviews.countDocuments()
```

**Cuando quieras volver a empezar** (porque tus pruebas han cambiado los datos), repite este apartado entero: `dropDatabase`, datos e índices.

## 1.2 La configuración: `.env`

Crea el archivo `.env` en la raíz:

```env
MONGODB_URI=mongodb://admin:admin_dev_123@localhost:27017/?authSource=admin
DB_NAME=rastro
```

`.env` **no se sube** a Git: ya está en el `.gitignore`. Pero tus compañeros (y tú, en otro ordenador) necesitan saber qué variables hacen falta. Para eso se sube una copia sin secretos llamada `.env.example`:

```env
MONGODB_URI=mongodb://usuario:contraseña@localhost:27017/?authSource=admin
DB_NAME=rastro
```

## 1.3 Los tipos: `src/types.ts`

Es el modelo de la entrega de MongoDB escrito en TypeScript. Así el editor te avisará si escribes mal un campo. Cópialo tal cual.

```ts
import type { ObjectId } from "mongodb";

// Cómo son los documentos de cada colección.
// Es el modelo de la entrega de MongoDB, con los nombres en inglés.

export type ListingStatus = "AVAILABLE" | "RESERVED" | "SOLD";
export type OfferStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type User = {
  name: string;
  email: string;
  city: string;
  joinedAt: Date;
  favorites: ObjectId[];
  ratingAverage: number;
  ratingCount: number;
};

export type Listing = {
  title: string;
  description: string;
  price: number;
  category: string;
  status: ListingStatus;
  city: string;
  publishedAt: Date;
  views: number;
  seller: { id: ObjectId; name: string };
  photos: { url: string; order: number }[];
  attributes: Record<string, unknown>;
};

export type Offer = {
  amount: number;
  status: OfferStatus;
  createdAt: Date;
  listing: { id: ObjectId; title: string; price: number };
  buyer: { id: ObjectId; name: string };
};
```

- `"AVAILABLE" | "RESERVED" | "SOLD"`: el estado solo puede ser uno de esos tres textos.
- `Record<string, unknown>`: un objeto con cualquier clave. Son los `attributes`, distintos en cada categoría.

## 1.4 La conexión: `src/db.ts`

Es el `db.ts` del apunte 02b con dos cambios: una función por colección y un tiempo de espera más corto.

```ts
import { Db, MongoClient } from "mongodb";
import type { Listing, Offer, User } from "./types";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Falta MONGODB_URI en el archivo .env");
}

// Si MongoDB no responde, se rinde a los 5 segundos (por defecto son 30)
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

let db: Db;

export async function connectDb() {
  await client.connect();
  db = client.db(process.env.DB_NAME ?? "rastro");
  console.log(`Conectado a MongoDB (base de datos ${db.databaseName})`);
}

export function getDb() {
  return db;
}

export function usersCollection() {
  return getDb().collection<User>("users");
}

export function listingsCollection() {
  return getDb().collection<Listing>("listings");
}

export function offersCollection() {
  return getDb().collection<Offer>("offers");
}
```

## 1.5 El servidor: `src/index.ts`

Sustituye tu `index.ts` por este. Es el del apunte 02 (registro, JSON, 404 y errores) más la conexión del 02b:

```ts
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { connectDb, getDb } from "./db";

const app = express();
const PORT = 3000;

// 1. Registrar cada petición en la terminal
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// 2. Leer bodies JSON
app.use(express.json());

// 3. Rutas
app.get("/api/health", async (_req, res) => {
  await getDb().command({ ping: 1 }); // pregunta a MongoDB "¿estás ahí?"
  res.json({ status: "ok", db: getDb().databaseName });
});

// (aquí irán los routers de las próximas partes)

// 4. Ninguna ruta ha respondido: 404
app.use((req, res) => {
  res.status(404).json({ error: `No existe la ruta ${req.method} ${req.url}` });
});

// 5. Ha ocurrido un error: respuesta JSON sin detalles internos
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: "El body no es un JSON válido" });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

async function start() {
  await connectDb();

  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
}

start();
```

Arranca con `npm run dev`. Tienes que ver:

```text
Conectado a MongoDB (base de datos rastro)
Servidor escuchando en http://localhost:3000
```

### Ejercicio 1

Con la API arrancada, pide `GET /api/health`. Después para MongoDB (`docker stop mongodb-practica`) y vuelve a pedirlo.

**Pregunta 1:** ¿qué código recibes con MongoDB parado? ¿Qué parte de `index.ts` ha respondido?

Vuelve a arrancar MongoDB (`docker start mongodb-practica`). Después: commit, push, PR, checks en verde y merge.

---

# PARTE 2 — Leer anuncios

**Rama:** `feature/read-listings`

Crea `src/routes/listings.ts` y móntalo en `index.ts`, en el sitio del comentario «aquí irán los routers»:

```ts
import listingsRouter from "./routes/listings";   // arriba, con los demás import
```

```ts
app.use("/api/listings", listingsRouter);
```

## 2.1 Ejemplo resuelto: el listado

La pantalla de resultados de Rastro enseña una lista de anuncios. **No** necesita la descripción, las fotos ni los atributos: eso es de la ficha.

```ts
import { Router } from "express";
import { ObjectId } from "mongodb";
import { listingsCollection } from "../db";

const router = Router();

// Lo que se enseña de cada anuncio en un listado
const LIST_FIELDS = { title: 1, price: 1, category: 1, city: 1, status: 1 };

// ---------- GET /api/listings (listado) ----------
router.get("/", async (_req, res) => {
  const listings = await listingsCollection()
    .find()
    .project(LIST_FIELDS)
    .sort({ publishedAt: -1 })
    .toArray();

  res.json(listings);
});

export default router;
```

- `.project(...)` es la **proyección** de `mongosh`: qué campos devolver. El `_id` sale siempre.
- `.sort({ publishedAt: -1 })`: los más recientes primero.

Pídelo. Tienen que salir 8 anuncios; el primero, la mesa de roble.

## 2.2 Ahora tú: la ficha de un anuncio

### Ejercicio 2

Programa `GET /api/listings/:id`. Devuelve el anuncio **completo** y, como alguien acaba de abrir la ficha, **suma 1 a sus `views`**.

Pistas:

- Para el `400` y el `404`, copia la idea del apartado 4.3 del apunte 02b.
- Para sumar y devolver el documento a la vez, usa `findOneAndUpdate` (apunte 02b, apartado 4.5) con `$inc` en lugar de `$set`, y `returnDocument: "after"`.

**Tabla de pruebas:**

| Petición | Resultado esperado |
|---|---|
| `GET /api/listings/670000000000000000000003` | `200`, el iPhone completo y `views: 513` |
| La misma petición otra vez | `200` y `views: 514` |
| `GET /api/listings/abc` | `400` |
| `GET /api/listings/670000000000000000000099` | `404` |

---

# PARTE 3 — Filtrar anuncios

**Rama:** `feature/listing-filters`

La app tiene un buscador. El cliente envía lo que busca en **query params**:

```text
GET /api/listings?category=Cars&city=Valencia&maxPrice=5000
```

## 3.1 Rómpelo a propósito: pasar `req.query` tal cual

### Ejercicio 3.1

Cambia **temporalmente** el `find()` del listado por `find(req.query)` y prueba:

1. `GET /api/listings?category=Cars` → funciona.
2. `GET /api/listings?price=380` → no encuentra el iPhone.

**Pregunta 2:** ¿por qué la segunda no encuentra nada? Pista: ¿en qué formato llega todo lo que viene en una URL?

Después vuelve a dejar `find()`. Por esto, y porque el cliente podría filtrar por campos que no quieres, cada filtro se construye a mano.

## 3.2 Ejemplo resuelto: filtrar por categoría

```ts
import type { Filter } from "mongodb";
import type { Listing } from "../types";
```

```ts
router.get("/", async (req, res) => {
  const filter: Filter<Listing> = {};

  if (typeof req.query.category === "string") {
    filter.category = req.query.category;
  }

  const listings = await listingsCollection()
    .find(filter)
    .project(LIST_FIELDS)
    .sort({ publishedAt: -1 })
    .toArray();

  res.json(listings);
});
```

- `Filter<Listing>` es un filtro de MongoDB sobre anuncios. Empieza vacío `{}`: sin filtro, salen todos.
- Solo añadimos `category` si ha llegado **y es un texto**.

## 3.3 Ahora tú: ciudad y precio máximo

### Ejercicio 3.2

Añade dos filtros más. Son opcionales y se pueden combinar con `category`.

| Query param | Qué hace | Si llega mal |
|---|---|---|
| `city` | Solo los anuncios de esa ciudad | — |
| `maxPrice` | Solo los de precio menor o igual | `400` si no es un número |

Pista para `maxPrice`: llega como texto. Conviértelo con `Number(...)` y comprueba con `Number.isNaN(...)` si ha salido un número. El filtro queda así: `{ price: { $lte: 400 } }`.

**Tabla de pruebas:**

| Petición | Resultado esperado |
|---|---|
| `?category=Cars` | `200`, 2 anuncios |
| `?city=Valencia` | `200`, 4 anuncios |
| `?maxPrice=100` | `200`, 3 anuncios (Xiaomi, chaqueta y zapatillas) |
| `?category=Phones&city=Valencia&maxPrice=400` | `200`, 2 anuncios (Xiaomi e iPhone) |
| `?maxPrice=abc` | `400` |

---

# PARTE 4 — Publicar un anuncio

**Rama:** `feature/create-listing`

### Ejercicio 4

Programa `POST /api/listings`. El cliente envía:

```json
{
  "title": "Bicicleta de montaña Orbea",
  "description": "Revisada en taller.",
  "price": 300,
  "category": "Sports",
  "city": "Castellón",
  "sellerId": "660000000000000000000004",
  "attributes": { "size": "L", "type": "mountain", "wheelInches": 29 }
}
```

Y la API guarda (y devuelve con `201`):

```json
{
  "_id": "…generado por MongoDB…",
  "title": "Bicicleta de montaña Orbea",
  "description": "Revisada en taller.",
  "price": 300,
  "category": "Sports",
  "status": "AVAILABLE",
  "city": "Castellón",
  "publishedAt": "…la fecha de ahora…",
  "views": 0,
  "seller": { "id": "660000000000000000000004", "name": "Hugo Sanz" },
  "photos": [],
  "attributes": { "size": "L", "type": "mountain", "wheelInches": 29 }
}
```

Fíjate en lo que **no** envía el cliente y pone la API:

- `status`, `publishedAt`, `views` y `photos`: un anuncio nuevo siempre está `AVAILABLE`, con la fecha de ahora, 0 visitas y sin fotos.
- `seller.name`: se **copia** del usuario. Es la desnormalización de la entrega de MongoDB.

Las reglas:

| Campo | Regla |
|---|---|
| `title`, `description`, `category`, `city` | Obligatorios. Texto no vacío. |
| `price` | Obligatorio. Número mayor o igual que 0. |
| `sellerId` | Obligatorio. Formato de ObjectId **y** tiene que existir en `users`. |
| `attributes` | Opcional. Si no llega, `{}`. |
| Cualquier otro campo | Se ignora. |

### Ejemplo resuelto: comprobar que el vendedor existe

En la entrega de MongoDB guardaste un anuncio de un vendedor que no existía, y MongoDB no se quejó. ¿Quién debe comprobarlo? Tu API.

```ts
if (typeof body.sellerId !== "string" || !ObjectId.isValid(body.sellerId)) {
  res.status(400).json({ error: "sellerId no tiene un formato válido" });
  return;
}

// MongoDB no comprueba las referencias: lo hacemos nosotros
const seller = await usersCollection().findOne({ _id: new ObjectId(body.sellerId) });
if (!seller) {
  res.status(400).json({ error: "No existe ningún usuario con ese sellerId" });
  return;
}
```

Con `seller` ya tienes el `_id` y el `name` para construir `seller: { id, name }`.

**Importante:** construye el anuncio nuevo campo a campo. **Nunca** guardes `req.body` tal cual (apunte 02b, apartado 4.4).

**Tabla de pruebas:**

| Petición | Resultado esperado |
|---|---|
| El body de arriba | `201`, la bici con `status`, `views` y `seller` como en el ejemplo |
| El mismo body con `"views": 9999, "status": "SOLD"` | `201`, pero con `views: 0` y `AVAILABLE` |
| `"price": "75"` (texto) | `400` |
| Sin `title` | `400` |
| `"sellerId": "660000000000000000000099"` | `400` (no existe) |

**Pregunta 3:** ¿por qué la API ignora `views` y `status` si el cliente los envía? ¿Qué podría hacer alguien si no los ignorara?

---

# PARTE 5 — Cambiar el precio y borrar

**Rama:** `feature/update-delete-listing`

### Ejercicio 5.1

Programa `PATCH /api/listings/:id` para **cambiar el precio**. El body es `{ "price": 80 }`.

- `price` tiene que ser un número mayor o igual que 0. Si no: `400`.
- Cualquier otro campo se ignora.
- Devuelve el anuncio ya modificado (`findOneAndUpdate` con `$set`).

### Ejercicio 5.2

Programa `DELETE /api/listings/:id`: `204` si lo borra, `404` si no existía.

**Tabla de pruebas:**

| Petición | Resultado esperado |
|---|---|
| `PATCH /api/listings/670000000000000000000005` con `{ "price": 80 }` | `200`, el Xiaomi con `price: 80` |
| El mismo con `{ "price": "barato" }` | `400` |
| `PATCH /api/listings/670000000000000000000099` con `{ "price": 1 }` | `404` |
| `DELETE /api/listings/670000000000000000000006` | `204` |
| El mismo `DELETE` otra vez | `404` |

**Pregunta 4:** Ana baja el iPhone de 380 a 350 €. La oferta de Sara guarda una copia: `listing.price: 380`. ¿Debe tu `PATCH` cambiar también esa copia? ¿Por qué?

---

# PARTE 6 — Ofertas

**Rama:** `feature/offers`

Crea `src/routes/offers.ts` y móntalo en `/api/offers`.

### Ejercicio 6.1

`POST /api/offers`. El cliente envía:

```json
{ "listingId": "670000000000000000000008", "buyerId": "660000000000000000000002", "amount": 100 }
```

Comprueba, **en este orden**:

| # | Comprobación | Si falla |
|---|---|---|
| 1 | `listingId` y `buyerId` tienen formato de ObjectId | `400` |
| 2 | `amount` es un número mayor que 0 | `400` |
| 3 | El anuncio existe | `400` |
| 4 | El comprador existe | `400` |
| 5 | El anuncio está `AVAILABLE` | `409` |

Si todo va bien, guarda la oferta con `status: "PENDING"`, `createdAt` con la fecha de ahora y las copias: `listing: { id, title, price }` y `buyer: { id, name }`. Responde `201`.

### Ejercicio 6.2

`GET /api/listings/:id/offers` devuelve las ofertas de un anuncio. `404` si el anuncio no existe. Va en `listings.ts`.

Pista: las ofertas guardan el id del anuncio en `listing.id`.

**Tabla de pruebas:**

| Petición | Resultado esperado |
|---|---|
| `POST` Luis (`…002`) ofrece 100 € por la mesa (`…008`) | `201`, con `listing.price: 120` y `buyer.name: "Luis Martín"` |
| `POST` Sara (`…005`) ofrece 100 € por el Samsung (`…004`) | `409` (está vendido) |
| `POST` con `"amount": 0` | `400` |
| `POST` con un `listingId` que no existe | `400` |
| `GET /api/listings/670000000000000000000001/offers` | `200`, 2 ofertas del Seat |
| `GET /api/listings/670000000000000000000099/offers` | `404` |

**Pregunta 5:** ¿por qué ofertar por un anuncio vendido es `409` y no `400`?

**Pregunta 6:** ¿qué comprueba MongoDB por ti en esta API? ¿Y qué has tenido que comprobar tú en el código? Pon un ejemplo de cada.

---

## Entrega

Entrega en Moodle la **URL del repositorio** `api-rastro`. En el repositorio tiene que haber:

- [ ] `.github/workflows/ci.yml` y la rama `main` protegida (Parte 0).
- [ ] Una rama `feature/...` y una PR **fusionada** por cada parte (1 a 6), con los checks en verde y la tabla de pruebas en la descripción.
- [ ] `.env.example` subido y `.env` **no** subido.
- [ ] `respuestas.md` con la línea del Ejercicio 0 y las preguntas 1 a 6 (una o dos frases cada una).

Se valora como **Apto** si: la API arranca con `npm run dev`, las rutas responden los códigos de las tablas de pruebas, el CI está en verde y las respuestas están explicadas con tus palabras. Si algo no funciona, explica en la PR qué has probado.

## Si algo falla

- **`Falta MONGODB_URI en el archivo .env`**: no existe `.env` en la raíz, o falta `--env-file=.env` en el script `dev`.
- **`ECONNREFUSED 127.0.0.1:27017`**: MongoDB no está arrancado. `docker start mongodb-practica`.
- **`Authentication failed`**: la URI del `.env` está mal escrita o le falta `?authSource=admin`. Cópiala del apartado 1.2.
- **Las listas salen vacías**: `DB_NAME` no es `rastro`, o no has cargado los datos (apartado 1.1). Si en `mongosh` ves `usuarios` o `anuncios`, son los de la entrega anterior: haz el `dropDatabase` y carga los nuevos.
- **Un filtro no encuentra nada y no da error**: revisa mayúsculas (`Cars`, no `cars`).
- **`req.body` es `undefined`**: falta la cabecera `Content-Type: application/json` en la petición.
- **No encuentra un anuncio que sí existe**: estás buscando el texto en lugar de `new ObjectId(texto)`.
- **`Cannot set headers after they are sent`**: falta un `return` después de responder.
- **El check `lint` sale en rojo**: pulsa **Details** y lee qué regla y qué línea. Pasa `npm run lint` en tu ordenador hasta que no salga nada.
- **`npm ci` falla en el CI**: no has subido `package-lock.json`, o instalaste algo y no subiste el nuevo.
- **ESLint da un error de `typescript`**: tienes TypeScript 7. `npm install -D typescript@~6.0`.
- **`git push` a `main` da error**: es la protección de la Parte 0. Trabaja en una rama `feature/...` y abre una PR.
- **Tus resultados no coinciden con las tablas**: tus pruebas han cambiado los datos. Vuelve a cargarlos (apartado 1.1).

## Retos opcionales

Para quien termine antes. Cada uno en su rama `feature/...` y con su PR.

1. **Aceptar una oferta** (`feature/accept-offer`). `PATCH /api/offers/:id` con `{ "status": "ACCEPTED" }`: la oferta pasa a `ACCEPTED` y el anuncio a `RESERVED`. `409` si la oferta no está `PENDING`. Son dos escrituras: ¿qué pasa si el servidor se apaga entre una y otra?
2. **Tu propio anuncio** (`feature/own-listing-offer`). Un usuario no puede ofertar por su propio anuncio (`400`). Pista: dos `ObjectId` no se comparan con `===`; busca el método `equals`.
3. **Estadísticas** (`feature/listing-stats`). `GET /api/listings/stats` devuelve, por categoría, cuántos anuncios hay y el precio medio. Escríbela **después** de `router.get("/:id", ...)`. ¿Qué código devuelve? ¿Por qué? Arréglalo.
4. **Comprobar los tipos en el CI** (`feature/ci-typecheck`). Añade al job `lint` del `ci.yml` un paso que ejecute `npm run typecheck`.

## Documentación para consultar

- [Driver de MongoDB para Node.js](https://www.mongodb.com/docs/drivers/node/current/)
- [Driver: operaciones CRUD](https://www.mongodb.com/docs/drivers/node/current/crud/)
- [MongoDB: operadores de consulta](https://www.mongodb.com/docs/manual/reference/operator/query/)
- [MongoDB: operadores de actualización](https://www.mongodb.com/docs/manual/reference/operator/update/)
- [MDN: códigos de estado HTTP](https://developer.mozilla.org/es/docs/Web/HTTP/Reference/Status)
- [Instrucciones del CI mínimo (con capturas)](https://github.com/TheBridge-FullStackDeveloper/temario_fullstack_FT_LABORA_sept26/tree/master/sesiones/devops/instrucciones_ci)

Si usas IA para resolver dudas, pídele que te **explique** el error o te dé una **pista**, no la ruta entera. En la corrección tendrás que saber explicar cada comprobación que hace tu código.

## Puesta en marcha de la implementación (Partes 0 y 1)

Necesitas Node.js 24 y el contenedor `mongodb-practica` configurado como indica el apartado 1.1.

1. Ejecuta `npm ci`.
2. Copia `.env.example` a `.env` y completa la URI con las credenciales de tu MongoDB local. No subas `.env` a Git.
3. Ejecuta `docker start mongodb-practica` y carga los datos e índices del apartado 1.1 si aún no los tienes.
4. Arranca la API con `npm run dev`.
5. Pide `GET http://localhost:3000/api/health`: debe devolver `200` y `{"status":"ok","db":"rastro"}`.

Antes de subir cambios: `npm run lint` y `npm run typecheck`.

La Parte 1 añade registro de peticiones, lectura de JSON, respuesta JSON para rutas inexistentes (404) y manejo de errores (400 para JSON inválido, 500 genérico para errores internos). La API empieza a escuchar después de conectar con MongoDB y el ping de health comprueba que la base responde.

En esta ejecución se conservaron las colecciones anteriores en español y se cargaron las nuevas en inglés, sin ejecutar `dropDatabase()`. La API utiliza únicamente `users`, `listings` y `offers`; también se cargó `reviews` para los datos de la entrega.

## Consulta de anuncios (Parte 2)

Con la API arrancada con `npm run dev`:

```bash
curl http://localhost:3000/api/listings
curl http://localhost:3000/api/listings/670000000000000000000003
```

- `GET /api/listings`: devuelve `_id`, `title`, `price`, `category`, `city` y `status`, con los anuncios más recientes primero. No incrementa visitas.
- `GET /api/listings/:id`: devuelve la ficha completa y suma una visita con `$inc`. Con los datos iniciales, el iPhone pasa de 512 a 513 visitas en la primera consulta y a 514 en la segunda.
- Un ID mal formado devuelve `400`; un ID válido sin anuncio devuelve `404`. Los errores mantienen el formato JSON `{ "error": "mensaje" }`.

## Filtros de anuncios (Parte 3)

`GET /api/listings` acepta filtros opcionales y combinables:

| Parámetro | Comportamiento |
| --- | --- |
| `category` | Coincidencia exacta con la categoría, respetando mayúsculas. |
| `city` | Coincidencia exacta con la ciudad. |
| `maxPrice` | Precio menor o igual al número indicado. Un valor inválido, vacío, repetido o no finito devuelve `400`. |

```bash
curl 'http://localhost:3000/api/listings?category=Phones&city=Valencia&maxPrice=400'
```

Con los datos iniciales devuelve el Xiaomi y el iPhone. Sin filtros devuelve los ocho anuncios. Se mantienen los campos resumidos y el orden por fecha; los parámetros que no están permitidos se ignoran. Los filtros de categoría y ciudad solo se aplican cuando el valor recibido es un texto.

## Publicar un anuncio (Parte 4)

`POST /api/listings` recibe JSON con `title`, `description`, `category` y `city` como textos no vacíos, `price` como número finito mayor o igual que cero y `sellerId` como ObjectId de un usuario existente. `attributes` es opcional y debe ser un objeto; si se omite, se guarda `{}`.

```bash
curl -X POST http://localhost:3000/api/listings \
  -H 'Content-Type: application/json' \
  -d '{"title":"Bicicleta de montaña Orbea","description":"Revisada en taller.","price":300,"category":"Sports","city":"Castellón","sellerId":"660000000000000000000004","attributes":{"size":"L","type":"mountain","wheelInches":29}}'
```

Responde `201` con el anuncio y su `_id`. La API fija `status: "AVAILABLE"`, `views: 0`, `photos: []` y la fecha actual; copia el identificador y nombre del vendedor desde `users`. Ignora los demás campos del cliente, incluidos intentos de enviar un `_id`, estado, visitas o vendedor alternativos. Los datos inválidos devuelven `400` en JSON, también cuando el sellerId tiene formato correcto pero no existe.

## Cambiar el precio y borrar (Parte 5)

`PATCH /api/listings/:id` recibe `{ "price": 80 }`: exige un número finito mayor o igual que cero, ignora los demás campos y responde `200` con el anuncio actualizado. Usa `$set` y no incrementa visitas ni cambia los precios copiados en las ofertas.

```bash
curl -X PATCH http://localhost:3000/api/listings/670000000000000000000005 \
  -H 'Content-Type: application/json' -d '{"price":80}'
```

`DELETE /api/listings/:id` borra ese anuncio y devuelve `204` sin cuerpo. Una segunda petición al mismo ID devuelve `404`. Este borrado elimina únicamente el anuncio, sin borrar ofertas ni otras referencias.

Ambas rutas devuelven `400` para un ID mal formado y `404` para un ID válido inexistente. En PATCH, un precio ausente o inválido devuelve `400`.
