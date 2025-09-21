"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type Dispatch,
  type ComponentType,
  type SetStateAction,
  type SVGProps,
} from "react";
import {
  createCourseSectionAction,
  createLessonAction,
  deleteCourseSectionAction,
  deleteLessonAction,
  reorderCourseSectionsAction,
  reorderLessonsAction,
  updateCourseSectionAction,
  updateLessonAction,
} from "@/app/actions/courses";
import type { CourseSectionWithLessons } from "@/lib/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CurriculumBuilderProps {
  courseId: string;
  sections: CourseSectionWithLessons[];
}

type LocalLesson = CourseSectionWithLessons["lessons"][number];
type LocalSection = CourseSectionWithLessons & { lessons: LocalLesson[] };

type ActiveAddState =
  | null
  | {
      sectionId: string;
      mode: "select" | "lesson" | "quiz";
      lesson?: LocalLesson;
    };

interface IconActionButtonProps {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  onClick: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}

function IconActionButton({ label, icon: Icon, onClick, tone = "default", disabled }: IconActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition",
        tone === "danger"
          ? "text-red-600 hover:text-red-700 hover:bg-red-50"
          : "text-slate-500 hover:text-primary-600 hover:bg-primary-50",
        disabled && "pointer-events-none opacity-40"
      )}
      disabled={disabled}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export function CurriculumBuilder({ courseId, sections }: CurriculumBuilderProps) {
  const sensors = useSensors(useSensor(PointerSensor));
  const sortedInitial = useMemo(
    () =>
      sections
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((section) => ({
          ...section,
          lessons: (section.lessons ?? [])
            .slice()
            .sort((a, b) => a.order_index - b.order_index),
        })),
    [sections]
  );
  const [localSections, setLocalSections] = useState<LocalSection[]>(sortedInitial);
  useEffect(() => {
    setLocalSections(sortedInitial);
  }, [sortedInitial]);

  const [isNewSectionOpen, setIsNewSectionOpen] = useState(false);
  const [activeAddContent, setActiveAddContent] = useState<ActiveAddState>(null);
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [renamingLessonId, setRenamingLessonId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCreatingSection, startCreateSectionTransition] = useTransition();

  const handleSectionSubmit = (title: string) => {
    if (!title.trim()) {
      setFeedback("Bölüm adı zorunludur.");
      return;
    }
    startCreateSectionTransition(async () => {
      const result = await createCourseSectionAction({ courseId, title });
      if (result.error) {
        setFeedback(result.error);
      } else {
        setFeedback(null);
        setIsNewSectionOpen(false);
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type as "section" | "lesson" | undefined;
    if (!activeType) return;

    if (activeType === "section") {
      const oldIndex = localSections.findIndex((item) => item.id === active.id);
      const newIndex = localSections.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const newSections = arrayMove(localSections, oldIndex, newIndex);
      setLocalSections(newSections);
      startTransition(async () => {
        const updates = newSections.map((section, index) => ({ id: section.id, orderIndex: index }));
        const response = await reorderCourseSectionsAction({ courseId, sections: updates });
        if (response.error) {
          setFeedback(response.error);
        } else {
          setFeedback(null);
        }
      });
      return;
    }

    const activeLessonSectionId = active.data.current?.sectionId as string;
    const targetLessonSectionId = over.data.current?.sectionId as string;
    if (!activeLessonSectionId || !targetLessonSectionId) return;

    const sourceSectionIndex = localSections.findIndex((section) => section.id === activeLessonSectionId);
    const targetSectionIndex = localSections.findIndex((section) => section.id === targetLessonSectionId);
    if (sourceSectionIndex === -1 || targetSectionIndex === -1) return;

    const sourceSection = localSections[sourceSectionIndex];
    const targetSection = localSections[targetSectionIndex];
    const oldLessonIndex = sourceSection.lessons.findIndex((lesson) => lesson.id === active.id);
    const newLessonIndex = targetSection.lessons.findIndex((lesson) => lesson.id === over.id);
    if (oldLessonIndex === -1) return;

    const updatedSections = localSections.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) => ({ ...lesson })),
    }));

    const [movedLesson] = updatedSections[sourceSectionIndex].lessons.splice(oldLessonIndex, 1);
    if (!movedLesson) return;
    movedLesson.section_id = targetSection.id;

    const insertIndex = newLessonIndex === -1 ? updatedSections[targetSectionIndex].lessons.length : newLessonIndex;
    updatedSections[targetSectionIndex].lessons.splice(insertIndex, 0, movedLesson);

    setLocalSections(updatedSections);

    const prepareUpdates = (section: LocalSection) =>
      section.lessons.map((lesson, index) => ({ id: lesson.id, orderIndex: index }));

    startTransition(async () => {
      const tasks: Promise<unknown>[] = [];
      tasks.push(reorderLessonsAction({
        courseId,
        sectionId: targetSection.id,
        lessons: prepareUpdates(updatedSections[targetSectionIndex]),
      }));
      if (sourceSection.id !== targetSection.id) {
        tasks.push(
          reorderLessonsAction({
            courseId,
            sectionId: sourceSection.id,
            lessons: prepareUpdates(updatedSections[sourceSectionIndex]),
          })
        );
        tasks.push(
          updateLessonAction({
            lessonId: movedLesson.id,
            courseId,
            sectionId: targetSection.id,
          })
        );
      }
      const results = await Promise.all(tasks);
      const error = results.find((result) => (result as { error?: string }).error) as { error?: string } | undefined;
      if (error?.error) {
        setFeedback(error.error);
      } else {
        setFeedback(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {feedback && <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{feedback}</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localSections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {localSections.map((section, index) => (
              <SortableSectionCard
                key={section.id}
                section={section}
                index={index}
                courseId={courseId}
                renamingSectionId={renamingSectionId}
                onRenamingChange={setRenamingSectionId}
                renamingLessonId={renamingLessonId}
                onRenamingLessonChange={setRenamingLessonId}
                activeAddContent={activeAddContent}
                setActiveAddContent={setActiveAddContent}
                onFeedback={setFeedback}
                setLocalSections={setLocalSections}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="rounded-2xl border border-dashed border-primary-200 bg-white/60 p-4">
        {isNewSectionOpen ? (
          <NewSectionForm
            isPending={isCreatingSection}
            onSubmit={handleSectionSubmit}
            onCancel={() => {
              setIsNewSectionOpen(false);
              setFeedback(null);
            }}
          />
        ) : (
          <Button variant="secondary" onClick={() => setIsNewSectionOpen(true)}>
            + Yeni bölüm
          </Button>
        )}
      </div>
    </div>
  );
}

interface SortableSectionCardProps {
  section: LocalSection;
  index: number;
  courseId: string;
  renamingSectionId: string | null;
  onRenamingChange: (id: string | null) => void;
  renamingLessonId: string | null;
  onRenamingLessonChange: (id: string | null) => void;
  activeAddContent: ActiveAddState;
  setActiveAddContent: Dispatch<SetStateAction<ActiveAddState>>;
  onFeedback: (message: string | null) => void;
  setLocalSections: Dispatch<SetStateAction<LocalSection[]>>;
}

function SortableSectionCard({
  section,
  index,
  courseId,
  renamingSectionId,
  onRenamingChange,
  renamingLessonId,
  onRenamingLessonChange,
  activeAddContent,
  setActiveAddContent,
  onFeedback,
  setLocalSections,
}: SortableSectionCardProps) {
  const sortableSection = useSortableCard(section.id, "section");
  const { attributes, listeners, setNodeRef, style, isDragging } = sortableSection;
  const lessons = section.lessons ?? [];

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-80" : undefined}>
      <SectionHeader
        section={section}
        index={index}
        dragAttributes={attributes}
        dragListeners={listeners}
        isRenaming={renamingSectionId === section.id}
        onRenamingChange={onRenamingChange}
        onRename={async (title) => {
          const response = await updateCourseSectionAction({ courseId, sectionId: section.id, title });
          if (response.error) {
            onFeedback(response.error);
          } else {
            onFeedback(null);
            onRenamingChange(null);
            setLocalSections((prev) =>
              prev.map((item) => (item.id === section.id ? { ...item, title } : item))
            );
          }
        }}
        onDelete={() =>
          startTransition(async () => {
            const response = await deleteCourseSectionAction({ courseId, sectionId: section.id });
            if (response.error) {
              onFeedback(response.error);
            } else {
              onFeedback(null);
              setLocalSections((prev) => prev.filter((item) => item.id !== section.id));
              setActiveAddContent((state) =>
                state?.sectionId === section.id ? null : state
              );
            }
          })
        }
      />

      <SortableContext items={lessons.map((lesson) => lesson.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 px-5 py-4">
          {lessons.length === 0 && (
            <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/50 p-4 text-sm text-primary-700">
              Bu bölümde henüz içerik yok. Aşağıdaki müfredat butonunu kullanın.
            </div>
          )}
          {lessons.map((lesson, lessonIndex) => (
            <SortableLessonRow
              key={lesson.id}
              lesson={lesson}
              index={lessonIndex}
              sectionId={section.id}
              courseId={courseId}
              isRenaming={renamingLessonId === lesson.id}
              onRenamingChange={onRenamingLessonChange}
              onFeedback={onFeedback}
              onEdit={() =>
                setActiveAddContent({ sectionId: section.id, mode: "lesson", lesson })
              }
              setLocalSections={setLocalSections}
            />
          ))}
        </div>
      </SortableContext>

      <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setActiveAddContent((prev): ActiveAddState =>
              prev?.sectionId === section.id && prev.mode !== "select"
                ? null
                : { sectionId: section.id, mode: "select" as const }
            )
          }
        >
          + Müfredat ekle
        </Button>
        {activeAddContent?.sectionId === section.id && activeAddContent.mode === "select" && (
          <ContentTypePicker
            onSelect={(mode) => setActiveAddContent({ sectionId: section.id, mode })}
            onClose={() => setActiveAddContent(null)}
          />
        )}
        {activeAddContent?.sectionId === section.id && activeAddContent.mode === "lesson" && (
          <AddLessonForm
            key={`lesson-form-${section.id}-${activeAddContent.lesson?.id ?? "new"}`}
            courseId={courseId}
            sectionId={section.id}
            initialLesson={activeAddContent.lesson}
            onClose={() => setActiveAddContent(null)}
            onError={onFeedback}
          />
        )}
      </div>
    </div>
  );
}

function useSortableCard(id: string, type: "section" | "lesson", extraData: Record<string, unknown> = {}) {
  const sortable = useSortable({ id, data: { type, ...extraData } });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  return { attributes, listeners, setNodeRef, style, isDragging };
}

interface SectionHeaderProps {
  section: LocalSection;
  index: number;
  dragAttributes: DraggableAttributes;
  dragListeners?: DraggableSyntheticListeners;
  isRenaming: boolean;
  onRenamingChange: (id: string | null) => void;
  onRename: (title: string) => Promise<void> | void;
  onDelete: () => void;
}

function SectionHeader({
  section,
  index,
  dragAttributes,
  dragListeners,
  isRenaming,
  onRenamingChange,
  onRename,
  onDelete,
}: SectionHeaderProps) {
  const [title, setTitle] = useState(section.title);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          {...dragAttributes}
          {...(dragListeners ?? {})}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-500"
        >
          ≡
        </button>
        {isRenaming ? (
          <form
            className="flex items-center gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              setIsSaving(true);
              await onRename(title);
              setIsSaving(false);
            }}
          >
            <Input value={title} onChange={(event) => setTitle(event.target.value)} className="h-9 w-64" />
            <Button type="submit" size="sm" disabled={isSaving}>
              Kaydet
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                onRenamingChange(null);
                setTitle(section.title);
              }}
            >
              İptal
            </Button>
          </form>
        ) : (
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Bölüm {index + 1}: {section.title}
            </h3>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {(section.lessons ?? []).length} içerik
            </p>
          </div>
        )}
      </div>
      {!isRenaming && (
        <div className="flex items-center gap-2">
          <IconActionButton
            label="Bölümü yeniden adlandır"
            icon={Icons.rename}
            onClick={() => onRenamingChange(section.id)}
          />
          <IconActionButton label="Bölümü sil" icon={Icons.trash} onClick={onDelete} tone="danger" />
        </div>
      )}
    </div>
  );
}

interface SortableLessonRowProps {
  lesson: LocalLesson;
  index: number;
  sectionId: string;
  courseId: string;
  isRenaming: boolean;
  onRenamingChange: (id: string | null) => void;
  onFeedback: (message: string | null) => void;
  onEdit: () => void;
  setLocalSections: Dispatch<SetStateAction<LocalSection[]>>;
}

function SortableLessonRow({
  lesson,
  index,
  sectionId,
  courseId,
  isRenaming,
  onRenamingChange,
  onFeedback,
  onEdit,
  setLocalSections,
}: SortableLessonRowProps) {
  const { attributes, listeners, setNodeRef, style, isDragging } = useSortableCard(lesson.id, "lesson", {
    sectionId,
  });
  const [title, setTitle] = useState(lesson.title);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startRowTransition] = useTransition();

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-80" : undefined}>
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex flex-1 items-center gap-3">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-300 text-sm font-semibold text-primary-600"
          >
            {index + 1}
          </button>
          {isRenaming ? (
            <form
              className="flex flex-1 items-center gap-2"
              onSubmit={async (event) => {
                event.preventDefault();
                setIsSaving(true);
                const response = await updateLessonAction({ lessonId: lesson.id, courseId, title });
                setIsSaving(false);
                if (response.error) {
                  onFeedback(response.error);
                } else {
                  onFeedback(null);
                  onRenamingChange(null);
                }
              }}
            >
              <Input value={title} onChange={(event) => setTitle(event.target.value)} className="h-9" />
              <Button type="submit" size="sm" disabled={isSaving}>
                Kaydet
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  onRenamingChange(null);
                  setTitle(lesson.title);
                }}
              >
                İptal
              </Button>
            </form>
          ) : (
            <div className="flex flex-col">
              <p className="text-sm font-medium text-slate-800">Ders {index + 1}: {lesson.title}</p>
              <p className="text-xs text-slate-500">Video içeriği · {lesson.is_published ? "Yayında" : "Taslak"}</p>
            </div>
          )}
        </div>
        {!isRenaming && (
          <div className="flex items-center gap-2">
            <IconActionButton label="Dersi düzenle" icon={Icons.edit} onClick={onEdit} />
            <IconActionButton
              label="Dersi yeniden adlandır"
              icon={Icons.rename}
              onClick={() => onRenamingChange(lesson.id)}
            />
            <IconActionButton
              label="Dersi sil"
              icon={Icons.trash}
              tone="danger"
              onClick={() =>
                startRowTransition(async () => {
                const response = await deleteLessonAction({ lessonId: lesson.id, courseId });
                if (response.error) {
                  onFeedback(response.error);
                } else {
                  onFeedback(null);
                  setLocalSections((prev) =>
                    prev.map((sectionItem) =>
                      sectionItem.id === sectionId
                        ? {
                            ...sectionItem,
                            lessons: sectionItem.lessons.filter((item) => item.id !== lesson.id),
                          }
                        : sectionItem
                    )
                  );
                }
              })
            }
            disabled={isPending}
          />
          </div>
        )}
      </div>
    </div>
  );
}

interface AddLessonFormProps {
  courseId: string;
  sectionId: string;
  initialLesson?: LocalLesson;
  onClose: () => void;
  onError: (message: string | null) => void;
}

function AddLessonForm({ courseId, sectionId, initialLesson, onClose, onError }: AddLessonFormProps) {
  const [title, setTitle] = useState(initialLesson?.title ?? "");
  const [videoUrl, setVideoUrl] = useState(initialLesson?.video_url ?? "");
  const [description, setDescription] = useState(initialLesson?.content ?? "");
  const [isPublished, setIsPublished] = useState(initialLesson?.is_published ?? true);
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(initialLesson);

  return (
    <form
      className="mt-4 space-y-3 rounded-xl border border-primary-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim() || !videoUrl.trim()) {
          onError("Başlık ve video bağlantısı zorunludur.");
          return;
        }
        onError(null);
        startTransition(async () => {
          const response = isEdit
            ? await updateLessonAction({
                lessonId: initialLesson!.id,
                courseId,
                title,
                isPublished,
                videoUrl,
                content: description,
              })
            : await createLessonAction({
                courseId,
                sectionId,
                title,
                videoUrl,
                content: description,
                isPublished,
              });
          if (response.error) {
            onError(response.error);
          } else {
            if (!isEdit) {
              setTitle("");
              setVideoUrl("");
              setDescription("");
              setIsPublished(true);
            }
            onClose();
          }
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor={`newLessonTitle-${sectionId}`}>
            Ders başlığı
          </label>
          <Input
            id={`newLessonTitle-${sectionId}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Örn. Giriş"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor={`newLessonVideo-${sectionId}`}>
            Video URL (Google Drive embed)
          </label>
          <Input
            id={`newLessonVideo-${sectionId}`}
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
            placeholder="https://drive.google.com/file/d/.../preview"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor={`newLessonDescription-${sectionId}`}>
          Ders açıklaması (opsiyonel)
        </label>
        <Textarea
          id={`newLessonDescription-${sectionId}`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Bu dersin içeriği hakkında kısa açıklama"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          checked={isPublished}
          onChange={(event) => setIsPublished(event.target.checked)}
        />
        Öğrenciler bu dersi görebilsin
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? (isEdit ? "Güncelleniyor..." : "Ekleniyor...") : isEdit ? "Dersi Güncelle" : "Dersi Kaydet"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          İptal
        </Button>
      </div>
    </form>
  );
}

interface ContentTypePickerProps {
  onSelect: (mode: "lesson" | "quiz") => void;
  onClose: () => void;
}

function ContentTypePicker({ onSelect, onClose }: ContentTypePickerProps) {
  return (
    <div className="mt-4 grid gap-3 rounded-xl border border-primary-200 bg-white p-4 sm:grid-cols-2">
      <button
        type="button"
        className="rounded-lg border border-primary-300 px-4 py-3 text-left text-sm font-medium text-primary-700 transition hover:border-primary-400 hover:bg-primary-50"
        onClick={() => onSelect("lesson")}
      >
        + Ders
        <p className="mt-1 text-xs font-normal text-primary-500">Video ve kaynak ekleyin</p>
      </button>
      <button
        type="button"
        className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-left text-sm text-slate-400"
        onClick={() => {
          onSelect("quiz");
          onClose();
        }}
        disabled
      >
        + Quiz <span className="ml-2 text-xs">(Yakında)</span>
        <p className="mt-1 text-xs font-normal text-slate-400">Çoktan seçmeli değerlendirme oluşturun</p>
      </button>
    </div>
  );
}

interface NewSectionFormProps {
  isPending: boolean;
  onSubmit: (title: string) => void;
  onCancel: () => void;
}

function NewSectionForm({ isPending, onSubmit, onCancel }: NewSectionFormProps) {
  const [title, setTitle] = useState("");

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(title);
        setTitle("");
      }}
    >
      <div className="flex-1 space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="newSectionTitle">
          Bölüm başlığı
        </label>
        <Input
          id="newSectionTitle"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Örn. Bölüm 2: Klinik Tanıtım"
          required
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Ekleniyor..." : "Bölümü Kaydet"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}
