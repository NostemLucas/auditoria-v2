# Ejemplos de Uso del API

## API REST

### 1. Crear Usuario

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "juan",
    "email": "juan@example.com"
  }'
```

### 2. Crear Sala

```bash
curl -X POST http://localhost:3000/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ventas",
    "description": "Sala del equipo de ventas"
  }'
```

### 3. Enviar Notificación (vía REST)

```bash
# Notificación global
curl -X POST http://localhost:3000/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mantenimiento",
    "message": "Sistema en mantenimiento a las 2am",
    "type": "warning"
  }'

# Notificación a sala específica
curl -X POST http://localhost:3000/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nueva Venta",
    "message": "Cliente compró $500",
    "type": "success",
    "roomName": "ventas"
  }'

# Notificación personal
curl -X POST http://localhost:3000/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mensaje Privado",
    "message": "Tienes un nuevo mensaje",
    "type": "info",
    "username": "juan"
  }'
```

### 4. Obtener Notificaciones de Usuario

```bash
curl http://localhost:3000/notifications/user/juan?limit=10
```

### 5. Obtener Notificaciones de Sala

```bash
curl http://localhost:3000/notifications/room/ventas?limit=20
```

### 6. Obtener Estadísticas

```bash
curl http://localhost:3000/notifications/stats
```

### 7. Marcar Notificación como Leída

```bash
# Primero obtén el ID de una notificación
NOTIF_ID="uuid-de-la-notificacion"

curl -X POST http://localhost:3000/notifications/$NOTIF_ID/read
```

### 8. Listar Salas Activas

```bash
curl http://localhost:3000/rooms
```

## WebSocket (JavaScript)

### Cliente Básico

```javascript
import { io } from 'socket.io-client';

// Conectar al servidor
const socket = io('http://localhost:3000');

// Eventos del cliente
socket.on('connect', () => {
  console.log('Conectado!');

  // Unirse a una sala
  socket.emit('joinRoom', {
    roomName: 'ventas',
    username: 'juan'
  });
});

socket.on('joinedRoom', (data) => {
  console.log('Te uniste a la sala:', data.roomName);
});

socket.on('notification', (notification) => {
  console.log('Nueva notificación:', notification);
  // Aquí mostrarías la notificación en tu UI
});

socket.on('userJoined', (data) => {
  console.log(`${data.username} se unió a ${data.roomName}`);
});

socket.on('userLeft', (data) => {
  console.log(`${data.username} salió de ${data.roomName}`);
});

// Enviar una notificación
function enviarNotificacion() {
  socket.emit('sendNotification', {
    title: 'Prueba',
    message: 'Este es un mensaje de prueba',
    type: 'info',
    roomName: 'ventas'
  });
}

// Salir de una sala
function salirDeSala() {
  socket.emit('leaveRoom', {
    roomName: 'ventas',
    username: 'juan'
  });
}

// Marcar como leída
function marcarLeida(notificationId) {
  socket.emit('markAsRead', { notificationId });
}

// Obtener salas activas
socket.emit('getActiveRooms', {}, (response) => {
  console.log('Salas activas:', response.rooms);
});
```

## Casos de Uso Comunes

### 1. Sistema de Chat en Tiempo Real

```javascript
// Usuario se une a sala de chat
socket.emit('joinRoom', {
  roomName: 'chat-general',
  username: 'pedro'
});

// Enviar mensaje a la sala
socket.emit('sendNotification', {
  title: 'pedro',
  message: 'Hola a todos!',
  type: 'info',
  roomName: 'chat-general',
  metadata: {
    messageType: 'chat',
    timestamp: new Date().toISOString()
  }
});
```

### 2. Notificaciones de Sistema

```javascript
// Notificar a todos los usuarios conectados
socket.emit('sendNotification', {
  title: 'Actualización del Sistema',
  message: 'Nueva versión disponible',
  type: 'warning'
});
```

### 3. Alertas por Departamento

```javascript
// Notificar solo al departamento de ventas
socket.emit('sendNotification', {
  title: 'Meta Alcanzada',
  message: 'Hemos superado la meta mensual!',
  type: 'success',
  roomName: 'ventas',
  metadata: {
    achievement: 'monthly_sales',
    amount: 100000
  }
});
```

### 4. Notificaciones Personales

```javascript
// Enviar notificación solo a un usuario específico
socket.emit('sendNotification', {
  title: 'Tarea Asignada',
  message: 'Te han asignado una nueva tarea',
  type: 'info',
  username: 'maria',
  metadata: {
    taskId: '12345',
    priority: 'high'
  }
});
```

### 5. Sistema de Múltiples Salas por Usuario

```javascript
// Un usuario puede estar en múltiples salas
const salas = ['ventas', 'soporte', 'general'];

salas.forEach(sala => {
  socket.emit('joinRoom', {
    roomName: sala,
    username: 'carlos'
  });
});

// Recibirá notificaciones de todas las salas
socket.on('notification', (notification) => {
  console.log(`Notificación en sala: ${notification.roomId}`);
});
```

## Prueba de Alta Disponibilidad

### Ejecutar Múltiples Instancias

```bash
# Terminal 1
PORT=3000 npm run start:dev

# Terminal 2
PORT=3001 npm run start:dev

# Terminal 3
PORT=3002 npm run start:dev
```

### Conectar Clientes a Diferentes Instancias

```javascript
// Cliente 1 conectado al servidor en puerto 3000
const client1 = io('http://localhost:3000');

// Cliente 2 conectado al servidor en puerto 3001
const client2 = io('http://localhost:3001');

// Ambos se unen a la misma sala
client1.emit('joinRoom', { roomName: 'test', username: 'user1' });
client2.emit('joinRoom', { roomName: 'test', username: 'user2' });

// Cuando client1 envía una notificación...
client1.emit('sendNotification', {
  title: 'Test',
  message: 'Prueba de alta disponibilidad',
  roomName: 'test'
});

// ...client2 la recibe aunque esté en otro servidor (gracias a Redis)
client2.on('notification', (notif) => {
  console.log('Recibido en cliente 2:', notif);
});
```

## Monitoreo y Debugging

### Ver Todas las Salas Activas

```bash
curl http://localhost:3000/rooms | jq
```

### Ver Estadísticas de Notificaciones

```bash
curl http://localhost:3000/notifications/stats | jq
```

### Ver Notificaciones Recientes de una Sala

```bash
curl http://localhost:3000/notifications/room/ventas?limit=5 | jq
```

### Verificar Conexión de un Usuario

```bash
curl http://localhost:3000/users/juan | jq
```

## Integración con Frontend

### React Hook Personalizado

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useNotifications(username: string, rooms: string[]) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const newSocket = io('http://localhost:3000');

    newSocket.on('connect', () => {
      // Unirse a todas las salas
      rooms.forEach(room => {
        newSocket.emit('joinRoom', { roomName: room, username });
      });
    });

    newSocket.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [username, rooms]);

  const sendNotification = (data: any) => {
    socket?.emit('sendNotification', data);
  };

  const markAsRead = (notificationId: string) => {
    socket?.emit('markAsRead', { notificationId });
  };

  return { notifications, sendNotification, markAsRead };
}
```

### Vue.js Composable

```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

export function useNotifications(username: string, rooms: string[]) {
  const socket = ref<Socket | null>(null);
  const notifications = ref([]);

  onMounted(() => {
    socket.value = io('http://localhost:3000');

    socket.value.on('connect', () => {
      rooms.forEach(room => {
        socket.value?.emit('joinRoom', { roomName: room, username });
      });
    });

    socket.value.on('notification', (notification) => {
      notifications.value.unshift(notification);
    });
  });

  onUnmounted(() => {
    socket.value?.disconnect();
  });

  const sendNotification = (data: any) => {
    socket.value?.emit('sendNotification', data);
  };

  return { notifications, sendNotification };
}
```
