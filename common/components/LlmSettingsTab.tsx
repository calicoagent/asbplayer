import React, { useCallback, useState } from 'react';
import Stack from '@mui/material/Stack';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { useTranslation } from 'react-i18next';
import SettingsTextField from './SettingsTextField';
import SettingsSection from './SettingsSection';
import { AsbplayerSettings, LlmObsidianNoteMode } from '../settings';

interface Props {
    settings: AsbplayerSettings;
    onSettingChanged: <K extends keyof AsbplayerSettings>(key: K, value: AsbplayerSettings[K]) => Promise<void>;
}

const LlmSettingsTab: React.FC<Props> = ({ settings, onSettingChanged }) => {
    const { t } = useTranslation();
    const {
        llmEnabled,
        llmOpenRouterApiKey,
        llmOpenRouterModel,
        llmSystemPrompt,
        llmUserPromptTemplate,
        llmObsidianRestUrl,
        llmObsidianApiKey,
        llmObsidianVault,
        llmObsidianNoteMode,
        llmObsidianPathTemplate,
    } = settings;

    const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
    const [showObsidianKey, setShowObsidianKey] = useState(false);

    const set = useCallback(
        <K extends keyof AsbplayerSettings>(key: K) =>
            (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                onSettingChanged(key, e.target.value as AsbplayerSettings[K]);
            },
        [onSettingChanged]
    );

    return (
        <Stack spacing={3}>
            <SettingsSection>{t('settings.llm')}</SettingsSection>
            <Typography variant="body2" color="text.secondary">
                {t('settings.llmDescription')}{' '}
                <Link href="https://github.com/coddingtonbear/obsidian-local-rest-api" target="_blank" rel="noreferrer">
                    obsidian-local-rest-api
                </Link>
            </Typography>

            <FormGroup>
                <FormControlLabel
                    control={
                        <Switch
                            checked={llmEnabled}
                            onChange={(e) => onSettingChanged('llmEnabled', e.target.checked)}
                        />
                    }
                    label={t('settings.llmEnabled')}
                />
            </FormGroup>

            <SettingsSection>{t('settings.llmOpenRouter')}</SettingsSection>
            <SettingsTextField
                label={t('settings.llmOpenRouterApiKey')}
                type={showOpenRouterKey ? 'text' : 'password'}
                value={llmOpenRouterApiKey}
                onChange={set('llmOpenRouterApiKey')}
                autoComplete="off"
                slotProps={{
                    input: {
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    edge="end"
                                    onClick={() => setShowOpenRouterKey((v) => !v)}
                                    aria-label="toggle key visibility"
                                >
                                    {showOpenRouterKey ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    },
                }}
            />
            <SettingsTextField
                label={t('settings.llmOpenRouterModel')}
                value={llmOpenRouterModel}
                onChange={set('llmOpenRouterModel')}
                helperText={t('settings.llmOpenRouterModelHelperText')}
            />
            <SettingsTextField
                label={t('settings.llmSystemPrompt')}
                multiline
                minRows={4}
                value={llmSystemPrompt}
                onChange={set('llmSystemPrompt')}
            />
            <SettingsTextField
                label={t('settings.llmUserPromptTemplate')}
                multiline
                minRows={3}
                value={llmUserPromptTemplate}
                onChange={set('llmUserPromptTemplate')}
                helperText={t('settings.llmUserPromptTemplateHelperText')}
            />

            <SettingsSection>{t('settings.llmObsidian')}</SettingsSection>
            <SettingsTextField
                label={t('settings.llmObsidianRestUrl')}
                value={llmObsidianRestUrl}
                onChange={set('llmObsidianRestUrl')}
                helperText={t('settings.llmObsidianRestUrlHelperText')}
            />
            <SettingsTextField
                label={t('settings.llmObsidianApiKey')}
                type={showObsidianKey ? 'text' : 'password'}
                value={llmObsidianApiKey}
                onChange={set('llmObsidianApiKey')}
                autoComplete="off"
                slotProps={{
                    input: {
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    edge="end"
                                    onClick={() => setShowObsidianKey((v) => !v)}
                                    aria-label="toggle key visibility"
                                >
                                    {showObsidianKey ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    },
                }}
            />
            <SettingsTextField
                label={t('settings.llmObsidianVault')}
                value={llmObsidianVault}
                onChange={set('llmObsidianVault')}
                helperText={t('settings.llmObsidianVaultHelperText')}
            />
            <SettingsTextField
                select
                label={t('settings.llmObsidianNoteMode')}
                value={llmObsidianNoteMode}
                onChange={(e) => onSettingChanged('llmObsidianNoteMode', e.target.value as LlmObsidianNoteMode)}
            >
                <MenuItem value={LlmObsidianNoteMode.notePerPhrase}>
                    {t('settings.llmObsidianNoteModeNotePerPhrase')}
                </MenuItem>
                <MenuItem value={LlmObsidianNoteMode.dailyNoteAppend}>
                    {t('settings.llmObsidianNoteModeDailyNoteAppend')}
                </MenuItem>
                <MenuItem value={LlmObsidianNoteMode.singleRollingNote}>
                    {t('settings.llmObsidianNoteModeSingleRollingNote')}
                </MenuItem>
            </SettingsTextField>
            <SettingsTextField
                label={t('settings.llmObsidianPathTemplate')}
                value={llmObsidianPathTemplate}
                onChange={set('llmObsidianPathTemplate')}
                helperText={t('settings.llmObsidianPathTemplateHelperText')}
            />
        </Stack>
    );
};

export default LlmSettingsTab;
