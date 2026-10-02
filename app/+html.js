/**
 * Root-HTML voor de web-export (Expo Router: app/+html.js).
 *
 * Waarom dit bestand bestaat: zonder preload begint het iconenfont pas te
 * laden áls het JavaScript klaar is met downloaden en uitvoeren. Met een
 * preload loopt het gelijk met de bundel, waardoor de iconen meteen staan.
 * De preconnect naar Supabase bespaart een DNS- en TLS-handshake bij het
 * herstellen van de sessie, wat bij elke paginalading gebeurt.
 */

// Het font is inhoudsgehasht en verandert alleen als het lettertype zelf
// verandert (in theorie nooit). Klopt de hash niet meer, dan mislukt alleen
// de preload-verbrequest en laadt het font alsnog op de gewone manier —
// de app blijft dus altijd werken.
const MATERIAL_ICONS_FONT =
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.4e85bc9ebe07e0340c9c4fc2f6c38908.ttf";

export default function RootHTML({ children }) {
  return (
    <html lang="nl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        {/* Deze stijl hoort bij de default-HTML van Expo Router en zou
            verdwijnen als ik dit bestand toevoeg zonder hem: #root moet
            flex zijn, anders klapt de hele layout in. */}
        <style id="expo-reset">
          {`#root,body,html{height:100%}body{overflow:hidden}#root{display:flex}`}
        </style>
        <link
          rel="preconnect"
          href="https://fqynaoceftqdkfitrfwc.supabase.co"
        />
        <link
          rel="preload"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
          href={MATERIAL_ICONS_FONT}
        />
      </head>
      {/* De app zelf (de gerenderde route) komt in de body. */}
      <body>{children}</body>
    </html>
  );
}
