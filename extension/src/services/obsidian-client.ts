import { LlmObsidianNoteMode, LlmSettings } from '@project/common/settings';
import { LlmPhraseExplanation } from '@project/common';

export interface ObsidianSaveContext {
    subtitle: string;
    sourceUrl?: string;
    sourceTitle?: string;
    timestampMs?: number;
    model: string;
}

export interface ObsidianSaveResult {
    savedCount: number;
    skippedCount: number;
    errors: string[];
}

export async function saveExplanationsToObsidian(
    settings: Pick<
        LlmSettings,
        | 'llmObsidianRestUrl'
        | 'llmObsidianApiKey'
        | 'llmObsidianVault'
        | 'llmObsidianNoteMode'
        | 'llmObsidianPathTemplate'
    >,
    explanations: LlmPhraseExplanation[],
    ctx: ObsidianSaveContext
): Promise<ObsidianSaveResult> {
    const result: ObsidianSaveResult = { savedCount: 0, skippedCount: 0, errors: [] };

    if (!settings.llmObsidianApiKey) {
        throw new Error('Obsidian Local REST API key is not configured');
    }

    if (settings.llmObsidianNoteMode === LlmObsidianNoteMode.notePerPhrase) {
        for (const exp of explanations) {
            try {
                const path = renderPath(settings.llmObsidianPathTemplate, ctx, exp.phrase);
                const body = renderNoteBody(exp, ctx);
                await writeNote(settings.llmObsidianRestUrl, settings.llmObsidianApiKey, path, body);
                result.savedCount += 1;
            } catch (e: any) {
                result.errors.push(`${exp.phrase}: ${e?.message ?? String(e)}`);
                result.skippedCount += 1;
            }
        }
        return result;
    }

    const combined = explanations.map((exp) => renderPhraseSection(exp)).join('\n\n');
    const aggregateBody = renderAggregateBody(combined, ctx);
    const path =
        settings.llmObsidianNoteMode === LlmObsidianNoteMode.dailyNoteAppend
            ? renderPath('Daily/{{date}}.md', ctx, ctx.subtitle)
            : renderPath('asbplayer-phrases.md', ctx, ctx.subtitle);
    try {
        await appendNote(settings.llmObsidianRestUrl, settings.llmObsidianApiKey, path, aggregateBody);
        result.savedCount = explanations.length;
    } catch (e: any) {
        result.errors.push(`${path}: ${e?.message ?? String(e)}`);
        result.skippedCount = explanations.length;
    }
    return result;
}

export function renderPath(template: string, ctx: ObsidianSaveContext, phrase: string): string {
    const now = ctx.timestampMs ? new Date(ctx.timestampMs) : new Date();
    const yyyy = now.getFullYear().toString().padStart(4, '0');
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const HH = now.getHours().toString().padStart(2, '0');
    const MM = now.getMinutes().toString().padStart(2, '0');
    const date = `${yyyy}-${mm}-${dd}`;
    const datetime = `${date}_${HH}${MM}`;
    const slug = slugify(phrase);
    return template
        .replaceAll('{{date}}', date)
        .replaceAll('{{datetime}}', datetime)
        .replaceAll('{{slug}}', slug)
        .replaceAll('{{phrase}}', phrase);
}

function slugify(s: string): string {
    return (
        s
            .normalize('NFKC')
            .replace(/[\s\/\\:*?"<>|]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'phrase'
    );
}

function frontmatter(record: Record<string, string | number | undefined>): string {
    const lines: string[] = ['---'];
    for (const [k, v] of Object.entries(record)) {
        if (v === undefined || v === '') continue;
        const val = typeof v === 'string' ? JSON.stringify(v) : String(v);
        lines.push(`${k}: ${val}`);
    }
    lines.push('---');
    return lines.join('\n');
}

function renderNoteBody(exp: LlmPhraseExplanation, ctx: ObsidianSaveContext): string {
    const fm = frontmatter({
        phrase: exp.phrase,
        reading: exp.reading,
        source_url: ctx.sourceUrl,
        source_title: ctx.sourceTitle,
        timestamp_ms: ctx.timestampMs,
        model: ctx.model,
        created: new Date().toISOString(),
        tags: 'asbplayer,japanese',
    });
    const lines = [
        fm,
        '',
        `# ${exp.phrase}` + (exp.reading ? ` (${exp.reading})` : ''),
        '',
        '## Subtitle',
        '',
        '> ' + ctx.subtitle.replaceAll('\n', '\n> '),
        '',
        '## Meaning',
        '',
        exp.meaning_en,
    ];
    if (exp.grammar_notes) {
        lines.push('', '## Grammar notes', '', exp.grammar_notes);
    }
    if (exp.example_translation) {
        lines.push('', '## Subtitle translation', '', exp.example_translation);
    }
    return lines.join('\n') + '\n';
}

function renderPhraseSection(exp: LlmPhraseExplanation): string {
    const head = `### ${exp.phrase}` + (exp.reading ? ` (${exp.reading})` : '');
    const parts = [head, '', exp.meaning_en];
    if (exp.grammar_notes) parts.push('', `*Grammar:* ${exp.grammar_notes}`);
    if (exp.example_translation) parts.push('', `*Translation:* ${exp.example_translation}`);
    return parts.join('\n');
}

function renderAggregateBody(sections: string, ctx: ObsidianSaveContext): string {
    const ts = new Date().toISOString();
    const header = `## ${ts} — ${ctx.sourceTitle ?? 'asbplayer'}`;
    const lines = [header, '', `**Subtitle:** ${ctx.subtitle}`];
    if (ctx.sourceUrl) lines.push(`**Source:** ${ctx.sourceUrl}`);
    lines.push(`**Model:** ${ctx.model}`, '', sections, '');
    return lines.join('\n');
}

async function writeNote(baseUrl: string, apiKey: string, path: string, body: string): Promise<void> {
    const url = `${trimSlash(baseUrl)}/vault/${encodePath(path)}`;
    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'text/markdown',
        },
        body,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Obsidian PUT ${res.status}: ${text.slice(0, 300)}`);
    }
}

async function appendNote(baseUrl: string, apiKey: string, path: string, body: string): Promise<void> {
    const url = `${trimSlash(baseUrl)}/vault/${encodePath(path)}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'text/markdown',
        },
        body,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Obsidian POST ${res.status}: ${text.slice(0, 300)}`);
    }
}

function trimSlash(s: string): string {
    return s.endsWith('/') ? s.slice(0, -1) : s;
}

function encodePath(path: string): string {
    return path.split('/').map(encodeURIComponent).join('/');
}
