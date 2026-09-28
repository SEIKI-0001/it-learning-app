// 3D 模型（CSS 3D）の中でカメラを向く板に貼る人物。HTTPS のカフェの図解と図解ラボで使う。

/** 後ろから見た、椅子に座ってノートPCに向かう人 */
export function UserFromBehind() {
  return (
    <svg viewBox="0 0 82 112" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="dio-hoodie" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4f86e8" />
          <stop offset="1" stopColor="#2c5fc4" />
        </linearGradient>
        <radialGradient id="dio-hair" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#5a4033" />
          <stop offset="1" stopColor="#2e2019" />
        </radialGradient>
      </defs>
      {/* 椅子の脚 */}
      <rect x="38" y="90" width="6" height="14" rx="2" fill="#3a3f4b" />
      <ellipse cx="41" cy="106" rx="20" ry="5" fill="#2c313c" />
      {/* 体（肩〜背中） */}
      <path d="M12 74 C 12 54, 22 44, 41 44 C 60 44, 70 54, 70 74 L 70 86 L 12 86 Z" fill="url(#dio-hoodie)" />
      <path d="M30 46 C 34 54, 48 54, 52 46" stroke="#2350a8" strokeWidth="2" fill="none" />
      {/* 椅子の背もたれ（体の手前） */}
      <rect x="18" y="62" width="46" height="32" rx="9" fill="#343a46" />
      <rect x="22" y="66" width="38" height="4" rx="2" fill="#4a5160" />
      {/* 首と頭（後頭部） */}
      <rect x="35" y="36" width="12" height="10" rx="4" fill="#e7b995" />
      <ellipse cx="25.5" cy="28" rx="3" ry="4.5" fill="#e7b995" />
      <ellipse cx="56.5" cy="28" rx="3" ry="4.5" fill="#e7b995" />
      <ellipse cx="41" cy="24" rx="15.5" ry="17" fill="url(#dio-hair)" />
      <path d="M30 12 C 36 8, 46 8, 52 12" stroke="#6b4c3d" strokeWidth="1.6" fill="none" opacity="0.7" />
    </svg>
  );
}

/** 立ってモニターを見張る盗聴者（フード＋ヘッドホン） */
export function EavesdropperStanding({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 62 118" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="dio-eve" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4b5160" />
          <stop offset="1" stopColor="#2a2e38" />
        </linearGradient>
      </defs>
      {/* 脚 */}
      <rect x="20" y="78" width="9" height="34" rx="3" fill="#232733" />
      <rect x="33" y="78" width="9" height="34" rx="3" fill="#232733" />
      <ellipse cx="24" cy="113" rx="7" ry="3" fill="#15171d" />
      <ellipse cx="38" cy="113" rx="7" ry="3" fill="#15171d" />
      {/* 胴（パーカー） */}
      <path d="M12 50 C 12 38, 20 32, 31 32 C 42 32, 50 38, 50 50 L 52 84 L 10 84 Z" fill="url(#dio-eve)" />
      {/* 腕組み */}
      <path d="M14 58 C 22 66, 40 66, 48 58 L 48 66 C 40 72, 22 72, 14 66 Z" fill="#3a3f4c" />
      {/* フード＋顔 */}
      <path d="M13 26 C 13 10, 22 3, 31 3 C 40 3, 49 10, 49 26 C 49 36, 42 42, 31 42 C 20 42, 13 36, 13 26 Z" fill="#3d4250" />
      <ellipse cx="31" cy="26" rx="11" ry="12" fill="#e2b18f" />
      <path d="M20 22 C 24 14, 38 14, 42 22 L 42 18 C 38 10, 24 10, 20 18 Z" fill="#2a2e38" />
      {/* 目（盗聴中は光る） */}
      <ellipse cx="26.5" cy="26" rx="1.8" ry={active ? 1.2 : 1.8} fill="#1b1d23" />
      <ellipse cx="35.5" cy="26" rx="1.8" ry={active ? 1.2 : 1.8} fill="#1b1d23" />
      <path d="M27 34 C 30 35.5, 32 35.5, 35 34" stroke="#9a6a50" strokeWidth="1.3" fill="none" />
      {/* ヘッドホン */}
      <path d="M16 24 C 16 10, 46 10, 46 24" stroke="#121419" strokeWidth="3" fill="none" />
      <rect x="11.5" y="21" width="7" height="12" rx="3" fill="#121419" />
      <rect x="43.5" y="21" width="7" height="12" rx="3" fill="#121419" />
      <circle cx="15" cy="27" r="1.4" fill={active ? "#f43f5e" : "#6b7280"} />
    </svg>
  );
}
