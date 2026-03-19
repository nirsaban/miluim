'use client';

import { useDroppable } from '@dnd-kit/core';
import { Target, Users, Check, AlertTriangle, X, Edit2, StickyNote } from 'lucide-react';
import { Task, ShiftTemplate, ShiftAssignment, ROLE_LABELS } from '@/types';

interface TaskDropZoneProps {
  task: Task;
  shiftTemplateId: string;
  shiftTemplate?: ShiftTemplate;
  assignments: ShiftAssignment[];
  onRemoveAssignment: (id: string) => void;
  onEditAssignment?: (assignment: ShiftAssignment) => void;
}

export function TaskDropZone({
  task,
  shiftTemplateId,
  shiftTemplate,
  assignments,
  onRemoveAssignment,
  onEditAssignment,
}: TaskDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${task.id}::${shiftTemplateId}`,
  });

  // Primary check: People count
  const requiredPeopleCount = task.requiredPeopleCount || 1;
  const assignedCount = assignments.length;
  const peopleCountFulfilled = assignedCount >= requiredPeopleCount;

  // Secondary: Skill requirements (informational only)
  const checkSkillRequirements = () => {
    if (!task.requirements || task.requirements.length === 0) return null;

    const fulfillment = task.requirements.map((req) => {
      const assignedWithSkill = assignments.filter((a) => {
        const hasExplicitSkill = a.soldier.skills?.some((s) => s.skillId === req.skillId);
        const roleMatchesSkill = a.soldier.role === req.skill.name;
        return hasExplicitSkill || roleMatchesSkill;
      }).length;
      return {
        ...req,
        assigned: assignedWithSkill,
        fulfilled: assignedWithSkill >= req.quantity,
      };
    });

    return fulfillment;
  };

  const skillRequirements = checkSkillRequirements();

  return (
    <div
      ref={setNodeRef}
      className={`
        bg-white rounded-lg border-2 transition-all
        ${isOver ? 'border-military-400 bg-military-50 shadow-lg' : 'border-gray-200'}
      `}
    >
      {/* Task Header */}
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{
          borderRightWidth: '4px',
          borderRightColor: shiftTemplate?.color || '#CBD5E1',
        }}
      >
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-military-600" />
          <div>
            <h3 className="font-semibold text-lg">{task.name}</h3>
            {task.description && (
              <p className="text-sm text-gray-500">{task.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* People Count Status */}
          <div className="flex items-center gap-2">
            {peopleCountFulfilled ? (
              <span className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                <Check className="w-4 h-4" />
                {assignedCount}/{requiredPeopleCount} אנשים
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
                <AlertTriangle className="w-4 h-4" />
                {assignedCount}/{requiredPeopleCount} אנשים
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Skill Requirements (informational) */}
      {skillRequirements && skillRequirements.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 ml-2">כישורים:</span>
          {skillRequirements.map((req) => (
            <span
              key={req.skillId}
              className={`
                inline-flex items-center gap-1 px-2 py-1 text-xs rounded
                ${req.fulfilled
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
                }
              `}
            >
              {req.skill.displayName}: {req.assigned}/{req.quantity}
              {req.fulfilled && <Check className="w-3 h-3" />}
            </span>
          ))}
        </div>
      )}

      {/* Assigned Soldiers */}
      <div className="p-4">
        {assignments.length === 0 ? (
          <div
            className={`
              border-2 border-dashed rounded-lg p-6 text-center transition-colors
              ${isOver ? 'border-military-400 bg-military-50' : 'border-gray-200'}
            `}
          >
            <p className="text-gray-400 text-sm">
              גרור חיילים לכאן לשיבוץ
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-gray-50 rounded-lg p-3 border flex items-center justify-between group relative"
              >
                {/* Notes indicator */}
                {assignment.notes && (
                  <div className="absolute -top-1 -right-1">
                    <StickyNote className="w-3.5 h-3.5 text-yellow-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {assignment.soldier.fullName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {ROLE_LABELS[assignment.soldier.role]}
                  </div>
                  {assignment.soldier.skills && assignment.soldier.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {assignment.soldier.skills.slice(0, 2).map((s) => (
                        <span
                          key={s.id}
                          className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
                        >
                          {s.skill?.displayName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onEditAssignment && (
                    <button
                      onClick={() => onEditAssignment(assignment)}
                      className="p-1.5 text-gray-400 hover:text-military-600 hover:bg-military-50 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveAssignment(assignment.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {/* Drop zone for adding more */}
            <div
              className={`
                border-2 border-dashed rounded-lg p-3 flex items-center justify-center transition-colors min-h-[80px]
                ${isOver ? 'border-military-400 bg-military-50' : 'border-gray-200'}
              `}
            >
              <span className="text-gray-400 text-xs">+ הוסף</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
