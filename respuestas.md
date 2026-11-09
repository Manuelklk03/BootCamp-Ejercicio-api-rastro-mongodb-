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
