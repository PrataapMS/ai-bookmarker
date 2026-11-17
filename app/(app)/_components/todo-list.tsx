"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  deleteTodo,
  reorderTodos,
  setTodoDue,
  snoozeTodo,
  toggleTodo,
} from "@/app/actions/todos";
import { googleCalendarUrl, snoozePresets, type TodoView } from "@/lib/todo-client";
import { DateTimePicker, Sheet } from "./date-time-sheet";

export function TodoList({
  open,
  snoozed,
  done,
}: {
  open: TodoView[];
  snoozed: TodoView[];
  done: TodoView[];
}) {
  // Local copy of the open list so a drag reorders instantly; resynced
  // whenever the server sends a fresh list.
  const [items, setItems] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    setItems(open);
  }
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((t) => t.id === active.id);
    const to = items.findIndex((t) => t.id === over.id);
    const next = arrayMove(items, from, to);
    setItems(next);
    startTransition(() => reorderTodos(next.map((t) => t.id)));
  }

  return (
    <div className="space-y-6">
      {items.length > 0 && (
        <DndContext
          id="todo-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {items.map((todo) => (
                <SortableRow key={todo.id} todo={todo} sortable={items.length > 1} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {snoozed.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer select-none text-sm font-medium text-muted hover:text-foreground">
            💤 Snoozed ({snoozed.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {snoozed.map((todo) => (
              <li key={todo.id}>
                <TodoRow todo={todo} />
              </li>
            ))}
          </ul>
        </details>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Done ({done.length})</h2>
          <ul className="space-y-2">
            {done.map((todo) => (
              <li key={todo.id}>
                <TodoRow todo={todo} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SortableRow({ todo, sortable }: { todo: TodoView; sortable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-90 shadow-lg" : undefined}
    >
      <TodoRow
        todo={todo}
        handle={
          sortable ? (
            <button
              type="button"
              aria-label="Drag to reorder"
              data-no-swipe
              {...attributes}
              {...listeners}
              className="-ml-1 flex h-6 w-5 shrink-0 cursor-grab touch-none items-center justify-center text-muted/60 transition hover:text-foreground active:cursor-grabbing"
            >
              ⠿
            </button>
          ) : null
        }
      />
    </li>
  );
}

function TodoRow({ todo, handle }: { todo: TodoView; handle?: React.ReactNode }) {
  const [, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      {handle}
      <button
        type="button"
        onClick={() => startTransition(() => toggleTodo(todo.id))}
        aria-label={todo.done ? "Mark as open" : "Mark as done"}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs transition ${
          todo.done
            ? "border-accent bg-accent text-accent-fg"
            : "border-border hover:border-accent"
        }`}
      >
        {todo.done ? "✓" : ""}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`text-sm break-words ${todo.done ? "text-muted line-through" : ""}`}>
          {todo.text}
        </p>
        {(todo.dueLabel || todo.snoozeLabel || todo.source) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
            {todo.snoozeLabel && <span>💤 until {todo.snoozeLabel}</span>}
            {todo.dueLabel && (
              <span
                className={
                  todo.overdue && !todo.done
                    ? "font-medium text-red-600 dark:text-red-400"
                    : undefined
                }
              >
                📅 {todo.overdue && !todo.done ? "Overdue · " : ""}
                {todo.dueLabel}
              </span>
            )}
            {todo.source && (
              <Link
                href={`/bookmarks/${todo.source.bookmarkId}`}
                className="min-w-0 truncate hover:text-accent"
              >
                from “{todo.source.title}”
              </Link>
            )}
          </div>
        )}
      </div>

      <TodoMenu todo={todo} />
    </div>
  );
}

type SheetView = "due" | "snooze" | "snooze-pick" | null;

// Room the ⋯ menu needs below its button before it opens upward instead
// (includes the fixed mobile tab bar).
const MENU_ROOM = 300;

function TodoMenu({ todo }: { todo: TodoView }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [sheet, setSheet] = useState<SheetView>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggleMenu() {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setUp(window.innerHeight - rect.bottom < MENU_ROOM);
    setOpen((o) => !o);
  }

  function openSheet(view: SheetView) {
    setOpen(false);
    setSheet(view);
  }

  function run(fn: () => Promise<void>) {
    setOpen(false);
    setSheet(null);
    startTransition(fn);
  }

  async function share() {
    const text = todo.text;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        setOpen(false);
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setFlash("Copied ✓");
    } catch {
      setFlash("Copy failed");
    }
    setTimeout(() => {
      setFlash(null);
      setOpen(false);
    }, 1000);
  }

  const item =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-background";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label="Todo options"
        aria-expanded={open}
        onClick={toggleMenu}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-background hover:text-foreground"
      >
        ⋯
      </button>

      {open && (
        <div
          className={`absolute right-0 z-30 w-60 rounded-xl border border-border bg-surface p-1.5 shadow-xl ${
            up ? "bottom-8" : "top-8"
          }`}
        >
          {!todo.done && (
            <>
              <button type="button" className={item} onClick={() => openSheet("due")}>
                📅 {todo.dueIso ? "Change due date" : "Set due date"}
              </button>
              <button type="button" className={item} onClick={() => openSheet("snooze")}>
                💤 Snooze…
              </button>
              {todo.snoozeLabel && (
                <button
                  type="button"
                  className={item}
                  onClick={() => run(() => snoozeTodo(todo.id, null))}
                >
                  ⏰ Wake now
                </button>
              )}
            </>
          )}
          <a
            href={googleCalendarUrl(todo, window.location.origin)}
            target="_blank"
            rel="noopener noreferrer"
            className={item}
            onClick={() => setOpen(false)}
          >
            🗓️ Add to Google Calendar
          </a>
          <button type="button" className={item} onClick={share}>
            📤 {flash ?? "Share or copy"}
          </button>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            className={`${item} text-red-600 dark:text-red-400`}
            onClick={() => run(() => deleteTodo(todo.id))}
          >
            🗑️ Delete
          </button>
        </div>
      )}

      {sheet === "due" && (
        <Sheet title={todo.dueIso ? "Change due date" : "Set due date"} onClose={closeSheet}>
          <DateTimePicker
            initialIso={todo.dueIso}
            initialAllDay={todo.dueAllDay}
            allowAllDay
            submitLabel="Save"
            onSubmit={(iso, allDay) => run(() => setTodoDue(todo.id, iso, allDay))}
            onClear={todo.dueIso ? () => run(() => setTodoDue(todo.id, null, false)) : undefined}
          />
        </Sheet>
      )}

      {sheet === "snooze" && (
        <Sheet title="Snooze until" onClose={closeSheet}>
          <div className="space-y-1">
            {snoozePresets().map((p) => (
              <button
                key={p.label}
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition hover:bg-background"
                onClick={() => run(() => snoozeTodo(todo.id, p.until.toISOString()))}
              >
                <span className="font-medium">{p.label}</span>
                <span className="text-xs text-muted">{presetHint(p.until)}</span>
              </button>
            ))}
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition hover:bg-background"
              onClick={() => setSheet("snooze-pick")}
            >
              <span className="font-medium">📅 Pick date and time</span>
              <span className="text-xs text-muted">›</span>
            </button>
          </div>
        </Sheet>
      )}

      {sheet === "snooze-pick" && (
        <Sheet title="Snooze until" onClose={closeSheet}>
          <DateTimePicker
            allowAllDay={false}
            submitLabel="Snooze"
            onSubmit={(iso) => run(() => snoozeTodo(todo.id, iso))}
          />
        </Sheet>
      )}
    </div>
  );
}

function presetHint(d: Date): string {
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return sameDay ? time : `${d.toLocaleDateString(undefined, { weekday: "short" })} ${time}`;
}
