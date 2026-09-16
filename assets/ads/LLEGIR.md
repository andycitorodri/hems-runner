# Publicidad / patrocinadores

Pon aquí las imágenes de los anuncios y regístralas en `ADS` (principio del script de
`index.html`, justo antes de `I18N_STRINGS`):

```js
const ADS = [
  { img: 'assets/ads/impacte.png', name: 'I Jornada IMPACTE', url: 'https://jornadaimpacte.com' },
  { text: 'HEMS Runner', sub: 'hems.jornadaimpacte.com' },   // sin imagen: se dibuja el texto
];
```

- Formato: PNG o JPG, **proporción 2:1** (p. ej. 1024×512). Otras proporciones se estiran.
- Cada entrada aparece en las **vallas publicitarias** de la carretera (van rotando) y,
  si tiene `img`, en la franja **"Amb el suport de"** del menú (con enlace si hay `url`).
- Si `ADS` está vacío no se muestra nada.
- Nombre nuevo de fichero cada vez que cambies una imagen (caché del navegador).
