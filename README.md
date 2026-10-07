# Car Rental SD

A production-oriented full-stack car rental platform built for the U.S. market, combining a customer-facing vehicle catalog with authenticated customer workflows and an administrative operations dashboard.

The project was developed as a real-world product, with emphasis on security, business rules, data isolation and maintainable application architecture.

## Highlights

- Full-stack rental management platform
- Customer registration and authentication
- Role-based access control
- Vehicle catalog and availability management
- Customer and vehicle document workflows
- Rental management
- Payment tracking
- Digital rental agreements and customer acceptance
- Transactional email integration
- Responsive administrative dashboard
- Progressive Web App (PWA)
- PostgreSQL database with Row Level Security
- Private document storage
- Server-side authorization
- Production-oriented deployment architecture

## Tech Stack

| Layer | Technology |
|---|---|
| Application | Next.js 15 · App Router · React 19 · TypeScript |
| UI | Tailwind CSS · shadcn/ui |
| Database | PostgreSQL · Supabase |
| Authentication | Supabase Auth |
| Authorization | Row Level Security · Server-side role checks |
| Validation | Zod · React Hook Form |
| Storage | Supabase Storage |
| Email | SMTP / transactional email |
| Deployment | Vercel |
| PWA | Service Worker · Web App Manifest |

## Architecture

The application follows a domain-oriented full-stack architecture using Next.js App Router and server-side application logic.

```text
Browser
   │
   ▼
Next.js App Router
   │
   ├── Public vehicle catalog
   ├── Customer area
   └── Administrative dashboard
          │
          ▼
     Server Actions
          │
          ├── Authentication
          ├── Authorization
          ├── Validation
          └── Business rules
                  │
                  ▼
             Supabase
          ┌───────┼────────┐
          ▼       ▼        ▼
      PostgreSQL  Auth   Storage
          │
          ▼
       RLS policies

Security Architecture
Security is enforced at multiple layers rather than relying exclusively on the frontend.
Authentication
Supabase Auth manages user authentication and sessions.
Authorization
Administrative operations perform server-side role checks before executing mutations.
Row Level Security
PostgreSQL Row Level Security provides database-level isolation for customer and administrative data.
Private Storage
Sensitive documents are stored in private storage buckets with access controlled through storage policies.
The application separates public vehicle media from private operational and customer documents.
Core Data Domains
The database is organized around the main operational domains of the rental business:
- Profiles
- Vehicles
- Vehicle categories
- Vehicle documents
- Customer documents
- Rentals
- Rental payments
- Rental agreements
- Terms and conditions
The schema is managed through versioned Supabase migrations.
Business Logic
The platform implements business rules beyond basic CRUD operations, including:
- vehicle availability constraints;
- rental lifecycle management;
- customer approval workflows;
- document ownership and access control;
- agreement acceptance;
- payment tracking;
- role-based administrative operations.
This separation between UI, server-side mutations and database policies helps keep business rules enforceable across different application entry points.
Digital Agreements
The platform supports digital rental agreement workflows.
A typical flow is:
Rental created
      ↓
Agreement generated
      ↓
Customer reviews terms
      ↓
Customer accepts agreement
      ↓
Signature recorded
      ↓
Agreement becomes part of the rental record

The workflow is tied to the authenticated customer session and validated against the current agreement terms.
Progressive Web App
The application includes PWA capabilities for an improved mobile experience, including:
- installable application;
- web app manifest;
- service worker;
- offline-oriented experience;
- responsive administrative interfaces.
Development
Install dependencies:
npm install

Create a local environment file based on .env.example and provide the required Supabase configuration.
Run the development server:
npm run dev

Production build:
npm run build

Type checking:
npm run typecheck

Linting:
npm run lint

Database migrations:
npm run db:push

Engineering Focus
This project demonstrates practical experience with:
- Full-stack TypeScript development
- Next.js App Router
- React application architecture
- PostgreSQL data modeling
- Supabase
- Row Level Security
- Authentication and authorization
- Secure file storage
- Server Actions
- Business-rule implementation
- Transactional workflows
- PWA development
- Production deployment
Project Context
This repository is a portfolio-safe representation of a production-oriented client project.
Client-specific credentials, private data and operational information have been removed from this public version.
The original project was developed for a U.S.-oriented car rental operation, using English-language interfaces, USD pricing and U.S.-style date conventions.
