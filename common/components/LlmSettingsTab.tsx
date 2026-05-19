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
import SettingsTextField from './SettingsTextField';
import SettingsSection from './SettingsSection';
import { AsbplayerSettings, LlmObsidianNoteMode } from '../settings';

interface Props {
    settings: AsbplayerSettings;
    onSettingChanged: <K extends keyof AsbplayerSettings>(key: K, value: AsbplayerSettings[K]) => Promise<void>;
}

const LlmSettingsTab: React.FC<Props> = ({ settings, onSettingChanged }) => {
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
            <SettingsSection>AI / Japanese</SettingsSection>
            <Typography variant="body2" color="text.secondary">
                Press the configured keybind on the current subtitle to send it to an OpenRouter model. Returned phrases
                are saved as Markdown notes in your Obsidian vault via the{' '}
                <Link href="https://github.com/coddingtonbear/obsidian-local-rest-api" target="_blank" rel="noreferrer">
                    Local REST API plugin
                </Link>
                .
            </Typography>

            <FormGroup>
                <FormControlLabel
                    control={
                        <Switch
                            checked={llmEnabled}
                            onChange={(e) => onSettingChanged('llmEnabled', e.target.checked)}
                        />
                    }
                    label="Enable AI subtitle explanations"
                />
            </FormGroup>

            <SettingsSection>OpenRouter</SettingsSection>
            <SettingsTextField
                label="API key"
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
                label="Model"
                value={llmOpenRouterModel}
                onChange={set('llmOpenRouterModel')}
                helperText="e.g. anthropic/claude-sonnet-4.7, anthropic/claude-haiku-4.5, google/gemini-2.5-flash"
            />
            <SettingsTextField
                label="System prompt"
                multiline
                minRows={4}
                value={llmSystemPrompt}
                onChange={set('llmSystemPrompt')}
            />
            <SettingsTextField
                label="User prompt template"
                multiline
                minRows={3}
                value={llmUserPromptTemplate}
                onChange={set('llmUserPromptTemplate')}
                helperText="Placeholders: {{subtitle}}, {{context}}"
            />

            <SettingsSection>Obsidian (Local REST API)</SettingsSection>
            <SettingsTextField
                label="Base URL"
                value={llmObsidianRestUrl}
                onChange={set('llmObsidianRestUrl')}
                helperText="https://127.0.0.1:27124 (HTTPS, self-signed) or http://127.0.0.1:27123 (insecure mode)"
            />
            <SettingsTextField
                label="API key"
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
                label="Vault name (informational)"
                value={llmObsidianVault}
                onChange={set('llmObsidianVault')}
                helperText="Local REST API writes to the currently open vault; this is for record only."
            />
            <SettingsTextField
                select
                label="Note mode"
                value={llmObsidianNoteMode}
                onChange={(e) => onSettingChanged('llmObsidianNoteMode', e.target.value as LlmObsidianNoteMode)}
            >
                <MenuItem value={LlmObsidianNoteMode.notePerPhrase}>One note per phrase</MenuItem>
                <MenuItem value={LlmObsidianNoteMode.dailyNoteAppend}>Append to daily note</MenuItem>
                <MenuItem value={LlmObsidianNoteMode.singleRollingNote}>Append to single rolling note</MenuItem>
            </SettingsTextField>
            <SettingsTextField
                label="Path template"
                value={llmObsidianPathTemplate}
                onChange={set('llmObsidianPathTemplate')}
                helperText="Placeholders: {{date}}, {{datetime}}, {{slug}}, {{phrase}}. Applies to note-per-phrase mode."
            />
        </Stack>
    );
};

export default LlmSettingsTab;
