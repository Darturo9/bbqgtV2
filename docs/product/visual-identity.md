# Identidad visual de BBQBROS

- Estado: parcialmente implementada
- Fecha de validación: 2026-09-12
- Alcance inicial: aplicación web de BBQBros V2

## Paleta oficial confirmada

| Token             | Color     | Uso principal                                   |
| ----------------- | --------- | ----------------------------------------------- |
| `brand-primary`   | `#FBB414` | llamados a la acción, énfasis y estados activos |
| `brand-secondary` | `#392D27` | superficies oscuras secundarias y texto cálido  |
| `brand-dark`      | `#231F20` | fondos oscuros y texto principal                |
| `brand-light`     | `#FFFFFF` | fondos claros y contenido sobre fondos oscuros  |

Estos colores provienen de la implementación V1 y fueron confirmados por el propietario del producto
como identidad oficial de BBQBROS. Los colores operativos, de estados, gráficas o sedes no forman
parte de esta paleta de marca y se definirán por separado.

## Jerarquía tipográfica aprobada

1. Brookline: títulos de marca, frases de campaña y presencia expresiva.
2. Besley: encabezados secundarios, nombres de productos y contenido editorial destacado.
3. Avenir: navegación, botones, formularios, descripciones, precios y texto funcional.

Brookline debe utilizarse con moderación porque es una tipografía condensada y únicamente dispone de
mayúsculas. Besley no reemplaza la identidad oficial: crea contraste y calidez. Avenir conserva la
máxima legibilidad en las tareas de compra.

## Licencias y estado de implementación

### Besley

Besley está aprobada e implementada mediante `next/font/google`, que la descarga durante el build y
la sirve desde el mismo despliegue. Su fuente oficial es Google Fonts y utiliza la SIL Open Font
License 1.1. Una copia de la licencia se conserva en `apps/web/licenses/Besley-OFL.txt`.

### Brookline

El archivo encontrado en V1 no se copia. Su documento adjunto, `HP_Agreement.pdf`, indica que esa
copia es solo para uso personal y que el uso comercial requiere otra licencia. La marca puede seguir
definiendo Brookline como tipografía oficial, pero V2 necesita evidencia de una licencia comercial
válida antes de incluir el archivo en el repositorio o en producción.

### Avenir

El archivo encontrado en V1 tampoco se copia todavía. No existe junto a él una licencia tipográfica
verificable; `CONTRATO VICCO.pdf` es un contrato de servicios para un evento y no acredita derechos
sobre Avenir. Hasta recibir una licencia válida, la web utiliza la pila local `Avenir Next`,
`Avenir`, `Segoe UI`, `sans-serif`. Esto aprovecha Avenir solamente cuando ya está instalada en el
dispositivo del usuario y evita redistribuir su archivo.

## Regla de implementación

La interfaz no debe descargar fuentes directamente desde Google en el navegador. Las fuentes
habilitadas mediante `next/font` se autohospedan en el build para evitar solicitudes de terceros,
cambios de diseño tardíos y dependencia de red durante la navegación.
