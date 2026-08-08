import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Title, Text, Paper, Stack,
  Tabs, Notification, Group, Badge, Divider, SegmentedControl, useMantineColorScheme,
} from '@mantine/core';
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { clearSession, changePassword } from '@/services/authApi';
import { APP_LANGUAGES, useLanguage, type AppLanguage } from '@/hooks/useLanguage';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import InputPassword from '@/components/Input/InputPassword/InputPassword';

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const name = localStorage.getItem('user_name') || t('roles.user');
  const role = localStorage.getItem('user_role') || 'user';
  const userId = localStorage.getItem('user_id') ?? '';
  const roleLabel = t(`roles.${role}`, { defaultValue: role });
  const [email] = useState(localStorage.getItem('user_email') || '');
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);

  const isAdmin = role === 'admin';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { language, changeLanguage } = useLanguage();

  const themeOptions = [
    {
      value: 'light',
      label: (
        <Group gap={6} wrap="nowrap" justify="center">
          <IconSun size={16} />
          <span>{t('profile.theme_light')}</span>
        </Group>
      ),
    },
    {
      value: 'dark',
      label: (
        <Group gap={6} wrap="nowrap" justify="center">
          <IconMoon size={16} />
          <span>{t('profile.theme_dark')}</span>
        </Group>
      ),
    },
    {
      value: 'auto',
      label: (
        <Group gap={6} wrap="nowrap" justify="center">
          <IconDeviceDesktop size={16} />
          <span>{t('profile.theme_auto')}</span>
        </Group>
      ),
    },
  ];

  const languageOptions = (Object.keys(APP_LANGUAGES) as AppLanguage[]).map((code) => ({
    value: code,
    label: (
      <Group gap={6} wrap="nowrap" justify="center">
        <span>{APP_LANGUAGES[code].flag}</span>
        <span>{APP_LANGUAGES[code].shortLabel}</span>
      </Group>
    ),
  }));

  useEffect(() => {
    if (!message) return;
    const timeoutId = window.setTimeout(() => setMessage(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  const handleLogout = async () => {
    await clearSession();
    navigate('/login', { replace: true });
  };

  const handleChangePassword = async () => {
    setMessage('');
    setMessageIsError(false);
    if (!currentPassword || !newPassword) {
      setMessage(t('profile.change_password_missing'));
      setMessageIsError(true);
      return;
    }
    if (newPassword.length < 8) {
      setMessage(t('profile.password_min_length'));
      setMessageIsError(true);
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage(t('profile.change_password_mismatch'));
      setMessageIsError(true);
      return;
    }
    if (!userId) {
      setMessage(t('first_login.session_error'));
      setMessageIsError(true);
      return;
    }
    try {
      setChangingPassword(true);
      await changePassword(userId, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage(t('profile.password_changed'));
      setMessageIsError(false);
    } catch (e: unknown) {
      const apiMsg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage(apiMsg || t('profile.change_password_error'));
      setMessageIsError(true);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Box className="max-w-[900px] mx-auto p-4">
      <Group justify="space-between" mb="xs">
        <Title order={2}>{t('profile.title')}</Title>
        <Badge color={role === 'admin' ? 'red' : role === 'teacher' ? 'blue' : 'green'}>
          {roleLabel}
        </Badge>
      </Group>
      <Text c="dimmed" mb="md">{t('profile.subtitle')}</Text>
      <Tabs defaultValue="profile" mt="md">
        <Tabs.List>
          <Tabs.Tab value="profile">{t('profile.tab_profile')}</Tabs.Tab>
          <Tabs.Tab value="settings">{t('profile.tab_settings')}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile" pt="md">
          <Paper shadow="xs" withBorder p="md">
            <Stack gap="sm">
              <Text><strong>{t('profile.name')}:</strong> {name}</Text>
              <Text><strong>{t('profile.role')}:</strong> {roleLabel}</Text>
              <Text><strong>{t('profile.email')}:</strong> {email}</Text>
            </Stack>
            <Divider my="md" />
            <ButtonFilled
              style={{ marginTop: 16 }}
              color="red"
              label={t('common.logout')}
              disabled={false}
              onClick={handleLogout}
            />
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="settings" pt="md">
          <Stack gap="md">
            <Paper shadow="xs" withBorder p="md">
              <Stack gap="lg">
                <Box>
                  <Title order={4}>{t('profile.appearance_title')}</Title>
                  <Text size="sm" c="dimmed" mt={4} mb="sm">
                    {t('profile.appearance_desc')}
                  </Text>
                  <SegmentedControl
                    fullWidth
                    value={colorScheme}
                    onChange={(value) => setColorScheme(value as 'light' | 'dark' | 'auto')}
                    data={themeOptions}
                  />
                </Box>

                <Divider />

                <Box>
                  <Title order={4}>{t('profile.language_title')}</Title>
                  <Text size="sm" c="dimmed" mt={4} mb="sm">
                    {t('profile.language_desc')}
                  </Text>
                  <SegmentedControl
                    fullWidth
                    value={language}
                    onChange={(value) => void changeLanguage(value as AppLanguage)}
                    data={languageOptions}
                  />
                </Box>
              </Stack>
            </Paper>

            <Paper shadow="xs" withBorder p="md">
              <Stack gap="md">
                {message && (
                  <Notification color={messageIsError ? 'red' : 'teal'} onClose={() => setMessage('')}>
                    {message}
                  </Notification>
                )}

                <Box>
                  <Title order={4}>{t('profile.change_password_title')}</Title>
                  <Text size="sm" c="dimmed" mt={4}>
                    {isAdmin ? t('profile.admin_change_desc') : t('profile.change_password_desc')}
                  </Text>
                </Box>

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
                  label={t('profile.change_password_submit')}
                  disabled={changingPassword}
                  onClick={() => void handleChangePassword()}
                />
              </Stack>
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
};

export default Profile;
