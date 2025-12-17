
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { Order, Employee, OrderItem, ItemHistoryEntry, ItemProcessStatus, AreaType, DeliveryType } from '../types';
import { Check, Bell, X, CheckCircle, Search, RefreshCw, AlertTriangle, Calendar, Sun, Moon, ArrowLeft, ArrowRight, Barcode, History, Info, User, Puzzle, Sparkles, Volume2, StopCircle, Loader2, Truck, Navigation, MapPin, ExternalLink, Package, Lock } from 'lucide-react';

// Helper to decode base64 string to byte array
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

interface AreaOperatorProps {
    area: AreaType;
}

interface TaskWithContext {
    order: Order;
    item: OrderItem;
}

export const AreaOperator: React.FC<AreaOperatorProps> = ({ area }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasksByEmployee, setTasksByEmployee] = useState<Record<string, TaskWithContext[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);

  // Damage Report State
  const [damageModal, setDamageModal] = useState<{
      isOpen: boolean;
      orderId: string | null;
      itemId: string | null;
      partName: string | null;
  }>({ isOpen: false, orderId: null, itemId: null, partName: null });
  const [damageReason, setDamageReason] = useState('');
  const [historyItem, setHistoryItem] = useState<OrderItem | null>(null);

  // Shipping Tracking Input State (Keyed by Order ID)
  const [trackingInputs, setTrackingInputs] = useState<Record<string, { carrier: string, code: string }>>({});

  // AI Assistant State
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiReport, setAiReport] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  
  // Route Assistant State
  const [showRouteMode, setShowRouteMode] = useState(false);
  const [routeTasks, setRouteTasks] = useState<TaskWithContext[]>([]);
  const [routeExplanation, setRouteExplanation] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Audio State
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    setEmployees(StorageService.getEmployees());
    
    // Get Current User for Privacy Filtering
    const userStr = localStorage.getItem('motopaint_user');
    if (userStr) {
        setCurrentUser(JSON.parse(userStr));
    }

    refreshTasks();
    const interval = setInterval(refreshTasks, 3000);
    return () => {
        clearInterval(interval);
        stopAudio();
        if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [area]);

  const refreshTasks = () => {
    const allOrders = StorageService.getOrders();
    const grouped: Record<string, TaskWithContext[]> = {};
    
    allOrders.forEach(order => {
        order.items.forEach(item => {
            // Filter: Item must be in current area AND have an assigned employee AND NOT be in revision
            if (item.currentArea === area && item.assignedEmployeeId && item.currentStatus !== 'EN_REVISION') {
                if (!grouped[item.assignedEmployeeId]) {
                    grouped[item.assignedEmployeeId] = [];
                }
                grouped[item.assignedEmployeeId].push({ order, item });
            }
        });
    });
    setTasksByEmployee(grouped);

    // If Route Mode is active, remove finished tasks from the route view
    if (showRouteMode) {
        setRouteTasks(prev => prev.filter(t => 
            allOrders.some(o => o.id === t.order.id && o.items.some(i => i.id === t.item.id && i.currentStatus !== 'EN_REVISION'))
        ));
    }
  };

  // --- TRACKING INPUT HANDLER ---
  const handleTrackingChange = (orderId: string, field: 'carrier' | 'code', value: string) => {
      setTrackingInputs(prev => ({
          ...prev,
          [orderId]: {
              ...prev[orderId],
              [field]: value
          }
      }));
  };

  const isUrgent = (dateStr?: string) => {
      if (!dateStr) return false;
      const delivery = new Date(dateStr);
      const now = new Date();
      const diff = delivery.getTime() - now.getTime();
      return diff < 172800000; 
  };

  // --- ROUTE OPTIMIZATION FOR EMPLOYEE ---
  const handleOptimizeEmployeeRoute = async (employeeId: string) => {
      const tasks = tasksByEmployee[employeeId] || [];
      if (tasks.length === 0) return;

      setIsOptimizing(true);
      setShowRouteMode(true);
      stopAudio();

      // 1. Separate Local vs National tasks
      // Group by Order ID to avoid duplicate locations for multiple items in same order
      const localDeliveryOrders = new Map<string, TaskWithContext>(); // Key: OrderID
      const nationalTasks: TaskWithContext[] = [];

      tasks.forEach(task => {
          if (task.order.clientDeliveryType === 'ENTREGA_LOCAL' && task.order.clientAddress) {
              if (!localDeliveryOrders.has(task.order.id)) {
                  localDeliveryOrders.set(task.order.id, task);
              }
          } else if (task.order.clientDeliveryType === 'ENVIO_NACIONAL' || task.order.clientDeliveryType === 'ENVIO_INTERNACIONAL') {
              nationalTasks.push(task);
          }
      });

      // 2. Prepare for Optimization (Only Local)
      const locationsToOptimize = Array.from(localDeliveryOrders.values()).map(({ order }) => ({
          id: order.id,
          address: `${order.clientAddress}, ${order.clientCity || ''}`,
          client: order.clientName,
          urgent: isUrgent(order.estimatedDeliveryDate)
      }));

      let orderedTasks: TaskWithContext[] = [];
      let explanation = "Ruta optimizada.";

      if (locationsToOptimize.length > 0) {
          const result = await GeminiService.optimizeRoute(locationsToOptimize);
          explanation = result.explanation;

          // Re-order tasks based on result.orderedIds
          // Note: result.orderedIds are Order IDs. We need to expand back to all items for that order.
          result.orderedIds.forEach(orderId => {
               const orderTasks = tasks.filter(t => t.order.id === orderId && t.order.clientDeliveryType === 'ENTREGA_LOCAL');
               orderedTasks.push(...orderTasks);
          });
      }

      // Add National Tasks at the end (Messenger goes to carrier office)
      orderedTasks = [...orderedTasks, ...nationalTasks];

      // Fallback: If optimization failed or empty, just use the filter
      if (orderedTasks.length === 0 && tasks.length > 0) {
          orderedTasks = tasks;
      }

      setRouteTasks(orderedTasks);
      setRouteExplanation(explanation);
      setIsOptimizing(false);
  };

  // Helper to generate dynamic map link for remaining stops
  const getDynamicMapLink = () => {
      // Filter unique addresses from remaining local tasks
      const addresses = new Set<string>();
      routeTasks.forEach(t => {
          if (t.order.clientDeliveryType === 'ENTREGA_LOCAL' && t.order.clientAddress) {
              addresses.add(`${t.order.clientAddress}, ${t.order.clientCity || ''}`);
          }
      });
      
      const uniqueAddresses = Array.from(addresses);
      if (uniqueAddresses.length === 0) return null;

      const origin = "Sede MotoPaint";
      const destination = uniqueAddresses[uniqueAddresses.length - 1];
      const waypoints = uniqueAddresses.length > 1 ? uniqueAddresses.slice(0, -1).join('|') : '';
      
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
  };

  const getSingleStopMapLink = (task: TaskWithContext) => {
      const address = `${task.order.clientAddress}, ${task.order.clientCity || ''}`;
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;
  };

  // --- AI ASSISTANT LOGIC ---
  const handleGenerateAiReport = async () => {
      setShowAiAssistant(true);
      setLoadingAi(true);
      setAiReport('');
      stopAudio();

      const allActiveTasks: any[] = [];
      Object.values(tasksByEmployee).forEach((list: any) => {
          list.forEach(({order, item}: any) => {
             allActiveTasks.push({
                 partName: item.partName,
                 status: item.currentStatus,
                 colorCode: item.colorCode,
                 estimatedDeliveryDate: order.estimatedDeliveryDate,
                 reworkCount: item.reworkCount
             });
          });
      });

      const report = await GeminiService.generateAreaContextReport(area, 'OPERARIO', allActiveTasks);
      setAiReport(report);
      setLoadingAi(false);
  };

  const handlePlayAudioText = async (text: string) => {
      if (!text) return;
      if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      if (isPlaying) { stopAudio(); return; }

      setLoadingAudio(true);
      try {
          const cleanText = text.replace(/[#*]/g, '');
          const base64Audio = await GeminiService.generateAudioFromText(cleanText);
          if (base64Audio && audioContextRef.current) {
              const audioBytes = decodeBase64(base64Audio);
              const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current);
              const source = audioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContextRef.current.destination);
              source.onended = () => { setIsPlaying(false); sourceNodeRef.current = null; };
              source.start();
              sourceNodeRef.current = source;
              setIsPlaying(true);
          }
      } catch (error) { console.error(error); } finally { setLoadingAudio(false); }
  };

  const stopAudio = () => {
      if (sourceNodeRef.current) { try { sourceNodeRef.current.stop(); } catch(e){} sourceNodeRef.current = null; }
      setIsPlaying(false);
  };

  const getPreviousStateAndArea = (currentItem: OrderItem): { status: ItemProcessStatus, area: AreaType } => {
      const { currentStatus } = currentItem;
      switch (currentStatus) {
          case 'ALISTAMIENTO_1': return { status: 'PREALISTAMIENTO', area: 'PREALISTAMIENTO' };
          case 'PINTURA_BASE': return { status: 'ALISTAMIENTO_1', area: 'ALISTAMIENTO' };
          case 'ALISTAMIENTO_2': return { status: 'PINTURA_BASE', area: 'PINTURA' };
          case 'PINTURA_COLOR': return { status: 'ALISTAMIENTO_2', area: 'ALISTAMIENTO' };
          case 'PULIDO': return { status: 'PINTURA_COLOR', area: 'PINTURA' };
          case 'DESPACHOS': 
             if (currentItem.finishType === 'BRILLANTE') {
                 return { status: 'PULIDO', area: 'PULIDO' };
             }
             return { status: 'PINTURA_COLOR', area: 'PINTURA' };
          case 'ENTREGAS': return { status: 'DESPACHOS', area: 'DESPACHOS' };
          default: return { status: 'PENDIENTE', area: currentItem.currentArea };
      }
  };

  const handleFinishTask = (orderId: string, itemId: string, empId: string, deliveryType?: DeliveryType) => {
    // Check Shipping Data Requirement for Messengers
    if (area === 'ENTREGAS' && (deliveryType === 'ENVIO_NACIONAL' || deliveryType === 'ENVIO_INTERNACIONAL')) {
        const tracking = trackingInputs[orderId];
        if (!tracking || !tracking.carrier || !tracking.code) {
            alert("⚠️ Por favor ingresa la Transportadora y el No. de Guía antes de terminar.");
            return;
        }
    }

    const allOrders = StorageService.getOrders();
    const updatedOrders = allOrders.map(order => {
        if (order.id !== orderId) return order;

        let updatedOrder = { ...order };
        if (area === 'ENTREGAS' && (deliveryType === 'ENVIO_NACIONAL' || deliveryType === 'ENVIO_INTERNACIONAL')) {
            const tracking = trackingInputs[orderId];
            if (tracking) {
                updatedOrder.shippingCarrier = tracking.carrier;
                updatedOrder.shippingTrackingCode = tracking.code;
            }
        }
        
        const updatedItems = updatedOrder.items.map(item => {
            if (item.id !== itemId) return item;
            
            const historyEntry: ItemHistoryEntry = {
                id: Math.random().toString(36).substr(2, 9),
                date: new Date().toISOString(),
                action: 'EN_REVISION',
                actorName: employees.find(e => e.id === empId)?.name || 'Operario',
                areaOrigen: area,
                notes: area === 'ENTREGAS' ? 'Entregado por mensajero' : 'Tarea finalizada por operario.',
                attemptNumber: item.reworkCount
            };

            return {
                ...item,
                lastStatus: item.currentStatus, 
                currentStatus: 'EN_REVISION' as ItemProcessStatus,
                history: [...(item.history || []), historyEntry]
            };
        });
        return { ...updatedOrder, items: updatedItems };
    });

    StorageService.saveOrders(updatedOrders);
    if (area === 'ENTREGAS') {
        const newInputs = {...trackingInputs};
        delete newInputs[orderId];
        setTrackingInputs(newInputs);
    }
    refreshTasks();
    setSuccessMessage(`✅ Tarea completada`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleReturnTask = (orderId: string, itemId: string, empId: string) => {
      const reason = prompt("Ingrese el motivo de la devolución:");
      if (!reason) return; 

      const allOrders = StorageService.getOrders();
      let prevDest = '';

      const updatedOrders = allOrders.map(order => {
          if (order.id !== orderId) return order;
          const updatedItems = order.items.map(item => {
              if (item.id !== itemId) return item;
              
              const { status: prevStatus, area: prevArea } = getPreviousStateAndArea(item);
              prevDest = `${prevArea} (${prevStatus})`;

              const historyEntry: ItemHistoryEntry = {
                  id: Math.random().toString(36).substr(2, 9),
                  date: new Date().toISOString(),
                  action: 'DEVUELTO_OPERARIO',
                  actorName: employees.find(e => e.id === empId)?.name || 'Operario',
                  areaOrigen: area,
                  areaDestino: prevArea,
                  notes: `Devuelto por Operario: ${reason}`,
                  attemptNumber: (item.reworkCount || 0) + 1
              };

              return {
                  ...item,
                  currentStatus: prevStatus as ItemProcessStatus,
                  currentArea: prevArea as AreaType,
                  assignedEmployeeId: undefined,
                  reworkCount: (item.reworkCount || 0) + 1,
                  history: [...(item.history || []), historyEntry]
              };
          });
          return { ...order, items: updatedItems };
      });

      StorageService.saveOrders(updatedOrders);
      refreshTasks();
      setSuccessMessage(`↩️ Pieza devuelta a: ${prevDest}`);
      setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleReportDamage = () => {
      if (!damageModal.orderId || !damageModal.itemId || !damageReason.trim()) return;
      const currentOrders = StorageService.getOrders();
      const updatedOrders = currentOrders.map(order => {
          if (order.id !== damageModal.orderId) return order;
          const newItems = order.items.map(item => {
              if (item.id !== damageModal.itemId) return item;
              const historyEntry: ItemHistoryEntry = {
                  id: Math.random().toString(36).substr(2, 9),
                  date: new Date().toISOString(),
                  action: 'REPROCESO',
                  actorName: 'Operario',
                  areaOrigen: item.currentArea,
                  areaDestino: 'PREALISTAMIENTO',
                  notes: `DAÑO REPORTADO: ${damageReason}`,
                  attemptNumber: (item.reworkCount || 0) + 1
              };
              return {
                  ...item,
                  currentStatus: 'PREALISTAMIENTO' as ItemProcessStatus,
                  currentArea: 'PREALISTAMIENTO' as AreaType,
                  assignedEmployeeId: undefined,
                  reworkCount: (item.reworkCount || 0) + 1,
                  history: [...(item.history || []), historyEntry]
              };
          });
          return { ...order, items: newItems };
      });
      StorageService.saveOrders(updatedOrders);
      refreshTasks();
      setDamageModal({ isOpen: false, orderId: null, itemId: null, partName: null });
      setDamageReason('');
      setSuccessMessage("⚠️ Pieza reportada y enviada a Pre-Alistamiento.");
      setTimeout(() => setSuccessMessage(null), 3000);
  };

  // --- FILTER DISPLAYED EMPLOYEES BASED ON PERMISSIONS ---
  const displayedEmployees = employees.filter(e => {
      // 1. Search Filter
      if (!e.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      // 2. Privacy Filter
      if (currentUser) {
          // Admins and Leaders can see everyone (Supervisor View)
          if (currentUser.role === 'ADMIN' || currentUser.role === 'LIDER') {
              return true;
          }
          // Operators and Messengers ONLY see their own board
          if (currentUser.role === 'OPERARIO' || currentUser.role === 'MENSAJERO') {
              return e.id === currentUser.id;
          }
      }
      return true;
  });

  return (
    <div className="p-6 bg-gray-100 dark:bg-slate-900 min-h-full transition-colors relative">
      {successMessage && <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[60] flex items-center gap-3 px-6 py-3 bg-emerald-600 text-white rounded-full shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"><CheckCircle size={20} /><span className="font-medium">{successMessage}</span></div>}

      {/* --- AI BRIEFING PANEL --- */}
      {showAiAssistant && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-slate-700 flex flex-col">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-t-xl">
                        <h3 className="font-bold text-lg text-indigo-800 dark:text-indigo-300 flex items-center gap-2"><Sparkles size={20}/> Briefing Operativo IA</h3>
                        <button onClick={() => setShowAiAssistant(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20}/></button>
                    </div>
                    <div className="p-6">
                        {loadingAi ? (
                             <div className="flex flex-col items-center justify-center py-8">
                                <Loader2 size={40} className="animate-spin text-indigo-600 mb-4"/>
                                <p className="text-sm text-gray-500">Generando briefing...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg text-sm text-slate-700 dark:text-slate-200 leading-relaxed border border-slate-200 dark:border-slate-600 max-h-64 overflow-y-auto">
                                    <div dangerouslySetInnerHTML={{ __html: aiReport.replace(/\n/g, '<br/>') }} />
                                </div>
                                <button onClick={() => handlePlayAudioText(aiReport)} disabled={loadingAudio} className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300'}`}>
                                    {loadingAudio ? <Loader2 size={18} className="animate-spin"/> : isPlaying ? <StopCircle size={18}/> : <Volume2 size={18}/>}
                                    {isPlaying ? 'Detener' : 'Escuchar Briefing'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
      )}

      {/* --- INTERACTIVE ROUTE MODE (MODO RUTA) --- */}
      {showRouteMode && (
          <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-10">
              <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center sticky top-0 z-10">
                  <div>
                      <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400 flex items-center gap-2"><MapPin size={24}/> Modo Ruta Activa</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{routeTasks.length} paradas restantes</p>
                  </div>
                  <button onClick={() => setShowRouteMode(false)} className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200"><X size={24} className="text-gray-600 dark:text-gray-300"/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isOptimizing ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400">
                          <Loader2 size={48} className="animate-spin text-blue-500 mb-4"/>
                          <p className="text-lg">Optimizando ruta con IA...</p>
                      </div>
                  ) : (
                      <>
                          {routeExplanation && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm mb-4">
                                  <div className="flex justify-between items-start mb-2">
                                      <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2"><Sparkles size={16}/> Estrategia IA</h3>
                                      <button onClick={() => handlePlayAudioText(routeExplanation)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800"><Volume2 size={18}/></button>
                                  </div>
                                  <p className="text-sm text-blue-800 dark:text-blue-200">{routeExplanation}</p>
                              </div>
                          )}

                          {/* DYNAMIC GLOBAL MAP LINK */}
                          {getDynamicMapLink() && (
                              <a href={getDynamicMapLink()!} target="_blank" rel="noreferrer" className="block w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-center shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 mb-6">
                                  <Navigation size={20}/> Navegar Ruta Completa (Google Maps)
                              </a>
                          )}

                          {routeTasks.length === 0 ? (
                               <div className="text-center py-10 text-gray-400">
                                   <CheckCircle size={60} className="mx-auto mb-4 text-green-500"/>
                                   <h3 className="text-xl font-bold text-gray-800 dark:text-white">¡Ruta Completada!</h3>
                                   <p>Has entregado todos los pedidos.</p>
                                   <button onClick={() => setShowRouteMode(false)} className="mt-6 px-6 py-2 bg-gray-800 text-white rounded-lg">Cerrar</button>
                               </div>
                          ) : (
                              routeTasks.map((task, index) => {
                                  const isLocal = task.order.clientDeliveryType === 'ENTREGA_LOCAL';
                                  const isNational = !isLocal;
                                  const tracking = trackingInputs[task.order.id] || { carrier: '', code: '' };

                                  return (
                                    <div key={task.item.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 relative">
                                        <div className="absolute top-4 right-4 text-xs font-bold text-gray-400">#{index + 1}</div>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-3 rounded-full ${isLocal ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300'}`}>
                                                {isLocal ? <MapPin size={24}/> : <Package size={24}/>}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg text-gray-800 dark:text-white">{task.order.clientName}</h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{isLocal ? (task.order.clientAddress || 'Sin Dirección') : 'LLEVAR A TRANSPORTADORA'}</p>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg mb-4 text-sm border border-gray-100 dark:border-slate-600">
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-gray-700 dark:text-gray-300">Pieza:</span>
                                                <span className="text-gray-600 dark:text-gray-400">{task.item.partName}</span>
                                            </div>
                                            <div className="flex justify-between mt-1">
                                                <span className="font-semibold text-gray-700 dark:text-gray-300">Orden:</span>
                                                <span className="font-mono text-gray-500">{task.order.id}</span>
                                            </div>
                                            {isNational && (
                                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
                                                    <p className="text-xs text-orange-600 dark:text-orange-400 font-bold mb-2 flex items-center gap-1"><Truck size={12}/> Datos de Envío Requeridos:</p>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Transportadora" 
                                                        value={tracking.carrier}
                                                        onChange={(e) => handleTrackingChange(task.order.id, 'carrier', e.target.value)}
                                                        className="w-full mb-2 p-2 text-sm border rounded bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                                                    />
                                                    <input 
                                                        type="text" 
                                                        placeholder="No. Guía" 
                                                        value={tracking.code}
                                                        onChange={(e) => handleTrackingChange(task.order.id, 'code', e.target.value)}
                                                        className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-3">
                                            {isLocal && (
                                                <a href={getSingleStopMapLink(task)} target="_blank" rel="noreferrer" className="flex-1 py-3 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-200 dark:hover:bg-blue-900/50">
                                                    <Navigation size={18}/> Ir Aquí
                                                </a>
                                            )}
                                            <button 
                                                onClick={() => handleFinishTask(task.order.id, task.item.id, task.item.assignedEmployeeId!, task.order.clientDeliveryType)} 
                                                className={`flex-1 py-3 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm ${isNational && (!tracking.carrier || !tracking.code) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                                                disabled={isNational && (!tracking.carrier || !tracking.code)}
                                            >
                                                <CheckCircle size={18}/> Entregado
                                            </button>
                                        </div>
                                    </div>
                                  );
                              })
                          )}
                      </>
                  )}
              </div>
          </div>
      )}

      <div id="tour-area-operator-search" className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Operación: {area}</h2>
              <p className="text-sm text-gray-500">Tablero de tareas activas</p>
          </div>
          <div className="flex gap-3">
              <button onClick={handleGenerateAiReport} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all font-medium text-sm">
                  <Sparkles size={16} className="text-yellow-300" /> Briefing IA
              </button>
              {/* Only show search if Admin or Leader */}
              {currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'LIDER') && (
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 min-w-[200px]">
                      <Search size={18} className="text-gray-400 ml-2" />
                      <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar operario..." className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white" />
                  </div>
              )}
          </div>
      </div>

       {/* HISTORY MODAL (SAME AS BEFORE) */}
       {historyItem && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-slate-700 flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-700/50 rounded-t-xl">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                              <History size={20} className="text-blue-500"/> Historial de Pieza
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {historyItem.partName} • {historyItem.colorCode}
                          </p>
                      </div>
                      <button onClick={() => setHistoryItem(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={20}/></button>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
                      {(!historyItem.history || historyItem.history.length === 0) ? (
                          <div className="text-center py-10 text-slate-400"><Info size={40} className="mx-auto mb-2 opacity-50"/><p className="text-sm">No hay movimientos registrados aún.</p></div>
                      ) : (
                          historyItem.history.slice().reverse().map((entry, idx) => (
                              <div key={idx} className="relative flex gap-4 group">
                                  {idx !== historyItem.history!.length - 1 && <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 -mb-6"></div>}
                                  <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 shadow-sm ${
                                      entry.action === 'RECHAZADO' || entry.action === 'REPROCESO' || entry.action === 'DEVUELTO_OPERARIO' ? 'bg-red-50 border-red-500 text-red-500' : 
                                      entry.action === 'FINALIZADO' || entry.action === 'APROBADO' ? 'bg-green-50 border-green-500 text-green-500' : 
                                      'bg-blue-50 border-blue-500 text-blue-500'
                                  }`}>{entry.action === 'RECHAZADO' || entry.action === 'REPROCESO' || entry.action === 'DEVUELTO_OPERARIO' ? <X size={12}/> : <Check size={12}/>}</div>
                                  <div className="flex-1 pb-2">
                                      <div className="flex justify-between items-start"><span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full mb-1 inline-block">{new Date(entry.date).toLocaleString()}</span><span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{entry.areaOrigen || 'SISTEMA'}</span></div>
                                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{entry.action.replace(/_/g, ' ')}</p>
                                          <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-1"><User size={12}/> {entry.actorName}</p>
                                          {entry.notes && <div className={`mt-2 text-xs p-2 rounded border ${entry.action === 'RECHAZADO' || entry.action === 'DEVUELTO_OPERARIO' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 text-red-700 dark:text-red-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}><span className="font-semibold">Nota:</span> {entry.notes}</div>}
                                          {entry.attemptNumber > 0 && <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-800"><AlertTriangle size={10}/> Ciclo #{entry.attemptNumber}</div>}
                                      </div>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* DAMAGE REPORT MODAL (SAME AS BEFORE) */}
      {damageModal.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-slate-700 p-6">
                  <div className="flex flex-col">
                      <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
                          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                              <AlertTriangle size={24} />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Reportar Daño</h3>
                      </div>
                      
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          Pieza: <span className="font-bold text-gray-800 dark:text-gray-200">{damageModal.partName}</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-100 dark:border-amber-900/30">
                          ⚠️ Esta acción devolverá la pieza a <strong>Pre-Alistamiento</strong> para reinicio del proceso.
                      </p>

                      <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo del Daño / Defecto</label>
                          <textarea 
                              value={damageReason}
                              onChange={(e) => setDamageReason(e.target.value)}
                              className="w-full p-2.5 text-sm border rounded-lg bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                              rows={3}
                              placeholder="Describa el daño o motivo..."
                              autoFocus
                          />
                      </div>

                      <div className="flex flex-col gap-2 w-full">
                          <button 
                              onClick={handleReportDamage}
                              disabled={!damageReason.trim()}
                              className="w-full py-2.5 rounded-lg font-bold text-white shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <AlertTriangle size={18} /> Confirmar Daño
                          </button>
                          <button 
                              onClick={() => { setDamageModal({ isOpen: false, orderId: null, itemId: null, partName: null }); setDamageReason(''); }}
                              className="w-full py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                          >
                              Cancelar
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div id="tour-area-operator-board" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedEmployees.map(employee => {
              const tasks = tasksByEmployee[employee.id] || [];
              // If employee has no tasks AND we are filtering for a specific employee (themselves), still show empty board
              // If we are admin searching, hide empty ones unless they match search
              if (searchTerm && tasks.length === 0) return null;

              // Check if employee has any deliveries suitable for route mode
              const hasDeliveries = tasks.some(t => 
                t.order.clientDeliveryType === 'ENTREGA_LOCAL' || 
                t.order.clientDeliveryType === 'ENVIO_NACIONAL' || 
                t.order.clientDeliveryType === 'ENVIO_INTERNACIONAL'
              );
              const showOptimizeButton = (area === 'ENTREGAS' || area === 'DESPACHOS') && hasDeliveries;

              return (
                  <div key={employee.id} className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-lg">{employee.name.charAt(0)}</div>
                              <div><h3 className="font-bold text-gray-900 dark:text-white">{employee.name}</h3><span className="text-xs text-gray-500 dark:text-gray-400">{tasks.length} Tareas</span></div>
                          </div>
                          {showOptimizeButton && (
                              <button 
                                onClick={() => handleOptimizeEmployeeRoute(employee.id)}
                                className="text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 px-3 py-1.5 rounded flex items-center gap-1 hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors font-bold shadow-sm"
                                title="Abrir Asistente de Ruta"
                              >
                                  <MapPin size={12} /> Modo Ruta
                              </button>
                          )}
                      </div>
                      <div className="p-4 flex-1 space-y-3 min-h-[200px] bg-slate-50/50 dark:bg-slate-900/20">
                          {tasks.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8 opacity-60"><CheckCircle size={40} className="mb-2"/><p className="text-sm">Todo al día</p></div>
                          ) : (
                              tasks.map(({ order, item }) => {
                                  // Determine if this task requires tracking input (Entregas + Shipping)
                                  const isShippingTask = area === 'ENTREGAS' && (order.clientDeliveryType === 'ENVIO_NACIONAL' || order.clientDeliveryType === 'ENVIO_INTERNACIONAL');
                                  const trackingInput = trackingInputs[order.id] || { carrier: '', code: '' };

                                  return (
                                    <div key={item.id} className="bg-white dark:bg-slate-700 p-3 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm hover:scale-[1.02] hover:shadow-lg transition-all relative group">
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lg" style={{ backgroundColor: order.visualColorHex }}></div>
                                        <div className="pl-3">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-1.5 py-0.5 rounded border dark:border-indigo-800 flex items-center gap-0.5">{order.id}</span>
                                                <span className="text-[10px] px-1.5 rounded bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300">{item.currentStatus.replace('_', ' ')}</span>
                                            </div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 flex items-center gap-1">
                                                    <Barcode size={10} /> {item.internalId}
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-1">{item.partName}</h4>
                                            
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">{order.modelName}</span>
                                                {item.hasDecals && <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1 rounded flex items-center gap-1"><AlertTriangle size={8} /> Calcas</span>}
                                                {item.accessoriesDetail && <span className="text-[10px] bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 px-1 rounded flex items-center gap-1 border border-pink-200 dark:border-pink-800"><Puzzle size={8} /> {item.accessoriesDetail}</span>}
                                                {item.finishType === 'BRILLANTE' ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 flex items-center gap-1 border border-yellow-200 dark:border-yellow-800"><Sun size={10} /> Brillante</span> : <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300 flex items-center gap-1 border border-slate-300 dark:border-slate-500"><Moon size={10} /> Mate</span>}
                                            </div>

                                            {/* MESSENGER SHIPPING INPUTS */}
                                            {isShippingTask && (
                                                <div className="mb-3 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded text-xs space-y-2">
                                                    <div className="flex items-center gap-1 font-bold text-orange-700 dark:text-orange-300">
                                                        <Truck size={12}/> Datos de Envío
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Transportadora" 
                                                        value={trackingInput.carrier}
                                                        onChange={(e) => handleTrackingChange(order.id, 'carrier', e.target.value)}
                                                        className="w-full p-1 rounded border border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200"
                                                    />
                                                    <input 
                                                        type="text" 
                                                        placeholder="No. Guía" 
                                                        value={trackingInput.code}
                                                        onChange={(e) => handleTrackingChange(order.id, 'code', e.target.value)}
                                                        className="w-full p-1 rounded border border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200"
                                                    />
                                                </div>
                                            )}

                                            <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100 dark:border-slate-600">
                                                {/* REPORT DAMAGE */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDamageModal({ isOpen: true, orderId: order.id, itemId: item.id, partName: item.partName }); }}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                    title="Reportar Daño"
                                                >
                                                    <AlertTriangle size={16} />
                                                </button>

                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleReturnTask(order.id, item.id, employee.id); }}
                                                    className="flex-1 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors border border-transparent hover:border-amber-200 flex items-center justify-center gap-1"
                                                >
                                                    <ArrowLeft size={12} /> Devolver
                                                </button>
                                                <button 
                                                    onClick={() => handleFinishTask(order.id, item.id, employee.id, order.clientDeliveryType)} 
                                                    className={`flex-[2] py-1.5 text-xs font-bold text-white rounded shadow-sm flex items-center justify-center gap-1 ${isShippingTask && (!trackingInput.carrier || !trackingInput.code) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                                                    disabled={isShippingTask && (!trackingInput.carrier || !trackingInput.code)}
                                                >
                                                    <span className="mr-1">Terminar</span> <ArrowRight size={14} />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setHistoryItem(item); }}
                                                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                    title="Ver Historial"
                                                >
                                                    <History size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                  );
                              })
                          )}
                      </div>
                  </div>
              );
          })}
          
          {displayedEmployees.length === 0 && (
             <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 opacity-60">
                 <Lock size={48} className="mb-4"/>
                 <p>No tienes acceso a otros paneles o no hay empleados disponibles.</p>
             </div>
          )}
      </div>
    </div>
  );
};
