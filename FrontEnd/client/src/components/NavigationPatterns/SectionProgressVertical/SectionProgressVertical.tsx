import { Stack, Text, ThemeIcon, Timeline } from "@mantine/core";
import { IconCheck, IconClock, IconLock } from "@tabler/icons-react";
import style from "./SectionProgressVertical.module.scss";

export default function SectionProgressVertical() {
  return (
    <Timeline active={1} bulletSize={28} lineWidth={2} className={style.root}>
      <Timeline.Item
        bullet={
          <ThemeIcon size={22} radius="xl" className={style.iconDone}>
            <IconCheck size={14} />
          </ThemeIcon>
        }
      >
        <Stack gap={2}>
          <Text className={style.titleDone}>Part A: Multiple Choice</Text>
          <Text className={style.metaDone}>Completed 20/20 questions</Text>
        </Stack>
      </Timeline.Item>

      <Timeline.Item
        bullet={
          <ThemeIcon size={22} radius="xl" className={style.iconCurrent}>
            <IconClock size={14} />
          </ThemeIcon>
        }
      >
        <Stack gap={2}>
          <Text className={style.titleCurrent}>Part B: Essay Writing</Text>
          <Text className={style.metaCurrent}>In Progress - 15 mins left</Text>
        </Stack>
      </Timeline.Item>

      <Timeline.Item
        bullet={
          <ThemeIcon size={22} radius="xl" className={style.iconLocked}>
            <IconLock size={14} />
          </ThemeIcon>
        }
      >
        <Stack gap={2}>
          <Text className={style.titleLocked}>Part C: Oral Assessment</Text>
          <Text className={style.metaLocked}>Locked until Part B is finished</Text>
        </Stack>
      </Timeline.Item>
    </Timeline>
  );
}
