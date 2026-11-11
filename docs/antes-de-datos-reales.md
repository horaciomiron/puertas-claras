# Lista de pendientes antes de usar datos reales

Este prototipo **no está listo** para datos reales. Antes de usarlo con personas reales hay que resolver:

1. **Marco legal y consentimiento:** base legal, consentimiento informado y revocable, finalidad y plazos de conservación (Ley 25.326 de Protección de Datos Personales en Argentina u otra normativa aplicable); evaluación de impacto en privacidad; revisión del Poder Judicial.
2. **Autenticación y autorización reales:** reemplazar el usuario/clave de demostración por identidad institucional (SSO/MFA), roles y permisos por área.
3. **Base de datos real:** reemplazar los archivos JSON (implementar `repo/` sobre PostgreSQL u otro motor) con copias de seguridad y retención.
4. **Cifrado:** HTTPS obligatorio, cifrado en reposo de datos sensibles y gestión de claves/secretos.
5. **Registro de accesos (auditoría):** quién vio o modificó cada legajo, inmodificable.
6. **Sesiones y abuso:** sesiones persistentes y seguras, límites de uso robustos, protección contra automatizaciones, CORS cerrado.
7. **Datos institucionales oficiales:** organismos, competencias, turnos y contactos reales validados por el Poder Judicial (hoy son ficticios).
8. **Seguridad de entrega:** análisis de vulnerabilidades, pruebas de penetración, monitoreo y plan de incidentes.
9. **Accesibilidad:** auditoría WCAG con personas usuarias reales, intérpretes y lengua de señas, versión en lenguas originarias, lectura fácil validada.
10. **Seguridad de las personas:** protocolo de contacto seguro en casos de violencia y conexión real con canales de emergencia.
11. **Gobierno del sistema:** responsables, soporte, y garantía de que ninguna clasificación automática sustituya la decisión humana.
