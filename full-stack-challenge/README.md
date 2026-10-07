# Dynapredict

Solução do [Dynamox Full-Stack Developer Challenge](../full-stack-challenge.md).

[English version below](#english)

## Português

Aplicação para cadastrar máquinas, pontos de monitoramento e sensores, enviar leituras de sensores como séries temporais e visualizá-las em gráfico, com métricas e previsão.

Monorepo Nx com três projetos:

- `apps/api`: Express 5, TypeScript, Prisma 7 e PostgreSQL 16.
- `apps/web`: React 19, Vite, Redux Toolkit (thunks com `createAsyncThunk`), MUI 5, Recharts e react-hook-form.
- `packages/shared-types`: enums, DTOs e a regra sensor × máquina, usados pela API e pelo web.

Os testes E2E (Cypress) ficam em `apps/web-e2e`.

### Pré-requisitos

Node 24 e Docker com Compose.

### Rodando com Docker

```bash
docker compose up -d --build
```

O web fica em http://localhost:8080 e a API em http://localhost:3333/api/v1. As migrations rodam quando a API sobe, mas o banco começa vazio. Para carregar os dados de demonstração (2 máquinas, pontos, sensores e 24 h de leituras por sensor):

```bash
cp .env.example .env
npm ci
npx prisma db seed
```

Se as portas 3333 ou 8080 estiverem ocupadas, use `API_PORT=3334 WEB_PORT=8081 docker compose up -d --build`.

### Credenciais

```
email: admin@dynapredict.com
senha: dynapredict123
```

### Rodando sem Docker (desenvolvimento)

```bash
docker compose up -d postgres
cp .env.example .env
npm ci
npx prisma migrate deploy
npx prisma db seed
npx nx serve api    # http://localhost:3333
npx nx serve web    # http://localhost:4200
```

As variáveis de ambiente estão comentadas em `.env.example`. A API valida todas no boot e não sobe se faltar alguma.

### Testes e qualidade

```bash
docker compose up -d postgres-test        # banco efêmero na porta 5433
npx nx run-many -t test --coverage        # unitários e integração (Vitest)
npm run lint && npm run typecheck
docker compose up -d --wait api web
npx nx e2e web-e2e                        # Cypress, roda dentro de um container
```

Os testes da API rodam contra um Postgres real, não contra mocks. O CI (`.github/workflows/ci.yml`, na raiz do repositório) roda lint, typecheck, build, testes com cobertura e SonarCloud.

### API

Todas as rotas usam o prefixo `/api/v1`. Só `/health` e `/auth/login` são públicas.

| Recurso  | Rotas                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth     | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`                                                                                         |
| Máquinas | `GET, POST /machines`, `GET, PUT, DELETE /machines/:id`                                                                                         |
| Pontos   | `POST /machines/:machineId/monitoring-points`, `GET /monitoring-points?page&pageSize&sortBy&sortDir`, `GET, PUT, DELETE /monitoring-points/:id` |
| Sensores | `POST /monitoring-points/:pointId/sensor`, `DELETE /sensors/:id`                                                                                |
| Leituras | `GET, POST, DELETE /sensors/:sensorId/readings`, `GET .../readings/count`, `GET .../readings/metrics`, `GET .../readings/prediction`            |
| Saúde    | `GET /health`                                                                                                                                   |

Os erros seguem o formato `{ error: { code, message, details? } }`: 400 para validação, 401 sem sessão, 404, 409 para conflito e 422 para regra de negócio.

### Upload de leituras

A página de série de um ponto aceita CSV ou JSON:

```csv
timestamp,value
2026-10-03T12:00:00Z,12.5
2026-10-03T12:05:00Z,12.7
```

```json
[{ "timestamp": "2026-10-03T12:00:00Z", "value": 12.5 }]
```

O cabeçalho do CSV é opcional. Com `;` como separador, a vírgula decimal é aceita, como no Excel em pt-BR. O timestamp pode ser ISO 8601 ou epoch em milissegundos; sem fuso, vale o fuso do navegador. Arquivos grandes são enviados em lotes de 1000 leituras. Reenviar o mesmo arquivo não duplica nada.

### Suposições

- Há um único usuário, com email e hash bcrypt definidos por variável de ambiente. Não existe tabela de usuários, e "meus pontos" são todos os pontos do sistema.
- A sessão é um JWT em cookie httpOnly, válido por 8 h.
- Cada ponto de monitoramento tem no máximo um sensor.
- O "ID único" do sensor é o número de série digitado pelo usuário (letras, dígitos, `.`, `-` e `_`). Internamente o sensor também tem um uuid.
- TcAg e TcAs são proibidos em máquinas Pump. A regra vale ao associar o sensor e também ao trocar o tipo da máquina: uma Fan com sensor TcAg não pode virar Pump. A API é quem decide (422); o formulário só antecipa o erro.
- O banco guarda `HF+` como `HFPlus`, porque o Prisma não aceita `+` em enum. A API e a interface mostram `HF+`.
- As leituras pertencem ao sensor. Remover o sensor apaga as leituras dele.
- As exclusões são físicas e em cascata: apagar uma máquina remove pontos, sensores e leituras. O diálogo de confirmação diz o que vai ser apagado.
- "Número de séries temporais armazenadas" foi interpretado como o número de leituras de um sensor, com intervalo de datas opcional.
- Um sensor tem uma leitura por instante. Leituras repetidas no mesmo timestamp são ignoradas.
- Na listagem de pontos, os que não têm sensor aparecem por último na ordem crescente de modelo e primeiro na decrescente.
- O gráfico desenha até 10 mil pontos por vez. As métricas (contagem, mínimo, máximo, média e período) sempre consideram o intervalo inteiro.
- A previsão usa média móvel ou regressão linear sobre as leituras mais recentes. É uma estimativa simples, sem modelo estatístico mais elaborado.
- Load balancer e testes de carga ficaram fora do escopo.

## English

An app to register machines, monitoring points and sensors, upload sensor readings as time series, and view them in a chart with metrics and a forecast.

Nx monorepo with three projects:

- `apps/api`: Express 5, TypeScript, Prisma 7 and PostgreSQL 16.
- `apps/web`: React 19, Vite, Redux Toolkit (thunks with `createAsyncThunk`), MUI 5, Recharts and react-hook-form.
- `packages/shared-types`: enums, DTOs and the sensor × machine rule, shared by the API and the web app.

The E2E tests (Cypress) live in `apps/web-e2e`.

### Prerequisites

Node 24 and Docker with Compose.

### Running with Docker

```bash
docker compose up -d --build
```

The web app runs at http://localhost:8080 and the API at http://localhost:3333/api/v1. Migrations run when the API starts, but the database starts empty. To load the demo data (2 machines, points, sensors and 24 h of readings per sensor):

```bash
cp .env.example .env
npm ci
npx prisma db seed
```

If ports 3333 or 8080 are taken, use `API_PORT=3334 WEB_PORT=8081 docker compose up -d --build`.

### Credentials

```
email:    admin@dynapredict.com
password: dynapredict123
```

### Running without Docker (development)

```bash
docker compose up -d postgres
cp .env.example .env
npm ci
npx prisma migrate deploy
npx prisma db seed
npx nx serve api    # http://localhost:3333
npx nx serve web    # http://localhost:4200
```

`.env.example` documents every environment variable. The API validates them at boot and refuses to start if one is missing.

### Tests and quality

```bash
docker compose up -d postgres-test        # throwaway database on port 5433
npx nx run-many -t test --coverage        # unit and integration (Vitest)
npm run lint && npm run typecheck
docker compose up -d --wait api web
npx nx e2e web-e2e                        # Cypress, runs inside a container
```

The API tests run against a real Postgres instead of mocks. CI (`.github/workflows/ci.yml`, at the repository root) runs lint, typecheck, build, tests with coverage and SonarCloud.

### API

Every route is under `/api/v1`. Only `/health` and `/auth/login` are public.

| Resource | Routes                                                                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth     | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`                                                                                         |
| Machines | `GET, POST /machines`, `GET, PUT, DELETE /machines/:id`                                                                                         |
| Points   | `POST /machines/:machineId/monitoring-points`, `GET /monitoring-points?page&pageSize&sortBy&sortDir`, `GET, PUT, DELETE /monitoring-points/:id` |
| Sensors  | `POST /monitoring-points/:pointId/sensor`, `DELETE /sensors/:id`                                                                                |
| Readings | `GET, POST, DELETE /sensors/:sensorId/readings`, `GET .../readings/count`, `GET .../readings/metrics`, `GET .../readings/prediction`            |
| Health   | `GET /health`                                                                                                                                   |

Errors use the shape `{ error: { code, message, details? } }`: 400 for validation, 401 without a session, 404, 409 for conflicts and 422 for business rules.

### Uploading readings

A point's series page accepts CSV or JSON:

```csv
timestamp,value
2026-10-03T12:00:00Z,12.5
2026-10-03T12:05:00Z,12.7
```

```json
[{ "timestamp": "2026-10-03T12:00:00Z", "value": 12.5 }]
```

The CSV header is optional. With `;` as the separator, a decimal comma is accepted, as pt-BR spreadsheets export it. Timestamps can be ISO 8601 or epoch milliseconds; without an offset, the browser's time zone applies. Large files go up in batches of 1000 readings. Uploading the same file twice adds nothing.

### Assumptions

- There is a single user, whose email and bcrypt hash come from environment variables. There is no users table, and "my monitoring points" means every point in the system.
- The session is a JWT in an httpOnly cookie, valid for 8 h.
- Each monitoring point has at most one sensor.
- The sensor's "unique ID" is the serial number the user types (letters, digits, `.`, `-` and `_`). Internally the sensor also has a uuid.
- TcAg and TcAs are not allowed on Pump machines. The rule applies when attaching a sensor and when changing a machine's type: a Fan with a TcAg sensor cannot become a Pump. The API decides (422); the form only warns early.
- The database stores `HF+` as `HFPlus`, since Prisma enums can't contain `+`. The API and the UI show `HF+`.
- Readings belong to the sensor. Removing a sensor deletes its readings.
- Deletes are physical and cascade: deleting a machine removes its points, sensors and readings. The confirmation dialog says what will be erased.
- "Number of time series stored" is read as the number of readings a sensor has, optionally within a date range.
- A sensor has one reading per instant. A repeated timestamp is skipped.
- In the points listing, points without a sensor come last when sorting by sensor model ascending and first when descending.
- The chart draws up to 10,000 points at a time. Metrics (count, min, max, average and time span) always cover the whole range.
- The forecast is a moving average or a linear regression over the latest readings. It is a simple estimate, not a full statistical model.
- A load balancer and load tests are out of scope.
