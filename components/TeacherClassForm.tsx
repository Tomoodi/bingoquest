"use client";

import React, { useState } from "react";

export type TeacherClassFormValues = {
  subject: string;
  grade: string;
  classSection: string;
  lessonTheme: string;
  lessonDescription: string;
  teacherWords: string;
};

const EMPTY_VALUES: TeacherClassFormValues = {
  subject: "",
  grade: "",
  classSection: "",
  lessonTheme: "",
  lessonDescription: "",
  teacherWords: "",
};

type TeacherClassFormProps = {
  initialValues?: Partial<TeacherClassFormValues>;
  submitLabel: string;
  submittingLabel: string;
  errorMessage?: string;
  onSubmit: (values: TeacherClassFormValues) => Promise<void> | void;
};

// クラスの作成・編集で共有する入力フォーム（クラスコードは扱わない）。
export default function TeacherClassForm({
  initialValues,
  submitLabel,
  submittingLabel,
  errorMessage,
  onSubmit,
}: TeacherClassFormProps) {
  const [values, setValues] = useState<TeacherClassFormValues>({
    ...EMPTY_VALUES,
    ...initialValues,
  });
  const [isSaving, setIsSaving] = useState(false);

  const update =
    (key: keyof TeacherClassFormValues) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      setValues((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const isFormValid =
    values.subject.trim() !== "" &&
    values.grade.trim() !== "" &&
    values.classSection.trim() !== "" &&
    values.lessonTheme.trim() !== "" &&
    values.lessonDescription.trim() !== "" &&
    values.teacherWords.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSaving) return;
    setIsSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSaving(false);
    }
  };

  const fieldBorder = (filled: boolean) =>
    `relative rounded-xl border p-2 bg-slate-900/20 ${
      filled ? "border-purple-500/60" : "border-slate-800"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 1. 学年と組 */}
      <div className="flex gap-2">
        <div className={`flex-1 ${fieldBorder(values.grade !== "")}`}>
          <span className="absolute top-1 left-2.5 font-mono text-[8px] text-slate-600">01A : 学年</span>
          <input type="text" value={values.grade} onChange={update("grade")} required className="w-full pt-3 px-1 bg-transparent text-xs font-bold text-slate-200 outline-none placeholder:text-slate-700" placeholder="2年" />
        </div>
        <div className={`flex-1 ${fieldBorder(values.classSection !== "")}`}>
          <span className="absolute top-1 left-2.5 font-mono text-[8px] text-slate-600">01B : 組</span>
          <input type="text" value={values.classSection} onChange={update("classSection")} required className="w-full pt-3 px-1 bg-transparent text-xs font-bold text-slate-200 outline-none placeholder:text-slate-700" placeholder="3組" />
        </div>
      </div>

      {/* 2. 教科名 */}
      <div className={fieldBorder(values.subject !== "")}>
        <span className="absolute top-1 left-2.5 font-mono text-[8px] text-slate-600">02 : 教科名</span>
        <input type="text" value={values.subject} onChange={update("subject")} required className="w-full pt-3 px-1 bg-transparent text-xs font-bold text-slate-200 outline-none placeholder:text-slate-700" placeholder="例: 英語、国語" />
      </div>

      {/* 3. 授業テーマ */}
      <div className={fieldBorder(values.lessonTheme !== "")}>
        <span className="absolute top-1 left-2.5 font-mono text-[8px] text-slate-600">03 : 授業テーマ・単元名</span>
        <input type="text" value={values.lessonTheme} onChange={update("lessonTheme")} required className="w-full pt-3 px-1 bg-transparent text-xs font-bold text-slate-200 outline-none placeholder:text-slate-700" placeholder="例: 不定詞、走れメロス" />
      </div>

      {/* 4. 詳細 */}
      <div className={fieldBorder(values.lessonDescription !== "")}>
        <span className="absolute top-1 left-2.5 font-mono text-[8px] text-slate-600">04 : 授業内容の詳細</span>
        <textarea value={values.lessonDescription} onChange={update("lessonDescription")} required rows={2} className="w-full pt-4 px-1 bg-transparent text-xs font-bold text-slate-200 outline-none resize-none placeholder:text-slate-700" placeholder="ここに詳細を入力..." />
      </div>

      {/* 5. ビンゴ用ワード */}
      <div className={fieldBorder(values.teacherWords !== "")}>
        <span className="absolute top-1 left-2.5 font-mono text-[8px] text-slate-600">05 : 自動AI生成用の単語（カンマ区切り）</span>
        <textarea value={values.teacherWords} onChange={update("teacherWords")} required rows={3} className="w-full pt-4 px-1 bg-transparent text-xs font-bold text-slate-200 outline-none resize-none placeholder:text-slate-700" placeholder="例: 名詞的用法, 形容詞的用法, 副詞的用法, 原型不定詞" />
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : null}

      <button type="submit" disabled={!isFormValid || isSaving} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl transition-all">
        {isSaving ? submittingLabel : submitLabel}
      </button>
    </form>
  );
}
