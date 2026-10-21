
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import KnowledgeTreeBackground from "../components/KnowledgeTreeBackground";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  FileText,
  Folder,
  FolderPlus,
  Globe,
  Grid2X2,
  LayoutList,
  LoaderCircle,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  position?: number;
};

type Resource = {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
  categoryId?: string | null;
  note: string;
  domain: string;
  bookmarked: boolean;
  date: string;
  faviconUrl: string;
  position?: number;
};

type ApiCategory = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  position?: number;
};

type ApiResource = {
  id: string;
  title: string;
  url: string;
  domain?: string | null;
  description?: string | null;
  note?: string | null;
  faviconUrl?: string | null;
  bookmarked: boolean;
  position?: number;
  categoryId?: string | null;
  createdAt: string;
};

type WebSearchResult = {
  title: string;
  url: string;
  description: string;
  domain: string;
};
type ResourceDraft = {
  title: string;
  url: string;
  category: string;
  description: string;
  note: string;
};

const DEFAULT_COLOR = "#7774d9";

const COLORS = [
  "#8b8cf7",
  "#e5a45d",
  "#6b9b83",
  "#e47d91",
  "#527ba9",
  "#a17ac4",
  "#d2a74e",
  "#6e9fa0",
];

const EMPTY_RESOURCE: ResourceDraft = {
  title: "",
  url: "",
  category: "",
  description: "",
  note: "",
};

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getFavicon(url: string) {
  const domain = getDomain(url);
  return domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
    : "";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function mapResource(resource: ApiResource): Resource {
  return {
    id: resource.id,
    title: resource.title,
    url: resource.url,
    description: resource.description || "",
    category: resource.categoryId || "uncategorized",
    categoryId: resource.categoryId ?? null,
    note: resource.note || "",
    domain: resource.domain || getDomain(resource.url),
    bookmarked: resource.bookmarked,
    date: formatDate(resource.createdAt),
    faviconUrl: resource.faviconUrl || getFavicon(resource.url),
    position: resource.position ?? 0,
  };
}

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : typeof data.message === "string"
          ? data.message
          : `Request failed (${response.status})`
    );
  }

  return data;
}

export default function HomePage() {
  const [dashboardSlogan, setDashboardSlogan] = useState("Your knowledge, collected.");

  useEffect(() => {
    const hour = new Date().getHours();

    const morning = [
      "Good morning. Your next big idea starts here.",
      "A fresh day, a mind full of possibilities.",
      "Start curious. See where it takes you.",
      "New day, new things worth discovering.",
      "Your next favorite idea might be one search away."
    ];

    const afternoon = [
      "Collect the ideas worth coming back to.",
      "Your curiosity is building something great.",
      "A little discovery can go a long way.",
      "Keep the good ideas close.",
      "Make room for one more interesting thought."
    ];

    const evening = [
      "Take a breath. Your ideas are right where you left them.",
      "A little inspiration for the rest of your day.",
      "Good ideas deserve a place to stay.",
      "Unwind, explore, and follow your curiosity.",
      "Today’s discoveries can inspire tomorrow."
    ];

    const night = [
      "Quiet moments. Curious thoughts. Your own little library.",
      "The world can wait. Your ideas are safe here.",
      "One last thought before you call it a day?",
      "Let your curiosity wander a little.",
      "Rest easy. Your discoveries are right here."
    ];

    const choices = hour >= 5 && hour < 12
      ? morning
      : hour >= 12 && hour < 17
        ? afternoon
        : hour >= 17 && hour < 21
          ? evening
          : night;

    setDashboardSlogan(choices[Math.floor(Math.random() * choices.length)]);
  }, []);
  const [activeCategory, setActiveCategory] = useState("dashboard");
  const [resourceReturnCategory, setResourceReturnCategory] = useState("dashboard");
  const [categories, setCategories] = useState<Category[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  const [query, setQuery] = useState("");
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [sort, setSort] = useState<"newest" | "oldest" | "az">("newest");
  const [view, setView] = useState<"grid" | "list">("grid");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [menuId, setMenuId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [modal, setModal] = useState<
    "resource" | "category" | "settings" | null
  >(null);

  const [editingResource, setEditingResource] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  const [resourceDraft, setResourceDraft] =
    useState<ResourceDraft>(EMPTY_RESOURCE);

  const [websiteMetadata, setWebsiteMetadata] = useState<{
    url: string;
    title: string;
    description: string;
    content: string;
  } | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataMessage, setMetadataMessage] = useState("");

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryColor, setCategoryColor] = useState(DEFAULT_COLOR);

  const [settingsKey, setSettingsKey] = useState("");
  const [showSettingsKey, setShowSettingsKey] = useState(false);
  const [groqConfigured, setGroqConfigured] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSavedResults, setAiSavedResults] = useState<Resource[]>([]);
  const [aiWebResults, setAiWebResults] = useState<WebSearchResult[]>([]);
  const [aiOverview, setAiOverview] = useState("");
  const [aiOverviewBusy, setAiOverviewBusy] = useState(false);
  const [webResultMenu, setWebResultMenu] = useState<string | null>(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [descriptionMessage, setDescriptionMessage] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 9;

  const loadLibrary = useCallback(async () => {
    setError("");

    try {
      const [categoryResponse, resourceResponse] = await Promise.all([
        fetch("/api/categories", { cache: "no-store" }),
        fetch("/api/resources", { cache: "no-store" }),
      ]);

      const categoryData = await readJson(categoryResponse);
      const resourceData = await readJson(resourceResponse);

      const apiCategories: ApiCategory[] = categoryData.categories ?? [];
      const apiResources: ApiResource[] = resourceData.resources ?? [];

      setCategories(
        apiCategories
          .map((category) => ({
            id: category.id,
            name: category.name,
            description: category.description || "",
            color: category.color || DEFAULT_COLOR,
            icon: category.icon || "folder",
            position: category.position ?? 0,
          }))
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      );

      setResources(
        apiResources
          .map(mapResource)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't load your library. Check your server and database."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, query, bookmarksOnly, sort]);

  const active = categories.find((category) => category.id === activeCategory);
  const bookmarkCount = resources.filter((resource) => resource.bookmarked).length;

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    let items = resources.filter((resource) => {
      const matchesCategory =
        activeCategory === "all" ||
        (activeCategory === "bookmarks"
          ? resource.bookmarked
          : resource.category === activeCategory);

      const matchesBookmarkFilter =
        !bookmarksOnly || resource.bookmarked;

      const matchesQuery =
        !normalizedQuery ||
        [
          resource.title,
          resource.url,
          resource.domain,
          resource.description,
          resource.note,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesCategory && matchesBookmarkFilter && matchesQuery;
    });

    if (sort === "oldest") {
      items = [...items].reverse();
    } else if (sort === "az") {
      items = [...items].sort((a, b) => a.title.localeCompare(b.title));
    }

    return items;
  }, [resources, activeCategory, query, bookmarksOnly, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredResources.length / pageSize)
  );

  const visibleResources = filteredResources.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const pageTitle =
    activeCategory === "all"
      ? "All resources"
      : activeCategory === "bookmarks"
        ? "Bookmarks"
        : active?.name || "Resources";

  const pageDescription =
    activeCategory === "bookmarks"
      ? "The links you want to come back to."
      : active?.description ||
        "A calm space for the things you want to remember.";

  function goToDashboard() {
    setActiveCategory("dashboard");
    setBookmarksOnly(false);
    setQuery("");
    setAiQuestion("");
    setAiAnswer("");
    setMenuId(null);
  }

  function openNewResource(prefillUrl: string = "", prefillTitle: string = "") {
    setResourceReturnCategory(activeCategory);
    setEditingResource(null);
    setResourceDraft({
      ...EMPTY_RESOURCE,
      url: prefillUrl || "",
      title: prefillTitle || "",
      category:
        activeCategory !== "dashboard" &&
        activeCategory !== "all" &&
        activeCategory !== "bookmarks" &&
        categories.some((category) => category.id === activeCategory)
          ? activeCategory
          : categories[0]?.id || "",
    });
    setError("");
    setModal("resource");
    if (prefillUrl) void fetchWebsiteMetadata(prefillUrl);
    setShowAddMenu(false);
  }

  function openEditResource(resource: Resource) {
    setEditingResource(resource.id);
    setResourceDraft({
      title: resource.title,
      url: resource.url,
      category:
        resource.category === "uncategorized" ? "" : resource.category,
      description: resource.description,
      note: resource.note,
    });
    setMenuId(null);
    setError("");
    setModal("resource");
  }

  function openNewCategory() {
    setEditingCategory(null);
    setCategoryName("");
    setCategoryDescription("");
    setCategoryColor(DEFAULT_COLOR);
    setError("");
    setModal("category");
    setShowAddMenu(false);
  }

  function openEditCategory(category: Category) {
    setEditingCategory(category.id);
    setCategoryName(category.name);
    setCategoryDescription(category.description);
    setCategoryColor(category.color);
    setMenuId(null);
    setError("");
    setModal("category");
  }

  // GROQ SETTINGS: the API key is only sent to the server.
  async function loadGroqSettings() {
    setSettingsLoading(true);
    setSettingsError("");
    setSettingsMessage("");

    try {
      const response = await fetch("/api/settings/groq", {
        method: "GET",
        cache: "no-store",
      });
      const data = await readJson(response);
      setGroqConfigured(Boolean(data.configured));

      const geminiResponse = await fetch("/api/settings/gemini", {
        method: "GET",
        cache: "no-store",
      });
      const geminiData = await readJson(geminiResponse);
      setGeminiConfigured(Boolean(geminiData.configured));
    } catch (err) {
      setSettingsError(
        err instanceof Error
          ? err.message
          : "Unable to load Groq settings."
      );
    } finally {
      setSettingsLoading(false);
    }
  }

  async function saveGeminiSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const apiKey = geminiKey.trim();
    if (!apiKey) {
      setSettingsError("Enter your Gemini API key first.");
      return;
    }

    setSettingsBusy(true);
    setSettingsError("");
    setSettingsMessage("");
    try {
      const response = await fetch("/api/settings/gemini", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await readJson(response);
      setGeminiConfigured(Boolean(data.configured));
      setGeminiKey("");
      setShowGeminiKey(false);
      setSettingsMessage(data.message || "Gemini connected successfully.");
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Unable to connect to Gemini.");
    } finally {
      setSettingsBusy(false);
    }
  }

  async function testGeminiConnection() {
    setSettingsBusy(true);
    setSettingsError("");
    setSettingsMessage("");
    try {
      const response = await fetch("/api/settings/gemini", {
        method: "POST",
        cache: "no-store",
      });
      const data = await readJson(response);
      setGeminiConfigured(Boolean(data.configured));
      setSettingsMessage(data.message || "Gemini connection is working.");
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Gemini connection test failed.");
    } finally {
      setSettingsBusy(false);
    }
  }

  async function removeGeminiKey() {
    if (!window.confirm("Remove the saved Gemini API key?")) return;

    setSettingsBusy(true);
    setSettingsError("");
    setSettingsMessage("");
    try {
      const response = await fetch("/api/settings/gemini", { method: "DELETE" });
      const data = await readJson(response);
      setGeminiConfigured(false);
      setGeminiKey("");
      setSettingsMessage(data.message || "Gemini API key removed.");
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Unable to remove the Gemini API key.");
    } finally {
      setSettingsBusy(false);
    }
  }

  function openSettings() {
    setSettingsKey("");
    setShowSettingsKey(false);
    setGeminiKey("");
    setShowGeminiKey(false);
    setSettingsMessage("");
    setSettingsError("");
    setModal("settings");
    void loadGroqSettings();
  }

  async function saveGroqSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const apiKey = settingsKey.trim();

    if (!apiKey) {
      setSettingsError("Enter your Groq API key first.");
      return;
    }

    setSettingsBusy(true);
    setSettingsError("");
    setSettingsMessage("");

    try {
      const response = await fetch("/api/settings/groq", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      const data = await readJson(response);

      setGroqConfigured(Boolean(data.configured));

      const geminiResponse = await fetch("/api/settings/gemini", {
        method: "GET",
        cache: "no-store",
      });
      const geminiData = await readJson(geminiResponse);
      setGeminiConfigured(Boolean(geminiData.configured));
      setSettingsKey("");
      setShowSettingsKey(false);
      setSettingsMessage(data.message || "Groq connected successfully.");
    } catch (err) {
      setSettingsError(
        err instanceof Error ? err.message : "Unable to connect to Groq."
      );
    } finally {
      setSettingsBusy(false);
    }
  }

  async function testGroqConnection() {
    setSettingsBusy(true);
    setSettingsError("");
    setSettingsMessage("");

    try {
      const response = await fetch("/api/settings/groq", {
        method: "POST",
        cache: "no-store",
      });

      const data = await readJson(response);

      setGroqConfigured(Boolean(data.configured));

      const geminiResponse = await fetch("/api/settings/gemini", {
        method: "GET",
        cache: "no-store",
      });
      const geminiData = await readJson(geminiResponse);
      setGeminiConfigured(Boolean(geminiData.configured));
      setSettingsMessage(data.message || "Groq connection is working.");
    } catch (err) {
      setSettingsError(
        err instanceof Error ? err.message : "Groq connection test failed."
      );
    } finally {
      setSettingsBusy(false);
    }
  }

  async function removeGroqKey() {
    if (
      !window.confirm(
        "Remove the saved Groq API key? AI features that require Groq will stop working."
      )
    ) {
      return;
    }

    setSettingsBusy(true);
    setSettingsError("");
    setSettingsMessage("");

    try {
      const response = await fetch("/api/settings/groq", {
        method: "DELETE",
      });

      const data = await readJson(response);

      setGroqConfigured(false);
      setSettingsKey("");
      setSettingsMessage(data.message || "Groq API key removed.");
    } catch (err) {
      setSettingsError(
        err instanceof Error ? err.message : "Unable to remove the Groq API key."
      );
    } finally {
      setSettingsBusy(false);
    }
  }

  async function fetchWebsiteMetadata(urlOverride?: string) {
    const rawUrl = (urlOverride ?? resourceDraft.url).trim();
    if (!rawUrl) return;

    let normalizedUrl: string;
    try {
      normalizedUrl = new URL(
        /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
      ).toString();
    } catch {
      setMetadataMessage("Enter a valid website URL.");
      return;
    }

    if (websiteMetadata?.url === normalizedUrl) return;

    setMetadataLoading(true);
    setMetadataMessage("Reading website details...");

    try {
      const response = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Website details could not be fetched."
        );
      }

      const metadata = {
        url: normalizedUrl,
        title: typeof data.title === "string" ? data.title.trim() : "",
        description:
          typeof data.description === "string" ? data.description.trim() : "",
        content: typeof data.content === "string" ? data.content.trim() : "",
      };

      setWebsiteMetadata(metadata);
      setResourceDraft((draft) => ({
        ...draft,
        title: draft.title.trim() || metadata.title,
      }));

      setMetadataMessage(
        metadata.title || metadata.description || metadata.content
          ? "Website details loaded."
          : "No useful page details found. You can enter details manually."
      );
    } catch (error) {
      setWebsiteMetadata(null);
      setMetadataMessage(
        error instanceof Error
          ? `${error.message} You can enter details manually.`
          : "Could not read website details."
      );
    } finally {
      setMetadataLoading(false);
    }
  }
  async function generateResourceDescription(urlOverride?: string) {
    const rawUrl = (urlOverride ?? resourceDraft.url).trim();

    if (!rawUrl) {
      setError("Enter the website URL before generating a description.");
      return;
    }

    let normalizedUrl = rawUrl;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      setError("Please enter a valid website URL.");
      return;
    }

    const title = resourceDraft.title.trim() || getDomain(normalizedUrl);

    setGeneratingDescription(true);
    setError("");
    setDescriptionMessage("");

    try {
      const response = await fetch("/api/ai/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          url: normalizedUrl,
          note: resourceDraft.note.trim(),
          metadata:
            websiteMetadata?.url === normalizedUrl
              ? {
                  title: websiteMetadata?.title ?? "",
                  description: websiteMetadata?.description ?? "",
                  content: websiteMetadata?.content ?? "",
                }
              : null,
        }),
      });

      const data = await readJson(response);

      if (typeof data.description !== "string" || !data.description.trim()) {
        throw new Error("The AI returned an empty description. Please try again.");
      }

      setResourceDraft((draft) => ({
        ...draft,
        title: draft.title.trim() || title,
        url: normalizedUrl,
        description: data.description.trim(),
      }));

      setDescriptionMessage("AI description generated. Review or edit it before saving.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't generate a description. Please try again."
      );
    } finally {
      setGeneratingDescription(false);
    }
  }

  async function saveResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      let url = resourceDraft.url.trim();

      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }

      const parsedUrl = new URL(url);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Please enter a valid website URL.");
      }

      const domain = parsedUrl.hostname.replace(/^www\./, "");

      const payload = {
        title: resourceDraft.title.trim() || domain,
        url,
        domain,
        categoryId: resourceDraft.category || null,
        description: resourceDraft.description.trim(),
        note: resourceDraft.note.trim(),
        faviconUrl: getFavicon(url),
      };

      const response = await fetch(
        editingResource
          ? `/api/resources/${editingResource}`
          : "/api/resources",
        {
          method: editingResource ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      await readJson(response);

      setModal(null);
      setResourceDraft(EMPTY_RESOURCE);
      setEditingResource(null);
      setNotice(editingResource ? "Resource updated." : "Resource saved.");
      await loadLibrary();
      setActiveCategory(resourceReturnCategory);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't save this resource."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        name: categoryName.trim(),
        description: categoryDescription.trim(),
        color: categoryColor,
        icon: "folder",
      };

      const response = await fetch(
        editingCategory
          ? `/api/categories/${editingCategory}`
          : "/api/categories",
        {
          method: editingCategory ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await readJson(response);
      const savedId = data.category?.id ?? data.id;

      setModal(null);
      setNotice(editingCategory ? "Category updated." : "Category created.");
      await loadLibrary();

      if (!editingCategory && typeof savedId === "string") {
        setActiveCategory(savedId);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't save this category."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteResource(resource: Resource) {
    if (!window.confirm(`Delete "${resource.title}" from your library?`)) {
      return;
    }

    setMenuId(null);
    setError("");

    try {
      await readJson(
        await fetch(`/api/resources/${resource.id}`, {
          method: "DELETE",
        })
      );

      setResources((previous) =>
        previous.filter((item) => item.id !== resource.id)
      );
      setNotice("Resource deleted.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't delete resource."
      );
    }
  }

  async function deleteCategory(category: Category) {
    if (
      !window.confirm(
        `Delete the "${category.name}" category? Its resources will remain in your library without a category.`
      )
    ) {
      return;
    }

    setMenuId(null);
    setError("");

    try {
      await readJson(
        await fetch(`/api/categories/${category.id}`, {
          method: "DELETE",
        })
      );

      if (activeCategory === category.id) setActiveCategory("all");

      setNotice("Category deleted.");
      await loadLibrary();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't delete category."
      );
    }
  }

  async function toggleBookmark(resource: Resource) {
    const nextValue = !resource.bookmarked;

    setResources((previous) =>
      previous.map((item) =>
        item.id === resource.id
          ? { ...item, bookmarked: nextValue }
          : item
      )
    );

    try {
      await readJson(
        await fetch(`/api/resources/${resource.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookmarked: nextValue }),
        })
      );
    } catch (err) {
      setResources((previous) =>
        previous.map((item) =>
          item.id === resource.id
            ? { ...item, bookmarked: resource.bookmarked }
            : item
        )
      );

      setError(
        err instanceof Error ? err.message : "Couldn't update bookmark."
      );
    }
  }

  async function moveResource(resource: Resource, direction: -1 | 1) {
    const ordered = [...filteredResources];
    const index = ordered.findIndex((item) => item.id === resource.id);
    const targetIndex = index + direction;

    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
      setMenuId(null);
      return;
    }

    const target = ordered[targetIndex];
    setMenuId(null);

    try {
      await Promise.all([
        readJson(
          await fetch(`/api/resources/${resource.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position: target.position ?? targetIndex }),
          })
        ),
        readJson(
          await fetch(`/api/resources/${target.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position: resource.position ?? index }),
          })
        ),
      ]);

      await loadLibrary();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't reorder resources."
      );
    }
  }

  async function moveCategory(category: Category, direction: -1 | 1) {
    const ordered = [...categories].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0)
    );

    const index = ordered.findIndex((item) => item.id === category.id);
    const targetIndex = index + direction;

    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
      setMenuId(null);
      return;
    }

    const target = ordered[targetIndex];
    setMenuId(null);

    try {
      await Promise.all([
        readJson(
          await fetch(`/api/categories/${category.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position: target.position ?? targetIndex }),
          })
        ),
        readJson(
          await fetch(`/api/categories/${target.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position: category.position ?? index }),
          })
        ),
      ]);

      await loadLibrary();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't reorder categories."
      );
    }
  }

  async function runLibrarySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = aiQuestion.trim();

    if (!question) {
      setAiAnswer("Enter a question or keywords to search.");
      setAiSavedResults([]);
      setAiWebResults([]);
      return;
    }

    setAiBusy(true);
    setAiAnswer("");
    setAiSavedResults([]);
    setAiWebResults([]);
    setWebResultMenu(null);

    try {
      const normalizeSearchText = (value: string) =>
        value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/https?:\/\//g, " ")
          .replace(/[^\p{L}\p{N}]+/gu, " ")
          .trim();

      const stopWords = new Set([
        "the", "and", "for", "with", "from", "that", "this", "what",
        "when", "where", "which", "who", "how", "why", "can", "could",
        "would", "should", "about", "into", "your", "you", "are", "was",
        "were", "have", "has", "had", "does", "did", "not", "but",
        "les", "des", "une", "que", "qui", "pour", "dans", "avec",
        "como", "para", "una", "por", "los", "las", "del"
      ]);

      const normalizedQuestion = normalizeSearchText(question);
      const terms = [...new Set(
        normalizedQuestion
          .split(/\s+/)
          .filter((term) => term.length > 1 && !stopWords.has(term))
      )];

      const matches = resources
        .map((resource) => {
          const categoryName =
            categories.find((category) => category.id === resource.category)?.name || "";

          const title = normalizeSearchText(resource.title || "");
          const description = normalizeSearchText(resource.description || "");
          const note = normalizeSearchText(resource.note || "");
          const url = normalizeSearchText(resource.url || "");
          const domain = normalizeSearchText(resource.domain || "");
          const category = normalizeSearchText(categoryName);
          const allText = [title, description, note, url, domain, category].join(" ");

          let score = 0;

          if (normalizedQuestion.length >= 4 && allText.includes(normalizedQuestion)) {
            score += 12;
          }

          for (const term of terms) {
            if (title.split(/\s+/).includes(term)) score += 5;
            else if (title.includes(term)) score += 3;

            if (description.includes(term)) score += 2;
            if (note.includes(term)) score += 3;
            if (category.includes(term)) score += 2;
            if (domain.includes(term)) score += 1;
            if (url.includes(term)) score += 1;
          }

          const matchedTerms = terms.filter((term) => allText.includes(term)).length;
          if (terms.length > 1 && matchedTerms === terms.length) score += 4;
          if (terms.length > 2 && matchedTerms / terms.length >= 0.6) score += 2;

          return { resource, score, matchedTerms };
        })
        .filter((item) => item.score > 0 && item.matchedTerms > 0)
        .sort((a, b) => b.score - a.score || b.matchedTerms - a.matchedTerms)
        .slice(0, 8)
        .map((item) => item.resource);

      setAiSavedResults(matches);

      const response = await fetch(
        `/api/web-search?q=${encodeURIComponent(question)}`,
        { cache: "no-store" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Web search failed. Please try again."
        );
      }

      const savedUrls = new Set(
        resources.map((resource) => {
          try {
            const parsed = new URL(resource.url);
            parsed.hash = "";
            return parsed.href.replace(/\/$/, "").toLowerCase();
          } catch {
            return resource.url.trim().toLowerCase();
          }
        })
      );

      const webResults: WebSearchResult[] = (
        Array.isArray(data.results) ? data.results : []
      )
        .filter((item: unknown): item is WebSearchResult => {
          if (!item || typeof item !== "object") return false;
          const result = item as Partial<WebSearchResult>;
          if (
            typeof result.title !== "string" ||
            typeof result.url !== "string" ||
            typeof result.description !== "string" ||
            typeof result.domain !== "string"
          ) return false;

          try {
            const parsed = new URL(result.url);
            return (
              (parsed.protocol === "https:" || parsed.protocol === "http:") &&
              !savedUrls.has(parsed.href.replace(/\/$/, "").toLowerCase())
            );
          } catch {
            return false;
          }
        })
        .slice(0, 8);

      setAiWebResults(webResults);

      if (matches.length > 0 || webResults.length > 0) {
        setAiOverviewBusy(true);
        try {
          const summaryResponse = await fetch("/api/ai/search-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({
              question,
              saved: matches.map((resource) => ({
                title: resource.title,
                description: resource.description,
                note: resource.note,
                domain: resource.domain,
              })),
              web: webResults.map((result) => ({
                title: result.title,
                description: result.description,
                domain: result.domain,
              })),
            }),
          });

          const summaryData = await summaryResponse.json();
          if (summaryResponse.ok && typeof summaryData.overview === "string") {
            setAiOverview(summaryData.overview);
          } else {
            setAiOverview("");
          }
        } catch {
          setAiOverview("");
        } finally {
          setAiOverviewBusy(false);
        }
      } else {
        setAiOverview("");
      }
    } catch (err) {
      setAiAnswer(
        err instanceof Error
          ? err.message
          : "Couldn't complete the search. Please try again."
      );
    } finally {
      setAiBusy(false);
    }
  }
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#f8f8fb] text-[#242333]">
      <KnowledgeTreeBackground />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col border-r border-[#eaeaf1] bg-white px-5 py-6 max-md:w-[76px] max-md:px-3">
          <button
            className="mb-9 flex items-center gap-3 px-1 text-left"
            onClick={goToDashboard}
            aria-label="Memora dashboard"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#7774d9] text-white shadow-sm">
              <BookmarkCheck size={22} />
            </span>
            <span className="max-md:hidden">
              <span className="block text-lg font-bold tracking-tight">memora</span>
              <span className="block text-xs text-[#9998aa]">Your saved space</span>
            </span>
          </button>

          <nav className="space-y-1">
            <button
              onClick={goToDashboard}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                activeCategory === "dashboard"
                  ? "bg-[#f0efff] text-[#6b68cf]"
                  : "text-[#6f6e7f] hover:bg-[#f7f7fa]"
              }`}
              title="Dashboard"
            >
              <Search size={18} />
              <span className="flex-1 text-left max-md:hidden">Dashboard</span>
            </button>

            <button
              onClick={() => {
                setActiveCategory("all");
                setBookmarksOnly(false);
                setQuery("");
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                activeCategory === "all"
                  ? "bg-[#f0efff] text-[#6b68cf]"
                  : "text-[#6f6e7f] hover:bg-[#f7f7fa]"
              }`}
            >
              <Grid2X2 size={18} />
              <span className="flex-1 text-left max-md:hidden">All resources</span>
              <span className="text-xs max-md:hidden">{resources.length}</span>
            </button>

            <button
              onClick={() => {
                setActiveCategory("bookmarks");
                setBookmarksOnly(false);
                setQuery("");
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                activeCategory === "bookmarks"
                  ? "bg-[#f0efff] text-[#6b68cf]"
                  : "text-[#6f6e7f] hover:bg-[#f7f7fa]"
              }`}
            >
              <Bookmark size={18} />
              <span className="flex-1 text-left max-md:hidden">Bookmarks</span>
              <span className="text-xs max-md:hidden">{bookmarkCount}</span>
            </button>
          </nav>

          <div className="mb-3 mt-9 flex items-center justify-between px-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#a2a1b1] max-md:hidden">
              Collections
            </span>
            <button
              onClick={openNewCategory}
              title="Create category"
              className="rounded-lg p-1.5 text-[#9695a7] hover:bg-[#f0efff] hover:text-[#7774d9]"
            >
              <Plus size={16} />
            </button>
          </div>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {categories.map((category) => (
              <div key={category.id} className="group relative">
                <button
                  onClick={() => {
                    setActiveCategory(category.id);
                    setBookmarksOnly(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    activeCategory === category.id
                      ? "bg-[#f0efff] font-medium text-[#6b68cf]"
                      : "text-[#6f6e7f] hover:bg-[#f7f7fa]"
                  }`}
                  title={category.name}
                >
                  <Folder size={18} style={{ color: category.color }} className="shrink-0" />
                  <span className="flex-1 truncate text-left max-md:hidden">{category.name}</span>
                  <span className="text-xs text-[#a2a1b1] max-md:hidden">
                    {resources.filter((r) => r.category === category.id).length}
                  </span>
                </button>

                <button
                  onClick={() =>
                    setMenuId(menuId === `category:${category.id}` ? null : `category:${category.id}`)
                  }
                  title="Category options"
                  className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-md p-1 text-[#9998aa] hover:bg-white group-hover:block max-md:hidden"
                >
                  <MoreHorizontal size={16} />
                </button>

                {menuId === `category:${category.id}` && (
                  <div className="absolute right-0 top-9 z-30 w-44 rounded-xl border border-[#eaeaf1] bg-white p-1.5 shadow-lg">
                    <button onClick={() => openEditCategory(category)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f7f7fa]">
                      <Pencil size={14} /> Edit category
                    </button>
                    <button onClick={() => void moveCategory(category, -1)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f7f7fa]">
                      <ArrowUp size={14} /> Move up
                    </button>
                    <button onClick={() => void moveCategory(category, 1)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f7f7fa]">
                      <ArrowDown size={14} /> Move down
                    </button>
                    <button onClick={() => void deleteCategory(category)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                      <Trash2 size={14} /> Delete category
                    </button>
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="mt-5 border-t border-[#eeeef3] pt-4">
            <button
              onClick={openSettings}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#777688] hover:bg-[#f7f7fa] ${
                modal === "settings" ? "bg-[#f0efff] text-[#6b68cf]" : ""
              }`}
            >
              <Settings size={18} />
              <span className="max-md:hidden">Settings</span>
            </button>

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#f8f7ff] p-3 text-xs leading-5 text-[#8a88a8] max-md:hidden">
              <CircleHelp size={15} className="mt-0.5 shrink-0" />
              Your personal library, all in one place.
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-8 py-8 max-sm:px-4">
          {error && (
            <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button>
            </div>
          )}

          {notice && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#dedcfb] bg-[#f4f3ff] px-4 py-3 text-sm text-[#6562c2]">
              <span className="flex items-center gap-2"><Check size={16} /> {notice}</span>
              <button onClick={() => setNotice("")} aria-label="Dismiss message"><X size={16} /></button>
            </div>
          )}

          {activeCategory === "dashboard" ? (
            <section className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-4 pb-20 text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#7774d9] text-white shadow-lg shadow-[#7774d9]/20">
                <BookmarkCheck size={32} />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-[#29283a] max-sm:text-3xl">
                {dashboardSlogan}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-[#9291a3]">
                Search your saved links, rediscover something useful, or explore your collections.
              </p>
              <form onSubmit={runLibrarySearch} className="mt-4 flex w-full max-w-[580px] gap-2">
                <input
                  value={aiQuestion}
                  onChange={(event) => setAiQuestion(event.target.value)}
                  placeholder="Ask about a topic across your library and the web..."
                  className="min-w-0 flex-1 rounded-xl border border-[#e5e3f0] bg-white px-4 py-3 text-sm outline-none focus:border-[#aaa7ef]"
                  aria-label="Search your library and the web"
                />
                <button
                  disabled={aiBusy}
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-[#7774d9] px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  {aiBusy ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  Explore
                </button>
              </form>

              {aiAnswer && (
                <div className="mt-4 w-full max-w-[580px] whitespace-pre-wrap rounded-xl border border-[#e7e5f8] bg-white p-3 text-left text-sm leading-6 text-[#66647f]">
                  {aiAnswer}
                </div>
              )}

              {(aiSavedResults.length > 0 || aiWebResults.length > 0 || aiOverviewBusy) && (
                <div className="mt-4 w-full max-w-[900px] text-left">
                  {(aiOverview || aiOverviewBusy) && (
                    <section className="mb-4 rounded-2xl border border-[#e8e7f1] bg-white/90 p-5 shadow-sm">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#5551ad]">
                        <Sparkles size={16} />
                        AI overview
                        {aiOverviewBusy && <LoaderCircle size={14} className="animate-spin" />}
                      </div>
                      {aiOverviewBusy && !aiOverview ? (
                        <p className="text-sm leading-6 text-[#858399]">
                          Summarizing your saved resources and web results…
                        </p>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-7 text-[#66647f]">
                          {aiOverview}
                        </p>
                      )}
                    </section>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#e8e7f1] bg-white p-4">
                    <h3 className="mb-3 font-semibold text-[#3b3957]">Saved in Memora ({aiSavedResults.length})</h3>
                    {aiSavedResults.map((resource) => (
                      <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="mb-3 block rounded-xl p-2 hover:bg-[#f8f7ff]">
                        <span className="block text-sm font-medium text-[#5f5bc2]">{resource.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-[#858399]">{resource.description || resource.note || resource.domain}</span>
                      </a>
                    ))}
                    {aiSavedResults.length === 0 && <p className="text-xs text-[#858399]">No saved matches found.</p>}
                  </div>
                  <div className="rounded-2xl border border-[#e8e7f1] bg-white p-4">
                    <h3 className="mb-3 font-semibold text-[#3b3957]">Found on the web ({aiWebResults.length})</h3>
                    {aiWebResults.map((result) => (
                      <div key={result.url} className="mb-3 rounded-xl p-2 hover:bg-[#f8f7ff]">
                        <a href={result.url} target="_blank" rel="noreferrer" className="block text-sm font-medium text-[#5f5bc2]">{result.title}</a>
                        <p className="mt-1 text-xs text-[#858399]">{result.domain}</p>
                        <p className="mt-1 text-xs leading-5 text-[#777688]">{result.description || "No preview available."}</p>
                        <button type="button" onClick={() => {
                          const normalizeUrl = (value: string) => {
                            try {
                              const parsed = new URL(value);
                              parsed.hash = "";
                              parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
                              ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach((key) => parsed.searchParams.delete(key));
                              return parsed.href.replace(/\/$/, "").toLowerCase();
                            } catch {
                              return value.trim().toLowerCase();
                            }
                          };
                          const existing = resources.find((resource) => normalizeUrl(resource.url) === normalizeUrl(result.url));
                          if (existing) {
                            setAiAnswer(`Already saved: ${existing.title}`);
                            return;
                          }
                          openNewResource(result.url, result.title);
                        }} className="mt-2 text-xs font-medium text-[#6b68cf] hover:underline">+ Add to Memora</button>
                      </div>
                    ))}
                    {aiWebResults.length === 0 && <p className="text-xs text-[#858399]">No new web results found.</p>}
                  </div>
                  </div>
                </div>
              )}
              <p className="mt-5 text-xs text-[#a2a1b1]">
                {loading ? "Loading your library..." : `${resources.length} saved resources Â· ${categories.length} collections`}
              </p>
              <button onClick={() => openNewResource()} className="mt-6 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-[#7774d9] hover:bg-[#f0efff]">
                <Plus size={17} /> Save a new resource
              </button>
              <p className="mt-12 text-[11px] text-[#b0afbd]">Memora Â· Your knowledge, collected.</p>
            </section>
          ) : (
            <>
              <header className="mb-9 flex items-center justify-between gap-4">
                <div className="relative w-full max-w-[510px]">
                <form onSubmit={(event) => { event.preventDefault(); setPage(1); }} className="flex w-full items-center gap-3 rounded-2xl border border-[#e9e8f0] bg-white px-4 py-3">
                  <Search size={18} className="shrink-0 text-[#a2a1b1]" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your library..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#b1b0bf]" aria-label="Search resources" />
                  {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}
                </form>
                {query.trim() && filteredResources.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-[#e9e8f0] bg-white py-1 shadow-lg">
                    {filteredResources.slice(0, 6).map((resource) => (
                      <a
                        key={resource.id}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block border-b border-[#f1f0f6] px-4 py-3 last:border-0 hover:bg-[#f8f7ff]"
                      >
                        <span className="block truncate text-sm font-medium text-[#454457]">{resource.title}</span>
                        <span className="mt-1 block truncate text-xs text-[#9998aa]">{resource.domain || resource.url}</span>
                      </a>
                    ))}
                    {filteredResources.length > 6 && (
                      <p className="px-4 py-2 text-xs text-[#9998aa]">
                        Showing 6 suggestions · {filteredResources.length} matches
                      </p>
                    )}
                  </div>
                )}
                </div>
                <button onClick={() => openNewResource()} className="flex shrink-0 items-center gap-2 rounded-xl bg-[#7774d9] px-4 py-3 text-sm font-semibold text-white hover:bg-[#6865ca]">
                  <Plus size={17} /><span className="max-sm:hidden">Add resource</span>
                </button>
              </header>

              <section className="mb-7">
                <div className="mb-2 flex items-center gap-2 text-xs text-[#a2a1b1]">
                  <button onClick={goToDashboard} className="hover:text-[#7774d9]">Dashboard</button>
                  <span>/</span><span className="text-[#7774d9]">{pageTitle}</span>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#29283a] max-sm:text-2xl">{pageTitle}</h1>
                    <p className="mt-2 text-sm text-[#9291a3]">{pageDescription}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#9998aa]"><Activity size={15} />{resources.length} saved resources</div>
                </div>
              </section>

              <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setBookmarksOnly(false)} className={`rounded-full px-3.5 py-2 text-xs font-medium ${!bookmarksOnly ? "bg-[#eae9ff] text-[#6c69cc]" : "bg-white text-[#858496] ring-1 ring-[#e9e8f0]"}`}>All</button>
                  <button onClick={() => setBookmarksOnly(true)} className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium ${bookmarksOnly ? "bg-[#eae9ff] text-[#6c69cc]" : "bg-white text-[#858496] ring-1 ring-[#e9e8f0]"}`}><Bookmark size={13} /> Bookmarked</button>
                  <span className="mx-1 h-5 w-px bg-[#e7e6ee]" />
                  <span className="text-xs text-[#9998aa]">{filteredResources.length} results</span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 rounded-xl border border-[#e9e8f0] bg-white px-3 py-2.5 text-xs text-[#777688]">
                    <span className="max-sm:hidden">Sort</span>
                    <select value={sort} onChange={(event) => setSort(event.target.value as "newest" | "oldest" | "az")} className="max-w-[130px] bg-transparent outline-none" aria-label="Sort resources">
                      <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="az">Title Aâ€“Z</option>
                    </select><ChevronDown size={13} />
                  </label>
                  <div className="flex rounded-xl border border-[#e9e8f0] bg-white p-1">
                    <button onClick={() => setView("grid")} className={`rounded-lg p-2 ${view === "grid" ? "bg-[#f0efff] text-[#7774d9]" : "text-[#a2a1b1]"}`} aria-label="Grid view"><Grid2X2 size={16} /></button>
                    <button onClick={() => setView("list")} className={`rounded-lg p-2 ${view === "list" ? "bg-[#f0efff] text-[#7774d9]" : "text-[#a2a1b1]"}`} aria-label="List view"><LayoutList size={16} /></button>
                  </div>
                </div>
              </section>

              {loading ? (
                <div className="flex min-h-[280px] items-center justify-center gap-3 text-sm text-[#9998aa]"><LoaderCircle size={20} className="animate-spin" /> Loading your library...</div>
              ) : visibleResources.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#dedde9] bg-white px-6 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0efff] text-[#7774d9]">{query ? <Search size={24} /> : <FileText size={24} />}</div>
                  <h3 className="text-base font-semibold text-[#454457]">{query ? "No matching resources" : activeCategory === "bookmarks" ? "No bookmarks yet" : "Nothing here yet"}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-[#9998aa]">{query ? "Try another search term or clear the search field." : "Save a useful website, article, or document so it's easy to find again."}</p>
                  {activeCategory !== "bookmarks" && <button onClick={() => openNewResource()} className="mt-5 flex items-center gap-2 rounded-xl bg-[#7774d9] px-4 py-2.5 text-sm font-medium text-white"><Plus size={16} /> Add resource</button>}
                </div>
              ) : (
                <div className={view === "grid" ? "grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3" : "flex flex-col gap-3"}>
                  {visibleResources.map((resource) => {
                    const category = categories.find((item) => item.id === resource.category);
                    const menuOpen = menuId === `resource:${resource.id}`;

                    return (
                      <article key={resource.id} className={`group relative rounded-2xl border border-[#eae9f0] bg-white transition hover:border-[#d9d7f3] hover:shadow-[0_6px_24px_rgba(40,37,90,0.045)] ${view === "list" ? "p-4" : "min-h-[225px] p-5"}`}>
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#eeedf3] bg-[#fafafd]">
                            {resource.faviconUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={resource.faviconUrl} alt="" className="h-6 w-6 object-contain" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                            ) : <Globe size={20} className="text-[#9695aa]" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold text-[#363548]">{resource.title}</h3>
                            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-[#9998aa] hover:text-[#7774d9]">
                              <span className="truncate">{resource.domain}</span><ExternalLink size={11} className="shrink-0" />
                            </a>
                          </div>
                          <button onClick={() => void toggleBookmark(resource)} title={resource.bookmarked ? "Remove bookmark" : "Bookmark resource"} aria-label={resource.bookmarked ? "Remove bookmark" : "Bookmark resource"} className={`rounded-lg p-2 ${resource.bookmarked ? "text-[#7774d9]" : "text-[#c0bfcc] hover:bg-[#f6f5ff] hover:text-[#7774d9]"}`}>
                            {resource.bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                          </button>
                          <div className="relative">
                            <button onClick={() => setMenuId(menuOpen ? null : `resource:${resource.id}`)} className="rounded-lg p-2 text-[#b0afbd] hover:bg-[#f7f7fa] hover:text-[#646276]" title="Resource options" aria-label="Resource options"><MoreHorizontal size={18} /></button>
                            {menuOpen && (
                              <div className="absolute right-0 top-10 z-30 w-48 rounded-xl border border-[#eaeaf1] bg-white p-1.5 shadow-lg">
                                <button onClick={() => openEditResource(resource)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#f7f7fa]"><Pencil size={14} /> Edit resource</button>
                                <button onClick={() => void moveResource(resource, -1)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#f7f7fa]"><ArrowUp size={14} /> Move up</button>
                                <button onClick={() => void moveResource(resource, 1)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#f7f7fa]"><ArrowDown size={14} /> Move down</button>
                                <button onClick={() => void deleteResource(resource)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"><Trash2 size={14} /> Delete resource</button>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className={`mt-4 text-sm leading-6 text-[#858496] ${view === "list" ? "line-clamp-2" : "line-clamp-3"}`}>{resource.description || "No description added yet."}</p>

                        {resource.note && <div className="mt-3 rounded-xl bg-[#faf9ff] px-3 py-2.5"><p className="text-[11px] font-semibold uppercase tracking-wide text-[#aaa8c7]">Personal note</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#77758f]">{resource.note}</p></div>}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#f0eff5] pt-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            {category ? (
                              <button onClick={() => { setActiveCategory(category.id); setQuery(""); }} className="flex max-w-[160px] items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: `${category.color}18`, color: category.color }}>
                                <Folder size={12} /><span className="truncate">{category.name}</span>
                              </button>
                            ) : <span className="rounded-full bg-[#f5f5f8] px-2.5 py-1 text-[11px] text-[#9998aa]">Uncategorized</span>}
                          </div>
                          <span className="shrink-0 text-[11px] text-[#b0afbd]">{resource.date}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {!loading && filteredResources.length > pageSize && (
                <div className="mt-7 flex items-center justify-between border-t border-[#eae9f0] pt-5">
                  <p className="text-xs text-[#9998aa]">Showing {(page - 1) * pageSize + 1}â€“{Math.min(page * pageSize, filteredResources.length)} of {filteredResources.length}</p>
                  <div className="flex items-center gap-2">
                    <button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-[#e9e8f0] bg-white px-3 py-2 text-xs text-[#777688] disabled:opacity-40">Previous</button>
                    <span className="px-1 text-xs text-[#9998aa]">{page} / {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-lg border border-[#e9e8f0] bg-white px-3 py-2 text-xs text-[#777688] disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}

              <footer className="mt-12 flex items-center justify-between border-t border-[#eae9f0] py-5 text-[11px] text-[#b0afbd]">
                <span>Memora Â· Your knowledge, collected.</span>
                <span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${groqConfigured ? "bg-[#6bba91]" : "bg-[#c5c3d1]"}`} />{groqConfigured ? "Groq connected" : "Library connected"}</span>
              </footer>
            </>
          )}
        </main>
      </div>

      <div className="fixed bottom-6 right-6 z-40">
        {showAddMenu && (
          <div className="mb-3 w-52 rounded-2xl border border-[#e9e8f0] bg-white p-2 shadow-xl">
            <button onClick={() => openNewResource()} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#555467] hover:bg-[#f5f4ff]"><Plus size={17} className="text-[#7774d9]" /> Add resource</button>
            <button onClick={openNewCategory} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#555467] hover:bg-[#f5f4ff]"><FolderPlus size={17} className="text-[#7774d9]" /> New category</button>
          </div>
        )}
        <button onClick={() => setShowAddMenu((value) => !value)} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7774d9] text-white shadow-[0_8px_24px_rgba(119,116,217,0.35)] transition hover:-translate-y-0.5 hover:bg-[#6865ca]" aria-label={showAddMenu ? "Close add menu" : "Add resource or category"} title="Add">
          {showAddMenu ? <X size={23} /> : <Plus size={25} />}
        </button>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#222136]/35 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving &&
              !settingsBusy
            ) {
              setModal(null);
              setError("");
            }
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className="my-auto w-full max-w-[520px] rounded-3xl border border-white/70 bg-white p-6 shadow-[0_24px_100px_rgba(35,31,70,0.2)] sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0efff] text-[#7774d9]">
                  {modal === "resource" ? <Globe size={20} /> : modal === "category" ? <FolderPlus size={20} /> : <Settings size={20} />}
                </div>
                <h2 id="modal-title" className="text-xl font-bold text-[#302f43]">
                  {modal === "resource" ? (editingResource ? "Edit resource" : "Save a resource") : modal === "category" ? (editingCategory ? "Edit category" : "Create a category") : "Settings"}
                </h2>
                <p className="mt-1 text-sm text-[#9998aa]">
                  {modal === "resource" ? "Keep useful links and your own notes together." : modal === "category" ? "Give your collection a name and a color." : "Connect Groq to enable Memora's AI features."}
                </p>
              </div>
              <button onClick={() => { if (!saving && !settingsBusy) { setModal(null); setError(""); } }} className="rounded-xl p-2 text-[#a5a4b3] hover:bg-[#f6f6fa]" aria-label="Close modal"><X size={19} /></button>
            </div>

            {error && modal !== "settings" && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}

            {modal === "resource" && (
              <form onSubmit={saveResource} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#666577]">Website URL *</label>
                  <input required type="text" value={resourceDraft.url} onChange={(event) => {
                    setResourceDraft((draft) => ({ ...draft, url: event.target.value }));
                    setWebsiteMetadata(null);
                    setMetadataMessage("");
                  }} onBlur={() => void fetchWebsiteMetadata()} placeholder="https://example.com/article" className="w-full rounded-xl border border-[#e7e6ee] bg-white px-3.5 py-3 text-sm outline-none focus:border-[#aaa7ef]" />
                  {metadataMessage && (
                    <p role="status" className="mt-1.5 text-xs text-[#8a899b]">
                      {metadataLoading ? "⏳ " : ""}{metadataMessage}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#666577]">Title</label>
                  <input value={resourceDraft.title} onChange={(event) => setResourceDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="A useful resource" className="w-full rounded-xl border border-[#e7e6ee] px-3.5 py-3 text-sm outline-none focus:border-[#aaa7ef]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#666577]">Category</label>
                  <select value={resourceDraft.category} onChange={(event) => setResourceDraft((draft) => ({ ...draft, category: event.target.value }))} className="w-full rounded-xl border border-[#e7e6ee] bg-white px-3.5 py-3 text-sm outline-none focus:border-[#aaa7ef]">
                    <option value="">Uncategorized</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-xs font-semibold text-[#666577]">Description</label>
                    <button
                      type="button"
                      onClick={() => void generateResourceDescription()}
                      disabled={generatingDescription || !resourceDraft.url.trim()}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e2dfff] bg-[#f6f5ff] px-2.5 py-1.5 text-xs font-medium text-[#7774d9] hover:bg-[#eeecff] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {generatingDescription
                        ? <LoaderCircle size={13} className="animate-spin" />
                        : <Sparkles size={13} />}
                      {generatingDescription ? "Generating..." : "Generate with AI"}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={resourceDraft.description}
                    onChange={(event) => {
                      setResourceDraft((draft) => ({ ...draft, description: event.target.value }));
                      setDescriptionMessage("");
                    }}
                    placeholder="Describe this resource or generate a description with AI..."
                    className="w-full resize-y rounded-xl border border-[#e7e6ee] px-3.5 py-3 text-sm outline-none focus:border-[#aaa7ef]"
                  />
                  {descriptionMessage && (
                    <p role="status" className="mt-1.5 text-xs text-[#6b9b83]">
                      {descriptionMessage}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-[#a2a1b1]">
                    AI uses the title, URL, and personal note. Check the result before saving.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#666577]">Personal note</label>
                  <textarea rows={2} value={resourceDraft.note} onChange={(event) => setResourceDraft((draft) => ({ ...draft, note: event.target.value }))} placeholder="Why did you save this? Anything to remember..." className="w-full resize-y rounded-xl border border-[#e7e6ee] px-3.5 py-3 text-sm outline-none focus:border-[#aaa7ef]" />
                </div>
                <div className="flex justify-end gap-2 border-t border-[#f0eff5] pt-4">
                  <button type="button" disabled={saving} onClick={() => setModal(null)} className="rounded-xl px-4 py-2.5 text-sm text-[#777688] hover:bg-[#f7f7fa]">Cancel</button>
                  <button type="submit" disabled={saving || !resourceDraft.url.trim()} className="flex items-center gap-2 rounded-xl bg-[#7774d9] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6865ca] disabled:opacity-60">
                    {saving && <LoaderCircle size={15} className="animate-spin" />}{editingResource ? "Save changes" : "Save resource"}
                  </button>
                </div>
              </form>
            )}

            {modal === "category" && (
              <form onSubmit={saveCategory} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#666577]">Category name *</label>
                  <input required maxLength={80} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="e.g. Research, Design, Reading" className="w-full rounded-xl border border-[#e7e6ee] px-3.5 py-3 text-sm outline-none focus:border-[#aaa7ef]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#666577]">Description</label>
                  <textarea rows={2} value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} placeholder="What belongs in this collection?" className="w-full resize-y rounded-xl border border-[#e7e6ee] px-3.5 py-3 text-sm outline-none focus:border-[#aaa7ef]" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#666577]">Color</label>
                  <div className="flex flex-wrap gap-3">
                    {COLORS.map((color) => (
                      <button key={color} type="button" onClick={() => setCategoryColor(color)} className={`flex h-9 w-9 items-center justify-center rounded-full transition ${categoryColor === color ? "ring-2 ring-offset-2" : "hover:scale-105"}`} style={{ backgroundColor: color, outlineColor: color, ["--tw-ring-color" as string]: color }} aria-label={`Select ${color}`} title={color}>
                        {categoryColor === color && <Check size={16} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-[#f0eff5] pt-4">
                  <button type="button" disabled={saving} onClick={() => setModal(null)} className="rounded-xl px-4 py-2.5 text-sm text-[#777688] hover:bg-[#f7f7fa]">Cancel</button>
                  <button type="submit" disabled={saving || !categoryName.trim()} className="flex items-center gap-2 rounded-xl bg-[#7774d9] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6865ca] disabled:opacity-60">
                    {saving && <LoaderCircle size={15} className="animate-spin" />}{editingCategory ? "Save changes" : "Create category"}
                  </button>
                </div>
              </form>
            )}

            {modal === "settings" && (
              <div className="space-y-5">
                <div className="rounded-xl border border-[#eae8f6] bg-[#faf9ff] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#55536f]">
                    <Sparkles size={17} className="text-[#7774d9]" /> Groq AI integration
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#85839e]">
                    Your API key is sent to your server and encrypted before it is stored in the database. It is not returned to the browser.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className={`h-2.5 w-2.5 rounded-full ${groqConfigured ? "bg-emerald-500" : "bg-gray-300"}`} />
                    <span className="font-medium text-[#55536f]">
                      {settingsLoading ? "Checking configuration..." : groqConfigured ? "API key is saved" : "No API key saved"}
                    </span>
                  </div>
                </div>

                {settingsError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{settingsError}</div>}
                {settingsMessage && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{settingsMessage}</div>}

                <form onSubmit={saveGroqSettings} className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#666577]">Groq API key</label>
                    <div className="flex gap-2">
                      <input
                        type={showSettingsKey ? "text" : "password"}
                        autoComplete="new-password"
                        value={settingsKey}
                        onChange={(event) => setSettingsKey(event.target.value)}
                        placeholder={groqConfigured ? "Enter a new key to replace the saved key" : "Paste your Groq API key"}
                        className="min-w-0 flex-1 rounded-xl border border-[#e7e6ee] px-3.5 py-3 text-sm outline-none focus:border-[#aaa7ef]"
                      />
                      <button type="button" onClick={() => setShowSettingsKey((value) => !value)} className="rounded-xl border border-[#e7e6ee] px-3 text-xs text-[#777688] hover:bg-[#f7f7fa]">
                        {showSettingsKey ? "Hide" : "Show"}
                      </button>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#a2a1b1]">
                      Get a key from the <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="font-medium text-[#7774d9] underline">Groq Console</a>. Never share your key in chat or commit it to Git.
                    </p>
                  </div>

                  <button type="submit" disabled={settingsBusy || !settingsKey.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7774d9] px-5 py-3 text-sm font-semibold text-white hover:bg-[#6865ca] disabled:cursor-not-allowed disabled:opacity-60">
                    {settingsBusy ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
                    {settingsBusy ? "Connecting..." : groqConfigured ? "Save new key & connect" : "Save key & connect"}
                  </button>
                </form>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button type="button" disabled={settingsBusy || settingsLoading || !groqConfigured} onClick={() => void testGroqConnection()} className="flex items-center justify-center gap-2 rounded-xl border border-[#e7e6ee] px-4 py-2.5 text-sm font-medium text-[#666577] hover:bg-[#f7f7fa] disabled:cursor-not-allowed disabled:opacity-50">
                    {settingsBusy ? <LoaderCircle size={15} className="animate-spin" /> : <Activity size={15} />} Test connection
                  </button>
                  <button type="button" disabled={settingsBusy || !groqConfigured} onClick={() => void removeGroqKey()} className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                    <Trash2 size={15} /> Remove key
                  </button>
                </div>

                <div className="rounded-xl border border-[#eae8f6] bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#55536f]">
                    <Sparkles size={17} className="text-[#7774d9]" /> Gemini fallback
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#85839e]">
                    Used after Groq when it is configured. The key is encrypted on the server and never returned to the browser.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className={`h-2.5 w-2.5 rounded-full ${geminiConfigured ? "bg-emerald-500" : "bg-gray-300"}`} />
                    <span className="font-medium text-[#55536f]">
                      {settingsLoading ? "Checking configuration..." : geminiConfigured ? "API key is saved" : "No API key saved"}
                    </span>
                  </div>
                  <form onSubmit={saveGeminiSettings} className="mt-4 space-y-3">
                    <label className="mb-1.5 block text-xs font-semibold text-[#666577]">Gemini API key</label>
                    <div className="flex gap-2">
                      <input
                        type={showGeminiKey ? "text" : "password"}
                        autoComplete="new-password"
                        value={geminiKey}
                        onChange={(event) => setGeminiKey(event.target.value)}
                        placeholder={geminiConfigured ? "Enter a new key to replace the saved key" : "Paste your Gemini API key"}
                        className="min-w-0 flex-1 rounded-xl border border-[#e7e6ee] px-3.5 py-3 text-sm outline-none focus:border-[#aaa7ef]"
                      />
                      <button type="button" onClick={() => setShowGeminiKey((value) => !value)} className="rounded-xl border border-[#e7e6ee] px-3 text-xs text-[#777688] hover:bg-[#f7f7fa]">
                        {showGeminiKey ? "Hide" : "Show"}
                      </button>
                    </div>
                    <p className="text-xs leading-5 text-[#a2a1b1]">
                      Create a key in the <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="font-medium text-[#7774d9] underline">Google AI Studio</a>. Review Google's current pricing and quota before use.
                    </p>
                    <button type="submit" disabled={settingsBusy || !geminiKey.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7774d9] px-5 py-3 text-sm font-semibold text-white hover:bg-[#6865ca] disabled:cursor-not-allowed disabled:opacity-60">
                      {settingsBusy ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
                      {settingsBusy ? "Connecting..." : geminiConfigured ? "Save new key & connect" : "Save key & connect"}
                    </button>
                  </form>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button type="button" disabled={settingsBusy || settingsLoading || !geminiConfigured} onClick={() => void testGeminiConnection()} className="flex items-center justify-center gap-2 rounded-xl border border-[#e7e6ee] px-4 py-2.5 text-sm font-medium text-[#666577] hover:bg-[#f7f7fa] disabled:cursor-not-allowed disabled:opacity-50">
                      <Activity size={15} /> Test Gemini
                    </button>
                    <button type="button" disabled={settingsBusy || !geminiConfigured} onClick={() => void removeGeminiKey()} className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                      <Trash2 size={15} /> Remove Gemini key
                    </button>
                  </div>
                </div>

                <div className="border-t border-[#f0eff5] pt-4">
                  <p className="text-xs leading-5 text-[#9998aa]">
                    Connecting Groq saves your encrypted API key. AI-generated descriptions and AI-powered library answers are separate integration steps; the current library search still uses keywords.
                  </p>
                  <div className="mt-4 flex justify-end">
                    <button type="button" disabled={settingsBusy} onClick={() => { setSettingsKey(""); setModal(null); }} className="rounded-xl px-4 py-2.5 text-sm text-[#777688] hover:bg-[#f7f7fa] disabled:opacity-50">Close</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
