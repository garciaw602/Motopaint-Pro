
import { GoogleGenAI, Modality } from "@google/genai";
import { Order } from '../types';

// Safety check to prevent crash if process is not defined in the environment
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
        return process.env.API_KEY || '';
    }
    return '';
  } catch (e) {
    console.warn("process.env.API_KEY not accessible");
    return '';
  }
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

export const GeminiService = {
  async generateDailyReport(orders: Order[]): Promise<string> {
    if (!apiKey) return "API Key no configurada.";

    try {
      const pendingOrders = orders.filter(o => o.items.some(i => i.status === 'En Proceso'));
      const finishedOrders = orders.filter(o => o.items.every(i => i.status === 'Finalizado'));

      // Simplify data for the prompt to save tokens
      const simplifiedData = JSON.stringify({
        totalPending: pendingOrders.length,
        totalFinished: finishedOrders.length,
        pendingDetails: pendingOrders.map(o => ({
          client: o.clientName,
          model: o.modelName,
          partsCount: o.items.length,
          colors: o.items.map(i => i.colorName).join(', ')
        }))
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Actúa como un jefe de taller experto. Analiza estos datos de órdenes de pintura de motos: ${simplifiedData}. 
        Genera un reporte corto (max 150 palabras) en español.
        1. Resumen de carga de trabajo actual.
        2. Alerta sobre colores más solicitados.
        3. Recomendación de prioridad.
        Usa formato markdown simple.`,
      });

      return response.text || "No se pudo generar el reporte.";
    } catch (error) {
      console.error("Error generating report:", error);
      return "Error al conectar con el servicio de IA.";
    }
  },

  async generateAreaContextReport(area: string, role: 'LIDER' | 'OPERARIO', items: any[]): Promise<string> {
      if (!apiKey) return "API Key no configurada.";

      try {
          // Simplify items for prompt
          const simplifiedItems = items.map(i => ({
              part: i.partName,
              status: i.status || i.currentStatus,
              color: i.colorCode,
              urgent: i.estimatedDeliveryDate ? (new Date(i.estimatedDeliveryDate).getTime() - new Date().getTime() < 172800000) : false,
              reworks: i.reworkCount
          })).slice(0, 30); // Limit to 30 items to avoid token limits

          const prompt = role === 'LIDER' 
              ? `Actúa como consultor de procesos para el Líder del área de ${area} en un taller de pintura de motos.
                 Analiza estas piezas en cola/proceso: ${JSON.stringify(simplifiedItems)}.
                 Genera un reporte verbal corto (máx 100 palabras) en español enfocado en:
                 1. Cuellos de botella potenciales.
                 2. Piezas urgentes o con reprocesos (reworks > 0) que requieren supervisión.
                 3. Sugerencia de asignación de recursos.
                 Usa un tono profesional y directivo.`
              : `Actúa como un capataz experto motivando a los operarios del área de ${area}.
                 Analiza el trabajo pendiente: ${JSON.stringify(simplifiedItems)}.
                 Genera un briefing corto (máx 80 palabras) en español enfocado en:
                 1. Prioridades técnicas (colores complejos o piezas urgentes).
                 2. Recordatorio breve de calidad específico para ${area}.
                 3. Una frase motivacional corta al final.
                 Usa un tono cercano pero exigente.`;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
          });

          return response.text || "No se pudo generar el reporte de área.";

      } catch (error) {
          console.error("Error generating area report:", error);
          return "Error al generar análisis de área.";
      }
  },

  async generateAudioFromText(text: string): Promise<string | null> {
    if (!apiKey) return null;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
            },
          },
        },
      });

      // Returns the base64 string of raw PCM data
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (error) {
      console.error("Error generating audio:", error);
      return null;
    }
  },

  async optimizeRoute(locations: {id: string, address: string, client: string, urgent: boolean}[]): Promise<{explanation: string, orderedIds: string[], waypoints: string[]}> {
      if (!apiKey) return { explanation: "API Key no configurada.", orderedIds: [], waypoints: [] };
      
      const locationsStr = JSON.stringify(locations);
      
      try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Actúa como un experto en logística de entregas en ciudad. 
            Organiza la siguiente lista de entregas para un mensajero en moto.
            
            Ubicaciones (con IDs): ${locationsStr}
            
            Criterios:
            1. Prioridad absoluta a 'urgent: true'.
            2. Agrupa por proximidad geográfica (asume una ciudad estándar).
            3. Ten en cuenta el tráfico típico urbano (evita cruces innecesarios).
            
            Salida JSON Esperada:
            {
                "explanation": "Texto corto explicando la estrategia (max 50 palabras).",
                "orderedIds": ["id_1", "id_2", ...],
                "orderedAddresses": ["direccion 1", "direccion 2", ...]
            }
            IMPORTANTE: "orderedIds" debe contener EXACTAMENTE los IDs proporcionados en la entrada, en el orden optimizado. Solo devuelve el JSON.`,
          });

          const text = response.text || '';
          const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const result = JSON.parse(jsonStr);

          return {
              explanation: result.explanation,
              orderedIds: result.orderedIds || [],
              waypoints: result.orderedAddresses || []
          };

      } catch (error) {
          console.error("Error optimizing route:", error);
          // Fallback: return original order
          return { 
              explanation: "No se pudo optimizar la ruta. Intente de nuevo.", 
              orderedIds: locations.map(l => l.id),
              waypoints: locations.map(l => l.address) 
          };
      }
  }
};
