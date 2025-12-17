
import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { Order } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Download, Filter, TrendingUp, AlertTriangle, CheckCircle, FileText, Database } from 'lucide-react';

export const Reports: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Date Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1); // Default last month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Derived State for Reports
  const [filteredData, setFilteredData] = useState<{orders: Order[], totalItems: number, reworkItems: number}>({ orders: [], totalItems: 0, reworkItems: 0 });

  useEffect(() => {
    setOrders(StorageService.getOrders());
  }, []);

  useEffect(() => {
    // Apply Date Filter
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59); // Include full end day

    const filtered = orders.filter(o => {
      const entry = new Date(o.entryDate);
      return entry >= start && entry <= end;
    });

    let itemCount = 0;
    let reworkCount = 0;

    filtered.forEach(o => {
        o.items.forEach(i => {
            itemCount++;
            if (i.reworkCount > 0) reworkCount++;
        });
    });

    setFilteredData({
        orders: filtered,
        totalItems: itemCount,
        reworkItems: reworkCount
    });

  }, [orders, startDate, endDate]);

  // --- KPI CALCULATIONS ---
  const kpis = useMemo(() => {
      const totalOrders = filteredData.orders.length;
      const reworkRate = filteredData.totalItems > 0 ? ((filteredData.reworkItems / filteredData.totalItems) * 100).toFixed(1) : '0';
      
      const finishedOrders = filteredData.orders.filter(o => o.items.every(i => i.currentStatus === 'FINALIZADA'));
      const onTimeOrders = finishedOrders.filter(o => {
          if (!o.estimatedDeliveryDate) return true;
          // Find last history entry (Finish date approximation)
          // Simple logic: If today is past delivery date and it's not finished, it's late.
          // If it IS finished, we ideally check the finish date.
          // For simplicity in this version, we check if estimated >= entry date (always true) 
          // Real On-Time: Check the last 'FINALIZADA' log date vs estimated.
          
          let finishDate = new Date();
          const lastItem = o.items[0]; 
          if(lastItem && lastItem.history) {
             const finalLog = [...lastItem.history].reverse().find(h => h.action === 'FINALIZADO');
             if(finalLog) finishDate = new Date(finalLog.date);
          }
          
          return finishDate <= new Date(o.estimatedDeliveryDate);
      });

      const onTimeRate = finishedOrders.length > 0 ? ((onTimeOrders.length / finishedOrders.length) * 100).toFixed(1) : '100';

      return { totalOrders, reworkRate, onTimeRate, finishedCount: finishedOrders.length };
  }, [filteredData]);

  // --- CHART DATA PREPARATION ---
  
  // 1. Orders by Model (Top 5)
  const modelsData = useMemo(() => {
      const counts: Record<string, number> = {};
      filteredData.orders.forEach(o => {
          counts[o.modelName] = (counts[o.modelName] || 0) + 1;
      });
      return Object.entries(counts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
  }, [filteredData]);

  // 2. Reworks by Area
  const reworksByArea = useMemo(() => {
      const counts: Record<string, number> = {
          'PREALISTAMIENTO': 0, 'ALISTAMIENTO': 0, 'PINTURA': 0, 'PULIDO': 0, 'DESPACHOS': 0
      };
      
      filteredData.orders.forEach(o => {
          o.items.forEach(i => {
              i.history.forEach(h => {
                  if (h.action === 'REPROCESO' && h.areaOrigen) {
                      const key = h.areaOrigen as string;
                      if (counts[key] !== undefined) counts[key]++;
                      else counts[key] = (counts[key] || 0) + 1;
                  }
              });
          });
      });

      return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // --- EXPORT TO CSV FOR POWERBI ---
  const handleExportCSV = () => {
    // We want a flat structure: One row per ITEM per ORDER
    const headers = [
        "Order ID", "Client Name", "Client City", "Delivery Type", 
        "Model", "Entry Date", "Estimated Date", 
        "Item ID", "Part Name", "Color", "Finish", 
        "Status", "Current Area", "Rework Count", "Assigned Employee"
    ];

    const rows: string[] = [];

    // Add BOM for Excel UTF-8 compatibility
    rows.push('\uFEFF' + headers.join(","));

    filteredData.orders.forEach(o => {
        o.items.forEach(i => {
            const row = [
                `"${o.id}"`,
                `"${o.clientName}"`,
                `"${o.clientCity || ''}"`,
                `"${o.clientDeliveryType || ''}"`,
                `"${o.modelName}"`,
                `"${new Date(o.entryDate).toLocaleDateString()}"`,
                `"${o.estimatedDeliveryDate ? new Date(o.estimatedDeliveryDate).toLocaleDateString() : ''}"`,
                `"${i.internalId || i.id}"`,
                `"${i.partName}"`,
                `"${i.colorCode}"`,
                `"${i.finishType}"`,
                `"${i.currentStatus}"`,
                `"${i.currentArea}"`,
                `${i.reworkCount}`,
                `"${i.assignedEmployeeId || ''}"`
            ];
            rows.push(row.join(","));
        });
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MotoPaint_Report_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="p-6 bg-gray-100 dark:bg-slate-900 min-h-full transition-colors">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                <TrendingUp className="text-blue-600" /> Informes y Estadísticas
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
                Análisis de rendimiento, calidad y exportación para PowerBI.
            </p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleExportCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-sm font-medium flex items-center gap-2 transition-colors"
            >
                <Database size={18} /> Exportar Datos (PowerBI)
            </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex items-center gap-2 text-blue-600 font-bold mr-2">
              <Filter size={20} /> Filtros:
          </div>
          <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha Inicial</label>
              <div className="relative">
                  <Calendar className="absolute left-2 top-2 text-gray-400" size={16}/>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm dark:text-white"
                  />
              </div>
          </div>
          <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha Final</label>
              <div className="relative">
                  <Calendar className="absolute left-2 top-2 text-gray-400" size={16}/>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm dark:text-white"
                  />
              </div>
          </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-2"><FileText size={16}/> Total Órdenes</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{kpis.totalOrders}</p>
              <p className="text-xs text-gray-400 mt-1">{filteredData.totalItems} piezas procesadas</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-2"><CheckCircle size={16}/> Finalizadas</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{kpis.finishedCount}</p>
              <p className="text-xs text-green-600 mt-1">{kpis.onTimeRate}% a tiempo</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-2"><AlertTriangle size={16}/> Tasa Reprocesos</p>
              <p className={`text-3xl font-bold mt-2 ${Number(kpis.reworkRate) > 5 ? 'text-red-500' : 'text-blue-500'}`}>{kpis.reworkRate}%</p>
              <p className="text-xs text-gray-400 mt-1">{filteredData.reworkItems} piezas reprocesadas</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col justify-center items-center text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Exportar todos los datos para análisis profundo</p>
              <button onClick={handleExportCSV} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1">
                  <Download size={14}/> Descargar CSV
              </button>
          </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Chart 1: Top Models */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Top 5 Modelos Ingresados</h3>
              <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={modelsData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" opacity={0.2} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={100} tick={{fill: '#9CA3AF', fontSize: 12}} />
                          <Tooltip contentStyle={{backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6'}} cursor={{fill: 'transparent'}} />
                          <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Chart 2: Reworks by Area */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Reprocesos por Área (Calidad)</h3>
              <div className="h-64 w-full flex items-center justify-center">
                  {reworksByArea.every(x => x.value === 0) ? (
                      <p className="text-gray-400 text-sm">Sin reprocesos en este periodo.</p>
                  ) : (
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={reworksByArea}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                              >
                                  {reworksByArea.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                              </Pie>
                              <Tooltip contentStyle={{backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6'}} />
                              <Legend verticalAlign="bottom" height={36} iconType="circle" />
                          </PieChart>
                      </ResponsiveContainer>
                  )}
              </div>
          </div>
      </div>
      
      {/* RAW DATA PREVIEW (Last 5 orders) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-white">Vista Previa de Datos (Últimas 5 Órdenes)</h3>
              <span className="text-xs text-gray-500">Mostrando resumen. Usa "Exportar" para ver todo.</span>
          </div>
          <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300 font-medium">
                      <tr>
                          <th className="px-4 py-3">Orden</th>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3">Ingreso</th>
                          <th className="px-4 py-3">Piezas</th>
                          <th className="px-4 py-3">Estado</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {filteredData.orders.slice(0, 5).map(o => (
                          <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                              <td className="px-4 py-3 font-mono text-xs">{o.id}</td>
                              <td className="px-4 py-3">{o.clientName}</td>
                              <td className="px-4 py-3">{new Date(o.entryDate).toLocaleDateString()}</td>
                              <td className="px-4 py-3">{o.items.length}</td>
                              <td className="px-4 py-3">
                                  {o.items.every(i => i.currentStatus === 'FINALIZADA') 
                                    ? <span className="text-green-600 font-bold text-xs">Finalizado</span> 
                                    : <span className="text-amber-600 font-bold text-xs">En Proceso</span>}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};
