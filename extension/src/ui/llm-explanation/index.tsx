import { createRoot } from 'react-dom/client';
import Bridge from '../bridge';
import { i18nInit } from '../i18n';
import LlmExplanationUi from '../components/LlmExplanationUi';

export function renderLlmExplanationUi(element: Element, language: string, locStrings: any) {
    const bridge = new Bridge();
    i18nInit(language, locStrings);
    createRoot(element).render(<LlmExplanationUi bridge={bridge} />);
    return bridge;
}
