import React, { useMemo, useState } from "react";
import {
  ActionIcon,
  Combobox,
  InputBase,
  InputWrapper,
  useCombobox,
} from "@mantine/core";
import { IconCheck, IconChevronDown, IconSearch, IconX } from "@tabler/icons-react";
import style from "./SearchableSelect.module.scss";

export interface OptionType {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  data: OptionType[];
  value?: string | null;
  onChange?: (value: string | null) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
}
const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  placeholder = "Search subjects...",
  data,
  value = null,
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

  const selected = useMemo(
    () => data.find((item) => item.value === value) ?? null,
    [data, value]
  );

  const [search, setSearch] = useState("");

  const filtered = data.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase().trim())
  );

  const inputValue = combobox.dropdownOpened ? search : selected?.label ?? "";

  const handleSelect = (nextValue: string) => {
    const next = data.find((item) => item.value === nextValue) ?? null;
    onChange?.(next?.value ?? null);
    setSearch("");
    combobox.closeDropdown();
  };

  const handleClear = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onChange?.(null);
    setSearch("");
    combobox.openDropdown();
  };

  return (
    <InputWrapper
      label={label}
      error={error}
      required={required}
      withAsterisk={required}
      className={style.root}
    >
      <Combobox store={combobox} onOptionSubmit={handleSelect}>
        <Combobox.Target>
          <InputBase
            value={inputValue}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              combobox.openDropdown();
              combobox.updateSelectedOptionIndex();
            }}
            onFocus={() => combobox.openDropdown()}
            onClick={() => combobox.openDropdown()}
            onBlur={() => {
              setSearch("");
              combobox.closeDropdown();
            }}
            placeholder={placeholder}
            disabled={disabled}
            error={Boolean(error)}
            leftSection={<IconSearch size={16} stroke={1.8} />}
            rightSection={
              inputValue && !disabled ? (
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleClear}
                  aria-label="Clear value"
                >
                  <IconX size={14} stroke={2} />
                </ActionIcon>
              ) : (
                <IconChevronDown size={16} stroke={1.8} />
              )
            }
            rightSectionPointerEvents={inputValue && !disabled ? "auto" : "none"}
            classNames={{
              input: style.input,
              section: style.section,
            }}
            w={fullWidth ? "100%" : undefined}
            radius="md"
          />
        </Combobox.Target>

        <Combobox.Dropdown className={style.dropdown}>
          <Combobox.Options>
            {filtered.length === 0 ? (
              <Combobox.Empty>Nothing found</Combobox.Empty>
            ) : (
              filtered.map((item) => {
                const isSelected = item.value === value;

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

export default SearchableSelect;
