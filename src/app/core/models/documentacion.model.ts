export type SeccionDoc = 'infraestructura' | 'energia' | 'equipos' | 'conectividad';
export type TipoFoto   = 'evidencia' | 'antes' | 'despues';

export interface FotoItem {
    tipo: TipoFoto;
    url: string;
    path: string;
    orientacion: 'vertical' | 'horizontal';
}

export interface ItemChecklist {
    id: string;
    seccion: SeccionDoc;
    descripcion: string;
    esLimpieza: boolean;
    aplica: boolean;
    checked: boolean;
    sinFotos: boolean;
    fotos: FotoItem[];
}

export interface Documentacion {
    id?: string;
    visitaId: string;
    tecnicoId: string;
    tecnicoNombre: string;
    fecha: Date;
    tipo: 'poliza' | 'cedis';
    items: ItemChecklist[];
    finalizado: boolean;
    creadoEn?: Date;
    actualizadoEn?: Date;
}

// ── Plantillas de ítems ──────────────────────────────────────────────────────

type PlantillaItem = Omit<ItemChecklist, 'checked' | 'sinFotos' | 'fotos'>;

export const ITEMS_POLIZA: PlantillaItem[] = [
    { id:'i1', seccion:'infraestructura', descripcion:'Revisión de estructura y estado de torres de comunicaciones.', esLimpieza:false, aplica:true },
    { id:'i2', seccion:'infraestructura', descripcion:'Revisión de retenidas, pintura, tornillería y componentes en general.', esLimpieza:false, aplica:true },
    { id:'i3', seccion:'infraestructura', descripcion:'Revisión del estado de gabinetes de comunicaciones.', esLimpieza:false, aplica:true },
    { id:'i4', seccion:'infraestructura', descripcion:'Limpieza en general de gabinetes de comunicaciones.', esLimpieza:true, aplica:true },
    { id:'i5', seccion:'infraestructura', descripcion:'Limpieza de maleza y conservación de áreas de torres.', esLimpieza:true, aplica:true },
    { id:'i6', seccion:'infraestructura', descripcion:'Revisión de operación de energía dentro de los estándares gabinetes.', esLimpieza:false, aplica:true },
    { id:'i7', seccion:'infraestructura', descripcion:'Revisión de mufas y canalizaciones en general.', esLimpieza:false, aplica:true },
    { id:'i8', seccion:'infraestructura', descripcion:'Revisión de operación de climas.', esLimpieza:false, aplica:false },

    { id:'e1', seccion:'energia', descripcion:'Medición de voltajes y corrientes entrada y salida de centros de carga.', esLimpieza:false, aplica:true },
    { id:'e2', seccion:'energia', descripcion:'Supervisión y prueba de funcionamiento de los supresores de picos.', esLimpieza:false, aplica:true },
    { id:'e3', seccion:'energia', descripcion:'Supervisión y prueba de equipo electrónico montado en gabinete.', esLimpieza:false, aplica:true },
    { id:'e4', seccion:'energia', descripcion:'Supervisión de sistema de tierra física con medición de Impedancia.', esLimpieza:false, aplica:true },
    { id:'e5', seccion:'energia', descripcion:'Revisión continua del estado físico de los conectores a tierra.', esLimpieza:false, aplica:true },
    { id:'e6', seccion:'energia', descripcion:'Supervisión de sistema de pararrayos con medición de Impedancia.', esLimpieza:false, aplica:true },
    { id:'e7', seccion:'energia', descripcion:'Revisión del estado físico de los conectores del pararrayos.', esLimpieza:false, aplica:true },
    { id:'e8', seccion:'energia', descripcion:'Supervisión y prueba de funcionamiento de los reguladores de voltaje.', esLimpieza:false, aplica:true },
    { id:'e9', seccion:'energia', descripcion:'Supervisión y prueba de los equipos interrumpibles de energía (UPS).', esLimpieza:false, aplica:false },

    { id:'c1', seccion:'conectividad', descripcion:'Revisión de Inyectores PoE, protectores de datos.', esLimpieza:false, aplica:true },
    { id:'c2', seccion:'conectividad', descripcion:'Verificación del desempeño de la red LAN y WAN.', esLimpieza:false, aplica:true },
    { id:'c3', seccion:'conectividad', descripcion:'Pruebas de conectividad de cableado.', esLimpieza:false, aplica:true },
    { id:'c4', seccion:'conectividad', descripcion:'Revisión de operación de Access Point Cisco Meraki según existencia en sitio.', esLimpieza:false, aplica:true },
    { id:'c5', seccion:'conectividad', descripcion:'Revisión de operación de Teléfono IP según existencia en sitio.', esLimpieza:false, aplica:true },
    { id:'c6', seccion:'conectividad', descripcion:'Revisión de operación de equipos de seguridad según existencia en sitio.', esLimpieza:false, aplica:false },
    { id:'c7', seccion:'conectividad', descripcion:'Recolección e instalación en sitio de equipos GSM.', esLimpieza:false, aplica:false },
    { id:'c8', seccion:'conectividad', descripcion:'Revisión de operación de repetidores celulares y módems GSM.', esLimpieza:false, aplica:false },
    { id:'c9', seccion:'conectividad', descripcion:'Aseguramiento de protección a personal ajeno a gabinetes y centros de datos.', esLimpieza:false, aplica:true },
];

export const ITEMS_CEDIS: PlantillaItem[] = [
    { id:'i1', seccion:'infraestructura', descripcion:'Revisión de estado de torres de comunicaciones completa.', esLimpieza:false, aplica:true },
    { id:'i2', seccion:'infraestructura', descripcion:'Revisión de retenidas, pintura, tornillería y componentes en general.', esLimpieza:false, aplica:true },
    { id:'i3', seccion:'infraestructura', descripcion:'Revisión del estado de gabinetes o rack de comunicaciones.', esLimpieza:false, aplica:true },
    { id:'i4', seccion:'infraestructura', descripcion:'Limpieza en general de gabinetes o rack de comunicaciones.', esLimpieza:true, aplica:true },
    { id:'i5', seccion:'infraestructura', descripcion:'Condiciones de cableado estructurado.', esLimpieza:false, aplica:true },
    { id:'i6', seccion:'infraestructura', descripcion:'Registros de cableado y F.O.', esLimpieza:false, aplica:true },
    { id:'i7', seccion:'infraestructura', descripcion:'Revisión de operación de climas.', esLimpieza:false, aplica:true },
    { id:'i8', seccion:'infraestructura', descripcion:'Revisión de operación de energía dentro de los estándares gabinetes y centros de datos.', esLimpieza:false, aplica:true },
    { id:'i9', seccion:'infraestructura', descripcion:'Revisión de mufas y canalizaciones en general.', esLimpieza:false, aplica:true },

    { id:'e1', seccion:'energia', descripcion:'Medición de voltajes y corrientes entrada y salida de centros de carga, barras multicontactos y contactos de línea directa.', esLimpieza:false, aplica:true },
    { id:'e2', seccion:'energia', descripcion:'Supervisión y prueba de funcionamiento de los supresores de picos.', esLimpieza:false, aplica:true },
    { id:'e3', seccion:'energia', descripcion:'Supervisión y prueba de equipo electrónico montado en gabinete.', esLimpieza:false, aplica:true },
    { id:'e4', seccion:'energia', descripcion:'Supervisión y prueba de equipos de extracción y circulación de aire.', esLimpieza:false, aplica:true },
    { id:'e5', seccion:'energia', descripcion:'Supervisión de sistema de tierra física con medición de Impedancia.', esLimpieza:false, aplica:true },
    { id:'e6', seccion:'energia', descripcion:'Revisión continua del estado físico de los conectores a tierra.', esLimpieza:false, aplica:true },
    { id:'e7', seccion:'energia', descripcion:'Supervisión de sistema de pararrayos con medición de Impedancia.', esLimpieza:false, aplica:true },
    { id:'e8', seccion:'energia', descripcion:'Revisión del estado físico de los conectores del pararrayos.', esLimpieza:false, aplica:true },
    { id:'e9', seccion:'energia', descripcion:'Revisión continua de conexiones de aterrizado de equipos a tierra.', esLimpieza:false, aplica:true },
    { id:'e10',seccion:'energia', descripcion:'Supervisión y prueba de funcionamiento de los reguladores de voltaje.', esLimpieza:false, aplica:true },
    { id:'e11',seccion:'energia', descripcion:'Supervisión y prueba de los equipos interrumpibles de energía (UPS).', esLimpieza:false, aplica:true },

    { id:'eq1',seccion:'equipos', descripcion:'Revisión de operación de equipo de cómputo en sitio.', esLimpieza:false, aplica:true },
    { id:'eq2',seccion:'equipos', descripcion:'Limpieza de hardware (CPU de torre): mother board, ventiladores, teclado, mouse y monitor.', esLimpieza:true, aplica:true },
    { id:'eq3',seccion:'equipos', descripcion:'Revisión del estado de teclado, mouse y dispositivos periféricos.', esLimpieza:false, aplica:true },

    { id:'c1', seccion:'conectividad', descripcion:'Revisión de Inyectores PoE, protectores de datos.', esLimpieza:false, aplica:true },
    { id:'c2', seccion:'conectividad', descripcion:'Pruebas de Velocidad y transferencia de datos.', esLimpieza:false, aplica:true },
    { id:'c3', seccion:'conectividad', descripcion:'Pruebas de conectividad de cableado.', esLimpieza:false, aplica:true },
    { id:'c4', seccion:'conectividad', descripcion:'Conexiones en nodos.', esLimpieza:false, aplica:true },
    { id:'c5', seccion:'conectividad', descripcion:'Revisión de patch cords.', esLimpieza:false, aplica:true },
    { id:'c6', seccion:'conectividad', descripcion:'Revisión de operación de Access Point Cisco Meraki según existencia en sitio.', esLimpieza:false, aplica:true },
    { id:'c7', seccion:'conectividad', descripcion:'Revisión de operación de Teléfono IP según existencia en sitio.', esLimpieza:false, aplica:true },
    { id:'c8', seccion:'conectividad', descripcion:'Revisión de operación de repetidores celulares y módems GSM según existencia en sitio.', esLimpieza:false, aplica:true },
    { id:'c9', seccion:'conectividad', descripcion:'Aseguramiento de protección a personal ajeno a gabinetes y centros de datos.', esLimpieza:false, aplica:true },
];

export function buildItemsFromTemplate(tipo: 'poliza' | 'cedis'): ItemChecklist[] {
    const plantilla = tipo === 'poliza' ? ITEMS_POLIZA : ITEMS_CEDIS;
    return plantilla.map(t => ({ ...t, checked: false, sinFotos: false, fotos: [] }));
}