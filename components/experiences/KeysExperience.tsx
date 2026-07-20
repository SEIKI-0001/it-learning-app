"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「DBMS・主キー・外部キー」専用の体験。
// たとえは最初から最後まで「学校の名簿と成績表」で統一する。
//   ① 主キー  … 名簿で1人を確実に見分ける印（学生番号）。重複しない。
//   ② 外部キー … 成績表の学生番号が名簿を参照（クリックで辿る）。
//   ③ まとめ
// ============================================================================

const STUDENTS = [
  { id: "S01", name: "田中", klass: "1組" },
  { id: "S02", name: "田中", klass: "2組" },
  { id: "S03", name: "佐藤", klass: "1組" },
];

const GRADES = [
  { subject: "国語", score: "80", student: "S01" },
  { subject: "数学", score: "90", student: "S03" },
  { subject: "英語", score: "70", student: "S01" },
];

function LinkExperience() {
  const [sel, setSel] = useState(0);
  const grade = GRADES[sel];
  const matched = STUDENTS.find((s) => s.id === grade.student)!;

  return (
    <Panel>
      <SectionTitle step={2}>外部キーでつながる（クリックして辿る）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        成績表の<b className="text-brand-700">学生番号（外部キー）</b>は、名簿の
        <b className="text-rose-700">学生番号（主キー）</b>を指しています。
        <b className="text-gray-800">成績の行をタップ</b>すると、それが誰の成績か辿れます。
      </p>

      {/* 成績表（外部キーを持つ側） */}
      <div className="mt-4">
        <div className="mb-1.5 text-sm font-bold text-gray-800">📋 成績表</div>
        <div className="overflow-hidden rounded-xl ring-1 ring-gray-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-3 py-2 font-bold text-brand-700">学生番号（外部キー）</th>
                <th className="px-3 py-2 font-bold">科目</th>
                <th className="px-3 py-2 font-bold">点数</th>
              </tr>
            </thead>
            <tbody>
              {GRADES.map((g, i) => {
                const on = i === sel;
                return (
                  <tr
                    key={`${g.student}-${g.subject}`}
                    onClick={() => setSel(i)}
                    className={`cursor-pointer border-t border-gray-200 text-center transition active:scale-[0.99] ${
                      on ? "bg-brand-50" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <td className={`px-3 py-2 font-mono font-bold ${on ? "bg-brand-200 text-brand-800" : "text-brand-700"}`}>
                      {g.student}
                    </td>
                    <td className="px-3 py-2">{g.subject}</td>
                    <td className="px-3 py-2 font-mono">{g.score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* つながりの説明 */}
      <div className="my-3 rounded-xl bg-sky-50 px-4 py-3 text-center text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200">
        成績「<b>{grade.subject} {grade.score}点</b>」の学生番号は{" "}
        <b className="font-mono text-brand-700">{grade.student}</b> →
        名簿で <b className="font-mono text-rose-700">{grade.student}</b> を探すと…
        <b className="text-gray-900">「{matched.name}」さん（{matched.klass}）</b>の成績だと分かる！
      </div>

      {/* 名簿（主キーを持つ側） */}
      <div>
        <div className="mb-1.5 text-sm font-bold text-gray-800">📋 名簿</div>
        <div className="overflow-hidden rounded-xl ring-1 ring-gray-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-3 py-2 font-bold text-rose-700">学生番号（主キー）</th>
                <th className="px-3 py-2 font-bold">名前</th>
                <th className="px-3 py-2 font-bold">クラス</th>
              </tr>
            </thead>
            <tbody>
              {STUDENTS.map((s) => {
                const on = s.id === grade.student;
                return (
                  <tr
                    key={s.id}
                    className={`border-t border-gray-200 text-center transition ${
                      on ? "bg-brand-50" : "bg-white"
                    }`}
                  >
                    <td className={`px-3 py-2 font-mono font-bold ${on ? "bg-rose-200 text-rose-800" : "text-rose-700"}`}>
                      {s.id}
                    </td>
                    <td className="px-3 py-2 font-bold">{s.name}</td>
                    <td className="px-3 py-2">{s.klass}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}

export default function KeysExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🏫 学校でたとえると——名簿を管理する<b>先生＝DBMS</b>、<b>学生番号＝主キー</b>（1人を確実に見分ける）、
        成績表に書かれた<b>学生番号＝外部キー</b>（名簿とつなぐ）。番号で名簿と成績表が結びつきます。
      </div>

      <Panel>
        <SectionTitle step={1}>主キー＝1行を「確実に見分ける」印</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          名簿の中の1人を<b className="text-gray-800">重複なく</b>見分けられる項目が主キー。下の名簿では
          <b className="text-rose-700"> 学生番号</b> が主キーです。
        </p>
        <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-3 py-2 font-bold text-rose-700">学生番号（主キー）</th>
                <th className="px-3 py-2 font-bold">名前</th>
                <th className="px-3 py-2 font-bold">クラス</th>
              </tr>
            </thead>
            <tbody>
              {STUDENTS.map((s, i) => (
                <tr key={s.id} className={`border-t border-gray-200 text-center ${i % 2 ? "bg-gray-50" : "bg-white"}`}>
                  <td className="bg-rose-50 px-3 py-2 font-mono font-bold text-rose-700">{s.id}</td>
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2">{s.klass}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          ※「名前」は<b>田中さんが2人</b>いて見分けられず、「クラス」も重複する。だから
          <b>重複しない学生番号</b>が主キーに向いています（主キーは重複・空っぽが許されません）。
        </p>
      </Panel>

      <LinkExperience />

      <Panel>
        <SectionTitle step={3}>3つの言葉をおさらい</SectionTitle>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
            <b>DBMS</b>：データベースを管理するソフトウェア（名簿を管理する先生）。
          </li>
          <li className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
            <b className="text-rose-700">主キー</b>：表の1行を重複なく見分ける項目（学生番号）。
          </li>
          <li className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
            <b className="text-brand-700">外部キー</b>：別の表の主キーを参照してつなぐ項目（成績表の学生番号）。
          </li>
        </ul>
      </Panel>
    </div>
  );
}
