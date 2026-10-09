-- Every customer Dodo has told us about. Written only by api/dodo-webhook.js.
create table if not exists customer (
  email                text primary key,
  name                 text,
  dodo_customer_id     text,
  subscription_id      text,
  status               text,            -- last subscription status Dodo sent
  first_paid_at        timestamptz,     -- set once, on the first subscription.active
  cancelled_at         timestamptz,
  unsubscribed_at      timestamptz
);

-- Webhook ids we have handled. Dodo retries deliveries, so the same event can arrive twice.
create table if not exists webhook_event (
  id          text primary key,         -- the webhook-id header
  type        text not null,
  received_at timestamptz not null default now()
);

-- Onboarding emails, one row per step per customer.
create table if not exists onboarding_email (
  id        bigserial primary key,
  email     text not null references customer(email),
  step      text not null,
  send_at   timestamptz not null,
  status    text not null default 'queued',   -- queued | sent | skipped | error
  detail    text,
  sent_at   timestamptz,
  unique (email, step)
);
create index if not exists onboarding_due on onboarding_email (status, send_at);
