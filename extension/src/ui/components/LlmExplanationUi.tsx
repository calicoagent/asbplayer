import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Bridge from '../bridge';
import {
    LlmExplanationUiBridgeCloseMessage,
    LlmExplanationUiBridgeSaveMessage,
    LlmExplanationUiState,
    LlmPhraseExplanation,
    Message,
    ShowLlmExplanationUiMessage,
    UpdateLlmExplanationUiStateMessage,
} from '@project/common';
import ThemeProvider from '@mui/material/styles/ThemeProvider';
import CssBaseline from '@mui/material/CssBaseline';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import { createTheme } from '@project/common/theme';

interface Props {
    bridge: Bridge;
}

interface RowState extends LlmPhraseExplanation {
    selected: boolean;
}

const LlmExplanationUi = ({ bridge }: Props) => {
    const { t } = useTranslation();
    const [state, setState] = useState<LlmExplanationUiState>();
    const [rows, setRows] = useState<RowState[]>([]);

    useEffect(() => {
        bridge.addClientMessageListener((message: Message) => {
            if (message.command === 'showLlmExplanationUi') {
                const next = (message as ShowLlmExplanationUiMessage).state;
                setState(next);
                setRows(next.explanations.map((e) => ({ ...e, selected: true })));
            } else if (message.command === 'updateLlmExplanationUiState') {
                const patch = (message as UpdateLlmExplanationUiStateMessage).state;
                setState((prev) => (prev ? { ...prev, ...patch } : prev));
                if (patch.explanations) {
                    setRows(patch.explanations.map((e) => ({ ...e, selected: true })));
                }
            }
        });
    }, [bridge]);

    useEffect(() => bridge.serverIsReady(), [bridge]);

    const themeType = state?.themeType ?? 'dark';
    const theme = useMemo(() => createTheme(themeType), [themeType]);

    const close = useCallback(() => {
        const msg: LlmExplanationUiBridgeCloseMessage = { command: 'llm-explanation-close' };
        bridge.sendMessageFromServer(msg);
    }, [bridge]);

    const save = useCallback(() => {
        const selected = rows.filter((r) => r.selected).map(({ selected: _, ...rest }) => rest);
        const msg: LlmExplanationUiBridgeSaveMessage = {
            command: 'llm-explanation-save',
            explanations: selected,
        };
        bridge.sendMessageFromServer(msg);
    }, [bridge, rows]);

    const updateRow = useCallback((index: number, patch: Partial<RowState>) => {
        setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    }, []);

    const allSelected = rows.length > 0 && rows.every((r) => r.selected);
    const noneSelected = rows.every((r) => !r.selected);

    if (!state) return null;

    const selectedCount = rows.filter((r) => r.selected).length;

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Dialog open onClose={close} fullWidth maxWidth="md" disableEnforceFocus>
                <DialogTitle>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Box flex={1}>
                            <Typography variant="h6" component="span">
                                {t('settings.llmDialogTitle')}
                            </Typography>
                            {state.model && (
                                <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
                                    {state.model}
                                </Typography>
                            )}
                        </Box>
                        {state.loading && <CircularProgress size={20} />}
                    </Stack>
                </DialogTitle>
                <DialogContent dividers>
                    <Box mb={2}>
                        <Typography variant="overline" color="text.secondary">
                            {t('settings.llmSubtitleHeader')}
                        </Typography>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {state.subtitle}
                        </Typography>
                    </Box>
                    {state.error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {state.error}
                        </Alert>
                    )}
                    {state.savedCount !== undefined && (state.errors?.length ?? 0) === 0 && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {t('settings.llmSavedAlert', { count: state.savedCount })}
                        </Alert>
                    )}
                    {state.errors && state.errors.length > 0 && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            <Typography variant="subtitle2">
                                {t('settings.llmPartialFailureAlert', {
                                    savedCount: state.savedCount ?? 0,
                                    failedCount: state.errors.length,
                                })}
                            </Typography>
                            {state.errors.slice(0, 5).map((e, i) => (
                                <div key={i}>
                                    <code>{e}</code>
                                </div>
                            ))}
                        </Alert>
                    )}
                    {!state.loading && rows.length === 0 && !state.error && (
                        <Typography color="text.secondary">{t('settings.llmNoPhrases')}</Typography>
                    )}
                    {rows.length > 0 && (
                        <>
                            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                <Checkbox
                                    checked={allSelected}
                                    indeterminate={!allSelected && !noneSelected}
                                    onChange={(_, checked) =>
                                        setRows((prev) => prev.map((r) => ({ ...r, selected: checked })))
                                    }
                                />
                                <Typography variant="body2" color="text.secondary">
                                    {t('settings.llmSelectedSummary', {
                                        count: selectedCount,
                                        total: rows.length,
                                    })}
                                </Typography>
                            </Stack>
                            <Stack divider={<Divider flexItem />} spacing={2}>
                                {rows.map((row, index) => (
                                    <Stack key={index} direction="row" spacing={1} alignItems="flex-start">
                                        <Checkbox
                                            checked={row.selected}
                                            onChange={(_, checked) => updateRow(index, { selected: checked })}
                                            sx={{ mt: 1 }}
                                        />
                                        <Stack spacing={1} flex={1}>
                                            <Stack direction="row" spacing={1}>
                                                <TextField
                                                    label={t('settings.llmFieldPhrase')}
                                                    size="small"
                                                    value={row.phrase}
                                                    onChange={(e) => updateRow(index, { phrase: e.target.value })}
                                                    sx={{ flex: 2 }}
                                                />
                                                <TextField
                                                    label={t('settings.llmFieldReading')}
                                                    size="small"
                                                    value={row.reading ?? ''}
                                                    onChange={(e) => updateRow(index, { reading: e.target.value })}
                                                    sx={{ flex: 1 }}
                                                />
                                            </Stack>
                                            <TextField
                                                label={t('settings.llmFieldMeaning')}
                                                size="small"
                                                multiline
                                                minRows={2}
                                                value={row.meaning_en}
                                                onChange={(e) => updateRow(index, { meaning_en: e.target.value })}
                                            />
                                            <TextField
                                                label={t('settings.llmFieldGrammar')}
                                                size="small"
                                                multiline
                                                minRows={1}
                                                value={row.grammar_notes ?? ''}
                                                onChange={(e) => updateRow(index, { grammar_notes: e.target.value })}
                                            />
                                            <TextField
                                                label={t('settings.llmFieldExampleTranslation')}
                                                size="small"
                                                multiline
                                                minRows={1}
                                                value={row.example_translation ?? ''}
                                                onChange={(e) =>
                                                    updateRow(index, { example_translation: e.target.value })
                                                }
                                            />
                                        </Stack>
                                    </Stack>
                                ))}
                            </Stack>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={close} disabled={state.saving}>
                        {t('settings.llmActionClose')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={save}
                        disabled={
                            state.loading || state.saving || selectedCount === 0 || state.savedCount !== undefined
                        }
                    >
                        {state.saving
                            ? t('settings.llmActionSaving')
                            : t('settings.llmActionSave', { count: selectedCount })}
                    </Button>
                </DialogActions>
            </Dialog>
        </ThemeProvider>
    );
};

export default LlmExplanationUi;
