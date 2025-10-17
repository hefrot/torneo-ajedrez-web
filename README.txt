ENTREGABLES TORNEO

Archivos:
- calendario.html  -> Página de calendario con banderas, @Lichess y WhatsApp + contador.
- app_patch_pairings.js -> Bloque para pegar en app.js y mejorar los pareos de la portada.
- tournament_rounds_template.json -> Plantilla mínima de /tournament; ajusta fechas.
- devtools_generate_rounds_snippet.txt -> Script para generar 21 rondas con fechas en tu zona horaria.

Pasos rápidos:
1) Sube 'calendario.html' a la raíz del repo (mismo nivel que index.html).
2) Abre tu app.js y pega el contenido de 'app_patch_pairings.js' (reemplaza tu renderPairings y añade los helpers).
3) Firebase > Authentication > Anonymous = Enabled.
4) Firebase > Realtime Database > /tournament > Import JSON con tu JSON real. Si no lo tienes, ejecuta el snippet del archivo 'devtools_generate_rounds_snippet.txt' en la consola y pega el resultado.
5) Verifica dominios autorizados ('hefrot.github.io') en Authentication.
