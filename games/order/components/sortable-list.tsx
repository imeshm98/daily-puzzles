"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Mark, OrderItem } from "../logic";

interface SortableListProps {
  items: readonly OrderItem[];
  /** Item indices in display order. */
  order: readonly number[];
  locked: readonly boolean[];
  /** Marks from the last try, if any, shown per position. */
  lastMarks: readonly Mark[] | null;
  disabled?: boolean;
  onMove: (from: number, to: number) => void;
  onStep: (from: number, direction: -1 | 1) => void;
}

/**
 * Drag-and-drop list (dnd-kit) with up/down arrows on every row. The drag
 * handle uses `touch-action: none` so dragging works on phones while the
 * rest of the page still scrolls.
 */
export function SortableList({
  items,
  order,
  locked,
  lastMarks,
  disabled = false,
  onMove,
  onStep,
}: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = order.indexOf(Number(active.id));
    const to = order.indexOf(Number(over.id));
    if (from !== -1 && to !== -1) onMove(from, to);
  };

  return (
    <DndContext id="order-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order.map(String)} strategy={verticalListSortingStrategy}>
        <ol className="space-y-2" aria-label="Items to order">
          {order.map((itemIndex, position) => (
            <SortableRow
              key={itemIndex}
              id={String(itemIndex)}
              position={position}
              name={items[itemIndex]?.name ?? ""}
              locked={locked[position] ?? false}
              mark={lastMarks?.[position] ?? null}
              disabled={disabled}
              canUp={position > 0}
              canDown={position < order.length - 1}
              onStep={(direction) => onStep(position, direction)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

interface SortableRowProps {
  id: string;
  position: number;
  name: string;
  locked: boolean;
  mark: Mark | null;
  disabled: boolean;
  canUp: boolean;
  canDown: boolean;
  onStep: (direction: -1 | 1) => void;
}

function SortableRow({ id, position, name, locked, mark, disabled, canUp, canDown, onStep }: SortableRowProps) {
  const fixed = locked || disabled;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: fixed });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-xl p-2 ring-1 select-none",
        locked
          ? "bg-correct/25 ring-correct"
          : mark === "wrong"
            ? "bg-absent/60 ring-foreground/15"
            : "bg-card ring-foreground/15",
        isDragging && "z-10 shadow-lg ring-2 ring-ring",
      )}
      aria-label={`${position + 1}. ${name}${locked ? ", correct" : mark === "wrong" ? ", wrong position" : ""}`}
    >
      <span className="w-5 text-center text-sm font-semibold text-muted-foreground tabular-nums">
        {position + 1}
      </span>
      {fixed ? (
        <span className="flex size-10 items-center justify-center text-muted-foreground/40" aria-hidden="true">
          <GripVertical className="size-5" />
        </span>
      ) : (
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label={`Drag ${name}`}
          className="flex size-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-5" />
        </button>
      )}
      <span className="min-w-0 flex-1 text-base font-medium">{name}</span>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          aria-label={`Move ${name} up`}
          disabled={fixed || !canUp}
          onClick={(event) => {
            event.currentTarget.blur();
            onStep(-1);
          }}
          className="flex size-10 items-center justify-center rounded-lg bg-muted outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
        >
          <ChevronUp className="size-5" />
        </button>
        <button
          type="button"
          aria-label={`Move ${name} down`}
          disabled={fixed || !canDown}
          onClick={(event) => {
            event.currentTarget.blur();
            onStep(1);
          }}
          className="flex size-10 items-center justify-center rounded-lg bg-muted outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
        >
          <ChevronDown className="size-5" />
        </button>
      </div>
    </li>
  );
}
