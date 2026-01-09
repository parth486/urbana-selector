import React from "react";
import {
  Button,
  Input,
  Select,
  SelectItem,
  Card,
  CardBody,
  Divider,
  Checkbox,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface CoreDesignFieldCondition {
  fieldId: string; // ID of the field to depend on
  value: string; // The value that must be selected in that field
}

export interface CoreDesignField {
  id: string;
  label: string;
  type: "text" | "dropdown";
  value?: string; // Single value for text fields
  values?: string[]; // Multiple values for dropdown
  defaultValue?: string; // Default value for dropdown
  conditions?: CoreDesignFieldCondition[]; // Show this field only if these conditions are met
}

interface CoreDesignElementManagerProps {
  fields: CoreDesignField[];
  onFieldsChange: (fields: CoreDesignField[]) => void;
}

const generateId = (label: string) => {
  return `field_${label.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
};

interface DraggableFieldItemProps {
  field: CoreDesignField;
  index: number;
  fields: CoreDesignField[];
  onFieldsChange: (fields: CoreDesignField[]) => void;
  editingFieldId: string | null;
  setEditingFieldId: (id: string | null) => void;
  newValue: string;
  setNewValue: (value: string) => void;
  conditionFieldId: string | null;
  setConditionFieldId: (id: string | null) => void;
  conditionDependsOn: string;
  setConditionDependsOn: (value: string) => void;
  conditionValue: string;
  setConditionValue: (value: string) => void;
}

const DraggableFieldItem: React.FC<DraggableFieldItemProps> = ({
  field,
  index,
  fields,
  onFieldsChange,
  editingFieldId,
  setEditingFieldId,
  newValue,
  setNewValue,
  conditionFieldId,
  setConditionFieldId,
  conditionDependsOn,
  setConditionDependsOn,
  conditionValue,
  setConditionValue,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleUpdateFieldLabel = (fieldId: string, label: string) => {
    onFieldsChange(
      fields.map((f) => (f.id === fieldId ? { ...f, label } : f))
    );
  };

  const handleRemoveField = (fieldId: string) => {
    onFieldsChange(fields.filter((f) => f.id !== fieldId));
  };

  const handleAddValue = (fieldId: string) => {
    if (!newValue.trim()) {
      return;
    }

    onFieldsChange(
      fields.map((f) => {
        if (f.id === fieldId) {
          if (f.type === "text") {
            return {
              ...f,
              value: newValue,
            };
          } else {
            const updatedValues = [...(f.values || []), newValue];
            return {
              ...f,
              values: updatedValues,
            };
          }
        }
        return f;
      })
    );
    setNewValue("");
  };

  const handleRemoveValue = (fieldId: string, valueIndex?: number) => {
    onFieldsChange(
      fields.map((f) => {
        if (f.id === fieldId) {
          if (f.type === "text") {
            return {
              ...f,
              value: "",
            };
          } else {
            const updatedValues = f.values?.filter((_, idx) => idx !== valueIndex) || [];
            const removedValue = f.values?.[valueIndex || 0];

            let newDefault = f.defaultValue;
            if (removedValue === f.defaultValue) {
              newDefault = updatedValues.length > 0 ? updatedValues[0] : undefined;
            }

            return {
              ...f,
              values: updatedValues,
              defaultValue: newDefault,
            };
          }
        }
        return f;
      })
    );
  };

  const handleSetDefaultValue = (fieldId: string, value: string) => {
    onFieldsChange(
      fields.map((f) =>
        f.id === fieldId ? { ...f, defaultValue: value } : f
      )
    );
  };

  const handleClearDefaultValue = (fieldId: string) => {
    onFieldsChange(
      fields.map((f) =>
        f.id === fieldId ? { ...f, defaultValue: undefined } : f
      )
    );
  };

  const handleAddCondition = (fieldId: string, dependsOnFieldId: string, value: string) => {
    onFieldsChange(
      fields.map((f) => {
        if (f.id === fieldId) {
          const newConditions = [...(f.conditions || [])];
          const existingIndex = newConditions.findIndex(c => c.fieldId === dependsOnFieldId);
          if (existingIndex >= 0) {
            newConditions[existingIndex] = { fieldId: dependsOnFieldId, value };
          } else {
            newConditions.push({ fieldId: dependsOnFieldId, value });
          }
          return { ...f, conditions: newConditions };
        }
        return f;
      })
    );
  };

  const handleRemoveCondition = (fieldId: string, conditionIndex: number) => {
    onFieldsChange(
      fields.map((f) => {
        if (f.id === fieldId) {
          const newConditions = f.conditions?.filter((_, idx) => idx !== conditionIndex) || [];
          return { ...f, conditions: newConditions.length > 0 ? newConditions : undefined };
        }
        return f;
      })
    );
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`border border-default-200 ${isDragging ? "bg-default-100 shadow-lg" : ""}`}
    >
      <CardBody className="space-y-4">
        {/* Field Header with Drag Handle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing hover:text-primary transition-colors"
              title="Drag to reorder"
            >
              <Icon icon="tabler:grip-vertical" fontSize={20} />
            </div>

            <div className="flex items-center justify-center w-8 h-8 rounded bg-default-100 text-sm font-semibold">
              {index + 1}
            </div>
            <div className="flex-1">
              <Input
                label="Field Label"
                value={field.label}
                onChange={(e) =>
                  handleUpdateFieldLabel(field.id, e.target.value)
                }
                size="sm"
                classNames={{ input: "urbana-input" }}
              />
            </div>
            <div className="px-3 py-2 rounded bg-default-100 text-sm font-medium min-w-max">
              {field.type === "text" ? "Text Field" : "Dropdown"}
            </div>
          </div>
          <Button
            isIconOnly
            color="danger"
            variant="light"
            size="sm"
            onPress={() => handleRemoveField(field.id)}
            className="ml-2"
          >
            <Icon icon="tabler:trash" fontSize={18} />
          </Button>
        </div>

        {/* Values Section */}
        <>
          <Divider />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon
                icon={
                  field.type === "text"
                    ? "tabler:list"
                    : "tabler:list-check"
                }
                fontSize={18}
                className="text-default-500"
              />
              <span className="font-medium text-sm">
                {field.type === "text" ? "Text Value" : "Dropdown Options"}
              </span>
            </div>

            {/* Text Field - Single Value */}
            {field.type === "text" && (
              <div className="space-y-2">
                {field.value && (
                  <div className="flex items-center justify-between gap-2 p-2 bg-default-50 rounded">
                    <span className="text-sm truncate flex-1">
                      {field.value}
                    </span>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => handleRemoveValue(field.id)}
                    >
                      <Icon icon="tabler:x" fontSize={16} />
                    </Button>
                  </div>
                )}

                {!field.value && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter text value"
                      value={
                        editingFieldId === field.id ? newValue : ""
                      }
                      onChange={(e) => {
                        setEditingFieldId(field.id);
                        setNewValue(e.target.value);
                      }}
                      onFocus={() => setEditingFieldId(field.id)}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          editingFieldId === field.id
                        ) {
                          handleAddValue(field.id);
                        }
                      }}
                      size="sm"
                      classNames={{ input: "urbana-input" }}
                    />
                    <Button
                      size="sm"
                      color="secondary"
                      onPress={() => handleAddValue(field.id)}
                      isDisabled={
                        editingFieldId !== field.id ||
                        !newValue.trim()
                      }
                    >
                      <Icon icon="tabler:plus" fontSize={16} />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Dropdown Field - Multiple Values */}
            {field.type === "dropdown" && (
              <div className="space-y-2">
                {field.values && field.values.length > 0 && (
                  <div className="space-y-2 pl-2">
                    {field.values.map((value, valIdx) => (
                      <div
                        key={valIdx}
                        className="flex items-center justify-between gap-2 p-2 bg-default-50 rounded"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm truncate flex-1">
                            {value}
                          </span>
                          <Checkbox
                            isSelected={
                              field.defaultValue === value
                            }
                            onChange={(checked) => {
                              if (checked) {
                                handleSetDefaultValue(field.id, value);
                              } else {
                                handleClearDefaultValue(field.id);
                              }
                            }}
                            size="sm"
                            classNames={{
                              label: "text-xs",
                            }}
                          >
                            Default
                          </Checkbox>
                        </div>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() =>
                            handleRemoveValue(field.id, valIdx)
                          }
                        >
                          <Icon icon="tabler:x" fontSize={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="Add option (e.g., Red, Blue, Green)"
                    value={
                      editingFieldId === field.id ? newValue : ""
                    }
                    onChange={(e) => {
                      setEditingFieldId(field.id);
                      setNewValue(e.target.value);
                    }}
                    onFocus={() => setEditingFieldId(field.id)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        editingFieldId === field.id
                      ) {
                        handleAddValue(field.id);
                      }
                    }}
                    size="sm"
                    classNames={{ input: "urbana-input" }}
                  />
                  <Button
                    size="sm"
                    color="secondary"
                    onPress={() => handleAddValue(field.id)}
                    isDisabled={
                      editingFieldId !== field.id ||
                      !newValue.trim()
                    }
                  >
                    <Icon icon="tabler:plus" fontSize={16} />
                  </Button>
                </div>

                {/* Default Value Info */}
                <div className="text-xs text-default-400 italic pt-1">
                  {field.defaultValue
                    ? `Default: "${field.defaultValue}"`
                    : `No default set - will show "Select ${field.label}"`}
                </div>
              </div>
            )}
          </div>
        </>

        {/* Conditions Section - Only for Dropdowns */}
        {field.type === "dropdown" && (
          <>
            <Divider />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon
                  icon="tabler:branching"
                  fontSize={18}
                  className="text-default-500"
                />
                <span className="font-medium text-sm">
                  Show When (Conditions)
                </span>
              </div>

              {/* List of Existing Conditions */}
              {field.conditions && field.conditions.length > 0 && (
                <div className="space-y-2 pl-2">
                  {field.conditions.map((condition, condIdx) => {
                    const dependsOnField = fields.find(f => f.id === condition.fieldId);
                    return (
                      <div
                        key={condIdx}
                        className="flex items-center justify-between gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800"
                      >
                        <span className="text-sm">
                          <span className="font-medium">{dependsOnField?.label || "Unknown Field"}</span>
                          {" = "}
                          <span className="text-blue-600 dark:text-blue-400 font-medium">"{condition.value}"</span>
                        </span>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => handleRemoveCondition(field.id, condIdx)}
                        >
                          <Icon icon="tabler:x" fontSize={16} />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add New Condition */}
              {conditionFieldId === field.id ? (
                <div className="space-y-2 p-3 bg-default-50 rounded border border-default-200">
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      label="Depends on Field"
                      selectedKeys={conditionDependsOn ? [conditionDependsOn] : []}
                      onChange={(e) => setConditionDependsOn(e.target.value)}
                      size="sm"
                    >
                      {fields.map((f) => {
                        if (f.type === "dropdown" && f.id !== field.id) {
                          return (
                            <SelectItem key={f.id}>
                              {f.label}
                            </SelectItem>
                          );
                        }
                        return null;
                      })}
                    </Select>

                    {conditionDependsOn && (
                      <Select
                        label="When Value is"
                        selectedKeys={conditionValue ? [conditionValue] : []}
                        onChange={(e) => setConditionValue(e.target.value)}
                        size="sm"
                      >
                        {(() => {
                          const dependsOnField = fields.find(f => f.id === conditionDependsOn);
                          return (dependsOnField?.values?.map((val) => (
                            <SelectItem key={val}>
                              {val}
                            </SelectItem>
                          )) || []);
                        })()}
                      </Select>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="light"
                      onPress={() => {
                        setConditionFieldId(null);
                        setConditionDependsOn("");
                        setConditionValue("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      color="primary"
                      onPress={() => {
                        if (conditionDependsOn && conditionValue) {
                          handleAddCondition(field.id, conditionDependsOn, conditionValue);
                          setConditionFieldId(null);
                          setConditionDependsOn("");
                          setConditionValue("");
                        }
                      }}
                      isDisabled={!conditionDependsOn || !conditionValue}
                    >
                      Add Condition
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="bordered"
                  className="w-full"
                  onPress={() => setConditionFieldId(field.id)}
                  startContent={<Icon icon="tabler:plus" fontSize={16} />}
                >
                  Add Condition
                </Button>
              )}

              {(!field.conditions || field.conditions.length === 0) && (
                <div className="text-xs text-default-400 italic">
                  No conditions set - this field will always be visible
                </div>
              )}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
};

export const CoreDesignElementManager: React.FC<
  CoreDesignElementManagerProps
> = ({ fields = [], onFieldsChange }) => {
  const [newFieldLabel, setNewFieldLabel] = React.useState("");
  const [newFieldType, setNewFieldType] = React.useState<"text" | "dropdown">(
    "text"
  );
  const [newValue, setNewValue] = React.useState("");
  const [editingFieldId, setEditingFieldId] = React.useState<string | null>(
    null
  );
  const [conditionFieldId, setConditionFieldId] = React.useState<string | null>(null);
  const [conditionDependsOn, setConditionDependsOn] = React.useState<string>("");
  const [conditionValue, setConditionValue] = React.useState<string>("");

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      return;
    }

    const newField: CoreDesignField = {
      id: generateId(newFieldLabel),
      label: newFieldLabel,
      type: newFieldType,
      value: newFieldType === "text" ? "" : undefined,
      values: newFieldType === "dropdown" ? [] : undefined,
      defaultValue: undefined,
    };

    onFieldsChange([...fields, newField]);
    setNewFieldLabel("");
    setNewFieldType("text");
    setNewValue("");
    setEditingFieldId(null);
  };

  const handleRemoveField = (fieldId: string) => {
    onFieldsChange(fields.filter((f) => f.id !== fieldId));
  };

  const handleUpdateFieldLabel = (fieldId: string, label: string) => {
    onFieldsChange(
      fields.map((f) => (f.id === fieldId ? { ...f, label } : f))
    );
  };

  const handleAddValue = (fieldId: string) => {
    if (!newValue.trim()) {
      return;
    }

    onFieldsChange(
      fields.map((f) => {
        if (f.id === fieldId) {
          if (f.type === "text") {
            // For text fields, single value
            return {
              ...f,
              value: newValue,
            };
          } else {
            // For dropdown, multiple values (no automatic default)
            const updatedValues = [...(f.values || []), newValue];
            return {
              ...f,
              values: updatedValues,
            };
          }
        }
        return f;
      })
    );
    setNewValue("");
  };

  const handleRemoveValue = (fieldId: string, valueIndex?: number) => {
    onFieldsChange(
      fields.map((f) => {
        if (f.id === fieldId) {
          if (f.type === "text") {
            return {
              ...f,
              value: "",
            };
          } else {
            const updatedValues = f.values?.filter((_, idx) => idx !== valueIndex) || [];
            const removedValue = f.values?.[valueIndex || 0];
            
            let newDefault = f.defaultValue;
            if (removedValue === f.defaultValue) {
              newDefault = updatedValues.length > 0 ? updatedValues[0] : undefined;
            }

            return {
              ...f,
              values: updatedValues,
              defaultValue: newDefault,
            };
          }
        }
        return f;
      })
    );
  };

  const handleSetDefaultValue = (fieldId: string, value: string) => {
    onFieldsChange(
      fields.map((f) =>
        f.id === fieldId ? { ...f, defaultValue: value } : f
      )
    );
  };

  const handleClearDefaultValue = (fieldId: string) => {
    onFieldsChange(
      fields.map((f) =>
        f.id === fieldId ? { ...f, defaultValue: undefined } : f
      )
    );
  };

  const handleAddCondition = (fieldId: string, dependsOnFieldId: string, value: string) => {
    onFieldsChange(
      fields.map((f) => {
        if (f.id === fieldId) {
          const newConditions = [...(f.conditions || [])];
          // Check if condition already exists for this field
          const existingIndex = newConditions.findIndex(c => c.fieldId === dependsOnFieldId);
          if (existingIndex >= 0) {
            newConditions[existingIndex] = { fieldId: dependsOnFieldId, value };
          } else {
            newConditions.push({ fieldId: dependsOnFieldId, value });
          }
          return { ...f, conditions: newConditions };
        }
        return f;
      })
    );
  };

  const handleRemoveCondition = (fieldId: string, conditionIndex: number) => {
    onFieldsChange(
      fields.map((f) => {
        if (f.id === fieldId) {
          const newConditions = f.conditions?.filter((_, idx) => idx !== conditionIndex) || [];
          return { ...f, conditions: newConditions.length > 0 ? newConditions : undefined };
        }
        return f;
      })
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onFieldsChange(arrayMove(fields, oldIndex, newIndex));
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="space-y-4">
      <div className="text-sm text-default-500">
        Configure custom fields for the Core Design Element. Text fields have a single value, while dropdown fields can have multiple options with a default selection.
      </div>

      {/* Add New Field Section */}
      <Card className="bg-default-100">
        <CardBody className="space-y-4">
          <div className="flex items-center gap-2">
            <Icon icon="tabler:plus" fontSize={20} />
            <h3 className="font-semibold">Add New Field</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Field Label"
              placeholder="e.g., Material, Color, Size"
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              classNames={{ input: "urbana-input" }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddField();
                }
              }}
            />

            <Select
              label="Field Type"
              selectedKeys={[newFieldType]}
              onChange={(e) =>
                setNewFieldType(e.target.value as "text" | "dropdown")
              }
            >
              <SelectItem key="text">
                Text Field
              </SelectItem>
              <SelectItem key="dropdown">
                Dropdown
              </SelectItem>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button
              color="primary"
              onPress={handleAddField}
              isDisabled={!newFieldLabel.trim()}
            >
              Add Field
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Fields List with Drag and Drop */}
      <div className="space-y-3">
        {fields.length === 0 ? (
          <Card className="bg-default-50 border border-dashed border-default-300">
            <CardBody className="py-8">
              <p className="text-center text-default-400 text-sm">
                No fields added yet. Create your first field above.
              </p>
            </CardBody>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              {fields.map((field, index) => (
                <DraggableFieldItem
                  key={field.id}
                  field={field}
                  index={index}
                  fields={fields}
                  onFieldsChange={onFieldsChange}
                  editingFieldId={editingFieldId}
                  setEditingFieldId={setEditingFieldId}
                  newValue={newValue}
                  setNewValue={setNewValue}
                  conditionFieldId={conditionFieldId}
                  setConditionFieldId={setConditionFieldId}
                  conditionDependsOn={conditionDependsOn}
                  setConditionDependsOn={setConditionDependsOn}
                  conditionValue={conditionValue}
                  setConditionValue={setConditionValue}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {fields.length > 0 && (
        <div className="text-xs text-default-400 text-center">
          Total Fields: {fields.length}
          {fields.filter((f) => f.type === "dropdown").length > 0 &&
            ` • Dropdowns: ${fields.filter((f) => f.type === "dropdown").length}`}
          <br />
          <span className="text-xs italic">Drag fields by the handle icon to reorder</span>
        </div>
      )}
    </div>
  );
};
