import { Badge, Group, Stack, Text } from "@mantine/core";
import style from "./BackgroundBorderStatus.module.scss";

const states = [
  { badge: "Draft", label: "Draft State", color: "gray" },
  { badge: "Active", label: "In Progress", color: "blue" },
  { badge: "Completed", label: "Submitted", color: "green" },
  { badge: "Scheduled", label: "Upcoming", color: "yellow" },
  { badge: "Reviewing", label: "Requires Action", color: "pink" },
] as const;

export default function BackgroundBorderStatus() {
  return (
    <Group className={style.root} grow>
      {states.map((item) => (
        <Stack key={item.badge} gap={6} align="center">
          <Badge color={item.color} radius="xl" variant="light">{item.badge}</Badge>
          <Text className={style.label}>{item.label}</Text>
        </Stack>
      ))}
    </Group>
  );
}
