# Meridian Ocean Freight Tracker

Ocean freight rate search, shipment tracking, invoice checks, and plain text email updates built with React, Vite, Tailwind CSS, Express, and optional MongoDB.

## Run locally

Open two terminals from the project folder:

```sh
cd Server
npm install
npm run dev
```

```sh
cd Client
npm install
npm run dev
```

Vite serves the client at `http://localhost:5173`; the API listens at `http://localhost:5000`. Set `VITE_API_URL` in `Client/.env` if the API is hosted at another address.

The API starts with the sample CSV data in `Server/Data` and keeps changes in memory for the current process. For MongoDB persistence, set `MONGODB_URI` in `Server/.env`; the server seeds empty collections from the bundled sample data on its first connection.

## Modules

- **Rate search:** filter by origin, destination, and container size; rates are sorted from lowest to highest.
- **Shipment tracker:** search and filter shipments, see status and ETA, and update status manually.
- **Invoice checker:** compare shipment invoices against matching carrier, route, and container rates.
- **Email updates:** paste one or more plain text emails (or load the sample inbox) to apply recognizable rate and shipment updates. Unmatched and irrelevant messages are reported as skipped.

The Express API is mounted under `/api`. Primary endpoints include `GET /rates`, `GET /routes`, `GET /shipments`, `PATCH /shipments/:id`, `GET /invoices`, `GET /emails/sample`, and `POST /emails/parse`.
