#!/bin/bash

echo "=================================="
echo "Sistema de Notificaciones - Setup"
echo "=================================="
echo ""

echo "1. Instalando dependencias..."
npm install

echo ""
echo "2. Iniciando PostgreSQL y Redis..."
docker-compose up -d

echo ""
echo "3. Esperando a que los servicios estén listos..."
sleep 5

echo ""
echo "=================================="
echo "Setup completado!"
echo "=================================="
echo ""
echo "Para iniciar el servidor:"
echo "  npm run start:dev"
echo ""
echo "Para abrir el cliente de prueba:"
echo "  http://localhost:3000/index.html"
echo ""
echo "Para ejecutar tests:"
echo "  npm run test:e2e"
echo ""
