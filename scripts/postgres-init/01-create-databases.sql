-- Runs only on a fresh Postgres volume (docker-entrypoint-initdb.d).
-- The auth database (okaz_auth) is created by POSTGRES_DB; the stocks and orders
-- services each own a separate logical database on the same Postgres instance.
CREATE DATABASE okaz_stocks;
CREATE DATABASE okaz_orders;
CREATE DATABASE okaz_media;
CREATE DATABASE okaz_notifications;
