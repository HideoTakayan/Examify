import {
  ActionIcon,
  Combobox,
  Input,
  InputBase,
  useCombobox,
  type InputBaseProps,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import style from "./InputNativeSelect.module.scss";

interface NativeSelectProps
  extends Omit<InputBaseProps, "onChange"> {
  data: string[];

  value?: string | null;
  onChange?: (value: string | null) => void;

  leftIcon?: ReactNode;
  rightIcon?: ReactNode;

  placeholder?: string;
  error?: string;

  fullWidth?: boolean;
  clear?: boolean;
}

const NativeSelect = ({
  data,

  value,
  onChange,

  leftIcon,
  rightIcon,

  placeholder = "Pick value",
  clear,
  fullWidth,
  error,

  ...props
}: NativeSelectProps) => {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [internalValue, setInternalValue] = useState<string | null>(null);

  const selectedValue =
    value !== undefined ? value : internalValue;

  const setValue = (val: string | null) => {
    if (onChange) onChange(val);
    if (value === undefined) setInternalValue(val);
  };

  const options = data.map((item) => (
    <Combobox.Option value={item} key={item}>
      {item}
    </Combobox.Option>
  ));

  const remove =
    clear && selectedValue ? (
      <ActionIcon
        size="sm"
        variant="subtle"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setValue(null);
        }}
      >
        <IconX
          size={14}
          color={
            error
              ? "var(--mantine-color-error-6)"
              : "var(--mantine-color-gray-6)"
          }
        />
      </ActionIcon>
    ) : (
      rightIcon || <Combobox.Chevron />
    );

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      width={fullWidth ? "100%" : undefined}
      onOptionSubmit={(val) => {
        setValue(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          radius="md"
          pointer
          error={error}
          w={fullWidth ? "100%" : undefined}
          leftSection={leftIcon}
          rightSection={remove}
          rightSectionPointerEvents="auto"
          onClick={() => combobox.toggleDropdown()}
          classNames={{
            input: style.inputField,
            section: style.sectionField,
          }}
          {...props}
        >
          {selectedValue || (
            <Input.Placeholder>
              {placeholder}
            </Input.Placeholder>
          )}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {options}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

export default NativeSelect;