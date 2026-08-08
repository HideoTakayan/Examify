import {
  Combobox,
  useCombobox,
  Pill,
  PillsInput,
  CheckIcon,
  CloseButton,
} from "@mantine/core";

import { useState } from "react";
import style from "./InputMultiSelect.module.scss";

interface Props {
  data: string[];
  value?: string[];
  onChange?: (value: string[]) => void;
  label?: string;
  placeholder?: string;
  maxVisiblePills?: number;
  clearAllLabel?: string;
}

export default function InputMultiSelect({
  data,
  value,
  onChange,
  label,
  placeholder = "Add topic",
  maxVisiblePills = 2,
  clearAllLabel = "Clear",
}: Props) {
  const combobox = useCombobox({
    onDropdownClose: () =>
      combobox.resetSelectedOption(),
  });

  const [search, setSearch] = useState("");
  const [internalValue, setInternalValue] = useState<string[]>([]);
  const selectedValue = value ?? internalValue;

  // toggle select / unselect
  const toggle = (item: string) => {
    const updater = (prev: string[]) =>
      prev.includes(item)
        ? prev.filter((v) => v !== item)
        : [...prev, item];

    if (onChange) {
      onChange(updater(selectedValue));
      return;
    }
    setInternalValue((prev) => updater(prev));
  };

  // filter local search
  const filtered = data.filter((item) =>
    item
      .toLowerCase()
      .includes(search.toLowerCase().trim())
  );

  // options render
  const options = filtered.map((item) => {
    const selected = selectedValue.includes(item);

    return (
      <Combobox.Option
        key={item}
        value={item}
        className={`${style.option} ${selected ? style.optionSelected : ""
          }`}
      >
        {item}

        {selected && (
          <CheckIcon
            size={16}
            className={style.check}
          />
        )}
      </Combobox.Option>
    );
  });

  const visiblePills = selectedValue.slice(0, maxVisiblePills);
  const hiddenCount = Math.max(0, selectedValue.length - visiblePills.length);
  const clearAll = () => {
    if (onChange) {
      onChange([]);
      return;
    }
    setInternalValue([]);
  };

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        toggle(val);
        setSearch("");
        combobox.updateSelectedOptionIndex(
          "active"
        );
      }}
      radius="md"
    >
      <Combobox.Target>
        <PillsInput
          label={label}
          className={style.pillsInput}
          onClick={() =>
            combobox.openDropdown()
          }
          radius="md"
        >
          <Pill.Group className={style.pillGroup}>
            {visiblePills.map((item) => (
              <Pill
                key={item}
                withRemoveButton
                onRemove={() =>
                  toggle(item)
                }
                className={style.pill}
              >
                {item}
              </Pill>
            ))}
            {hiddenCount > 0 && (
              <Pill className={style.pill}>
                +{hiddenCount}
              </Pill>
            )}
            {selectedValue.length > 0 && (
              <CloseButton
                size="sm"
                className={style.clearBtn}
                onMouseDown={(event) => event.preventDefault()}
                onClick={clearAll}
                aria-label={clearAllLabel}
              />
            )}
            <Combobox.EventsTarget>
              <PillsInput.Field
                className={style.field}
                value={search}
                placeholder={placeholder}
                onFocus={() =>
                  combobox.openDropdown()
                }
                onChange={(event) => {
                  setSearch(
                    event.currentTarget.value
                  );

                  combobox.openDropdown();
                  combobox.updateSelectedOptionIndex();
                }}
                onBlur={() =>
                  combobox.closeDropdown()
                }
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.Target>

      {/* DROPDOWN */}
      <Combobox.Dropdown
        className={style.dropdown}
      >
        <Combobox.Options className={style.options}>
          {options.length > 0 ? (
            options
          ) : (
            <Combobox.Empty>
              Nothing found
            </Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>

    </Combobox>
  );
}