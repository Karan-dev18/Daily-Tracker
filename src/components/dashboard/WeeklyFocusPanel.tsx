"use client";

import { useState, useRef, useEffect } from "react";
import { Target, Gift, Heart, Pencil, Check } from "lucide-react";

interface WeeklyFocusPanelProps {
  focus: string;
  reward: string;
  affirmation: string;
  onUpdate: (field: "focus" | "reward" | "affirmation", value: string) => void;
}

function EditableCard({
  label,
  icon,
  value,
  field,
  onUpdate,
  italic,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  field: "focus" | "reward" | "affirmation";
  onUpdate: (field: "focus" | "reward" | "affirmation", value: string) => void;
  italic?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Sync draft when parent value changes
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const handleSave = () => {
    setEditing(false);
    if (draft.trim() !== value) {
      onUpdate(field, draft.trim());
    }
  };

  return (
    <div className="bg-white dark:bg-[#1e1b24] rounded-xl border border-pink-200 dark:border-pink-900/40 p-4 flex-1 group relative">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-bold text-pink-700 dark:text-pink-300">{label}</h3>
        {icon}
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Edit ${label}`}
          >
            <Pencil className="w-3 h-3 text-pink-400 hover:text-pink-600 dark:hover:text-pink-200" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setEditing(false); setDraft(value); }
            }}
            className="flex-1 text-sm text-pink-600 dark:text-pink-200 bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800/50 rounded-lg px-2 py-1 outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-200"
          />
          <button
            onClick={handleSave}
            className="w-6 h-6 rounded-md bg-pink-400 hover:bg-pink-500 flex items-center justify-center transition-colors"
          >
            <Check className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      ) : (
        <p className={`text-sm text-pink-600 dark:text-pink-300 ${italic ? "italic" : ""}`}>
          {value || <span className="text-pink-300 dark:text-pink-700">Click to edit...</span>}
        </p>
      )}
    </div>
  );
}

export default function WeeklyFocusPanel({
  focus,
  reward,
  affirmation,
  onUpdate,
}: WeeklyFocusPanelProps) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <EditableCard
        label="Weekly focus"
        icon={<Target className="w-4 h-4 text-pink-400" />}
        value={focus}
        field="focus"
        onUpdate={onUpdate}
      />
      <EditableCard
        label="Reward"
        icon={<Gift className="w-4 h-4 text-pink-400" />}
        value={reward}
        field="reward"
        onUpdate={onUpdate}
      />
      <EditableCard
        label="Affirmation"
        icon={<Heart className="w-4 h-4 text-pink-400 fill-pink-400" />}
        value={affirmation}
        field="affirmation"
        onUpdate={onUpdate}
        italic
      />
    </div>
  );
}
