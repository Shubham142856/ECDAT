/**
 * Global active project state manager for ECDAT Dashboard.
 * Syncs active project across pages via localStorage and URL parameter.
 */

const STORAGE_KEY = "ecdat_active_project_id";

export function getStoredProjectId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const search = window.location?.search;
    if (search) {
      const urlParam = new URLSearchParams(search).get("project");
      if (urlParam) {
        try { localStorage.setItem(STORAGE_KEY, urlParam); } catch {}
        return urlParam;
      }
    }
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredProjectId(projectId: string): void {
  if (typeof window === "undefined" || !projectId) return;
  try {
    localStorage.setItem(STORAGE_KEY, projectId);
  } catch {}
}
