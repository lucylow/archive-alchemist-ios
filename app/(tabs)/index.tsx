import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { canAutoPost } from "@/lib/workflow";

type Phase = "home" | "connect" | "scan" | "discoveries" | "repurpose" | "results";
type Platform = "YouTube" | "Spotify" | "Substack" | "Twitter" | "Instagram" | "TikTok";

type Memory = {
  title: string;
  platforms: Platform[];
  savedAt: string;
  followUp: string;
};

const MEMORY_KEY = "archive-alchemist-mind-memory";
const PLATFORMS_KEY = "archive-alchemist-selected-platforms";
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

const outputs = [
  ["TikTok", "TikTok / Reels Clip (0:58)"],
  ["Instagram", "Instagram Reel (0:30)"],
  ["YouTube", "YouTube Short (0:45)"],
  ["Spotify", "Spotify Audiogram (0:45)"],
  ["Twitter", "Twitter Thread (10 tweets)"],
  ["Substack", "Blog Post (1,200 words)"],
] as const;

function PrimaryButton({ label, onPress, disabled = false, accessibilityHint }: { label: string; onPress: () => void; disabled?: boolean; accessibilityHint?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
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

function SecondaryButton({ label, onPress, accessibilityHint }: { label: string; onPress: () => void; accessibilityHint?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      onPress={() => {
        haptic.light();
        onPress();
      }}
      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const [phase, setPhase] = useState<Phase>("home");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["YouTube", "Instagram", "TikTok"]);
  const [progress, setProgress] = useState(0);
  const [memory, setMemory] = useState<Memory | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [approvedOutputs, setApprovedOutputs] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const loadingPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
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
    const hydrate = async () => {
      try {
        const storageRead = Promise.all([
          AsyncStorage.getItem(MEMORY_KEY),
          AsyncStorage.getItem(PLATFORMS_KEY),
        ]);
        const storageTimeout = new Promise<[string | null, string | null]>((resolve) => {
          setTimeout(() => resolve([null, null]), 1500);
        });
        const [memoryValue, platformsValue] = await Promise.race([storageRead, storageTimeout]);
        if (memoryValue) {
          try {
            const restoredMemory = JSON.parse(memoryValue) as Memory;
            if (
              restoredMemory &&
              typeof restoredMemory === "object" &&
              typeof restoredMemory.title === "string" &&
              Array.isArray(restoredMemory.platforms) &&
              restoredMemory.platforms.length > 0 &&
              restoredMemory.platforms.every((item) => platforms.includes(item)) &&
              typeof restoredMemory.savedAt === "string" &&
              typeof restoredMemory.followUp === "string"
            ) {
              setMemory(restoredMemory);
            } else {
              await AsyncStorage.removeItem(MEMORY_KEY);
            }
          } catch {
            await AsyncStorage.removeItem(MEMORY_KEY);
          }
        }
        if (platformsValue) {
          try {
            const restored = JSON.parse(platformsValue) as Platform[];
            if (Array.isArray(restored) && restored.length > 0 && restored.every((item) => platforms.includes(item))) {
              setSelectedPlatforms(restored);
            } else {
              await AsyncStorage.removeItem(PLATFORMS_KEY);
            }
          } catch {
            await AsyncStorage.removeItem(PLATFORMS_KEY);
          }
        }
      } catch {
        setNotice("Saved local preferences could not be read. Your current session is still available.");
      } finally {
        if (active) setIsHydrated(true);
      }
    };
    hydrate();
    return () => {
      active = false;
    };
  }, []);

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

  const saveMemory = async () => {
    const record: Memory = {
      title: "How to Edit Like a Pro",
      platforms: selectedPlatforms,
      savedAt: new Date().toISOString(),
      followUp: "The 60-second editing clip performed 3.2× better than average.",
    };
    try {
      setIsSaving(true);
      await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(record));
      setMemory(record);
      haptic.success();
      return true;
    } catch {
      setNotice("Mind memory could not be saved. Your workflow is still available for this session.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const resetMemory = async () => {
    try {
      await AsyncStorage.removeItem(MEMORY_KEY);
      setMemory(null);
      setPhase("home");
      setNotice("Mind memory cleared. Your next dig starts fresh.");
    } catch {
      setNotice("Mind memory could not be cleared. Try again from this device.");
    }
  };

  const confirmResetMemory = () => {
    Alert.alert(
      "Clear local Mind memory?",
      "This removes the saved workflow from this device. Your source-platform preferences will remain.",
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
      AsyncStorage.setItem(PLATFORMS_KEY, JSON.stringify(next)).catch(() =>
        setNotice("Platform preference could not be saved, but this session is still available."),
      );
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

  const phaseTitle: Record<Phase, string> = {
    home: "Overview",
    connect: "Connect sources",
    scan: "Archive scan",
    discoveries: "Discoveries",
    repurpose: "Review outputs",
    results: "Follow-up",
  };

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
          <Pressable
            accessible
            accessibilityRole="alert"
            accessibilityLabel={`${notice}. Double tap to dismiss.`}
            accessibilityHint="Dismisses this workflow status message."
            accessibilityLiveRegion="polite"
            onPress={() => setNotice(null)}
            style={styles.notice}
          >
            <Text style={styles.noticeText}>{notice}</Text>
          </Pressable>
        )}

        {phase === "home" && (
          <View style={styles.stack}>
            <View style={styles.heroCard}>
              <Text style={styles.heroKicker}>YOUR CREATOR ARCHIVE</Text>
              <Text style={styles.heroTitle}>Find the gold you forgot you made.</Text>
              <Text style={styles.bodyText}>
                The Minds index dormant work, match it to current signals, and keep the follow-up alive after you leave.
              </Text>
              <PrimaryButton label="Start a new dig" onPress={() => setPhase("connect")} />
            </View>
            <View style={styles.statsRow}>
              <Stat label="Archive items" value="412" />
              <Stat label="Dormant gold" value="37" />
              <Stat label="Saved hours" value="18.6" />
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
            <Text style={styles.bodyText}>Select the channels the Archaeologist should scan for dormant gold.</Text>
            <View style={styles.rowBetween}>
              <Text style={styles.selectionSummary}>{selectedPlatforms.length} selected</Text>
              <View style={styles.actionGroup}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Use recommended creator platform mix"
                  onPress={() => {
                    haptic.selection();
                    const recommended: Platform[] = ["YouTube", "Instagram", "TikTok"];
                    setSelectedPlatforms(recommended);
                    AsyncStorage.setItem(PLATFORMS_KEY, JSON.stringify(recommended)).catch(() =>
                      setNotice("Platform preference could not be saved, but this session is still available."),
                    );
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
                  AsyncStorage.setItem(PLATFORMS_KEY, JSON.stringify(next)).catch(() =>
                    setNotice("Platform preference could not be saved, but this session is still available."),
                  );
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
            {discoveries.map((item) => (
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
            <Text style={styles.goldText}>Estimated time saved: 4 hours 23 minutes</Text>
            {reviewMode && <Text style={styles.reviewHint}>{approvedOutputs.length} of {selectedOutputs.length} outputs approved</Text>}
            <PrimaryButton
              label={isSaving ? "Saving Mind memory…" : reviewMode && approvedOutputs.length < selectedOutputs.length ? `Approve ${selectedOutputs.length - approvedOutputs.length} more` : "Auto-Post"}
              accessibilityHint={isSaving ? "Wait while Mind memory is being saved." : reviewMode && approvedOutputs.length < selectedOutputs.length ? "Approve the remaining outputs before auto-posting." : "Schedules the approved content and saves this workflow to Mind memory."}
              disabled={isSaving || !canAutoPost(reviewMode, approvedOutputs, selectedOutputs.map(([, output]) => output))}
              onPress={async () => {
                const saved = await saveMemory();
                if (!saved) return;
                setNotice("The Conductor scheduled the approved content batch and stored the workflow in Mind memory.");
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
                  <Text style={styles.goldText}>{platform === "Spotify" ? "18K listens" : platform === "Substack" ? "6.4K reads" : "37K views"}</Text>
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
  loadingMarkCore: { width: 62, height: 62, borderRadius: 31, backgroundColor: "#F4C95D", alignItems: "center", justifyContent: "center", shadowColor: "#F4C95D", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
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
  noticeText: { color: "#FFE8A3", fontSize: 13, lineHeight: 18 },
});
