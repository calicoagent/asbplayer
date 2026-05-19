import { LlmObsidianNoteMode } from '@project/common/settings';
import { renderPath, saveExplanationsToObsidian } from './obsidian-client';

const baseSettings = {
    llmObsidianRestUrl: 'http://127.0.0.1:27123',
    llmObsidianApiKey: 'token-abc',
    llmObsidianVault: '',
    llmObsidianNoteMode: LlmObsidianNoteMode.notePerPhrase,
    llmObsidianPathTemplate: 'asbplayer/{{date}}-{{slug}}.md',
};

const ctx = (overrides: Partial<Parameters<typeof renderPath>[1]> = {}) => ({
    subtitle: 'お疲れ様でした',
    model: 'anthropic/claude-sonnet-4.7',
    timestampMs: Date.UTC(2026, 4, 19, 3, 7, 0),
    ...overrides,
});

describe('renderPath', () => {
    it('substitutes date/slug/phrase placeholders', () => {
        const path = renderPath('asbplayer/{{date}}-{{slug}}.md', ctx(), 'お疲れ様');
        expect(path).toMatch(/^asbplayer\/\d{4}-\d{2}-\d{2}-/);
        expect(path).toContain('お疲れ様');
        expect(path.endsWith('.md')).toBe(true);
    });

    it('falls back to "phrase" for empty phrase after slugify', () => {
        const path = renderPath('{{slug}}.md', ctx(), '///');
        expect(path).toBe('phrase.md');
    });

    it('substitutes datetime placeholder', () => {
        const path = renderPath('{{datetime}}.md', ctx(), 'X');
        expect(path).toMatch(/^\d{4}-\d{2}-\d{2}_\d{4}\.md$/);
    });

    it('truncates slugs longer than 60 characters', () => {
        const long = 'あ'.repeat(120);
        const path = renderPath('{{slug}}.md', ctx(), long);
        const slug = path.replace('.md', '');
        expect([...slug].length).toBeLessThanOrEqual(60);
    });
});

describe('saveExplanationsToObsidian', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('throws if api key is missing', async () => {
        await expect(
            saveExplanationsToObsidian(
                { ...baseSettings, llmObsidianApiKey: '' },
                [{ phrase: 'a', meaning_en: 'b' }],
                ctx()
            )
        ).rejects.toThrow(/Obsidian/);
    });

    it('writes one PUT per phrase in notePerPhrase mode', async () => {
        const calls: any[] = [];
        global.fetch = jest.fn(async (url: string, init: any) => {
            calls.push({ url, init });
            return { ok: true, text: async () => '' } as any;
        }) as any;

        const res = await saveExplanationsToObsidian(
            baseSettings,
            [
                { phrase: '今日', reading: 'きょう', meaning_en: 'today' },
                { phrase: 'お疲れ様', meaning_en: 'good work' },
            ],
            ctx()
        );

        expect(res.savedCount).toBe(2);
        expect(res.skippedCount).toBe(0);
        expect(res.errors).toEqual([]);
        expect(calls).toHaveLength(2);
        for (const call of calls) {
            expect(call.url.startsWith('http://127.0.0.1:27123/vault/')).toBe(true);
            expect(call.init.method).toBe('PUT');
            expect(call.init.headers.Authorization).toBe('Bearer token-abc');
            expect(call.init.headers['Content-Type']).toBe('text/markdown');
            expect(call.init.body).toContain('---');
            expect(call.init.body).toContain('## Meaning');
        }
    });

    it('records error and continues when a single PUT fails', async () => {
        let n = 0;
        global.fetch = jest.fn(async () => {
            n += 1;
            if (n === 1) return { ok: false, status: 500, text: async () => 'boom' } as any;
            return { ok: true, text: async () => '' } as any;
        }) as any;

        const res = await saveExplanationsToObsidian(
            baseSettings,
            [
                { phrase: 'A', meaning_en: 'a' },
                { phrase: 'B', meaning_en: 'b' },
            ],
            ctx()
        );

        expect(res.savedCount).toBe(1);
        expect(res.skippedCount).toBe(1);
        expect(res.errors).toHaveLength(1);
        expect(res.errors[0]).toContain('A');
    });

    it('appends to daily note when mode is dailyNoteAppend', async () => {
        const fetched: any[] = [];
        global.fetch = jest.fn(async (url: string, init: any) => {
            fetched.push({ url, init });
            return { ok: true, text: async () => '' } as any;
        }) as any;

        const res = await saveExplanationsToObsidian(
            { ...baseSettings, llmObsidianNoteMode: LlmObsidianNoteMode.dailyNoteAppend },
            [
                { phrase: 'A', meaning_en: 'a' },
                { phrase: 'B', meaning_en: 'b' },
            ],
            ctx()
        );

        expect(fetched).toHaveLength(1);
        expect(fetched[0].init.method).toBe('POST');
        expect(fetched[0].url).toContain('/vault/Daily/');
        expect(res.savedCount).toBe(2);
    });

    it('appends to single rolling note when mode is singleRollingNote', async () => {
        const fetched: any[] = [];
        global.fetch = jest.fn(async (url: string, init: any) => {
            fetched.push({ url, init });
            return { ok: true, text: async () => '' } as any;
        }) as any;

        await saveExplanationsToObsidian(
            { ...baseSettings, llmObsidianNoteMode: LlmObsidianNoteMode.singleRollingNote },
            [{ phrase: 'A', meaning_en: 'a' }],
            ctx()
        );

        expect(fetched).toHaveLength(1);
        expect(fetched[0].init.method).toBe('POST');
        expect(fetched[0].url).toContain('asbplayer-phrases.md');
    });
});
