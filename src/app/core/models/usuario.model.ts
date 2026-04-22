export type Rol = 'admin' | 'tecnico';

export interface Usuario {
    uid: string;
    nombre: string;
    correo: string;
    rol: Rol;
    activo: boolean;
    creadoEn: Date;
    actualizadoEn?: Date;
}