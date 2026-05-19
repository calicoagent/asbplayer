import { Command, Message, SaveLlmExplanationsMessage, SaveLlmExplanationsResponse } from '@project/common';
import { llmSettingsKeys, SettingsProvider } from '@project/common/settings';
import { saveExplanationsToObsidian } from '@/services/obsidian-client';

export default class SaveLlmExplanationsHandler {
    private readonly _settings: SettingsProvider;

    constructor(settings: SettingsProvider) {
        this._settings = settings;
    }

    get sender() {
        return ['asbplayer-video', 'asbplayer-video-tab'];
    }

    get command() {
        return 'save-llm-explanations';
    }

    handle(
        command: Command<Message>,
        sender: Browser.runtime.MessageSender,
        sendResponse: (response?: SaveLlmExplanationsResponse) => void
    ): boolean {
        const message = command.message as SaveLlmExplanationsMessage;
        void this._handle(message)
            .then(sendResponse)
            .catch((e) => {
                console.error('[asbplayer-llm]', e);
                sendResponse({ ok: false, error: e?.message ?? String(e) });
            });
        return true;
    }

    private async _handle(message: SaveLlmExplanationsMessage): Promise<SaveLlmExplanationsResponse> {
        if (message.explanations.length === 0) {
            return { ok: true, savedCount: 0, skippedCount: 0, errors: [] };
        }

        const settings = await this._settings.get(llmSettingsKeys);
        if (!settings.llmObsidianApiKey) {
            return { ok: false, error: 'Missing Obsidian API key' };
        }

        const result = await saveExplanationsToObsidian(settings, message.explanations, {
            subtitle: message.subtitle,
            sourceUrl: message.sourceUrl,
            sourceTitle: message.sourceTitle,
            timestampMs: message.timestampMs,
            model: message.model,
        });

        return {
            ok: true,
            savedCount: result.savedCount,
            skippedCount: result.skippedCount,
            errors: result.errors,
        };
    }
}
