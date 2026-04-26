# Monican Recharge — Launch checklist

Use this list before going live on **recharge.monican.shop**.

## Auth & compte

- [ ] Enskripsyon + koneksyon (imèl / Google) mache
- [ ] Dekonksyon mache

## Recharge & operatè

- [ ] Deteksyon otomatik nimewo (Digicel HT + Natcom)
- [ ] Recharge minit (Reloadly sandbox oswa mock)
- [ ] Recharge forfè done
- [ ] Limit $100 / tranzaksyon ak limit jounen ($200 itilizatè, $500 kès) respekte
- [ ] Rate limit (10/h) pa itilizatè/IP

## Peman

- [ ] Stripe: peman konplè
- [ ] Moncash manyèl: lòd → screenshot → admin konfime → notifikasyon
- [ ] Moncash: pa ka pase san `/peye/moncash/...`

## Kès & ajan

- [ ] Entèfas kès sou tablèt (ZHONGJI / enprime)
- [ ] Admin ka kreye / jere kasye (si aplikab)
- [ ] PIN kasye (si aplikab)
- [ ] Aplikasyon ajan + apwobasyon admin
- [ ] Lyen referans ajan (`?ref=`) swiv komisyon

## Dashboard nouvo

- [ ] Pwen fidelite afiche + kredite apre acha
- [ ] Referal kliyan (`?cref=`) + $1 premye recharge
- [ ] Recharge otomatik: tab + Stripe `pm_` / `cus_` + cron `/api/cron/rechaj-otomatik`

## Admin

- [ ] Tablo admin (statistik, tranzaksyon, Moncash, rapò)
- [ ] Notifikasyon WhatsApp (Twilio) si konfigire
- [ ] Alèt balans Reloadly (cron + imèl)
- [ ] Resè enprime / WhatsApp / imèl

## PWA

- [ ] `/manifest.json` chaje
- [ ] Service worker `/sw.js` anrejistre (DevTools → Application)
- [ ] Enstalasyon sou mobil (afterinstall / prompt)

## Lengwistik

- [ ] Tèks prensipal OK an **FR** ak **KR** (lòt lang opsyonèl)
- [ ] Mesaj offline sou fòm recharge

## Supabase

- [ ] Migrasyon aplike (`rechaj_otomatik`, `pwen_fidelite`, `referal_*`, `sekirize_alèt`)
- [ ] RLS verifye: itilizatè a sèlman li menm; sèvis role pou cron / alèt

## Sekirite & env

- [ ] `CRON_SECRET` fò
- [ ] `ADMIN_EMAILS`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `RECHARGE_MAX_USD`, `RECHARGE_MAX_DAY_USER_USD`, `RECHARGE_MAX_DAY_CAISSE_USD`
- [ ] `AUTO_SUSPEND_FRAUD` / `BLOCK_PHONE_SPAM` (opsyonèl, defo **false**)

## Vercel / cron

- [ ] Tout chemen cron nan `vercel.json` ak secret `Authorization: Bearer …`

---

**Nòt:** Plafon Vercel Hobby sou kantite cron — verifye plan ou oswa rasanble kèk travay.
