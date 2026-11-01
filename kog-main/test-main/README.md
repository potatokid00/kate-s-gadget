# Kate's Original Gadgets – frontend demo store

Frontend-only (HTML + CSS + JavaScript, `localStorage` / `sessionStorage`). **No backend, no database, no real payments.**
Deploy by pushing to GitHub Pages as before.

## Pages
| Page | Who | Purpose |
|---|---|---|
| `index.html` | everyone | Storefront, product details modal, mini-cart, wishlist, sign in / register |
| `cart-dashboard.html` | guests + customers | Full cart (quantities, subtotals, total) |
| `checkout.html` | customers | Contact, pickup/delivery, **simulated** payment method, place order |
| `transactions.html` | customers | Own transaction history + details |
| `tracking.html` | customers | Own orders with the 6 delivery stages |
| `account.html` | signed-in users | Profile + password |
| `dashboard.html` | **Kate only** | Overview, Orders, Transactions, Products, Inventory, Customers, Inquiries, Sales |
| `about.html`, `support.html` | everyone | Info / support tickets (shown in the dashboard inbox) |
| `admin.html` | – | Redirects to `dashboard.html` (old duplicate page removed) |
| `kg.js` | – | **Shared core**: accounts, permissions, catalog, carts, orders, transactions |

## Administrator account
* Email: `kate@katesgadgets.ph`  Password: `Kate@Gadgets2026`  → **change it** (Staff Dashboard → *Password*).
* Admin is identified by the fixed account id `admin-kate` + role `admin` + this email, not by display name.
* Registration can only create `customer` accounts and cannot use the admin email.
* Only one admin can exist; any other record claiming `admin` is demoted on load.
* The seed password is stored only as a salted, iterated SHA-256 hash (`ADMIN_SEED` in `kg.js`).
  To use a different default for fresh browsers, compute a new hash with the same algorithm (see `hashPassword`) and replace `ADMIN_SEED`.

## Data (localStorage keys)
`kate_users`, `kate_catalog`, `kate_carts` (per account id, plus `guest`), `kate_wishlists`, `kate_orders`, `kate_transactions`, `kate_inquiries`, `kate_selected_store`, `kate_schema`.
Session (tab-scoped): `sessionStorage.kate_session`.
First load of this version upgrades older data automatically (plaintext passwords are hashed and removed, old cart/wishlist kept as a guest cart, built-in "sample data" removed, older real orders get a transaction record).

## Order flow
Order Placed → Payment Confirmed → Preparing Order → Shipped → Out for Delivery → Delivered.
Kate advances one stage at a time (each step is timestamped), sets the estimated date (never auto-generated) and confirms the simulated payment.
Payment statuses: Pending, Processing, Paid, Failed, Refunded (Failed/Refunded cancel the order and restore stock).

## Limitations (important)
* **Data lives in each visitor's own browser.** An order placed on a customer's phone is NOT visible in Kate's dashboard on another device. A shared view needs a real backend.
* Frontend-only login/roles are suitable for a demo but are **not production security**: anyone with dev-tools can edit `localStorage`.
* Payments are simulated; no card or wallet data is collected.
* Browser storage is ~5 MB: large product photos can fill it (the dashboard shrinks uploads and reports when storage is full).
