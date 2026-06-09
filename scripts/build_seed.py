#!/usr/bin/env python3
"""Transcribe data/data-polla.xlsx -> data/seed.json (determinista).

xlsx = zip de XML. Leemos sharedStrings + la grilla de sheet1 sin dependencias.
Salida: groups, teams (con grupo real, ISO, bandera, elo), players,
predictions (orden 1-4 por persona y grupo) y tiebreaks (2 grupos del goleador).
"""
import json
import os
import re
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, "data", "data-polla.xlsx")
OUT = os.path.join(ROOT, "data", "seed.json")

# --- Metadatos por equipo: code -> (nombre display, ISO/flag, elo aprox) ---
# Elo aproximado (eloratings.net, junio 2026) — base para el modelo de prob.
TEAM_META = {
    "CHEQUIA":   ("Chequia", "CZ", 1790),
    "COREA":     ("Corea del Sur", "KR", 1740),
    "MEXICO":    ("México", "MX", 1700),
    "SUDAFRICA": ("Sudáfrica", "ZA", 1620),
    "SUIZA":     ("Suiza", "CH", 1850),
    "BOSNIA":    ("Bosnia", "BA", 1680),
    "CANADA":    ("Canadá", "CA", 1730),
    "QATAR":     ("Catar", "QA", 1560),
    "BRASIL":    ("Brasil", "BR", 2010),
    "MARRUECOS": ("Marruecos", "MA", 1860),
    "ESCOCIA":   ("Escocia", "🏴SCT", 1740),
    "HAITI":     ("Haití", "HT", 1500),
    "TURQUIA":   ("Turquía", "TR", 1820),
    "EEUU":      ("Estados Unidos", "US", 1770),
    "PARAGUAY":  ("Paraguay", "PY", 1700),
    "AUSTRALIA": ("Australia", "AU", 1730),
    "ALEMANIA":  ("Alemania", "DE", 1960),
    "ECUADOR":   ("Ecuador", "EC", 1810),
    "CDMARFIL":  ("Costa de Marfil", "CI", 1760),
    "CURAZAO":   ("Curazao", "CW", 1530),
    "JAPON":     ("Japón", "JP", 1850),
    "HOLANDA":   ("Países Bajos", "NL", 1980),
    "SUECIA":    ("Suecia", "SE", 1760),
    "TUNEZ":     ("Túnez", "TN", 1690),
    "BELGICA":   ("Bélgica", "BE", 1930),
    "EGIPTO":    ("Egipto", "EG", 1730),
    "NZELANDA":  ("Nueva Zelanda", "NZ", 1520),
    "IRAN":      ("Irán", "IR", 1800),
    "ESPAÑA":    ("España", "ES", 2050),
    "SAUDITA":   ("Arabia Saudita", "SA", 1640),
    "URUGUAY":   ("Uruguay", "UY", 1900),
    "CABOVERDE": ("Cabo Verde", "CV", 1620),
    "NORUEGA":   ("Noruega", "NO", 1820),
    "SENEGAL":   ("Senegal", "SN", 1860),
    "FRANCIA":   ("Francia", "FR", 2040),
    "IRAK":      ("Irak", "IQ", 1640),
    "ARGENTINA": ("Argentina", "AR", 2100),
    "AUSTRIA":   ("Austria", "AT", 1820),
    "JORDANIA":  ("Jordania", "JO", 1620),
    "ARGELIA":   ("Argelia", "DZ", 1780),
    "COLOMBIA":  ("Colombia", "CO", 1910),
    "PORTUGAL":  ("Portugal", "PT", 2000),
    "CONGO":     ("Congo", "CG", 1580),
    "UZBEKISTAN":("Uzbekistán", "UZ", 1660),
    "CROACIA":   ("Croacia", "HR", 1920),
    "INGLATERRA":("Inglaterra", "🏴ENG", 1970),
    "GHANA":     ("Ghana", "GH", 1710),
    "PANAMA":    ("Panamá", "PA", 1660),
}

NAME_FIXES = {"ARGENTINIA": "ARGENTINA"}
GROUPS = list("ABCDEFGHIJKL")
PEOPLE = [("David", 1), ("Matias", 8), ("Polo", 15), ("Patron", 22),
          ("Otto", 29), ("Yezid", 36), ("Mayra", 44)]
# Columna M referencia el label del grupo via indice de sharedString.
GLABELS = {69: "J", 70: "I", 71: "H", 72: "G", 73: "C",
           74: "K", 75: "L", 76: "E", 77: "A"}


def flag_emoji(iso: str) -> str:
    if iso == "🏴SCT":
        return "🏴\U000e0067\U000e0062\U000e0073\U000e0063\U000e0074\U000e007f"
    if iso == "🏴ENG":
        return "🏴\U000e0067\U000e0062\U000e0065\U000e006e\U000e0067\U000e007f"
    return "".join(chr(0x1F1E6 + ord(c) - ord("A")) for c in iso)


def col_to_idx(col: str) -> int:
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch) - 64)
    return n


def load_grid():
    with zipfile.ZipFile(XLSX) as z:
        ss = z.read("xl/sharedStrings.xml").decode("utf-8")
        sheet = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
    strings = re.findall(r"<si>(.*?)</si>", ss, re.S)
    S = ["".join(re.findall(r"<t[^>]*>(.*?)</t>", s, re.S)) for s in strings]
    grid = {}
    for rn, body in re.findall(r'<row[^>]*r="(\d+)"[^>]*>(.*?)</row>', sheet, re.S):
        for col, r, attrs, cbody in re.findall(
            r'<c r="([A-Z]+)(\d+)"([^>]*)>(.*?)</c>', body, re.S
        ):
            t = "n"
            m = re.search(r't="([^"]+)"', attrs)
            if m:
                t = m.group(1)
            vm = re.search(r"<v>(.*?)</v>", cbody, re.S)
            v = vm.group(1) if vm else ""
            disp = S[int(v)] if (t == "s" and v) else v
            grid[(int(rn), col_to_idx(col))] = disp.strip()
    return grid


def norm(x: str) -> str:
    x = x.strip().upper()
    return NAME_FIXES.get(x, x)


def main():
    grid = load_grid()
    predictions = {}
    tiebreaks = {}
    for name, base in PEOPLE:
        hdr = base + 1  # fila de labels "Grupo X"
        preds = {}
        for gi, g in enumerate(GROUPS):
            col = gi + 1
            preds[g] = [norm(grid.get((hdr + 1 + p, col), "")) for p in range(4)]
        predictions[name] = preds
        tb = []
        for rr in (hdr + 1, hdr + 2):
            val = grid.get((rr, 13), "")
            if val:
                tb.append(GLABELS.get(int(val), val))
        tiebreaks[name] = tb

    # Composicion real de cada grupo = set de equipos (consistente entre personas).
    group_teams = {g: set() for g in GROUPS}
    for preds in predictions.values():
        for g in GROUPS:
            group_teams[g].update(preds[g])
    # Verificacion: 4 equipos por grupo, 48 unicos en total.
    all_teams = []
    for g in GROUPS:
        assert len(group_teams[g]) == 4, f"Grupo {g} no tiene 4 equipos: {group_teams[g]}"
        all_teams.extend(group_teams[g])
    assert len(set(all_teams)) == 48, f"No hay 48 equipos unicos: {len(set(all_teams))}"

    teams = []
    for g in GROUPS:
        for code in sorted(group_teams[g]):
            disp, iso, elo = TEAM_META[code]
            teams.append({
                "code": code, "name": disp, "group": g,
                "flag": flag_emoji(iso), "elo": elo,
            })

    data = {
        "groups": [{"id": g, "name": f"Grupo {g}"} for g in GROUPS],
        "teams": teams,
        "players": [name for name, _ in PEOPLE],
        "predictions": predictions,
        "tiebreaks": tiebreaks,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"OK -> {OUT}: {len(teams)} equipos, {len(PEOPLE)} jugadores, "
          f"{sum(len(p) for p in predictions.values())} grupos predichos")


if __name__ == "__main__":
    main()
