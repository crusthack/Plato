#!/usr/bin/env python3
"""Create a Chrome Web Store-ready PLATO Classic ZIP in the parent folder."""

from __future__ import annotations

import json
import os
import tempfile
import zipfile
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
RUNTIME_ENTRIES = (
    Path("manifest.json"),
    Path("src"),
    Path("styles"),
    Path("popup"),
    Path("templates"),
    Path("assets"),
)
IGNORED_NAMES = {".DS_Store", "Thumbs.db", "__pycache__"}
IGNORED_SUFFIXES = {".map", ".pyc", ".pyo"}


def read_version() -> str:
    manifest_path = PROJECT_ROOT / "manifest.json"
    with manifest_path.open(encoding="utf-8") as manifest_file:
        manifest = json.load(manifest_file)

    version = str(manifest.get("version", "")).strip()
    if not version or any(character not in "0123456789." for character in version):
        raise ValueError("manifest.json contains an invalid or missing version")
    return version


def should_include(path: Path) -> bool:
    relative = path.relative_to(PROJECT_ROOT)
    return (
        not any(part in IGNORED_NAMES for part in relative.parts)
        and path.suffix.lower() not in IGNORED_SUFFIXES
        and path.is_file()
        and not path.is_symlink()
    )


def runtime_files() -> list[Path]:
    files: list[Path] = []
    for entry in RUNTIME_ENTRIES:
        source = PROJECT_ROOT / entry
        if not source.exists():
            raise FileNotFoundError(f"Required extension entry is missing: {entry.as_posix()}")
        if source.is_file():
            if should_include(source):
                files.append(source)
            continue
        files.extend(path for path in source.rglob("*") if should_include(path))
    return sorted(set(files), key=lambda path: path.relative_to(PROJECT_ROOT).as_posix())


def build_archive() -> Path:
    version = read_version()
    destination = PROJECT_ROOT.parent / f"plato-classic-{version}.zip"
    files = runtime_files()
    if not files:
        raise RuntimeError("No extension runtime files were found")

    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            prefix=f".{destination.stem}-",
            suffix=".tmp",
            dir=destination.parent,
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)

        with zipfile.ZipFile(
            temporary_path,
            mode="w",
            compression=zipfile.ZIP_DEFLATED,
            compresslevel=9,
        ) as archive:
            for source in files:
                archive.write(source, source.relative_to(PROJECT_ROOT).as_posix())

        os.replace(temporary_path, destination)
        temporary_path = None
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)

    print(f"Created {destination}")
    print(f"Included {len(files)} runtime files")
    return destination


if __name__ == "__main__":
    build_archive()
