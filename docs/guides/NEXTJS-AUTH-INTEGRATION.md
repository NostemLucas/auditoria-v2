# Integración de Autenticación con Next.js

Esta guía muestra cómo integrar el sistema de autenticación basado en cookies HttpOnly con Next.js.

## Ventajas de Cookies HttpOnly

- ✅ **Seguridad**: Inmune a ataques XSS (JavaScript no puede leer las cookies)
- ✅ **Automático**: Las cookies se envían automáticamente en cada request
- ✅ **Persistencia**: La sesión se mantiene después de cerrar el navegador
- ✅ **Token Rotation**: Cada refresh genera un nuevo refreshToken

## Cambios en el Backend

El backend ahora:

- Setea tokens en cookies HttpOnly (no en el body de la respuesta)
- Lee tokens de las cookies automáticamente
- El endpoint `/auth/me` es público para verificar sesión
- El endpoint `/auth/refresh` renueva ambos tokens automáticamente

## Implementación en Next.js

### 1. Estructura de Archivos

```
frontend-nextjs/
├── lib/
│   └── axios.ts              # Cliente HTTP con interceptor
├── contexts/
│   └── AuthContext.tsx       # Context de autenticación
├── hooks/
│   └── usePermissions.ts     # Hook de permisos
├── components/
│   └── ProtectedComponent.tsx
├── app/
│   ├── layout.tsx            # Layout con AuthProvider
│   ├── login/
│   │   └── page.tsx
│   └── dashboard/
│       └── page.tsx
├── middleware.ts             # Middleware de Next.js
└── .env.local                # Variables de entorno
```

### 2. Variables de Entorno

Crear `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. Cliente HTTP con Axios

`lib/axios.ts`:

```typescript
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  withCredentials: true, // ← CRÍTICO: envía cookies automáticamente
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para renovar token automáticamente
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Si es 401 y no hemos reintentado
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Si ya estamos refrescando, esperar
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Intentar renovar el token
        await apiClient.post('/auth/refresh')

        processQueue()
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)

        // Si el refresh falla, redirigir a login
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }

        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default apiClient
```

### 4. Context de Autenticación

`contexts/AuthContext.tsx`:

```typescript
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import apiClient from '@/lib/axios';

interface User {
  sub: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar sesión al cargar la app
  useEffect(() => {
    checkAuth();
  }, []);

  // Verificar si hay sesión activa
  const checkAuth = async () => {
    try {
      const response = await apiClient.get('/auth/me');

      if (response.data.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (credentials: { email: string; password: string }) => {
    const response = await apiClient.post('/auth/login', credentials);
    setUser(response.data.user);
  };

  // Logout
  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  // Refrescar sesión manualmente
  const refreshSession = async () => {
    await checkAuth();
  };

  const value = {
    user,
    loading,
    login,
    logout,
    refreshSession,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook personalizado
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
```

### 5. Hook de Permisos

`hooks/usePermissions.ts`:

```typescript
import { useAuth } from '@/contexts/AuthContext'

export function usePermissions() {
  const { user } = useAuth()

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((perm) => hasPermission(perm))
  }

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((perm) => hasPermission(perm))
  }

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) ?? false
  }

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
  }
}
```

### 6. Layout Principal

`app/layout.tsx`:

```typescript
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 7. Página de Login

`app/login/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });

      // Redirigir a la página original o al dashboard
      const redirect = searchParams.get('redirect') || '/dashboard';
      router.push(redirect);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">Iniciar Sesión</h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 8. Dashboard Protegido

`app/dashboard/page.tsx`:

```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">
              Bienvenido, {user.username}!
            </h2>

            <div className="space-y-2">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Roles:</strong> {user.roles.join(', ')}</p>
              <p><strong>Permisos:</strong></p>
              <ul className="list-disc list-inside">
                {user.permissions.map((perm) => (
                  <li key={perm}>{perm}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

### 9. Middleware de Next.js (Opcional)

`middleware.ts`:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas
  const publicRoutes = ['/login', '/register']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Verificar cookies
  const accessToken = request.cookies.get('accessToken')
  const refreshToken = request.cookies.get('refreshToken')

  // Si no hay tokens, redirigir a login
  if (!accessToken && !refreshToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next|static|favicon.ico|.*\\..*|login|register).*)'],
}
```

### 10. Componente de Protección por Permisos

`components/ProtectedComponent.tsx`:

```typescript
import { usePermissions } from '@/hooks/usePermissions';

interface ProtectedComponentProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function ProtectedComponent({
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  children,
}: ProtectedComponentProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

## Flujo de Autenticación

```
1. INICIO DE SESIÓN
   Usuario → POST /auth/login
   Backend → Setea cookies (accessToken + refreshToken)
   Frontend → Recibe {user} (sin tokens)
   AuthContext → actualiza estado

2. REQUESTS NORMALES
   Frontend → GET /api/cualquier-cosa
   Browser → Envía cookies automáticamente
   Backend → Lee accessToken de cookie
   Backend → Responde con datos

3. TOKEN EXPIRADO (15 min)
   Frontend → GET /api/algo
   Backend → 401 Unauthorized
   Interceptor → POST /auth/refresh
   Backend → Genera nuevos tokens
   Backend → Setea nuevas cookies
   Frontend → Reintenta request ✅

4. REFRESH TOKEN EXPIRADO (7 días)
   Frontend → POST /auth/refresh
   Backend → 401 Unauthorized
   Frontend → Redirige a /login

5. VERIFICACIÓN AL CARGAR
   App → useEffect checkAuth()
   Frontend → GET /auth/me
   Backend → Lee cookie y responde
   AuthContext → actualiza estado

6. LOGOUT
   Usuario → Click "Cerrar Sesión"
   Frontend → POST /auth/logout
   Backend → Revoca tokens y limpia cookies
   Frontend → Redirige a /login
```

## Pruebas

### 1. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  -c cookies.txt
```

### 2. Verificar Sesión

```bash
curl -X GET http://localhost:3000/auth/me \
  -b cookies.txt
```

### 3. Refresh Token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

### 4. Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -b cookies.txt
```

## Notas de Seguridad

- ✅ Las cookies son **httpOnly**: JavaScript no puede leerlas
- ✅ Las cookies son **secure** en producción: Solo HTTPS
- ✅ **SameSite=strict** en producción: Protección CSRF
- ✅ **Token Rotation**: Cada refresh invalida el anterior
- ✅ Tokens hasheados en BD: No se pueden reutilizar

## Troubleshooting

### Problema: "No refresh token found"

- Verifica que CORS_CREDENTIALS=true en .env
- Verifica withCredentials: true en axios
- Verifica que CORS_ORIGIN incluya tu frontend

### Problema: Cookies no se envían

- Verifica que backend y frontend estén en el mismo dominio en producción
- En desarrollo, asegúrate de usar localhost (no 127.0.0.1)
- Verifica que sameSite='lax' en desarrollo

### Problema: Infinite redirect en middleware

- Asegúrate de que las rutas públicas estén excluidas
- Verifica que el matcher no intercepte /api o /\_next
