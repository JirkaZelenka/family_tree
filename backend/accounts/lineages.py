import re
from pathlib import Path

from django.conf import settings

LINEAGE_RE = re.compile(r"^lineage:\s*[\"']?([^\"'\n#]+)", re.MULTILINE)

# Česká abeceda včetně ch (po h) a diakritiky (s < š < t …).
_CZECH_LETTER_ORDER = {
    "a": "01",
    "á": "02",
    "b": "03",
    "c": "04",
    "č": "05",
    "d": "06",
    "ď": "07",
    "e": "08",
    "é": "09",
    "ě": "10",
    "f": "11",
    "g": "12",
    "h": "13",
    # "ch" → "14" (digraph, handled in czech_sort_key)
    "i": "15",
    "í": "16",
    "j": "17",
    "k": "18",
    "l": "19",
    "m": "20",
    "n": "21",
    "ň": "22",
    "o": "23",
    "ó": "24",
    "p": "25",
    "q": "26",
    "r": "27",
    "ř": "28",
    "s": "29",
    "š": "30",
    "t": "31",
    "ť": "32",
    "u": "33",
    "ú": "34",
    "ů": "35",
    "v": "36",
    "w": "37",
    "x": "38",
    "y": "39",
    "ý": "40",
    "z": "41",
    "ž": "42",
}


def czech_sort_key(text: str) -> str:
    """Klíč pro abecední řazení podle české abecedy (s-š-t, ch po h, …)."""
    s = str(text).casefold()
    parts: list[str] = []
    i = 0
    while i < len(s):
        if s.startswith("ch", i):
            parts.append("14")
            i += 2
            continue
        ch = s[i]
        parts.append(_CZECH_LETTER_ORDER.get(ch, f"99{ord(ch):04x}"))
        i += 1
    return "".join(parts)


def sort_lineage_keys(keys: set[str] | list[str]) -> list[str]:
    return sorted(keys, key=czech_sort_key)


def prefer_lineage_key(existing: str, candidate: str) -> str:
    """Preferuj kanonický zápis s velkým písmenem před čistě malým (zelenkovi → Zelenkovi)."""
    existing_all_lower = existing == existing.lower()
    candidate_all_lower = candidate == candidate.lower()
    if existing_all_lower and not candidate_all_lower:
        return candidate
    return existing


def upsert_lineage_key(by_fold: dict[str, str], key: str) -> None:
    cleaned = str(key).strip()
    if not cleaned:
        return
    fold = cleaned.casefold()
    current = by_fold.get(fold)
    if current is None:
        by_fold[fold] = cleaned
        return
    by_fold[fold] = prefer_lineage_key(current, cleaned)


def dedupe_lineage_keys(keys: set[str] | list[str]) -> list[str]:
    """Jedna volba na rod bez ohledu na velikost písmen (kanonický zápis)."""
    by_fold: dict[str, str] = {}
    for key in keys:
        upsert_lineage_key(by_fold, key)
    return sort_lineage_keys(by_fold.values())


def canonicalize_lineage_keys(
    keys: list[str],
    canonical: list[str] | set[str],
) -> list[str]:
    """Převede uložené klíče na kanonické názvy z vaultu (case-insensitive)."""
    canon_by_fold = {key.casefold(): key for key in canonical}
    result: list[str] = []
    seen: set[str] = set()
    for key in keys:
        cleaned = str(key).strip()
        if not cleaned:
            continue
        mapped = canon_by_fold.get(cleaned.casefold(), cleaned)
        fold = mapped.casefold()
        if fold in seen:
            continue
        seen.add(fold)
        result.append(mapped)
    return sort_lineage_keys(result)


def vault_people_dirs() -> list[Path]:
    """Jen živá data — šablony (templates/data) se do adminu/grafu nenačítají."""
    root = Path(settings.BASE_DIR).resolve().parent
    return [root / "data" / "people"]


def discover_lineage_keys() -> list[str]:
    by_fold: dict[str, str] = {}
    for directory in vault_people_dirs():
        if not directory.is_dir():
            continue
        for path in directory.glob("*.md"):
            try:
                text = path.read_text(encoding="utf-8")
            except OSError:
                continue
            match = LINEAGE_RE.search(text)
            if not match:
                continue
            key = match.group(1).strip().strip("'\"")
            upsert_lineage_key(by_fold, key)
    return sort_lineage_keys(by_fold.values())
