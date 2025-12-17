
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { Order, Employee, ItemProcessStatus, AreaType, ItemHistoryEntry, FinishType } from '../types';
import { CheckCircle, Search, UserCheck, AlertCircle, CheckSquare, UserMinus, User, Clock, Briefcase, Filter, XCircle, X, RotateCcw, ArrowLeft, Sun, Moon, AlertTriangle, Timer, Check, MessageSquareWarning, History, Info, Barcode, Square, Sparkles, Puzzle, Truck, MapPin, Printer, Navigation, Volume2, StopCircle, Loader2 } from 'lucide-react';

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

interface AreaLeaderProps {
    area: AreaType; // e.g., 'PINTURA'
    managedStatuses: ItemProcessStatus[]; // e.g., ['PINTURA_BASE', 'PINTURA_COLOR']
}

interface SelectableItem {
  orderId: string;
  itemId: string;
  partName: string;
  modelName: string;
  clientName: string;
  clientAddress?: string;
  clientCity?: string;
  deliveryType?: string;
  colorCode: string;
  visualColorHex: string;
  status: ItemProcessStatus;
  assignedEmployeeId?: string;
  reworkCount: number;
  history: ItemHistoryEntry[];
  finishType: FinishType; 
  estimatedDeliveryDate?: string;
  internalId?: string;
  lastStatus?: ItemProcessStatus;
  hasDecals: boolean;
  accessoriesDetail?: string;
  shippingCarrier?: string;
  shippingTrackingCode?: string;
}

export const AreaLeader: React.FC<AreaLeaderProps> = ({ area, managedStatuses }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
  // Reprocess Modal State
  const [reprocessModalOpen, setReprocessModalOpen] = useState(false);
  const [reprocessReason, setReprocessReason] = useState('');
  const [reprocessTargetStage, setReprocessTargetStage] = useState<ItemProcessStatus | ''>('');

  // History Modal State
  const [historyItem, setHistoryItem] = useState<SelectableItem | null>(null);

  // Damage Report State
  const [damageModal, setDamageModal] = useState<{
      isOpen: boolean;
      orderId: string | null;
      itemId: string | null;
      partName: string | null;
  }>({ isOpen: false, orderId: null, itemId: null, partName: null });
  const [damageReason, setDamageReason] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterUrgent, setFilterUrgent] = useState(false);
  
  const [viewMode, setViewMode] = useState<'UNASSIGNED' | 'ASSIGNED' | 'REVIEW'>('UNASSIGNED');

  // Notification State
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // --- DISPATCH & DELIVERY SPECIFIC STATE ---
  const [showRouteAssistant, setShowRouteAssistant] = useState(false);
  const [routeOptimization, setRouteOptimization] = useState<{explanation: string, mapsLink: string} | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // --- GENERAL AI ASSISTANT STATE ---
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiReport, setAiReport] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  
  // Audio State
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    setOrders(StorageService.getOrders());
    setEmployees(StorageService.getEmployees()); 
  }, [area]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  // Cleanup audio on unmount
  useEffect(() => {
      return () => {
          stopAudio();
          if (audioContextRef.current) audioContextRef.current.close();
      };
  }, []);

  const isUrgent = (dateStr?: string) => {
      if (!dateStr) return false;
      const delivery = new Date(dateStr);
      const now = new Date();
      const diff = delivery.getTime() - now.getTime();
      return diff < 172800000; 
  };

  // Optimized Item Categorization
  const categorizedItems = useMemo(() => {
      const unassigned: SelectableItem[] = [];
      const assigned: SelectableItem[] = [];
      const review: SelectableItem[] = [];
      const term = searchTerm.toLowerCase().trim();

      orders.forEach(order => {
          if (filterUrgent && !isUrgent(order.estimatedDeliveryDate)) return;

          const clientList = StorageService.getClients();
          const client = clientList.find(c => c.id === order.clientId);

          order.items.forEach(item => {
              if (item.currentArea !== area) return;

              const matchesOrder = 
                  (order.clientName && order.clientName.toLowerCase().includes(term)) ||
                  (order.modelName && order.modelName.toLowerCase().includes(term)) ||
                  (order.id && order.id.toLowerCase().includes(term));

              const matchesItem = 
                  (item.partName && item.partName.toLowerCase().includes(term)) ||
                  (item.internalId && item.internalId.toLowerCase().includes(term)) ||
                  (item.id && item.id.toLowerCase().includes(term));

              if (!matchesOrder && !matchesItem) return;

              const mappedItem: SelectableItem = {
                  orderId: order.id, 
                  itemId: item.id, 
                  internalId: item.internalId, 
                  partName: item.partName, 
                  modelName: order.modelName, 
                  clientName: order.clientName,
                  clientAddress: client?.address,
                  clientCity: client?.city,
                  deliveryType: client?.deliveryType,
                  colorCode: item.colorCode, 
                  visualColorHex: order.visualColorHex, 
                  status: item.currentStatus, 
                  assignedEmployeeId: item.assignedEmployeeId, 
                  reworkCount: item.reworkCount || 0, 
                  history: item.history || [], 
                  finishType: item.finishType, 
                  estimatedDeliveryDate: order.estimatedDeliveryDate, 
                  lastStatus: item.lastStatus, 
                  hasDecals: item.hasDecals, 
                  accessoriesDetail: item.accessoriesDetail,
                  shippingCarrier: order.shippingCarrier,
                  shippingTrackingCode: order.shippingTrackingCode
              };

              if (item.currentStatus === 'EN_REVISION') {
                  review.push(mappedItem);
              } else if (managedStatuses.includes(item.currentStatus)) {
                  if (item.assignedEmployeeId) {
                      assigned.push(mappedItem);
                  } else {
                      unassigned.push(mappedItem);
                  }
              }
          });
      });

      const sortFn = (a: SelectableItem, b: SelectableItem) => {
          const indexA = managedStatuses.indexOf(a.status);
          const indexB = managedStatuses.indexOf(b.status);
          if (indexA !== -1 && indexB === -1) return -1; 
          if (indexA === -1 && indexB !== -1) return 1; 
          if (indexA !== indexB) return indexA - indexB;
          if (a.estimatedDeliveryDate && b.estimatedDeliveryDate) return new Date(a.estimatedDeliveryDate).getTime() - new Date(b.estimatedDeliveryDate).getTime();
          return 0;
      };

      return {
          unassigned: unassigned.sort(sortFn),
          assigned: assigned.sort(sortFn),
          review: review.sort(sortFn)
      };
  }, [orders, area, managedStatuses, searchTerm, filterUrgent]);

  const filteredItems = viewMode === 'REVIEW' ? categorizedItems.review : (viewMode === 'ASSIGNED' ? categorizedItems.assigned : categorizedItems.unassigned);
  
  const areAllSelected = filteredItems.length > 0 && filteredItems.every(item => selectedItems.includes(item.itemId));

  // Determine if selected items are eligible for shipping label
  const selectedObjects = filteredItems.filter(i => selectedItems.includes(i.itemId));
  const hasShippingItems = selectedObjects.some(i => i.deliveryType === 'ENVIO_NACIONAL' || i.deliveryType === 'ENVIO_INTERNACIONAL');

  const toggleSelectAll = () => {
    if (areAllSelected) {
        const idsToRemove = filteredItems.map(i => i.itemId);
        setSelectedItems(prev => prev.filter(id => !idsToRemove.includes(id)));
    } else {
        const idsToAdd = filteredItems.map(i => i.itemId);
        setSelectedItems(prev => Array.from(new Set([...prev, ...idsToAdd])));
    }
  };

  // --- GENERAL AI ASSISTANT LOGIC ---
  const handleGenerateAiReport = async () => {
      setShowAiAssistant(true);
      setLoadingAi(true);
      setAiReport('');
      stopAudio();

      // Pass currently visible items to AI
      const report = await GeminiService.generateAreaContextReport(area, 'LIDER', filteredItems);
      setAiReport(report);
      setLoadingAi(false);
  };

  const handlePlayAiAudio = async (text: string) => {
      if (!text) return;
      if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      if (isPlaying) { stopAudio(); return; }

      setLoadingAudio(true);
      try {
          // Remove Markdown
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

  // --- STANDARD ASSIGNMENT LOGIC ---
  const handleAssign = () => {
      if (!selectedEmployeeId) { setNotification({ message: "⚠️ Debe seleccionar un empleado.", type: 'error' }); return; }
      const currentOrders = StorageService.getOrders();
      let assignedCount = 0;
      const updatedOrders = currentOrders.map(order => {
          const newItems = order.items.map(item => {
              if (selectedItems.includes(item.id)) {
                  assignedCount++;
                  const historyEntry: ItemHistoryEntry = { id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString(), action: 'ASIGNADO', actorName: 'Líder ' + area, attemptNumber: item.reworkCount || 0 };
                  return { ...item, assignedEmployeeId: selectedEmployeeId, history: [...(item.history || []), historyEntry] };
              }
              return item;
          });
          return { ...order, items: newItems };
      });
      StorageService.saveOrders(updatedOrders); setOrders(updatedOrders);
      if (assignedCount > 0) { 
          StorageService.addNotification(selectedEmployeeId, `Te han asignado ${assignedCount} nuevas tareas en ${area}.`); 
          setNotification({ message: `✅ Se asignaron ${assignedCount} piezas correctamente.`, type: 'success' });
      }
      setSelectedItems([]);
  };

  // --- DISPATCH SPECIFIC: SHIPPING LABELS (UPDATED: GROUPED BY ORDER) ---
  const handlePrintShippingLabel = () => {
      const itemsToPrint = filteredItems.filter(i => 
          selectedItems.includes(i.itemId) && 
          (i.deliveryType === 'ENVIO_NACIONAL' || i.deliveryType === 'ENVIO_INTERNACIONAL')
      );

      if (itemsToPrint.length === 0) return;

      // Group items by Order ID to generate one label per shipment
      const groupedByOrder: Record<string, SelectableItem[]> = {};
      itemsToPrint.forEach(item => {
          if (!groupedByOrder[item.orderId]) {
              groupedByOrder[item.orderId] = [];
          }
          groupedByOrder[item.orderId].push(item);
      });

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const labelsHtml = Object.entries(groupedByOrder).map(([orderId, items]) => {
          const firstItem = items[0]; // All items in group share Client Info
          const isInternational = firstItem.deliveryType === 'ENVIO_INTERNACIONAL';
          
          // Generate content list string
          const contentListHtml = items.map(i => `
             <li style="margin-bottom: 2px;">
                ${i.partName} <span style="color:#666; font-size:10px;">(${i.colorCode})</span>
             </li>
          `).join('');

          return `
            <div class="label">
                <div class="header">ENVÍO ${isInternational ? 'INTERNACIONAL' : 'NACIONAL'}</div>
                <div class="content">
                    <div class="section sender">
                        <strong>REMITENTE:</strong><br/>
                        MotoPaint Pro Taller<br/>
                        Calle 10 # 20-30, Medellín<br/>
                        Tel: 300 123 4567
                    </div>
                    <div class="section receiver">
                        <strong>DESTINATARIO:</strong><br/>
                        <span class="client-name">${firstItem.clientName}</span><br/>
                        ${firstItem.clientAddress || 'Sin Dirección'}<br/>
                        ${firstItem.clientCity || 'Ciudad no especificada'}<br/>
                        Tel: Contacto Cliente
                    </div>
                    <div class="section contents">
                        <strong>CONTENIDO DEL ENVÍO (${items.length} piezas):</strong>
                        <ul style="margin: 5px 0; padding-left: 20px; font-size: 11px;">
                            ${contentListHtml}
                        </ul>
                    </div>
                    <div class="footer">
                        <div>Orden: <strong>${orderId}</strong></div>
                        <div style="margin-top:5px; font-size:10px;">Paquete parcial generado el ${new Date().toLocaleDateString()}</div>
                    </div>
                </div>
            </div>
          `;
      }).join('');

      const htmlContent = `
          <html>
            <head>
                <title>Rótulos de Envío</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; } 
                    .label { width: 100mm; min-height: 150mm; border: 2px solid #000; margin-bottom: 20px; page-break-inside: avoid; display: flex; flex-direction: column; } 
                    .header { background: #000; color: #fff; padding: 10px; text-align: center; font-weight: bold; font-size: 18px; } 
                    .content { flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 15px; } 
                    .section { border: 1px solid #ccc; padding: 10px; border-radius: 5px; } 
                    .sender { font-size: 12px; color: #555; } 
                    .receiver { font-size: 16px; flex: 1; } 
                    .contents { font-size: 12px; background-color: #f9f9f9; }
                    .client-name { font-size: 20px; font-weight: bold; } 
                    .footer { border-top: 2px dashed #000; padding-top: 10px; font-size: 14px; text-align: center; } 
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>${labelsHtml}</body>
            <script>window.onload = () => { window.print(); }</script>
          </html>`;
          
      printWindow.document.write(htmlContent); 
      printWindow.document.close();
  };

  // --- DELIVERY SPECIFIC: ROUTE OPTIMIZATION ---
  const handleOptimizeRoute = async () => {
      const itemsToRoute = filteredItems.filter(i => selectedItems.includes(i.itemId));
      if (itemsToRoute.length === 0) return;
      setIsOptimizing(true); setShowRouteAssistant(true); setRouteOptimization(null);
      
      // Group by Order ID to avoid duplicate stops for same location
      const uniqueOrders = new Map<string, SelectableItem>();
      itemsToRoute.forEach(i => {
          if (!uniqueOrders.has(i.orderId)) {
              uniqueOrders.set(i.orderId, i);
          }
      });

      const locations = Array.from(uniqueOrders.values()).map(i => ({
          id: i.orderId,
          address: i.clientAddress || 'Ciudad',
          client: i.clientName,
          urgent: isUrgent(i.estimatedDeliveryDate)
      }));
      
      const result = await GeminiService.optimizeRoute(locations);
      const origin = "Sede MotoPaint"; 
      const destination = result.waypoints[result.waypoints.length - 1];
      const waypoints = result.waypoints.slice(0, -1).join('|');
      const mapsLink = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
      setRouteOptimization({ explanation: result.explanation, mapsLink: mapsLink }); setIsOptimizing(false);
  };

  const handlePlayRouteAudio = async () => {
      if (routeOptimization) handlePlayAiAudio(routeOptimization.explanation);
  };

  // --- STANDARD WORKFLOW ACTIONS (Approve, Reject, etc) ---
  const handleApproveQuality = () => {
      if (selectedItems.length === 0) return;
      const currentOrders = StorageService.getOrders();
      const updatedOrders = currentOrders.map(order => {
          const newItems = order.items.map(item => {
              if (selectedItems.includes(item.id)) {
                  let nextStatus: ItemProcessStatus = item.currentStatus;
                  let nextArea: AreaType = item.currentArea;
                  const stateToCheck = item.lastStatus || item.currentStatus;
                  switch(stateToCheck) {
                      case 'PREALISTAMIENTO': nextStatus = 'ALISTAMIENTO_1'; nextArea = 'ALISTAMIENTO'; break;
                      case 'ALISTAMIENTO_1': nextStatus = 'PINTURA_BASE'; nextArea = 'PINTURA'; break;
                      case 'PINTURA_BASE': nextStatus = 'ALISTAMIENTO_2'; nextArea = 'ALISTAMIENTO'; break;
                      case 'ALISTAMIENTO_2': nextStatus = 'PINTURA_COLOR'; nextArea = 'PINTURA'; break;
                      case 'PINTURA_COLOR': if (item.finishType === 'BRILLANTE') { nextStatus = 'PULIDO'; nextArea = 'PULIDO'; } else { nextStatus = 'DESPACHOS'; nextArea = 'DESPACHOS'; } break;
                      case 'PULIDO': nextStatus = 'DESPACHOS'; nextArea = 'DESPACHOS'; break;
                      case 'DESPACHOS': nextStatus = 'ENTREGAS'; nextArea = 'ENTREGAS'; break;
                      case 'ENTREGAS': nextStatus = 'FINALIZADA'; break;
                  }
                  const logEntry: ItemHistoryEntry = { id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString(), action: 'APROBADO', actorName: 'Líder ' + area, areaOrigen: area, areaDestino: nextArea, notes: 'Aprobado', attemptNumber: item.reworkCount || 0 };
                  return { ...item, currentStatus: nextStatus, currentArea: nextArea, assignedEmployeeId: undefined, history: [...(item.history || []), logEntry] };
              }
              return item;
          });
          return { ...order, items: newItems };
      });
      StorageService.saveOrders(updatedOrders); setOrders(updatedOrders); setSelectedItems([]);
      setNotification({ message: "✅ Piezas avanzadas correctamente.", type: 'success' });
  };

  const handleReprocess = () => { 
      if (!reprocessTargetStage || !reprocessReason) return;
      const currentOrders = StorageService.getOrders();
      const updatedOrders = currentOrders.map(order => {
          const newItems = order.items.map(item => {
              if (selectedItems.includes(item.id)) {
                  let targetArea: AreaType = 'ALISTAMIENTO';
                  if (reprocessTargetStage.includes('PREALISTAMIENTO')) targetArea = 'PREALISTAMIENTO';
                  if (reprocessTargetStage.includes('ALISTAMIENTO')) targetArea = 'ALISTAMIENTO';
                  if (reprocessTargetStage.includes('PINTURA')) targetArea = 'PINTURA';
                  if (reprocessTargetStage.includes('PULIDO')) targetArea = 'PULIDO';
                  if (reprocessTargetStage.includes('DESPACHOS')) targetArea = 'DESPACHOS';
                  if (reprocessTargetStage.includes('ENTREGAS')) targetArea = 'ENTREGAS';
                  const logEntry: ItemHistoryEntry = { id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString(), action: 'REPROCESO', actorName: 'Líder ' + area, areaOrigen: area, areaDestino: targetArea, notes: reprocessReason, attemptNumber: (item.reworkCount || 0) + 1 };
                  return { ...item, currentStatus: reprocessTargetStage as ItemProcessStatus, currentArea: targetArea, assignedEmployeeId: undefined, reworkCount: (item.reworkCount || 0) + 1, history: [...(item.history || []), logEntry] };
              }
              return item;
          });
          return { ...order, items: newItems };
      });
      StorageService.saveOrders(updatedOrders); setOrders(updatedOrders); setSelectedItems([]); setReprocessModalOpen(false); setReprocessReason('');
      setNotification({ message: "↩️ Reproceso iniciado.", type: 'error' });
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
                  actorName: 'Líder ' + area,
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
      setOrders(updatedOrders);
      setDamageModal({ isOpen: false, orderId: null, itemId: null, partName: null });
      setDamageReason('');
      setNotification({ message: "⚠️ Pieza reportada y enviada a Pre-Alistamiento.", type: 'error' });
  };

  return (
    <div className="p-6 bg-gray-100 dark:bg-slate-900 min-h-full transition-colors relative">
        {notification && <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>{notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}<span className="font-medium text-sm">{notification.message}</span></div>}

        {/* --- GENERAL AI ASSISTANT PANEL --- */}
        {showAiAssistant && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-slate-700 flex flex-col">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-t-xl">
                        <h3 className="font-bold text-lg text-indigo-800 dark:text-indigo-300 flex items-center gap-2"><Sparkles size={20}/> Análisis IA: {area}</h3>
                        <button onClick={() => setShowAiAssistant(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20}/></button>
                    </div>
                    <div className="p-6">
                        {loadingAi ? (
                             <div className="flex flex-col items-center justify-center py-8">
                                <Loader2 size={40} className="animate-spin text-indigo-600 mb-4"/>
                                <p className="text-sm text-gray-500">Analizando carga de trabajo...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg text-sm text-slate-700 dark:text-slate-200 leading-relaxed border border-slate-200 dark:border-slate-600 max-h-64 overflow-y-auto">
                                    <div dangerouslySetInnerHTML={{ __html: aiReport.replace(/\n/g, '<br/>') }} />
                                </div>
                                
                                <button onClick={() => handlePlayAiAudio(aiReport)} disabled={loadingAudio} className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300'}`}>
                                    {loadingAudio ? <Loader2 size={18} className="animate-spin"/> : isPlaying ? <StopCircle size={18}/> : <Volume2 size={18}/>}
                                    {isPlaying ? 'Detener' : 'Escuchar Informe'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* --- ROUTE ASSISTANT MODAL (ENTREGAS) --- */}
        {showRouteAssistant && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-slate-700 flex flex-col">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 rounded-t-xl">
                        <h3 className="font-bold text-lg text-blue-800 dark:text-blue-300 flex items-center gap-2"><Sparkles size={20}/> Asistente de Ruta IA</h3>
                        <button onClick={() => setShowRouteAssistant(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20}/></button>
                    </div>
                    <div className="p-6">
                        {isOptimizing ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Loader2 size={40} className="animate-spin text-blue-600 mb-4"/>
                                <p className="text-sm text-gray-500">Analizando tráfico y prioridades...</p>
                            </div>
                        ) : routeOptimization ? (
                            <div className="space-y-4">
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg text-sm text-slate-700 dark:text-slate-200 leading-relaxed border border-slate-200 dark:border-slate-600">
                                    {routeOptimization.explanation}
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={handlePlayRouteAudio} disabled={loadingAudio} className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                                        {loadingAudio ? <Loader2 size={18} className="animate-spin"/> : isPlaying ? <StopCircle size={18}/> : <Volume2 size={18}/>}
                                        {isPlaying ? 'Detener' : 'Escuchar'}
                                    </button>
                                    <a href={routeOptimization.mapsLink} target="_blank" rel="noreferrer" className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex items-center justify-center gap-2 shadow-sm">
                                        <Navigation size={18} /> Iniciar GPS
                                    </a>
                                </div>
                            </div>
                        ) : <p className="text-center text-gray-500">No se pudo generar la ruta.</p>}
                    </div>
                </div>
            </div>
        )}

        <div className="flex justify-between items-center mb-6">
            <div><h2 className="text-2xl font-bold text-slate-800 dark:text-white">Administración de {area}</h2><p className="text-sm text-gray-500">Gestión de flujo y asignaciones</p></div>
            <button onClick={handleGenerateAiReport} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all font-medium">
                <Sparkles size={18} className="text-yellow-300" /> Asistente IA
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div id="tour-area-leader-actions" className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 sticky top-6">
                    <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-white">Acciones</h3>
                    
                    {viewMode === 'REVIEW' ? (
                        <div className="space-y-3">
                            <button onClick={handleApproveQuality} disabled={selectedItems.length === 0} className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold shadow-sm flex items-center justify-center gap-2"><CheckCircle size={20} /> Aprobar Calidad</button>
                            <button onClick={() => setReprocessModalOpen(true)} disabled={selectedItems.length === 0} className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"><XCircle size={18} /> Rechazar</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* --- DISPATCH SPECIAL ACTIONS --- */}
                            {area === 'DESPACHOS' && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-900/30 space-y-3">
                                    <h4 className="text-xs font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider flex items-center gap-1"><Truck size={12}/> Logística de Envío</h4>
                                    
                                    <button 
                                        onClick={handlePrintShippingLabel} 
                                        disabled={!hasShippingItems} 
                                        className="w-full py-2 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-600 rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={hasShippingItems ? "Imprimir rótulo de envío" : "Seleccione pedidos de tipo ENVIO NACIONAL o INTERNACIONAL"}
                                    >
                                        <Printer size={14}/> Imprimir Rótulo
                                    </button>
                                </div>
                            )}

                            {/* --- DELIVERY SPECIAL ACTIONS --- */}
                            {area === 'ENTREGAS' && (
                                <div className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-lg border border-teal-100 dark:border-teal-900/30 space-y-3">
                                    <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1"><MapPin size={12}/> Asistente de Ruta</h4>
                                    <p className="text-sm text-teal-700 dark:text-teal-400">Selecciona varios pedidos "Locales" para optimizar.</p>
                                    <button onClick={handleOptimizeRoute} disabled={selectedItems.length === 0} className="w-full py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                                        <Sparkles size={14} className="text-yellow-300"/> Optimizar Ruta IA
                                    </button>
                                </div>
                            )}

                            <div className="border-t border-gray-200 dark:border-slate-700"></div>

                            {/* Standard Assign */}
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Asignar empleado:</label>
                            <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"><option value="">-- Seleccionar --</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
                            <button onClick={handleAssign} disabled={selectedItems.length === 0} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"><UserCheck size={18} /> Asignar Tarea</button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 h-full flex flex-col">
                <div id="tour-area-leader-tabs" className="flex border-b border-gray-200 dark:border-slate-700">
                    <button onClick={() => { setViewMode('UNASSIGNED'); setSelectedItems([]); }} className={`flex-1 py-4 text-sm font-medium border-b-2 ${viewMode === 'UNASSIGNED' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>
                        Por Asignar <span className="text-red-600 dark:text-red-400 font-bold ml-1">({categorizedItems.unassigned.length})</span>
                    </button>
                    <button onClick={() => { setViewMode('ASSIGNED'); setSelectedItems([]); }} className={`flex-1 py-4 text-sm font-medium border-b-2 ${viewMode === 'ASSIGNED' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>
                        Asignadas <span className="text-red-600 dark:text-red-400 font-bold ml-1">({categorizedItems.assigned.length})</span>
                    </button>
                    <button onClick={() => { setViewMode('REVIEW'); setSelectedItems([]); }} className={`flex-1 py-4 text-sm font-medium border-b-2 ${viewMode === 'REVIEW' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>
                        Por Aprobar <span className="text-red-600 dark:text-red-400 font-bold ml-1">({categorizedItems.review.length})</span>
                    </button>
                </div>
                
                <div id="tour-area-leader-list" className="p-4">
                     <div className="flex gap-2 mb-4">
                        <button onClick={toggleSelectAll} className="px-3 py-2 rounded-lg border bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:bg-gray-50">
                            {areAllSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 p-2 border rounded-lg bg-gray-50 dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {filteredItems.map(item => (
                            <div 
                                key={item.itemId} 
                                onClick={() => { if (selectedItems.includes(item.itemId)) setSelectedItems(prev => prev.filter(id => id !== item.itemId)); else setSelectedItems(prev => [...prev, item.itemId]); }} 
                                style={{ borderLeftColor: item.visualColorHex }}
                                className={`flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-l-4 ${selectedItems.includes(item.itemId) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-700'}`}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center mr-4 shrink-0 mt-1 ${selectedItems.includes(item.itemId) ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}>{selectedItems.includes(item.itemId) && <CheckSquare size={14} className="text-white" />}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                                                {item.orderId}
                                            </span>
                                        </div>
                                        <span className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">{item.status.replace('_', ' ')}</span>
                                    </div>

                                    <div className="mb-1">
                                        <span className="font-bold text-gray-800 dark:text-white text-sm">
                                            {item.clientName}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                             • {item.modelName}
                                        </span>
                                        {item.deliveryType && <span className={`ml-2 text-[10px] px-1 rounded ${item.deliveryType.includes('ENVIO') ? 'bg-orange-100 text-orange-800' : 'bg-slate-200 text-slate-700'}`}>{item.deliveryType.replace('_',' ')}</span>}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                        <span className="font-semibold">{item.partName}</span>
                                        <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 flex items-center gap-1">
                                            <Barcode size={10} /> {item.internalId || '---'}
                                        </span>
                                        <span className="text-xs bg-slate-50 dark:bg-slate-800 px-1 rounded border border-slate-200 dark:border-slate-600">{item.colorCode}</span>
                                    </div>

                                    {(area === 'DESPACHOS' || area === 'ENTREGAS') && item.clientAddress && (
                                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                            <MapPin size={10} /> {item.clientAddress}, {item.clientCity}
                                        </div>
                                    )}
                                    {item.shippingTrackingCode && (
                                        <div className="flex items-center gap-1 text-xs text-orange-600 font-bold mt-1 bg-orange-50 w-fit px-2 py-0.5 rounded border border-orange-100">
                                            <Truck size={10} /> Guía: {item.shippingTrackingCode} ({item.shippingCarrier})
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
