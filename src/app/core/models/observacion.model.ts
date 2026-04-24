export type Prioridad = 'alta' | 'media' | 'baja';

export interface Observacion {
    visitaId:    string;
    numero:      number;
    descripcion: string;
    prioridad:   Prioridad;
    nota?:       string;
    }

    export interface ObservacionesGuardadas {
    visitaId:         string;
    tecnicoId:        string;
    tecnicoNombre:    string;
    fecha:            any;
    sinObservaciones: boolean;
    observaciones:    Observacion[];
    bloqueada:        boolean;
    }