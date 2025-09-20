# Namesphere 🆔

**Context-Aware Identity Management System**

Namesphere is a privacy-first web application that enables users to create and manage multiple identity profiles tailored for different contexts (legal, work, social, gaming). Built with modern web technologies, it implements privacy-by-design principles, ensuring that only context-appropriate information is shared when requested.

## 🎯 Problem Statement

In today's digital world, we present ourselves differently across various contexts - your professional identity differs from your gaming persona, and your social media presence may be distinct from your legal documentation. Traditional identity systems force you to use a single profile everywhere, leading to:

- **Privacy concerns** - Oversharing personal information in inappropriate contexts
- **Professional boundaries** - Mixing personal and work identities
- **Context confusion** - Using the wrong name or information in different situations
- **Identity fragmentation** - Managing separate accounts across different platforms

## 🚀 Solution

Namesphere solves these problems by providing:

- **Context-Aware Profiles** - Create separate identities for work, social, legal, and gaming contexts
- **Privacy by Design** - Share only relevant information based on the context
- **Unified Management** - Control all your identities from a single, secure dashboard
- **Public Discovery** - Optional discoverability allows others to find you in appropriate contexts
- **Comprehensive Auditing** - Track all access and modifications for transparency

## ✨ Key Features

### 🔐 Dual Authentication System
- **Replit OAuth** - Quick sign-in with your Replit account
- **Username/Password** - Traditional local authentication with secure password hashing

### 👤 Context-Aware Identity Management
- Create multiple identity profiles for different contexts
- Set one identity as your primary profile
- Include rich metadata: pronouns, titles, avatars, social links
- Control visibility with discoverable/private settings

### 🔍 Public Search System
- Search for other users within specific contexts
- Privacy-controlled discovery (users opt-in to being found)
- Context-scoped results ensure appropriate matches
- Comprehensive audit logging for all search activities

### 🛡️ Privacy & Security
- **Owner-based access control** - Users can only access their own data
- **Context-scoped data retrieval** - See only relevant information
- **Audit logging** - Complete activity tracking for compliance
- **Session-based authentication** - Secure HTTP-only cookies
- **Field whitelisting** - Public APIs expose only safe information

### 🎨 Modern User Experience
- Responsive design with dark/light mode support
- Intuitive dashboard for managing identities
- Modal forms with proper scrolling and validation
- Real-time search with instant results
- Toast notifications for user feedback

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling and hot module replacement
- **Shadcn/ui** components built on Radix UI primitives
- **Tailwind CSS** for styling with CSS variables
- **TanStack Query** for server state management
- **React Hook Form** with Zod validation
- **Wouter** for lightweight client-side routing
- **Framer Motion** for animations

### Backend
- **Node.js** with Express.js framework
- **TypeScript** with ES modules
- **Passport.js** for authentication (OpenID Connect + Local)
- **Express Session** with PostgreSQL storage
- **Drizzle ORM** for type-safe database operations
- **Zod** for request/response validation

### Database & Infrastructure
- **PostgreSQL** (Neon serverless) for data persistence
- **Session-based authentication** with automatic cleanup
- **Database migrations** managed by Drizzle Kit
- **Connection pooling** for optimal performance

### Developer Experience
- **TypeScript** throughout the stack
- **Shared schema** definitions between frontend/backend
- **ESLint & Prettier** for code quality
- **Hot module replacement** for fast development
- **Type-safe API** contracts with full IntelliSense

## 🏗️ Architecture Overview

### Database Schema
```
users              - Core user information
user_credentials   - Username/password for local auth
identities         - Context-specific user profiles
audit_logs         - Activity tracking for compliance
sessions          - Authentication session storage
```

### API Design
- **RESTful endpoints** with consistent patterns
- **Context-aware filtering** via query parameters
- **Content negotiation** (JSON, JSON:API, CSV, XML)
- **Comprehensive validation** using Zod schemas
- **Detailed error handling** with user-friendly messages

### Security Model
- **Authentication**: Dual-method support (OAuth + Local)
- **Authorization**: Owner-based access control
- **Privacy**: Context-scoped data exposure
- **Auditing**: Complete activity logging
- **Sessions**: PostgreSQL-backed with HTTP-only cookies

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Replit account (optional, for OAuth)

### Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd namesphere
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Database connection
   DATABASE_URL=postgresql://user:password@host:port/database
   
   # Session secret
   SESSION_SECRET=your-secure-session-secret
   
   # Optional: Replit OAuth (if using OAuth authentication)
   REPLIT_CLIENT_ID=your-replit-client-id
   REPLIT_CLIENT_SECRET=your-replit-client-secret
   ```

4. **Initialize database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

### Production Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📚 API Reference

### Authentication Endpoints
```
POST /api/register          - Register new user (local auth)
POST /api/login/local       - Login with username/password
GET  /api/login             - Initiate Replit OAuth flow
GET  /api/callback          - Handle OAuth callback
GET  /api/logout            - Logout user
GET  /api/auth/user         - Get current user info
```

### Identity Management
```
GET    /api/identities           - List user's identities (supports ?context filter)
POST   /api/identities           - Create new identity
GET    /api/identities/:id       - Get specific identity
PUT    /api/identities/:id       - Update identity
PATCH  /api/identities/:id       - Partially update identity
DELETE /api/identities/:id       - Delete identity
POST   /api/identities/:id/set-primary - Set as primary identity
```

### Public Search
```
GET /api/public/identities/search - Search discoverable identities
    Query params: context, q, limit, cursor
    
GET /api/public/identities/:id    - Get public identity details
```

### Content Negotiation
All identity endpoints support multiple formats via `Accept` header:
- `application/json` (default)
- `application/vnd.api+json` (JSON:API format)
- `text/csv` (CSV export)
- `application/xml` (XML format)

## 🔧 Usage Examples

### Creating an Identity
```javascript
// POST /api/identities
{
  "personalName": "Dr. Jane Smith",
  "context": "work",
  "otherNames": ["Jane", "J. Smith"],
  "pronouns": "she/her",
  "title": "Senior Software Engineer",
  "avatarUrl": "https://example.com/avatar.jpg",
  "socialLinks": {
    "linkedin": "https://linkedin.com/in/janesmith",
    "github": "https://github.com/janesmith"
  },
  "isPrimary": false,
  "isDiscoverable": true
}
```

### Searching Public Identities
```javascript
// GET /api/public/identities/search?context=work&q=engineer&limit=10
{
  "identities": [
    {
      "id": "uuid",
      "personalName": "Dr. Jane Smith",
      "context": "work",
      "title": "Senior Software Engineer",
      "avatarUrl": "https://example.com/avatar.jpg"
    }
  ],
  "hasMore": false,
  "nextCursor": null
}
```

## 🎯 Core Contexts

The application supports four main contexts:
- **Legal** - Official names, legal documentation, formal titles
- **Work** - Professional identities, job titles, work contacts
- **Social** - Social media profiles, casual names, personal interests
- **Gaming** - Gaming handles, usernames, gaming profiles

## 🔒 Privacy Controls

Users have granular control over their privacy:
- **Private by default** - New identities are not discoverable
- **Context isolation** - Information only appears in relevant contexts
- **Selective disclosure** - Choose which identities to make public
- **Audit transparency** - View all access logs for your profiles

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper TypeScript types
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit with descriptive messages
7. Push to your branch and create a Pull Request

### Development Guidelines
- Follow the existing code style and TypeScript patterns
- Use the shared schema definitions in `/shared/schema.ts`
- Add proper error handling and validation
- Update documentation for API changes
- Maintain backward compatibility when possible

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Replit](https://replit.com) development environment
- UI components from [Shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide React](https://lucide.dev)
- Database hosting by [Neon](https://neon.tech)

## 🔮 Roadmap

Future enhancements planned:
- **Advanced search filters** - Filter by pronouns, titles, locations
- **Identity verification** - Optional verification badges
- **Export/import functionality** - Backup and restore identities
- **API rate limiting** - Enhanced security for public endpoints
- **Mobile application** - Native iOS/Android apps
- **Integration APIs** - Connect with external identity providers

---

**Namesphere** - Manage your digital identities with privacy and precision. 🚀

*For questions, support, or feature requests, please open an issue on GitHub.*