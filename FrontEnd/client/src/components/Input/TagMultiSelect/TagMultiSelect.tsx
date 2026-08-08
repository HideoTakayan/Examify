import React, { useMemo, useState } from "react";
import {
  Combobox,
  InputWrapper,
  Pill,
  PillsInput,
  useCombobox,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import style from "./TagMultiSelect.module.scss";

export interface MultiSelectOption {
  label: string;
  value: string;
}

interface TagMultiSelectProps {
  label?: string;
  placeholder?: string;
  data: MultiSelectOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
}

const TagMultiSelect: React.FC<TagMultiSelectProps> = ({
  label,
  placeholder = "Add topic",
  data,
  value = [],
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  fullWidth = true,
}) => {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [search, setSearch] = useState("");

  const selectedSet = useMemo(() => new Set(value), [value]);

  const filtered = data.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase().trim())
  );

  const toggleValue = (nextValue: string) => {
    const next = selectedSet.has(nextValue)
      ? value.filter((item) => item !== nextValue)
      : [...value, nextValue];

    onChange?.(next);
  };

  const handleRemove = (removedValue: string) => {
    onChange?.(value.filter((item) => item !== removedValue));
  };

  return (
    <InputWrapper
      label={label}
      error={error}
      required={required}
      withAsterisk={required}
      className={style.root}
    >
      <Combobox
        store={combobox}
        onOptionSubmit={(nextValue) => {
          toggleValue(nextValue);
          setSearch("");
          combobox.updateSelectedOptionIndex("active");
        }}
        withinPortal={false}
      >
        <Combobox.Target>
          <PillsInput
            onClick={() => !disabled && combobox.openDropdown()}
            disabled={disabled}
            radius="md"
            classNames={{
              input: style.input,
            }}
            w={fullWidth ? "100%" : undefined}
            error={Boolean(error)}
          >
            <Pill.Group>
              {data
                .filter((item) => selectedSet.has(item.value))
                .map((item) => (
                  <Pill
                    key={item.value}
                    withRemoveButton={!disabled}
                    onRemove={() => handleRemove(item.value)}
                    className={style.pill}
                  >
                    {item.label}
                  </Pill>
                ))}

              <Combobox.EventsTarget>
                <PillsInput.Field
                  value={search}
                  placeholder={value.length === 0 ? placeholder : ""}
                  onFocus={() => !disabled && combobox.openDropdown()}
                  onBlur={() => combobox.closeDropdown()}
                  onChange={(event) => {
                    setSearch(event.currentTarget.value);
                    combobox.openDropdown();
                    combobox.updateSelectedOptionIndex();
                  }}
                  disabled={disabled}
                  className={style.field}
                />
              </Combobox.EventsTarget>
            </Pill.Group>
          </PillsInput>
        </Combobox.Target>

        <Combobox.Dropdown className={style.dropdown}>
          <Combobox.Options className={style.options}>
            {filtered.length === 0 ? (
              <Combobox.Empty>Nothing found</Combobox.Empty>
            ) : (
              filtered.map((item) => {
                const isSelected = selectedSet.has(item.value);

                return (
                  <Combobox.Option
                    key={item.value}
                    value={item.value}
                    className={style.option}
                    data-selected={isSelected || undefined}
                  >
                    <span>{item.label}</span>
                    {isSelected && <IconCheck size={14} stroke={2} />}
                  </Combobox.Option>
                );
              })
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>

      {helperText && !error && <div className={style.helperText}>{helperText}</div>}
    </InputWrapper>
  );
};

export default TagMultiSelect;
