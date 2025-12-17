import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Edit2, X, Search, Users, Sparkles, Box, ArrowRight, CheckSquare, Square, Puzzle, MapPin, Truck, Smartphone, Lock, User, Copy, Mail } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Client, MotoModel, Part, ColorDef, Employee, SpecialEdition, SpecialEditionItem, FinishType, EmployeeRole, AreaType, DeliveryType } from '../types';

export const Configuration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CLIENTS' | 'MODELS' | 'PARTS' | 'COLORS' | 'EMPLOYEES' | 'SPECIAL_EDITIONS'>('CLIENTS');
  const [clients, setClients] = useState<Client[]>([]);
  const [models, setModels] = useState<MotoModel[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [colors, setColors] = useState<ColorDef[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [specialEditions, setSpecialEditions] = useState<SpecialEdition[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Client Form
  const [clientForm, setClientForm] = useState<{name: string, phone: string, mobilePhone: string, address: string, city: string, deliveryType: DeliveryType}>({ 
      name: '', phone: '', mobilePhone: '', address: '', city: '', deliveryType: 'RECOGIDA_LOCAL' 
  });

  const [modelForm, setModelForm] = useState({ brand: '', name: '' });
  const [partForm, setPartForm] = useState({ name: '' });
  const [colorForm, setColorForm] = useState({ name: '', code: '' });
  
  // Employee Form (Updated)
  const [employeeForm, setEmployeeForm] = useState<{name: string, role: EmployeeRole, area?: AreaType, username: string, password: string, email: string}>({ 
      name: '', role: 'OPERARIO', area: 'ALISTAMIENTO', username: '', password: '', email: ''
  });
  
  const [seForm, setSeForm] = useState<{name: string, modelId: string}>({ name: '', modelId: '' });
  const [seItems, setSeItems] = useState<SpecialEditionItem[]>([]);
  const [seTempPartId, setSeTempPartId] = useState('');
  const [seTempColorId, setSeTempColorId] = useState('');
  const [seTempDecals, setSeTempDecals] = useState(false);
  const [seTempAccessoriesDetail, setSeTempAccessoriesDetail] = useState(''); 
  const [seTempFinish, setSeTempFinish] = useState<FinishType>('BRILLANTE'); 
  const [sePartSearch, setSePartSearch] = useState('');

  useEffect(() => { refreshData(); }, []);

  const refreshData = () => {
    setClients(StorageService.getClients());
    setModels(StorageService.getModels());
    setParts(StorageService.getParts());
    setColors(StorageService.getColors());
    setEmployees(StorageService.getEmployees());
    setSpecialEditions(StorageService.getSpecialEditions());
  };

  const resetForms = () => {
    setEditingId(null); 
    setClientForm({ name: '', phone: '', mobilePhone: '', address: '', city: '', deliveryType: 'RECOGIDA_LOCAL' }); 
    setModelForm({ brand: '', name: '' }); 
    setPartForm({ name: '' }); 
    setColorForm({ name: '', code: '' }); 
    setEmployeeForm({ name: '', role: 'OPERARIO', area: 'ALISTAMIENTO', username: '', password: '', email: '' }); 
    setSeForm({ name: '', modelId: '' }); 
    setSeItems([]); 
    setSeTempPartId(''); 
    setSeTempColorId(''); 
    setSeTempDecals(false); 
    setSeTempAccessoriesDetail(''); 
    setSeTempFinish('BRILLANTE'); 
    setSePartSearch('');
  };

  const handleTabChange = (tab: typeof activeTab) => { setActiveTab(tab); setSearchTerm(''); resetForms(); };

  function filterList<T extends { id: string; name: string }>(list: T[]): T[] {
    if (!searchTerm) return list;
    const lower = searchTerm.toLowerCase();
    return list.filter(item => { const i = item as any; return (i.name.toLowerCase().includes(lower) || (i.brand && i.brand.toLowerCase().includes(lower)) || (i.code && i.code.toLowerCase().includes(lower))); });
  }

  // ... (Client, Model, Part, Color handlers omitted for brevity, identical to previous version) ...
  const handleSaveClient = () => { if (!clientForm.name) return; let updated; if (editingId) { updated = clients.map(c => c.id === editingId ? { ...c, ...clientForm } : c); } else { updated = [...clients, { ...clientForm, id: StorageService.generateId() }]; } StorageService.saveClients(updated); setClients(updated); resetForms(); };
  const handleEditClient = (item: Client) => { setEditingId(item.id); setClientForm({ name: item.name, phone: item.phone, mobilePhone: item.mobilePhone || '', address: item.address || '', city: item.city || '', deliveryType: item.deliveryType || 'RECOGIDA_LOCAL' }); };
  const handleDeleteClient = (id: string) => { if (confirm('¿Eliminar este cliente?')) { const updated = clients.filter(c => c.id !== id); StorageService.saveClients(updated); setClients(updated); if (editingId === id) resetForms(); } };

  const handleSaveModel = () => { if (!modelForm.name) return; let updated; if (editingId) { updated = models.map(m => m.id === editingId ? { ...m, ...modelForm } : m); } else { updated = [...models, { ...modelForm, id: StorageService.generateId() }]; } StorageService.saveModels(updated); setModels(updated); resetForms(); };
  const handleEditModel = (item: MotoModel) => { setEditingId(item.id); setModelForm({ brand: item.brand, name: item.name }); };
  const handleDeleteModel = (id: string) => { if (confirm('¿Eliminar este modelo?')) { const updated = models.filter(m => m.id !== id); StorageService.saveModels(updated); setModels(updated); if (editingId === id) resetForms(); } };

  const handleSavePart = () => { if (!partForm.name) return; let updated; if (editingId) { updated = parts.map(p => p.id === editingId ? { ...p, ...partForm } : p); } else { updated = [...parts, { ...partForm, id: StorageService.generateId() }]; } StorageService.saveParts(updated); setParts(updated); resetForms(); };
  const handleEditPart = (item: Part) => { setEditingId(item.id); setPartForm({ name: item.name }); };
  const handleDeletePart = (id: string) => { if (confirm('¿Eliminar esta pieza maestra?')) { const updated = parts.filter(p => p.id !== id); StorageService.saveParts(updated); setParts(updated); if (editingId === id) resetForms(); } };

  const handleSaveColor = () => { if (!colorForm.name) return; let updated; if (editingId) { updated = colors.map(c => c.id === editingId ? { ...c, ...colorForm } : c); } else { updated = [...colors, { ...colorForm, id: StorageService.generateId() }]; } StorageService.saveColors(updated); setColors(updated); resetForms(); };
  const handleEditColor = (item: ColorDef) => { setEditingId(item.id); setColorForm({ name: item.name, code: item.code }); };
  const handleDeleteColor = (id: string) => { if (confirm('¿Eliminar este color maestro?')) { const updated = colors.filter(c => c.id !== id); StorageService.saveColors(updated); setColors(updated); if (editingId === id) resetForms(); } };

  const handleSaveEmployee = () => { 
    if (!employeeForm.name || !employeeForm.username) return; 
    const employeeData: Employee = {
        id: editingId || StorageService.generateId(),
        name: employeeForm.name,
        role: employeeForm.role,
        area: employeeForm.role === 'LIDER' ? employeeForm.area : undefined, // Area only required for Leader logic in UI, but keep for reference
        username: employeeForm.username,
        password: employeeForm.password,
        email: employeeForm.email || undefined
    };

    let updated; 
    if (editingId) { updated = employees.map(e => e.id === editingId ? employeeData : e); } 
    else { updated = [...employees, employeeData]; } 
    
    StorageService.saveEmployees(updated); 
    setEmployees(updated); 
    resetForms(); 
  };
  
  const handleEditEmployee = (item: Employee) => { 
      setEditingId(item.id); 
      setEmployeeForm({ 
          name: item.name, 
          role: item.role, 
          area: item.area || 'ALISTAMIENTO', 
          username: item.username || '', 
          password: item.password || '',
          email: item.email || ''
      }); 
  };
  const handleDeleteEmployee = (id: string) => { if (confirm('¿Eliminar este empleado?')) { const updated = employees.filter(e => e.id !== id); StorageService.saveEmployees(updated); setEmployees(updated); if (editingId === id) resetForms(); } };

  const handleAddSeItem = () => { 
      if (!seTempPartId) return; 
      const part = parts.find(p => p.id === seTempPartId); 
      const color = colors.find(c => c.id === seTempColorId); 
      if (part) { 
          if (seItems.some(i => i.partId === part.id)) { alert("Esta pieza ya está en la lista."); return; } 
          setSeItems([...seItems, { partId: part.id, partName: part.name, defaultColorId: color?.id, defaultColorName: color?.name, defaultColorCode: color?.code, hasDecals: seTempDecals, accessoriesDetail: seTempAccessoriesDetail, defaultFinish: seTempFinish }]); 
          setSeTempPartId(''); setSeTempColorId(''); setSeTempDecals(false); setSeTempAccessoriesDetail(''); setSeTempFinish('BRILLANTE'); setSePartSearch(''); 
      } 
  };
  const handleRemoveSeItem = (idx: number) => { const newItems = [...seItems]; newItems.splice(idx, 1); setSeItems(newItems); };
  const handleSaveSe = () => { if (!seForm.name || !seForm.modelId || seItems.length === 0) { alert("Debe asignar nombre, modelo y al menos una pieza."); return; } const model = models.find(m => m.id === seForm.modelId); if (!model) return; const newEdition: SpecialEdition = { id: editingId || StorageService.generateId(), name: seForm.name, modelId: model.id, modelName: `${model.brand} ${model.name}`, items: seItems }; let updated; if (editingId) { updated = specialEditions.map(se => se.id === editingId ? newEdition : se); } else { updated = [...specialEditions, newEdition]; } StorageService.saveSpecialEditions(updated); setSpecialEditions(updated); resetForms(); };
  const handleEditSe = (se: SpecialEdition) => { setEditingId(se.id); setSeForm({ name: se.name, modelId: se.modelId }); setSeItems(se.items); };
  const handleDeleteSe = (id: string) => { if(confirm("¿Eliminar esta edición especial?")) { const updated = specialEditions.filter(se => se.id !== id); StorageService.saveSpecialEditions(updated); setSpecialEditions(updated); if (editingId === id) resetForms(); } };
  
  // New Duplicate Handler
  const handleDuplicateSe = (se: SpecialEdition) => {
    setEditingId(null); // Ensure we are creating new
    setSeForm({
        name: `${se.name} (Copia)`,
        modelId: se.modelId
    });
    // Deep copy items to avoid reference issues
    setSeItems(se.items.map(item => ({...item})));
    // Scroll to top to show form
    const formElement = document.getElementById('se-form-container');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredPartsForSe = parts.filter(p => p.name.toLowerCase().includes(sePartSearch.toLowerCase()));

  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon?: any }) => (
    <button onClick={() => handleTabChange(id)} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>{Icon && <Icon size={14} />}{label}</button>
  );
  const ActionButtons = ({ isEditing, onSave, onCancel }: { isEditing: boolean, onSave: () => void, onCancel: () => void }) => (
    <div className="flex gap-2"><button onClick={onSave} className={`px-4 py-2 rounded-md text-white flex items-center transition-colors ${isEditing ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>{isEditing ? <Save size={16} className="mr-2" /> : <Plus size={16} className="mr-2" />}{isEditing ? 'Actualizar' : 'Agregar'}</button>{isEditing && (<button onClick={onCancel} className="px-3 py-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-white rounded-md hover:bg-gray-300"><X size={16} /></button>)}</div>
  );

  return (
    <div className="p-6 bg-gray-100 dark:bg-slate-900 min-h-full transition-colors">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Configuración de Maestras</h2>
      <div id="tour-config-tabs" className="flex border-b border-gray-200 dark:border-slate-700 mb-6 overflow-x-auto">
        <TabButton id="CLIENTS" label="Clientes" />
        <TabButton id="MODELS" label="Modelos Moto" />
        <TabButton id="PARTS" label="Piezas" />
        <TabButton id="COLORS" label="Colores" />
        <TabButton id="EMPLOYEES" label="Usuarios / Empleados" />
        <TabButton id="SPECIAL_EDITIONS" label="Ediciones Esp." icon={Sparkles} />
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl">
        <div id="tour-config-search" className="mb-6 relative"><Search className="absolute left-3 top-2.5 text-gray-400" size={18} /><input type="text" placeholder={`Buscar en ${activeTab.toLowerCase().replace('_', ' ')}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" /></div>

        {activeTab === 'CLIENTS' && (
          <div id="tour-config-content" className="bg-gray-50 dark:bg-slate-900/30 p-5 rounded-xl border border-gray-100 dark:border-slate-700">
            <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 mb-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                {/* Client Form inputs ... (Same as before) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre</label><input type="text" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} className="block w-full rounded-md border-gray-300 dark:border-slate-500 p-2 border bg-white dark:bg-slate-600 dark:text-white" /></div>
                    <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Teléfono</label><input type="text" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} className="block w-full rounded-md border-gray-300 dark:border-slate-500 p-2 border bg-white dark:bg-slate-600 dark:text-white" /></div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Teléfono Móvil</label>
                        <div className="relative"><Smartphone className="absolute left-2 top-2.5 text-gray-400" size={14}/><input type="text" value={clientForm.mobilePhone} onChange={e => { const val = e.target.value; if (/^\d*$/.test(val)) setClientForm({ ...clientForm, mobilePhone: val }); }} className="block w-full pl-8 rounded-md border-gray-300 dark:border-slate-500 p-2 border bg-white dark:bg-slate-600 dark:text-white" placeholder="Solo números" /></div>
                    </div>
                    <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dirección</label><div className="relative"><MapPin className="absolute left-2 top-2.5 text-gray-400" size={14}/><input type="text" value={clientForm.address} onChange={e => setClientForm({ ...clientForm, address: e.target.value })} className="block w-full pl-8 rounded-md border-gray-300 dark:border-slate-500 p-2 border bg-white dark:bg-slate-600 dark:text-white" /></div></div>
                    <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ciudad</label><input type="text" value={clientForm.city} onChange={e => setClientForm({ ...clientForm, city: e.target.value })} className="block w-full rounded-md border-gray-300 dark:border-slate-500 p-2 border bg-white dark:bg-slate-600 dark:text-white" /></div>
                    <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tipo de Entrega</label><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{['RECOGIDA_LOCAL', 'ENTREGA_LOCAL', 'ENVIO_NACIONAL', 'ENVIO_INTERNACIONAL'].map((type) => (<button key={type} onClick={() => setClientForm({...clientForm, deliveryType: type as DeliveryType})} className={`text-xs p-2 rounded border flex items-center justify-center gap-1 ${clientForm.deliveryType === type ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white dark:bg-slate-600 border-gray-300 dark:border-slate-500 text-gray-600 dark:text-gray-300'}`}>{type.replace('_', ' ')}</button>))}</div></div>
                </div>
                <ActionButtons isEditing={!!editingId} onSave={handleSaveClient} onCancel={resetForms} />
            </div>
            {/* Table... (Same as before) */}
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600"><thead className="bg-gray-100 dark:bg-slate-700"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nombre</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Contacto</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th></tr></thead><tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-600">{filterList<Client>(clients).map(c => (<tr key={c.id} className={editingId === c.id ? 'bg-amber-50 dark:bg-slate-600' : ''}><td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{c.name}</td><td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{c.phone} {c.mobilePhone ? `/ ${c.mobilePhone}` : ''}</td><td className="px-6 py-4 text-right"><button onClick={() => handleEditClient(c)} className="text-indigo-600 mr-4"><Edit2 size={18} /></button><button onClick={() => handleDeleteClient(c.id)} className="text-red-500"><Trash2 size={18} /></button></td></tr>))}</tbody></table></div></div>
          </div>
        )}

        {/* Models, Parts, Colors tabs omitted for brevity, they are unchanged logic-wise */}
        {activeTab === 'MODELS' && (
          <div id="tour-config-content">
            {/* Same logic as previous version */}
            <div className="flex gap-4 mb-6 items-end bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-100 dark:border-slate-600"><div className="flex-1"><label className="block text-sm text-gray-700 dark:text-gray-200">Marca</label><input type="text" value={modelForm.brand} onChange={e => setModelForm({ ...modelForm, brand: e.target.value })} className="w-full rounded border p-2 bg-white dark:bg-slate-600 dark:text-white" /></div><div className="flex-1"><label className="block text-sm text-gray-700 dark:text-gray-200">Modelo</label><input type="text" value={modelForm.name} onChange={e => setModelForm({ ...modelForm, name: e.target.value })} className="w-full rounded border p-2 bg-white dark:bg-slate-600 dark:text-white" /></div><ActionButtons isEditing={!!editingId} onSave={handleSaveModel} onCancel={resetForms} /></div>
            <div className="overflow-hidden rounded border border-gray-200 dark:border-slate-600"><div className="max-h-[500px] overflow-y-auto"><table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600"><thead className="bg-gray-50 dark:bg-slate-700"><tr><th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Marca</th><th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Modelo</th><th className="px-6 py-3 text-right text-xs text-gray-500 dark:text-gray-300 uppercase">Acciones</th></tr></thead><tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-600">{filterList<MotoModel>(models).map(m => <tr key={m.id}><td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{m.brand}</td><td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{m.name}</td><td className="px-6 py-4 text-right"><button onClick={() => handleEditModel(m)} className="text-indigo-600 mr-4"><Edit2 size={18}/></button><button onClick={() => handleDeleteModel(m.id)} className="text-red-500"><Trash2 size={18}/></button></td></tr>)}</tbody></table></div></div>
          </div>
        )}
        {activeTab === 'PARTS' && (
          <div id="tour-config-content">
              {/* Same logic */}
             <div className="flex gap-4 mb-6 items-end bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-100 dark:border-slate-600"><div className="flex-1"><label className="block text-sm text-gray-700 dark:text-gray-200">Nombre Pieza</label><input type="text" value={partForm.name} onChange={e => setPartForm({ ...partForm, name: e.target.value })} className="w-full rounded border p-2 bg-white dark:bg-slate-600 dark:text-white" /></div><ActionButtons isEditing={!!editingId} onSave={handleSavePart} onCancel={resetForms} /></div>
             <div className="overflow-hidden rounded border border-gray-200 dark:border-slate-600"><div className="max-h-[500px] overflow-y-auto"><table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600"><thead className="bg-gray-50 dark:bg-slate-700"><tr><th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Pieza</th><th className="px-6 py-3 text-right text-xs text-gray-500 dark:text-gray-300 uppercase">Acciones</th></tr></thead><tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-600">{filterList<Part>(parts).map(p => <tr key={p.id}><td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{p.name}</td><td className="px-6 py-4 text-right"><button onClick={() => handleEditPart(p)} className="text-indigo-600 mr-4"><Edit2 size={18}/></button><button onClick={() => handleDeletePart(p.id)} className="text-red-500"><Trash2 size={18}/></button></td></tr>)}</tbody></table></div></div>
          </div>
        )}
        {activeTab === 'COLORS' && (
          <div id="tour-config-content">
               {/* Same logic */}
               <div className="flex gap-4 mb-6 items-end bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-100 dark:border-slate-600"><div className="flex-1"><label className="block text-sm text-gray-700 dark:text-gray-200">Nombre</label><input type="text" value={colorForm.name} onChange={e => setColorForm({ ...colorForm, name: e.target.value })} className="w-full rounded border p-2 bg-white dark:bg-slate-600 dark:text-white" /></div><div className="w-32"><label className="block text-sm text-gray-700 dark:text-gray-200">Código</label><input type="text" value={colorForm.code} onChange={e => setColorForm({ ...colorForm, code: e.target.value })} className="w-full rounded border p-2 bg-white dark:bg-slate-600 dark:text-white" /></div><ActionButtons isEditing={!!editingId} onSave={handleSaveColor} onCancel={resetForms} /></div>
               <div className="overflow-hidden rounded border border-gray-200 dark:border-slate-600"><div className="max-h-[500px] overflow-y-auto"><table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600"><thead className="bg-gray-50 dark:bg-slate-700"><tr><th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Cód</th><th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">Nombre</th><th className="px-6 py-3 text-right text-xs text-gray-500 dark:text-gray-300 uppercase">Acciones</th></tr></thead><tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-600">{filterList<ColorDef>(colors).map(c => <tr key={c.id}><td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">{c.code}</td><td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{c.name}</td><td className="px-6 py-4 text-right"><button onClick={() => handleEditColor(c)} className="text-indigo-600 mr-4"><Edit2 size={18}/></button><button onClick={() => handleDeleteColor(c.id)} className="text-red-500"><Trash2 size={18}/></button></td></tr>)}</tbody></table></div></div>
          </div>
        )}

        {/* EMPLOYEES TAB (UPDATED WITH CREDENTIALS AND EMAIL) */}
        {activeTab === 'EMPLOYEES' && (
          <div id="tour-config-content">
            <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-100 dark:border-slate-600 mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="col-span-1 md:col-span-2 lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Nombre Completo</label>
                    <input type="text" value={employeeForm.name} onChange={e => setEmployeeForm({ ...employeeForm, name: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-500 shadow-sm p-2 border bg-white dark:bg-slate-600 dark:text-white" />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Rol</label>
                    <select value={employeeForm.role} onChange={e => setEmployeeForm({ ...employeeForm, role: e.target.value as EmployeeRole })} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-500 shadow-sm p-2 border bg-white dark:bg-slate-600 dark:text-white">
                        <option value="OPERARIO">Operario</option>
                        <option value="LIDER">Líder de Área</option>
                        <option value="RECEPCION">Recepción</option>
                        <option value="MENSAJERO">Mensajero</option>
                        <option value="ADMIN">Administrador</option>
                    </select>
                </div>

                {employeeForm.role === 'LIDER' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Área Responsable</label>
                        <select value={employeeForm.area} onChange={e => setEmployeeForm({ ...employeeForm, area: e.target.value as AreaType })} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-500 shadow-sm p-2 border bg-white dark:bg-slate-600 dark:text-white">
                            <option value="PREALISTAMIENTO">Pre-Alistamiento</option>
                            <option value="ALISTAMIENTO">Alistamiento</option>
                            <option value="PINTURA">Pintura</option>
                            <option value="PULIDO">Pulido</option>
                            <option value="DESPACHOS">Despachos</option>
                            <option value="ENTREGAS">Entregas</option>
                        </select>
                    </div>
                )}
                
                {/* Credentials Section */}
                <div className="col-span-1 md:col-span-2 lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Usuario (Login)</label>
                    <div className="relative">
                        <User className="absolute left-2 top-2.5 text-gray-400" size={14}/>
                        <input type="text" value={employeeForm.username} onChange={e => setEmployeeForm({ ...employeeForm, username: e.target.value })} className="mt-1 block w-full pl-8 rounded-md border-gray-300 dark:border-slate-500 shadow-sm p-2 border bg-white dark:bg-slate-600 dark:text-white" placeholder="usuario123" />
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2 lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Contraseña</label>
                    <div className="relative">
                        <Lock className="absolute left-2 top-2.5 text-gray-400" size={14}/>
                        <input type="text" value={employeeForm.password} onChange={e => setEmployeeForm({ ...employeeForm, password: e.target.value })} className="mt-1 block w-full pl-8 rounded-md border-gray-300 dark:border-slate-500 shadow-sm p-2 border bg-white dark:bg-slate-600 dark:text-white" placeholder="******" />
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Correo Electrónico (Recuperación)</label>
                    <div className="relative">
                        <Mail className="absolute left-2 top-2.5 text-gray-400" size={14}/>
                        <input type="email" value={employeeForm.email} onChange={e => setEmployeeForm({ ...employeeForm, email: e.target.value })} className="mt-1 block w-full pl-8 rounded-md border-gray-300 dark:border-slate-500 shadow-sm p-2 border bg-white dark:bg-slate-600 dark:text-white" placeholder="ejemplo@motopaint.com" />
                    </div>
                </div>

                <div className="w-full flex items-end h-[42px] justify-end">
                    <ActionButtons isEditing={!!editingId} onSave={handleSaveEmployee} onCancel={resetForms} />
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-600"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600"><thead className="bg-gray-50 dark:bg-slate-700"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rol</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Detalles Cuenta</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th></tr></thead><tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-600">{filterList<Employee>(employees).map(e => (<tr key={e.id} className={editingId === e.id ? 'bg-amber-50 dark:bg-slate-600' : ''}><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{e.name}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"><span className={`px-2 py-1 rounded text-xs font-semibold ${e.role === 'LIDER' ? 'bg-purple-100 text-purple-800' : e.role === 'ADMIN' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{e.role}</span></td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"><div>{e.area || '-'}</div><div className="text-xs text-gray-400 mt-1">user: {e.username}</div>{e.email && <div className="text-xs text-blue-400 flex items-center gap-1 mt-0.5"><Mail size={10}/> {e.email}</div>}</td><td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => handleEditEmployee(e)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"><Edit2 size={18} /></button><button onClick={() => handleDeleteEmployee(e.id)} className="text-red-500 hover:text-red-700 dark:text-red-400"><Trash2 size={18} /></button></td></tr>))}</tbody></table></div></div>
          </div>
        )}

        {/* Special Editions Tab (Unchanged logic) */}
        {activeTab === 'SPECIAL_EDITIONS' && (
           <div id="tour-config-content">
               {/* Same form and list as before */}
               <div id="se-form-container" className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-100 dark:border-slate-600 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">{editingId ? 'Editar Edición Especial' : 'Nueva Edición Especial'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nombre de la Edición</label><input type="text" placeholder="Ej: Kit Carbono Full" value={seForm.name} onChange={e => setSeForm({...seForm, name: e.target.value})} className="w-full rounded-md border-gray-300 dark:border-slate-500 p-2 border bg-white dark:bg-slate-600 dark:text-white" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Modelo de Moto</label><select value={seForm.modelId} onChange={e => { setSeForm({...seForm, modelId: e.target.value}); }} className="w-full rounded-md border-gray-300 dark:border-slate-500 p-2 border bg-white dark:bg-slate-600 dark:text-white"><option value="">-- Seleccionar Modelo --</option>{models.map(m => (<option key={m.id} value={m.id}>{m.brand} - {m.name}</option>))}</select></div></div>
                <div className="border-t border-gray-200 dark:border-slate-600 pt-4">
                     {/* ... Items selection ... */}
                     <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Piezas Incluidas:</p>
                     <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-2 items-end">
                        <div className="col-span-1 md:col-span-2"><label className="block text-xs text-gray-500 mb-1">Buscar Pieza</label><div className="relative"><Search className="absolute left-2 top-2 text-gray-400" size={14} /><input type="text" value={sePartSearch} onChange={(e) => setSePartSearch(e.target.value)} placeholder="Escribe para filtrar piezas..." className="w-full pl-8 rounded-md border-gray-300 dark:border-slate-500 p-1.5 border text-sm bg-white dark:bg-slate-600 dark:text-white" /></div></div>
                        <div className="col-span-1 md:col-span-1"><label className="block text-xs text-gray-500 mb-1">Seleccionar</label><select value={seTempPartId} onChange={e => setSeTempPartId(e.target.value)} className="w-full rounded-md border-gray-300 dark:border-slate-500 p-1.5 border text-sm bg-white dark:bg-slate-600 dark:text-white h-[34px]"><option value="">-- {sePartSearch ? `Resultados (${filteredPartsForSe.length})` : 'Todas las Piezas'} --</option>{filteredPartsForSe.slice(0, 100).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                        <div className="col-span-1 md:col-span-1"><label className="block text-xs text-gray-500 mb-1">Color (Opcional)</label><select value={seTempColorId} onChange={e => setSeTempColorId(e.target.value)} className="w-full rounded-md border-gray-300 dark:border-slate-500 p-1.5 border text-sm bg-white dark:bg-slate-600 dark:text-white h-[34px]"><option value="">-- Ninguno --</option>{colors.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</select></div>
                        <div className="col-span-1 md:col-span-1"><label className="block text-xs text-gray-500 mb-1">Acabado</label><select value={seTempFinish} onChange={e => setSeTempFinish(e.target.value as FinishType)} className="w-full rounded-md border-gray-300 dark:border-slate-500 p-1.5 border text-sm bg-white dark:bg-slate-600 dark:text-white h-[34px]"><option value="BRILLANTE">Brillante</option><option value="MATE">Mate</option></select></div>
                        <div className="col-span-1 md:col-span-1 flex items-center gap-1 h-[34px] px-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded-md cursor-pointer" onClick={() => setSeTempDecals(!seTempDecals)}>{seTempDecals ? <CheckSquare size={16} className="text-blue-600 dark:text-blue-400"/> : <Square size={16} className="text-gray-400"/>}<span className="text-xs text-gray-600 dark:text-gray-300 select-none">Calcas</span></div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-2 items-end">
                        <div className="col-span-1 md:col-span-5"><label className="block text-xs text-gray-500 mb-1">Detalle Accesorios (Emblemas...)</label><input type="text" value={seTempAccessoriesDetail} onChange={(e) => setSeTempAccessoriesDetail(e.target.value)} placeholder="Ej: Emblema Cromado" className="w-full rounded-md border-gray-300 dark:border-slate-500 p-1.5 border text-sm bg-white dark:bg-slate-600 dark:text-white"/></div>
                        <div className="col-span-1 md:col-span-1"><button onClick={handleAddSeItem} disabled={!seTempPartId} className="w-full bg-slate-600 text-white px-3 py-1.5 rounded text-sm hover:bg-slate-700 disabled:opacity-50 h-[34px] flex items-center justify-center"><Plus size={16} /></button></div>
                     </div>
                     {seItems.length > 0 ? (<div className="bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-600 overflow-hidden"><table className="min-w-full text-sm"><thead className="bg-gray-50 dark:bg-slate-700 text-xs text-gray-500"><tr><th className="px-3 py-2 text-left">Pieza</th><th className="px-3 py-2 text-left">Color</th><th className="px-3 py-2 text-left">Acabado</th><th className="px-3 py-2 text-left">Accesorios</th><th className="px-3 py-2 text-left">Extras</th><th className="px-3 py-2 text-right"></th></tr></thead><tbody>{seItems.map((item, idx) => (<tr key={idx} className="border-b border-gray-100 dark:border-slate-700 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-700"><td className="px-3 py-2 text-gray-800 dark:text-gray-200">{item.partName}</td><td className="px-3 py-2 text-gray-500 dark:text-gray-400">{item.defaultColorCode || '-'}</td><td className="px-3 py-2 text-gray-500 dark:text-gray-400">{item.defaultFinish || 'BRILLANTE'}</td><td className="px-3 py-2 text-gray-500 dark:text-gray-400">{item.accessoriesDetail || '-'}</td><td className="px-3 py-2 text-gray-500 dark:text-gray-400 flex gap-1">{item.hasDecals && <span className="text-xs text-purple-500 font-bold">Calcas</span>}</td><td className="px-3 py-2 text-right"><button onClick={() => handleRemoveSeItem(idx)} className="text-red-500 hover:text-red-700"><X size={14} /></button></td></tr>))}</tbody></table></div>) : <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded text-gray-400 text-sm">Agrega piezas usando el formulario de arriba</div>}
                </div>
                <div className="flex justify-end pt-4"><ActionButtons isEditing={!!editingId} onSave={handleSaveSe} onCancel={resetForms} /></div>
            </div>
            <div id="tour-config-editions" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 {filterList<SpecialEdition>(specialEditions).map(se => (
                     <div key={se.id} className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"><div className="flex justify-between items-start mb-3"><div><h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-lg"><Sparkles size={18} className="text-amber-500"/> {se.name}</h4><p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1"><Box size={14} /> {se.modelName}</p></div>
                     <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDuplicateSe(se)} className="p-2 text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-md" title="Duplicar"><Copy size={16} /></button>
                        <button onClick={() => handleEditSe(se)} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteSe(se.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-md"><Trash2 size={16} /></button>
                     </div></div><div className="bg-gray-50 dark:bg-slate-700/50 rounded-md p-3"><p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">{se.items.length} Piezas Incluidas</p><div className="flex flex-wrap gap-1.5">{se.items.slice(0, 8).map((i, idx) => (<span key={idx} className={`text-[11px] px-2 py-1 rounded border shadow-sm flex items-center gap-1 ${i.hasDecals ? 'bg-purple-50 text-purple-700 border-purple-200' : (i.accessoriesDetail ? 'bg-pink-50 text-pink-700 border-pink-200' : 'bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-500')}`}>{i.partName}{i.hasDecals && <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>}{i.accessoriesDetail && <Puzzle size={8} className="text-pink-500" />}</span>))}{se.items.length > 8 && <span className="text-[11px] px-2 py-1 bg-blue-50 text-blue-600 rounded font-medium">+{se.items.length - 8} más</span>}</div></div></div>
                 ))}
            </div>
           </div> 
        )}
      </div>
    </div>
  );
};