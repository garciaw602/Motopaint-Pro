
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Order, OrderItem, Employee, AreaType } from '../types';
import { Search, Filter, Box, User, Clock, CheckCircle, Barcode, MapPin, Activity, AlertCircle, ScanLine, Bike, Puzzle, X, Timer, ArrowRight, Sun, Moon, AlertTriangle, Sparkles } from 'lucide-react';

export const Tracker: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Filters State
  const [textFilter, setTextFilter] = useState('');
  const [processFilter, setProcessFilter] = useState<AreaType | 'FINALIZADA' | 'ALL'>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL');
  const [urgentFilter, setUrgentFilter] = useState(false);

  useEffect(() => {
    const loadData = () => {
        setOrders(StorageService.getOrders());
        setEmployees(StorageService.getEmployees());
    };
    loadData();
    
    const handleUpdate = () => loadData();
    window.addEventListener('motopaint_data_updated', handleUpdate);
    return () => window.removeEventListener('motopaint_data_updated', handleUpdate);
  }, []);

  const getEmployeeName = (id?: string) => {
    if (!id) return 'Sin asignar';
    return employees.find(e => e.id === id)?.name || 'Desconocido';
  };

  const isUrgent = (dateStr?: string) => {
      if (!dateStr) return false;
      const delivery = new Date(dateStr);
      const now = new Date();
      const diff = delivery.getTime() - now.getTime();
      return diff < 172800000; // 48 hours
  };

  const getProcessLabel = (area: string, status: string) => {
      if (status === 'FINALIZADA') return 'Finalizado';
      if (status === 'EN_REVISION') return `En Revisión (${area})`;
      return area;
  };

  const renderProcessBadge = (item: OrderItem) => {
    const isFinished = item.currentStatus === 'FINALIZADA';
    const isRevision = item.currentStatus === 'EN_REVISION';
    
    let colorClass = "bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600";
    if (isFinished) colorClass = "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
    else if (isRevision) colorClass = "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
    else {
        switch(item.currentArea) {
            case 'PREALISTAMIENTO': colorClass = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800"; break;
            case 'ALISTAMIENTO': colorClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"; break;
            case 'PINTURA': colorClass = "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800"; break;
            case 'PULIDO': colorClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"; break;
            case 'DESPACHOS': colorClass = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800"; break;
            case 'ENTREGAS': colorClass = "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800"; break;
        }
    }

    return (
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 w-fit ${colorClass}`}>
            <Activity size={12} />
            {getProcessLabel(item.currentArea, item.currentStatus)}
        </span>
    );
  };

  const handleClearFilters = () => {
      setTextFilter('');
      setProcessFilter('ALL');
      setEmployeeFilter('ALL');
      setUrgentFilter(false);
  };

  // --- FILTERING LOGIC ---
  const filteredItems = React.useMemo(() => {
      const results: { order: Order, item: OrderItem }[] = [];
      const term = textFilter.toLowerCase().trim();

      orders.forEach(order => {
          // 1. Urgent Filter (Applies to Order level)
          if (urgentFilter && !isUrgent(order.estimatedDeliveryDate)) return;

          order.items.forEach(item => {
              // 2. Process Filter
              if (processFilter !== 'ALL') {
                  if (processFilter === 'FINALIZADA') {
                      if (item.currentStatus !== 'FINALIZADA') return;
                  } else {
                      if (item.currentArea !== processFilter || item.currentStatus === 'FINALIZADA') return;
                  }
              }

              // 3. Employee Filter
              if (employeeFilter !== 'ALL') {
                  if (item.assignedEmployeeId !== employeeFilter) return;
              }

              // 4. Text Filter (Multi-field)
              if (term) {
                  const matches = 
                    order.clientName.toLowerCase().includes(term) ||
                    order.modelName.toLowerCase().includes(term) ||
                    order.id.toLowerCase().includes(term) ||
                    item.partName.toLowerCase().includes(term) ||
                    (item.internalId && item.internalId.toLowerCase().includes(term)) ||
                    item.id.toLowerCase().includes(term);
                  
                  if (!matches) return;
              }

              results.push({ order, item });
          });
      });
      return results;
  }, [orders, textFilter, processFilter, employeeFilter, urgentFilter]);


  return (
    <div className="p-6 bg-gray-100 dark:bg-slate-900 min-h-full transition-colors">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <ScanLine className="text-blue-600" /> Rastreador de Piezas
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Busca piezas por cliente, modelo, empleado o proceso.</p>
      </div>

      {/* FILTERS CONTAINER */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 mb-8 transition-all hover:shadow-md">
          <div className="flex flex-col gap-4">
              {/* Row 1: Main Search */}
              <div className="relative w-full">
                   <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                   <input 
                        type="text" 
                        value={textFilter}
                        onChange={(e) => setTextFilter(e.target.value)}
                        placeholder="Buscar por Cliente, Modelo, Pieza, ID..."
                        className="w-full h-12 pl-12 pr-4 rounded-lg border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-white border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                   />
                   {textFilter && (
                       <button onClick={() => setTextFilter('')} className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                           <X size={20} />
                       </button>
                   )}
              </div>

              {/* Row 2: Dropdowns & Toggles */}
              <div className="flex flex-col md:flex-row gap-4 items-center">
                  
                  {/* Process Filter */}
                  <div className="w-full md:w-auto flex-1 min-w-[200px]">
                      <div className="relative">
                          <label className="absolute -top-2 left-2 bg-white dark:bg-slate-800 px-1 text-xs font-medium text-blue-600">Proceso / Área</label>
                          <select 
                            value={processFilter} 
                            onChange={(e) => setProcessFilter(e.target.value as any)}
                            className="w-full h-11 rounded-lg border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 px-3 text-sm text-gray-800 dark:text-white border focus:ring-2 focus:ring-blue-500"
                          >
                              <option value="ALL">Todas las Áreas</option>
                              <option value="PREALISTAMIENTO">Pre-Alistamiento</option>
                              <option value="ALISTAMIENTO">Alistamiento</option>
                              <option value="PINTURA">Pintura</option>
                              <option value="PULIDO">Pulido</option>
                              <option value="DESPACHOS">Despachos</option>
                              <option value="ENTREGAS">Entregas</option>
                              <option value="FINALIZADA">Finalizadas</option>
                          </select>
                      </div>
                  </div>

                  {/* Employee Filter */}
                  <div className="w-full md:w-auto flex-1 min-w-[200px]">
                      <div className="relative">
                          <label className="absolute -top-2 left-2 bg-white dark:bg-slate-800 px-1 text-xs font-medium text-blue-600">Empleado Asignado</label>
                          <select 
                            value={employeeFilter} 
                            onChange={(e) => setEmployeeFilter(e.target.value)}
                            className="w-full h-11 rounded-lg border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 px-3 text-sm text-gray-800 dark:text-white border focus:ring-2 focus:ring-blue-500"
                          >
                              <option value="ALL">Todos los Empleados</option>
                              {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role === 'LIDER' ? 'Líder' : 'Operario'})</option>)}
                          </select>
                      </div>
                  </div>

                  {/* Urgent Toggle */}
                  <button 
                      onClick={() => setUrgentFilter(!urgentFilter)}
                      className={`h-11 px-4 rounded-lg border flex items-center gap-2 transition-all shadow-sm whitespace-nowrap ${
                          urgentFilter 
                            ? 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/40 dark:border-red-800 dark:text-red-300' 
                            : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'
                      }`}
                  >
                      {urgentFilter ? <AlertTriangle size={18} fill="currentColor" /> : <AlertTriangle size={18} />}
                      <span className="font-medium text-sm">Urgentes</span>
                  </button>

                   {/* Clear Filters */}
                   <button 
                      onClick={handleClearFilters}
                      className="h-11 px-3 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors text-sm underline whitespace-nowrap"
                  >
                      Limpiar Filtros
                  </button>
              </div>
          </div>
      </div>

      {/* RESULTS AREA */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                  Resultados: {filteredItems.length} piezas
              </h3>
          </div>

          {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <Search size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">No se encontraron resultados</p>
                  <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
                  <button onClick={handleClearFilters} className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">Ver Todo</button>
              </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map(({ order, item }) => (
                    <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group">
                        
                        {/* Header: Order Context */}
                        <div className="p-3 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700 rounded-t-xl">
                             <div className="flex justify-between items-start">
                                 <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <Bike size={12} /> {order.modelName}
                                    </p>
                                    <p className="font-bold text-sm text-gray-800 dark:text-white truncate max-w-[180px]" title={order.clientName}>
                                        {order.clientName}
                                    </p>
                                 </div>
                                 <div className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                                        {order.id}
                                    </span>
                                    {isUrgent(order.estimatedDeliveryDate) && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 animate-pulse">
                                            <AlertTriangle size={8} /> Urgente
                                        </span>
                                    )}
                                 </div>
                             </div>
                        </div>

                        {/* Body: Item Details */}
                        <div className="p-3 flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-white leading-tight">{item.partName}</h4>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-2">
                                     <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">{item.colorCode}</span>
                                     {item.hasDecals && <span className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-800 flex items-center gap-0.5"><Sparkles size={8}/> Calcas</span>}
                                     {item.accessoriesDetail && <span className="text-[10px] bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 px-1.5 py-0.5 rounded border border-pink-100 dark:border-pink-800 flex items-center gap-0.5"><Puzzle size={8}/> Acc.</span>}
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 flex items-center gap-1"><User size={12}/> {getEmployeeName(item.assignedEmployeeId)}</span>
                                </div>
                                <div className="w-full flex justify-end">
                                    {renderProcessBadge(item)}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          )}
      </div>
    </div>
  );
};
