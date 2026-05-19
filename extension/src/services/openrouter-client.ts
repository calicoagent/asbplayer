import { LlmPhraseExplanation } from '@project/common';

export interface OpenRouterRequest {
    apiKey: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    signal?: AbortSignal;
}

const phraseSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['phrases'],
    properties: {
        phrases: {
            type: 'array',
            description:
                'Learning targets extracted from the Japanese subtitle: vocab, grammar patterns, idioms, or culturally loaded phrases.',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['phrase', 'meaning_en'],
                properties: {
                    phrase: {
                        type: 'string',
                        description:
                            'The exact Japanese phrase, word, or grammar pattern as it appears in the subtitle.',
                    },
                    reading: {
                        type: 'string',
                        description: 'Hiragana / katakana reading (omit if obvious or already kana-only).',
                    },
                    meaning_en: {
                        type: 'string',
                        description: 'Concise English explanation suitable for an intermediate learner.',
                    },
                    grammar_notes: {
                        type: 'string',
                        description: 'Optional grammar / usage notes when relevant.',
                    },
                    example_translation: {
                        type: 'string',
                        description: 'Optional natural English translation of the full subtitle line.',
                    },
                },
            },
        },
    },
} as const;

export interface OpenRouterResult {
    explanations: LlmPhraseExplanation[];
    rawContent: string;
}

export async function explainSubtitleWithOpenRouter(req: OpenRouterRequest): Promise<OpenRouterResult> {
    if (!req.apiKey) {
        throw new Error('OpenRouter API key is not configured');
    }
    if (!req.model) {
        throw new Error('OpenRouter model is not configured');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: req.signal,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${req.apiKey}`,
            'HTTP-Referer': 'https://github.com/asbplayer/asbplayer',
            'X-Title': 'asbplayer-llm-japanese',
        },
        body: JSON.stringify({
            model: req.model,
            messages: [
                { role: 'system', content: req.systemPrompt },
                { role: 'user', content: req.userPrompt },
            ],
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: 'subtitle_explanation',
                    strict: true,
                    schema: phraseSchema,
                },
            },
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenRouter HTTP ${response.status}: ${text.slice(0, 500)}`);
    }

    const data: any = await response.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('OpenRouter response missing choices[0].message.content');
    }

    let parsed: { phrases?: LlmPhraseExplanation[] };
    try {
        parsed = JSON.parse(content);
    } catch (e) {
        throw new Error(`OpenRouter returned non-JSON content: ${content.slice(0, 200)}`);
    }

    const phrases = Array.isArray(parsed.phrases) ? parsed.phrases : [];
    return { explanations: phrases, rawContent: content };
}

export function renderUserPrompt(template: string, subtitle: string, context: string | undefined): string {
    return template.replaceAll('{{subtitle}}', subtitle).replaceAll('{{context}}', context ?? '');
}
