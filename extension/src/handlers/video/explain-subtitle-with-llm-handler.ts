import { Command, ExplainSubtitleWithLlmMessage, ExplainSubtitleWithLlmResponse, Message } from '@project/common';
import { llmSettingsKeys, SettingsProvider } from '@project/common/settings';
import { explainSubtitleWithOpenRouter, renderUserPrompt } from '@/services/openrouter-client';
import { saveExplanationsToObsidian } from '@/services/obsidian-client';

export default class ExplainSubtitleWithLlmHandler {
    private readonly _settings: SettingsProvider;

    constructor(settings: SettingsProvider) {
        this._settings = settings;
    }

    get sender() {
        return ['asbplayer-video', 'asbplayer-video-tab'];
    }

    get command() {
        return 'explain-subtitle-with-llm';
    }

    handle(
        command: Command<Message>,
        sender: Browser.runtime.MessageSender,
        sendResponse: (response?: ExplainSubtitleWithLlmResponse) => void
    ): boolean {
        const message = command.message as ExplainSubtitleWithLlmMessage;
        void this._handle(message)
            .then(sendResponse)
            .catch((e) => {
                console.error('[asbplayer-llm]', e);
                sendResponse({ ok: false, error: e?.message ?? String(e) });
            });
        return true;
    }

    private async _handle(message: ExplainSubtitleWithLlmMessage): Promise<ExplainSubtitleWithLlmResponse> {
        const settings = await this._settings.get(llmSettingsKeys);
        if (!settings.llmEnabled) {
            return { ok: false, error: 'LLM feature is disabled in settings' };
        }
        if (!settings.llmOpenRouterApiKey) {
            this._notify('Missing OpenRouter API key', 'Open extension settings → AI / Japanese to configure.');
            return { ok: false, error: 'Missing OpenRouter API key' };
        }
        if (!settings.llmObsidianApiKey) {
            this._notify('Missing Obsidian API key', 'Install the Local REST API plugin and paste its token.');
            return { ok: false, error: 'Missing Obsidian API key' };
        }

        const userPrompt = renderUserPrompt(settings.llmUserPromptTemplate, message.subtitle, message.context);

        const llmResult = await explainSubtitleWithOpenRouter({
            apiKey: settings.llmOpenRouterApiKey,
            model: settings.llmOpenRouterModel,
            systemPrompt: settings.llmSystemPrompt,
            userPrompt,
        });

        if (llmResult.explanations.length === 0) {
            this._notify('No phrases returned', 'Model returned an empty list. Check the subtitle.');
            return { ok: true, savedCount: 0, skippedCount: 0, explanations: [] };
        }

        const saveResult = await saveExplanationsToObsidian(settings, llmResult.explanations, {
            subtitle: message.subtitle,
            sourceUrl: message.sourceUrl,
            sourceTitle: message.sourceTitle,
            timestampMs: message.timestampMs,
            model: settings.llmOpenRouterModel,
        });

        if (saveResult.errors.length > 0) {
            this._notify(`Saved ${saveResult.savedCount}, skipped ${saveResult.skippedCount}`, saveResult.errors[0]);
        } else {
            this._notify(
                `Saved ${saveResult.savedCount} phrase${saveResult.savedCount === 1 ? '' : 's'} to Obsidian`,
                message.subtitle.slice(0, 80)
            );
        }

        return {
            ok: true,
            savedCount: saveResult.savedCount,
            skippedCount: saveResult.skippedCount,
            explanations: llmResult.explanations,
        };
    }

    private _notify(title: string, message: string) {
        try {
            browser.notifications?.create({
                type: 'basic',
                iconUrl: browser.runtime.getURL('/icon/icon128.png'),
                title,
                message,
            });
        } catch (e) {
            console.warn('[asbplayer-llm] notification failed', e);
        }
    }
}
