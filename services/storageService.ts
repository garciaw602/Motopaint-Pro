
import { Client, MotoModel, Part, ColorDef, Order, Employee, SpecialEdition, AppNotification, AreaType, ItemProcessStatus } from '../types';

// Helper for dispatching events safely
function dispatchUpdate() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('motopaint_data_updated'));
    }
}

const KEYS = {
  CLIENTS: 'motopaint_clients',
  MODELS: 'motopaint_models',
  PARTS: 'motopaint_parts',
  COLORS: 'motopaint_colors',
  ORDERS: 'motopaint_orders',
  EMPLOYEES: 'motopaint_employees',
  SPECIAL_EDITIONS: 'motopaint_special_editions',
  NOTIFICATIONS: 'motopaint_notifications',
  COUNTERS: 'motopaint_monthly_counters', 
};

// Seed Data
const seedData = () => {
  // --- CLIENTS SEED ---
  const currentClients = JSON.parse(localStorage.getItem(KEYS.CLIENTS) || '[]');
  if (currentClients.length === 0) {
    const clients: Client[] = [
      { id: '1', name: 'Juan Pérez', phone: '3001234567', address: 'Calle 10 # 20-30', city: 'Medellín', deliveryType: 'RECOGIDA_LOCAL' },
      { id: '2', name: 'Taller MotoSporting (Poblado)', phone: '3109876543', address: 'Calle 10 # 43E-135, El Poblado', city: 'Medellín', deliveryType: 'ENTREGA_LOCAL' },
      { id: '3', name: 'María Gonzalez (Laureles)', phone: '3115550011', address: 'Transversal 39B # 74-20, Laureles', city: 'Medellín', deliveryType: 'ENTREGA_LOCAL' },
      { id: '4', name: 'Carlos Rodríguez', phone: '3004442233', address: 'Carrera 15 # 93-60, Chicó', city: 'Bogotá D.C.', deliveryType: 'ENVIO_NACIONAL' },
      { id: '5', name: 'Luisa Fernanda Torres', phone: '3159998877', address: 'Avenida 6N # 20-40', city: 'Cali', deliveryType: 'ENVIO_NACIONAL' },
      { id: '6', name: 'Mike Anderson (Miami Imp)', phone: '+1 305 555 1234', address: '1200 Collins Ave', city: 'Miami, FL, USA', deliveryType: 'ENVIO_INTERNACIONAL' },
      { id: '7', name: 'Taller Los Amigos (Bello)', phone: '6044445555', address: 'Diagonal 55 # 37-41', city: 'Bello', deliveryType: 'ENTREGA_LOCAL' },
      { id: '8', name: 'Diana Carolina Herrera', phone: '3017776655', address: 'Carrera 45 # 60-10', city: 'Medellín', deliveryType: 'RECOGIDA_LOCAL' },
    ];
    localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clients));
  }

  // --- EMPLOYEES SEED (Updated with Credentials) ---
  const currentEmployees = JSON.parse(localStorage.getItem(KEYS.EMPLOYEES) || '[]');
  if (currentEmployees.length === 0) {
    const employees: Employee[] = [
      // Admin
      { id: 'admin', name: 'Administrador', role: 'ADMIN', username: 'admin', password: '123', email: 'admin@motopaint.com' },
      // Recepcion
      { id: 'recep', name: 'Laura (Recepción)', role: 'RECEPCION', username: 'recepcion', password: '123', email: 'recepcion@motopaint.com' },
      // Alistamiento
      { id: 'e1', name: 'Jorge (Líder Alist.)', role: 'LIDER', area: 'ALISTAMIENTO', username: 'jorge', password: '123', email: 'jorge@motopaint.com' },
      { id: 'e2', name: 'Carlos (Operario Alist.)', role: 'OPERARIO', area: 'ALISTAMIENTO', username: 'carlos', password: '123' },
      { id: 'e3', name: 'Pedro (Operario Alist.)', role: 'OPERARIO', area: 'ALISTAMIENTO', username: 'pedro', password: '123' },
      // Pre-Alistamiento
      { id: 'e4', name: 'Ana (Pre-Alist.)', role: 'OPERARIO', area: 'PREALISTAMIENTO', username: 'ana', password: '123' },
      // Pintura
      { id: 'e5', name: 'Mario (Líder Pintura)', role: 'LIDER', area: 'PINTURA', username: 'mario', password: '123', email: 'mario@motopaint.com' },
      { id: 'e6', name: 'Luis (Pintor)', role: 'OPERARIO', area: 'PINTURA', username: 'luis', password: '123' },
      { id: 'e7', name: 'Fernando (Pintor)', role: 'OPERARIO', area: 'PINTURA', username: 'fernando', password: '123' },
      // Pulido
      { id: 'e8', name: 'Sofia (Líder Pulido)', role: 'LIDER', area: 'PULIDO', username: 'sofia', password: '123', email: 'sofia@motopaint.com' },
      { id: 'e9', name: 'Lucia (Pulidora)', role: 'OPERARIO', area: 'PULIDO', username: 'lucia', password: '123' },
      // Despachos
      { id: 'e10', name: 'Roberto (Líder Desp.)', role: 'LIDER', area: 'DESPACHOS', username: 'roberto', password: '123', email: 'roberto@motopaint.com' },
      { id: 'e11', name: 'Gloria (Aux. Despacho)', role: 'OPERARIO', area: 'DESPACHOS', username: 'gloria', password: '123' },
      // Entregas
      { id: 'e12', name: 'Miguel (Mensajero)', role: 'MENSAJERO', area: 'ENTREGAS', username: 'miguel', password: '123', email: 'miguel@motopaint.com' },
    ];
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));
  }

  // --- MODELS SEED ---
  const currentModels = JSON.parse(localStorage.getItem(KEYS.MODELS) || '[]');
  if (currentModels.length === 0) {
    const rawModels = ["AGILITY 125", "AKT NKD 125", "BOXER 100", "BWS 100", "DT 125", "N-MAX 155", "PULSAR 200 NS", "X-MAX 300"];
    const models: MotoModel[] = rawModels.map((name, index) => ({ id: `m_${index}`, brand: 'General', name: name }));
    localStorage.setItem(KEYS.MODELS, JSON.stringify(models));
  }

  // --- PARTS SEED ---
  const currentParts = JSON.parse(localStorage.getItem(KEYS.PARTS) || '[]');
  if (currentParts.length === 0) {
    const rawParts = ["TANQUE", "GUARDAFANGO", "TAPA LATERAL DER", "TAPA LATERAL IZQ", "CARENAJE", "COLIN", "QUILLA", "VISOR"];
    const parts: Part[] = rawParts.map((name, index) => ({ id: `p_${index}`, name: name }));
    localStorage.setItem(KEYS.PARTS, JSON.stringify(parts));
  }

  // --- COLORS SEED ---
  const currentColors = JSON.parse(localStorage.getItem(KEYS.COLORS) || '[]');
  if (currentColors.length === 0) {
    const rawColors = [{ name: "NEGRO", code: "NG" }, { name: "ROJO", code: "RJ" }, { name: "BLANCO", code: "BC" }, { name: "AZUL", code: "AZ" }];
    const colors: ColorDef[] = rawColors.map((c, index) => ({ id: `c_${index}`, name: c.name, code: c.code }));
    localStorage.setItem(KEYS.COLORS, JSON.stringify(colors));
  }
  
  // --- SPECIAL EDITIONS SEED (New) ---
  const currentSpecialEditions = JSON.parse(localStorage.getItem(KEYS.SPECIAL_EDITIONS) || '[]');
  if (currentSpecialEditions.length === 0) {
      const editions: SpecialEdition[] = [
          {
              id: 'se_1',
              name: 'NKD Street King',
              modelId: 'm_1', // AKT NKD 125
              modelName: 'General AKT NKD 125',
              items: [
                  { partId: 'p_0', partName: 'TANQUE', defaultColorId: 'c_0', defaultColorName: 'NEGRO', defaultColorCode: 'NG', hasDecals: true, accessoriesDetail: 'Emblemas Dorados', defaultFinish: 'MATE' },
                  { partId: 'p_1', partName: 'GUARDAFANGO', defaultColorId: 'c_0', defaultColorName: 'NEGRO', defaultColorCode: 'NG', hasDecals: false, accessoriesDetail: '', defaultFinish: 'MATE' },
                  { partId: 'p_2', partName: 'TAPA LATERAL DER', defaultColorId: 'c_0', defaultColorName: 'NEGRO', defaultColorCode: 'NG', hasDecals: true, accessoriesDetail: '', defaultFinish: 'MATE' }
              ]
          },
          {
              id: 'se_2',
              name: 'N-MAX GP Edition',
              modelId: 'm_5', // N-MAX 155
              modelName: 'General N-MAX 155',
              items: [
                  { partId: 'p_4', partName: 'CARENAJE', defaultColorId: 'c_3', defaultColorName: 'AZUL', defaultColorCode: 'AZ', hasDecals: true, accessoriesDetail: 'Sticker Monster', defaultFinish: 'BRILLANTE' },
                  { partId: 'p_1', partName: 'GUARDAFANGO', defaultColorId: 'c_3', defaultColorName: 'AZUL', defaultColorCode: 'AZ', hasDecals: false, accessoriesDetail: '', defaultFinish: 'BRILLANTE' },
                  { partId: 'p_7', partName: 'VISOR', defaultColorId: 'c_0', defaultColorName: 'NEGRO', defaultColorCode: 'NG', hasDecals: false, accessoriesDetail: 'Cúpula Humo', defaultFinish: 'MATE' }
              ]
          },
          {
              id: 'se_3',
              name: 'DT 125 Calima',
              modelId: 'm_4', // DT 125
              modelName: 'General DT 125',
              items: [
                  { partId: 'p_0', partName: 'TANQUE', defaultColorId: 'c_2', defaultColorName: 'BLANCO', defaultColorCode: 'BC', hasDecals: true, accessoriesDetail: 'Franjas Rojas', defaultFinish: 'BRILLANTE' },
                  { partId: 'p_1', partName: 'GUARDAFANGO', defaultColorId: 'c_2', defaultColorName: 'BLANCO', defaultColorCode: 'BC', hasDecals: false, accessoriesDetail: '', defaultFinish: 'BRILLANTE' },
                  { partId: 'p_2', partName: 'TAPA LATERAL DER', defaultColorId: 'c_2', defaultColorName: 'BLANCO', defaultColorCode: 'BC', hasDecals: true, accessoriesDetail: 'Logo 125', defaultFinish: 'BRILLANTE' }
              ]
          },
          {
              id: 'se_4',
              name: 'BWS Motard',
              modelId: 'm_3', // BWS 100
              modelName: 'General BWS 100',
              items: [
                  { partId: 'p_4', partName: 'CARENAJE', defaultColorId: 'c_1', defaultColorName: 'ROJO', defaultColorCode: 'RJ', hasDecals: true, accessoriesDetail: 'Farola Doble', defaultFinish: 'BRILLANTE' },
                  { partId: 'p_1', partName: 'GUARDAFANGO', defaultColorId: 'c_0', defaultColorName: 'NEGRO', defaultColorCode: 'NG', hasDecals: false, accessoriesDetail: '', defaultFinish: 'MATE' }
              ]
          },
          {
              id: 'se_5',
              name: 'Pulsar NS Pro',
              modelId: 'm_6', // PULSAR 200 NS
              modelName: 'General PULSAR 200 NS',
              items: [
                  { partId: 'p_0', partName: 'TANQUE', defaultColorId: 'c_0', defaultColorName: 'NEGRO', defaultColorCode: 'NG', hasDecals: true, accessoriesDetail: 'Pad Tanque', defaultFinish: 'MATE' },
                  { partId: 'p_5', partName: 'COLIN', defaultColorId: 'c_0', defaultColorName: 'NEGRO', defaultColorCode: 'NG', hasDecals: false, accessoriesDetail: '', defaultFinish: 'MATE' },
                  { partId: 'p_6', partName: 'QUILLA', defaultColorId: 'c_3', defaultColorName: 'AZUL', defaultColorCode: 'AZ', hasDecals: false, accessoriesDetail: '', defaultFinish: 'BRILLANTE' }
              ]
          }
      ];
      localStorage.setItem(KEYS.SPECIAL_EDITIONS, JSON.stringify(editions));
  }

  // Initialize other keys if missing
  if (!localStorage.getItem(KEYS.ORDERS)) localStorage.setItem(KEYS.ORDERS, JSON.stringify([]));
  if (!localStorage.getItem(KEYS.NOTIFICATIONS)) localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));
  if (!localStorage.getItem(KEYS.COUNTERS)) localStorage.setItem(KEYS.COUNTERS, JSON.stringify({}));
};

seedData();

export const StorageService = {
  // ... (Getters/Setters remain standard)
  getClients: (): Client[] => JSON.parse(localStorage.getItem(KEYS.CLIENTS) || '[]'),
  saveClients: (data: Client[]) => { localStorage.setItem(KEYS.CLIENTS, JSON.stringify(data)); dispatchUpdate(); },
  
  getModels: (): MotoModel[] => JSON.parse(localStorage.getItem(KEYS.MODELS) || '[]'),
  saveModels: (data: MotoModel[]) => { localStorage.setItem(KEYS.MODELS, JSON.stringify(data)); dispatchUpdate(); },
  
  getParts: (): Part[] => JSON.parse(localStorage.getItem(KEYS.PARTS) || '[]'),
  saveParts: (data: Part[]) => { localStorage.setItem(KEYS.PARTS, JSON.stringify(data)); dispatchUpdate(); },
  
  getColors: (): ColorDef[] => JSON.parse(localStorage.getItem(KEYS.COLORS) || '[]'),
  saveColors: (data: ColorDef[]) => { localStorage.setItem(KEYS.COLORS, JSON.stringify(data)); dispatchUpdate(); },
  
  getEmployees: (): Employee[] => JSON.parse(localStorage.getItem(KEYS.EMPLOYEES) || '[]'),
  saveEmployees: (data: Employee[]) => { localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(data)); dispatchUpdate(); },
  
  getSpecialEditions: (): SpecialEdition[] => JSON.parse(localStorage.getItem(KEYS.SPECIAL_EDITIONS) || '[]'),
  saveSpecialEditions: (data: SpecialEdition[]) => { localStorage.setItem(KEYS.SPECIAL_EDITIONS, JSON.stringify(data)); dispatchUpdate(); },
  
  getOrders: (): Order[] => JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]'),
  saveOrders: (data: Order[]) => { localStorage.setItem(KEYS.ORDERS, JSON.stringify(data)); dispatchUpdate(); },
  
  getNotifications: (): AppNotification[] => JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]'),
  
  addNotification: (recipientId: string, message: string) => {
      const notifications = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]');
      notifications.push({ id: Math.random().toString(36).substr(2, 9), recipientId, message, timestamp: Date.now(), read: false });
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
      dispatchUpdate();
  },
  
  markNotificationsAsRead: (recipientId: string) => {
      const notifications = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]');
      const updated = notifications.map((n: AppNotification) => n.recipientId === recipientId ? { ...n, read: true } : n);
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
      dispatchUpdate();
  },

  generateId: () => Math.random().toString(36).substr(2, 9),

  generateInternalId: (namespace: 'ORD' | 'ITM' = 'ITM'): string => {
      const now = new Date();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear().toString().substr(-2);
      
      const key = `${namespace}_${month}${year}`;

      const counters = JSON.parse(localStorage.getItem(KEYS.COUNTERS) || '{}');
      const currentCount = counters[key] || 0;
      const newCount = currentCount + 1;

      counters[key] = newCount;
      localStorage.setItem(KEYS.COUNTERS, JSON.stringify(counters));

      if (namespace === 'ORD') {
          return `ORDEN${month}${year}-${newCount.toString().padStart(3, '0')}`;
      }
      return `${month}${year}-${newCount.toString().padStart(4, '0')}`;
  },

  getLeaderAttentionCounts: (): Record<AreaType, { revision: number, pending: number }> => {
      const orders: Order[] = JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]');
      const stats: Record<AreaType, { revision: number, pending: number }> = {
          'PREALISTAMIENTO': { revision: 0, pending: 0 },
          'ALISTAMIENTO': { revision: 0, pending: 0 },
          'PINTURA': { revision: 0, pending: 0 },
          'PULIDO': { revision: 0, pending: 0 },
          'DESPACHOS': { revision: 0, pending: 0 },
          'ENTREGAS': { revision: 0, pending: 0 },
      };

      const pendingStatuses: Record<string, ItemProcessStatus[]> = {
          'PREALISTAMIENTO': ['PREALISTAMIENTO'],
          'ALISTAMIENTO': ['ALISTAMIENTO_1', 'ALISTAMIENTO_2'],
          'PINTURA': ['PINTURA_BASE', 'PINTURA_COLOR'],
          'PULIDO': ['PULIDO'],
          'DESPACHOS': ['DESPACHOS'],
          'ENTREGAS': ['ENTREGAS']
      };

      orders.forEach(order => {
          order.items.forEach(item => {
              const area = item.currentArea;
              if (!stats[area]) return;
              if (item.currentStatus === 'EN_REVISION') {
                  stats[area].revision++;
              }
              if (!item.assignedEmployeeId && pendingStatuses[area]?.includes(item.currentStatus)) {
                  stats[area].pending++;
              }
          });
      });

      return stats;
  },

  getUserPendingCounts: (userId: string): Record<AreaType, number> => {
      const orders: Order[] = JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]');
      const counts: Record<AreaType, number> = {
          'PREALISTAMIENTO': 0,
          'ALISTAMIENTO': 0,
          'PINTURA': 0,
          'PULIDO': 0,
          'DESPACHOS': 0,
          'ENTREGAS': 0,
      };

      orders.forEach(order => {
          order.items.forEach(item => {
              // Count item if it is assigned to this user, matches the area, and is active (not finished, not in revision)
              if (item.assignedEmployeeId === userId && item.currentStatus !== 'FINALIZADA' && item.currentStatus !== 'EN_REVISION') {
                  if (counts[item.currentArea] !== undefined) {
                      counts[item.currentArea]++;
                  }
              }
          });
      });

      return counts;
  },

  // LOGIN VALIDATION
  validateLogin: (username: string, password: string): Employee | null => {
      const employees: Employee[] = JSON.parse(localStorage.getItem(KEYS.EMPLOYEES) || '[]');
      const user = employees.find(e => e.username === username && e.password === password);
      return user || null;
  },

  // RECOVERY LOGIC
  checkEmailExists: (email: string): boolean => {
      const employees: Employee[] = JSON.parse(localStorage.getItem(KEYS.EMPLOYEES) || '[]');
      return employees.some(e => e.email === email);
  },

  resetPassword: (email: string, newPassword: string): boolean => {
      const employees: Employee[] = JSON.parse(localStorage.getItem(KEYS.EMPLOYEES) || '[]');
      const index = employees.findIndex(e => e.email === email);
      if (index > -1) {
          employees[index].password = newPassword;
          localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));
          dispatchUpdate();
          return true;
      }
      return false;
  }
};
