import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { Order } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, CheckCircle, Clock, Sparkles, Volume2, StopCircle, Loader2 } from 'lucide-react';

// Helper function to decode base64 string to byte array
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to decode raw PCM data into an AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [aiReport, setAiReport] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  
  // Audio State
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Theme detection for charts
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setOrders(StorageService.getOrders());
    // Check initial theme
    setIsDark(document.documentElement.classList.contains('dark'));
    
    // Optional: Listen for theme changes if not full refresh
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDark(document.documentElement.classList.contains('dark'));
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => {
        observer.disconnect();
        stopAudio(); // Cleanup audio on unmount
    };
  }, []);

  // Updated Logic for New Workflow
  const pendingPartsCount = orders.reduce((acc, order) => {
    // Count items that are NOT finished
    return acc + order.items.filter(i => i.currentStatus !== 'FINALIZADA').length;
  }, 0);

  const finishedPartsCount = orders.reduce((acc, order) => {
    // Count items that ARE finished
    return acc + order.items.filter(i => i.currentStatus === 'FINALIZADA').length;
  }, 0);

  const activeOrdersCount = orders.filter(o => o.items.some(i => i.currentStatus !== 'FINALIZADA')).length;

  const handleGenerateReport = async () => {
    stopAudio(); // Stop any previous audio
    setLoadingAi(true);
    const report = await GeminiService.generateDailyReport(orders);
    setAiReport(report);
    setLoadingAi(false);
  };

  const handlePlayAudio = async () => {
    if (!aiReport) return;
    
    // Initialize AudioContext on user gesture
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    if (isPlaying) {
        stopAudio();
        return;
    }

    setLoadingAudio(true);
    try {
        // Clean markdown symbols for better speech
        const cleanText = aiReport.replace(/[#*]/g, '');
        const base64Audio = await GeminiService.generateAudioFromText(cleanText);
        
        if (base64Audio && audioContextRef.current) {
            const audioBytes = decodeBase64(base64Audio);
            const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current);
            
            // Create source
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            
            source.onended = () => {
                setIsPlaying(false);
                sourceNodeRef.current = null;
            };

            source.start();
            sourceNodeRef.current = source;
            setIsPlaying(true);
        }
    } catch (error) {
        console.error("Audio playback error", error);
    } finally {
        setLoadingAudio(false);
    }
  };

  const stopAudio = () => {
      if (sourceNodeRef.current) {
          try {
            sourceNodeRef.current.stop();
          } catch (e) { /* ignore if already stopped */ }
          sourceNodeRef.current = null;
      }
      setIsPlaying(false);
  };

  // Data for Charts
  const clientDataMap = new Map<string, number>();
  orders.forEach(o => {
    // Count active orders per client
    if (o.items.some(i => i.currentStatus !== 'FINALIZADA')) {
        const count = clientDataMap.get(o.clientName) || 0;
        clientDataMap.set(o.clientName, count + 1);
    }
  });

  const chartData = Array.from(clientDataMap).map(([name, count]) => ({ name, orders: count }));

  return (
    <div className="p-6 bg-gray-100 dark:bg-slate-900 min-h-full transition-colors">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Panel de Control</h2>
        <p className="text-gray-500 dark:text-gray-400">Resumen de operaciones del taller</p>
      </div>

      {/* Stats Cards */}
      <div id="tour-dashboard-cards" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex items-center transition-all duration-300 hover:scale-[1.03] hover:shadow-xl cursor-default">
            <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 mr-4">
                <Activity size={24} />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Motos Activas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeOrdersCount}</p>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex items-center transition-all duration-300 hover:scale-[1.03] hover:shadow-xl cursor-default">
            <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 mr-4">
                <Clock size={24} />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Piezas en Proceso</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingPartsCount}</p>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex items-center transition-all duration-300 hover:scale-[1.03] hover:shadow-xl cursor-default">
            <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 mr-4">
                <CheckCircle size={24} />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Piezas Finalizadas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{finishedPartsCount}</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Chart: Orders by Client */}
        <div id="tour-dashboard-chart" className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl min-w-0">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Motos Activas por Cliente</h3>
            <div className="h-64 w-full min-w-0">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <XAxis 
                                dataKey="name" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                                stroke={isDark ? "#94a3b8" : "#64748b"} 
                                tick={{ fill: isDark ? "#94a3b8" : "#64748b" }}
                            />
                            <YAxis 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                                allowDecimals={false} 
                                stroke={isDark ? "#94a3b8" : "#64748b"}
                                tick={{ fill: isDark ? "#94a3b8" : "#64748b" }} 
                            />
                            <Tooltip 
                                cursor={{fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}}
                                contentStyle={{ 
                                    backgroundColor: isDark ? '#1e293b' : '#ffffff', 
                                    borderColor: isDark ? '#334155' : '#e2e8f0', 
                                    color: isDark ? '#f1f5f9' : '#0f172a',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                                itemStyle={{ color: isDark ? '#f1f5f9' : '#0f172a' }}
                            />
                            <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">Sin datos activos</div>
                )}
            </div>
        </div>

        {/* AI Insight Section */}
        <div id="tour-dashboard-ai" className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden min-w-0 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl flex flex-col">
             <div className="relative z-10 flex-1">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="text-yellow-400" /> Asistente IA (Gemini)
                </h3>
                <p className="text-indigo-200 text-sm mb-4">
                    Obtén un análisis instantáneo de la carga de trabajo y recomendaciones para el equipo de pintura.
                </p>
                
                {aiReport && (
                    <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm text-sm leading-relaxed mb-4 max-h-48 overflow-y-auto custom-scrollbar">
                        <div dangerouslySetInnerHTML={{ __html: aiReport.replace(/\n/g, '<br/>') }} />
                    </div>
                )}
                
                <div className="mt-auto flex gap-3">
                    <button 
                        onClick={handleGenerateReport}
                        disabled={loadingAi}
                        className="bg-white text-indigo-900 px-4 py-2 rounded-md font-medium hover:bg-indigo-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                    >
                        {loadingAi ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        {loadingAi ? 'Analizando...' : 'Generar Reporte'}
                    </button>

                    {aiReport && (
                        <button
                            onClick={handlePlayAudio}
                            disabled={loadingAudio}
                            className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 shadow-lg border border-white/20 ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-indigo-800 hover:bg-indigo-700 text-white'}`}
                        >
                            {loadingAudio ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : isPlaying ? (
                                <StopCircle size={18} />
                            ) : (
                                <Volume2 size={18} />
                            )}
                            {isPlaying ? 'Detener' : 'Escuchar'}
                        </button>
                    )}
                </div>
             </div>
             {/* Decorative blob */}
             <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-purple-500 rounded-full blur-3xl opacity-30"></div>
        </div>
      </div>
    </div>
  );
};