"use client";

// 初期アバターの選択UI（プリセット4種から選ぶ）。
// 細かいキャラメイクはせず、まずは分身を1体決めて学習をはじめてもらう。

import { useState } from "react";
import type { AvatarPresetId } from "@/types/avatar";
import { AVATAR_PRESETS } from "@/lib/avatarPresets";
import AvatarRenderer from "@/components/avatar/AvatarRenderer";

type Props = {
  onCreate: (presetId: AvatarPresetId) => void;
};

export default function AvatarCreator({ onCreate }: Props) {
  const [selected, setSelected] = useState<AvatarPresetId>("majime");
  const current = AVATAR_PRESETS.find((p) => p.id === selected);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <p className="text-base font-extrabold text-gray-800">あなたの分身を選ぼう</p>
      <p className="mt-1 text-xs text-gray-500">
        学習を進めるほど成長します。バッジを集めると装備が増え、あとから見た目も変えられます。
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="アバターのタイプ">
        {AVATAR_PRESETS.map((preset) => {
          const active = preset.id === selected;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(preset.id)}
              className={`flex flex-col items-center rounded-2xl p-3 transition active:scale-[0.98] ${
                active
                  ? "bg-indigo-50 ring-2 ring-indigo-500"
                  : "bg-gray-50 ring-1 ring-gray-200"
              }`}
            >
              <AvatarRenderer presetId={preset.id} size={104} />
              <span className="mt-2 text-sm font-extrabold text-gray-800">
                {preset.name}
              </span>
            </button>
          );
        })}
      </div>

      {current && (
        <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-600">
          {current.description}
        </p>
      )}

      <button
        type="button"
        onClick={() => onCreate(selected)}
        className="mt-4 w-full rounded-2xl bg-indigo-600 px-6 py-3.5 text-base font-extrabold text-white transition active:scale-[0.99]"
      >
        この分身ではじめる
      </button>
      <p className="mt-2 text-center text-[11px] text-gray-400">
        タイプはあとからいつでも変更できます
      </p>
    </section>
  );
}
