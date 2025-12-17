
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Client, MotoModel, Part, ColorDef, OrderItem, OrderStatus, Order, SpecialEdition, FinishType } from '../types';
import { Plus, X, Save, Bike, Calendar, Sparkles, AlertCircle, Trash2, Puzzle } from 'lucide-react';

interface OrderFormProps {
  onCancel: () => void;
  onSave: () => void;
  editingOrderId?: string | null;
}

const generateVisualColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 50%)`;
};

export const OrderForm: React.FC<OrderFormProps> = ({ onCancel, onSave, editingOrderId }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [models, setModels] = useState<MotoModel[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [colors, setColors] = useState<ColorDef[]>([]);
  const [specialEditions, setSpecialEditions] = useState<SpecialEdition[]>([]);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [modelSelectionValue, setModelSelectionValue] = useState(''); 
  const [estimatedDate, setEstimatedDate] = useState('');
  const [items, setItems] = useState<Partial<OrderItem>[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Temp Item State
  const [tempPartId, setTempPartId] = useState('');
  const [tempColorId, setTempColorId] = useState('');
  const [tempDecals, setTempDecals] = useState(false);
  const [tempAccessoriesDetail, setTempAccessoriesDetail] = useState(''); // NEW: Text instead of boolean
  const [tempFinish, setTempFinish] = useState<FinishType>('BRILLANTE');

  useEffect(() => {
    setClients(StorageService.getClients());
    setModels(StorageService.getModels());
    setParts(StorageService.getParts());
    setColors(StorageService.getColors());
    setSpecialEditions(StorageService.getSpecialEditions());
  }, []);

  // Load existing order
  useEffect(() => {
    if (editingOrderId) {
        const allOrders = StorageService.getOrders();
        const orderToEdit = allOrders.find(o => o.id === editingOrderId);
        if (orderToEdit) {
            setSelectedClientId(orderToEdit.clientId);
            setSelectedModelId(orderToEdit.modelId);
            
            // Determine if it was a Special Edition or Standard
            if (orderToEdit.specialEditionId) {
                setModelSelectionValue(`se_${orderToEdit.specialEditionId}`);
            } else {
                setModelSelectionValue(`std_${orderToEdit.modelId}`); 
            }
            
            setEstimatedDate(orderToEdit.estimatedDeliveryDate || '');
            setItems(orderToEdit.items);
        }
    }
  }, [editingOrderId]);

  const handleAddItem = () => {
    if (!tempPartId || !tempColorId) return;

    const part = parts.find(p => p.id === tempPartId);
    const color = colors.find(c => c.id === tempColorId);

    if (part && color) {
      setItems([...items, {
        partId: part.id,
        partName: part.name,
        colorId: color.id,
        colorName: color.name,
        colorCode: color.code,
        hasDecals: tempDecals,
        accessoriesDetail: tempAccessoriesDetail, // NEW
        finishType: tempFinish,
        // NEW: Set initial status to PREALISTAMIENTO
        currentStatus: 'PREALISTAMIENTO', 
        currentArea: 'PREALISTAMIENTO',
        reworkCount: 0,
        history: [],
        status: OrderStatus.IN_PROCESS
      }]);
      setTempPartId('');
      setTempAccessoriesDetail('');
      // Keep color and finish for ease of use
      setError(null);
    }
  };

  const handleModelSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (items.length > 0 && value !== modelSelectionValue) {
          if (!confirm("Cambiar el modelo reiniciará la lista de piezas actual. ¿Continuar?")) return; 
      }
      setModelSelectionValue(value);
      setError(null);

      if (value.startsWith('std_')) {
          const mId = value.replace('std_', '');
          setSelectedModelId(mId);
          setItems([]); 
      } else if (value.startsWith('se_')) {
          const seId = value.replace('se_', '');
          const edition = specialEditions.find(se => se.id === seId);
          
          if (edition) {
              setSelectedModelId(edition.modelId);
              const newItems: Partial<OrderItem>[] = edition.items.map(seItem => {
                const color = colors.find(c => c.id === seItem.defaultColorId) || colors[0];
                return {
                    partId: seItem.partId,
                    partName: seItem.partName,
                    colorId: color?.id || '',
                    colorName: color?.name || 'Sin color',
                    colorCode: color?.code || '?',
                    hasDecals: seItem.hasDecals || false,
                    accessoriesDetail: seItem.accessoriesDetail || '', // NEW
                    finishType: seItem.defaultFinish || 'BRILLANTE',
                    currentStatus: 'PREALISTAMIENTO', // NEW
                    currentArea: 'PREALISTAMIENTO', // NEW
                    reworkCount: 0,
                    history: []
                };
              });
              setItems(newItems);
          }
      } else {
          setSelectedModelId('');
          setItems([]);
      }
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSubmit = () => {
    // 1. Validate Client
    if (!selectedClientId) {
        setError("⚠️ Por favor, seleccione un Cliente para la orden.");
        return;
    }

    // 2. Validate Model
    if (!selectedModelId) {
        setError("⚠️ Por favor, seleccione el Modelo de la moto o una Edición Especial.");
        return;
    }

    // 3. Validate Items
    if (items.length === 0) {
        setError("⚠️ La orden debe tener al menos una pieza agregada.");
        return;
    }

    // 4. Validate Date
    if (!estimatedDate) {
        setError("⚠️ La fecha de entrega es obligatoria.");
        return;
    }

    if (estimatedDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        
        const [year, month, day] = estimatedDate.split('-').map(Number);
        // Note: Month is 0-indexed in Date constructor, so month - 1
        const localInputDate = new Date(year, month - 1, day);

        // Check if strictly less than today (yesterday or before)
        if (localInputDate.getTime() < today.getTime()) {
            const msg = "⚠️ La fecha de entrega no puede ser anterior a hoy (puede ser el mismo día).";
            setError(msg);
            return;
        }
    }

    const client = clients.find(c => c.id === selectedClientId);
    const model = models.find(m => m.id === selectedModelId);

    // Determine Special Edition info
    let specialEditionId: string | undefined;
    let specialEditionName: string | undefined;
    if (modelSelectionValue.startsWith('se_')) {
        const seId = modelSelectionValue.replace('se_', '');
        const se = specialEditions.find(e => e.id === seId);
        if (se) {
            specialEditionId = se.id;
            specialEditionName = se.name;
        }
    }

    if (client && model) {
        const currentOrders = StorageService.getOrders();
        
        const preparedItems: OrderItem[] = items.map(item => ({
            id: item.id || StorageService.generateId(),
            // Generate Internal ID for Items using ITM namespace
            internalId: item.internalId || StorageService.generateInternalId('ITM'), 
            partId: item.partId!,
            partName: item.partName!,
            colorId: item.colorId!,
            colorName: item.colorName!,
            colorCode: item.colorCode!,
            hasDecals: item.hasDecals || false,
            accessoriesDetail: item.accessoriesDetail || '', // NEW
            finishType: item.finishType || 'BRILLANTE',
            // New Workflow Fields
            currentStatus: item.currentStatus || 'PREALISTAMIENTO',
            currentArea: item.currentArea || 'PREALISTAMIENTO',
            assignedEmployeeId: item.assignedEmployeeId,
            history: item.history || [],
            reworkCount: item.reworkCount || 0,
            status: item.status || OrderStatus.IN_PROCESS
        }));

        if (editingOrderId) {
            const existingOrderIndex = currentOrders.findIndex(o => o.id === editingOrderId);
            if (existingOrderIndex !== -1) {
                const updatedOrder: Order = {
                    ...currentOrders[existingOrderIndex],
                    clientId: client.id,
                    clientName: client.name,
                    modelId: model.id,
                    modelName: `${model.brand} ${model.name}`,
                    estimatedDeliveryDate: estimatedDate || undefined,
                    items: preparedItems,
                    specialEditionId,
                    specialEditionName
                };
                currentOrders[existingOrderIndex] = updatedOrder;
                StorageService.saveOrders(currentOrders);
            }
        } else {
            // Generate Order ID using ORD namespace
            const newOrderId = StorageService.generateInternalId('ORD');

            const newOrder: Order = {
                id: newOrderId,
                clientId: client.id,
                clientName: client.name,
                modelId: model.id,
                modelName: `${model.brand} ${model.name}`,
                entryDate: new Date().toISOString(),
                estimatedDeliveryDate: estimatedDate || undefined,
                visualColorHex: generateVisualColor(),
                items: preparedItems,
                specialEditionId,
                specialEditionName
            };
            StorageService.saveOrders([newOrder, ...currentOrders]);
        }
        
        setError(null);
        onSave();
    }
  };

  return (
    <div className="p-6 bg-gray-100 dark:bg-slate-900 min-h-full transition-colors">
      <div id="tour-order-form-header" className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl">
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold flex items-center gap-2"><Bike /> {editingOrderId ? 'Editar Orden' : 'Nuevo Ingreso'}</h2>
          <button onClick={onCancel} className="bg-blue-700 hover:bg-blue-800 p-2 rounded-full"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">
          {error && <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg animate-in fade-in slide-in-from-top-2"><div className="flex items-center"><AlertCircle className="text-red-500 mr-2" size={20} /><p className="text-red-700 dark:text-red-200 font-medium">{error}</p></div></div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cliente <span className="text-red-500">*</span></label><select value={selectedClientId} onChange={e => { setSelectedClientId(e.target.value); setError(null); }} className="block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"><option value="">Seleccione un cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modelo / Edición <span className="text-red-500">*</span></label><select value={modelSelectionValue} onChange={handleModelSelectionChange} className="block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"><option value="">Seleccione...</option>{specialEditions.length > 0 && (<optgroup label="🌟 Ediciones Especiales">{specialEditions.map(se => (<option key={se.id} value={`se_${se.id}`}>{se.name} ({se.modelName})</option>))}</optgroup>)}<optgroup label="🏍️ Modelos Estándar">{models.map(m => (<option key={m.id} value={`std_${m.id}`}>{m.brand} - {m.name}</option>))}</optgroup></select></div>
            <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Entrega (Aprox) <span className="text-red-500">*</span></label>
               <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <Calendar size={16} className="text-gray-900 dark:text-white" />
                 </div>
                 <input 
                    type="date"
                    value={estimatedDate}
                    onChange={(e) => { setEstimatedDate(e.target.value); setError(null); }}
                    className="block w-full pl-10 rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                 />
               </div>
            </div>
          </div>

          <hr className="border-gray-200 dark:border-slate-600" />

          {modelSelectionValue.startsWith('se_') && <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 flex items-center gap-3 mb-2"><Sparkles className="text-indigo-600 dark:text-indigo-400" size={20} /><div><p className="text-sm font-bold text-indigo-800 dark:text-indigo-300">Edición Especial Cargada</p><p className="text-xs text-indigo-600 dark:text-indigo-400">Las piezas, colores y calcomanías se han pre-cargado automáticamente.</p></div></div>}

          <div id="tour-order-form-parts">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Agregar / Editar Piezas</h3>
            <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-3"><label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1">Pieza</label><select value={tempPartId} onChange={e => setTempPartId(e.target.value)} className="block w-full rounded-md border-gray-300 dark:border-slate-500 text-sm p-2 border bg-white dark:bg-slate-600 text-gray-900 dark:text-white"><option value="">Seleccionar...</option>{parts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1">Color</label><select value={tempColorId} onChange={e => setTempColorId(e.target.value)} className="block w-full rounded-md border-gray-300 dark:border-slate-500 text-sm p-2 border bg-white dark:bg-slate-600 text-gray-900 dark:text-white"><option value="">Seleccionar...</option>{colors.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</select></div>
              
              <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1">Acabado</label><select value={tempFinish} onChange={e => setTempFinish(e.target.value as FinishType)} className="block w-full rounded-md border-gray-300 dark:border-slate-500 text-sm p-2 border bg-white dark:bg-slate-600 text-gray-900 dark:text-white"><option value="BRILLANTE">Brillante</option><option value="MATE">Mate</option></select></div>

              <div className="md:col-span-1 flex items-center justify-center h-10"><label className="flex items-center space-x-2 cursor-pointer select-none"><input type="checkbox" checked={tempDecals} onChange={e => setTempDecals(e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" /><span className="text-xs text-gray-700 dark:text-gray-200 leading-tight">Lleva<br/>Calcas</span></label></div>
              
              {/* ACCESSORIES TEXT INPUT */}
              <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1">Detalle Accesorios (Emblemas...)</label>
                  <input 
                    type="text" 
                    value={tempAccessoriesDetail} 
                    onChange={e => setTempAccessoriesDetail(e.target.value)} 
                    placeholder="Ej: Emblema Yamaha Dorado"
                    className="block w-full rounded-md border-gray-300 dark:border-slate-500 text-sm p-2 border bg-white dark:bg-slate-600 text-gray-900 dark:text-white placeholder-gray-400" 
                  />
              </div>

              <div className="md:col-span-2"><button onClick={handleAddItem} disabled={!tempPartId || !tempColorId} className="w-full bg-slate-800 dark:bg-slate-900 text-white p-2 rounded-md hover:bg-slate-900 dark:hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"><Plus size={16} /> Agregar</button></div>
            </div>
          </div>

          <div id="tour-order-form-summary">
             <div className="flex justify-between items-center mb-2"><h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Resumen del Pedido ({items.length} piezas)</h4></div>
             {items.length === 0 ? <p className={`text-sm italic text-center py-4 border-2 border-dashed rounded-lg ${error ? 'border-red-300 bg-red-50 text-red-500' : 'border-gray-300 dark:border-slate-600 text-gray-400'}`}>No hay piezas agregadas aún.</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">Pieza</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">Color</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">Acabado</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">Detalle Accesorios</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">Otros</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-black uppercase">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {items.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-black">{item.partName}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-black">{item.colorName}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-black">{item.finishType}</td>
                                    <td className="px-4 py-2 whitespace-normal text-sm text-black max-w-xs">
                                        {item.accessoriesDetail ? (
                                            <span className="flex items-center gap-1 text-pink-700 font-medium">
                                                <Puzzle size={12} /> {item.accessoriesDetail}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                                        {item.hasDecals && <span className="text-purple-600 text-xs font-semibold">Con Calcas</span>}
                                        {!item.hasDecals && '-'}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleRemoveItem(idx)} className="text-red-600 hover:text-red-900"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             )}
          </div>
          
          <div id="tour-order-form-save" className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-600"><button onClick={onCancel} className="mr-3 px-4 py-2 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-slate-600">Cancelar</button><button onClick={handleSubmit} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md shadow-sm hover:bg-blue-700 flex items-center gap-2"><Save size={18} /> {editingOrderId ? 'Actualizar Orden' : 'Guardar Pedido'}</button></div>
        </div>
      </div>
    </div>
  );
};