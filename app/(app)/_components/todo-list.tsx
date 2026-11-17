"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
import {
  googleCalendarUrl,
  localInstant,
  localParts,
  snoozePresets,
  type TodoView,
} from "@/lib/todo-client";

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

type MenuView = "main" | "due" | "snooze";

function TodoMenu({ todo }: { todo: TodoView }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<MenuView>("main");
  const [flash, setFlash] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

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

  function run(fn: () => Promise<void>) {
    setOpen(false);
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
        onClick={() => {
          setView("main");
          setOpen((o) => !o);
        }}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-background hover:text-foreground"
      >
        ⋯
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-30 w-60 rounded-xl border border-border bg-surface p-1.5 shadow-xl">
          {view === "main" && (
            <>
              {!todo.done && (
                <>
                  <button type="button" className={item} onClick={() => setView("due")}>
                    📅 {todo.dueIso ? "Change due date" : "Set due date"}
                  </button>
                  <button type="button" className={item} onClick={() => setView("snooze")}>
                    💤 Snooze
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
            </>
          )}

          {view === "snooze" && (
            <>
              {snoozePresets().map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={item}
                  onClick={() => run(() => snoozeTodo(todo.id, p.until.toISOString()))}
                >
                  {p.label}
                </button>
              ))}
              <PickDateTime
                submitLabel="Snooze"
                requireTime
                onSubmit={(iso) => run(() => snoozeTodo(todo.id, iso))}
              />
            </>
          )}

          {view === "due" && (
            <PickDateTime
              initialIso={todo.dueIso}
              initialAllDay={todo.dueAllDay}
              submitLabel="Save"
              onSubmit={(iso, allDay) => run(() => setTodoDue(todo.id, iso, allDay))}
              onClear={todo.dueIso ? () => run(() => setTodoDue(todo.id, null, false)) : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}

function PickDateTime({
  initialIso,
  initialAllDay,
  submitLabel,
  requireTime,
  onSubmit,
  onClear,
}: {
  initialIso?: string | null;
  initialAllDay?: boolean;
  submitLabel: string;
  requireTime?: boolean;
  onSubmit: (iso: string, allDay: boolean) => void;
  onClear?: () => void;
}) {
  const initial = initialIso ? localParts(initialIso) : null;
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial && !initialAllDay ? initial.time : "");
  const valid = Boolean(date) && (!requireTime || Boolean(time));

  const input =
    "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent";

  return (
    <div className="space-y-2 p-2">
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Date"
          className={input}
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          aria-label="Time"
          className={`${input} w-28`}
        />
      </div>
      {!requireTime && (
        <p className="text-xs text-muted">No time means all day (reminder at 9:00).</p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!valid}
          onClick={() => onSubmit(localInstant(date, time || undefined), !time)}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
          >
            Remove date
          </button>
        )}
      </div>
    </div>
  );
}
