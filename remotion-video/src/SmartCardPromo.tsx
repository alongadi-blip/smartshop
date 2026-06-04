import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Series,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ── Scene 1: Title ──────────────────────────────────────────────
const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 12 } });
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subtitleOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          textAlign: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: -3,
          }}
        >
          SmartCard
        </div>
      </div>
      <div
        style={{
          opacity: subtitleOpacity,
          fontSize: 38,
          color: "#94a3b8",
          fontFamily: "sans-serif",
          marginTop: 24,
          fontWeight: 300,
          letterSpacing: 2,
        }}
      >
        ניהול שוברים חכם
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 2: Club Cards ─────────────────────────────────────────
const ClubCard: React.FC<{
  name: string;
  color: string;
  delay: number;
  amount: string;
}> = ({ name, color, delay, amount }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14 },
  });
  const translateY = interpolate(progress, [0, 1], [100, 0]);
  const opacity = interpolate(progress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: 300,
        padding: "32px 36px",
        borderRadius: 24,
        background: `linear-gradient(135deg, ${color}22, ${color}08)`,
        border: `2px solid ${color}55`,
        transform: `translateY(${translateY}px)`,
        opacity,
        textAlign: "center",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{ fontSize: 36, fontWeight: 800, color, marginBottom: 12 }}
      >
        {name}
      </div>
      <div style={{ fontSize: 56, fontWeight: 900, color: "#f1f5f9" }}>
        {amount}
      </div>
      <div style={{ fontSize: 20, color: "#94a3b8", marginTop: 8 }}>
        ש"ח נותרו
      </div>
    </div>
  );
};

const CardsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const clubs = [
    { name: "Swish", color: "#f59e0b", amount: "₪350", delay: 5 },
    { name: "BuyMe", color: "#10b981", amount: "₪820", delay: 18 },
    { name: "נופשונית", color: "#818cf8", amount: "₪1,200", delay: 31 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: 32,
          marginBottom: 56,
          fontFamily: "sans-serif",
          opacity: titleOpacity,
          letterSpacing: 1,
        }}
      >
        כל השוברים שלך במקום אחד
      </div>
      <div style={{ display: "flex", gap: 40 }}>
        {clubs.map((c) => (
          <ClubCard key={c.name} {...c} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 3: Features ───────────────────────────────────────────
const FeatureItem: React.FC<{
  text: string;
  emoji: string;
  delay: number;
}> = ({ text, emoji, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14 },
  });
  const translateX = interpolate(progress, [0, 1], [-80, 0]);
  const opacity = interpolate(progress, [0, 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        transform: `translateX(${translateX}px)`,
        opacity,
        marginBottom: 36,
        fontFamily: "sans-serif",
      }}
    >
      <span style={{ fontSize: 56 }}>{emoji}</span>
      <span style={{ fontSize: 40, color: "#f1f5f9", fontWeight: 600 }}>
        {text}
      </span>
    </div>
  );
};

const FeaturesScene: React.FC = () => {
  const features = [
    { emoji: "🔍", text: "חיפוש חנויות לפי מועדון", delay: 5 },
    { emoji: "💳", text: "הוספה ועריכת שוברים", delay: 18 },
    { emoji: "📱", text: "גישה מהטלפון בכל מקום", delay: 31 },
    { emoji: "🔐", text: "אימות דו-שלבי מאובטח", delay: 44 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingRight: 200,
        paddingLeft: 200,
        flexDirection: "column",
      }}
    >
      {features.map((f) => (
        <FeatureItem key={f.text} {...f} />
      ))}
    </AbsoluteFill>
  );
};

// ── Scene 4: CTA ────────────────────────────────────────────────
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 8, stiffness: 180 } });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 25, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" }
  );
  const subtitleOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        opacity: fadeOut,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: 40,
          }}
        >
          SmartCard
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: "#fff",
            background: "linear-gradient(135deg, #7c3aed, #6366f1)",
            padding: "20px 72px",
            borderRadius: 60,
            display: "inline-block",
          }}
        >
          הורד עכשיו
        </div>
      </div>
      <div
        style={{
          opacity: subtitleOpacity,
          fontSize: 28,
          color: "#475569",
          marginTop: 48,
        }}
      >
        זמין עכשיו ל-Android ו-Web
      </div>
    </AbsoluteFill>
  );
};

// ── Main Composition ────────────────────────────────────────────
export const SmartCardPromo: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill>
      <Audio
        src={staticFile("Money, Money, Money.mp3")}
        loop
        volume={(f) =>
          interpolate(
            f,
            [0, fps, durationInFrames - fps * 2, durationInFrames],
            [0, 0.4, 0.4, 0],
            { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
          )
        }
      />
      <Series>
        <Series.Sequence durationInFrames={5 * fps} premountFor={fps}>
          <TitleScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={8 * fps} premountFor={fps}>
          <CardsScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={8 * fps} premountFor={fps}>
          <FeaturesScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={9 * fps} premountFor={fps}>
          <CTAScene />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
