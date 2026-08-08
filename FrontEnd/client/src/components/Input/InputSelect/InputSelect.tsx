import {
  Combobox,
  useCombobox,
  InputBase,
  ActionIcon,
} from "@mantine/core";

import {
  IconSearch,
  IconX,
  IconCheck,
} from "@tabler/icons-react";
import style from "./InputSelect.module.scss";
import { useState } from "react";

interface InputSelectProps {
  data: string[];
  value?: string | null;
  onChange?: (value: string | null) => void;
  placeholder?: string;
  fullWidth?: boolean;
  error?: string;
  disabled?: boolean;
  clearable?: boolean;
}

export default function InputSelect({
  data,
  value,
  onChange,
  placeholder = "Search...",
  fullWidth,
  error,
  disabled = false,
  clearable = false,
}: InputSelectProps) {

  const combobox = useCombobox();
  const [search, setSearch] = useState(value || "");
  const filtered = data.filter(item =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (item: string) => {
    onChange?.(item);
    setSearch(item);
    combobox.closeDropdown();
  };

  const handleClear = () => {
    if (!clearable) return;
    setSearch("");
    onChange?.(null);
  };

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleSelect}
    >
      <Combobox.Target>
        <InputBase
          value={search}
          onChange={(e) => {
            if (disabled) return;
            setSearch(e.currentTarget.value);
            combobox.openDropdown();
          }}
          onFocus={() =>
            !disabled && combobox.openDropdown()
          }
          placeholder={placeholder}
          radius="md"
          w={fullWidth ? "100%" : undefined}
          error={error}
          disabled={disabled}
          leftSection={
            <IconSearch size={16} />
          }
          rightSection={
            clearable && search ? (
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={handleClear}
                disabled={disabled}
              >
                <IconX size={14} />
              </ActionIcon>
            ) : null
          }

        />

      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {filtered.length === 0 && (
            <Combobox.Empty>
              Nothing found
            </Combobox.Empty>
          )}
          {filtered.map(item => {
            const selected = item === value;
            return (
              <Combobox.Option
                value={item}
                key={item}
                className={style.option}
                data-selected={selected || undefined}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                  }}
                >
                  {item}
                  {selected && (
                    <IconCheck size={16} />
                  )}
                </div>
              </Combobox.Option>
            );
          })}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}