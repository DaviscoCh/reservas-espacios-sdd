<!-- Sync Impact Report
Version change: 0.0.0 -> 1.0.0
Modified principles: n/a (initial constitution adoption)
Added sections: Stack y Tecnología; Flujo de trabajo y calidad
Removed sections: none
Deferred items: TODO(RATIFICATION_DATE): Fecha original de adopción del proyecto
-->

# Sistema de Reservas de Espacios Constitution

## Core Principles

### I. Especificación obligatoria antes del código
Toda funcionalidad del sistema debe iniciarse con una especificación previa en el repositorio. La especificación debe describir el problema, el comportamiento esperado, los escenarios principales y los criterios de aceptación antes de cualquier implementación.

Esto garantiza que la solución se alinee con la necesidad del negocio, evita cambios improvisados y mantiene una trazabilidad clara entre requisitos, desarrollo y revisión.

### II. Arquitectura definida y mantenible
El proyecto se desarrolla con Angular en el frontend, Node.js con Express en el backend y MongoDB con Mongoose como base de datos. Los cambios deben respetar la separación de responsabilidades entre capas y mantener una estructura coherente con el stack definido.

La elección tecnológica no es negociable; cualquier decisión de diseño debe reforzar la mantenibilidad, la escalabilidad y la claridad del sistema sin introducir dependencias innecesarias.

### III. Calidad con pruebas automatizadas y enfoque TDD
Toda regla de negocio crítica debe contar con pruebas automatizadas antes de considerarse completada. En particular, la regla de no solapamiento de reservas debe estar respaldada por pruebas que validen los casos de éxito, conflicto y bordes relevantes.

El desarrollo sigue un ciclo de prueba fallida, implementación y verificación. No se acepta dejar funcionalidades críticas sin evidencia automatizada de cumplimiento.

### IV. Integridad del control de versiones y revisión
La rama main se encuentra protegida y toda funcionalidad debe desarrollarse en ramas feature/*. La integración de cambios debe hacerse mediante Pull Request y requerirá revisión de código antes de fusionarse.

Cada cambio debe ser pequeño, claro y trazable; los commits deben describir el objetivo del ajuste con mensajes breves y comprensibles en español.

### V. Documentación, comunicación y entregas comprensibles
La documentación del proyecto y los mensajes de commit deben escribirse en español, con descripciones claras, específicas y pequeñas en alcance. El proyecto prioriza la comprensión del contexto por parte del equipo y la trazabilidad de cada entrega.

La documentación no es opcional: debe mantenerse actualizada en la medida necesaria para que terceros puedan entender la intención del sistema, la lógica de negocio y el estado de cada funcionalidad.

## Stack y Tecnología

- Frontend: Angular
- Backend: Node.js con Express
- Base de datos: MongoDB con Mongoose
- Criterio principal: cada módulo debe mantenerse alineado con la arquitectura establecida y con los principios de separación de responsabilidades.
- Criterio de calidad: las validaciones de negocio deben estar reforzadas con pruebas automatizadas, especialmente cuando implican restricciones operativas como la no superposición de reservas.

## Flujo de trabajo y calidad

- Toda funcionalidad requiere especificación previa en el repositorio antes de su implementación.
- Los cambios deben desarrollarse en ramas feature/* y fusionarse hacia main únicamente mediante Pull Request.
- Cada Pull Request ejecuta un pipeline de GitHub Actions que incluye instalación de dependencias, pruebas y build.
- El cumplimiento de reglas de negocio críticas debe validarse con pruebas automatizadas.
- Los commits deben ser claros, pequeños y redactados en español.
- La revisión de código es parte del proceso de calidad y no puede omitirse para integraciones a main.

## Governance

Esta Constitución define las reglas obligatorias del proyecto y prevalece sobre prácticas informales o decisiones no documentadas. Cualquier cambio en procesos, estándares o principios debe registrarse aquí y mantenerse actualizado con el historial de versiones.

Las aprobaciones y revisiones deben verificarse en Pull Requests, asegurando que el trabajo cumple con la especificación, la calidad y los controles del proyecto. Cualquier omisión de estos requisitos constituye una excepción que debe documentarse y corregirse antes de la integración.

**Version**: 1.0.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-10-20
