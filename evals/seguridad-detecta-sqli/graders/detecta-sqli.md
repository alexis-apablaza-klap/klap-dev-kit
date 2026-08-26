El método `buscarPorComercio` del diff construye la consulta SQL concatenando strings a partir
de tres parámetros de entrada (`comercioId`, `desde`, `hasta`) sin usar parámetros
preparados/bind variables — una inyección SQL clásica.

¿El review identifica explícitamente esta vulnerabilidad (inyección SQL / concatenación de
strings en la construcción de la query), no sólo un comentario genérico sobre "calidad del
código" o "falta de validación" sin nombrar la clase de vulnerabilidad?
