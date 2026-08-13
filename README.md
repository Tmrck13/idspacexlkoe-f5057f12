# ID-Space Finance Core

MASTER PROMPT — ID-SPACE FINANCE

MIGRATION & FOUNDATION AUDIT V1

You are the senior full-stack architect responsible for migrating and continuing the existing ID-SPACE Finance production project.

This is an EXISTING project.

DO NOT rebuild the application from scratch.

DO NOT create a new demo.

DO NOT replace the existing architecture unnecessarily.

DO NOT delete existing features, database structures, routes, components, authentication logic, Pi integration, wallet/ledger logic, RLS policies, membership logic, or UI unless explicitly instructed.

1. SOURCE OF TRUTH

The existing project source code is stored in GitHub:

Repository:

https://github.com/Tmrck13/id-space-finance-v2.git

Branch:

main

First, connect/import this repository into the current Lovable workspace.

Treat the existing GitHub source as the primary application source.

Before making changes:

Inspect the complete repository structure.

Inspect package.json.

Inspect src/.

Inspect all routes.

Inspect authentication implementation.

Inspect Supabase integration.

Inspect database-related code.

Inspect Pi SDK integration.

Inspect wallet and ledger logic.

Inspect IDPoints implementation.

Inspect membership implementation.

Inspect notification/banner/running-text implementation.

Inspect existing admin functionality.

Inspect existing security/RLS-related implementation.

Inspect environment-variable usage.

Identify incomplete, duplicated, mocked, placeholder, or legacy implementations.

DO NOT modify anything during the initial audit.

2. MIGRATION PRINCIPLE

The goal is:

EXISTING ID-SPACE FINANCE ↓ IMPORT INTO THIS LOVABLE WORKSPACE ↓ AUDIT ↓ PRESERVE ↓ FIX ONLY WHAT IS NECESSARY ↓ CONTINUE DEVELOPMENT

The migration must preserve the existing application behavior.

Do not reset the project.

Do not regenerate the entire UI.

Do not replace working components with simplified versions.

Do not create duplicate systems.

3. EXISTING PRODUCT IDENTITY

Application:

ID-SPACE Finance

Ecosystem:

PT Indonesia Digital Pioneer

Product ecosystem:

ID-SPACE Finance

IDPI

IDPoints

IDPT

ID-Mine

Marketplace

Pi Network ecosystem

The application is intended for the Pi Network ecosystem.

4. EXISTING TECHNOLOGY STACK

Preserve the existing stack wherever possible.

Expected technologies may include:

React

Vite

TypeScript

TailwindCSS

React Router

Supabase

Pi SDK

PWA

Framer Motion

Zustand

React Query

Recharts

Lucide Icons

Do not migrate frameworks unless there is a clear technical requirement.

5. SUPABASE

IMPORTANT:

Do NOT automatically create a new Supabase project.

First inspect how the existing application connects to Supabase.

Preserve the existing production database architecture.

Audit:

profiles

user_roles

membership

wallets

ledger

rewards

notifications

banners

running_text

transactions

portfolio

missions

admin_logs

app_secrets

user_entitlements

pi_payment_events

reconciliation_runs

any other existing tables/functions

Preserve existing RLS policies.

Do not weaken security.

Do not remove existing policies.

Do not expose service-role credentials to the frontend.

6. PI NETWORK

Preserve the existing Pi Network integration.

The project must distinguish:

Pi Mainnet vs Pi Testnet / Sandbox.

Do not silently switch environments.

Audit:

Pi SDK initialization

Pi authentication

Pi username

Pi UID

access-token validation

backend authentication

Pi payment creation

payment approval

payment completion

incomplete payment recovery

transaction verification

reconciliation

Mainnet/Sandbox configuration

All sensitive Pi credentials must remain server-side.

Never place:

PI_NETWORK_API_KEY

PI_VALIDATION_KEY

Supabase service-role keys

database passwords

or other secrets

inside frontend source code.

7. EXISTING PI MAINNET AUTHENTICATION

The current project may already contain:

/api/auth/pi

pi-identity.server.ts

backend Pi token validation

session restoration

role restoration

protected routes

Do not replace these systems without first determining whether they already work.

Verify:

Pi Browser → Pi SDK → Pi authentication → backend validation → Supabase identity → profile → wallet → role → application session

The expected flow is:

Pi User ↓ Pi SDK ↓ Pi authentication ↓ Backend validation ↓ Supabase account/profile ↓ User role ↓ Wallet ↓ Authenticated ID-SPACE session

8. EXISTING SECURITY ARCHITECTURE

Preserve the hardened security model.

The application must enforce:

RLS

server-side authorization

role verification

secure API routes

server-side secrets

input validation

authentication checks

audit logging

ownership checks

admin authorization

Never trust frontend role values.

Never allow frontend code to grant itself admin privileges.

9. ADMIN ARCHITECTURE

Inspect whether the existing project already contains:

admin functions

admin routes

admin translation

admin authentication

role checking

audit logs

system settings

Pi Mainnet configuration

If the admin UI is incomplete, do NOT rebuild the entire application.

Only identify the missing admin modules.

The future admin architecture should support:

/admin/dashboard

/admin/users

/admin/membership

/admin/wallets

/admin/transactions

/admin/payments

/admin/idpoints

/admin/rewards

/admin/missions

/admin/marketplace

/admin/pi-mainnet

/admin/system-settings

/admin/audit-logs

/admin/security

/admin/roles

10. MEMBERSHIP

Preserve the existing membership system.

The membership tiers are:

Explorer Pioneer Builder Visionary Legend

Each membership tier must be treated as a real authorization/benefit level.

Do not convert membership into a simple visual label.

Future features such as:

ID Card

rewards

benefits

missions

access privileges

discounts

loyalty

badges

must be able to use the user's actual membership level.

11. ID CARD FOUNDATION

The project will later include a premium digital Membership ID Card.

Do NOT build the ID Card in this migration task.

Only verify that the data foundation exists or can support:

Pi username

Pi UID

profile name

profile photo

member number

membership tier

registration date

wallet identity

IDPoints wallet

Pi wallet reference

verification status

The ID Card must eventually be generated from authenticated database data, not hardcoded data.

12. MARKET DATA

Preserve the existing Live Pi Market system.

Expected data:

PI/USD

PI/IDR

24H high

24H low

volume

price change

last update

source

Existing OKX integration should be reused if already implemented.

Do not create a second competing market-price service.

13. IDPOINTS

Preserve the existing server-side IDPoints architecture.

IDPoints must not rely on localStorage as the authoritative balance.

The authoritative balance must come from the backend/database ledger.

Preserve:

ledger

wallet

rewards

transaction history

check-in

reward logic

balance calculation

14. PAYMENT RECONCILIATION

Preserve the existing reconciliation architecture if present.

Expected concepts include:

payment status

completed

cancelled

expired

pending

txid verification

idempotency

entitlement unlocking

ledger crediting

payment events

reconciliation runs

retry handling

Never double-credit a user.

15. NOTIFICATIONS AND CONTENT

Preserve existing real-data systems for:

announcements

notifications

banners

running text

language filtering

time-window filtering

notification badge

Do not restore fake seed/demo content.

16. UI/UX

Preserve the existing ID-SPACE Finance visual identity.

Theme:

Matte Emerald Green

Islamic Luxury Gold

Dark Space

futuristic Web3

premium fintech

Islamic-inspired elegance

Do not redesign the entire application during migration.

Only fix obvious broken layouts or functionality discovered during audit.

17. MOBILE / PI BROWSER

The application must remain:

mobile responsive

PWA compatible

Pi Browser compatible

touch friendly

safe-area aware

free from horizontal overflow

Prioritize Android mobile usability.

18. ENVIRONMENT VARIABLES

Audit all environment variables.

Classify them into:

PUBLIC FRONTEND VARIABLES

and

SERVER-ONLY SECRET VARIABLES.

Frontend may use only intentionally public configuration.

Server-only secrets must never be bundled into client code.

Do not print secrets in logs.

Do not expose secrets in UI.

19. GITHUB WORKFLOW

The repository remains:

https://github.com/Tmrck13/id-space-finance-v2.git

Branch:

main

Do not create unnecessary repositories.

Do not overwrite the repository with a regenerated application.

Preserve the current project history.

20. INITIAL TASK

For THIS TURN ONLY:

DO NOT implement new features.

DO NOT redesign pages.

DO NOT create the ID Card.

DO NOT create new membership features.

DO NOT create a new Supabase project.

DO NOT change Pi Mainnet credentials.

DO NOT modify production secrets.

ONLY perform a complete migration/foundation audit.

Return a structured report containing:

A. Repository Status

Successfully imported?

Branch detected?

Framework detected?

Build status?

B. Existing Features

List what already exists.

C. Authentication

List current authentication architecture and status.

D. Pi Network

List current Pi SDK/Mainnet/Testnet implementation and status.

E. Supabase

List detected tables, functions, RLS/security architecture and status.

F. Wallet & Ledger

List current implementation and status.

G. IDPoints

List current implementation and status.

H. Membership

List current tiers and database implementation.

I. Admin

List existing admin functionality and missing modules.

J. Payment/Reconciliation

List current implementation and status.

K. Notifications

List current implementation.

L. Security Issues

List only real issues discovered.

M. Missing Components

List what is genuinely missing.

N. Recommended Next Steps

Prioritize:

Critical security

Authentication

Database/RLS

Pi Mainnet

Admin

Membership

ID Card

Marketplace

UI/UX improvements

Do not make assumptions.

Do not claim a feature is production-ready unless it has actually been verified.

The objective is to safely continue the existing ID-SPACE Finance project in this new Lovable workspace without losing its existing foundation.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://idspacexlkoe.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9ab79133-19da-40a4-bf42-1a0ff66d517e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
