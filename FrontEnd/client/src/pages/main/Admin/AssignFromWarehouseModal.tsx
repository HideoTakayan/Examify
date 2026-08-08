import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  Loader,
  Checkbox,
  Group,
  Button,
  ScrollArea,
  Badge,
  Divider,
  Accordion,
} from '@mantine/core';
import subjectApi, { type SubjectCatalogGroup } from '@/services/subjectApi';
import programApi from '@/services/programApi';
import { useTranslation } from 'react-i18next';

type Props = {
  opened: boolean;
  onClose: () => void;
  programId: string;
  programName: string;
  assignedGroupIds: Set<string>;
  onAssigned: () => void;
};

export default function AssignFromWarehouseModal({
  opened,
  onClose,
  programId,
  programName,
  assignedGroupIds,
  onAssigned,
}: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<SubjectCatalogGroup[]>([]);
  const [pickedGroups, setPickedGroups] = useState<Set<string>>(new Set());
  const [pickedSubjects, setPickedSubjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!opened) return;
    setLoading(true);
    setPickedGroups(new Set());
    setPickedSubjects(new Set());
    void subjectApi
      .getWarehouse({ refresh: true })
      .then((w) => setGroups(w.groups.filter((g) => g.id !== 'other')))
      .finally(() => setLoading(false));
  }, [opened]);

  const availableGroups = useMemo(
    () =>
      groups.filter(
        (g) => g.group_scope !== 'base' && !assignedGroupIds.has(g.id)
      ),
    [groups, assignedGroupIds]
  );

  const toggleGroup = (id: string) => {
    setPickedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSubject = (id: string) => {
    setPickedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApplyBase = async () => {
    setSaving(true);
    try {
      await programApi.applyBaseGroups(programId);
      onAssigned();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (pickedGroups.size === 0 && pickedSubjects.size === 0) return;
    setSaving(true);
    try {
      if (pickedGroups.size > 0) {
        await programApi.assignGroups(programId, [...pickedGroups]);
      }
      if (pickedSubjects.size > 0) {
        await programApi.assignSubjects(programId, [...pickedSubjects]);
      }
      subjectApi.resetCatalogCache(programId);
      onAssigned();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Chọn từ kho — ${programName}`}
      size="lg"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Nhóm/môn nằm trong <strong>kho trường</strong>. Ngành chỉ <strong>gán</strong>, không tạo bản sao.
          Nhóm <Badge size="xs" color="blue">base</Badge> tự có trong mọi CTĐT.
        </Text>

        <Group>
          <Button variant="light" size="xs" loading={saving} onClick={() => void handleApplyBase()}>
            Áp nhóm bắt buộc (base)
          </Button>
        </Group>

        <Divider />

        {loading ? (
          <Loader />
        ) : (
          <ScrollArea h={360}>
            <Stack gap="sm">
              {availableGroups.length === 0 ? (
                <Text c="dimmed" size="sm">
                  Tất cả nhóm trong kho đã gán cho ngành này (trừ nhóm base).
                </Text>
              ) : (
                availableGroups.map((g) => (
                  <Stack key={g.id} gap={4}>
                    <Checkbox
                      label={
                        <Group gap={6}>
                          <Text fw={600}>{g.name}</Text>
                          <Text size="xs" c="dimmed" ff="monospace">
                            {g.code}
                          </Text>
                          {g.group_scope === 'shared' && (
                            <Badge size="xs" color="teal">
                              dùng chung
                            </Badge>
                          )}
                          <Badge size="xs" variant="light">
                            {g.subject_count} môn
                          </Badge>
                        </Group>
                      }
                      checked={pickedGroups.has(g.id)}
                      onChange={() => toggleGroup(g.id)}
                    />
                    {!pickedGroups.has(g.id) && g.subjects.length > 0 && (
                      <Accordion variant="contained" chevronPosition="left">
                        <Accordion.Item value="subjects">
                          <Accordion.Control>
                            <Text size="xs">{t('subject_catalog.pick_subjects_in_group')}</Text>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Stack gap={4} pl="md">
                              {g.subjects.map((s) => (
                                <Checkbox
                                  key={s.id}
                                  size="xs"
                                  label={`${s.code} — ${s.name}`}
                                  checked={pickedSubjects.has(s.id)}
                                  onChange={() => toggleSubject(s.id)}
                                />
                              ))}
                            </Stack>
                          </Accordion.Panel>
                        </Accordion.Item>
                      </Accordion>
                    )}
                  </Stack>
                ))
              )}
            </Stack>
          </ScrollArea>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Hủy
          </Button>
          <Button
            loading={saving}
            disabled={pickedGroups.size === 0 && pickedSubjects.size === 0}
            onClick={() => void handleConfirm()}
          >
            Gán vào ngành ({pickedGroups.size} nhóm, {pickedSubjects.size} môn lẻ)
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
