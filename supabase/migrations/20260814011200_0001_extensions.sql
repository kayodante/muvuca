-- Extensions required by the Muvuca schema.
--
-- gen_random_uuid() has been built into Postgres core since v13 and needs no
-- extension. pg_trgm is enabled here because the trigram indexes created
-- in 0006_indexes.sql depend on it, even though partial/trigram search is not
-- exercised by the application until a later phase.

create extension if not exists pg_trgm with schema extensions;
