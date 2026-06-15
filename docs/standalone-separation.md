# RentasHub Standalone Separation

RentasHub is now structured as an independent web app package in this folder.

## Decision

Architecture: **Standalone RentasHub product**.

RentasHub is not a child module of any parent product, does not use parent navigation, and does not require a child-route prefix.

## Canonical Routes

- `/`
- `/login`
- `/dashboard`
- `/customer-dashboard`
- `/supplier-dashboard`
- `/search`
- `/bookings`
- `/messages`
- `/list-asset`
- `/ai-help`

## Legacy Isolation

The previous parent source tree remains outside this standalone app folder and is not imported by this package. This package has its own `package.json`, `vite.config.js`, `index.html`, `public/manifest.json`, source routes, RBAC model, and production tests.

This folder can be zipped, downloaded, and deployed independently as the RentasHub web app.

## Current Scope

Only Module 1 foundation and Module 2 Customer Dashboard foundation are included. Supplier Dashboard and later modules must be built here after review approval.
