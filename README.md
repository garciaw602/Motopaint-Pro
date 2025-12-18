<table>
  <tr>
    <td><img src="https://github.com/garciaw602/Motopaint-Pro/blob/main/MotoPaintPro1.gif" width="600"></td>
    <td><img src="https://github.com/garciaw602/Motopaint-Pro/blob/main/MotoPaintPro2.gif" width="600"></td>
    <td><img src="https://github.com/garciaw602/Motopaint-Pro/blob/main/MotoPaintPro3.gif" width="600"></td>
  </tr>
</table>

Trading Sentinel: PWA de Gestión de Riesgo y Psicología
Trading Sentinel: PWA de Gestión de Riesgo y Psicología
oct. 2025 - nov. 2025oct. 2025 - nov. 2025
Este programa es una Aplicación Web Progresiva (PWA) de Gestión de Riesgo para Opciones Binarias (Trading), construida con React y TypeScript.

Dirección Estratégica y Desarrollo:
Ingeniería Financiera: Ideé el núcleo del sistema basado en "Gestión por Bloques". Diseñé un algoritmo híbrido que alterna automáticamente entre interés compuesto (para maximizar rachas positivas) y recuperación controlada (para mitigar pérdidas), definiendo límites estrictos de Take Profit (3.33%) y Stop Loss (3%).

Arquitectura de Software: Estructuré la aplicación utilizando React 19, TypeScript y Vite. Implementé una arquitectura modular basada en Custom Hooks (useTradingLogic) para separar el motor de cálculo matemático de la interfaz visual, garantizando reactividad y precisión.

Diseño de Producto (UX/UI): Definí una interfaz de alta prioridad con Tailwind CSS y Radix UI, centrada en la visualización de datos críticos (Stake sugerido y Capital actual). Incluí sistemas de retroalimentación visual y auditiva para reforzar la disciplina operativa del usuario.

Análisis y Persistencia: Conceptualicé herramientas de journaling y análisis estadístico, incluyendo un "Heatmap" de consistencia mensual y curvas de equidad mediante Recharts. La persistencia se maneja localmente para garantizar la privacidad total de los datos financieros.

Validación Técnica: Superviso la precisión de los algoritmos de cálculo para asegurar cero margen de error en operaciones con capital real, iterando constantemente sobre la usabilidad del Dashboard.







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
