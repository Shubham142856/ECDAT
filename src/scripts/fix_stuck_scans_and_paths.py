"""Fix stuck queued scans and normalize artifact paths in ECDAT."""
import os
import shutil
import sqlite3
from pathlib import Path

def main():
    root = Path("D:/ecdat")
    db_path = root / "ecdat.db"
    uploads_root = root / "uploads"
    uploads_src = root / "src" / "uploads"

    uploads_root.mkdir(parents=True, exist_ok=True)
    uploads_src.mkdir(parents=True, exist_ok=True)

    # 1. Sync uploads across both locations
    print("1. Syncing uploads between D:/ecdat/uploads and D:/ecdat/src/uploads...")
    for src_dir, dst_dir in [(uploads_root, uploads_src), (uploads_src, uploads_root)]:
        for p in src_dir.rglob("*"):
            if p.is_file():
                rel = p.relative_to(src_dir)
                target = dst_dir / rel
                if not target.exists():
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(p, target)
                    print(f"  Copied {p} -> {target}")

    # 2. Update database
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Update stuck queued scans
    cursor.execute(
        "UPDATE scans SET state = 'failed', error_message = 'Previous scan interrupted before Unicode bug fix; please trigger a new scan.' WHERE state = 'queued'"
    )
    stuck_count = cursor.rowcount
    print(f"2. Updated {stuck_count} stuck queued scans to 'failed'.")

    # Update artifacts to have existing absolute paths
    artifacts = cursor.execute("SELECT artifact_id, project_id, stored_path FROM artifacts").fetchall()
    updated_artifacts = 0
    for art_id, proj_id, stored_path in artifacts:
        p = Path(stored_path)
        canonical = uploads_root / proj_id / art_id
        if canonical.exists():
            new_path = str(canonical.resolve())
            if new_path != stored_path:
                cursor.execute("UPDATE artifacts SET stored_path = ? WHERE artifact_id = ?", (new_path, art_id))
                updated_artifacts += 1
                print(f"  Normalized artifact {art_id} -> {new_path}")
        else:
            # Check if stored_path relative to root exists
            if (root / stored_path).exists():
                new_path = str((root / stored_path).resolve())
                cursor.execute("UPDATE artifacts SET stored_path = ? WHERE artifact_id = ?", (new_path, art_id))
                updated_artifacts += 1
                print(f"  Normalized artifact {art_id} -> {new_path}")

    conn.commit()
    conn.close()
    print(f"3. Updated {updated_artifacts} artifact paths.")
    print("Done!")

if __name__ == "__main__":
    main()
