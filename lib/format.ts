// Formato de fechas para la UI. Los 7 jugadores están en Colombia, así que
// fijamos America/Bogota: los Server Components renderizan en UTC en Vercel y
// sin timeZone explícita mostrarían la hora del servidor.
const KICKOFF_FORMAT = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Bogota",
});

export function kickoffLabel(iso: string): string {
  if (!iso) return "";
  return KICKOFF_FORMAT.format(new Date(iso));
}
