import { Tabs } from "@mantine/core";
import style from "./ContentTabs.module.scss";

export default function ContentTabs() {
  return (
    <Tabs defaultValue="overview" classNames={{ list: style.list, tab: style.tab }}>
      <Tabs.List>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
        <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}
