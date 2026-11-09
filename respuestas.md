# Respuestas

## Ejercicio 0: proteccion de main

El push directo ha sido rechazado:

```text
remote: error: GH013: Repository rule violations found for refs/heads/main.        
```

GitHub exige una pull request y que pasen los checks htmlhint y lint. La prueba se hizo con un commit vacio separado, sin cambiar main local ni borrar archivos.

## Pregunta 1: MongoDB parado

Recibo 500 y {"error":"Error interno del servidor"}. El ping de /api/health falla y Express pasa el error al middleware final de errores, que responde sin mostrar detalles internos.

## Pregunta 2: los números de la URL

Los query params llegan como texto: con find(req.query), price=380 busca la cadena "380", pero MongoDB guarda el precio como el número 380. Por eso construimos los filtros permitidos y convertimos maxPrice a número antes de consultar.

## Pregunta 3: campos controlados por la API

La API fija views y status para que todos los anuncios empiecen con 0 visitas y AVAILABLE. Si aceptara esos campos del cliente, alguien podría inflar sus visitas o publicar directamente un anuncio como SOLD o RESERVED sin seguir las reglas de la aplicación.

## Pregunta 4: precio copiado en las ofertas

No: el PATCH cambia el precio actual del anuncio, pero la oferta conserva el precio que tenía cuando se creó. Cambiar esa copia alteraría el contexto histórico en el que Sara hizo su oferta.

## Pregunta 5: oferta sobre un anuncio vendido

Es 409 porque los datos de la petición son válidos, pero la oferta entra en conflicto con el estado actual del anuncio, que ya está vendido. Un 400 indica que los datos enviados son incorrectos.

## Pregunta 6: comprobaciones de MongoDB y de la API

MongoDB garantiza la unicidad mediante los índices, por ejemplo no permite dos usuarios con el mismo email gracias al índice único creado. La API debe validar las reglas que la base no comprueba por sí sola, por ejemplo que el comprador exista, que amount sea un número positivo y que el anuncio esté AVAILABLE.
