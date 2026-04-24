export interface Usuario {
    uid:         string;
    nombre:      string;
    correo:      string;
    rol:         'superadmin' | 'admin' | 'tecnico';
    activo:      boolean;
    creadoEn?:   any;
    actualizadoEn?: any;
}