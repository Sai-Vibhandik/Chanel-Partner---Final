# AI Helper - Project Context Files

This folder contains documentation files that provide context about the **Channel Partner Management Portal** project. Reading these files helps understand the project without exploring the entire codebase.

## Project Summary

**What is this project?**

A **B2B web application** for real estate developers to manage their external sales network (channel partners/brokers/agencies). It centralizes partner onboarding, property distribution, commission management, and communication.

**Two Interfaces:**
1. **Admin Panel** - Company staff manages partners, properties, commissions, visits
2. **Partner Portal** - External brokers view properties, book visits, track commissions

---

## Files Overview

| File | Purpose |
|------|---------|
| `PROJECT_OVERVIEW.md` | Project description, goals, and scope |
| `TECH_STACK.md` | Technology stack and versions |
| `PROJECT_STRUCTURE.md` | Folder structure and organization |
| `DATABASE_SCHEMA.md` | Database models and relationships |
| `API_ENDPOINTS.md` | All API endpoints documentation |
| `COMPONENTS.md` | Frontend components hierarchy |
| `IMPLEMENTATION_STATUS.md` | What's done and what's pending |
| `SRS_SUMMARY.md` | Summary of requirements |

---

## Quick Reference

### User Roles
- **Admin** - Full system access (company staff)
- **Partner** - Limited portal access (external broker)

### Core Modules
1. Partner Onboarding (KYC, agreements, verification)
2. Property Management (visibility control)
3. Commission Engine (tier-based calculation)
4. Chat System (admin ↔ partner)
5. Visit Scheduling (booking + approval)
6. Analytics Dashboard
7. Suggested Properties
8. Security & Audit Logs

### Commission Formula
```
Final Commission = Property Base % × Partner Tier %
```

### Tech Stack
- **Frontend**: React 19 + Vite + Tailwind + Zustand
- **Backend**: Node.js 22 + Express.js 5 + MongoDB
- **Auth**: JWT
- **Storage**: Cloudinary

---

## How to Use

Before starting any task, read these files to understand:
1. Current project state → `IMPLEMENTATION_STATUS.md`
2. Database structure → `DATABASE_SCHEMA.md`
3. API patterns → `API_ENDPOINTS.md`
4. Component architecture → `COMPONENTS.md`

---

**Last Updated:** 2026-04-28