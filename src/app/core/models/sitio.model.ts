export type TipoSitio = 'poliza' | 'cedis';

export interface Sitio {
    id?: string;
    nombre: string;
    tipo: TipoSitio;
    grupo?: number;
    frecuenciaVisitas?: number;
    activo: boolean;
    creadoEn?: Date;
}