// Source: Israeli Ministry of Foreign Affairs — verify/update at mfa.gov.il
// Coordinates are approximate; used for map centering only.
const embassies = [
  // ── North America ──────────────────────────────────────────────────────────
  { id: 1,  country: "USA",        city: "Washington D.C.", address: "3514 International Dr NW, Washington, DC 20008",            lat: 38.9218,  lng: -77.0506,  type: "embassy"   },
  { id: 2,  country: "USA",        city: "New York",        address: "800 2nd Ave, New York, NY 10017",                           lat: 40.7504,  lng: -73.9712,  type: "consulate" },
  { id: 3,  country: "USA",        city: "Los Angeles",     address: "11766 Wilshire Blvd, Los Angeles, CA 90025",                lat: 34.0535,  lng: -118.4433, type: "consulate" },
  { id: 4,  country: "USA",        city: "San Francisco",   address: "456 Montgomery St, San Francisco, CA 94104",                lat: 37.7943,  lng: -122.4027, type: "consulate" },
  { id: 5,  country: "USA",        city: "Miami",           address: "100 N Biscayne Blvd, Miami, FL 33132",                     lat: 25.7749,  lng: -80.1878,  type: "consulate" },
  { id: 6,  country: "USA",        city: "Atlanta",         address: "1100 Spring St NW, Atlanta, GA 30309",                     lat: 33.7882,  lng: -84.3875,  type: "consulate" },
  { id: 7,  country: "USA",        city: "Boston",          address: "20 Park Plaza, Boston, MA 02116",                          lat: 42.3518,  lng: -71.0636,  type: "consulate" },
  { id: 8,  country: "USA",        city: "Chicago",         address: "111 E Wacker Dr, Chicago, IL 60601",                       lat: 41.8859,  lng: -87.6224,  type: "consulate" },
  { id: 9,  country: "USA",        city: "Houston",         address: "24 Greenway Plaza, Houston, TX 77046",                     lat: 29.7375,  lng: -95.4627,  type: "consulate" },
  { id: 10, country: "Canada",     city: "Ottawa",          address: "50 O'Connor St, Ottawa, ON K1P 6L2",                       lat: 45.4199,  lng: -75.6908,  type: "embassy"   },
  { id: 11, country: "Canada",     city: "Toronto",         address: "180 Bloor St W, Toronto, ON M5S 2V6",                      lat: 43.6685,  lng: -79.3939,  type: "consulate" },
  { id: 12, country: "Canada",     city: "Montreal",        address: "1155 René-Lévesque Blvd W, Montreal, QC H3B 2K4",          lat: 45.4975,  lng: -73.5684,  type: "consulate" },
  { id: 13, country: "Mexico",     city: "Mexico City",     address: "Sierra Madre 215, Lomas de Chapultepec, Mexico City",      lat: 19.4284,  lng: -99.2080,  type: "embassy"   },

  // ── South America ──────────────────────────────────────────────────────────
  { id: 14, country: "Brazil",     city: "Brasília",        address: "SES Av. das Nações, Quadra 809, Lote 38, Brasília",        lat: -15.8046, lng: -47.8975,  type: "embassy"   },
  { id: 15, country: "Brazil",     city: "São Paulo",       address: "Av. Lineu de Paula Machado 1051, São Paulo",               lat: -23.5899, lng: -46.7074,  type: "consulate" },
  { id: 16, country: "Argentina",  city: "Buenos Aires",    address: "Av. de Mayo 701, Buenos Aires",                            lat: -34.6108, lng: -58.3762,  type: "embassy"   },
  { id: 17, country: "Chile",      city: "Santiago",        address: "San Sebastián 2812, Las Condes, Santiago",                 lat: -33.4167, lng: -70.5940,  type: "embassy"   },
  { id: 18, country: "Colombia",   city: "Bogotá",          address: "Calle 35 No. 7-25, Bogotá",                                lat: 4.6474,   lng: -74.0551,  type: "embassy"   },
  { id: 19, country: "Peru",       city: "Lima",            address: "Natalio Sanchez 125, Santa Beatriz, Lima",                 lat: -12.0784, lng: -77.0448,  type: "embassy"   },
  { id: 20, country: "Venezuela",  city: "Caracas",         address: "Centro Empresarial Eurobuilding, Caracas",                 lat: 10.4920,  lng: -66.8791,  type: "embassy"   },
  { id: 21, country: "Panama",     city: "Panama City",     address: "Samuel Lewis & 58th St, Panama City",                      lat: 8.9905,   lng: -79.5212,  type: "embassy"   },
  { id: 22, country: "Uruguay",    city: "Montevideo",      address: "Bulevar Artigas 1585, Montevideo",                         lat: -34.8901, lng: -56.1703,  type: "embassy"   },
  { id: 23, country: "Ecuador",    city: "Quito",           address: "Eloy Alfaro N32-509, Quito",                               lat: -0.1833,  lng: -78.4919,  type: "embassy"   },

  // ── Western Europe ─────────────────────────────────────────────────────────
  { id: 24, country: "UK",         city: "London",          address: "2 Palace Green, London W8 4QB",                            lat: 51.5034,  lng: -0.1861,   type: "embassy"   },
  { id: 25, country: "France",     city: "Paris",           address: "3 Rue Rabelais, 75008 Paris",                              lat: 48.8695,  lng: 2.3088,    type: "embassy"   },
  { id: 26, country: "France",     city: "Marseille",       address: "146 Rue de Breteuil, 13006 Marseille",                     lat: 43.2837,  lng: 5.3795,    type: "consulate" },
  { id: 27, country: "Germany",    city: "Berlin",          address: "Auguste-Viktoria-Straße 74-76, 14193 Berlin",              lat: 52.4757,  lng: 13.2846,   type: "embassy"   },
  { id: 28, country: "Germany",    city: "Frankfurt",       address: "Savignystraße 66, 60325 Frankfurt",                        lat: 50.1187,  lng: 8.6625,    type: "consulate" },
  { id: 29, country: "Germany",    city: "Munich",          address: "Möhlstraße 16, 81675 Munich",                              lat: 48.1486,  lng: 11.6059,   type: "consulate" },
  { id: 30, country: "Italy",      city: "Rome",            address: "Via Michele Mercati 14, 00197 Rome",                       lat: 41.9174,  lng: 12.4895,   type: "embassy"   },
  { id: 31, country: "Italy",      city: "Milan",           address: "Piazza della Repubblica 27, 20124 Milan",                  lat: 45.4797,  lng: 9.1999,    type: "consulate" },
  { id: 32, country: "Spain",      city: "Madrid",          address: "Calle Velázquez 150, 28002 Madrid",                        lat: 40.4306,  lng: -3.6791,   type: "embassy"   },
  { id: 33, country: "Spain",      city: "Barcelona",       address: "Carrer de Còrsega 255, 08036 Barcelona",                   lat: 41.3861,  lng: 2.1488,    type: "consulate" },
  { id: 34, country: "Netherlands",city: "The Hague",       address: "Buitenhof 47, 2513 AH The Hague",                         lat: 52.0803,  lng: 4.3118,    type: "embassy"   },
  { id: 35, country: "Belgium",    city: "Brussels",        address: "Avenue de l'Observatoire 40, 1180 Brussels",               lat: 50.7963,  lng: 4.3683,    type: "embassy"   },
  { id: 36, country: "Switzerland",city: "Bern",            address: "Alpenstraße 32, 3006 Bern",                                lat: 46.9476,  lng: 7.4589,    type: "embassy"   },
  { id: 37, country: "Austria",    city: "Vienna",          address: "Anton-Frank-Gasse 20, 1180 Vienna",                        lat: 48.2218,  lng: 16.3536,   type: "embassy"   },
  { id: 38, country: "Portugal",   city: "Lisbon",          address: "Rua António Enes 16, 1050-025 Lisbon",                     lat: 38.7196,  lng: -9.1475,   type: "embassy"   },
  { id: 39, country: "Ireland",    city: "Dublin",          address: "122 Pembroke Road, Dublin 4",                              lat: 53.3227,  lng: -6.2355,   type: "embassy"   },
  { id: 40, country: "Luxembourg", city: "Luxembourg City", address: "5 Rue des Foyers, L-1537 Luxembourg",                      lat: 49.6075,  lng: 6.1272,    type: "embassy"   },
  { id: 41, country: "Cyprus",     city: "Nicosia",         address: "4 Gryparis St, 1061 Nicosia",                              lat: 35.1606,  lng: 33.3615,   type: "embassy"   },
  { id: 42, country: "Greece",     city: "Athens",          address: "1 Marathonodromon St, 154 52 Psychiko, Athens",            lat: 37.9949,  lng: 23.7799,   type: "embassy"   },

  // ── Northern Europe ────────────────────────────────────────────────────────
  { id: 43, country: "Sweden",     city: "Stockholm",       address: "Rapsgatan 1, 104 40 Stockholm",                            lat: 59.3433,  lng: 18.0637,   type: "embassy"   },
  { id: 44, country: "Norway",     city: "Oslo",            address: "Drammensveien 82C, 0271 Oslo",                             lat: 59.9138,  lng: 10.7086,   type: "embassy"   },
  { id: 45, country: "Denmark",    city: "Copenhagen",      address: "Lundbygaard, Strandvejen 104, 2900 Hellerup",              lat: 55.7236,  lng: 12.5847,   type: "embassy"   },
  { id: 46, country: "Finland",    city: "Helsinki",        address: "Unioninkatu 16 B 2, 00130 Helsinki",                       lat: 60.1674,  lng: 24.9492,   type: "embassy"   },
  { id: 47, country: "Lithuania",  city: "Vilnius",         address: "Seimyniskiu 1, 09312 Vilnius",                             lat: 54.6914,  lng: 25.2777,   type: "embassy"   },
  { id: 48, country: "Latvia",     city: "Riga",            address: "Elizabetes iela 2, Riga LV-1340",                          lat: 56.9507,  lng: 24.1099,   type: "embassy"   },
  { id: 49, country: "Estonia",    city: "Tallinn",         address: "Karu 10, 10120 Tallinn",                                   lat: 59.4299,  lng: 24.7466,   type: "embassy"   },

  // ── Eastern Europe ─────────────────────────────────────────────────────────
  { id: 50, country: "Poland",     city: "Warsaw",          address: "ul. Krzywickiego 24, 02-078 Warsaw",                       lat: 52.2185,  lng: 20.9901,   type: "embassy"   },
  { id: 51, country: "Czech Rep.", city: "Prague",          address: "Badeniho 2, 170 00 Prague",                                lat: 50.1002,  lng: 14.3902,   type: "embassy"   },
  { id: 52, country: "Hungary",    city: "Budapest",        address: "Fullánk u. 8, 1026 Budapest",                              lat: 47.5235,  lng: 18.9753,   type: "embassy"   },
  { id: 53, country: "Romania",    city: "Bucharest",       address: "Str. Burghelea 5, 011611 Bucharest",                       lat: 44.4443,  lng: 26.1037,   type: "embassy"   },
  { id: 54, country: "Bulgaria",   city: "Sofia",           address: "18 Shandor Petyofi St, Sofia",                             lat: 42.6953,  lng: 23.3323,   type: "embassy"   },
  { id: 55, country: "Slovakia",   city: "Bratislava",      address: "Palisády 47, 811 06 Bratislava",                           lat: 48.1376,  lng: 17.0998,   type: "embassy"   },
  { id: 56, country: "Croatia",    city: "Zagreb",          address: "Pantovčak 101a, 10000 Zagreb",                             lat: 45.8241,  lng: 15.9729,   type: "embassy"   },
  { id: 57, country: "Slovenia",   city: "Ljubljana",       address: "Verovškova ulica 55a, 1000 Ljubljana",                     lat: 46.0677,  lng: 14.5107,   type: "embassy"   },
  { id: 58, country: "Serbia",     city: "Belgrade",        address: "Bulevar Mira 47, 11040 Belgrade",                          lat: 44.8156,  lng: 20.4672,   type: "embassy"   },
  { id: 59, country: "Albania",    city: "Tirana",          address: "Rruga Ibrahim Rugova, Tirana",                             lat: 41.3288,  lng: 19.8281,   type: "embassy"   },
  { id: 60, country: "N. Macedonia",city:"Skopje",          address: "Ul. Ivo Ribar Lola, Skopje",                               lat: 41.9972,  lng: 21.4316,   type: "embassy"   },
  { id: 61, country: "Moldova",    city: "Chișinău",        address: "Str. Pogovor 4/1, Chișinău",                               lat: 47.0307,  lng: 28.8579,   type: "embassy"   },
  { id: 62, country: "Ukraine",    city: "Kyiv",            address: "34 Lesi Ukraïnky Blvd, Kyiv",                              lat: 50.4266,  lng: 30.5458,   type: "embassy"   },
  { id: 63, country: "Georgia",    city: "Tbilisi",         address: "61 Tsinamdzghvrishvili St, Tbilisi",                       lat: 41.6873,  lng: 44.7878,   type: "embassy"   },
  { id: 64, country: "Azerbaijan", city: "Baku",            address: "1 Büyük Qala küçəsi, Baku",                                lat: 40.3700,  lng: 49.8410,   type: "embassy"   },
  { id: 65, country: "Kazakhstan", city: "Nur-Sultan",      address: "Kenesary st. 93, Nur-Sultan",                              lat: 51.1284,  lng: 71.4305,   type: "embassy"   },

  // ── Middle East ────────────────────────────────────────────────────────────
  { id: 66, country: "Turkey",     city: "Ankara",          address: "Mahatma Gandi Cad. No:85, 06700 Ankara",                  lat: 39.8984,  lng: 32.8541,   type: "embassy"   },
  { id: 67, country: "Turkey",     city: "Istanbul",        address: "Vali Konağı Cad. No:73, 34367 Şişli, Istanbul",           lat: 41.0465,  lng: 28.9894,   type: "consulate" },
  { id: 68, country: "Egypt",      city: "Cairo",           address: "6 Ibn El Malek, Giza",                                    lat: 29.9965,  lng: 31.2101,   type: "embassy"   },
  { id: 69, country: "Jordan",     city: "Amman",           address: "47 Maysaloun St, Amman",                                  lat: 31.9773,  lng: 35.8983,   type: "embassy"   },
  { id: 70, country: "Morocco",    city: "Rabat",           address: "12 Rue Bir Kacem, Souissi, Rabat",                        lat: 33.9984,  lng: -6.8469,   type: "embassy"   },

  // ── Asia ───────────────────────────────────────────────────────────────────
  { id: 71, country: "India",      city: "New Delhi",       address: "3 Aurangzeb Road, New Delhi 110011",                      lat: 28.5981,  lng: 77.1968,   type: "embassy"   },
  { id: 72, country: "India",      city: "Mumbai",          address: "50-C Maker Chambers VI, Nariman Point, Mumbai",           lat: 18.9255,  lng: 72.8258,   type: "consulate" },
  { id: 73, country: "Japan",      city: "Tokyo",           address: "3-22 Nishi Azabu 4-chome, Minato-ku, Tokyo",              lat: 35.6582,  lng: 139.7244,  type: "embassy"   },
  { id: 74, country: "Japan",      city: "Osaka",           address: "2-19-3 Nishi Shinsaibashi, Chuo-ku, Osaka",              lat: 34.6726,  lng: 135.4985,  type: "consulate" },
  { id: 75, country: "China",      city: "Beijing",         address: "17 Tianze Road, Chaoyang District, Beijing",              lat: 39.9423,  lng: 116.4549,  type: "embassy"   },
  { id: 76, country: "China",      city: "Shanghai",        address: "1468 Huaihai Zhong Lu, Xuhui, Shanghai",                  lat: 31.2049,  lng: 121.4519,  type: "consulate" },
  { id: 77, country: "South Korea",city: "Seoul",           address: "46 Ichon-ro 45-gil, Yongsan-gu, Seoul",                   lat: 37.5250,  lng: 126.9698,  type: "embassy"   },
  { id: 78, country: "Singapore",  city: "Singapore",       address: "58 Dalvey Road, Singapore 259407",                        lat: 1.3107,   lng: 103.8236,  type: "embassy"   },
  { id: 79, country: "Thailand",   city: "Bangkok",         address: "Ocean Tower II, 75/6-7 Sukhumvit Soi 19, Bangkok",        lat: 13.7402,  lng: 100.5614,  type: "embassy"   },
  { id: 80, country: "Philippines",city: "Manila",          address: "23/F The Tower at Valero, 122 Valero St, Makati",         lat: 14.5548,  lng: 121.0145,  type: "embassy"   },
  { id: 81, country: "Vietnam",    city: "Hanoi",           address: "68 Nguyen Thai Hoc St, Ba Dinh, Hanoi",                   lat: 21.0356,  lng: 105.8410,  type: "embassy"   },
  { id: 82, country: "Indonesia",  city: "Jakarta",         address: "JL. Jend. Sudirman Kav. 52, Jakarta",                     lat: -6.2270,  lng: 106.8026,  type: "embassy"   },
  { id: 83, country: "Cambodia",   city: "Phnom Penh",      address: "57 Street 112, Phnom Penh",                               lat: 11.5729,  lng: 104.9215,  type: "embassy"   },
  { id: 84, country: "Myanmar",    city: "Naypyidaw",       address: "Naypyidaw, Myanmar",                                      lat: 19.7633,  lng: 96.0785,   type: "embassy"   },

  // ── Africa ─────────────────────────────────────────────────────────────────
  { id: 85, country: "Ethiopia",   city: "Addis Ababa",     address: "Kebena, Higher 09, Kebele 03, Addis Ababa",               lat: 9.0287,   lng: 38.7698,   type: "embassy"   },
  { id: 86, country: "Kenya",      city: "Nairobi",         address: "Bishops Road, PO Box 30354, Nairobi",                     lat: -1.2921,  lng: 36.8119,   type: "embassy"   },
  { id: 87, country: "South Africa",city:"Pretoria",        address: "428 King's Highway, Lynnwood, Pretoria",                  lat: -25.7726, lng: 28.2741,   type: "embassy"   },
  { id: 88, country: "South Africa",city:"Cape Town",       address: "Dunkley Square, Gardens, Cape Town",                      lat: -33.9334, lng: 18.4127,   type: "consulate" },
  { id: 89, country: "South Africa",city:"Johannesburg",    address: "Sandown Mews, 88 Stella St, Johannesburg",                lat: -26.1046, lng: 28.0564,   type: "consulate" },
  { id: 90, country: "Nigeria",    city: "Abuja",           address: "Plot 2905, Olusegun Obasanjo Way, Abuja",                 lat: 9.0577,   lng: 7.4896,    type: "embassy"   },
  { id: 91, country: "Ghana",      city: "Accra",           address: "Adjacent to Ministries Post Office, Accra",               lat: 5.5752,   lng: -0.2112,   type: "embassy"   },
  { id: 92, country: "Côte d'Ivoire",city:"Abidjan",        address: "Les Deux Plateaux, Abidjan",                              lat: 5.3600,   lng: -4.0083,   type: "embassy"   },
  { id: 93, country: "Senegal",    city: "Dakar",           address: "18 Rue Mermoz, Dakar",                                    lat: 14.7148,  lng: -17.4560,  type: "embassy"   },
  { id: 94, country: "Tanzania",   city: "Dar es Salaam",   address: "Mirambo/Sokoine, Dar es Salaam",                          lat: -6.8190,  lng: 39.2888,   type: "embassy"   },
  { id: 95, country: "Uganda",     city: "Kampala",         address: "15A Nakasero Hill Road, Kampala",                         lat: 0.3147,   lng: 32.5723,   type: "embassy"   },
  { id: 96, country: "Rwanda",     city: "Kigali",          address: "5 Rugandamfura Rd, Kigali",                               lat: -1.9570,  lng: 30.0587,   type: "embassy"   },
  { id: 97, country: "Cameroon",   city: "Yaoundé",         address: "Bastos, Yaoundé",                                         lat: 3.8733,   lng: 11.5202,   type: "embassy"   },
  { id: 98, country: "Congo (DRC)",city: "Kinshasa",        address: "12 Avenue des Aviateurs, Kinshasa",                       lat: -4.3254,  lng: 15.3219,   type: "embassy"   },

  // ── Oceania ────────────────────────────────────────────────────────────────
  { id: 99,  country: "Australia",   city: "Canberra",   address: "6 Turrana St, Yarralumla, ACT 2600",                lat: -35.3002, lng: 149.1200, type: "embassy"   },
  { id: 100, country: "Australia",   city: "Sydney",     address: "37 York St, Sydney NSW 2000",                       lat: -33.8649, lng: 151.2050, type: "consulate" },
  { id: 101, country: "Australia",   city: "Melbourne",  address: "Level 12, 52 Collins St, Melbourne VIC 3000",       lat: -37.8136, lng: 144.9631, type: "consulate" },
  { id: 102, country: "New Zealand", city: "Wellington", address: "Level 13, 111 The Terrace, Wellington 6011",        lat: -41.2796, lng: 174.7778, type: "embassy"   },
];

// Categories that auto-fetch from OpenStreetMap Overpass API
export const OSM_CATS = new Set(['hospital', 'police', 'school']);

export const CATEGORIES = {
  embassy:   { label: "שגרירות",    color: "#1565C0", emoji: "🏛️" },
  consulate: { label: "קונסוליה",   color: "#0288D1", emoji: "🏢" },
  hospital:  { label: "בית חולים", color: "#C62828", emoji: "🏥" },
  school:    { label: "בית ספר",   color: "#2E7D32", emoji: "🏫" },
  safe_zone: { label: "אזור מאובטח",color: "#F57F17", emoji: "🛡️" },
  police:    { label: "משטרה",      color: "#4A148C", emoji: "👮" },
  chabad:    { label: "בית חב\"ד",  color: "#6A1B9A", emoji: "🕎" },
  other:     { label: "אחר",        color: "#546E7A", emoji: "📍" },
};

// Static dataset (not live OSM) — see public/data/chabad-houses.json
export const STATIC_CATS = new Set(['chabad']);

export default embassies;
