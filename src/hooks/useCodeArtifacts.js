import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCodeArtifact,
  deleteCodeArtifact,
  importCodeArtifacts,
  listCodeArtifacts,
  summarizeCodeArtifacts,
  updateCodeArtifact,
} from "../services/codeArtifactRepository.js";

const starterArtifact = {
  title: "New deployment helper",
  language: "JavaScript",
  tags: ["deployment", "automation"],
  collection: "Delivery Automation",
  summary: "Generated from the dashboard quick-create action.",
  code: `export async function waitForDeployment(check) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 120000) {
    const status = await check();
    if (status === "ready") return true;
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }

  throw new Error("Deployment did not become ready in time.");
}`,
  usageCount: 1,
};

export function useCodeArtifacts() {
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [artifacts, setArtifacts] = useState([]);
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [tag, setTag] = useState("all");
  const [collection, setCollection] = useState("all");
  const [sortBy, setSortBy] = useState("updated");
  const [selectedId, setSelectedId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const refreshArtifacts = useCallback(async () => {
    setStatus("loading");
    setError(null);

    const response = await listCodeArtifacts();
    if (!response.ok) {
      setStatus("error");
      setError(response.error.message);
      setArtifacts([]);
      return;
    }

    setArtifacts(response.data);
    setSelectedId((current) => current ?? response.data[0]?.id ?? null);
    setStatus("ready");
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialArtifacts() {
      const response = await listCodeArtifacts();
      if (!active) return;

      if (!response.ok) {
        setStatus("error");
        setError(response.error.message);
        setArtifacts([]);
        return;
      }

      setArtifacts(response.data);
      setSelectedId(response.data[0]?.id ?? null);
      setStatus("ready");
    }

    loadInitialArtifacts();

    return () => {
      active = false;
    };
  }, []);

  const languages = useMemo(
    () => ["all", ...new Set(artifacts.map((artifact) => artifact.language))],
    [artifacts],
  );

  const tags = useMemo(
    () => ["all", ...new Set(artifacts.flatMap((artifact) => artifact.tags))],
    [artifacts],
  );

  const collections = useMemo(
    () => ["all", ...new Set(artifacts.map((artifact) => artifact.collection))],
    [artifacts],
  );

  const filteredArtifacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const visibleArtifacts = artifacts.filter((artifact) => {
      const text = [
        artifact.title,
        artifact.language,
        artifact.collection,
        artifact.summary,
        artifact.code,
        artifact.source,
        ...artifact.tags,
      ]
        .join(" ")
        .toLowerCase();
      const queryMatches = !normalizedQuery || text.includes(normalizedQuery);
      const languageMatches = language === "all" || artifact.language === language;
      const tagMatches = tag === "all" || artifact.tags.includes(tag);
      const collectionMatches = collection === "all" || artifact.collection === collection;
      const quickViewMatches =
        (sortBy !== "favorites" || artifact.favorite) &&
        (sortBy !== "pinned" || artifact.pinned);

      return (
        queryMatches &&
        languageMatches &&
        tagMatches &&
        collectionMatches &&
        quickViewMatches
      );
    });

    return [...visibleArtifacts].sort((a, b) => {
      const pinnedPriority = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      if (pinnedPriority) return pinnedPriority;

      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "language") return a.language.localeCompare(b.language);
      if (sortBy === "usage") return b.usageCount - a.usageCount;
      if (sortBy === "size") return b.code.length - a.code.length;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [artifacts, collection, language, query, sortBy, tag]);

  const selectedArtifact = useMemo(() => {
    return (
      artifacts.find((artifact) => artifact.id === selectedId) ??
      filteredArtifacts[0] ??
      artifacts[0] ??
      null
    );
  }, [artifacts, filteredArtifacts, selectedId]);

  const metrics = useMemo(() => summarizeCodeArtifacts(artifacts), [artifacts]);

  const createArtifact = useCallback(async (input) => {
    const response = await createCodeArtifact(input);

    if (!response.ok) {
      setError(response.error.message);
      setFeedback({ type: "error", message: response.error.message });
      return null;
    }

    setArtifacts((current) => [response.data, ...current]);
    setSelectedId(response.data.id);
    setFeedback({ type: "success", message: "Script saved to the archive." });
    return response.data;
  }, []);

  const createStarterArtifact = useCallback(async () => {
    const response = await createCodeArtifact({
      ...starterArtifact,
      title: `${starterArtifact.title} ${new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    });

    if (!response.ok) {
      setError(response.error.message);
      setFeedback({ type: "error", message: response.error.message });
      return null;
    }

    setArtifacts((current) => [response.data, ...current]);
    setSelectedId(response.data.id);
    setFeedback({ type: "success", message: "Starter script added." });
    return response.data;
  }, []);

  const updateArtifactById = useCallback(async (id, patch, successMessage = "Script updated.") => {
    const response = await updateCodeArtifact(id, patch);

    if (!response.ok) {
      setError(response.error.message);
      setFeedback({ type: "error", message: response.error.message });
      return null;
    }

    setArtifacts((current) =>
      current.map((artifact) =>
        artifact.id === response.data.id ? response.data : artifact,
      ),
    );
    setSelectedId(response.data.id);
    if (successMessage) {
      setFeedback({ type: "success", message: successMessage });
    }
    return response.data;
  }, []);

  const updateSelectedArtifact = useCallback(
    async (patch) => {
      if (!selectedArtifact) return null;
      return updateArtifactById(selectedArtifact.id, patch, "Script changes saved.");
    },
    [selectedArtifact, updateArtifactById],
  );

  const markSelectedAsOpened = useCallback(async (patch = null, successMessage = null) => {
    if (!selectedArtifact) return null;

    const updatePatch =
      patch && typeof patch === "object"
        ? patch
        : {
            usageCount: selectedArtifact.usageCount + 1,
            lastOpenedAt: new Date().toISOString(),
          };

    return updateArtifactById(selectedArtifact.id, updatePatch, successMessage);
  }, [selectedArtifact, updateArtifactById]);

  const removeSelectedArtifact = useCallback(async () => {
    if (!selectedArtifact) return null;

    const response = await deleteCodeArtifact(selectedArtifact.id);
    if (!response.ok) {
      setError(response.error.message);
      setFeedback({ type: "error", message: response.error.message });
      return null;
    }

    setArtifacts((current) => {
      const next = current.filter((artifact) => artifact.id !== selectedArtifact.id);
      setSelectedId(next[0]?.id ?? null);
      return next;
    });
    setFeedback({ type: "success", message: "Script removed from the archive." });
    return response.data;
  }, [selectedArtifact]);

  const exportArtifacts = useCallback(() => {
    const payload = {
      product: "CodeArch",
      exportedAt: new Date().toISOString(),
      artifacts,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "codearch-snippet-archive.json";
    link.click();
    URL.revokeObjectURL(url);
    setFeedback({ type: "success", message: "Archive export started." });
  }, [artifacts]);

  const importArtifacts = useCallback(async (file) => {
    if (!file) return null;

    try {
      const payload = JSON.parse(await file.text());
      const imported = Array.isArray(payload) ? payload : payload.artifacts;
      const response = await importCodeArtifacts(imported);

      if (!response.ok) {
        setError(response.error.message);
        setFeedback({ type: "error", message: response.error.message });
        return null;
      }

      setArtifacts(response.data);
      setSelectedId(response.data[0]?.id ?? null);
      setFeedback({
        type: "success",
        message: `${response.meta.imported} script${response.meta.imported === 1 ? "" : "s"} imported.`,
      });
      return response.data;
    } catch {
      const message = "Import failed. Choose a valid CodeArch JSON archive.";
      setError(message);
      setFeedback({ type: "error", message });
      return null;
    }
  }, []);

  return {
    artifacts,
    filteredArtifacts,
    selectedArtifact,
    selectedId,
    setSelectedId,
    status,
    error,
    query,
    setQuery,
    language,
    setLanguage,
    tag,
    setTag,
    tags,
    collection,
    setCollection,
    collections,
    sortBy,
    setSortBy,
    languages,
    metrics,
    feedback,
    setFeedback,
    createArtifact,
    createStarterArtifact,
    updateArtifactById,
    updateSelectedArtifact,
    markSelectedAsOpened,
    removeSelectedArtifact,
    exportArtifacts,
    importArtifacts,
    refreshArtifacts,
  };
}
