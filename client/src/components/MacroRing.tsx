import { cn } from "@/lib/utils";

interface MacroRingProps {
  calories: number;
  targetCalories: number;
  protein: number;
  targetProtein: number;
  carbs: number;
  targetCarbs: number;
  fat: number;
  targetFat: number;
  size?: number;
}

function CircularProgress({
  value,
  max,
  color,
  size = 120,
  strokeWidth = 8,
  children,
}: {
  value: number;
  max: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / Math.max(max, 1), 1);
  const offset = circumference * (1 - pct);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.23,1,0.32,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export function MacroBar({
  label,
  value,
  target,
  color,
  unit = "g",
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: string;
}) {
  const pct = Math.min((value / Math.max(target, 1)) * 100, 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold" style={{ color }}>
          {Math.round(value)}{unit}
          <span className="text-muted-foreground font-normal">/{Math.round(target)}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function MacroRing({
  calories,
  targetCalories,
  protein,
  targetProtein,
  carbs,
  targetCarbs,
  fat,
  targetFat,
  size = 140,
}: MacroRingProps) {
  const remaining = Math.max(targetCalories - calories, 0);
  const pct = Math.round((calories / Math.max(targetCalories, 1)) * 100);

  return (
    <div className="flex flex-col items-center gap-4">
      <CircularProgress
        value={calories}
        max={targetCalories}
        color="var(--primary)"
        size={size}
        strokeWidth={10}
      >
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground leading-none">
            {Math.round(remaining)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">kcal rimaste</div>
        </div>
      </CircularProgress>

      <div className="w-full grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold" style={{ color: "var(--protein-color)" }}>
            {Math.round(protein)}g
          </span>
          <span className="text-[10px] text-muted-foreground">Proteine</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold" style={{ color: "var(--carbs-color)" }}>
            {Math.round(carbs)}g
          </span>
          <span className="text-[10px] text-muted-foreground">Carboidrati</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold" style={{ color: "var(--fat-color)" }}>
            {Math.round(fat)}g
          </span>
          <span className="text-[10px] text-muted-foreground">Grassi</span>
        </div>
      </div>
    </div>
  );
}
