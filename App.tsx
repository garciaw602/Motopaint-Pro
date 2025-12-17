
import React, { useState, useEffect } from 'react';
import { ViewState, AreaType, Employee } from './types';
import { LayoutDashboard, PlusCircle, List, Settings, Menu, X, Moon, Sun, Users, ClipboardCheck, Paintbrush, HelpCircle, Hammer, Truck, ChevronDown, ChevronRight, PenTool, MapPin, Package, ScanLine, Bell, Radar, FileText, LogOut, ClipboardList } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { OrderForm } from './components/OrderForm';
import { OrderList } from './components/OrderList';
import { Configuration } from './components/Configuration';
import { AreaLeader } from './components/AreaLeader';
import { AreaOperator } from './components/AreaOperator';
import { MyTasks } from './components/MyTasks';
import { Tracker } from './components/Tracker';
import { Reports } from './components/Reports';
import { TourGuide, TourStep } from './components/TourGuide';
import { StorageService } from './services/storageService';
import { Login } from './components/Login';

// Tour Definitions
const TOURS: Record<string, TourStep[]> = {
  DASHBOARD: [
    { target: 'tour-dashboard-cards', title: 'Métricas Clave', content: 'Resumen instantáneo de motos activas y piezas.' },
    { target: 'tour-dashboard-chart', title: 'Gráficos de Rendimiento', content: 'Visualiza el volumen de trabajo por cliente.' },
    { target: 'tour-dashboard-ai', title: 'Asistente IA', content: 'Obtén recomendaciones inteligentes sobre tu carga de trabajo.' },
  ],
  NEW_ORDER: [
    { target: 'tour-order-form-header', title: 'Datos Principales', content: 'Selecciona cliente, moto y fecha estimada.' },
    { target: 'tour-order-form-parts', title: 'Agregar Piezas', content: 'Añade piezas individualmente o usa ediciones especiales.' },
    { target: 'tour-order-form-summary', title: 'Resumen', content: 'Revisa las piezas antes de guardar.' },
    { target: 'tour-order-form-save', title: 'Guardar', content: 'Finaliza el ingreso de la moto.' },
  ],
  ORDERS_LIST: [
    { target: 'tour-orders-filters', title: 'Filtros', content: 'Encuentra órdenes por cliente, modelo o estado.' },
    { target: 'tour-orders-card', title: 'Tarjeta de Orden', content: 'Detalles de la orden, piezas y progreso visual.' },
    { target: 'tour-orders-actions', title: 'Acciones', content: 'Edita o elimina órdenes (con permisos).' },
  ],
  CONFIGURATION: [
    { target: 'tour-config-tabs', title: 'Categorías', content: 'Navega entre las diferentes bases de datos: Clientes, Modelos, Piezas, Colores y Empleados.' },
    { target: 'tour-config-search', title: 'Búsqueda Global', content: 'Utiliza este campo para filtrar rápidamente cualquier registro en la categoría activa.' },
    { target: 'tour-config-content', title: 'Formularios y Listas', content: 'Aquí podrás crear nuevos registros, editar la información existente o eliminar datos obsoletos.' },
  ],
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);
  
  // Notification & Counter State
  const [areaCounts, setAreaCounts] = useState<Record<AreaType, { revision: number, pending: number }>>({
      PREALISTAMIENTO: { revision: 0, pending: 0 },
      ALISTAMIENTO: { revision: 0, pending: 0 },
      PINTURA: { revision: 0, pending: 0 },
      PULIDO: { revision: 0, pending: 0 },
      DESPACHOS: { revision: 0, pending: 0 },
      ENTREGAS: { revision: 0, pending: 0 }
  });

  const [userTaskCounts, setUserTaskCounts] = useState<Record<AreaType, number>>({
      PREALISTAMIENTO: 0,
      ALISTAMIENTO: 0,
      PINTURA: 0,
      PULIDO: 0,
      DESPACHOS: 0,
      ENTREGAS: 0
  });

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'PREALISTAMIENTO': false,
    'ALISTAMIENTO': false,
    'PINTURA': false,
    'PULIDO': false,
    'DESPACHOS': false,
    'ENTREGAS': false,
    'SISTEMA': false,
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('motopaint_theme');
    if (saved === 'light') return false;
    return true; 
  });

  // Auth Effect
  useEffect(() => {
    const storedUser = localStorage.getItem('motopaint_user');
    if (storedUser) {
        const user: Employee = JSON.parse(storedUser);
        setCurrentUser(user);
        // If restoring session and on dashboard but not admin, redirect
        if (user.role !== 'ADMIN') {
            setView('MY_TASKS');
        }
    }
  }, []);

  // Poll for data updates
  useEffect(() => {
      const updateCounts = () => {
          setAreaCounts(StorageService.getLeaderAttentionCounts());
          if (currentUser) {
              setUserTaskCounts(StorageService.getUserPendingCounts(currentUser.id));
          }
      };
      
      updateCounts(); // Initial load

      const handleDataUpdate = () => updateCounts();
      window.addEventListener('motopaint_data_updated', handleDataUpdate);
      const interval = setInterval(updateCounts, 4000);

      return () => {
          window.removeEventListener('motopaint_data_updated', handleDataUpdate);
          clearInterval(interval);
      };
  }, [currentUser]);

  // Theme Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('motopaint_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('motopaint_theme', 'light');
    }
  }, [isDarkMode]);

  // View expansion logic
  useEffect(() => {
    // Map view to group ID
    const groupMap: Partial<Record<ViewState, string>> = {
        'AREA_PREALISTAMIENTO_LEADER': 'PREALISTAMIENTO', 'AREA_PREALISTAMIENTO_OPERATOR': 'PREALISTAMIENTO',
        'AREA_ALISTAMIENTO_LEADER': 'ALISTAMIENTO', 'AREA_ALISTAMIENTO_OPERATOR': 'ALISTAMIENTO',
        'AREA_PINTURA_LEADER': 'PINTURA', 'AREA_PINTURA_OPERATOR': 'PINTURA',
        'AREA_PULIDO_LEADER': 'PULIDO', 'AREA_PULIDO_OPERATOR': 'PULIDO',
        'AREA_DESPACHOS_LEADER': 'DESPACHOS', 'AREA_DESPACHOS_OPERATOR': 'DESPACHOS',
        'AREA_ENTREGAS_LEADER': 'ENTREGAS', 'AREA_ENTREGAS_OPERATOR': 'ENTREGAS',
        'CONFIGURATION': 'SISTEMA'
    };
    const group = groupMap[view];
    if (group) setExpandedGroups(prev => ({ ...prev, [group]: true }));
  }, [view]);

  const handleLogin = (user: Employee) => {
      setCurrentUser(user);
      localStorage.setItem('motopaint_user', JSON.stringify(user));
      // Redirect based on role
      if (user.role === 'ADMIN') {
          setView('DASHBOARD');
      } else {
          setView('MY_TASKS');
      }
  };

  const handleLogout = () => {
      setCurrentUser(null);
      localStorage.removeItem('motopaint_user');
      setView('DASHBOARD');
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // --- PERMISSIONS LOGIC ---
  const canAccess = (feature: string, area?: AreaType): boolean => {
      if (!currentUser) return false;
      const role = currentUser.role;

      // Admin has full access
      if (role === 'ADMIN') return true;

      // Common Views
      if (['ORDERS_LIST', 'TRACKER', 'MY_TASKS'].includes(feature)) return true;

      // DASHBOARD IS NOW ADMIN ONLY
      if (feature === 'DASHBOARD') {
          // Fix: role cannot be ADMIN here because of the early return above
          return false;
      }

      if (feature === 'NEW_ORDER') {
          return role === 'RECEPCION' || role === 'MENSAJERO';
      }

      if (feature === 'REPORTS') {
          return role === 'LIDER';
      }
      
      if (feature === 'CONFIGURATION') {
          // Only Admin can configure
          return false;
      }

      // Leader Areas
      if (feature === 'LEADER_VIEW' && area) {
          // A Leader can access their OWN area
          return role === 'LIDER' && currentUser.area === area;
      }

      // Operator Views
      if (feature === 'OPERATOR_VIEW') {
          // Leaders are also operators (can see any task assigned to them, so allow access to operator views)
          if (role === 'LIDER') return true;
          // Operators can see any operator view to find tasks assigned to them across areas
          if (role === 'OPERARIO') return true;
          return false;
      }

      return false;
  };

  if (!currentUser) {
      return <Login onLogin={handleLogin} />;
  }

  const NavItem = ({ target, icon: Icon, label, isChild = false, badge = 0 }: { target: ViewState, icon: any, label: string, isChild?: boolean, badge?: number }) => (
    <button
      onClick={() => {
        setView(target);
        setEditingOrderId(null);
        setIsMobileMenuOpen(false);
        setIsTourOpen(false); 
      }}
      className={`w-full flex items-center justify-between space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        view === target 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-blue-100 hover:bg-slate-800 hover:text-white'
      } ${isChild ? 'pl-11 text-sm' : ''}`}
    >
      <div className="flex items-center gap-3">
        <Icon size={isChild ? 18 : 20} className={isChild ? 'opacity-80' : ''} />
        <span className="font-medium text-left">{label}</span>
      </div>
      {badge > 0 && (
          <span className="bg-red-50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
              {badge}
          </span>
      )}
    </button>
  );

  const NavGroup = ({ id, label, icon: Icon, children, totalBadge = 0 }: { id: string, label: string, icon: any, children?: React.ReactNode, totalBadge?: number }) => {
    // Only render group if it has visible children
    const childrenCount = React.Children.count(children);
    if (childrenCount === 0) return null;

    const isOpen = expandedGroups[id];
    return (
      <div className="mb-1">
        <button
          onClick={() => setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }))}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors duration-200 text-blue-100 hover:bg-slate-800 hover:text-white`}
        >
          <div className="flex items-center space-x-3">
            <Icon size={20} />
            <span className="font-semibold">{label}</span>
            {totalBadge > 0 && !isOpen && (
                <span className="bg-red-50 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
                    {totalBadge}
                </span>
            )}
          </div>
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-1 mt-1">
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-900 transition-colors duration-200 overflow-hidden">
      <TourGuide isOpen={isTourOpen} onClose={() => { setIsTourOpen(false); localStorage.setItem('motopaint_tour_seen', 'true'); }} steps={TOURS[view] || []} />

      <aside className="hidden md:flex flex-col w-64 bg-slate-900 dark:bg-slate-950 text-white h-full shadow-xl z-20">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h1 onClick={() => currentUser.role === 'ADMIN' && setView('DASHBOARD')} className="text-xl font-bold tracking-tight text-white flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm">MP</span> MotoPaint Pro
          </h1>
          {/* QUICK CONFIG SHORTCUT FOR ADMIN */}
          {canAccess('CONFIGURATION') && (
            <button 
                onClick={() => setView('CONFIGURATION')}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                title="Configuración Maestras"
            >
                <Settings size={20} />
            </button>
          )}
        </div>
        
        {/* SIDEBAR NAVIGATION */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="mb-4 px-4 py-2 bg-slate-800 rounded-lg">
             <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Usuario</p>
             <p className="text-sm font-bold truncate">{currentUser.name}</p>
             <p className="text-xs text-blue-400">{currentUser.role}</p>
          </div>

          {canAccess('DASHBOARD') && <NavItem target="DASHBOARD" icon={LayoutDashboard} label="Panel Control" />}
          
          {canAccess('NEW_ORDER') && <NavItem target="NEW_ORDER" icon={PlusCircle} label="Nuevo Ingreso" />}
          
          <NavItem target="ORDERS_LIST" icon={List} label="Órdenes" />
          
          {/* MY TASKS SHORTCUT */}
          {['OPERARIO', 'LIDER', 'MENSAJERO'].includes(currentUser.role) && (
              <NavItem 
                target="MY_TASKS" 
                icon={ClipboardList} 
                label="Mis Tareas" 
                badge={currentUser.area && userTaskCounts[currentUser.area] ? userTaskCounts[currentUser.area] : 0} 
              />
          )}

          <NavItem target="TRACKER" icon={Radar} label="Rastreador" />
          
          {canAccess('REPORTS') && <NavItem target="REPORTS" icon={FileText} label="Informes" />}

          {/* MOVED: Configuration to main menu for faster access */}
          {canAccess('CONFIGURATION') && (
             <NavItem target="CONFIGURATION" icon={Settings} label="Configuración" />
          )}
          
          <div className="my-4 border-t border-slate-800" />
          
          <NavGroup id="PREALISTAMIENTO" label="Pre-Alistamiento" icon={ScanLine} totalBadge={areaCounts.PREALISTAMIENTO.revision + userTaskCounts.PREALISTAMIENTO}>
            {canAccess('LEADER_VIEW', 'PREALISTAMIENTO') && <NavItem target="AREA_PREALISTAMIENTO_LEADER" icon={Users} label="Líder" isChild badge={areaCounts.PREALISTAMIENTO.revision} />}
            {canAccess('OPERATOR_VIEW') && <NavItem target="AREA_PREALISTAMIENTO_OPERATOR" icon={ClipboardCheck} label="Operario" isChild badge={userTaskCounts.PREALISTAMIENTO} />}
          </NavGroup>

          <NavGroup id="ALISTAMIENTO" label="Alistamiento" icon={Users} totalBadge={areaCounts.ALISTAMIENTO.revision + userTaskCounts.ALISTAMIENTO}>
            {canAccess('LEADER_VIEW', 'ALISTAMIENTO') && <NavItem target="AREA_ALISTAMIENTO_LEADER" icon={Users} label="Líder" isChild badge={areaCounts.ALISTAMIENTO.revision} />}
            {canAccess('OPERATOR_VIEW') && <NavItem target="AREA_ALISTAMIENTO_OPERATOR" icon={ClipboardCheck} label="Operario" isChild badge={userTaskCounts.ALISTAMIENTO} />}
          </NavGroup>

          <NavGroup id="PINTURA" label="Pintura" icon={Paintbrush} totalBadge={areaCounts.PINTURA.revision + userTaskCounts.PINTURA}>
            {canAccess('LEADER_VIEW', 'PINTURA') && <NavItem target="AREA_PINTURA_LEADER" icon={Paintbrush} label="Líder" isChild badge={areaCounts.PINTURA.revision} />}
            {canAccess('OPERATOR_VIEW') && <NavItem target="AREA_PINTURA_OPERATOR" icon={ClipboardCheck} label="Pintor" isChild badge={userTaskCounts.PINTURA} />}
          </NavGroup>

          <NavGroup id="PULIDO" label="Pulido" icon={Hammer} totalBadge={areaCounts.PULIDO.revision + userTaskCounts.PULIDO}>
            {canAccess('LEADER_VIEW', 'PULIDO') && <NavItem target="AREA_PULIDO_LEADER" icon={Hammer} label="Líder" isChild badge={areaCounts.PULIDO.revision} />}
            {canAccess('OPERATOR_VIEW') && <NavItem target="AREA_PULIDO_OPERATOR" icon={ClipboardCheck} label="Operario" isChild badge={userTaskCounts.PULIDO} />}
          </NavGroup>

          <NavGroup id="DESPACHOS" label="Despachos" icon={Package} totalBadge={areaCounts.DESPACHOS.revision + userTaskCounts.DESPACHOS}>
            {canAccess('LEADER_VIEW', 'DESPACHOS') && <NavItem target="AREA_DESPACHOS_LEADER" icon={Package} label="Líder" isChild badge={areaCounts.DESPACHOS.revision} />}
            {canAccess('OPERATOR_VIEW') && <NavItem target="AREA_DESPACHOS_OPERATOR" icon={ClipboardCheck} label="Operario" isChild badge={userTaskCounts.DESPACHOS} />}
          </NavGroup>
          
          <NavGroup id="ENTREGAS" label="Entregas" icon={MapPin} totalBadge={areaCounts.ENTREGAS.revision + userTaskCounts.ENTREGAS}>
            {canAccess('LEADER_VIEW', 'ENTREGAS') && <NavItem target="AREA_ENTREGAS_LEADER" icon={MapPin} label="Líder" isChild badge={areaCounts.ENTREGAS.revision} />}
            {canAccess('OPERATOR_VIEW') && <NavItem target="AREA_ENTREGAS_OPERATOR" icon={ClipboardCheck} label="Mensajero" isChild badge={userTaskCounts.ENTREGAS} />}
          </NavGroup>

        </nav>
        
        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-slate-800 space-y-3">
           <button onClick={() => { setIsTourOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-yellow-900 font-bold transition-colors shadow-sm"><HelpCircle size={18} /><span>Tutorial</span></button>
           <button onClick={toggleTheme} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}<span>{isDarkMode ? 'Claro' : 'Oscuro'}</span></button>
           <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-900/50 hover:bg-red-900 text-red-200 transition-colors mt-2"><LogOut size={18} /><span>Cerrar Sesión</span></button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col md:hidden animate-in slide-in-from-left duration-300">
           <div className="p-4 flex justify-between items-center border-b border-slate-800">
              <h1 onClick={() => { setView('DASHBOARD'); setIsMobileMenuOpen(false); }} className="text-xl font-bold cursor-pointer">Menú</h1>
              <button onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button>
           </div>
           <nav className="flex-1 p-4 overflow-y-auto space-y-2">
               <div className="mb-4 pb-4 border-b border-slate-800">
                   <p className="font-bold">{currentUser.name}</p>
                   <p className="text-xs text-blue-400">{currentUser.role}</p>
                   <button onClick={handleLogout} className="mt-2 text-xs text-red-400 flex items-center gap-1"><LogOut size={12}/> Salir</button>
               </div>
              {canAccess('DASHBOARD') && <NavItem target="DASHBOARD" icon={LayoutDashboard} label="Panel Control" />}
              {canAccess('NEW_ORDER') && <NavItem target="NEW_ORDER" icon={PlusCircle} label="Nuevo Ingreso" />}
              <NavItem target="ORDERS_LIST" icon={List} label="Órdenes" />
              
              {/* MY TASKS MOBILE */}
              {['OPERARIO', 'LIDER', 'MENSAJERO'].includes(currentUser.role) && (
                  <NavItem target="MY_TASKS" icon={ClipboardList} label="Mis Tareas" badge={currentUser.area && userTaskCounts[currentUser.area] ? userTaskCounts[currentUser.area] : 0} />
              )}

              <NavItem target="TRACKER" icon={Radar} label="Rastreador" />
              {canAccess('REPORTS') && <NavItem target="REPORTS" icon={FileText} label="Informes" />}
              {canAccess('CONFIGURATION') && <NavItem target="CONFIGURATION" icon={Settings} label="Configuración" />}
           </nav>
        </div>
      )}

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="md:hidden bg-white dark:bg-slate-800 shadow-sm p-4 flex justify-between items-center z-10 transition-colors">
          <span onClick={() => currentUser.role === 'ADMIN' && setView('DASHBOARD')} className="font-bold text-slate-800 dark:text-white text-lg cursor-pointer">MotoPaint Pro</span>
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 dark:text-slate-200"><Menu size={24} /></button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {view === 'DASHBOARD' && canAccess('DASHBOARD') && <Dashboard />}
          {/* Conditional Rendering Guard (Safety check in addition to sidebar hiding) */}
          {view === 'NEW_ORDER' && canAccess('NEW_ORDER') && <OrderForm editingOrderId={editingOrderId} onCancel={() => setView('DASHBOARD')} onSave={() => setView('ORDERS_LIST')} />}
          {view === 'ORDERS_LIST' && <OrderList onEditOrder={(id) => { setEditingOrderId(id); setView('NEW_ORDER'); }} />}
          {view === 'CONFIGURATION' && canAccess('CONFIGURATION') && <Configuration />}
          {view === 'TRACKER' && <Tracker />}
          {view === 'REPORTS' && canAccess('REPORTS') && <Reports />}
          
          {/* My Tasks View - Now uses the read-only Table component */}
          {view === 'MY_TASKS' && currentUser && <MyTasks currentUser={currentUser} />}

          {/* Modular Views with Permission Checks */}
          {view === 'AREA_PREALISTAMIENTO_LEADER' && canAccess('LEADER_VIEW', 'PREALISTAMIENTO') && <AreaLeader area="PREALISTAMIENTO" managedStatuses={['PREALISTAMIENTO']} />}
          {view === 'AREA_PREALISTAMIENTO_OPERATOR' && canAccess('OPERATOR_VIEW') && <AreaOperator area="PREALISTAMIENTO" />}
          
          {view === 'AREA_ALISTAMIENTO_LEADER' && canAccess('LEADER_VIEW', 'ALISTAMIENTO') && <AreaLeader area="ALISTAMIENTO" managedStatuses={['ALISTAMIENTO_1', 'ALISTAMIENTO_2']} />}
          {view === 'AREA_ALISTAMIENTO_OPERATOR' && canAccess('OPERATOR_VIEW') && <AreaOperator area="ALISTAMIENTO" />}
          
          {view === 'AREA_PINTURA_LEADER' && canAccess('LEADER_VIEW', 'PINTURA') && <AreaLeader area="PINTURA" managedStatuses={['PINTURA_BASE', 'PINTURA_COLOR']} />}
          {view === 'AREA_PINTURA_OPERATOR' && canAccess('OPERATOR_VIEW') && <AreaOperator area="PINTURA" />}
          
          {view === 'AREA_PULIDO_LEADER' && canAccess('LEADER_VIEW', 'PULIDO') && <AreaLeader area="PULIDO" managedStatuses={['PULIDO']} />}
          {view === 'AREA_PULIDO_OPERATOR' && canAccess('OPERATOR_VIEW') && <AreaOperator area="PULIDO" />}
          
          {view === 'AREA_DESPACHOS_LEADER' && canAccess('LEADER_VIEW', 'DESPACHOS') && <AreaLeader area="DESPACHOS" managedStatuses={['DESPACHOS']} />}
          {view === 'AREA_DESPACHOS_OPERATOR' && canAccess('OPERATOR_VIEW') && <AreaOperator area="DESPACHOS" />}
          
          {view === 'AREA_ENTREGAS_LEADER' && canAccess('LEADER_VIEW', 'ENTREGAS') && <AreaLeader area="ENTREGAS" managedStatuses={['ENTREGAS']} />}
          {view === 'AREA_ENTREGAS_OPERATOR' && canAccess('OPERATOR_VIEW') && <AreaOperator area="ENTREGAS" />}
        </div>
      </main>
    </div>
  );
}
