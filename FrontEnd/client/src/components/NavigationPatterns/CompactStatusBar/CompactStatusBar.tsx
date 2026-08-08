import { Group, Text } from "@mantine/core";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import ButtonOutline from "@/components/Button/ButtonOutline/ButtonOutline";
import style from "./CompactStatusBar.module.scss";

interface CompactStatusBarProps {
  page?: number;
  total?: number;
}

export default function CompactStatusBar({ page = 2, total = 12 }: CompactStatusBarProps) {
  return (
    <Group justify="space-between" wrap="nowrap" className={style.root}>
      <ButtonOutline
        size="sm"
        leftIcon={<IconArrowLeft size={14} />}
        label="Previous"
        disabled={false}
      />
      <Text className={style.statusText}>Page {page} of {total}</Text>
      <ButtonOutline
        size="sm"
        rightIcon={<IconArrowRight size={14} />}
        label="Next"
        disabled={false}
      />
    </Group>
  );
}
