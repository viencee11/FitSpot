# FitSpot: Gym Membership & Class Booking Website

## Group Members

Yzabelle Grace Cane, Viena Grace Echavez, Maria Chesam Leonor, Jeah May Pareja

## GitHub Repository URL

_(To be added)_

## Concept

FitSpot is a website where users can check gym membership plans, view available fitness classes, and book their preferred schedule online. It makes it easier for both members and gym staff to manage memberships and class reservations.

## Login Credentials

Demo accounts (login is checked against the MySQL `users` table by `api/login.php`):

| Role   | Email              | Password  | Redirect      |
| ------ | ------------------ | --------- | ------------- |
| Admin  | admin@fitspot.com  | admin123  | Admin panel   |
| Member | member@fitspot.com | member123 | Member portal |

Extra seeded members (for the admin Members page): `maria@email.com` / `maria123`, `pedro@email.com` / `pedro123`.

Register now creates real member accounts (bcrypt-hashed passwords) - new accounts can log in right away.

## How to Run

The site must be **served over HTTP** (the pages talk to a PHP API; opening `index.html` as a file will not work). The steps below use Laragon on Windows:

```powershell
# 1. Start Laragon and make sure MySQL is running.

# 2. From the project root, import the database once:
mysql -u root < Database/MySQL/fitspot.sql

# 3. Start the PHP server from the project root.
# If "php" is not recognized, use the full Laragon PHP path:
& "C:\laragon\bin\php\php-8.1.10-Win32-vs16-x64\php.exe" -S localhost:8000

# 4. Open the site:
#    http://localhost:8000
```

If PHP is already added to your Windows `PATH`, you can start the server with `php -S localhost:8000` instead. The database connection in `api/db.php` uses MySQL on `127.0.0.1:3306` with the local `root` account and no password.

## Main Features

- User registration and login (connected to MySQL via `api/login.php` and `api/register.php`)
- View membership plans, prices, and inclusions (live from the `membership_plans` table)
- Browse fitness classes such as Zumba, Yoga, Pilates, Boxing, and Strength Training
- View available dates, times, and slots (live from `class_schedules` with real booked counts)
- Book or cancel a class (capacity and duplicate-booking rules enforced in a MySQL transaction)
- View upcoming bookings
- Admin can add, edit, or remove membership plans and classes
- Admin can manage schedules, members, and reservations
- Admin can open or close schedules with an Open/Close toggle; closed schedules cannot be booked
- Confirmation popups protect admin reservation confirmations, deletions, and logout actions
- Success and error feedback appears through side toast notifications instead of inline alert banners
- Monitor available slots to avoid overbooking

## Benefits

Members don't have to message or visit the gym just to ask about schedules, available slots, or membership plans. They can check and book directly through the website. For the gym, it makes managing members, schedules, and reservations more organized and reduces manual work.

## Why It's Good for Our Project

The website is simple and manageable to develop but still has enough features for a complete system. It includes user and admin accounts, booking, scheduling, and basic CRUD functions, so we can easily divide the tasks among the group members.

## Feature Status

| #   | Feature                                                                  | Status    | Notes                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | User registration and login                                              | Connected | Login popup + `pages/login.html` authenticate against the `users` table (`api/login.php`, bcrypt `password_verify`, PHP sessions); Register creates real accounts (`api/register.php`); admin/member pages are guarded by `api/me.php`        |
| 2   | View membership plans, prices, and inclusions                            | Connected | Homepage, member portal, and admin panel all load plans from `membership_plans` (`api/plans.php`); admin CRUD is persisted; members switch plans via `api/membership.php` (updates `memberships`)                                             |
| 3   | Browse fitness classes (Zumba, Yoga, Pilates, Boxing, Strength Training) | Connected | All 5 classes load from `fitness_classes` on the homepage and member portal (Pilates and Boxing gap fixed); admin CRUD persisted via `api/classes.php`                                                                                        |
| 4   | View available dates, times, and slots                                   | Connected | Homepage schedule, admin schedules page, and member class cards show real dates/times with booked/capacity counts from `class_schedules` + `bookings` (`api/schedules.php`, `api/classes.php?upcoming=1`); admins can open or close schedules |
| 5   | Book or cancel a class                                                   | Connected | Member portal books by schedule and can cancel; the homepage booking form books by class + date; capacity, duplicates, and past schedules are enforced inside a MySQL transaction (`api/bookings.php`)                                        |
| 6   | View upcoming bookings                                                   | Connected | "My Bookings" and the overview table load real rows from `bookings` with statuses, cancel buttons, and an empty state                                                                                                                         |
| 7   | Admin: add, edit, remove membership plans and classes                    | Connected | Modal forms on `pages/admin/memberships.html` and `classes.html` write to `membership_plans` / `fitness_classes` (`api/plans.php`, `api/classes.php`); deleting a plan used by members is blocked                                             |
| 8   | Admin: manage schedules, members, and reservations                       | Connected | Separate pages with add/delete/open/close schedules (`api/schedules.php`), member removal (`api/members.php`), and popup-protected confirm/cancel reservations (`api/reservations.php`)                                                       |
| 9   | Monitor available slots to avoid overbooking                             | Connected | Real booked/capacity counts everywhere; bookings are blocked at capacity inside a transaction with row locks                                                                                                                                  |

### Completed So Far

- Site layout and styling (HTML/CSS) - home page, sections, forms, footer
- Header with logo on the left, centered navigation, search bar, and login button (right)
- Sticky responsive header
- Full-screen responsive hero with badge, headline, CTAs, and stats
- Automatic image carousel in the hero (4 slides, dots, 3-second autoplay)
- Login/Register popup with branding panel and demo admin/member credentials
- Admin panel (one HTML file per section): sidebar links, dashboard stats (`pages/admin/dashboard.html`), plans/classes CRUD with modal forms (`memberships.html`, `classes.html`), add/delete/open/close schedules with slot bars, members, reservations (confirm/cancel), confirmation popups, avatar menu (Profile, Settings, Logout) - all backed by the PHP API
- Member portal (one HTML file per section): overview stats (`pages/users/dashboard.html`), membership plan cards with choose-plan (`memberships.html`), class browsing with slot bars and book/cancel (`classes.html`), My Bookings table with empty state (`bookings.html`), profile form (`profile.html`) - all backed by the PHP API
- PHP backend (`api/`): session login/logout, registration, plans/classes/schedules/members/reservations CRUD, transactional booking with capacity checks, profile and membership updates, dashboard stats
- MySQL database: feature-to-table design in `Database/MySQL/database.md`, importable schema + seed data in `Database/MySQL/fitspot.sql` (6 tables, slot-usage view, demo accounts, demo bookings)
- Feature-folder structure (`api/`, `css/`, `js/`, `images/`, `Database/MySQL`, `pages/admin/`, `pages/users`)

## Tech Stack (Current)

Frontend

- HTML5
- CSS3
- JavaScript (fetch API, modals, hero carousel, admin panel, member portal)
  Backend
- PHP 8.1 + PDO (JSON API in `api/`, sessions, bcrypt password hashing)
- MySQL 8.0 (schema, slot-usage view, seed data)

## Database

Full design, queries, and the overbooking-transaction pattern are in [`Database/MySQL/database.md`](Database/MySQL/database.md). Import the ready-made file to create the `fitspot` database:

```bash
mysql -u root -p < Database/MySQL/fitspot.sql
```

| Table / View          | Purpose (Feature #)                                    |
| --------------------- | ------------------------------------------------------ |
| `users`               | Registration + login, admin and member accounts (1)    |
| `membership_plans`    | Plans, prices, inclusions (2, 7)                       |
| `memberships`         | Member's current plan and validity                     |
| `fitness_classes`     | Zumba, Yoga, Pilates, Boxing, Strength Training (3, 7) |
| `class_schedules`     | Class dates, times, and slots (4, 8)                   |
| `bookings`            | Book/cancel reservations, upcoming bookings (5, 6, 8)  |
| `v_slot_usage` (view) | Booked/capacity counts and Open/Full status (9)        |

Seed data included: 2 membership plans, 5 fitness classes, 5 schedules, 4 accounts (1 admin, 3 members), 1 active/1 expired membership, and 3 demo bookings. Status: **the pages are connected to this database** through the PHP API.

## Folder Structure

```
FitSpot/
├── index.html              # Home page (hero, plans, classes, schedule, booking)
├── README.md
├── api/
│   ├── db.php              # PDO connection, sessions, JSON helpers
│   ├── login.php           # POST: authenticate + start session
│   ├── logout.php          # POST: destroy session
│   ├── register.php        # POST: create a member account (bcrypt)
│   ├── me.php              # GET: current logged-in user (page guards)
│   ├── plans.php           # GET public / POST, PUT, DELETE admin
│   ├── classes.php         # GET (admin list or ?upcoming=1 with slot usage) / CRUD
│   ├── schedules.php       # GET (?all=1 admin) / POST create or toggle status, DELETE
│   ├── members.php         # GET, DELETE (admin)
│   ├── reservations.php    # GET, POST confirm/cancel (admin)
│   ├── bookings.php        # GET my bookings / POST book (transaction) / cancel
│   ├── membership.php      # POST: switch my plan
│   ├── profile.php         # GET, POST: my profile + membership
│   └── stats.php           # GET: dashboard counters + recent reservations
├── css/
│   ├── style.css            # Site styles
│   ├── admin.css            # Admin panel styles
│   └── user.css             # Member portal styles
├── Database/
│   └── MySQL/
│       ├── database.md          # MySQL database design and queries
│       └── fitspot.sql          # Ready-to-import MySQL database file (schema + seed)
├── images/
│   ├── fitstop_white_logo.png   # Header/logo image
│   ├── fitstop_logo_trans.png   # Logo with transparent background
│   ├── jogging.jpg              # Hero carousel slide 1
│   ├── rope.jpg                 # Hero carousel slide 2
│   ├── kettlebellswings.jpg     # Hero carousel slide 3
│   └── jumping.jpg              # Hero carousel slide 4
├── js/
│   ├── script.js           # Login/Register, homepage live data, booking form, hero carousel
│   ├── admin.js            # Admin panel logic (API guard, CRUD, modals, avatar menu)
│   └── user.js             # Member portal logic (API guard, booking/cancel, plans, profile)
└── pages/
    ├── login.html          # Standalone login / registration page
    ├── admin/
    │   ├── dashboard.html      # Overview: stats + reservations preview
    │   ├── memberships.html    # Membership plans CRUD
    │   ├── classes.html        # Fitness classes CRUD
    │   ├── schedules.html      # Schedules with slot usage bars and Open/Close controls
    │   ├── members.html        # Members table
    │   └── reservations.html   # Reservations (confirm/cancel)
    └── users/
        ├── dashboard.html      # Overview: stats + upcoming bookings
        ├── memberships.html    # Plan cards with choose-plan demo
        ├── classes.html        # Browse classes, book with slot bars
        ├── bookings.html       # My Bookings table (statuses, cancel)
        └── profile.html        # Profile form + membership summary
```

## Development Progress Tracking

| Course Week | Current Revisions or Updates                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Week 2      | Finalized the FitSpot concept and identified the main purpose and intended users                                                                        |
| Week 3      | Created and refined the initial HTML structure of FitSpot, including the navigation, membership plans, fitness classes, schedules, and booking section. |
| Week 4      |                                                                                                                                                         |
| Week 5      |                                                                                                                                                         |
| Week 6      |                                                                                                                                                         |
| Week 7      |                                                                                                                                                         |
| Week 8      |                                                                                                                                                         |
| Week 9      |                                                                                                                                                         |
| Week 10     |                                                                                                                                                         |
| Week 11     |                                                                                                                                                         |
| Week 12     |                                                                                                                                                         |
