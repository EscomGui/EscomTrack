export type EstadoVisita =
    | 'pendiente'
    | 'en_camino'
    | 'en_sitio'
    | 'en_proceso'
    | 'obs_guardadas'
    | 'completo';

export interface Visita {
    id?:            string;
    sitioId:        string;
    sitioNombre:    string;
    tipo:           'poliza' | 'cedis';
    mes:            number;
    anio:           number;
    tecnicoId:      string;
    tecnicoNombre:  string;
    estado:         EstadoVisita;
    horaSalida?:    any;
    horaLlegada?:   any;
    horaInicio?:    any;
    horaTermino?:   any;
    creadoEn:       any;
    actualizadoEn:  any;
}