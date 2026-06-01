-- Runs only on a fresh Postgres data volume (docker-entrypoint-initdb.d).
-- The default okaz_auth database is created via POSTGRES_DB; these are the
-- additional per-service databases.
CREATE DATABASE okaz_cart;
CREATE DATABASE okaz_orders;
