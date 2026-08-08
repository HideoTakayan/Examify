import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { DateValue } from "@mantine/dates";
import SchedulingPanel from "./SchedulingPanel";

const meta: Meta<typeof SchedulingPanel> = {
  title: "Input/SchedulingPanel",
  component: SchedulingPanel,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", maxWidth: 920 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SchedulingPanel>;

export const Primary: Story = {
  render: (args) => {
    const [date, setDate] = useState<DateValue>(new Date("2024-10-24"));
    const [time, setTime] = useState<string | null>("09:00");
    const [duration, setDuration] = useState<string | null>("120");

    return (
      <SchedulingPanel
        {...args}
        date={date}
        onDateChange={setDate}
        time={time}
        onTimeChange={setTime}
        duration={duration}
        onDurationChange={setDuration}
      />
    );
  },
};
