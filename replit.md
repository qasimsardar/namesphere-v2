# Overview

Namesphere is a context-aware identity management system that allows users to create and manage multiple identity profiles for different contexts (legal, work, social, gaming). The application implements privacy-by-design principles with minimal disclosure, ensuring that only context-appropriate information is shared when requested. Built as a full-stack application, it features a React frontend with a Node.js/Express backend, PostgreSQL database, and comprehensive audit logging capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on top of Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming support
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth integration with session-based authentication
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **API Design**: RESTful API with context-aware identity retrieval

## Database Design
- **Primary Database**: PostgreSQL (via Neon serverless)
- **Schema Management**: Drizzle migrations with schema definitions in shared directory
- **Key Tables**:
  - `users`: Core user information from authentication provider
  - `identities`: Context-specific user profiles with personal names and other names
  - `audit_logs`: Comprehensive activity tracking for compliance
  - `sessions`: Session storage for authentication persistence

## Authentication & Authorization
- **Provider**: Replit's OpenID Connect (OIDC) authentication
- **Session Management**: Secure HTTP-only cookies with PostgreSQL session store
- **Authorization Pattern**: Owner-based access control - users can only access their own identities
- **Security Features**: CSRF protection, secure session configuration, and automatic session cleanup

## Context-Aware Data Access
- **Privacy Model**: Context-scoped data retrieval ensures users only see relevant identity information
- **Primary Identity**: Fallback mechanism when no specific context is provided
- **API Pattern**: Query parameter-based context filtering with strict ownership validation
- **Audit Trail**: All data access and modifications are logged for transparency

## Development Tooling
- **Build System**: Vite for frontend bundling with HMR support
- **Type Safety**: Shared TypeScript schema definitions between frontend and backend
- **Code Quality**: ESBuild for production backend compilation
- **Development Environment**: Replit-optimized with specialized plugins for development experience

# External Dependencies

## Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **Database Driver**: `@neondatabase/serverless` for optimized serverless connections

## Authentication Services
- **Replit Auth**: OpenID Connect provider for user authentication and identity management
- **Session Management**: PostgreSQL-backed session storage with automatic cleanup

## UI Component Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Shadcn/ui**: Pre-styled component system built on Radix UI
- **Lucide React**: Icon library for consistent iconography

## Development & Build Tools
- **Vite**: Frontend build tool with optimized development experience
- **TypeScript**: Static typing for both frontend and backend code
- **Tailwind CSS**: Utility-first CSS framework with design system integration
- **Drizzle Kit**: Database schema management and migration tooling

## Form & Validation Libraries
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema validation for forms and API endpoints
- **@hookform/resolvers**: Bridge between React Hook Form and Zod validation

## State Management & HTTP
- **TanStack Query**: Server state management with caching and synchronization
- **Wouter**: Lightweight routing library for single-page application navigation