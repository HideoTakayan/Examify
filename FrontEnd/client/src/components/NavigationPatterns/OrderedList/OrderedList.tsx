import { Breadcrumbs, Text } from "@mantine/core";
import { IconHome2 } from "@tabler/icons-react";
import style from "./OrderedList.module.scss";

interface OrderedListProps {
  items?: string[];
}

export default function OrderedList({
  items = ["Dashboard", "Mathematics", "Final Semester Exam"],
}: OrderedListProps) {
  return (
    <Breadcrumbs separator=">" className={style.root}>
      <span className={style.itemMuted}>
        <IconHome2 size={14} />
        {items[0]}
      </span>
      <span className={style.itemMuted}>{items[1]}</span>
      <Text className={style.itemActive}>{items[2]}</Text>
    </Breadcrumbs>
  );
}
