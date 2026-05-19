import {
    ExplainSubtitleWithLlmMessage,
    ExplainSubtitleWithLlmResponse,
    LlmExplanationUiBridgeSaveMessage,
    LlmExplanationUiState,
    LlmPhraseExplanation,
    SaveLlmExplanationsMessage,
    SaveLlmExplanationsResponse,
    ShowLlmExplanationUiMessage,
    UpdateLlmExplanationUiStateMessage,
    VideoToExtensionCommand,
} from '@project/common';
import Binding from '../services/binding';
import UiFrame, { uiFrameForHtml } from '../services/ui-frame';
import FrameBridgeClient from '../services/frame-bridge-client';
import { fetchLocalization } from '../services/localization-fetcher';

interface ExplainTrigger {
    subtitle: string;
    context: string;
    sourceUrl?: string;
    sourceTitle?: string;
    timestampMs?: number;
}

export default class LlmExplanationUiController {
    private readonly _context: Binding;
    private readonly _frame: UiFrame;
    private _client?: FrameBridgeClient;
    private _currentTrigger?: ExplainTrigger;
    private _currentModel?: string;
    private _currentExplanations: LlmPhraseExplanation[] = [];
    private _bound = false;

    constructor(context: Binding) {
        this._context = context;
        this._frame = uiFrameForHtml(
            async (lang) =>
                `<!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                        <title>asbplayer - LLM</title>
                        <style>
                            @import url(${browser.runtime.getURL('/fonts/fonts.css')});
                        </style>
                    </head>
                    <body>
                        <div id="root" style="width:100%;height:100vh;"></div>
                        <script type="application/json" id="loc">${JSON.stringify(
                            await fetchLocalization(lang)
                        )}</script>
                        <script type="module" src="${browser.runtime.getURL('/llm-explanation-ui.js')}"></script>
                    </body>
                </html>`
        );
    }

    get showing() {
        return !this._frame.hidden;
    }

    async show(trigger: ExplainTrigger) {
        this._currentTrigger = trigger;
        this._currentExplanations = [];
        this._currentModel = undefined;

        await this._prepareFrame();

        const state: LlmExplanationUiState = {
            themeType: await this._context.settings.getSingle('themeType'),
            subtitle: trigger.subtitle,
            context: trigger.context,
            sourceTitle: trigger.sourceTitle,
            sourceUrl: trigger.sourceUrl,
            timestampMs: trigger.timestampMs,
            model: '',
            loading: true,
            explanations: [],
            saving: false,
        };
        this._sendShow(state);
        this._frame.show();

        try {
            const explainCommand: VideoToExtensionCommand<ExplainSubtitleWithLlmMessage> = {
                sender: 'asbplayer-video',
                message: {
                    command: 'explain-subtitle-with-llm',
                    subtitle: trigger.subtitle,
                    context: trigger.context,
                    sourceUrl: trigger.sourceUrl,
                    sourceTitle: trigger.sourceTitle,
                    timestampMs: trigger.timestampMs,
                },
                src: this._context.video.src,
            };
            const res: ExplainSubtitleWithLlmResponse | undefined = await browser.runtime.sendMessage(explainCommand);

            if (!res || !res.ok) {
                this._sendUpdate({ loading: false, error: res?.error ?? 'Unknown error' });
                return;
            }

            this._currentExplanations = res.explanations ?? [];
            this._currentModel = res.model;
            this._sendUpdate({
                loading: false,
                explanations: this._currentExplanations,
                model: res.model ?? '',
            });
        } catch (e: any) {
            this._sendUpdate({ loading: false, error: e?.message ?? String(e) });
        }
    }

    hide() {
        this._frame.hide();
    }

    unbind() {
        this._frame?.unbind();
        this._bound = false;
    }

    private async _prepareFrame() {
        this._frame.language = await this._context.settings.getSingle('language');
        const isNewClient = await this._frame.bind();
        this._client = await this._frame.client();

        if (isNewClient || !this._bound) {
            this._client.onMessage(async (message) => {
                if (message.command === 'llm-explanation-close') {
                    this._frame.hide();
                    return;
                }
                if (message.command === 'llm-explanation-save') {
                    const saveMessage = message as LlmExplanationUiBridgeSaveMessage;
                    await this._handleSave(saveMessage.explanations);
                    return;
                }
            });
            this._bound = true;
        }
    }

    private async _handleSave(explanations: LlmPhraseExplanation[]) {
        if (!this._currentTrigger) return;
        this._sendUpdate({ saving: true, error: undefined });
        try {
            const command: VideoToExtensionCommand<SaveLlmExplanationsMessage> = {
                sender: 'asbplayer-video',
                message: {
                    command: 'save-llm-explanations',
                    explanations,
                    subtitle: this._currentTrigger.subtitle,
                    sourceUrl: this._currentTrigger.sourceUrl,
                    sourceTitle: this._currentTrigger.sourceTitle,
                    timestampMs: this._currentTrigger.timestampMs,
                    model: this._currentModel ?? '',
                },
                src: this._context.video.src,
            };
            const res: SaveLlmExplanationsResponse | undefined = await browser.runtime.sendMessage(command);
            if (!res || !res.ok) {
                this._sendUpdate({ saving: false, error: res?.error ?? 'Save failed' });
                return;
            }
            this._sendUpdate({
                saving: false,
                savedCount: res.savedCount ?? 0,
                errors: res.errors ?? [],
            });
        } catch (e: any) {
            this._sendUpdate({ saving: false, error: e?.message ?? String(e) });
        }
    }

    private _sendShow(state: LlmExplanationUiState) {
        const msg: ShowLlmExplanationUiMessage = { command: 'showLlmExplanationUi', state };
        this._client?.sendMessage(msg);
    }

    private _sendUpdate(state: Partial<LlmExplanationUiState>) {
        const msg: UpdateLlmExplanationUiStateMessage = { command: 'updateLlmExplanationUiState', state };
        this._client?.sendMessage(msg);
    }
}
