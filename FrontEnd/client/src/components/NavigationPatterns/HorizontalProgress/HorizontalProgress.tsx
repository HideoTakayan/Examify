import { Stack, Text, ThemeIcon, Timeline } from "@mantine/core";
import { IconChecklist, IconClipboardText, IconFileAnalytics, IconRosetteDiscountCheck } from "@tabler/icons-react";
import style from "./HorizontalProgress.module.scss";

export default function HorizontalProgress() {
  return (
    <Timeline active={1} bulletSize={30} lineWidth={2} className={style.root}>
      <Timeline.Item
        bullet={
          <ThemeIcon radius="xl" size={22} className={style.iconDone}>
            <IconChecklist size={14} />
          </ThemeIcon>
        }
      >
        <Stack gap={2}>
          <Text className={style.stepActive}>Instructions</Text>
          <Text className={style.stepSubtle}>Completed</Text>
        </Stack>
      </Timeline.Item>

      <Timeline.Item
        bullet={
          <ThemeIcon radius="xl" size={22} className={style.iconCurrent}>
            <IconClipboardText size={14} />
          </ThemeIcon>
        }
      >
        <Stack gap={2}>
          <Text className={style.stepCurrent}>Exam Session</Text>
          <Text className={style.stepSubtle}>In progress</Text>
        </Stack>
      </Timeline.Item>

      <Timeline.Item
        bullet={
          <ThemeIcon radius="xl" size={22} className={style.iconPending}>
            <IconFileAnalytics size={14} />
          </ThemeIcon>
        }
      >
        <Stack gap={2}>
          <Text className={style.stepMuted}>Review</Text>
          <Text className={style.stepSubtle}>Pending</Text>
        </Stack>
      </Timeline.Item>

      <Timeline.Item
        bullet={
          <ThemeIcon radius="xl" size={22} className={style.iconPending}>
            <IconRosetteDiscountCheck size={14} />
          </ThemeIcon>
        }
      >
        <Stack gap={2}>
          <Text className={style.stepMuted}>Results</Text>
          <Text className={style.stepSubtle}>Pending</Text>
        </Stack>
      </Timeline.Item>
    </Timeline>
  );
}
