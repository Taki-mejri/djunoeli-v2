# Djunoeli — Product Requirements Document (PRD)

## 1. Overview

Djunoeli is a delivery / logistics SaaS platform for the Tunisian market. It manages the full lifecycle of a parcel (shipment) from creation by a merchant, through warehouse scanning and driver assignment, to final delivery with cash-on-delivery (COD) collection, and the complete accounting chain (driver settlements, expéditeur settlements, invoices).

The application is a multi-role web app with 5 distinct user spaces, each protected by role-based access control.

- Frontend: React + Vite + TypeScript + Tailwind, runs on `http://localhost:5173`
- Backend API: Node + Express + TypeScript + Prisma + PostgreSQL, runs on `http://localhost:4000`, base path `/api/v1`
- Authentication: JWT access token + rotating refresh token. Login returns an `accessToken`.

## 2. User roles and spaces

There are five roles. After login, each user is redirected to their space based on role.

| Role | Space (route) | Purpose |
|------|---------------|---------|
| SUPER_ADMIN | /admin | Full supervision: manage expéditeurs, livreurs, shipments, assignment, and view finance |
| EXPEDITEUR (merchant) | /expediteur | Create shipments, track them, view COD |
| LIVREUR (driver) | /livreur | Mobile PWA: see assigned jobs, advance delivery status, collect COD |
| DISPATCHER | /dispatch | Warehouse scan stations: reception, sorting, assignment |
| FINANCE_MANAGER | /finance | Driver settlements, expéditeur COD settlements, invoices, reports |

Each space has its own login page: `/admin/login`, `/expediteur/login`, `/livreur/login`, `/dispatch/login`, `/finance/login`.

A user with the wrong role who tries to access a protected space is redirected away (to `/`).
SUPER_ADMIN can also access the /finance space (read and write).

## 3. Test accounts

All test accounts use the seeded clean database:

| Email | Password | Role |
|-------|----------|------|
| admin@djunoeli.tn | Djunoeli2026 | SUPER_ADMIN |
| farah@djunoeli.tn | Farah2026 | FINANCE_MANAGER |
| ali@djunoeli.tn | Ali2026 | DISPATCHER |
| medina@test.tn | Medina2026 | EXPEDITEUR (Medina Store, Tunis) |
| tech@test.tn | TechZone2026 | EXPEDITEUR (TechZone, Sfax) |
| skander@test.tn | Skander2026 | LIVREUR (moto) |
| mohamed@test.tn | Mohamed2026 | LIVREUR (camionnette) |

Primary account for full-system testing: **admin@djunoeli.tn / Djunoeli2026**

## 4. Core features and expected behavior

### 4.1 Authentication
- Login with email + password returns a JWT access token and redirects to the role's home space.
- Invalid credentials return an error and stay on the login page.
- Accessing a protected route without being logged in redirects to the relevant login page.
- Accessing a space for the wrong role redirects the user away.

### 4.2 Shipment creation (EXPEDITEUR)
- An expéditeur creates a shipment with: receiver name, receiver phone, delivery address, delivery city (one of 24 Tunisian governorates), delivery type (STANDARD or EXPRESS), fragile flag, and optional COD amount.
- Delivery price is computed live: STANDARD = 8 DT, EXPRESS = 12 DT, plus 3 DT if fragile.
- Each shipment gets a tracking number in the format TRK-2026-NNNNN.
- New shipments start in status PENDING.

### 4.3 Shipment tracking
- A shipment has an animated progress timeline with 6 visible steps: Créé, Ramassé, Au dépôt, En route, En livraison, Livré.
- The timeline reflects the current status; delivered shows all steps complete.

### 4.4 Dispatcher warehouse flow (DISPATCHER)
Three scan stations, each a separate page:
- Reception (`/dispatch/reception`): scan a tracking number to receive a parcel into the warehouse. Status → AT_WAREHOUSE. Re-scanning an already-received parcel shows an error (already at warehouse).
- Sorting (`/dispatch/tri`): select a destination governorate bin, then scan parcels. Warns (orange) if the scanned parcel's real destination differs from the selected bin.
- Assignment (`/dispatch/assignation`): select an available driver, then scan parcels to hand them over. Status → PICKED_UP.

### 4.5 Driver delivery flow (LIVREUR)
- The driver sees a list of assigned jobs (real data) at `/livreur/jobs`.
- Opening a job shows receiver details, a clickable phone button (tel:), a Google Maps link, COD amount, and action buttons.
- Status transitions the driver can perform:
  - PICKED_UP or AWAITING_PICKUP → IN_TRANSIT (En route)
  - IN_TRANSIT → OUT_FOR_DELIVERY (En livraison)
  - OUT_FOR_DELIVERY → DELIVERED (Livré)
  - any active state → FAILED_DELIVERY (échec, requires a reason)
- Skipping a step is rejected (invalid transition).
- Delivering a parcel that has a COD amount requires confirming COD collection; the driver's COD balance increases by the collected amount.
- Failure requires a reason; without a reason it is rejected.

### 4.6 Finance flow (FINANCE_MANAGER, also SUPER_ADMIN)
- Driver balances (`/finance/livreurs`): list of drivers holding COD cash. "Encaisser" records a settlement (total by default, partial allowed) and resets/decrements the driver's balance.
- Expéditeur COD (`/finance/expediteurs`): amount owed to each merchant = COD collected minus delivery-fee commission. "Reverser" records the settlement (total only).
- Invoices (`/finance/factures`): generate an invoice (INV-2026-NNNNN) for a merchant's non-COD delivered shipments; mark as paid; filter by All / Unpaid / Paid. Re-paying a paid invoice is rejected.
- Reports (`/finance/rapports`): KPIs plus two charts — a bar chart (treasury position) and a pie chart (shipment status breakdown).

### 4.7 Admin supervision (SUPER_ADMIN)
- `/admin` dashboard and management pages for expéditeurs, livreurs, and shipments.
- `/admin/finance` shows a read-only financial supervision view (revenue, cash position, top driver/merchant balances) with links into the /finance space.

## 5. Business rules (important for assertions)

- Delivery price = 8 (STANDARD) or 12 (EXPRESS), plus 3 if fragile. This price is the company's commission.
- On a COD shipment, the merchant receives (COD amount − delivery price). On a non-COD shipment, the merchant is billed the delivery price via an invoice.
- Expéditeur net owed = sum of COD − sum of delivery fees on their delivered, not-yet-settled COD shipments.
- A driver only ever sees and acts on their own jobs; acting on another driver's job returns not found.
- Role security: expéditeur and livreur accounts must receive 403 on finance API routes; only FINANCE_MANAGER and SUPER_ADMIN may read/write finance.

## 6. Key user journeys to test

1. Login as each role and confirm redirect to the correct space.
2. Expéditeur creates a shipment; the live price and tracking number are correct.
3. Dispatcher receives, sorts, and assigns a parcel to a driver.
4. Driver advances a job through IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED with COD confirmation.
5. Finance manager encaisses a driver, reverses COD to a merchant, generates and pays an invoice.
6. Admin views the read-only finance supervision page.
7. Security: a logged-in expéditeur cannot reach /finance and is redirected.

## 7. Notes for the tester

- Both servers must be running: backend on 4000, frontend on 5173.
- The database is seeded clean (0 shipments) by default. Some journeys (dispatcher, driver, finance) require creating a shipment first, or running the seed with demo data.
- All UI text is in French. Status labels: PENDING = En attente, AT_WAREHOUSE = Au dépôt, PICKED_UP = Ramassé, IN_TRANSIT = En route, OUT_FOR_DELIVERY = En livraison, DELIVERED = Livré, FAILED_DELIVERY = Échec.
