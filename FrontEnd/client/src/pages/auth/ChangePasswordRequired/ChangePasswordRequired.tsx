import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Stack, Text, Alert } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import appConfig from '@/configs/app.config';
import InputPassword from '@/components/Input/InputPassword/InputPassword';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import { changePassword } from '@/services/authApi';
import { useAppDispatch } from '@/hooks/useAppStore';
import { refreshAuthFromStorage } from '@/store/authSlice';

const ChangePasswordRequired = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const userId = localStorage.getItem('user_id') ?? '';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!currentPassword || !newPassword) {
      setError(t('first_login.missing_fields'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('first_login.min_length'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('first_login.mismatch'));
      return;
    }
    if (!userId) {
      setError(t('first_login.session_error'));
      return;
    }
    try {
      setLoading(true);
      await changePassword(userId, currentPassword, newPassword);
      dispatch(refreshAuthFromStorage());
      navigate(appConfig.authenticatedEntryPath, { replace: true });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t('first_login.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened
      onClose={() => {}}
      centered
      size={440}
      radius="md"
      padding="xl"
      title={t('first_login.title')}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      overlayProps={{ backgroundOpacity: 0.9 }}
      zIndex={1000}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('first_login.description')}
        </Text>
        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}
        <InputPassword
          label={t('first_login.current_password')}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.currentTarget.value)}
        />
        <InputPassword
          label={t('first_login.new_password')}
          value={newPassword}
          onChange={(e) => setNewPassword(e.currentTarget.value)}
        />
        <InputPassword
          label={t('first_login.confirm_password')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.currentTarget.value)}
        />
        <ButtonFilled
          label={t('first_login.submit')}
          disabled={loading}
          onClick={() => void handleSubmit()}
          color="teal"
        />
      </Stack>
    </Modal>
  );
};

export default ChangePasswordRequired;
