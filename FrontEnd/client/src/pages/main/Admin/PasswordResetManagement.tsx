import { useEffect, useState } from 'react';
import {
  Box, Text, Loader, Table, Paper, Group, Alert, Stack, Textarea, Modal,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { getPendingPasswordResets, approvePasswordReset, rejectPasswordReset, type PasswordResetRequestItem } from '@/services/authApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import ButtonLight from '@/components/Button/ButtonLight/ButtonLight';
import PageHeader from '@/components/PageHeader/PageHeader';

const PasswordResetManagement = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<PasswordResetRequestItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteAction, setNoteAction] = useState<'approve' | 'reject'>('approve');
  const [noteRequestId, setNoteRequestId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const openNoteModal = (id: string, action: 'approve' | 'reject') => {
    setNoteRequestId(id);
    setNoteAction(action);
    setNoteText('');
    setNoteModalOpen(true);
  };

  const closeNoteModal = () => {
    setNoteModalOpen(false);
    setNoteRequestId(null);
    setNoteText('');
  };

  const load = async () => {
    const isFirstLoad = initialLoading;
    try {
      if (!isFirstLoad) setRefreshing(true);
      const d = await getPendingPasswordResets();
      setRequests(d);
      setError('');
    } catch {
      setError('Không tải được yêu cầu đặt lại mật khẩu.');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleApprove = async (id: string, note: string) => {
    try {
      setProcessingId(id);
      closeNoteModal();
      const result = await approvePasswordReset(id, note || undefined);
      setTempPassword(result.tempPassword);
      setNotice(`Đã duyệt yêu cầu. Mật khẩu tạm thời: ${result.tempPassword}`);
      await load();
    } catch {
      setError('Duyệt yêu cầu thất bại.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, note: string) => {
    try {
      setProcessingId(id);
      closeNoteModal();
      await rejectPasswordReset(id, note || undefined);
      setNotice('Đã từ chối yêu cầu.');
      await load();
    } catch {
      setError('Từ chối yêu cầu thất bại.');
    } finally {
      setProcessingId(null);
    }
  };

  if (initialLoading) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Loader />
      </Box>
    );
  }

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <PageHeader
          title={t('password_reset.title')}
          subtitle={t('password_reset.subtitle')}
          accent="teal"
        />

        {notice && <Alert color="green" variant="light">{notice}</Alert>}
        {error && <Alert color="red" variant="light">{error}</Alert>}
        {tempPassword && (
          <Alert color="blue" variant="light">
            Mật khẩu tạm thời: <strong>{tempPassword}</strong> — gửi cho sinh viên.
          </Alert>
        )}

        <Paper withBorder radius="md" p="sm">
          <Group justify="flex-end" mb="sm">
            <ButtonLight
              size="sm"
              label={t('common.refresh')}
              loading={refreshing}
              disabled={refreshing}
              onClick={() => void load()}
            />
          </Group>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>{t('password_reset.user')}</Table.Th>
                <Table.Th>{t('password_reset.col_email')}</Table.Th>
                <Table.Th>{t('password_reset.requested_by')}</Table.Th>
                <Table.Th>{t('password_reset.requested_at')}</Table.Th>
                <Table.Th>{t('password_reset.expires_at')}</Table.Th>
                <Table.Th>{t('common.actions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {requests.map((req, idx) => (
                <Table.Tr key={req.id}>
                  <Table.Td>{idx + 1}</Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>{req.user_full_name || req.user_id}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{req.user_email}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{req.requested_by_full_name || req.requested_by}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{new Date(req.created_at).toLocaleString()}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{new Date(req.expires_at).toLocaleString()}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <ButtonLight
                        size="xs"
                        color="green"
                        label={t('password_reset.approve')}
                        loading={processingId === req.id}
                        disabled={processingId === req.id}
                        onClick={() => openNoteModal(req.id, 'approve')}
                      />
                      <ButtonLight
                        size="xs"
                        color="red"
                        label={t('password_reset.reject')}
                        loading={processingId === req.id}
                        disabled={processingId === req.id}
                        onClick={() => openNoteModal(req.id, 'reject')}
                      />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {requests.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed" ta="center">{t('password_reset.no_requests')}</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>

      <Modal
        opened={noteModalOpen}
        onClose={closeNoteModal}
        title={
          noteAction === 'approve'
            ? t('password_reset.modal_approve_title')
            : t('password_reset.modal_reject_title')
        }
      >
        <Stack gap="sm">
          <Textarea
            label={t('password_reset.note_optional')}
            value={noteText}
            onChange={(e) => setNoteText(e.currentTarget.value)}
            rows={3}
          />
          <Group justify="flex-end">
            <ButtonLight size="sm" color="gray" label={t('common.cancel')} disabled={false} onClick={closeNoteModal} />
            {noteAction === 'approve' ? (
              <ButtonFilled
                size="sm"
                color="green"
                label={t('password_reset.confirm_approve')}
                disabled={!noteRequestId}
                onClick={() => noteRequestId && void handleApprove(noteRequestId, noteText)}
              />
            ) : (
              <ButtonFilled
                size="sm"
                color="red"
                label={t('password_reset.confirm_reject')}
                disabled={!noteRequestId}
                onClick={() => noteRequestId && void handleReject(noteRequestId, noteText)}
              />
            )}
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default PasswordResetManagement;
