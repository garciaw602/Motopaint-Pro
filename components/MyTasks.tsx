
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Order, OrderItem, Employee } from '../types';
import { Calendar, Bike, AlertTriangle, CheckCircle, Clock, Activity, ArrowRight, User } from 'lucide-react';

interface MyTasksProps {
  currentUser: Employee;
}

export const MyTasks: React.FC<MyTasksProps> = ({ currentUser }) => {
  const [tasks, setTasks] = useState<{ order: Order, item: OrderItem }[]>([]);

  useEffect(() => {
    loadTasks();
    const handleUpdate = () => loadTasks();
    window.addEventListener('motopaint_data_updated', handleUpdate);
    return () => window.removeEventListener('motopaint_data_updated', handleUpdate);
  }, [currentUser]);

  const loadTasks = () => {
    const allOrders = StorageService.getOrders();
    const myTasks: { order: Order, item: OrderItem }[] = [];

    allOrders.forEach(order => {
      order.items.forEach(item => {
        // Filter tasks assigned to current user that are NOT finished
        if (item.assignedEmployeeId === currentUser.id && item.currentStatus !== 'FINALIZADA') {
          myTasks.push({ order, item });
        }
      });
    });

    // Sort by Urgency (Date) then by Order ID
    myTasks.sort((a, b) => {
        const dateA = a.order.estimatedDeliveryDate ? new Date(a.order.estimatedDeliveryDate).getTime() : Infinity;
        const dateB = b.order.estimatedDeliveryDate ? new Date(b.order.estimatedDeliveryDate).getTime() : Infinity;
        return dateA - dateB;
    });

    setTasks(myTasks);
  };

  const isUrgent = (dateStr?: string) => {
      if (!dateStr) return false;
      const delivery = new Date(dateStr);
      const now = new Date();
      return (delivery.getTime() - now.getTime()) < 172800000; // 48 hours
  };

  return (
    <div className="p-6 bg-gray-100 dark:bg-slate-900 min-h-full transition-colors">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <User className="text-blue-600" /> Mis Tareas Asignadas
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Resumen de actividades pendientes en tus áreas. Para gestionar o finalizar tareas, ve a la sección de Área correspondiente.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {tasks.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                <CheckCircle size={48} className="mb-4 text-green-500 opacity-50" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">¡Estás al día!</h3>
                <p className="text-sm">No tienes piezas asignadas pendientes en este momento.</p>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Orden / Moto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pieza</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Área / Proceso</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Detalles</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Prioridad</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {tasks.map(({ order, item }, idx) => {
                            const urgent = isUrgent(order.estimatedDeliveryDate);
                            return (
                                <tr key={`${order.id}-${item.id}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded w-fit mb-1">
                                                {order.id}
                                            </span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">{order.clientName}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Bike size={10} /> {order.modelName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{item.partName}</div>
                                        <div className="text-xs text-gray-500 font-mono">{item.internalId}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">{item.currentArea}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full w-fit flex items-center gap-1 ${item.currentStatus === 'EN_REVISION' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                <Activity size={10} /> {item.currentStatus.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 w-fit">
                                                {item.colorCode} - {item.colorName}
                                            </span>
                                            {item.finishType === 'MATE' && <span className="text-[10px] text-slate-500 border border-slate-300 px-1 rounded w-fit">MATE</span>}
                                            {item.hasDecals && <span className="text-[10px] text-purple-600 border border-purple-200 px-1 rounded w-fit">Calcas</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            {urgent ? (
                                                <div className="flex items-center gap-1 text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-100 dark:border-red-900">
                                                    <AlertTriangle size={14} />
                                                    <span className="text-xs font-bold">Urgente</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-gray-500">
                                                    <Clock size={14} />
                                                    <span className="text-xs">Normal</span>
                                                </div>
                                            )}
                                        </div>
                                        {order.estimatedDeliveryDate && (
                                            <div className="text-[10px] text-gray-400 mt-1">
                                                Entrega: {new Date(order.estimatedDeliveryDate).toLocaleDateString()}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
};
