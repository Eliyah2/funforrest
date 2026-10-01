// Fun Forest huisstijl — kleuren 1:1 overgenomen uit de theme-CSS van funforest.nl
//   primary        #F76D18  .bg-cta / .bg-primary  (knoppen, iconen, accenten)
//   primaryDark    #C03D0E  .fill-primary-dark     (hover / pressed)
//   heading        #032810  .text-secondary-950    (H1/H2 op hun site)
//   text           #182230  .text-font             (broodtekst)
//   secondary      #5CA33F  bosgroen
//   background     #FFF7ED  .bg-primary-50
//   paleGreen      #FFEFE4  lichte oranje vlakken
// Koppen zijn donkergroen en oranje blijft voorbehouden aan knoppen, iconen
// en accenten — precies zoals op funforest.nl (minder fel, zelfde stijl).
export const Colors = {
  light: {
    primary: "#F76D18", // Fun Forest oranje (CTA)
    primaryDark: "#C03D0E", // dieper oranje voor pressed/hover
    heading: "#032810", // donkergroen, kleur van hun koppen
    secondary: "#5CA33F", // bosgroen
    accent: "#E9530E", // dieper oranje (logo-oranje)
    background: "#FFF7ED", // crème van hun website
    white: "#FFFFFF",
    text: "#182230", // antraciet
    lightBrown: "#667085", // gedempt labelgrijs
    lightGray: "#D0D5DD", // uitgeschakeld / vlak
    paleGreen: "#FFEFE4", // licht oranje vlak
    error: "#DA3A2F",
    success: "#5CA33F",
  },
  dark: {
    primary: "#F76D18",
    primaryDark: "#C03D0E",
    heading: "#FFEFE4",
    secondary: "#5CA33F",
    accent: "#E9530E",
    background: "#032810", // diep bosgroen
    white: "#1D3E28",
    text: "#FFFFFF",
    lightBrown: "#98A2B3",
    lightGray: "#475467",
    paleGreen: "#1D3E28",
    error: "#F97066",
    success: "#5CA33F",
  },
};
