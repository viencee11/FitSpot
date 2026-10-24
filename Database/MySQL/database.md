# FitSpot MySQL Database

This folder contains the database setup used by the FitSpot PHP API.

## Import the database

With MySQL running on the local machine, import the schema and demo data from
the project root:

```powershell
mysql -u root < Database/MySQL/fitspot.sql
```

The SQL file creates and selects the `fitspot` database automatically. If the
local MySQL server uses a password, add `-p`:

```powershell
mysql -u root -p < Database/MySQL/fitspot.sql
```

## Tables

- `users` - admin and member accounts
- `membership_plans` - available membership plans
- `memberships` - a member's plan history
- `fitness_classes` - classes offered by the gym
- `class_schedules` - dated class sessions and capacity
- `bookings` - member reservations and their status

The API connects to MySQL at `127.0.0.1:3306` using the local `root` account
with no password by default. Update [`api/db.php`](../../api/db.php) if the
local database credentials differ.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@fitspot.com` | `admin123` |
| Member | `member@fitspot.com` | `member123` |
