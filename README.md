

MotoPaint Pro: Sistema de Gestión de Flujo de Taller con Trazabilidad Granular y Asistencia IA
nov. 2025 - actualidadnov. 2025 - actualidad
<table>
  <tr>
    <td><img src="https://github.com/garciaw602/Motopaint-Pro/blob/main/MotoPaintPro1.gif" width="600"></td>
    <td><img src="https://github.com/garciaw602/Motopaint-Pro/blob/main/MotoPaintPro2.gif" width="600"></td>
    <td><img src="https://github.com/garciaw602/Motopaint-Pro/blob/main/MotoPaintPro3.gif" width="600"></td>
  </tr>
</table>



MotoPaint Pro es una SPA diseñada para transformar la gestión de talleres de pintura de motos, eliminando el papel y garantizando trazabilidad total mediante el seguimiento individual de piezas.

Desarrollo y Dirección del Proyecto:

Lógica de Negocio: Ideé el flujo operativo secuencial (Pre-alistamiento a Entrega) con control granular por pieza. Definí reglas automáticas de estados y optimización de procesos según el acabado (Mate vs. Brillante).

Arquitectura y Seguridad: Estructuré un sistema de roles y permisos (RBAC) para Administración, Recepción, Operarios y Mensajería, garantizando que cada usuario acceda solo a la información crítica para su labor.

Diseño UI/UX: Definí los requerimientos de una interfaz responsiva con Tailwind CSS, optimizada para el uso móvil de los operarios y un Dashboard con métricas en tiempo real para la gestión administrativa.

Integración de IA: Implementé la API de Google Gemini para reportes de productividad automáticos y optimización logística de rutas. Incorporé Text-to-Speech (TTS) para briefings operativos manos libres.

Control de Calidad: Supervisé la corrección de errores en lógica de permisos y servicios de almacenamiento, además de estructurar datos semilla realistas para validación y demos.

Tecnologías: React, Tailwind CSS, Google Gemini API, Prompt Engineering.







<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1nOUv1pdfEoZHM4peBOCgcLGP9hyNMuDm

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
