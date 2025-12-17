
// Enums
export enum OrderStatus {
  IN_PROCESS = 'En Proceso',
  FINISHED = 'Finalizado'
}

// The Master Workflow including Pre-prep
export type ItemProcessStatus = 
  | 'PENDIENTE'           // 0. Waiting to start
  | 'PREALISTAMIENTO'     // 0.5. Remove decals/elements (New)
  | 'ALISTAMIENTO_1'      // 1. First Prep
  | 'PINTURA_BASE'        // 2. Base Coat
  | 'ALISTAMIENTO_2'      // 3. Sanding/Prep for Color
  | 'PINTURA_COLOR'       // 4. Color Application
  | 'PULIDO'              // 5. Polishing (Only for Gloss/Brillante)
  | 'DESPACHOS'           // 6. Ready for Dispatch/QC
  | 'ENTREGAS'            // 7. With Messenger/On Route
  | 'EN_REVISION'         // 8. Waiting for Leader Approval (Generic)
  | 'FINALIZADA';         // 9. Done

export type FinishType = 'BRILLANTE' | 'MATE';

export type AreaType = 'PREALISTAMIENTO' | 'ALISTAMIENTO' | 'PINTURA' | 'PULIDO' | 'DESPACHOS' | 'ENTREGAS';

// Updated Roles for Login System
export type EmployeeRole = 'ADMIN' | 'LIDER' | 'OPERARIO' | 'RECEPCION' | 'MENSAJERO'; 

export type DeliveryType = 'RECOGIDA_LOCAL' | 'ENTREGA_LOCAL' | 'ENVIO_NACIONAL' | 'ENVIO_INTERNACIONAL';

// Master Data Interfaces
export interface Client {
  id: string;
  name: string;
  phone: string;
  mobilePhone?: string; 
  address?: string;
  city?: string;
  deliveryType?: DeliveryType;
}

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  area?: AreaType; // Optional specialization (Required for LIDER)
  username?: string; // Login
  password?: string; // Login
  email?: string; // Recovery
}

export interface MotoModel {
  id: string;
  brand: string; 
  name: string; 
}

export interface Part {
  id: string;
  name: string;
}

export interface ColorDef {
  id: string;
  name: string;
  code: string; 
}

// Special Editions (Presets)
export interface SpecialEditionItem {
  partId: string;
  partName: string;
  defaultColorId?: string;
  defaultColorName?: string;
  defaultColorCode?: string;
  hasDecals?: boolean;
  accessoriesDetail?: string; 
  defaultFinish?: FinishType; 
}

export interface SpecialEdition {
  id: string;
  name: string;
  modelId: string;
  modelName: string;
  items: SpecialEditionItem[];
}

// System Notifications
export interface AppNotification {
  id: string;
  recipientId: string;
  message: string;
  timestamp: number;
  read: boolean;
}

// --- LOG_REPROCESO & HISTORY ---
export interface ItemHistoryEntry {
  id: string;
  date: string; // ISO String
  action: 'ASIGNADO' | 'FINALIZADO' | 'REPROCESO' | 'AVANCE' | 'RECHAZADO' | 'APROBADO' | 'REINICIADO' | 'EN_REVISION' | 'DEVUELTO_OPERARIO';
  actorName: string;
  areaOrigen?: AreaType | string;
  areaDestino?: AreaType | string; // For Reproceso
  notes?: string; // Motivo_Reproceso
  attemptNumber: number;
}

// Transactional Data - PIEZAS
export interface OrderItem {
  id: string;
  internalId: string; // New: Monthly Barcode ID (e.g. 1125-0001)
  partId: string;
  partName: string;
  colorId: string;
  colorName: string;
  colorCode: string;
  hasDecals: boolean;
  accessoriesDetail?: string; 
  finishType: FinishType; 
  
  // State & Location
  currentStatus: ItemProcessStatus; 
  lastStatus?: ItemProcessStatus; 
  currentArea: AreaType; 
  assignedEmployeeId?: string; 
  
  // Legacy fields support
  status: OrderStatus; 

  // History Log
  history: ItemHistoryEntry[];
  reworkCount: number;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  // Flattened Client Info for snapshots
  clientAddress?: string;
  clientCity?: string;
  clientDeliveryType?: DeliveryType;
  
  modelId: string;
  modelName: string;
  entryDate: string; 
  estimatedDeliveryDate?: string; 
  visualColorHex: string; 
  items: OrderItem[];
  specialEditionId?: string;
  specialEditionName?: string;

  // Shipping Info
  shippingCarrier?: string; // e.g. Servientrega, Interrapidisimo
  shippingTrackingCode?: string; // Guía
}

// App State
export type ViewState = 
  | 'DASHBOARD' 
  | 'NEW_ORDER' 
  | 'ORDERS_LIST' 
  | 'MY_TASKS'
  | 'CONFIGURATION' 
  | 'TRACKER' 
  | 'REPORTS' 
  // Modular Views
  | 'AREA_PREALISTAMIENTO_LEADER' | 'AREA_PREALISTAMIENTO_OPERATOR' 
  | 'AREA_ALISTAMIENTO_LEADER' | 'AREA_ALISTAMIENTO_OPERATOR'
  | 'AREA_PINTURA_LEADER' | 'AREA_PINTURA_OPERATOR'
  | 'AREA_PULIDO_LEADER' | 'AREA_PULIDO_OPERATOR'
  | 'AREA_DESPACHOS_LEADER' | 'AREA_DESPACHOS_OPERATOR'
  | 'AREA_ENTREGAS_LEADER' | 'AREA_ENTREGAS_OPERATOR';
