import re
from pathlib import Path

from django.conf import settings

LINEAGE_RE = re.compile(r"^lineage:\s*[\"']?([^\"'\n#]+)", re.MULTILINE)


def vault_people_dirs() -> list[Path]:
    root = Path(settings.BASE_DIR).resolve().parent
    return [root / "data" / "people", root / "templates" / "data" / "people"]


def discover_lineage_keys() -> list[str]:
    keys: set[str] = set()
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
            if key:
                keys.add(key)
    return sorted(keys)
