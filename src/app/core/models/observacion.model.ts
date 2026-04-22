export type Prioridad = 'alta' | 'media' | 'baja';

export interface Observacion {
    visitaId: string;
    numero: number;
    descripcion: string;
    prioridad: Prioridad;
}

export interface ObservacionesGuardadas {
    id?: string;
    visitaId: string;
    tecnicoId: string;
    tecnicoNombre: string;
    fecha: Date;
    sinObservaciones: boolean;
    observaciones: Observacion[];
    bloqueada: boolean;
    creadoEn?: Date;
    actualizadoEn?: Date;
}