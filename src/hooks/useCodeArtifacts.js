import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCodeArtifact,
  deleteCodeArtifact,
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
  const [selectedId, setSelectedId] = useState(null);

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

  const filteredArtifacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return artifacts.filter((artifact) => {
      const text = [
        artifact.title,
        artifact.language,
        artifact.collection,
        artifact.summary,
        artifact.code,
        ...artifact.tags,
      ]
        .join(" ")
        .toLowerCase();
      const queryMatches = !normalizedQuery || text.includes(normalizedQuery);
      const languageMatches = language === "all" || artifact.language === language;

      return queryMatches && languageMatches;
    });
  }, [artifacts, language, query]);

  const selectedArtifact = useMemo(() => {
    return (
      artifacts.find((artifact) => artifact.id === selectedId) ??
      filteredArtifacts[0] ??
      artifacts[0] ??
      null
    );
  }, [artifacts, filteredArtifacts, selectedId]);

  const metrics = useMemo(() => summarizeCodeArtifacts(artifacts), [artifacts]);

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
      return null;
    }

    setArtifacts((current) => [response.data, ...current]);
    setSelectedId(response.data.id);
    return response.data;
  }, []);

  const markSelectedAsOpened = useCallback(async () => {
    if (!selectedArtifact) return null;

    const response = await updateCodeArtifact(selectedArtifact.id, {
      usageCount: selectedArtifact.usageCount + 1,
    });

    if (!response.ok) {
      setError(response.error.message);
      return null;
    }

    setArtifacts((current) =>
      current.map((artifact) =>
        artifact.id === response.data.id ? response.data : artifact,
      ),
    );
    return response.data;
  }, [selectedArtifact]);

  const removeSelectedArtifact = useCallback(async () => {
    if (!selectedArtifact) return null;

    const response = await deleteCodeArtifact(selectedArtifact.id);
    if (!response.ok) {
      setError(response.error.message);
      return null;
    }

    setArtifacts((current) => {
      const next = current.filter((artifact) => artifact.id !== selectedArtifact.id);
      setSelectedId(next[0]?.id ?? null);
      return next;
    });
    return response.data;
  }, [selectedArtifact]);

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
    languages,
    metrics,
    createStarterArtifact,
    markSelectedAsOpened,
    removeSelectedArtifact,
    refreshArtifacts,
  };
}
