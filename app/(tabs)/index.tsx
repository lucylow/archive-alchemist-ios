import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Alert, Animated, Easing, Linking, Modal, Platform as RNPlatform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { readReduceMotionSetting } from "@/lib/reduce-motion";
import { haptic } from "@/lib/haptics";
import { useAuth } from "@/hooks/use-auth";
import { canAutoPost, estimateTimeSaved, formatTimeSaved, getFreshReviewState, getPlatformPerformance } from "@/lib/workflow";
import { mergeMindsInsight, type PersistedMindMemory } from "@/lib/mind-memory";
import { getMindsErrorNotice, getMindsRequestStartNotice, shouldRetryMindsError } from "@/lib/minds-notices";
import { canStartMindsRequest, createMindsRequestGate, ignorePromiseRejection } from "@/lib/minds-request";
import { createSaveRequestGate } from "@/lib/save-request";
import { getAutoPostNotice } from "@/lib/save-notice";
import { clearArchiveItems, filterArchiveItems, formatArchivePreviewRow, getArchiveBrowserItems, getArchiveDetailSummary, getArchiveExportReviewLabel, getArchiveItemKey, getArchivePreviewContextLabel, getArchiveThumbnailFallbackLabel, getArchiveThumbnailRetryLabel, getArchivePreviewLabel, getArchivePreviewRestoredNotice, getArchivePreviewResumeLabel, getSelectedArchiveItems, reconcileArchiveSelection, isSafeArchiveSourceUrl, isValidArchiveItem, parseArchiveManifest, serializeArchiveCsv, serializeArchiveManifest, sortArchiveItems, toggleArchiveSelection, type ArchiveItem, type ArchiveSort } from "@/lib/archive-import";
import { trpc } from "@/lib/trpc";
import { appendExportHistory, clearExportHistory, formatExportHistoryLabel, getExportHistoryDetailLabel, getExportReviewWindowLabel, getExportReviewWindowToggleLabel, getExportSizeEstimateLabel, getLargeExportWarningLabel, getUtf8ByteLength, getLastExportFormatPresetLabel, getLastExportShortcutLabel, getLatestExportStatusLabel, getRecommendedExportActionLabel, getExportRetryAttemptLabel, getExportRetryLimitLabel, getExportFailureDiagnosticLabel, getExportFailureRecoveryGuidance, getExportDiagnosticsConfirmationDuration, getDiagnosticsCopyOutcome, MAX_EXPORT_RETRY_ATTEMPTS, normalizeExportHistory, type ExportFailureStage, type ExportHistoryEntry } from "@/lib/export-history";
import type { MindsDiscoveryRequest, MindsDiscoveryResponse } from "@/shared/minds";
import {
  isWithinStorageLimit,
  MAX_HISTORY_STORAGE_LENGTH,
  MAX_MEMORY_STORAGE_LENGTH,
  MAX_PLATFORMS_STORAGE_LENGTH,
  MAX_ARCHIVE_STORAGE_LENGTH,
} from "@/shared/storage-bounds";

type Phase = "home" | "connect" | "scan" | "discoveries" | "repurpose" | "results";
type Platform = "YouTube" | "Spotify" | "Substack" | "Twitter" | "Instagram" | "TikTok";

type Memory = Omit<PersistedMindMemory, "platforms"> & { platforms: Platform[] };

const MEMORY_KEY = "archive-alchemist-mind-memory";
const HISTORY_KEY = "archive-alchemist-mind-history";
const PLATFORMS_KEY = "archive-alchemist-selected-platforms";
const ARCHIVE_KEY = "archive-items";
const ARCHIVE_PREVIEW_KEY = "archive-preview";
const EXPORT_HISTORY_KEY = "archive-export-history";
const platforms: Platform[] = ["YouTube", "Spotify", "Substack", "Twitter", "Instagram", "TikTok"];
const discoveries = [
  { title: "How to Edit Like a Pro", year: 2023, score: 94, views: "12.4K", icon: "🎬" },
  { title: "The Future of AI in Content", year: 2022, score: 91, views: "8.7K", icon: "🎙️" },
  { title: "10 Tools Every Creator Needs", year: 2021, score: 89, views: "15.2K", icon: "📝" },
];
const formatSavedAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "recently" : date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const isValidMindsInsight = (value: unknown): value is MindsDiscoveryResponse => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MindsDiscoveryResponse>;
  return (
    typeof candidate.summary === "string" &&
    candidate.summary.length > 0 &&
    Array.isArray(candidate.recommendations) &&
    candidate.recommendations.length > 0 &&
    candidate.recommendations.every((recommendation) => (
      Boolean(recommendation) &&
      typeof recommendation.title === "string" &&
      typeof recommendation.rationale === "string" &&
      Array.isArray(recommendation.formats) &&
      recommendation.formats.length > 0 &&
      typeof recommendation.confidence === "number" &&
      recommendation.confidence >= 0 &&
      recommendation.confidence <= 1
    ))
  );
};

const isValidMemory = (value: unknown): value is Memory => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Memory>;
  return (
    typeof candidate.title === "string" &&
    Array.isArray(candidate.platforms) &&
    candidate.platforms.length > 0 &&
    candidate.platforms.every((item) => platforms.includes(item as Platform)) &&
    typeof candidate.savedAt === "string" &&
    typeof candidate.followUp === "string" &&
    (candidate.mindsInsight === undefined || isValidMindsInsight(candidate.mindsInsight))
  );
};

const phaseTitle: Record<Phase, string> = {
  home: "Overview",
  connect: "Connect sources",
  scan: "Archive scan",
  discoveries: "Discoveries",
  repurpose: "Review outputs",
  results: "Follow-up",
};

const outputs = [
  ["TikTok", "TikTok / Reels Clip (0:58)"],
  ["Instagram", "Instagram Reel (0:30)"],
  ["YouTube", "YouTube Short (0:45)"],
  ["Spotify", "Spotify Audiogram (0:45)"],
  ["Twitter", "Twitter Thread (10 tweets)"],
  ["Substack", "Blog Post (1,200 words)"],
] as const;

function PrimaryButton({ label, onPress, disabled = false, accessibilityHint, accessibilityState }: { label: string; onPress: () => void; disabled?: boolean; accessibilityHint?: string; accessibilityState?: { busy?: boolean } }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, ...accessibilityState }}
      disabled={disabled}
      onPress={() => {
        if (!disabled) {
          haptic.light();
          onPress();
        }
      }}
      style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, accessibilityHint, disabled = false, accessibilityState }: { label: string; onPress: () => void; accessibilityHint?: string; disabled?: boolean; accessibilityState?: { busy?: boolean } }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, ...accessibilityState }}
      disabled={disabled}
      onPress={() => {
        if (!disabled) {
          haptic.light();
          onPress();
        }
      }}
      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [phase, setPhase] = useState<Phase>("home");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["YouTube", "Instagram", "TikTok"]);
  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>([]);
  const [pendingArchiveItems, setPendingArchiveItems] = useState<ArchiveItem[]>([]);
  const [pendingArchiveName, setPendingArchiveName] = useState<string | null>(null);
  const [previewQuery, setPreviewQuery] = useState("");
  const [previewYear, setPreviewYear] = useState("");
  const [previewSort, setPreviewSort] = useState<ArchiveSort>("newest");
  const [selectedPreviewKeys, setSelectedPreviewKeys] = useState<string[]>([]);
  const [archiveDetail, setArchiveDetail] = useState<ArchiveItem | null>(null);
  const [archiveBrowserVisible, setArchiveBrowserVisible] = useState(false);
  const [browserQuery, setBrowserQuery] = useState("");
  const [browserYear, setBrowserYear] = useState("");
  const [browserSort, setBrowserSort] = useState<ArchiveSort>("newest");
  const [selectedBrowserKeys, setSelectedBrowserKeys] = useState<string[]>([]);
  const [selectedBrowserReviewVisible, setSelectedBrowserReviewVisible] = useState(false);
  const [reviewWindowExpanded, setReviewWindowExpanded] = useState(false);
  const [isExportingArchive, setIsExportingArchive] = useState(false);
  const [failedThumbnailUrls, setFailedThumbnailUrls] = useState<string[]>([]);
  const [isImportingArchive, setIsImportingArchive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [memory, setMemory] = useState<Memory | null>(null);
  const [history, setHistory] = useState<Memory[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistoryEntry[]>([]);
  const [exportHistoryVisible, setExportHistoryVisible] = useState(false);
  const [preferredExportFormat, setPreferredExportFormat] = useState<"json" | "csv" | null>(null);
  const [failedExport, setFailedExport] = useState<{ format: "json" | "csv"; items: ArchiveItem[]; exportLabel: string; attempt: number; failureStage: ExportFailureStage } | null>(null);
  const latestExport = exportHistory[0] ?? null;
  const [reviewMode, setReviewMode] = useState(false);
  const [approvedOutputs, setApprovedOutputs] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [diagnosticsCopied, setDiagnosticsCopied] = useState(false);
  const screenActiveRef = useRef(true);
  const diagnosticsExpiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetDiagnosticsCopied = () => {
    if (diagnosticsExpiryTimerRef.current) clearTimeout(diagnosticsExpiryTimerRef.current);
    diagnosticsExpiryTimerRef.current = null;
    setDiagnosticsCopied(false);
  };
  const [mindsInsight, setMindsInsight] = useState<MindsDiscoveryResponse | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const diagnosticsConfirmationDuration = getExportDiagnosticsConfirmationDuration(reduceMotion);
  const activeDiscoveries = useMemo(
    () => archiveItems.length > 0 ? archiveItems.map((item) => ({ ...item, score: 90, icon: "✦" })) : discoveries,
    [archiveItems],
  );
  const browserItems = useMemo(() => sortArchiveItems(filterArchiveItems(getArchiveBrowserItems(archiveItems), browserQuery, browserYear), browserSort), [archiveItems, browserQuery, browserSort, browserYear]);
  const selectedBrowserItems = useMemo(() => getSelectedArchiveItems(browserItems, selectedBrowserKeys), [browserItems, selectedBrowserKeys]);
  const selectedJsonSize = useMemo(() => getUtf8ByteLength(serializeArchiveManifest(selectedBrowserItems)), [selectedBrowserItems]);
  const selectedCsvSize = useMemo(() => getUtf8ByteLength(serializeArchiveCsv(selectedBrowserItems)), [selectedBrowserItems]);

  useEffect(() => {
    setSelectedBrowserKeys((current) => {
      const next = reconcileArchiveSelection(archiveItems, current);
      return next.length === current.length && next.every((key, index) => key === current[index]) ? current : next;
    });
  }, [archiveItems]);

  const loadingPulse = useRef(new Animated.Value(0)).current;
  const mindsRequestGate = useRef(createMindsRequestGate()).current;
  const saveRequestGate = useRef(createSaveRequestGate()).current;
  const resetRequestGate = useRef(createSaveRequestGate()).current;
  const archiveResetRequestGate = useRef(createSaveRequestGate()).current;
  const archiveExportRequestGate = useRef(createSaveRequestGate()).current;
  const archiveExportRequestIdRef = useRef(0);
  const exportHistoryResetGate = useRef(createSaveRequestGate()).current;
  const persistInsightToMemory = async (insight: MindsDiscoveryResponse, requestId: number) => {
    if (!memory || !mindsRequestGate.isCurrent(requestId)) return;
    const { memory: updatedMemory, history: nextHistory } = mergeMindsInsight(memory, history, insight);
    try {
      if (!mindsRequestGate.isCurrent(requestId)) return;
      await Promise.all([
        AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(updatedMemory)),
        AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory)),
      ]);
      if (!mindsRequestGate.isCurrent(requestId)) return;
      setMemory(updatedMemory);
      setHistory(nextHistory);
    } catch {
      if (mindsRequestGate.isCurrent(requestId) && screenActiveRef.current) {
        setNotice("Minds returned an insight, but it could not be saved to local memory.");
      }
    }
  };
  const mindsQuota = trpc.minds.quota.useQuery(undefined, {
    enabled: phase === "discoveries",
    staleTime: 30_000,
  });
  const mindsDiscovery = trpc.minds.discover.useMutation({
    retry: false,
  });

  useEffect(() => {
    if (phase !== "discoveries") {
      mindsRequestGate.cancel();
    }
  }, [phase, mindsRequestGate]);

  useEffect(() => {
    screenActiveRef.current = true;
    return () => {
      screenActiveRef.current = false;
      if (diagnosticsExpiryTimerRef.current) clearTimeout(diagnosticsExpiryTimerRef.current);
      diagnosticsExpiryTimerRef.current = null;
      mindsRequestGate.cancel();
      archiveExportRequestGate.finish();
    };
  }, [mindsRequestGate, archiveExportRequestGate]);

  useEffect(() => {
    if (!diagnosticsCopied) return;
    if (diagnosticsExpiryTimerRef.current) clearTimeout(diagnosticsExpiryTimerRef.current);
    diagnosticsExpiryTimerRef.current = setTimeout(() => {
      if (screenActiveRef.current) setDiagnosticsCopied(false);
      diagnosticsExpiryTimerRef.current = null;
    }, diagnosticsConfirmationDuration);
    return () => {
      if (diagnosticsExpiryTimerRef.current) clearTimeout(diagnosticsExpiryTimerRef.current);
      diagnosticsExpiryTimerRef.current = null;
    };
  }, [diagnosticsCopied, diagnosticsConfirmationDuration]);

  useEffect(() => {
    let mounted = true;
    void readReduceMotionSetting(() => AccessibilityInfo.isReduceMotionEnabled()).then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      loadingPulse.stopAnimation();
      loadingPulse.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingPulse, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(loadingPulse, { toValue: 0, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [loadingPulse, reduceMotion]);

  useEffect(() => {
    let active = true;
    let hydrationTimeout: ReturnType<typeof setTimeout> | null = null;
    const hydrate = async () => {
      let recoveredInvalidStorage = false;
      let restoredArchivePreview = false;
      const discardStoredValue = async (key: string) => {
        recoveredInvalidStorage = true;
        if (!active) return;
        await AsyncStorage.removeItem(key);
      };

      try {
        const storageRead = Promise.all([
          AsyncStorage.getItem(MEMORY_KEY),
          AsyncStorage.getItem(HISTORY_KEY),
          AsyncStorage.getItem(PLATFORMS_KEY),
          AsyncStorage.getItem(ARCHIVE_KEY),
          AsyncStorage.getItem(ARCHIVE_PREVIEW_KEY),
          AsyncStorage.getItem(EXPORT_HISTORY_KEY),
        ]);
        const storageTimeout = new Promise<[string | null, string | null, string | null, string | null, string | null, string | null]>((resolve) => {
          hydrationTimeout = setTimeout(() => resolve([null, null, null, null, null, null]), 1500);
        });
        const [memoryValue, historyValue, platformsValue, archiveValue, previewValue, exportHistoryValue] = await Promise.race([storageRead, storageTimeout]);
        if (memoryValue && isWithinStorageLimit(memoryValue, MAX_MEMORY_STORAGE_LENGTH)) {
          try {
            const restoredMemory = JSON.parse(memoryValue) as Memory;
            if (isValidMemory(restoredMemory)) {
              setMemory(restoredMemory);
              setMindsInsight(restoredMemory.mindsInsight ?? null);
            } else {
              await discardStoredValue(MEMORY_KEY);
            }
          } catch {
            await discardStoredValue(MEMORY_KEY);
          }
        } else if (memoryValue) {
          await discardStoredValue(MEMORY_KEY);
        }
        if (historyValue && isWithinStorageLimit(historyValue, MAX_HISTORY_STORAGE_LENGTH)) {
          try {
            const restoredHistory = JSON.parse(historyValue) as Memory[];
            if (Array.isArray(restoredHistory) && restoredHistory.every(isValidMemory)) {
              setHistory(restoredHistory.slice(0, 5));
            } else {
              await discardStoredValue(HISTORY_KEY);
            }
          } catch {
            await discardStoredValue(HISTORY_KEY);
          }
        } else if (historyValue) {
          await discardStoredValue(HISTORY_KEY);
        }
        if (exportHistoryValue && isWithinStorageLimit(exportHistoryValue, MAX_HISTORY_STORAGE_LENGTH)) {
          try {
            const restoredExportHistory = normalizeExportHistory(JSON.parse(exportHistoryValue));
            if (restoredExportHistory.length > 0) setExportHistory(restoredExportHistory);
            else await discardStoredValue(EXPORT_HISTORY_KEY);
          } catch {
            await discardStoredValue(EXPORT_HISTORY_KEY);
          }
        } else if (exportHistoryValue) {
          await discardStoredValue(EXPORT_HISTORY_KEY);
        }
        if (archiveValue && isWithinStorageLimit(archiveValue, MAX_ARCHIVE_STORAGE_LENGTH)) {
          try {
            const restoredArchive = JSON.parse(archiveValue) as ArchiveItem[];
            if (Array.isArray(restoredArchive) && restoredArchive.length > 0 && restoredArchive.length <= 5000 && restoredArchive.every(isValidArchiveItem)) {
              setArchiveItems(restoredArchive);
            } else {
              await discardStoredValue(ARCHIVE_KEY);
            }
          } catch {
            await discardStoredValue(ARCHIVE_KEY);
          }
        } else if (archiveValue) {
          await discardStoredValue(ARCHIVE_KEY);
        }
        if (previewValue && isWithinStorageLimit(previewValue, MAX_ARCHIVE_STORAGE_LENGTH)) {
          try {
            const restoredPreview = JSON.parse(previewValue) as { items?: unknown; name?: unknown; selectedKeys?: unknown };
            if (restoredPreview && Array.isArray(restoredPreview.items) && restoredPreview.items.length > 0 && restoredPreview.items.length <= 5000 && restoredPreview.items.every(isValidArchiveItem) && typeof restoredPreview.name === "string" && restoredPreview.name.length <= 240 && Array.isArray(restoredPreview.selectedKeys) && restoredPreview.selectedKeys.every((key) => typeof key === "string" && key.length <= 240)) {
              setPendingArchiveItems(restoredPreview.items);
              setPendingArchiveName(restoredPreview.name);
              setSelectedPreviewKeys(restoredPreview.selectedKeys.slice(0, 5000));
              restoredArchivePreview = true;
            } else {
              await discardStoredValue(ARCHIVE_PREVIEW_KEY);
            }
          } catch {
            await discardStoredValue(ARCHIVE_PREVIEW_KEY);
          }
        } else if (previewValue) {
          await discardStoredValue(ARCHIVE_PREVIEW_KEY);
        }
        if (platformsValue && isWithinStorageLimit(platformsValue, MAX_PLATFORMS_STORAGE_LENGTH)) {
          try {
            const restored = JSON.parse(platformsValue) as Platform[];
            if (Array.isArray(restored) && restored.length > 0 && restored.every((item) => platforms.includes(item))) {
              setSelectedPlatforms(restored);
            } else {
              await discardStoredValue(PLATFORMS_KEY);
            }
          } catch {
            await discardStoredValue(PLATFORMS_KEY);
          }
        } else if (platformsValue) {
          await discardStoredValue(PLATFORMS_KEY);
        }
        if (active && recoveredInvalidStorage) {
          setNotice("Some saved local memory was reset because it was invalid or too large. Your current session is still available.");
        } else if (active && restoredArchivePreview) {
          const restoredName = JSON.parse(previewValue ?? "{}").name as string;
          const restoredItems = JSON.parse(previewValue ?? "{}").items as ArchiveItem[];
          setNotice(getArchivePreviewRestoredNotice(restoredItems, restoredName));
        }
      } catch {
        if (active) {
          setNotice("Saved local preferences could not be read. Your current session is still available.");
        }
      } finally {
        if (hydrationTimeout) clearTimeout(hydrationTimeout);
        hydrationTimeout = null;
        if (active) setIsHydrated(true);
      }
    };
    void hydrate();
    return () => {
      active = false;
      if (hydrationTimeout) clearTimeout(hydrationTimeout);
      hydrationTimeout = null;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    let active = true;
    AsyncStorage.setItem(PLATFORMS_KEY, JSON.stringify(selectedPlatforms)).catch(() => {
      if (active) setNotice("Platform preference could not be saved, but this session is still available.");
    });
    return () => {
      active = false;
    };
  }, [isHydrated, selectedPlatforms]);

  useEffect(() => {
    if (!isHydrated || pendingArchiveItems.length === 0 || !pendingArchiveName) return;
    AsyncStorage.setItem(ARCHIVE_PREVIEW_KEY, JSON.stringify({ items: pendingArchiveItems, name: pendingArchiveName, selectedKeys: selectedPreviewKeys })).catch(() => {
      if (screenActiveRef.current) setNotice("Archive preview selection could not be saved, but this session is still available.");
    });
  }, [isHydrated, pendingArchiveItems, pendingArchiveName, selectedPreviewKeys]);

  useEffect(() => {
    if (!isHydrated || archiveItems.length === 0) return;
    AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(archiveItems)).catch(() => {
      if (screenActiveRef.current) setNotice("Imported archive items could not be saved, but this session is still available.");
    });
  }, [archiveItems, isHydrated]);

  useEffect(() => {
    if (phase !== "scan") return;
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((current) => {
        const next = Math.min(current + 20, 100);
        if (next === 100) clearInterval(timer);
        return next;
      });
    }, 220);
    return () => clearInterval(timer);
  }, [phase]);

  const selectedOutputs = useMemo(
    () => outputs.filter(([platform]) => selectedPlatforms.includes(platform)),
    [selectedPlatforms],
  );

  const importArchive = async () => {
    if (isImportingArchive) return;
    setIsImportingArchive(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/csv", "text/plain"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const items = parseArchiveManifest(await response.text(), asset.name);
      setPendingArchiveItems(items);
      setPendingArchiveName(asset.name);
      setPreviewQuery("");
      setPreviewYear("");
      setPreviewSort("newest");
      setSelectedPreviewKeys([]);
      setNotice(`${getArchivePreviewLabel(items, asset.name)}. Review and confirm before replacing the current archive.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Archive import failed. Choose a JSON or CSV manifest and try again.");
    } finally {
      if (screenActiveRef.current) setIsImportingArchive(false);
    }
  };

  const previewMatches = useMemo(() => sortArchiveItems(filterArchiveItems(pendingArchiveItems, previewQuery, previewYear), previewSort), [pendingArchiveItems, previewQuery, previewYear, previewSort]);
  const selectedPreviewItems = useMemo(() => getSelectedArchiveItems(previewMatches, selectedPreviewKeys), [previewMatches, selectedPreviewKeys]);
  const selectedPreviewJsonSize = useMemo(() => getUtf8ByteLength(serializeArchiveManifest(selectedPreviewItems)), [selectedPreviewItems]);
  const selectedPreviewCsvSize = useMemo(() => getUtf8ByteLength(serializeArchiveCsv(selectedPreviewItems)), [selectedPreviewItems]);

  const commitPendingArchive = () => {
    if (pendingArchiveItems.length === 0 || !pendingArchiveName) return;
    setArchiveItems(pendingArchiveItems);
    void AsyncStorage.removeItem(ARCHIVE_PREVIEW_KEY);
    setPendingArchiveItems([]);
    setNotice(`Imported ${pendingArchiveItems.length} archive item${pendingArchiveItems.length === 1 ? "" : "s"} from ${pendingArchiveName}.`);
    setPendingArchiveName(null);
  };

  const confirmPendingArchive = () => {
    if (pendingArchiveItems.length === 0 || !pendingArchiveName) return;
    Alert.alert(
      "Use this archive?",
      `${getArchivePreviewLabel(pendingArchiveItems, pendingArchiveName)}. This will replace the current imported archive, if present.`,
      [
        { text: "Keep current", style: "cancel" },
        { text: "Use archive", onPress: commitPendingArchive },
      ],
    );
  };

  const renderArchiveThumbnail = (item: ArchiveItem, large = false) => {
    if (!item.thumbnailUrl) return <Text accessibilityRole="text" style={styles.thumbnailFallback}>{getArchiveThumbnailFallbackLabel(item.title)}</Text>;
    if (failedThumbnailUrls.includes(item.thumbnailUrl)) return <Pressable accessibilityRole="button" accessibilityLabel={getArchiveThumbnailRetryLabel(item.title)} accessibilityHint="Tries loading this thumbnail again." onPress={() => setFailedThumbnailUrls((current) => current.filter((url) => url !== item.thumbnailUrl))} style={({ pressed }) => [styles.thumbnailFallbackAction, pressed && styles.pressed]}><Text style={styles.sourceLinkText}>Retry thumbnail</Text></Pressable>;
    return <Image source={{ uri: item.thumbnailUrl }} contentFit="cover" accessibilityLabel={`Thumbnail for ${item.title}`} onError={() => setFailedThumbnailUrls((current) => current.includes(item.thumbnailUrl!) ? current : [...current, item.thumbnailUrl!])} style={large ? styles.detailThumbnail : styles.archiveThumbnail} />;
  };

  const openArchiveSource = async (sourceUrl: string) => {
    if (!isSafeArchiveSourceUrl(sourceUrl)) {
      setNotice("This archive source link is unavailable because it is not a secure HTTPS URL.");
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(sourceUrl);
      if (!canOpen) throw new Error("unsupported");
      await Linking.openURL(sourceUrl);
    } catch {
      if (screenActiveRef.current) setNotice("The archive source link could not be opened on this device.");
    }
  };

  const discardPendingArchive = () => {
    setPendingArchiveItems([]);
    setPendingArchiveName(null);
    setSelectedPreviewKeys([]);
    void AsyncStorage.removeItem(ARCHIVE_PREVIEW_KEY);
    setPreviewQuery("");
    setPreviewYear("");
          setPreviewSort("newest");
      setSelectedPreviewKeys([]);
      setNotice("Archive preview discarded. Your current archive is unchanged.");
  };

  const requestMindsInsight = () => {
    if (!canStartMindsRequest(mindsDiscovery.isPending)) return;
    const requestId = mindsRequestGate.begin();
    const payload: Omit<MindsDiscoveryRequest, "retryAttempt"> = {
      platforms: selectedPlatforms,
      archiveTitle: activeDiscoveries[0].title,
      sourceYear: activeDiscoveries[0].year,
      sourceViews: activeDiscoveries[0].views,
    };
    setMindsInsight(null);
    mindsDiscovery.reset();
    setNotice(getMindsRequestStartNotice());

    const submitAttempt = (retryAttempt: number): void => {
      mindsDiscovery.mutate(
        { ...payload, retryAttempt },
        {
          onSuccess: (data) => {
            if (!mindsRequestGate.isCurrent(requestId)) return;
            setMindsInsight(data);
            ignorePromiseRejection(mindsQuota.refetch());
            setNotice("Minds returned a structured follow-up plan for this archive item.");
            void persistInsightToMemory(data, requestId);
          },
          onError: (error) => {
            if (!mindsRequestGate.isCurrent(requestId)) return;
            if (retryAttempt === 0 && shouldRetryMindsError(error)) {
              setNotice("Minds is retrying after a temporary service issue.");
              submitAttempt(1);
              return;
            }
            ignorePromiseRejection(mindsQuota.refetch());
            setNotice(getMindsErrorNotice(error));
          },
        },
      );
    };

    submitAttempt(0);
  };

  const cancelMindsInsight = () => {
    mindsRequestGate.cancel();
    mindsDiscovery.reset();
    setMindsInsight(null);
    setNotice("Minds analysis cancelled. Your local workflow is still available.");
  };

  const saveMemory = async () => {
    if (!saveRequestGate.tryStart()) return { saved: false, historySaved: false };

    const record: Memory = {
      title: "How to Edit Like a Pro",
      platforms: selectedPlatforms,
      savedAt: new Date().toISOString(),
      followUp: "The 60-second editing clip performed 3.2× better than average.",
      mindsInsight: mindsInsight ?? undefined,
    };
    try {
      if (screenActiveRef.current) setIsSaving(true);
      await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(record));
      if (!screenActiveRef.current) return { saved: false, historySaved: false };
      const nextHistory = [record, ...history.filter((item) => item.savedAt !== record.savedAt)].slice(0, 5);
      let historySaved = true;
      try {
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
      } catch {
        historySaved = false;
      }
      if (!screenActiveRef.current) return { saved: false, historySaved: false };
      setMemory(record);
      setHistory(nextHistory);
      haptic.success();
      return { saved: true, historySaved };
    } catch {
      if (screenActiveRef.current) {
        setNotice("Mind memory could not be saved. Your workflow is still available for this session.");
      }
      return { saved: false, historySaved: false };
    } finally {
      saveRequestGate.finish();
      if (screenActiveRef.current) setIsSaving(false);
    }
  };

  const exportRecommendedFormat = () => {
    if (!preferredExportFormat) {
      if (screenActiveRef.current) setNotice("Choose JSON or CSV to start an export.");
      return;
    }
    if (selectedBrowserItems.length === 0) {
      if (screenActiveRef.current) setNotice("Select at least one archive item before using the recommended format.");
      return;
    }
    void shareImportedArchive(preferredExportFormat, selectedBrowserItems, "selected-browser");
  };

  const openLastExportContext = () => {
    setExportHistoryVisible(false);
    setArchiveBrowserVisible(true);
    setBrowserQuery("");
    setBrowserYear("");
    setBrowserSort("newest");
    setSelectedBrowserKeys([]);
    setReviewWindowExpanded(false);
    setPreferredExportFormat(latestExport?.format ?? null);
    if (screenActiveRef.current) setNotice(latestExport ? `${getLastExportShortcutLabel(latestExport)}. Recommended format: ${latestExport.format.toUpperCase()}. Showing the bounded archive browser; no archive contents are stored in export history.` : "Opening the bounded archive browser.");
  };

  const clearLocalExportHistory = async () => {
    if (!exportHistoryResetGate.tryStart()) return;
    try {
      await AsyncStorage.removeItem(EXPORT_HISTORY_KEY);
      if (!screenActiveRef.current) return;
      setExportHistory(clearExportHistory());
      setNotice("Local export history cleared. Imported archive and Mind memory are unchanged.");
    } catch {
      if (screenActiveRef.current) setNotice("Local export history could not be cleared. Try again from this device.");
    } finally {
      exportHistoryResetGate.finish();
    }
  };

  const confirmClearLocalExportHistory = () => {
    Alert.alert("Clear local export history?", "This removes export format, item count, and timestamp metadata from this device. Imported archive and Mind memory remain.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear history", style: "destructive", onPress: clearLocalExportHistory },
    ]);
  };

  const resetMemory = async () => {
    if (!resetRequestGate.tryStart()) return;
    try {
      await Promise.all([AsyncStorage.removeItem(MEMORY_KEY), AsyncStorage.removeItem(HISTORY_KEY)]);
      if (!screenActiveRef.current) return;
      setMemory(null);
      setHistory([]);
      setMindsInsight(null);
      setPhase("home");
      setNotice("Mind memory cleared. Your next dig starts fresh.");
    } catch {
      if (screenActiveRef.current) {
        setNotice("Mind memory could not be cleared. Try again from this device.");
      }
    } finally {
      resetRequestGate.finish();
    }
  };

  const shareImportedArchive = async (format: "json" | "csv", items = archiveItems, exportLabel = "archive", warningConfirmed = false, freshExport = false) => {
    const isContinuingFailedExport = !freshExport && failedExport?.format === format && failedExport.exportLabel === exportLabel;
    const nextAttempt = isContinuingFailedExport ? failedExport.attempt + 1 : 1;
    if (isContinuingFailedExport && nextAttempt > MAX_EXPORT_RETRY_ATTEMPTS) {
      if (screenActiveRef.current) setNotice(getExportRetryLimitLabel(format));
      return;
    }
    if (items.length === 0) {
      if (screenActiveRef.current) setNotice("There are no matching archive items to export.");
      return;
    }
    const previewContents = format === "json" ? serializeArchiveManifest(items) : serializeArchiveCsv(items);
    const largeExportWarning = getLargeExportWarningLabel(format, getUtf8ByteLength(previewContents));
    if (largeExportWarning && !warningConfirmed) {
      Alert.alert("Large export", largeExportWarning, [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: () => { void shareImportedArchive(format, items, exportLabel, true); } },
      ]);
      return;
    }
    if (!archiveExportRequestGate.tryStart()) return;
    setFailedExport(null);
    resetDiagnosticsCopied();
    const requestId = archiveExportRequestIdRef.current + 1;
    archiveExportRequestIdRef.current = requestId;
    if (screenActiveRef.current) setIsExportingArchive(true);
    let failureStage: ExportFailureStage = "prepare";
    try {
      failureStage = "availability";
      if (!(await Sharing.isAvailableAsync())) {
        if (screenActiveRef.current) {
          setFailedExport({ format, items, exportLabel, attempt: nextAttempt, failureStage });
          setNotice(`${getExportFailureDiagnosticLabel(format, failureStage)} Your selection is preserved; try again.`);
        }
        return;
      }
      failureStage = "prepare";
      const extension = format === "json" ? "json" : "csv";
      const mimeType = format === "json" ? "application/json" : "text/csv";
      const contents = previewContents;
      const fileUri = `${FileSystem.cacheDirectory}archive-alchemist-${exportLabel}-${items.length}.${extension}`;
      await FileSystem.writeAsStringAsync(fileUri, contents, { encoding: FileSystem.EncodingType.UTF8 });
      if (archiveExportRequestIdRef.current !== requestId) return;
      failureStage = "share";
      await Sharing.shareAsync(fileUri, { mimeType, dialogTitle: `Share Archive Alchemist ${format.toUpperCase()} export` });
      const completedExport: ExportHistoryEntry = { format, itemCount: items.length, exportedAt: new Date().toISOString() };
      const nextExportHistory = appendExportHistory(exportHistory, completedExport);
      let historySaved = true;
      try {
        await AsyncStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(nextExportHistory));
      } catch {
        historySaved = false;
      }
      if (screenActiveRef.current) {
        setFailedExport(null);
        resetDiagnosticsCopied();
        setExportHistory(nextExportHistory);
        setNotice(historySaved ? `Archive ${format.toUpperCase()} export is ready to share.` : `Archive ${format.toUpperCase()} export is ready to share, but local export history could not be saved.`);
      }
    } catch {
      if (archiveExportRequestIdRef.current === requestId && screenActiveRef.current) {
        setFailedExport({ format, items, exportLabel, attempt: nextAttempt, failureStage });
        setNotice(`${getExportFailureDiagnosticLabel(format, failureStage)} Your selection is preserved; retry when ready.`);
      }
    } finally {
      archiveExportRequestGate.finish();
      if (archiveExportRequestIdRef.current === requestId && screenActiveRef.current) setIsExportingArchive(false);
    }
  };

  const startFreshExport = () => {
    if (!failedExport) return;
    const { format, items, exportLabel } = failedExport;
    setFailedExport(null);
    resetDiagnosticsCopied();
    if (screenActiveRef.current) setNotice(null);
    void shareImportedArchive(format, items, exportLabel, false, true);
  };

  const copyExportDiagnostics = async () => {
    if (!failedExport) return;
    const diagnostics = getExportFailureDiagnosticLabel(failedExport.format, failedExport.failureStage);
    resetDiagnosticsCopied();
    try {
      await Clipboard.setStringAsync(diagnostics);
      if (screenActiveRef.current) {
        const outcome = getDiagnosticsCopyOutcome(RNPlatform.OS === "ios" || RNPlatform.OS === "android" || RNPlatform.OS === "web" ? RNPlatform.OS : "default", true);
        setDiagnosticsCopied(outcome.copied);
        setNotice(outcome.notice);
      }
    } catch {
      if (screenActiveRef.current) {
        const outcome = getDiagnosticsCopyOutcome(RNPlatform.OS === "ios" || RNPlatform.OS === "android" || RNPlatform.OS === "web" ? RNPlatform.OS : "default", false);
        resetDiagnosticsCopied();
        setNotice(outcome.notice);
      }
    }
  };

  const dismissDiagnosticsCopied = resetDiagnosticsCopied;

  const exportImportedArchive = () => {
    Alert.alert("Export archive", "Choose a normalized format to share.", [
      { text: "Cancel", style: "cancel" },
      { text: "JSON", onPress: () => { void shareImportedArchive("json"); } },
      { text: "CSV", onPress: () => { void shareImportedArchive("csv"); } },
    ]);
  };

  const exportRecommendedPreviewFormat = () => {
    if (!preferredExportFormat) {
      if (screenActiveRef.current) setNotice("Choose JSON or CSV to start a preview export.");
      return;
    }
    if (selectedPreviewItems.length === 0) {
      if (screenActiveRef.current) setNotice("Select at least one matching archive item before using the recommended format.");
      return;
    }
    void shareImportedArchive(preferredExportFormat, selectedPreviewItems, "selected-preview");
  };

  const exportPreviewResults = () => {
    if (selectedPreviewItems.length === 0) {
      setNotice("Select at least one matching archive item to export.");
      return;
    }
    Alert.alert("Export selected preview rows", `${selectedPreviewItems.length} selected item${selectedPreviewItems.length === 1 ? "" : "s"} will be shared.`, [
      { text: "Cancel", style: "cancel" },
      ...(preferredExportFormat ? [{ text: `${preferredExportFormat.toUpperCase()} · recommended`, onPress: exportRecommendedPreviewFormat }] : []),
      { text: "JSON", onPress: () => { void shareImportedArchive("json", selectedPreviewItems, "selected-preview"); } },
      { text: "CSV", onPress: () => { void shareImportedArchive("csv", selectedPreviewItems, "selected-preview"); } },
    ]);
  };

  const cancelArchiveExport = () => {
    if (!isExportingArchive) return;
    archiveExportRequestIdRef.current += 1;
    archiveExportRequestGate.finish();
    if (screenActiveRef.current) {
      setIsExportingArchive(false);
      setNotice("Archive export cancelled. Your selection is preserved.");
    }
  };

  const exportBrowserResults = () => {
    if (selectedBrowserItems.length === 0) {
      setNotice("Select at least one visible archive item to export.");
      return;
    }
    setSelectedBrowserReviewVisible(true);
  };

  const clearImportedArchive = async () => {
    if (!archiveResetRequestGate.tryStart()) return;
    try {
      await AsyncStorage.removeItem(ARCHIVE_KEY);
      if (!screenActiveRef.current) return;
      setArchiveItems(clearArchiveItems());
      setPendingArchiveItems([]);
      setPendingArchiveName(null);
      setPreviewQuery("");
      setPreviewYear("");
      setPreviewSort("newest");
      setSelectedPreviewKeys([]);
      setNotice("Imported archive cleared. Mind memory is still available.");
    } catch {
      if (screenActiveRef.current) setNotice("Imported archive could not be cleared. Try again from this device.");
    } finally {
      archiveResetRequestGate.finish();
    }
  };

  const confirmClearImportedArchive = () => {
    Alert.alert(
      "Clear imported archive?",
      "This removes the imported archive items from this device. Your Mind memory and preferences will remain.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear archive", style: "destructive", onPress: clearImportedArchive },
      ],
    );
  };

  const confirmResetMemory = () => {
    Alert.alert(
      "Clear local Mind memory?",
      "This removes saved Mind workflows from this device. Your source-platform preferences will remain.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear memory", style: "destructive", onPress: resetMemory },
      ],
    );
  };

  const togglePlatform = (platform: Platform) => {
    haptic.selection();
    setSelectedPlatforms((current) => {
      const next = current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform];
      return next;
    });
  };

  const goBack = () => {
    haptic.light();
    const previous: Record<Exclude<Phase, "home">, Phase> = {
      connect: "home",
      scan: "connect",
      discoveries: "scan",
      repurpose: "discoveries",
      results: "repurpose",
    };
    setPhase(previous[phase as Exclude<Phase, "home">]);
  };

  useEffect(() => {
    if (isHydrated) {
      AccessibilityInfo.announceForAccessibility(`${phaseTitle[phase]} screen`);
    }
  }, [isHydrated, phase]);

  const header = (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {phase !== "home" && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Back from ${phaseTitle[phase]}`}
            onPress={goBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>
        )}
        <View>
          <Text style={styles.eyebrow}>ARCHIVE ALCHEMIST · {phaseTitle[phase].toUpperCase()}</Text>
          <Text style={styles.headerTitle}>Creator memory, activated.</Text>
        </View>
      </View>
      <View style={styles.mindBadge}>
        <Text style={styles.mindBadgeText}>MIND</Text>
      </View>
    </View>
  );

  const progressBar = phase === "scan" ? (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Archive scan progress"
      accessibilityValue={{ min: 0, max: 100, now: progress }}
      style={styles.progressWrap}
    >
      <View style={[styles.progressFill, { width: `${progress}%` }]} />
    </View>
  ) : null;

  if (!isHydrated) {
    return (
      <ScreenContainer containerClassName="bg-background" edges={["top", "left", "right", "bottom"]}>
        <View style={styles.loadingState} accessibilityLiveRegion="polite">
          <View style={styles.loadingMark} accessibilityLabel="Archive Alchemist is preparing">
            <Animated.View
              style={[
                styles.loadingPulseRing,
                {
                  opacity: reduceMotion ? 0.55 : loadingPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.85] }),
                  transform: [{ scale: reduceMotion ? 1 : loadingPulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] }) }],
                },
              ]}
            />
            <View style={styles.loadingMarkCore}><Text style={styles.loadingMarkText}>AA</Text></View>
          </View>
          <ActivityIndicator color="#F4C95D" size="small" />
          <Text style={styles.loadingTitle}>Restoring Mind memory…</Text>
          <Text style={styles.bodyText}>Preparing your creator workspace.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {header}
        {notice && (
          <View
            accessible
            accessibilityRole="alert"
            accessibilityLabel={notice}
            accessibilityLiveRegion="polite"
            style={styles.notice}
          >
            <View style={styles.noticeRow}>
              <Text style={styles.noticeText}>{notice}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss status message"
                accessibilityHint="Closes this workflow status message."
                onPress={() => { setNotice(null); setFailedExport(null); setDiagnosticsCopied(false); }}
                style={({ pressed }) => [styles.noticeDismiss, pressed && styles.pressed]}
              >
                <Text style={styles.noticeDismissText}>Dismiss</Text>
              </Pressable>
            </View>
            {failedExport && <Text style={styles.noticeText} accessibilityRole="text">{getExportFailureDiagnosticLabel(failedExport.format, failedExport.failureStage)}</Text>}
            {failedExport && <Text style={styles.noticeText} accessibilityRole="text">Next step: {getExportFailureRecoveryGuidance(failedExport.failureStage)}</Text>}
            {failedExport && <SecondaryButton label="Copy diagnostics" accessibilityHint="Copies only the failure stage and format. Archive titles, URLs, and raw errors are never copied." onPress={() => { void copyExportDiagnostics(); }} />}
            {failedExport && diagnosticsCopied && <View style={styles.rowBetween}><Text style={styles.reviewHint} accessibilityRole="text" accessibilityLiveRegion="polite">Copied safely</Text><SecondaryButton label="Dismiss" accessibilityHint="Hides the copied confirmation without changing the failed export or diagnostics." onPress={dismissDiagnosticsCopied} /></View>}
            {failedExport && <SecondaryButton label={`Retry ${failedExport.format.toUpperCase()} export · ${getExportRetryAttemptLabel(failedExport.attempt)}`} accessibilityHint={`Retries the failed export using the preserved selected rows and format. ${getExportRetryAttemptLabel(failedExport.attempt)}; maximum ${MAX_EXPORT_RETRY_ATTEMPTS} attempts.`} onPress={() => { void shareImportedArchive(failedExport.format, failedExport.items, failedExport.exportLabel); }} />}
            {failedExport && failedExport.attempt >= MAX_EXPORT_RETRY_ATTEMPTS && <SecondaryButton label={`Start fresh ${failedExport.format.toUpperCase()} export`} accessibilityHint="Resets only the retry limit and starts the same export again without clearing your archive or selection." onPress={startFreshExport} />}
          </View>
        )}

        {phase === "home" && (
          <View style={styles.stack}>
            <View style={styles.heroCard}>
              <Text style={styles.heroKicker}>YOUR CREATOR ARCHIVE</Text>
              <Text style={styles.heroTitle}>Find the gold you forgot you made.</Text>
              <Text style={styles.bodyText}>
                The Minds index dormant work, match it to current signals, and keep the follow-up alive after you leave.
              </Text>
              <PrimaryButton
                label="Start a new dig"
                onPress={() => {
                  mindsDiscovery.reset();
                  setMindsInsight(null);
                  const freshReview = getFreshReviewState();
                  setReviewMode(freshReview.reviewMode);
                  setApprovedOutputs(freshReview.approvedOutputs);
                  setProgress(0);
                  setPhase("connect");
                }}
              />
            </View>
            {pendingArchiveItems.length > 0 && pendingArchiveName && (
              <View style={styles.panel} accessible accessibilityLabel={`Pending archive preview: ${getArchivePreviewResumeLabel(pendingArchiveItems, pendingArchiveName)}`}>
                <View style={styles.rowBetween}>
                  <View style={styles.flexOne}>
                    <Text style={styles.sectionTitle}>Preview waiting</Text>
                    <Text style={styles.bodyText}>{getArchivePreviewResumeLabel(pendingArchiveItems, pendingArchiveName)}.</Text>
                    <Text style={styles.sourceSummary}>{getArchivePreviewContextLabel(pendingArchiveItems, selectedPreviewKeys.length)}.</Text>
                    {pendingArchiveItems.slice(0, 2).map((item) => (
                      <View key={getArchiveItemKey(item)} style={styles.previewSampleRow}>
                        {item.thumbnailUrl ? <Image source={{ uri: item.thumbnailUrl }} contentFit="cover" accessibilityLabel={`Thumbnail for ${item.title}`} onError={() => setNotice(getArchiveThumbnailFallbackLabel(item.title))} style={styles.archiveThumbnail} /> : <Text accessibilityRole="text" style={styles.thumbnailFallback}>{getArchiveThumbnailFallbackLabel(item.title)}</Text>}
                        <Text style={styles.mindDescription}>{formatArchivePreviewRow(item)}</Text>
                        <Pressable accessibilityRole="button" accessibilityLabel={`View details for ${item.title}`} accessibilityHint="Opens archive metadata and available source actions." onPress={() => setArchiveDetail(item)} style={({ pressed }) => [styles.sourceLink, pressed && styles.pressed]}><Text style={styles.sourceLinkText}>Details</Text></Pressable>{item.sourceUrl && <Pressable accessibilityRole="link" accessibilityLabel={`Open source for ${item.title}`} accessibilityHint="Opens the secure archive source link." onPress={() => void openArchiveSource(item.sourceUrl!)} style={({ pressed }) => [styles.sourceLink, pressed && styles.pressed]}><Text style={styles.sourceLinkText}>Open source</Text></Pressable>}
                      </View>
                    ))}
                  </View>
                  <SecondaryButton label="Review preview" accessibilityHint="Returns to the source archive screen to review and confirm this pending archive preview." onPress={() => setPhase("connect")} />
                </View>
              </View>
            )}
            {isAdmin && (
              <View style={styles.panel}>
                <View style={styles.rowBetween}>
                  <View style={styles.flexOne}>
                    <Text style={styles.sectionTitle}>Operator tools</Text>
                    <Text style={styles.bodyText}>Review private aggregate Minds performance without opening raw events.</Text>
                  </View>
                  <SecondaryButton
                    label="View analytics"
                    accessibilityHint="Opens the administrator-only Minds analytics summary."
                    onPress={() => router.push("/admin/analytics")}
                  />
                </View>
              </View>
            )}
            {exportHistory.length > 0 && (
              <View style={styles.panel} accessible accessibilityLabel={`Recent exports: ${exportHistory.length}`}>
                <View style={styles.rowBetween}><Text style={styles.sectionTitle}>Recent exports</Text><Text style={styles.livePill}>LOCAL ONLY</Text></View>
                {exportHistory.slice(0, 3).map((entry) => <View key={`${entry.exportedAt}-${entry.format}`} style={styles.mindRow}><View style={styles.flexOne}><Text style={styles.mindName}>{formatExportHistoryLabel(entry)}</Text><Text style={styles.mindDescription}>Shared {formatSavedAt(entry.exportedAt)}</Text></View></View>)}
                <Text style={styles.sourceSummary}>Only format, item count, and time are saved. Archive contents are not stored in this history.</Text>
                <View style={styles.actionRow}>
                  <SecondaryButton label="View export history" accessibilityHint="Opens local export metadata including format, item count, and timestamp." onPress={() => setExportHistoryVisible(true)} />
                  <SecondaryButton label={getLastExportShortcutLabel(latestExport)} accessibilityHint="Opens the bounded archive browser without storing archive contents or previous row selections." disabled={!latestExport} onPress={openLastExportContext} />
                  <SecondaryButton label="Clear export history" accessibilityHint="Asks for confirmation before removing local export metadata. Imported archive and Mind memory remain." onPress={confirmClearLocalExportHistory} />
                </View>
              </View>
            )}
            {archiveItems.length > 0 && (
              <View style={styles.panel} accessible accessibilityLabel={`Imported archive: ${archiveItems.length} item${archiveItems.length === 1 ? "" : "s"}`}>
                <Text style={styles.sectionTitle}>Imported archive</Text>
                {archiveItems.slice(0, 3).map((item) => (
                  <View key={getArchiveItemKey(item)} style={styles.previewSampleRow}>
                    {renderArchiveThumbnail(item)}
                    <Text style={styles.mindDescription}>{formatArchivePreviewRow(item)}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel={`View details for ${item.title}`} accessibilityHint="Opens archive metadata and available source actions." onPress={() => setArchiveDetail(item)} style={({ pressed }) => [styles.sourceLink, pressed && styles.pressed]}><Text style={styles.sourceLinkText}>Details</Text></Pressable>{item.sourceUrl && <Pressable accessibilityRole="link" accessibilityLabel={`Open source for ${item.title}`} accessibilityHint="Opens the secure archive source link." onPress={() => void openArchiveSource(item.sourceUrl!)} style={({ pressed }) => [styles.sourceLink, pressed && styles.pressed]}><Text style={styles.sourceLinkText}>Open source</Text></Pressable>}
                  </View>
                ))}
                {archiveItems.length > 3 && <Text style={styles.sourceSummary}>Showing 3 of {archiveItems.length} imported items.</Text>}
                <SecondaryButton label={`Browse archive (${archiveItems.length})`} accessibilityHint="Opens a bounded full list of imported archive records." onPress={() => setArchiveBrowserVisible(true)} />
              </View>
            )}
            <View style={styles.statsRow}>
              <Stat label="Archive items" value={archiveItems.length > 0 ? String(archiveItems.length) : "Demo"} />
              <Stat label="Dormant gold" value={archiveItems.length > 0 ? String(Math.min(archiveItems.length, 37)) : "Demo"} />
              <Stat label="Saved hours" value={archiveItems.length > 0 ? "—" : "Demo"} />
            </View>
            <View style={styles.panel}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Mind memory</Text>
                <Text style={styles.livePill}>{memory ? "RESTORED" : "READY"}</Text>
              </View>
              <Text style={styles.bodyText}>
                {memory
                  ? `Last workflow: ${memory.title} across ${memory.platforms.length} platform${memory.platforms.length === 1 ? "" : "s"}.`
                  : "Your first workflow will be remembered locally on this device."}
              </Text>
              {archiveItems.length > 0 && (
                <View style={styles.actionRow}>
                  <SecondaryButton
                    label="Export archive"
                    accessibilityHint="Creates a normalized JSON manifest and opens the device share sheet."
                    onPress={exportImportedArchive}
                  />
                  <SecondaryButton
                    label="Clear imported archive"
                    accessibilityHint="Opens a confirmation dialog before removing imported archive items from this device. Mind memory remains available."
                    onPress={confirmClearImportedArchive}
                  />
                </View>
              )}
              {memory && <Text style={styles.goldText}>Saved {formatSavedAt(memory.savedAt)} · {memory.followUp}</Text>}
              {memory && <Text style={styles.sourceSummary}>Sources: {memory.platforms.join(", ")}</Text>}
              {memory && (
                <View style={styles.actionRow}>
                  <SecondaryButton
                    label="Resume last follow-up"
                    accessibilityHint="Opens the saved results state so you can continue reviewing your last workflow."
                    onPress={() => setPhase("results")}
                  />
                  <SecondaryButton
                    label="Clear local memory"
                    accessibilityHint="Opens a confirmation dialog before removing the saved workflow from this device."
                    onPress={confirmResetMemory}
                  />
                </View>
              )}
            </View>
            {history.length > 0 && (
              <View style={styles.panel}>
                <Text style={styles.sectionTitle}>Recent workflows</Text>
                {history.map((item) => (
                  <View key={item.savedAt} style={styles.mindRow}>
                    <View style={styles.flexOne}>
                      <Text style={styles.mindName}>{item.title}</Text>
                      <Text style={styles.mindDescription}>{item.platforms.join(", ")} · Saved {formatSavedAt(item.savedAt)}{item.mindsInsight ? " · Minds insight saved" : ""}</Text>
                    </View>
                    <SecondaryButton
                      label={item.mindsInsight ? "View insight" : "Resume"}
                      accessibilityHint="Reopens this saved workflow and restores its Minds insight when available."
                      onPress={() => {
                        setMemory(item);
                        setMindsInsight(item.mindsInsight ?? null);
                        setPhase("results");
                        setNotice("Saved workflow reopened.");
                      }}
                    />
                  </View>
                ))}
              </View>
            )}
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Active Minds</Text>
              {[
                ["Archaeologist", "Indexing archive items"],
                ["Strategist", "Matching current signals"],
                ["Artisan", "Preparing platform outputs"],
                ["Conductor", "Keeping follow-up alive"],
              ].map(([name, description]) => (
                <View key={name} style={styles.mindRow}>
                  <View style={styles.mindDot} />
                  <View style={styles.flexOne}>
                    <Text style={styles.mindName}>{name}</Text>
                    <Text style={styles.mindDescription}>{description}</Text>
                  </View>
                  <Text style={styles.activeText}>ACTIVE</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {phase === "connect" && (
          <View style={styles.stack}>
                              <Text style={styles.screenTitle}>Choose your source archive</Text>

            <Text style={styles.bodyText}>Select the channels the Archaeologist should scan for dormant gold, or import a JSON/CSV manifest from Files.</Text>
            <SecondaryButton
              label={isImportingArchive ? "Importing archive…" : "Import archive manifest"}
              accessibilityHint="Opens Files so you can select a JSON or CSV archive manifest from this device."
              onPress={importArchive}
            />
            {pendingArchiveItems.length > 0 && pendingArchiveName && (
              <View style={styles.panel} accessible accessibilityLiveRegion="polite">
                <Text style={styles.sectionTitle}>Import preview</Text>
                <Text style={styles.bodyText}>{getArchivePreviewLabel(pendingArchiveItems, pendingArchiveName)}.</Text>
                <TextInput accessibilityLabel="Search imported archive preview" accessibilityHint="Filters preview rows by title." value={previewQuery} onChangeText={setPreviewQuery} placeholder="Search titles" placeholderTextColor="#9A91B6" style={styles.input} returnKeyType="search" />
                <TextInput accessibilityLabel="Filter imported archive preview by year" accessibilityHint="Shows only preview rows from the exact year entered." value={previewYear} onChangeText={(value) => setPreviewYear(value.replace(/[^0-9]/g, "").slice(0, 4))} placeholder="Filter by year" placeholderTextColor="#9A91B6" style={styles.input} keyboardType="number-pad" />
                <View style={styles.actionRow} accessibilityRole="radiogroup" accessibilityLabel="Sort imported archive preview">
                  <SecondaryButton label={previewSort === "newest" ? "Newest first" : "Sort by newest"} accessibilityHint="Sorts preview rows by publication year, newest first." onPress={() => setPreviewSort("newest")} />
                  <SecondaryButton label={previewSort === "views" ? "Highest views" : "Sort by views"} accessibilityHint="Sorts preview rows by highest view count first." onPress={() => setPreviewSort("views")} />
                </View>
                <View style={styles.actionRow}>
                  <SecondaryButton label={selectedPreviewItems.length > 0 ? `${selectedPreviewItems.length} selected` : "Select rows"} accessibilityHint="Selects or deselects all currently visible preview rows while preserving selections outside the active filter." onPress={() => setSelectedPreviewKeys((current) => toggleArchiveSelection(current, previewMatches))} />
                  <SecondaryButton label="Clear selection" accessibilityHint="Clears all preview row selections." onPress={() => setSelectedPreviewKeys([])} />
                </View>
                <View accessible accessibilityLabel={`Preview rows: ${previewMatches.slice(0, 3).map((item) => `${selectedPreviewKeys.includes(getArchiveItemKey(item)) ? "Selected " : ""}${formatArchivePreviewRow(item)}`).join("; ") || "No matching rows"}`}>
                  {previewMatches.slice(0, 3).map((item) => {
                    const key = getArchiveItemKey(item);
                    const selected = selectedPreviewKeys.includes(key);
                    return <Pressable key={key} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={formatArchivePreviewRow(item)} onPress={() => setSelectedPreviewKeys((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key])} style={({ pressed }) => [styles.previewRow, selected && styles.previewRowSelected, pressed && styles.pressed]}><Text style={styles.previewCheck}>{selected ? "✓" : "○"}</Text><Text style={styles.mindDescription}>{formatArchivePreviewRow(item)}</Text></Pressable>;
                  })}
                </View>
                {preferredExportFormat && <View style={styles.previewFormatBadge} accessible accessibilityLabel={`${preferredExportFormat.toUpperCase()} is the temporary recommended preview export format from the last export.`}><Text style={styles.previewFormatBadgeText}>{preferredExportFormat.toUpperCase()} · RECOMMENDED</Text></View>}
                <Text style={styles.sourceSummary} accessibilityLiveRegion="polite">{selectedPreviewItems.length > 0 ? getExportSizeEstimateLabel(selectedPreviewJsonSize, selectedPreviewCsvSize, null) : "Select preview rows to estimate export size. Estimates are calculated in memory; not saved."}</Text>
                <View style={styles.actionRow}>
                  {preferredExportFormat && <SecondaryButton label={getRecommendedExportActionLabel(latestExport)} accessibilityHint="Shares the selected preview rows using the temporary format recommendation from the last export." onPress={exportRecommendedPreviewFormat} />}
                  <SecondaryButton label={selectedPreviewItems.length > 0 ? `Export ${selectedPreviewItems.length} selected` : "Export selected"} accessibilityHint="Shares only the archive rows currently matching the search, year, and sort controls. Large exports show a cancel-or-continue warning before sharing." onPress={exportPreviewResults} />
                </View>
                {failedExport?.exportLabel === "selected-preview" && <Text style={styles.reviewHint} accessibilityRole="text">Next step: {getExportFailureRecoveryGuidance(failedExport.failureStage)}</Text>}
                {failedExport?.exportLabel === "selected-preview" && <SecondaryButton label="Copy diagnostics" accessibilityHint="Copies only the failure stage and format. Archive titles, URLs, and raw errors are never copied." onPress={() => { void copyExportDiagnostics(); }} />}
                {failedExport?.exportLabel === "selected-preview" && diagnosticsCopied && <View style={styles.rowBetween}><Text style={styles.reviewHint} accessibilityRole="text" accessibilityLiveRegion="polite">Copied safely</Text><SecondaryButton label="Dismiss" accessibilityHint="Hides the copied confirmation without changing the preview selection or failed export." onPress={dismissDiagnosticsCopied} /></View>}
                {failedExport?.exportLabel === "selected-preview" && <SecondaryButton label={`Retry ${failedExport.format.toUpperCase()} preview export · ${getExportRetryAttemptLabel(failedExport.attempt)}`} accessibilityHint={`Retries the failed preview export without changing the current selection, filters, or sort order. ${getExportRetryAttemptLabel(failedExport.attempt)}; maximum ${MAX_EXPORT_RETRY_ATTEMPTS} attempts.`} onPress={() => { void shareImportedArchive(failedExport.format, failedExport.items, failedExport.exportLabel); }} />}
                {failedExport?.exportLabel === "selected-preview" && failedExport.attempt >= MAX_EXPORT_RETRY_ATTEMPTS && <SecondaryButton label={`Start fresh ${failedExport.format.toUpperCase()} preview export`} accessibilityHint="Resets only the retry limit and starts the same preview export again without changing selection or filters." onPress={startFreshExport} />}
                <View style={styles.actionRow}>
                  <SecondaryButton label="Use this archive" accessibilityHint="Replaces the current imported archive with this reviewed preview." onPress={confirmPendingArchive} />
                  <SecondaryButton label="Discard preview" accessibilityHint="Discards this preview and keeps the current imported archive unchanged." onPress={discardPendingArchive} />
                </View>
              </View>
            )}
            <View style={styles.rowBetween}>
              <Text style={styles.selectionSummary}>{selectedPlatforms.length} selected · {archiveItems.length > 0 ? `${archiveItems.length} imported items` : "demo archive"}</Text>
              <View style={styles.actionGroup}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Use recommended creator platform mix"
                  onPress={() => {
                    haptic.selection();
                    const recommended: Platform[] = ["YouTube", "Instagram", "TikTok"];
                    setSelectedPlatforms(recommended);
                  }}
                  style={({ pressed }) => [styles.inlineAction, pressed && styles.pressed]}
                >
                  <Text style={styles.inlineActionText}>Recommended</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={selectedPlatforms.length === platforms.length ? "Clear all platforms" : "Select all platforms"}
                onPress={() => {
                  haptic.medium();
                  const next = selectedPlatforms.length === platforms.length ? [] : platforms;
                  setSelectedPlatforms(next);
                  
                }}
                style={({ pressed }) => [styles.inlineAction, pressed && styles.pressed]}
              >
                  <Text style={styles.inlineActionText}>{selectedPlatforms.length === platforms.length ? "Clear all" : "Select all"}</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.platformGrid}>
              {platforms.map((platform) => {
                const selected = selectedPlatforms.includes(platform);
                return (
                  <Pressable
                    key={platform}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${platform}, ${selected ? "selected" : "not selected"}`}
                    accessibilityHint="Double tap to change whether this platform is included in the archive scan."
                    accessibilityState={{ checked: selected }}
                    onPress={() => togglePlatform(platform)}
                    style={({ pressed }) => [styles.platformCard, selected && styles.platformSelected, pressed && styles.pressed]}
                  >
                    <Text style={styles.platformIcon}>{selected ? "✓" : "＋"}</Text>
                    <Text style={styles.platformName}>{platform}</Text>
                    <Text style={styles.platformMeta}>{selected ? "Selected" : "Tap to add"}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.selectionSummary}>
              {selectedPlatforms.length} platform{selectedPlatforms.length === 1 ? "" : "s"} selected
            </Text>
            <PrimaryButton
              label="Connect selected sources"
              accessibilityHint={selectedPlatforms.length === 0 ? "Select at least one platform before connecting sources." : "Connects the selected platforms and begins the archive scan."}
              disabled={selectedPlatforms.length === 0}
              onPress={() => {
                setNotice(`Connected ${selectedPlatforms.length} source${selectedPlatforms.length === 1 ? "" : "s"}.`);
                setPhase("scan");
              }}
            />
            <SecondaryButton label="Back to overview" onPress={() => setPhase("home")} />
          </View>
        )}

        {phase === "scan" && (
          <View style={styles.stack}>
            <Text style={styles.screenTitle}>Scanning your archive</Text>
            <Text style={styles.bodyText}>Scope: {selectedPlatforms.join(", ") || "No platforms selected"}</Text>
            {progressBar}
            <Text style={styles.progressLabel}>{progress}% · Archaeologist is looking for dormant gold</Text>
            <View style={styles.panel}>
              {selectedPlatforms.map((platform) => (
                <View
                  key={platform}
                  accessible
                  accessibilityLabel={`${platform}, ${progress === 100 ? "indexed" : `scanning, ${progress}% complete`}`}
                  style={styles.mindRow}
                >
                  <Text style={styles.platformName}>{platform}</Text>
                  <Text style={progress === 100 ? styles.successText : styles.mutedText}>
                    {progress === 100 ? "Indexed" : "Scanning…"}
                  </Text>
                </View>
              ))}
            </View>
            <PrimaryButton
              label="Continue to discoveries"
              accessibilityHint={progress < 100 ? "Wait for the archive scan to finish before continuing." : "Opens the discovered archive items."}
              disabled={progress < 100}
              onPress={() => setPhase("discoveries")}
            />
          </View>
        )}

        {phase === "discoveries" && (
          <View style={styles.stack}>
            <Text style={styles.screenTitle}>Dormant gold</Text>
            <Text style={styles.bodyText}>The Strategist found three archive items worth another life.</Text>
                          {activeDiscoveries.slice(0, 3).map((item) => (

              <View
                key={item.title}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.year}, Evergreen Score ${item.score}, ${item.views} source views`}
                style={styles.discoveryCard}
              >
                <Text style={styles.discoveryIcon}>{item.icon}</Text>
                <View style={styles.flexOne}>
                  <Text style={styles.discoveryTitle}>{item.title}</Text>
                  <Text style={styles.discoveryMeta}>{item.year} · {item.views} source views</Text>
                </View>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreText}>{item.score}</Text>
                  <Text style={styles.scoreLabel}>SCORE</Text>
                </View>
              </View>
            ))}
            <View
              accessible
              accessibilityRole="text"
              accessibilityLabel={
                mindsQuota.isLoading
                  ? "Daily Minds analysis availability is loading."
                  : mindsQuota.data
                    ? `${mindsQuota.data.remaining} of ${mindsQuota.data.limit} Minds analyses remaining today.`
                    : "Daily Minds analysis availability is currently unknown."
              }
              style={styles.panel}
            >
              <Text style={styles.sectionTitle}>Minds availability</Text>
              <Text style={styles.bodyText}>
                {mindsQuota.isLoading
                  ? "Checking today's analysis allowance…"
                  : mindsQuota.data
                    ? `${mindsQuota.data.remaining} of ${mindsQuota.data.limit} analyses remaining today.`
                    : "Availability will be checked when you ask Minds to analyze this item."}
              </Text>
            </View>
            <PrimaryButton
              label={mindsDiscovery.isPending ? "Minds is thinking…" : mindsQuota.data?.remaining === 0 ? "Daily Minds limit reached" : "Ask Minds for a smarter follow-up"}
              accessibilityHint={
                mindsQuota.data?.remaining === 0
                  ? "Daily Minds analyses are exhausted. Try again tomorrow."
                  : "Sends the selected archive item to the server-side Minds strategist for a structured recommendation."
              }
              accessibilityState={{ busy: mindsDiscovery.isPending }}
              disabled={mindsDiscovery.isPending || mindsQuota.data?.remaining === 0}
              onPress={requestMindsInsight}
            />
            {mindsDiscovery.isPending && (
              <SecondaryButton
                label="Cancel Minds request"
                accessibilityHint="Stops showing the pending Minds analysis and keeps the local workflow available."
                onPress={cancelMindsInsight}
              />
            )}
            {mindsDiscovery.isError && !mindsInsight && (
              <SecondaryButton
                label="Try Minds again"
                accessibilityHint="Retries the server-side Minds analysis for this archive item."
                onPress={requestMindsInsight}
              />
            )}
            {mindsInsight && (
              <View accessible accessibilityLabel={`Minds insight: ${mindsInsight.summary}`} style={styles.followUpCard}>
                <Text style={styles.heroKicker}>MINDS AGENT INSIGHT</Text>
                <Text style={styles.sectionTitle}>{mindsInsight.summary}</Text>
                {mindsInsight.recommendations.map((recommendation) => (
                  <View key={recommendation.title} style={styles.mindRow}>
                    <View style={styles.flexOne}>
                      <Text style={styles.mindName}>{recommendation.title}</Text>
                      <Text style={styles.mindDescription}>{recommendation.rationale} · {recommendation.formats.join(", ")}</Text>
                    </View>
                    <Text style={styles.activeText}>{Math.round(recommendation.confidence * 100)}%</Text>
                  </View>
                ))}
              </View>
            )}
            <PrimaryButton
              label="Repurpose top discovery"
              onPress={() => {
                setReviewMode(false);
                setApprovedOutputs([]);
                setPhase("repurpose");
              }}
            />
            <SecondaryButton label="Start over" onPress={() => setPhase("connect")} />
          </View>
        )}

        {phase === "repurpose" && (
          <View style={styles.stack}>
            <Text style={styles.screenTitle}>Artisan output plan</Text>
            <Text style={styles.bodyText}>How to Edit Like a Pro · YouTube Video · 14:23</Text>
            <View style={styles.planBanner}>
              <Text style={styles.goldText}>{selectedOutputs.length} deliverables</Text>
              <Text style={styles.bodyText}> across {selectedPlatforms.length} selected platform{selectedPlatforms.length === 1 ? "" : "s"}.</Text>
            </View>
            {selectedOutputs.map(([platform, output]) => {
              const approved = approvedOutputs.includes(output);
              return (
                <View key={output} style={styles.outputRow}>
                  <View style={styles.flexOne}>
                    <Text style={styles.outputPlatform}>{platform}</Text>
                    <Text style={styles.outputTitle}>{output}</Text>
                  </View>
                  {reviewMode && (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel={`${platform} output, ${approved ? "approved" : "not approved"}`}
                      accessibilityHint="Double tap to toggle approval before Auto-Post."
                      accessibilityState={{ checked: approved }}
                      onPress={() => {
                        haptic.selection();
                        setApprovedOutputs((current) => approved ? current.filter((item) => item !== output) : [...current, output]);
                      }}
                      style={[styles.approveButton, approved && styles.approvedButton]}
                    >
                      <Text style={styles.approveText}>{approved ? "Approved" : "Approve"}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
            <Text style={styles.goldText}>Estimated time saved: {formatTimeSaved(estimateTimeSaved(selectedPlatforms))}</Text>
            {reviewMode && <Text style={styles.reviewHint}>{approvedOutputs.length} of {selectedOutputs.length} outputs approved</Text>}
            <PrimaryButton
              label={isSaving ? "Saving Mind memory…" : reviewMode && approvedOutputs.length < selectedOutputs.length ? `Approve ${selectedOutputs.length - approvedOutputs.length} more` : "Auto-Post"}
              accessibilityHint={isSaving ? "Wait while Mind memory is being saved." : reviewMode && approvedOutputs.length < selectedOutputs.length ? "Approve the remaining outputs before auto-posting." : "Schedules the approved content and saves this workflow to Mind memory."}
              accessibilityState={{ busy: isSaving }}
              disabled={isSaving || !canAutoPost(reviewMode, approvedOutputs, selectedOutputs.map(([, output]) => output))}
              onPress={async () => {
                const result = await saveMemory();
                if (!result.saved) return;
                const saveNotice = getAutoPostNotice(result);
                if (saveNotice) setNotice(saveNotice);
                setPhase("results");
              }}
            />
            <View style={styles.buttonRow}>
              <SecondaryButton
                label="Review First"
                accessibilityHint="Enables individual approval for each generated output before Auto-Post."
                onPress={() => { setReviewMode(true); setApprovedOutputs([]); setNotice("Review mode enabled. Approve each output before publishing."); }}
              />
              {reviewMode && approvedOutputs.length < selectedOutputs.length && (
                <SecondaryButton
                  label="Approve All"
                  accessibilityHint="Approves every generated output so the batch can be auto-posted."
                  onPress={() => { setApprovedOutputs(selectedOutputs.map(([, output]) => output)); setNotice("All outputs approved. Ready to auto-post."); }}
                />
              )}
            </View>
          </View>
        )}

        {phase === "results" && (
          <View style={styles.stack}>
            <Text style={styles.screenTitle}>Seven days later</Text>
            <Text style={styles.bodyText}>The Conductor kept the workflow moving while you were away.</Text>
            <View style={styles.statsRow}>
              <Stat label="Views" value="247K" />
              <Stat label="Engagement" value="8.4%" />
              <Stat label="Revenue" value="$1,247" />
            </View>
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Selected platform performance</Text>
              {selectedPlatforms.map((platform) => (
                <View key={platform} style={styles.mindRow}>
                  <Text style={styles.platformName}>{platform}</Text>
                  <Text style={styles.goldText}>{getPlatformPerformance(platform)}</Text>
                </View>
              ))}
            </View>
            <View style={styles.followUpCard}>
              <Text style={styles.heroKicker}>AUTONOMOUS FOLLOW-UP</Text>
              <Text style={styles.sectionTitle}>The Strategist found a next move.</Text>
              <Text style={styles.bodyText}>The “5 Editing Tricks in 60s” clip performed 3.2× better than average. Mind recommends a short sequel this week.</Text>
            </View>
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Continuity checkpoint</Text>
              <Text style={styles.bodyText}>Memory restored for {selectedPlatforms.length} platform{selectedPlatforms.length === 1 ? "" : "s"}. Your next dig can continue from this workflow.</Text>
            </View>
            <PrimaryButton label="Return to overview" onPress={() => setPhase("home")} />
          </View>
        )}
      </ScrollView>
      <Modal visible={archiveBrowserVisible} transparent animationType="slide" onRequestClose={() => setArchiveBrowserVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.browserCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Archive browser</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close archive browser" onPress={() => setArchiveBrowserVisible(false)} style={({ pressed }) => [styles.noticeDismiss, pressed && styles.pressed]}><Text style={styles.noticeDismissText}>Close</Text></Pressable>
            </View>
            <Text style={styles.sourceSummary} accessibilityLiveRegion="polite">Showing {browserItems.length} matching items from a bounded window of {getArchiveBrowserItems(archiveItems).length}. {selectedBrowserItems.length} visible item{selectedBrowserItems.length === 1 ? " is" : "s are"} selected.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`${getLatestExportStatusLabel(latestExport)}. Open local export history.`} onPress={() => setExportHistoryVisible(true)} style={({ pressed }) => [styles.statusLink, pressed && styles.pressed]}><Text style={styles.sourceSummary}>{latestExport ? `${getLatestExportStatusLabel(latestExport)} · ${formatSavedAt(latestExport.exportedAt)}` : "No exports yet · local export history is empty"}</Text></Pressable>
            {preferredExportFormat && <View style={styles.previewFormatBadge} accessible accessibilityLabel={`${preferredExportFormat.toUpperCase()} is the temporary recommended full-browser export format from the last export.`}><Text style={styles.previewFormatBadgeText}>{preferredExportFormat.toUpperCase()} · RECOMMENDED</Text></View>}
            <TextInput value={browserQuery} onChangeText={setBrowserQuery} placeholder="Search titles" placeholderTextColor="#7D7099" accessibilityLabel="Search full archive titles" style={styles.input} returnKeyType="search" />
            <TextInput value={browserYear} onChangeText={(value) => setBrowserYear(value.replace(/[^0-9]/g, "").slice(0, 4))} placeholder="Filter year" placeholderTextColor="#7D7099" accessibilityLabel="Filter full archive by year" keyboardType="number-pad" style={styles.input} />
            <View style={styles.rowWrap}>
              <Pressable accessibilityRole="button" accessibilityLabel="Sort full archive by newest year" accessibilityState={{ selected: browserSort === "newest" }} onPress={() => setBrowserSort("newest")} style={({ pressed }) => [styles.filterChip, browserSort === "newest" && styles.filterChipActive, pressed && styles.pressed]}><Text style={styles.filterChipText}>Newest</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Sort full archive by most views" accessibilityState={{ selected: browserSort === "views" }} onPress={() => setBrowserSort("views")} style={({ pressed }) => [styles.filterChip, browserSort === "views" && styles.filterChipActive, pressed && styles.pressed]}><Text style={styles.filterChipText}>Most views</Text></Pressable>
            </View>
            <View style={styles.actionRow}>
              <SecondaryButton label={selectedBrowserItems.length > 0 ? `${selectedBrowserItems.length} selected` : "Select visible"} accessibilityHint="Selects or deselects all currently visible filtered archive rows." onPress={() => setSelectedBrowserKeys((current) => toggleArchiveSelection(current, browserItems))} />
              <SecondaryButton label={isExportingArchive ? "Preparing export…" : "Export selected"} accessibilityHint="Shares the selected full-browser archive rows as JSON or CSV." disabled={isExportingArchive} accessibilityState={{ busy: isExportingArchive }} onPress={exportBrowserResults} />
              <SecondaryButton label="Clear selection" accessibilityHint="Clears all full-browser row selections." onPress={() => setSelectedBrowserKeys([])} />
            </View>
            <ScrollView style={styles.browserList} contentContainerStyle={styles.browserListContent}>
              {browserItems.length === 0 && <Text style={styles.emptyStateText} accessibilityRole="text">No archive items match the current search and year filter.</Text>}
              {browserItems.map((item) => {
                const key = getArchiveItemKey(item);
                const selected = selectedBrowserKeys.includes(key);
                return <View key={key} style={styles.browserRow}>
                  <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={`Select ${item.title}`} onPress={() => setSelectedBrowserKeys((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key])} style={({ pressed }) => [styles.browserCheck, selected && styles.browserCheckSelected, pressed && styles.pressed]}><Text style={styles.previewCheck}>{selected ? "✓" : "○"}</Text></Pressable>
                  {renderArchiveThumbnail(item)}
                  <View style={styles.flexOne}><Text style={styles.mindDescription}>{formatArchivePreviewRow(item)}</Text><View style={styles.rowWrap}><Pressable accessibilityRole="button" accessibilityLabel={`View details for ${item.title}`} onPress={() => setArchiveDetail(item)} style={({ pressed }) => [styles.sourceLink, pressed && styles.pressed]}><Text style={styles.sourceLinkText}>Details</Text></Pressable>{item.sourceUrl && <Pressable accessibilityRole="link" accessibilityLabel={`Open source for ${item.title}`} onPress={() => void openArchiveSource(item.sourceUrl!)} style={({ pressed }) => [styles.sourceLink, pressed && styles.pressed]}><Text style={styles.sourceLinkText}>Open source</Text></Pressable>}</View></View>
                </View>;
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={selectedBrowserReviewVisible} transparent animationType="slide" onRequestClose={() => setSelectedBrowserReviewVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailCard} accessible accessibilityLabel={`Review ${selectedBrowserItems.length} selected archive item${selectedBrowserItems.length === 1 ? "" : "s"} before export`}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Review export</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={isExportingArchive ? "Cancel archive export" : "Close archive export review"} onPress={isExportingArchive ? cancelArchiveExport : () => setSelectedBrowserReviewVisible(false)} style={({ pressed }) => [styles.noticeDismiss, pressed && styles.pressed]}><Text style={styles.noticeDismissText}>{isExportingArchive ? "Cancel export" : "Cancel"}</Text></Pressable>
            </View>
            <Text style={styles.bodyText} accessibilityLiveRegion="polite">{isExportingArchive ? "Preparing your archive export…" : getArchiveExportReviewLabel(selectedBrowserItems.length)}</Text>
            {preferredExportFormat && <Text style={styles.sourceSummary} accessibilityLiveRegion="polite">{getLastExportFormatPresetLabel(latestExport)}</Text>}
            <Text style={styles.sourceSummary} accessibilityLabel={`${getLatestExportStatusLabel(latestExport)}. This review contains archive rows, while export history stores metadata only.`}>{latestExport ? `${getLatestExportStatusLabel(latestExport)} · ${formatSavedAt(latestExport.exportedAt)}` : "No previous exports · metadata history is empty"}</Text>
            <Text style={styles.sourceSummary} accessibilityLiveRegion="polite">{getExportReviewWindowLabel(selectedBrowserItems.length, Math.min(selectedBrowserItems.length, reviewWindowExpanded ? 100 : 20), reviewWindowExpanded ? 100 : 20)}</Text>
            <Text style={styles.sourceSummary} accessibilityLiveRegion="polite">{getExportSizeEstimateLabel(selectedJsonSize, selectedCsvSize, preferredExportFormat)}</Text>
            <ScrollView style={styles.browserList} contentContainerStyle={styles.browserListContent} accessibilityLabel="Selected archive rows for export review">
              {selectedBrowserItems.slice(0, reviewWindowExpanded ? 100 : 20).map((item) => <View key={getArchiveItemKey(item)} style={styles.reviewMediaRow}>{renderArchiveThumbnail(item)}<Text style={styles.reviewRow}>{formatArchivePreviewRow(item)}</Text></View>)}
            </ScrollView>
            {getExportReviewWindowToggleLabel(selectedBrowserItems.length, reviewWindowExpanded) && <SecondaryButton label={getExportReviewWindowToggleLabel(selectedBrowserItems.length, reviewWindowExpanded)} accessibilityHint="Expands or collapses the bounded selected-row inspection window without changing which rows will export." onPress={() => setReviewWindowExpanded((current) => !current)} />}
            <View style={styles.actionRow}>
              {preferredExportFormat && <SecondaryButton label={getRecommendedExportActionLabel(latestExport)} accessibilityHint="Shares the selected archive rows using the temporary format recommendation from the last export." disabled={isExportingArchive} accessibilityState={{ busy: isExportingArchive }} onPress={exportRecommendedFormat} />}
              <SecondaryButton label={preferredExportFormat === "json" ? "Share JSON · recommended" : "Share JSON"} accessibilityHint="Shares the reviewed selected archive rows as a normalized JSON file." disabled={isExportingArchive} accessibilityState={{ busy: isExportingArchive }} onPress={() => { void shareImportedArchive("json", selectedBrowserItems, "selected-browser"); }} />
              <SecondaryButton label={preferredExportFormat === "csv" ? "Share CSV · recommended" : "Share CSV"} accessibilityHint="Shares the reviewed selected archive rows as a normalized CSV file." disabled={isExportingArchive} accessibilityState={{ busy: isExportingArchive }} onPress={() => { void shareImportedArchive("csv", selectedBrowserItems, "selected-browser"); }} />
            </View>
            {failedExport?.exportLabel === "selected-browser" && <Text style={styles.reviewHint} accessibilityRole="text">Next step: {getExportFailureRecoveryGuidance(failedExport.failureStage)}</Text>}
            {failedExport?.exportLabel === "selected-browser" && <SecondaryButton label="Copy diagnostics" accessibilityHint="Copies only the failure stage and format. Archive titles, URLs, and raw errors are never copied." disabled={isExportingArchive} accessibilityState={{ busy: isExportingArchive }} onPress={() => { void copyExportDiagnostics(); }} />}
            {failedExport?.exportLabel === "selected-browser" && diagnosticsCopied && <View style={styles.rowBetween}><Text style={styles.reviewHint} accessibilityRole="text" accessibilityLiveRegion="polite">Copied safely</Text><SecondaryButton label="Dismiss" accessibilityHint="Hides the copied confirmation without changing the browser selection or failed export." disabled={isExportingArchive} accessibilityState={{ busy: isExportingArchive }} onPress={dismissDiagnosticsCopied} /></View>}
            {failedExport?.exportLabel === "selected-browser" && <SecondaryButton label={`Retry ${failedExport.format.toUpperCase()} export · ${getExportRetryAttemptLabel(failedExport.attempt)}`} accessibilityHint={`Retries the failed export without leaving this review or changing the selected rows. ${getExportRetryAttemptLabel(failedExport.attempt)}; maximum ${MAX_EXPORT_RETRY_ATTEMPTS} attempts.`} disabled={isExportingArchive} accessibilityState={{ busy: isExportingArchive }} onPress={() => { void shareImportedArchive(failedExport.format, failedExport.items, failedExport.exportLabel); }} />}
            {failedExport?.exportLabel === "selected-browser" && failedExport.attempt >= MAX_EXPORT_RETRY_ATTEMPTS && <SecondaryButton label={`Start fresh ${failedExport.format.toUpperCase()} export`} accessibilityHint="Resets only the retry limit and starts the same export again without leaving this review or changing selected rows." disabled={isExportingArchive} accessibilityState={{ busy: isExportingArchive }} onPress={startFreshExport} />}
          </View>
        </View>
      </Modal>
      <Modal visible={exportHistoryVisible} transparent animationType="slide" onRequestClose={() => setExportHistoryVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailCard} accessible accessibilityLabel={getExportHistoryDetailLabel(exportHistory)}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Export history</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close export history" onPress={() => setExportHistoryVisible(false)} style={({ pressed }) => [styles.noticeDismiss, pressed && styles.pressed]}><Text style={styles.noticeDismissText}>Close</Text></Pressable>
            </View>
            <Text style={styles.bodyText}>Only export format, item count, and timestamp are stored locally. Archive contents are never included in this history.</Text>
            <ScrollView style={styles.browserList} contentContainerStyle={styles.browserListContent} accessibilityLabel="Local export history records">
              {exportHistory.length === 0 && <Text style={styles.emptyStateText}>No local export history yet.</Text>}
              {exportHistory.map((entry) => <View key={`${entry.exportedAt}-${entry.format}`} style={styles.mindRow}><View style={styles.flexOne}><Text style={styles.mindName}>{formatExportHistoryLabel(entry)}</Text><Text style={styles.mindDescription}>Shared {formatSavedAt(entry.exportedAt)}</Text></View></View>)}
            </ScrollView>
            {exportHistory.length > 0 && <View style={styles.actionRow}><SecondaryButton label={getLastExportShortcutLabel(latestExport)} accessibilityHint="Closes this sheet and opens the bounded archive browser without restoring archive contents." onPress={openLastExportContext} /><SecondaryButton label="Clear export history" accessibilityHint="Asks for confirmation before removing local export metadata. Imported archive and Mind memory remain." onPress={confirmClearLocalExportHistory} /></View>}
          </View>
        </View>
      </Modal>
      <Modal visible={archiveDetail !== null} transparent animationType="slide" onRequestClose={() => setArchiveDetail(null)}>
        <View style={styles.modalBackdrop}>
          {archiveDetail && (
            <View style={styles.detailCard} accessible accessibilityLabel={getArchiveDetailSummary(archiveDetail)}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Archive detail</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Close archive detail" onPress={() => setArchiveDetail(null)} style={({ pressed }) => [styles.noticeDismiss, pressed && styles.pressed]}><Text style={styles.noticeDismissText}>Close</Text></Pressable>
              </View>
              {renderArchiveThumbnail(archiveDetail, true)}
              <Text style={styles.detailTitle}>{archiveDetail.title}</Text>
              <Text style={styles.bodyText}>Published {archiveDetail.year}</Text>
              <Text style={styles.bodyText}>{archiveDetail.views} views</Text>
              {archiveDetail.sourceUrl ? <Pressable accessibilityRole="link" accessibilityLabel={`Open source for ${archiveDetail.title}`} accessibilityHint="Opens the secure archive source link." onPress={() => void openArchiveSource(archiveDetail.sourceUrl!)} style={({ pressed }) => [styles.sourceLink, pressed && styles.pressed]}><Text style={styles.sourceLinkText}>Open source</Text></Pressable> : <Text style={styles.sourceSummary}>No source link available.</Text>}
            </View>
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 18 },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  loadingTitle: { color: "#F8F4FF", fontSize: 18, fontWeight: "800" },
  loadingMark: { width: 92, height: 92, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  loadingPulseRing: { position: "absolute", width: 84, height: 84, borderRadius: 42, borderWidth: 1, borderColor: "#F4C95D", backgroundColor: "#2C1D55" },
  loadingMarkCore: { width: 62, height: 62, borderRadius: 31, backgroundColor: "#F4C95D", alignItems: "center", justifyContent: "center", boxShadow: "0px 4px 12px rgba(244, 201, 93, 0.35)", elevation: 5 },
  loadingMarkText: { color: "#100B24", fontSize: 17, fontWeight: "900", letterSpacing: 1 },
  stack: { gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actionGroup: { flexDirection: "row", alignItems: "center", gap: 2 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#261B4B", borderWidth: 1, borderColor: "#6C5B9D", alignItems: "center", justifyContent: "center" },
  backButtonText: { color: "#F8F4FF", fontSize: 30, lineHeight: 32, marginTop: -3 },
  eyebrow: { color: "#F4C95D", fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  headerTitle: { color: "#F8F4FF", fontSize: 22, fontWeight: "800", marginTop: 4 },
  mindBadge: { borderColor: "#F4C95D", borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  mindBadgeText: { color: "#F4C95D", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  heroCard: { backgroundColor: "#1C1438", borderColor: "#3B2C62", borderWidth: 1, borderRadius: 24, padding: 22, gap: 12 },
  heroKicker: { color: "#AAA0C7", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  heroTitle: { color: "#F8F4FF", fontSize: 30, lineHeight: 36, fontWeight: "800" },
  screenTitle: { color: "#F8F4FF", fontSize: 28, lineHeight: 34, fontWeight: "800" },
  bodyText: { color: "#AAA0C7", fontSize: 15, lineHeight: 22 },
  goldText: { color: "#F4C95D", fontSize: 14, lineHeight: 20, fontWeight: "700" },
  sourceSummary: { color: "#D8D0EA", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  panel: { backgroundColor: "#1C1438", borderColor: "#3B2C62", borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  sectionTitle: { color: "#F8F4FF", fontSize: 17, fontWeight: "800" },
  livePill: { color: "#63D79A", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  previewFormatBadge: { alignSelf: "flex-start", borderColor: "#F4C95D", borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: "#2C1D55" },
  previewFormatBadgeText: { color: "#F4C95D", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  statsRow: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, backgroundColor: "#261B4B", borderRadius: 16, padding: 13, borderWidth: 1, borderColor: "#3B2C62" },
  statValue: { color: "#F4C95D", fontSize: 20, fontWeight: "800" },
  statLabel: { color: "#AAA0C7", fontSize: 11, marginTop: 3 },
  mindRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  mindDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#63D79A" },
  flexOne: { flex: 1 },
  mindName: { color: "#F8F4FF", fontSize: 14, fontWeight: "700" },
  mindDescription: { color: "#AAA0C7", fontSize: 12, marginTop: 2 },
  activeText: { color: "#63D79A", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  primaryButton: { minHeight: 50, borderRadius: 16, backgroundColor: "#F4C95D", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  primaryButtonText: { color: "#100B24", fontSize: 15, fontWeight: "800" },
  secondaryButton: { minHeight: 46, borderRadius: 16, borderWidth: 1, borderColor: "#6C5B9D", alignItems: "center", justifyContent: "center", paddingHorizontal: 15 },
  secondaryButtonText: { color: "#F8F4FF", fontSize: 14, fontWeight: "700" },
  buttonRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },
  platformGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  platformCard: { width: "31.5%", minHeight: 94, backgroundColor: "#1C1438", borderColor: "#3B2C62", borderWidth: 1, borderRadius: 16, padding: 12, justifyContent: "space-between" },
  platformSelected: { backgroundColor: "#30234F", borderColor: "#F4C95D" },
  platformIcon: { color: "#F4C95D", fontSize: 22, fontWeight: "800" },
  platformName: { color: "#F8F4FF", fontSize: 13, fontWeight: "700" },
  platformMeta: { color: "#AAA0C7", fontSize: 10 },
  selectionSummary: { color: "#F4C95D", fontSize: 13, fontWeight: "700" },
  inlineAction: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  inlineActionText: { color: "#FFE8A3", fontSize: 13, fontWeight: "800" },
  progressWrap: { height: 10, borderRadius: 5, overflow: "hidden", backgroundColor: "#261B4B", borderWidth: 1, borderColor: "#3B2C62" },
  progressFill: { height: "100%", borderRadius: 5, backgroundColor: "#F4C95D" },
  progressLabel: { color: "#AAA0C7", fontSize: 13 },
  successText: { color: "#63D79A", fontSize: 13, fontWeight: "700" },
  mutedText: { color: "#AAA0C7", fontSize: 13 },
  discoveryCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1C1438", borderColor: "#3B2C62", borderWidth: 1, borderRadius: 18, padding: 15 },
  discoveryIcon: { fontSize: 28 },
  discoveryTitle: { color: "#F8F4FF", fontSize: 15, fontWeight: "800" },
  discoveryMeta: { color: "#AAA0C7", fontSize: 12, marginTop: 4 },
  scoreBadge: { alignItems: "center", backgroundColor: "#30234F", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  scoreText: { color: "#F4C95D", fontSize: 20, fontWeight: "800" },
  scoreLabel: { color: "#AAA0C7", fontSize: 8, fontWeight: "800" },
  planBanner: { flexDirection: "row", flexWrap: "wrap", backgroundColor: "#261B4B", borderRadius: 16, padding: 14, alignItems: "center" },
  outputRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1C1438", borderColor: "#3B2C62", borderWidth: 1, borderRadius: 16, padding: 14 },
  outputPlatform: { color: "#F4C95D", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  outputTitle: { color: "#F8F4FF", fontSize: 14, fontWeight: "700", marginTop: 4 },
  approveButton: { borderColor: "#6C5B9D", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  approvedButton: { backgroundColor: "#63D79A", borderColor: "#63D79A" },
  approveText: { color: "#F8F4FF", fontSize: 12, fontWeight: "800" },
  reviewHint: { color: "#AAA0C7", fontSize: 13, textAlign: "center" },
  followUpCard: { backgroundColor: "#30234F", borderColor: "#F4C95D", borderWidth: 1, borderRadius: 18, padding: 18, gap: 10 },
  notice: { backgroundColor: "#30234F", borderColor: "#F4C95D", borderWidth: 1, borderRadius: 14, padding: 13 },
  noticeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  noticeText: { color: "#FFE8A3", fontSize: 13, lineHeight: 18, flex: 1 },
  noticeDismiss: { borderColor: "#6C5B9D", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  noticeDismissText: { color: "#F8F4FF", fontSize: 12, fontWeight: "800" },
  input: { backgroundColor: "#100B24", borderColor: "#403365", borderWidth: 1, borderRadius: 12, color: "#F8F4FF", fontSize: 15, paddingHorizontal: 14, paddingVertical: 11 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 9, borderBottomColor: "#302451", borderBottomWidth: 1, paddingVertical: 8 },
  previewRowSelected: { backgroundColor: "#241842", borderRadius: 8, paddingHorizontal: 8 },
  previewCheck: { color: "#F4C95D", fontSize: 18, fontWeight: "800", width: 20 },
  previewSampleRow: { gap: 4, paddingTop: 4 },
   sourceLink: { alignSelf: "flex-start", paddingVertical: 3 },
   statusLink: { alignSelf: "stretch", paddingVertical: 3 },
  sourceLinkText: { color: "#F4C95D", fontSize: 12, fontWeight: "800" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(16, 11, 36, 0.72)", justifyContent: "flex-end" },
  browserCard: { backgroundColor: "#1C1438", borderColor: "#3B2C62", borderWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10, maxHeight: "88%" },
  browserList: { flexGrow: 0 },
  browserListContent: { gap: 10, paddingBottom: 12 },
  emptyStateText: { color: "#B8A8D6", fontSize: 14, paddingVertical: 18, textAlign: "center" },
  reviewMediaRow: { flexDirection: "row", alignItems: "center", gap: 10, borderBottomColor: "#3B2C62", borderBottomWidth: 1 },
  reviewRow: { flex: 1, color: "#D8D0EA", fontSize: 13, lineHeight: 19, paddingVertical: 7 },
  browserRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8, borderBottomColor: "#3B2C62", borderBottomWidth: 1 },
  browserCheck: { alignItems: "center", justifyContent: "center", minWidth: 28, minHeight: 36, borderRadius: 8 },
  browserCheckSelected: { backgroundColor: "#241842" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  filterChip: { borderColor: "#3B2C62", borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  filterChipActive: { backgroundColor: "#F4C95D", borderColor: "#F4C95D" },
  filterChipText: { color: "#F8F4FF", fontSize: 12, fontWeight: "800" },
  detailCard: { backgroundColor: "#1C1438", borderColor: "#3B2C62", borderWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10 },
  detailTitle: { color: "#F8F4FF", fontSize: 24, fontWeight: "800", lineHeight: 30 },
  archiveThumbnail: { width: 56, height: 40, borderRadius: 8, backgroundColor: "#100B24" },
  detailThumbnail: { width: "100%", height: 160, borderRadius: 14, backgroundColor: "#100B24" },
  thumbnailFallback: { color: "#AAA0C7", fontSize: 12, fontStyle: "italic" },
  thumbnailFallbackAction: { alignSelf: "flex-start", paddingVertical: 4 },
});
