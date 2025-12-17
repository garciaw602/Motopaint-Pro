
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Order, OrderItem, ItemHistoryEntry, ItemProcessStatus, AreaType, Employee } from '../types';
import { Search, Edit2, Trash2, Calendar, Bike, CheckCircle, Clock, Package, AlertTriangle, History, User, X, Info, Activity, QrCode } from 'lucide-react';

interface OrderListProps {
  onEditOrder: (id: string) => void;
}

export const OrderList: React.FC<OrderListProps> = ({ onEditOrder }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'FINISHED'>('ACTIVE');
  const [filterUrgent, setFilterUrgent] = useState(false);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);

  // Modal States
  const [historyItem, setHistoryItem] = useState<OrderItem | null>(null);
  const [damageModal, setDamageModal] = useState<{
      isOpen: boolean;
      orderId: string | null;
      itemId: string | null;
      partName: string | null;
  }>({ isOpen: false, orderId: null, itemId: null, partName: null });
  const [damageReason, setDamageReason] = useState('');

  useEffect(() => {
    loadOrders();
    // Load Current User
    const userStr = localStorage.getItem('motopaint_user');
    if (userStr) {
        setCurrentUser(JSON.parse(userStr));
    }

    const handleUpdate = () => loadOrders();
    window.addEventListener('motopaint_data_updated', handleUpdate);
    return () => window.removeEventListener('motopaint_data_updated', handleUpdate);
  }, []);

  const loadOrders = () => {
    setOrders(StorageService.getOrders());
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta orden? Esta acción no se puede deshacer.')) {
      const updated = orders.filter(o => o.id !== id);
      StorageService.saveOrders(updated);
      setOrders(updated);
    }
  };

  // Helper to parse YYYY-MM-DD string as local date without UTC shift
  const parseLocalDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
  };

  const isUrgent = (dateStr?: string) => {
      if (!dateStr) return false;
      const delivery = parseLocalDate(dateStr);
      const now = new Date();
      const diff = delivery.getTime() - now.getTime();
      return diff < 172800000; // 48 hours
  };

  const filteredOrders = orders.filter(order => {
    const term = searchTerm.toLowerCase();
    
    // Check if any item matches the search (for ID search)
    const hasItemMatch = order.items.some(i => 
        (i.internalId && i.internalId.toLowerCase().includes(term)) || 
        i.partName.toLowerCase().includes(term)
    );

    const matchesSearch = 
      order.clientName.toLowerCase().includes(term) ||
      order.modelName.toLowerCase().includes(term) ||
      order.id.toLowerCase().includes(term) ||
      hasItemMatch;

    const isFinished = order.items.every(i => i.currentStatus === 'FINALIZADA');
    const matchesUrgency = filterUrgent ? isUrgent(order.estimatedDeliveryDate) : true;
    
    if (filterStatus === 'ACTIVE') return matchesSearch && matchesUrgency && !isFinished;
    if (filterStatus === 'FINISHED') return matchesSearch && matchesUrgency && isFinished;
    return matchesSearch && matchesUrgency;
  });

  // --- QR PRINTING LOGIC ---
  const handlePrintQR = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const labelsHtml = order.items.map(item => `
      <div class="label">
        <div class="header">MOTOPAINT PRO</div>
        <div class="qr-container">
           <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${item.internalId}" alt="QR Code" />
        </div>
        <div class="id-main">${item.internalId || '---'}</div>
        <div class="part-name">${item.partName}</div>
        <div class="details">
            ${item.colorCode} - ${item.colorName}
        </div>
        <div class="footer">
           <span class="order-id">${order.id}</span><br/>
           ${order.clientName}
        </div>
      </div>
    `).join('');

    const style = `
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; display: flex; flex-wrap: wrap; gap: 15px; background: #fff; }
        .label { 
            width: 55mm; 
            height: 75mm; 
            border: 2px solid #000; 
            border-radius: 8px;
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            text-align: center; 
            padding: 8px; 
            box-sizing: border-box;
            page-break-inside: avoid;
            background: #fff;
        }
        .header { font-size: 9px; font-weight: 900; letter-spacing: 1px; margin-bottom: 5px; color: #444; }
        .qr-container img { width: 90px; height: 90px; display: block; }
        .id-main { font-size: 20px; font-weight: 900; margin: 4px 0; font-family: monospace; letter-spacing: -1px; }
        .part-name { font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; line-height: 1.1; }
        .details { font-size: 10px; color: #555; margin-bottom: auto; }
        .footer { font-size: 9px; border-top: 2px solid #000; width: 100%; padding-top: 4px; margin-top: 4px; line-height: 1.2; }
        .order-id { color: #000; font-weight: 900; font-size: 11px; background: #eee; padding: 1px 4px; border-radius: 3px; }
        @media print { 
            body { margin: 0; padding: 0; } 
            .label { margin: 0; page-break-after: always; }
        }
      </style>
    `;

    printWindow.document.write(`<html><head><title>Etiquetas QR - ${order.id}</title>${style}</head><body>${labelsHtml}</body><script>window.onload = () => { setTimeout(() => window.print(), 500); }</script></html>`);
    printWindow.document.close();
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
                  actorName: currentUser ? currentUser.name : 'Admin/Líder',
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
  };

  const getProcessStatusLabel = (status: string) => {
      switch(status) {
          case 'PENDIENTE': return 'Pendiente';
          case 'PREALISTAMIENTO': return 'Pre-Alistamiento';
          case 'ALISTAMIENTO_1': return 'Alistamiento 1';
          case 'PINTURA_BASE': return 'Pintura Base';
          case 'ALISTAMIENTO_2': return 'Alistamiento 2';
          case 'PINTURA_COLOR': return 'Pintura Color';
          case 'PULIDO': return 'Pulido';
          case 'DESPACHOS': return 'Despachos';
          case 'ENTREGAS': return 'En Ruta';
          case 'EN_REVISION': return 'En Revisión';
          case 'FINALIZADA': return 'Finalizado';
          default: return status.replace(/_/g, ' ');
      }
  };

  const getAreaLabel = (area: string) => {
      switch(area) {
          case 'PREALISTAMIENTO': return 'Pre-Alistamiento';
          case 'ALISTAMIENTO': return 'Alistamiento';
          case 'PINTURA': return 'Pintura';
          case 'PULIDO': return 'Pulido';
          case 'DESPACHOS': return 'Despachos';
          case 'ENTREGAS': return 'Entregas';
          default: return area;
      }
  };

  // Helper to calculate weighted progress
  const getStatusWeight = (status: string | undefined) => {
    const s = status || 'PENDIENTE';
    switch(s) {
        case 'PENDIENTE': return 5;
        case 'PREALISTAMIENTO': return 10;
        case 'ALISTAMIENTO_1': return 25;
        case 'PINTURA_BASE': return 40;
        case 'ALISTAMIENTO_2': return 55;
        case 'PINTURA_COLOR': return 70;
        case 'PULIDO': return 85;
        case 'DESPACHOS': return 92;
        case 'ENTREGAS': return 96;
        case 'EN_REVISION': return 98;
        case 'FINALIZADA': return 100;
        default: return 0;
    }
  };

  // PERMISSION CHECK
  // Admin, Recepcion, Mensajero have full edit rights
  const canManageOrder = currentUser && ['ADMIN', 'RECEPCION', 'MENSAJERO'].includes(currentUser.role);
  // Leaders can also print QRs
  const canPrintQR = currentUser && ['ADMIN', 'RECEPCION', 'MENSAJERO', 'LIDER'].includes(currentUser.role);

  return (
    <div className="p-6 bg-gray-100 dark:bg-slate-900 min-h-full transition-colors relative">
      {/* CSS Animation for Bikes */}
      <style>{`
        @keyframes idle-bike {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .animate-idle-bike {
          animation: idle-bike 2s ease-in-out infinite;
        }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Órdenes de Trabajo</h2>
           <p className="text-sm text-gray-500 dark:text-gray-400">Gestión de ingresos y entregas</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
            <button onClick={() => setFilterStatus('ALL')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterStatus === 'ALL' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>Todas</button>
            <button onClick={() => setFilterStatus('ACTIVE')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterStatus === 'ACTIVE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>Activas</button>
            <button onClick={() => setFilterStatus('FINISHED')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterStatus === 'FINISHED' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>Finalizadas</button>
        </div>
      </div>

      <div id="tour-orders-filters" className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
                type="text" 
                placeholder="Buscar por cliente, moto, orden o ID de pieza..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <button 
             onClick={() => setFilterUrgent(!filterUrgent)}
             className={`px-4 rounded-xl border flex items-center gap-2 font-medium transition-colors ${filterUrgent ? 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' : 'bg-white border-gray-200 text-gray-600 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300'}`}
          >
             <AlertTriangle size={18} />
             <span className="hidden md:inline">Urgentes</span>
          </button>
      </div>

      {/* HISTORY MODAL */}
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
                                  }`}>{entry.action === 'RECHAZADO' || entry.action === 'REPROCESO' || entry.action === 'DEVUELTO_OPERARIO' ? <X size={12}/> : <CheckCircle size={12}/>}</div>
                                  <div className="flex-1 pb-2">
                                      <div className="flex justify-between items-start"><span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full mb-1 inline-block">{new Date(entry.date).toLocaleString()}</span><span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{entry.areaOrigen || 'SISTEMA'}</span></div>
                                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{entry.action.replace(/_/g, ' ')}</p>
                                          <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-1"><User size={12}/> {entry.actorName}</p>
                                          {entry.notes && <div className={`mt-2 text-xs p-2 rounded border ${entry.action === 'RECHAZADO' || entry.action === 'DEVUELTO_OPERARIO' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 text-red-700 dark:text-red-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}><span className="font-semibold">Nota:</span> {entry.notes}</div>}
                                      </div>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* DAMAGE MODAL */}
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

      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.length === 0 ? (
           <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 border-dashed">
               <Package size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
               <p className="text-gray-500 dark:text-gray-400">No se encontraron órdenes.</p>
           </div>
        ) : (
           filteredOrders.map(order => {
              const totalItems = order.items.length;
              // Calculate weighted progress
              const totalProgressSum = order.items.reduce((sum, item) => sum + getStatusWeight(item.currentStatus || 'PENDIENTE'), 0);
              const progress = totalItems > 0 ? Math.round(totalProgressSum / totalItems) : 0;
              
              const completedItems = order.items.filter(i => i.currentStatus === 'FINALIZADA').length;
              const isFullyFinished = totalItems > 0 && completedItems === totalItems;
              const isLate = order.estimatedDeliveryDate && new Date(order.estimatedDeliveryDate) < new Date() && !isFullyFinished;
              const isOrderUrgent = isUrgent(order.estimatedDeliveryDate);

              return (
                <div 
                    key={order.id} 
                    id="tour-orders-card" 
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow border-l-4 group"
                    style={{ borderLeftColor: order.visualColorHex }}
                >
                    <div className="p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center border-b border-gray-100 dark:border-slate-700">
                        <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 relative group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                                <Bike 
                                    size={24} 
                                    className={`transition-all duration-500 ease-out group-hover:translate-x-3 group-hover:-rotate-12 ${!isFullyFinished ? 'animate-idle-bike' : ''}`} 
                                />
                                {isOrderUrgent && <span className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800"></span>}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    {order.clientName}
                                    <span className="text-xs font-mono font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-600">{order.id}</span>
                                    {isOrderUrgent && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200 font-bold">URGENTE</span>}
                                </h3>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    <span className="flex items-center gap-1"><Bike size={14}/> {order.modelName}</span>
                                    <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(order.entryDate).toLocaleDateString()}</span>
                                    {order.estimatedDeliveryDate && (
                                        <span className={`flex items-center gap-1 ${isLate ? 'text-red-500 font-bold' : ''}`}>
                                            <Clock size={14}/> {new Date(order.estimatedDeliveryDate).toLocaleDateString()} {isLate && '(Atrasado)'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                             <div className="text-right mr-4">
                                 <div className="flex items-center gap-2 mb-1 justify-end">
                                     <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{progress}% Completado</span>
                                 </div>
                                 <div className="w-32 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                     <div className={`h-full ${isFullyFinished ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                                 </div>
                             </div>

                             <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full border border-gray-200 dark:border-slate-600 shadow-sm" style={{ backgroundColor: order.visualColorHex }} title="Referencia Visual" />
                                    {isFullyFinished ? (
                                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold rounded-full flex items-center gap-1">
                                            <CheckCircle size={12} /> Terminada
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-full flex items-center gap-1">
                                            <Clock size={12} /> En Proceso
                                        </span>
                                    )}
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* DETAILED ITEMS LIST */}
                    <div className="p-5 bg-gray-50 dark:bg-slate-700/30 border-t border-gray-100 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                             <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                 Piezas a Pintar ({order.items.length})
                             </h4>
                             {/* ACTIONS CONTAINER */}
                             <div id="tour-orders-actions" className="flex gap-2">
                                {/* QR PRINT BUTTON - Visible to Admins, Reception, Messengers AND Leaders */}
                                {canPrintQR && (
                                    <button onClick={() => handlePrintQR(order)} className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1" title="Imprimir Etiquetas QR">
                                        <QrCode size={12} /> QR
                                    </button>
                                )}
                                
                                {/* EDIT/DELETE BUTTONS - Restricted to Management Roles */}
                                {canManageOrder && (
                                    <>
                                        <button onClick={() => onEditOrder(order.id)} className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-1">
                                            <Edit2 size={12} /> Editar
                                        </button>
                                        <button onClick={() => handleDelete(order.id)} className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1">
                                            <Trash2 size={12} /> Eliminar
                                        </button>
                                    </>
                                )}
                             </div>
                        </div>
                        
                        <div className="space-y-3">
                            {order.items.map((item, idx) => {
                                const isItemFinished = item.currentStatus === 'FINALIZADA';
                                const employeeName = StorageService.getEmployees().find(e => e.id === item.assignedEmployeeId)?.name;
                                const isRework = (item.reworkCount || 0) > 0;
                                const isHighlightedIssue = isRework; 
                                
                                return (
                                    <div key={idx} className={`bg-white dark:bg-slate-800 p-3 rounded-lg border shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 relative transition-colors ${
                                        isHighlightedIssue 
                                            ? 'border-red-300 bg-red-50 dark:bg-red-900/10 dark:border-red-800' 
                                            : 'border-gray-200 dark:border-slate-600'
                                    }`}>
                                        {/* DAMAGED/REWORK BADGE */}
                                        {isHighlightedIssue && (
                                            <div className="absolute -top-2 left-4 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                                <AlertTriangle size={10} /> REPORTE DE DAÑO / REPROCESO
                                            </div>
                                        )}

                                        {/* Status Icon */}
                                        <div className="hidden sm:flex items-center justify-center">
                                            {isItemFinished ? (
                                                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><CheckCircle size={16}/></div>
                                            ) : (
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isHighlightedIssue ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-400'}`}>
                                                    {isHighlightedIssue ? <AlertTriangle size={16}/> : <Activity size={16}/>}
                                                </div>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 mt-1 sm:mt-0">
                                                <span className="font-bold text-gray-800 dark:text-white text-sm">{item.partName}</span>
                                                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                                    {item.internalId || '---'}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                <span className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                                                    {item.colorCode} - {item.colorName}
                                                </span>
                                                <span className="bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300 px-2 py-0.5 rounded">
                                                    {item.finishType}
                                                </span>
                                                {item.hasDecals && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100">Calcas</span>}
                                                {item.accessoriesDetail && <span className="bg-pink-50 text-pink-700 px-2 py-0.5 rounded border border-pink-100">Accesorios</span>}
                                            </div>
                                        </div>

                                        {/* Location/Assignment */}
                                        <div className="sm:text-right min-w-[140px]">
                                            <div className="flex flex-col sm:items-end gap-1">
                                                {(() => {
                                                    const areaLabel = getAreaLabel(item.currentArea);
                                                    const statusLabel = getProcessStatusLabel(item.currentStatus);
                                                    // Only show area if it's NOT redundant with the process name, and not fully finished (since finished has no specific area usually)
                                                    const showArea = !statusLabel.toLowerCase().includes(areaLabel.toLowerCase()) && item.currentStatus !== 'FINALIZADA';
                                                    
                                                    return (
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border w-fit ${
                                                            isItemFinished 
                                                                ? 'bg-green-100 text-green-700 border-green-200' 
                                                                : (isHighlightedIssue ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800')
                                                        }`}>
                                                            {showArea ? `${areaLabel} • ${statusLabel}` : statusLabel}
                                                        </span>
                                                    );
                                                })()}
                                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    <User size={10} /> {employeeName || 'Sin asignar'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Item Actions */}
                                        <div className="flex sm:flex-col gap-2 border-t sm:border-t-0 sm:border-l border-gray-100 dark:border-slate-700 pt-2 sm:pt-0 sm:pl-4 justify-end">
                                            <button 
                                                onClick={() => setHistoryItem(item)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded transition-colors"
                                                title="Ver Log/Historial"
                                            >
                                                <History size={16} />
                                            </button>
                                            <button 
                                                onClick={() => setDamageModal({ isOpen: true, orderId: order.id, itemId: item.id, partName: item.partName })}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 rounded transition-colors"
                                                title="Reportar Daño"
                                            >
                                                <AlertTriangle size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
              );
           })
        )}
      </div>
    </div>
  );
};
