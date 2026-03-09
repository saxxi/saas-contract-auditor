"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface EditableSectionProps {
  sectionId: string;
  sectionBody: string;
  editingSectionId: string | null;
  onStartEdit: (sectionId: string) => void;
  onSave: (sectionId: string, newBody: string) => void;
  onCancel: () => void;
  children: React.ReactNode;
}

export function EditableSection({
  sectionId,
  sectionBody,
  editingSectionId,
  onStartEdit,
  onSave,
  onCancel,
  children,
}: EditableSectionProps) {
  const isEditing = editingSectionId === sectionId;
  const [draft, setDraft] = useState(sectionBody);
  const [isDark, setIsDark] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting draft when editing starts
    if (isEditing) setDraft(sectionBody);
  }, [isEditing, sectionBody]);

  useEffect(() => {
    if (!isEditing) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isEditing, onCancel]);

  if (isEditing) {
    return (
      <div className="border-2 border-blue-500 dark:border-blue-400 rounded-lg p-3" data-color-mode={isDark ? "dark" : "light"}>
        <MDEditor
          value={draft}
          onChange={(v) => setDraft(v ?? "")}
          preview="edit"
          height={200}
          visibleDragbar={false}
          style={{ border: "none", borderRadius: 4 }}
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => onSave(sectionId, draft)}
            className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer"
          >
            Cancel
          </button>
          <span className="text-[10px] text-zinc-400 ml-auto">Esc to cancel</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="group relative"
    >
      {children}
      {editingSectionId === null && (
        <button
          onClick={() => onStartEdit(sectionId)}
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-white/80 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 shadow-sm cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700"
          title="Edit section"
        >
          <svg className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
    </div>
  );
}
