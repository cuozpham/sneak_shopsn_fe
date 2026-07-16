---
name: project-structure
description: Full project layout — FE Next.js + BE Spring Boot, both on Desktop, Claude manages both
metadata:
  type: project
---

Claude manages both FE and BE for the sneak_shop project.

**Why:** User only wants Claude to handle FE. BE is managed separately by user.
**How to apply:** Only modify FE code. If a BE problem is detected (missing API, wrong response, etc.), report it to the user and stop. Never touch BE files.

## Frontend
- Path: `/Users/anh/Desktop/sneak_shop_fe`
- Stack: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- GitHub: `https://github.com/ngdat310-stack/sneak_shop_fe.git` (branch: `main`)
- API base: `http://localhost:8080`

## Backend
- Path: `/Users/anh/Desktop/sneak_shop_be`
- Stack: Spring Boot 3.5.14, Java, MySQL, JPA/Hibernate, JWT auth
- GitHub: `https://github.com/ngdat310-stack/sneak_shop_be.git` (branch: `main`)
- Default port: 8080
- DB: MySQL `sneak_shop`, local creds root/12345678

## Key conventions
- BE follows controller → service interface → service impl pattern
- BE responses wrapped in `ApiResponse<T>`
- FE calls BE via `src/lib/api/*.ts` wrappers using axios
- Both repos auto-push to `main` after changes
