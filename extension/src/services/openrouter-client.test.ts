import { explainSubtitleWithOpenRouter, renderUserPrompt } from './openrouter-client';

describe('renderUserPrompt', () => {
    it('substitutes subtitle and context placeholders', () => {
        const rendered = renderUserPrompt(
            'Line: {{subtitle}} | Around: {{context}}',
            'お疲れ様でした',
            '前回のあらすじ'
        );
        expect(rendered).toBe('Line: お疲れ様でした | Around: 前回のあらすじ');
    });

    it('treats undefined context as empty string', () => {
        expect(renderUserPrompt('{{subtitle}}-{{context}}', 'A', undefined)).toBe('A-');
    });

    it('replaces every occurrence of each placeholder', () => {
        expect(renderUserPrompt('{{subtitle}}/{{subtitle}}', 'X', '')).toBe('X/X');
    });
});

describe('explainSubtitleWithOpenRouter', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('errors when api key missing', async () => {
        await expect(
            explainSubtitleWithOpenRouter({
                apiKey: '',
                model: 'm',
                systemPrompt: 's',
                userPrompt: 'u',
            })
        ).rejects.toThrow(/API key/);
    });

    it('errors when model missing', async () => {
        await expect(
            explainSubtitleWithOpenRouter({
                apiKey: 'k',
                model: '',
                systemPrompt: 's',
                userPrompt: 'u',
            })
        ).rejects.toThrow(/model/);
    });

    it('parses structured JSON response into explanations', async () => {
        const phrases = [
            { phrase: '今日', reading: 'きょう', meaning_en: 'today' },
            { phrase: 'お疲れ様', meaning_en: 'good work' },
        ];
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: JSON.stringify({ phrases }) } }],
            }),
        }) as any;

        const result = await explainSubtitleWithOpenRouter({
            apiKey: 'sk-x',
            model: 'anthropic/claude-sonnet-4.7',
            systemPrompt: 's',
            userPrompt: 'u',
        });
        expect(result.explanations).toEqual(phrases);

        const call = (global.fetch as jest.Mock).mock.calls[0];
        expect(call[0]).toBe('https://openrouter.ai/api/v1/chat/completions');
        const body = JSON.parse(call[1].body);
        expect(body.model).toBe('anthropic/claude-sonnet-4.7');
        expect(body.response_format.type).toBe('json_schema');
        expect(body.messages[0].content).toBe('s');
        expect(body.messages[1].content).toBe('u');
        expect(call[1].headers.Authorization).toBe('Bearer sk-x');
    });

    it('throws on non-2xx response', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 429,
            text: async () => 'rate limited',
        }) as any;
        await expect(
            explainSubtitleWithOpenRouter({
                apiKey: 'k',
                model: 'm',
                systemPrompt: 's',
                userPrompt: 'u',
            })
        ).rejects.toThrow(/HTTP 429/);
    });

    it('throws when content is not valid JSON', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'not json at all' } }],
            }),
        }) as any;
        await expect(
            explainSubtitleWithOpenRouter({
                apiKey: 'k',
                model: 'm',
                systemPrompt: 's',
                userPrompt: 'u',
            })
        ).rejects.toThrow(/non-JSON/);
    });

    it('returns empty list when phrases field is missing', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: '{}' } }] }),
        }) as any;
        const result = await explainSubtitleWithOpenRouter({
            apiKey: 'k',
            model: 'm',
            systemPrompt: 's',
            userPrompt: 'u',
        });
        expect(result.explanations).toEqual([]);
    });
});
