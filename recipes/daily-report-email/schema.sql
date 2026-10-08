-- Your customers. The subscription columns are written only by the Dodo webhook (api/dodo-webhook.js).
create table if not exists customer (
  id                   bigserial primary key,
  email                text unique not null,
  name                 text,
  tz                   text not null default 'America/New_York',
  dodo_subscription_id text unique,
  subscription_status  text,              -- active | on_hold | cancelled | expired (as Dodo last told us)
  paid_through         timestamptz,       -- next billing date: access runs to here even after cancelling
  unsubscribed_at      timestamptz
);

-- What your product did. One row per thing worth telling the customer about.
create table if not exists activity (
  id          bigserial primary key,
  customer_id bigint not null references customer(id),
  kind        text not null,              -- done | skipped | next
  title       text not null,              -- "Published 3 posts", "Skipped: duplicate of Tuesday's"
  detail      text,
  url         text,
  created_at  timestamptz not null default now()
);
create index if not exists activity_by_customer on activity (customer_id, created_at);

-- One row per run: what was sent, what was skipped and why, and what failed.
create table if not exists report_run (
  id         bigserial primary key,
  started_at timestamptz not null default now(),
  sent       int not null default 0,
  skipped    jsonb not null default '[]',   -- [{ email, reason }]
  failed     jsonb not null default '[]'    -- [{ email, error }]
);
