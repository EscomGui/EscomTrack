export type EstadoVisita =
    | 'pendiente'
    | 'en_proceso'
    | 'obs_guardadas'
    | 'completo';

export interface Visita {
    id?: string;
    sitioId: string;
    sitioNombre: string;
    tipo: 'poliza' | 'cedis';
    mes: number;
    anio: number;
    tecnicoId: string;
    tecnicoNombre: string;
    estado: EstadoVisita;
    fechaRealizado?: Date;
    fechaObsGuardadas?: Date;
    fechaDocGuardada?: Date;
    fechaCompleto?: Date;
    creadoEn?: Date;
    actualizadoEn?: Date;
}