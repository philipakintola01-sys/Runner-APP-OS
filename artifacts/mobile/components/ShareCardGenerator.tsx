import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatPace,
} from "@/utils/runUtils";

export type ShareCardTemplate = "dark" | "light" | "athletic";

const { width: screenW } = Dimensions.get("window");
const CARD_W = Math.min(screenW - 32, 400);
const CARD_H = CARD_W * 1.4;

interface ShareCardData {
  distance: number;
  duration: number;
  avgPace: number;
  calories: number;
  steps?: number;
  startTime: number;
  streak: number;
  isPR: boolean;
}

export function ShareCardGenerator({
  data,
  imageUri,
  selectedTemplate,
}: {
  data: ShareCardData;
  imageUri?: string | null;
  selectedTemplate: ShareCardTemplate;
}) {
  const colors = useColors();

  const content = (
    <View style={[styles.card, { width: CARD_W, height: CARD_H }]}>
      {imageUri ? (
        <ImageBackground
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          imageStyle={{ borderRadius: 16 }}
          resizeMode="cover"
        >
          <View style={styles.overlay}>
            <RenderContent template={selectedTemplate} data={data} />
          </View>
        </ImageBackground>
      ) : (
        <RenderBackground template={selectedTemplate} data={data} />
      )}
    </View>
  );

  return content;
}

function RenderBackground({
  template,
  data,
}: {
  template: ShareCardTemplate;
  data: ShareCardData;
}) {
  if (template === "dark") {
    return (
      <LinearGradient
        colors={["#1A1A26", "#0F0F1A", "#1A0A0A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      >
        <View style={styles.cardContent}>
          <RenderCardContent template={template} data={data} />
        </View>
      </LinearGradient>
    );
  }
  if (template === "light") {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF" }]}>
        <View style={styles.cardContent}>
          <RenderCardContent template={template} data={data} />
        </View>
      </View>
    );
  }
  return (
    <LinearGradient
      colors={["#FF4B2B", "#FF7043", "#0A0A0F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    >
      <View style={styles.cardContent}>
        <RenderCardContent template={template} data={data} />
      </View>
    </LinearGradient>
  );
}

function RenderContent({
  template,
  data,
}: {
  template: ShareCardTemplate;
  data: ShareCardData;
}) {
  return (
    <View style={[styles.cardContent, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
      <RenderCardContent template={template} data={data} />
    </View>
  );
}

function RenderCardContent({
  template,
  data,
}: {
  template: ShareCardTemplate;
  data: ShareCardData;
}) {
  const isDark = template === "dark" || template === "athletic";
  const textColor = isDark ? "#FFFFFF" : "#0A0A0F";
  const accentColor = template === "athletic" ? "#FFFFFF" : "#FF4B2B";
  const mutedColor = isDark ? "rgba(255,255,255,0.5)" : "#6B6B7E";
  const secondaryText = isDark ? "rgba(255,255,255,0.75)" : "#1A1A28";

  return (
    <>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Text style={[styles.cardBrand, { color: accentColor }]}>
          RUN OS
        </Text>
        <Text style={[styles.cardDate, { color: mutedColor }]}>
          {formatDate(data.startTime)}
        </Text>
      </View>

      {/* Distance */}
      <View style={styles.cardDistSection}>
        <Text style={[styles.cardDistVal, { color: textColor }]}>
          {(data.distance / 1000).toFixed(2)}
        </Text>
        <Text style={[styles.cardDistUnit, { color: mutedColor }]}>
          KILOMETERS
        </Text>
      </View>

      {/* Stats Row */}
      <View style={styles.cardStatsRow}>
        <View style={styles.cardStat}>
          <Text style={[styles.cardStatVal, { color: textColor }]}>
            {formatDuration(data.duration)}
          </Text>
          <Text style={[styles.cardStatLabel, { color: mutedColor }]}>
            TIME
          </Text>
        </View>
        <View style={[styles.cardDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#E0E0EC" }]} />
        <View style={styles.cardStat}>
          <Text style={[styles.cardStatVal, { color: textColor }]}>
            {formatPace(data.avgPace)}
          </Text>
          <Text style={[styles.cardStatLabel, { color: mutedColor }]}>
            PACE /KM
          </Text>
        </View>
        <View style={[styles.cardDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#E0E0EC" }]} />
        <View style={styles.cardStat}>
          <Text style={[styles.cardStatVal, { color: textColor }]}>
            {data.calories}
          </Text>
          <Text style={[styles.cardStatLabel, { color: mutedColor }]}>
            KCAL
          </Text>
        </View>
      </View>

      {/* Steps & Streak */}
      {(data.steps || data.streak > 0) && (
        <View style={styles.cardExtras}>
          {data.steps && (
            <View style={styles.cardExtraRow}>
              <Feather name="hash" size={12} color={isDark ? "#00C9A7" : "#00A884"} />
              <Text style={[styles.cardExtraText, { color: isDark ? "#00C9A7" : "#00A884" }]}>
                {data.steps.toLocaleString()} steps
              </Text>
            </View>
          )}
          {data.streak > 0 && (
            <View style={styles.cardExtraRow}>
              <Feather name="zap" size={12} color={isDark ? "#FF4B2B" : "#FF4B2B"} />
              <Text style={[styles.cardExtraText, { color: secondaryText }]}>
                {data.streak}-day streak
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Badges */}
      {data.isPR && (
        <View style={[styles.prBadge, { backgroundColor: isDark ? "rgba(245,158,11,0.2)" : "#F59E0B15" }]}>
          <Feather name="award" size={12} color="#F59E0B" />
          <Text style={[styles.prBadgeText, { color: "#F59E0B" }]}>
            NEW PERSONAL RECORD
          </Text>
        </View>
      )}
    </>
  );
}

export function TemplateSelector({
  selected,
  onSelect,
}: {
  selected: ShareCardTemplate;
  onSelect: (t: ShareCardTemplate) => void;
}) {
  const colors = useColors();
  const templates: { key: ShareCardTemplate; label: string; preview: string[] }[] = [
    { key: "dark", label: "Dark", preview: ["#1A1A26", "#0F0F1A"] },
    { key: "light", label: "Light", preview: ["#FFFFFF", "#F5F5FA"] },
    { key: "athletic", label: "Athletic", preview: ["#FF4B2B", "#FF7043"] },
  ];

  return (
    <View style={styles.templateSelector}>
      <Text style={[styles.templateLabel, { color: colors.foreground }]}>
        Card Style
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>
        {templates.map((t) => {
          const isActive = selected === t.key;
          return (
            <Pressable
              key={t.key}
              style={[
                styles.templateBtn,
                {
                  borderColor: isActive ? colors.primary : colors.border,
                  backgroundColor: isActive ? colors.primary + "15" : colors.card,
                },
              ]}
              onPress={() => onSelect(t.key)}
            >
              <View style={styles.templatePreview}>
                {t.preview.map((c, i) => (
                  <View key={i} style={[styles.templateColor, { backgroundColor: c }]} />
                ))}
              </View>
              <Text
                style={[
                  styles.templateBtnText,
                  { color: isActive ? colors.primary : colors.foreground },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    alignSelf: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 16,
  },
  cardContent: {
    flex: 1,
    padding: 28,
    justifyContent: "center",
    gap: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardBrand: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
  },
  cardDate: {
    fontSize: 11,
    fontWeight: "500",
  },
  cardDistSection: {
    alignItems: "center",
    marginVertical: 8,
  },
  cardDistVal: {
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -2,
    lineHeight: 64,
  },
  cardDistUnit: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "600",
    marginTop: 4,
  },
  cardStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  cardStat: {
    flex: 1,
    alignItems: "center",
  },
  cardStatVal: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  cardStatLabel: {
    fontSize: 8,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  cardDivider: {
    width: 1,
    height: 28,
  },
  cardExtras: {
    gap: 8,
    marginTop: 8,
  },
  cardExtraRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardExtraText: {
    fontSize: 12,
    fontWeight: "700",
  },
  prBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  prBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  templateSelector: {
    marginBottom: 16,
  },
  templateLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  templateRow: {
    gap: 10,
  },
  templateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  templatePreview: {
    flexDirection: "row",
    gap: 2,
  },
  templateColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  templateBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
