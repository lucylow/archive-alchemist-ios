import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { buildAdminAnalyticsCards } from "@/lib/admin-analytics";
import { trpc } from "@/lib/trpc";

export default function AdminAnalyticsScreen() {
  const colors = useColors();
  const router = useRouter();
  const summaryQuery = trpc.minds.analyticsSummary.useQuery(
    { windowDays: 7 },
    { retry: false },
  );

  const errorCode = (summaryQuery.error as { data?: { code?: string } } | null)?.data?.code;
  const isForbidden = errorCode === "FORBIDDEN";
  const cards = summaryQuery.data ? buildAdminAnalyticsCards(summaryQuery.data) : [];

  return (
    <ScreenContainer className="p-5" edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-6">
          <View className="gap-2">
            <Pressable
              accessibilityLabel="Go back"
              accessibilityHint="Returns to the previous screen"
              onPress={() => router.back()}
              style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
            >
              <Text className="text-base font-semibold text-primary">‹ Back</Text>
            </Pressable>
            <Text className="text-3xl font-bold text-foreground">Minds analytics</Text>
            <Text className="text-base leading-6 text-muted">
              A private seven-day operational snapshot for administrators.
            </Text>
          </View>

          {summaryQuery.isPending ? (
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Loading Minds analytics"
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <Text className="text-base text-muted">Loading aggregate metrics…</Text>
            </View>
          ) : isForbidden ? (
            <View accessible className="rounded-2xl border border-border bg-surface p-5">
              <Text className="text-lg font-semibold text-foreground">Administrator access required</Text>
              <Text className="mt-2 text-base leading-6 text-muted">
                This screen is limited to authorized operators and does not expose raw archive events.
              </Text>
            </View>
          ) : summaryQuery.isError ? (
            <View accessible className="rounded-2xl border border-border bg-surface p-5">
              <Text className="text-lg font-semibold text-foreground">Analytics unavailable</Text>
              <Text className="mt-2 text-base leading-6 text-muted">
                The aggregate service is temporarily unavailable. No raw event data was returned.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry Minds analytics"
                accessibilityHint="Requests the aggregate metrics again"
                onPress={() => summaryQuery.refetch()}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.primary,
                    borderRadius: 14,
                    marginTop: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text className="font-semibold text-background">Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-3">
              <View className="flex-row flex-wrap gap-3">
                {cards.map((card) => (
                  <View
                    key={card.label}
                    accessible
                    accessibilityLabel={card.accessibilityLabel}
                    className="min-w-[46%] flex-1 rounded-2xl border border-border bg-surface p-4"
                  >
                    <Text className="text-sm text-muted">{card.label}</Text>
                    <Text className="mt-2 text-2xl font-bold text-foreground">{card.value}</Text>
                  </View>
                ))}
              </View>
              <Text className="text-sm text-muted">
                The summary covers the last seven UTC days and excludes archive content.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

