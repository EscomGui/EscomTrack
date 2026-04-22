import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import {
    Document, Packer, Paragraph, TextRun,
    ImageRun, AlignmentType, Header, Footer,
    PageNumber, BorderStyle,
    } from 'docx';

    @Injectable({ providedIn: 'root' })
    export class ReportesService {

    // ── XLSX — Tabla de prioridades ──────────────────────────────────────────
    descargarXlsx(sitioNombre: string, observaciones: any[]): void {
        const wb = XLSX.utils.book_new();

        const datos: any[][] = [
        [sitioNombre],
        ['N°', 'Observaciones / Recomendaciones', 'Bajo', 'Medio', 'Alto'],
        ];

        if (!observaciones || observaciones.length === 0) {
        datos.push(['—', 'Sin observaciones', '', '', '']);
        } else {
        for (const obs of observaciones) {
            datos.push([
            obs.numero,
            obs.descripcion,
            obs.prioridad === 'baja'  ? '✓' : '',
            obs.prioridad === 'media' ? '✓' : '',
            obs.prioridad === 'alta'  ? '✓' : '',
            ]);
        }
        }

        const ws = XLSX.utils.aoa_to_sheet(datos);

        ws['!cols'] = [
        { wch: 5  },
        { wch: 60 },
        { wch: 8  },
        { wch: 8  },
        { wch: 8  },
        ];

        ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Prioridades');
        const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        saveAs(
        new Blob([buffer], { type: 'application/octet-stream' }),
        `prioridades_${sitioNombre.replace(/ /g, '_')}.xlsx`
        );
    }

    // ── DOCX — Reporte fotográfico ───────────────────────────────────────────
    async descargarDocx(payload: {
        sitioNombre:   string;
        tecnicoNombre: string;
        fecha:         string;
        tipo:          string;
        mesAnio:       string;
        items:         any[];
        observaciones: any[];
    }): Promise<void> {

        const children: any[] = [];

        // Encabezado del sitio
        children.push(new Paragraph({
        children: [new TextRun({
            text: `${payload.tipo === 'poliza' ? 'Antena revisada' : 'Sitio'}: ${payload.sitioNombre}`,
            bold: true, size: 26, font: 'Calibri',
        })],
        spacing: { before: 0, after: 160 },
        }));

        children.push(new Paragraph({
        children: [new TextRun({
            text: `Técnico: ${payload.tecnicoNombre}   |   Fecha: ${payload.fecha}   |   Período: ${payload.mesAnio}`,
            size: 20, color: '666666', font: 'Calibri',
        })],
        spacing: { before: 0, after: 200 },
        }));

        // Secciones del checklist
        const secciones = [
        { id: 'infraestructura', label: 'Infraestructura' },
        { id: 'energia',         label: 'Energía' },
        { id: 'equipos',         label: 'Equipos de Cómputo' },
        { id: 'conectividad',    label: 'Conectividad' },
        ];

        for (const sec of secciones) {
        const itemsSec = (payload.items || []).filter(
            (i: any) => i.seccion === sec.id && !i.id.startsWith('obs_')
        );
        if (!itemsSec.length) continue;

        children.push(new Paragraph({
            children: [new TextRun({
            text: sec.label, bold: true, size: 24, font: 'Calibri',
            })],
            spacing: { before: 200, after: 100 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '2E6DB4' } },
        }));

        for (const item of itemsSec) {
            if (item.sinFotos) continue;

            children.push(new Paragraph({
            children: [
                new TextRun({ text: '✓ ', bold: true, size: 22, color: '2E6DB4' }),
                new TextRun({ text: item.descripcion, size: 22, font: 'Calibri' }),
            ],
            spacing: { before: 80, after: 80 },
            }));

            for (const foto of (item.fotos || [])) {
            try {
                const buffer = await this.urlToArrayBuffer(foto.url);
                const dims   = this.getDims(foto.orientacion);
                children.push(new Paragraph({
                children: [new ImageRun({
                    data: buffer,
                    transformation: { width: dims.w, height: dims.h },
                    type: 'jpg',
                })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 80 },
                }));
            } catch { /* foto no disponible */ }
            }
        }
        }

        // Observaciones
        const obsValidas = (payload.observaciones || []).filter(
        (o: any) => !o.sinFoto
        );

        if (obsValidas.length > 0) {
        children.push(new Paragraph({
            children: [new TextRun({
            text: 'Observaciones', bold: true, size: 24, font: 'Calibri',
            })],
            spacing: { before: 200, after: 100 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '2E6DB4' } },
        }));

        for (const obs of obsValidas) {
            children.push(new Paragraph({
            children: [
                new TextRun({ text: `${obs.numero}. `, bold: true, size: 22 }),
                new TextRun({ text: obs.descripcion, size: 22, font: 'Calibri' }),
            ],
            spacing: { before: 80, after: 60 },
            }));

            if (obs.fotoUrl) {
            try {
                const buffer = await this.urlToArrayBuffer(obs.fotoUrl);
                const dims   = this.getDims(obs.orientacion || 'horizontal');
                children.push(new Paragraph({
                children: [new ImageRun({
                    data: buffer,
                    transformation: { width: dims.w, height: dims.h },
                    type: 'jpg',
                })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 80 },
                }));
            } catch { /* foto no disponible */ }
            }
        }
        }

        // Generar documento
        const doc = new Document({
        styles: {
            default: {
            document: { run: { font: 'Calibri', size: 22 } },
            },
        },
        sections: [{
            properties: {
            page: {
                size:   { width: 12240, height: 15840 },
                margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
            },
            },
            headers: {
            default: new Header({
                children: [new Paragraph({
                children: [
                    new TextRun({
                    text: 'SISTEMAS ESCOM  ',
                    bold: true, size: 20, color: '0D2137', font: 'Calibri',
                    }),
                    new TextRun({
                    text: '· Informe Fotográfico Descriptivo',
                    size: 20, color: '888888', font: 'Calibri',
                    }),
                ],
                border: {
                    bottom: {
                    style: BorderStyle.SINGLE, size: 6,
                    color: '2E6DB4', space: 2,
                    },
                },
                spacing: { before: 0, after: 100 },
                })],
            }),
            },
            footers: {
            default: new Footer({
                children: [new Paragraph({
                children: [
                    new TextRun({
                    text: `Grupo Pecuario San Antonio S.A. de C.V.  ·  ${payload.mesAnio}     `,
                    size: 18, color: '888888', font: 'Calibri',
                    }),
                    new TextRun({
                    text: 'Pág. ', size: 18, color: '888888',
                    }),
                    new TextRun({
                    children: [PageNumber.CURRENT], size: 18, color: '0D2137',
                    }),
                ],
                alignment: AlignmentType.CENTER,
                border: {
                    top: {
                    style: BorderStyle.SINGLE, size: 6,
                    color: '2E6DB4', space: 2,
                    },
                },
                spacing: { before: 100, after: 0 },
                })],
            }),
            },
            children,
        }],
        });

        const buffer = await Packer.toBuffer(doc);
        saveAs(
        new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
        `reporte_${payload.sitioNombre.replace(/ /g, '_')}.docx`
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async urlToArrayBuffer(url: string): Promise<ArrayBuffer> {
        const res = await fetch(url);
        return await res.arrayBuffer();
    }

    private getDims(orientacion: 'vertical' | 'horizontal'): { w: number; h: number } {
        // 2.3 pulgadas en puntos (1 pulgada = 72 puntos en docx)
        const pts = Math.round(2.3 * 72);
        if (orientacion === 'vertical') {
        return { w: Math.round(pts * 0.75), h: pts };
        }
        return { w: pts, h: Math.round(pts * 0.75) };
    }
    }