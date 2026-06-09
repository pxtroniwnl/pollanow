// Mapeo de nombres de equipo del proveedor (ingles) -> codigo interno.
// Normaliza acentos/puntuacion y admite alias por equipo.

const ALIASES: Record<string, string[]> = {
  CHEQUIA: ["czechia", "czech republic"],
  COREA: ["south korea", "korea republic", "korea", "republic of korea"],
  MEXICO: ["mexico"],
  SUDAFRICA: ["south africa"],
  SUIZA: ["switzerland"],
  BOSNIA: ["bosnia and herzegovina", "bosnia herzegovina", "bosnia"],
  CANADA: ["canada"],
  QATAR: ["qatar"],
  BRASIL: ["brazil"],
  MARRUECOS: ["morocco"],
  ESCOCIA: ["scotland"],
  HAITI: ["haiti"],
  TURQUIA: ["turkiye", "turkey"],
  EEUU: ["united states", "usa", "united states of america"],
  PARAGUAY: ["paraguay"],
  AUSTRALIA: ["australia"],
  ALEMANIA: ["germany"],
  ECUADOR: ["ecuador"],
  CDMARFIL: ["cote divoire", "ivory coast", "cote d ivoire"],
  CURAZAO: ["curacao"],
  JAPON: ["japan"],
  HOLANDA: ["netherlands", "holland"],
  SUECIA: ["sweden"],
  TUNEZ: ["tunisia"],
  BELGICA: ["belgium"],
  EGIPTO: ["egypt"],
  NZELANDA: ["new zealand"],
  IRAN: ["iran", "ir iran", "islamic republic of iran"],
  ESPAÑA: ["spain"],
  SAUDITA: ["saudi arabia"],
  URUGUAY: ["uruguay"],
  CABOVERDE: ["cape verde", "cabo verde", "cape verde islands"],
  NORUEGA: ["norway"],
  SENEGAL: ["senegal"],
  FRANCIA: ["france"],
  IRAK: ["iraq"],
  ARGENTINA: ["argentina"],
  AUSTRIA: ["austria"],
  JORDANIA: ["jordan"],
  ARGELIA: ["algeria"],
  COLOMBIA: ["colombia"],
  PORTUGAL: ["portugal"],
  CONGO: ["congo", "dr congo", "congo dr", "democratic republic of congo"],
  UZBEKISTAN: ["uzbekistan"],
  CROACIA: ["croatia"],
  INGLATERRA: ["england"],
  GHANA: ["ghana"],
  PANAMA: ["panama"],
};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ") // guiones/puntuacion -> espacio (Bosnia-Herzegovina)
    .replace(/\s+/g, " ")
    .trim();
}

const LOOKUP = new Map<string, string>();
for (const [code, names] of Object.entries(ALIASES)) {
  LOOKUP.set(normalize(code), code);
  for (const n of names) LOOKUP.set(normalize(n), code);
}

/** Resuelve un nombre del proveedor a nuestro codigo interno, o null. */
export function resolveTeamCode(providerName: string): string | null {
  if (!providerName) return null;
  return LOOKUP.get(normalize(providerName)) ?? null;
}
