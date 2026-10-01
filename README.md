# 🌲 FunForest Seizoenskaart

Een mobiele app voor het FunForest klimbos: inloggen/registreren, je digitale
seizoenskaart met QR-code, bezoeken bijhouden, reserveringen maken en de
openingstijden & locaties bekijken.

## Vereisten

1. **Node.js 18 of nieuwer**: https://nodejs.org
2. **Expo Go** op je telefoon:
   - iPhone: App Store → "Expo Go"
   - Android: Play Store → "Expo Go"

## Starten (telefoon)

```bash
npm install
npx expo start
```

Scan daarna de QR-code met:

- **iPhone**: de Camera-app
- **Android**: de Expo Go-app

De app opent op je telefoon. Het eerste scherm is **Inloggen**; via
**Registreer nu** maak je een eigen account aan.

> Tip: telefoon en computer moeten op hetzelfde wifi-netwerk zitten.

## Starten (browser)

```bash
npm install
npx expo start --web
```

Of na `npx expo start` de `w`-toets drukken. De app opent in je browser.

## Accounts

Accounts en je aantal bezoeken worden **op het apparaat bewaard**
(AsyncStorage). Je blijft dus ingelogd na verversen en je inloggegevens
werken opnieuw nadat je de app sluit. Elk apparaat heeft zijn eigen accounts.

## Alleen voor vaste abonnementhouders

Nieuwe accounts hebben een **activatiecode** nodig (de code die op de
seizoenskaart/abonnement staat). Standaard is dat `FUNFOREST-ABO`;
wijzigen doe je in [`lib/access.js`](lib/access.js):

- code wijzigen → alleen houders van de nieuwe code kunnen registreren
- code op `""` zetten → de knop *Registreren* verdwijnt helemaal en er kan
  alleen nog ingelogd worden met bestaande accounts

Zonder goede code krijg je: *"Deze activatiecode hoort niet bij een
abonnement."* Let op: dit is een zachte poort in de app — wil je het waterdicht,
dan komt er een server-backend (bijv. Supabase) bij die de codes controleert.

## scripts

| Commando           | Wat het doet                     |
| ------------------ | -------------------------------- |
| `npm start`        | Start de ontwikkelserver         |
| `npm run web`      | Start de app in de browser       |
| `npm run android`  | Open op Android-apparaat/emulator|
| `npm run ios`      | Open op iOS-simulator            |
| `npm run lint`     | Controleer de code op fouten     |
| `npx tsc --noEmit` | Controleer de TypeScript-types    |

## Schermen

- **Login / Registreren** — inloggen, of als abonnementhouder je kaart
  activeren met een activatiecode; foutmeldingen en tips komen in beeld
  (werkt ook in de browser)
- **Dashboard** — bezoekenteller, menu en een bel met het aantal aankomende
  reserveringen
- **Seizoenskaart** — digitale **Seizoenkaart** met een **echte QR-code**, uniek
  pasnummer (FF-######), geldig tot en met 31 december van het lidmaatschapsjaar
  (zoals de echte kaart), een check-in-knop die je bezoeken telt, en de
  **echte voordelen** van funforest.nl: onbeperkt klimmen, alle vier de
  klimbossen, unieke parcoursen en geen losse tickets
- **Reserveringen** — kies een datum in de **maandkalender** (niet meer vast
  aan 14 dagen), zie per dag de **echte openingstijden** en de tijdslots die
  daarbij passen. Dagen "op aanvraag" of gesloten zijn duidelijk uitgeschakeld,
  6 plekken per slot, bevestigen, bekijken en annuleren
- **Profiel** — accountgegevens, wachtwoord wijzigen, meldingen aan/uit en
  uitloggen
- **Informatie** — het echte adres, telefoonnummer en e-mail van Fun Forest
  Venlo, de eerstkomende dagen met live openingstijden en werkende bel-, route-,
  mail- en FAQ-knoppen

## Echte openingstijden

De app haalt de openingstijden op uit de open kalender van funforest.nl
(`wp-json/funforest-airtable/v1/calendar`, met `start`/`end`), gefilterd op
**Fun Forest Venlo**. De lokale tijden staan in `label`/`display_value`
(`opening_time` is UTC).

- Resultaat wordt 6 uur in AsyncStorage bewaard en daarna op de achtergrond
  ververst (`lib/parkHours.js`)
- Geen netwerk én geen cache? Dan valt de app terug op een statisch
  weekpatroon, met een duidelijke waarschuwing in beeld
- Zo ver vooruit als de kalender gevuld is (nu t/m 31 december); dagen die
  nog niet gepubliceerd zijn tonen "kalender volgt"

## Op telefoon én laptop

De app schaalt mee zonder in te zoomen: de viewport staat op
`width=device-width, initial-scale=1`, invoervelden zijn 16 px (geen
automatische zoom op mobiel) en op brede schermen staat alles in een gecentreerde
kolom van maximaal 560 px, zodat niets wordt uitgerekt. Getest op 320–390 px
(telefoon) en 1440 px (laptop).

## Publiceren op Vercel

De app is een statische export (een HTML-bestand per route), dus Vercel kan
hem zo serveren. [`vercel.json`](vercel.json) staat er al klaar volgens de
Expo-handleiding (`cleanUrls: true`, output `dist`).

```bash
npm i -g vercel      # eenmalig
vercel               # eerste keer: vragen beantwoorden
vercel --prod        # live zetten
```

Of koppel de repo in het Vercel-dashboard; de build-commando's komen uit
`vercel.json`. Zo is het nu ingericht: het Vercel-project **funforest-app** bouwt
uit de GitHub-repo `Eliyah2/funforest-app`, terwijl de bewaarrepo `origin` =
`Eliyah2/funforrest` is. Push daarom na elke commit naar beide remotes, anders
komt de update niet live:

```bash
git push origin main              # bewaarrepo (funforrest)
git push funforest-app main       # Vercel bouwt hieruit -> live
```

Lokaal de productiebuild bekijken zoals Vercel hem serveert:

```bash
npx expo export -p web
node tools/serve-dist.js 8090   # http://localhost:8090
```

Bewaren van gegevens gebeurt in de browser (localStorage) van de bezoeker:
per apparaat, blijft staan na herladen, en gaat weg bij wissen van
browserdata of bij een ander domein.

## Backend: Supabase (gedeelde passen & reserveringen)

Zonder configuratie draait de app **lokaal**: accounts, bezoeken en
reserveringen staan dan per apparaat opgeslagen. Wil je dat gasten overal
dezelfde pas en boekingen hebben — en dat je broer ziet wie er gereserveerd
heeft — koppel dan Supabase (gratis tier volstaat):

1. Maak een gratis project op <https://supabase.com>
2. Plak [`supabase/schema.sql`](supabase/schema.sql) in **SQL Editor → New query**
   en draai het uit (tabellen, RLS en de capaciteitsregel)
3. Kopieer `.env.example` naar `.env` en vul **Project URL** + **anon key** in
   (Project Settings → API)
4. Zet in **Authentication → Sign In / Providers → Email** de schakelaar
   *Confirm email* uit, anders moet elke nieuwe gast eerst een
   bevestigingsmail openen
5. Herstart met `npm start`; klaar

Wat je dan krijgt:

- **Accounts via Supabase Auth** — wachtwoorden staan dus niet meer in de
  browser (in de lokale modus stonden ze wel in localStorage)
- **Gedeelde passen** — pasnummer, bezoeken en "lid sinds" overal gelijk
- **Gedeelde reserveringen** — één overzicht voor je broer; de regel
  *max 6 per tijdslot, geen dubbele boekingen* wordt **in de database**
  afgedwongen (functie `book_slot`), niet alleen in de app
- **Row Level Security** — iedereen ziet alleen z'n eigen profiel en
  reserveringen; de beschikbaarheidsteller is zichtbaar voor ingelogde gasten
- De **activatiecode** blijft verplicht bij registreren, en het optionele
  **kaartnummer** gaat naar `profiles.pass_number` en komt in de QR

> Draai je op Vercel? Zet `EXPO_PUBLIC_SUPABASE_URL` en
> `EXPO_PUBLIC_SUPABASE_ANON_KEY` dan ook in *Project Settings → Environment
> Variables* (de `.env` wordt niet meegenomen in de deploy).

## Activatiecodes uitdelen (voor het park)

1. Voer [`supabase/schema.sql`](supabase/schema.sql) uit — daarin zit ook de
   tabel `activation_codes` met bijbehorende regels.
2. Zet jezelf één keer aan als beheerder (SQL Editor):

   ```sql
   update public.profiles set is_admin = true where email = 'broer@funforest.nl';
   ```

3. Log in in de app: er komt een menu-item **Activatiecodes** bij.
4. Klik **Maken** (label optioneel, bijv. "Familie Jansen") → **Kopieer** →
   stuur die code naar de gast. Die vult hem in bij *Activeer je kaart*.
5. Met één tik zet je een code op **Uit**; hoe vaak hij gebruikt is zie je
   ernaast. De lijst is met Row Level Security niet uit te lezen door gasten.

Zonder Supabase blijft de noodcode `FUNFOREST-ABO` werken (staat in
[`lib/access.js`](lib/access.js)). Let op: in een **publieke** repository is die
code leesbaar — maak het repo privé of gebruik de Supabase-codes.

## Huisstijl

De kleuren komen 1:1 uit de theme-CSS van funforest.nl — inclusief hun
**donkergroene kopkleur** `#032810` (`.text-secondary-950`), zodat oranje
alleen nog op knoppen, iconen en accenten zit zoals op hun site:

| Rol | Hex | Herkomst |
| --- | --- | --- |
| Primair oranje (CTA) | `#F76D18` | `.bg-cta` / `.bg-primary` |
| Dieper oranje | `#C03D0E` | `.fill-primary-dark` (hover) |
| Koppen donkergroen | `#032810` | `.text-secondary-950` (H1/H2) |
| Bosgroen | `#5CA33F` | secundaire kleur |
| Crème achtergrond | `#FFF7ED` | `.bg-primary-50` |
| Antraciet tekst | `#182230` | `.text-font` |
| Fout-rood | `#DA3A2F` | waarschuwingen |

- Logo: `assets/brand/funforest-logo.png` (oranje, transparante achtergrond)
- App-icoon, splash en favicon zijn eruit gegenereerd. Opnieuw doen:

  ```bash
  powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1
  ```

## Ontwikkeling

```bash
npm run lint        # ESLint
npx tsc --noEmit    # TypeScript-controle
npx expo export --platform web     # productiebouw voor de browser
npx expo export --platform android # productiebouw voor Android
```

## Levering

De werkende app staat in `oplevering/funforest-app.zip`. Opnieuw maken na
wijzigingen:

```bash
npx expo export --platform web
npx expo export --platform android
powershell -ExecutionPolicy Bypass -File tools\make-zip.ps1
```

`tools\make-zip.ps1` pakt alleen de bronbestanden (app, assets, lib, tools,
config) in `oplevering\funforest-app.zip` — node_modules en dist blijven
eruit.
