-- One row per email. The sender (api/send-due.mjs) sends rows whose time has come.
create table if not exists outreach_email (
  id          bigserial primary key,
  key         text unique not null,          -- "<date>|<email>|<kind>": one send per person per kind per day
  to_email    text not null,
  name        text,
  tz          text not null,                 -- IANA zone, e.g. America/New_York
  kind        text not null default 'first', -- 'first' | 'followup'
  subject     text not null,
  body        text not null,
  send_at     timestamptz not null,          -- exact moment, already converted from the recipient's local time
  status      text not null default 'queued',-- queued | sending | sent | skipped | error | missed
  detail      text,                          -- why skipped / the error
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists outreach_email_due on outreach_email (status, send_at);

-- People who must never get another email (replied, unsubscribed, became a customer).
create table if not exists do_not_email (
  email  text primary key,
  reason text not null,
  at     timestamptz not null default now()
);
