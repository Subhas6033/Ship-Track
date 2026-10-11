# Meridian Ocean Freight Tracker

Ocean freight rate search, shipment tracking, invoice checks, and plain text email updates built with React, Vite, Tailwind CSS, Express, MongoDB, and Nodemailer.

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

Vite serves the client at `http://localhost:5173`; the API listens at `http://localhost:5000`. Client API calls use `/api` and are proxied to port 5000 during development. Set `VITE_API_PROXY_TARGET` in `Client/.env` when the development API uses another host. In production, set `VITE_API_URL` to the complete API base URL, including `/api` (for example `https://api.example.com/api`).

MongoDB is required. Set `MONGODB_URI` (or `MONGO_URI`) in `Server/.env`; on startup the API inserts any missing rows from both bundled CSV files, then reads and writes rates and shipments through MongoDB. Existing rate and shipment updates are preserved when the CSV data is seeded again.

## Login and roles

The app opens on a login screen. Passwords are stored as bcrypt hashes. Users can register with their name as the `User` role; public registration cannot create administrators. Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `Server/.env` to seed an administrator account. The signed-in name is shown in the workspace, profile, and time-based greeting. Set `JWT_SECRET` to a long random value to sign sessions. Copy `Server/.env.example` as a reference, then restart the API after changing settings. Accounts persist in MongoDB.

To send mail, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM` in `Server/.env`, then restart the API. Port 465 uses implicit TLS; port 587 uses STARTTLS. The Email updates screen shows whether SMTP settings are present and includes a compose form. Incoming sample text is still parsed separately; SMTP sending does not read an inbox.

## Modules

- **Rate search:** import the organizer CSV, filter by origin, destination, and container size; matching rates are sorted from lowest to highest and the cheapest is highlighted.
- **Shipment tracker:** add shipments, search and filter them, see status and ETA, and update status manually. Overdue shipments are marked delayed unless delivered.
- **Invoice checker:** enter or upload invoice amounts, compare each amount against the matching carrier, route, and container rate, and see the variance.
- **Email updates:** paste one or more plain text emails (or load the sample inbox) to apply recognizable rate and shipment updates. Unmatched and irrelevant messages are reported as skipped.

The Express API is mounted under `/api`. `POST /auth/login` and `POST /auth/register` are public; the remaining workspace endpoints require a bearer token. Primary endpoints include `GET /auth/me`, `GET /rates`, `POST /rates/import`, `GET /routes`, `GET /shipments`, `POST /shipments`, `PATCH /shipments/:id`, `GET /invoices`, `PATCH /invoices/:id`, `GET /emails/sample`, `GET /emails/status`, `POST /emails/send`, and `POST /emails/parse`.
