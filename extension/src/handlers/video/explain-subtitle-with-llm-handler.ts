import { Command, ExplainSubtitleWithLlmMessage, ExplainSubtitleWithLlmResponse, Message } from '@project/common';
import { llmSettingsKeys, SettingsProvider } from '@project/common/settings';
import { explainSubtitleWithOpenRouter, renderUserPrompt } from '@/services/openrouter-client';

export default class ExplainSubtitleWithLlmHandler {
    private readonly _settings: SettingsProvider;

    constructor(settings: SettingsProvider) {
        this._settings = settings;
    }

    get sender() {
        return ['asbplayer-video', 'asbplayer-video-tab', 'asbplayerv2'];
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
            return { ok: false, error: 'Missing OpenRouter API key' };
        }

        const userPrompt = renderUserPrompt(settings.llmUserPromptTemplate, message.subtitle, message.context);

        const llmResult = await explainSubtitleWithOpenRouter({
            apiKey: settings.llmOpenRouterApiKey,
            model: settings.llmOpenRouterModel,
            systemPrompt: settings.llmSystemPrompt,
            userPrompt,
        });

        return {
            ok: true,
            explanations: llmResult.explanations,
            model: settings.llmOpenRouterModel,
        };
    }
}
